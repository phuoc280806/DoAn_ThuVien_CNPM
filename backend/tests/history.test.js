const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { todayVN, addDays } = require('../src/utils/date');

let t;
before(async () => { t = await startApp(); });
after(async () => { await t.stop(); });

const today = todayVN();
const history = async (username, query = '') =>
  t.api('GET', `/me/loans${query}`, { token: await t.login(username) });

test('UC012: chỉ độc giả dùng được', async () => {
  assert.equal((await history('TT01')).status, 403);
  assert.equal((await t.api('GET', '/me/loans')).status, 401);
});

test('UC012 3a: chưa có giao dịch nào', async () => {
  const res = await history('HS2026001');
  assert.equal(res.status, 200);
  assert.equal(res.body.message, 'Bạn chưa có giao dịch mượn nào');
  assert.deepEqual(res.body.data.items, []);
});

test('UC012 bước 3: lịch sử, tiền phạt, trạng thái thu, mã biên lai', async () => {
  const gv = await history('GV2026002');
  assert.equal(gv.body.data.unpaidTotal, 0);
  assert.deepEqual(
    gv.body.data.items.map((i) => [i.title, i.status, i.fineAmount, i.fineStatus, i.receiptCode]).sort(),
    [
      ['English Grammar in Use', 'RETURNED', 4000, 'PAID', 'BL000002'],
      ['Đắc nhân tâm', 'RETURNED', 0, null, null],
    ],
  );

  const debtor = await history('HS2026005');
  assert.equal(debtor.body.data.unpaidTotal, 3000);
  assert.equal(debtor.body.data.items[0].fineStatus, 'UNPAID');
});

test('UC012 bước 4–5: lọc theo trạng thái và thời gian; 5a, 5b', async () => {
  assert.equal((await history('HS2026002', '?status=BORROWING')).body.data.items.length, 3);

  const noOverdue = await history('HS2026002', '?status=OVERDUE');
  assert.deepEqual(noOverdue.body.data.items, []);
  assert.equal(noOverdue.body.message, 'Không có giao dịch phù hợp');   // 5b

  assert.equal((await history('HS2026006', '?status=OVERDUE')).body.data.items.length, 1);

  const recent = await history('GV2026002', `?from=${addDays(today, -10)}&to=${today}`);   // phiếu lập 50 ngày trước
  assert.deepEqual(recent.body.data.items, []);

  const badRange = await history('GV2026002', `?from=${today}&to=${addDays(today, -1)}`);
  assert.equal(badRange.status, 400);
  assert.equal(badRange.body.message, 'Khoảng thời gian không hợp lệ');   // 5a

  const future = await history('GV2026002', `?to=${addDays(today, 1)}`);
  assert.equal(future.body.message, 'Đến ngày không được lớn hơn ngày hiện tại');
});

test('UC012 bước 6–7: chi tiết phiếu của mình; 7a phiếu người khác bị chặn và ghi nhật ký', async () => {
  const token = await t.login('GV2026002');

  const own = await t.api('GET', '/me/loans/7', { token });
  assert.equal(own.status, 200);
  assert.equal(own.body.data.ticketCode, 'PM000007');
  assert.equal(own.body.data.items.find((i) => i.copyCode === 'BS000031').receiptCode, 'BL000002');

  const other = await t.api('GET', '/me/loans/1', { token });   // phiếu của HS2026002
  assert.equal(other.status, 403);
  assert.equal(other.body.message, 'Bạn không có quyền xem dữ liệu này');
  const [[log]] = await t.pool.query("SELECT * FROM audit_logs WHERE action = 'UNAUTHORIZED_ACCESS'");
  assert.equal(log.target_type, 'BORROW_TICKET');
  assert.equal(log.target_id, 1);

  assert.equal((await t.api('GET', '/me/loans/999', { token })).status, 404);
});
