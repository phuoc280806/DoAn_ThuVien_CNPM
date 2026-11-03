const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { todayVN, addDays } = require('../src/utils/date');

let t;
let admin;
let librarian;
before(async () => {
  t = await startApp();
  admin = await t.login('AD001');
  librarian = await t.login('TT01');
});
after(async () => { await t.stop(); });

const today = todayVN();

test('Nhật ký hệ thống: chỉ Admin xem được', async () => {
  assert.equal((await t.api('GET', '/audit-logs')).status, 401);
  assert.equal((await t.api('GET', '/audit-logs', { token: librarian })).status, 403);
});

test('Nhật ký hệ thống: ghi thao tác quản trị, lọc theo hành động / người thực hiện / ngày', async () => {
  const empty = await t.api('GET', '/audit-logs', { token: admin });
  assert.equal(empty.body.data.total, 0);

  // Khóa rồi mở khóa HS2026001 (user_id = 4)
  await t.api('PATCH', '/users/4/status', { token: admin, body: { status: 'LOCKED' } });
  await t.api('PATCH', '/users/4/status', { token: admin, body: { status: 'ACTIVE' } });

  const all = await t.api('GET', '/audit-logs', { token: admin });
  assert.deepEqual(all.body.data.items.map((l) => l.action), ['UNLOCK_USER', 'LOCK_USER']);   // mới nhất trước
  const [unlock] = all.body.data.items;
  assert.equal(unlock.user.username, 'AD001');
  assert.equal(unlock.targetType, 'USER');
  assert.equal(unlock.detail.username, 'HS2026001');

  assert.equal((await t.api('GET', '/audit-logs?action=lock_user', { token: admin })).body.data.total, 1);
  assert.equal((await t.api('GET', '/audit-logs?keyword=TT01', { token: admin })).body.data.total, 0);
  assert.equal((await t.api('GET', `/audit-logs?from=${today}&to=${today}`, { token: admin })).body.data.total, 2);
  assert.equal((await t.api('GET', `/audit-logs?to=${addDays(today, -1)}`, { token: admin })).body.data.total, 0);

  const bad = await t.api('GET', `/audit-logs?from=${today}&to=${addDays(today, -1)}`, { token: admin });
  assert.equal(bad.status, 400);
  assert.equal(bad.body.message, 'Khoảng thời gian không hợp lệ');
});

test('Quản lý mượn trả: danh sách phiếu kèm snapshot, lọc theo trạng thái / từ khóa / ngày', async () => {
  const all = await t.api('GET', '/loans', { token: admin });
  assert.equal(all.status, 200);
  assert.equal(all.body.data.total, 8);
  assert.equal(all.body.data.items[0].ticketCode, 'PM000006');   // lập gần nhất (2 ngày trước)

  const old = all.body.data.items.find((i) => i.ticketCode === 'PM000004');
  assert.equal(old.reader.readerCode, 'HS2026006');
  assert.equal(old.snapshot.borrowDays, 14);                      // lập theo quy định cũ
  assert.equal(old.overdueBooks, 1);
  assert.equal(old.nextDueDate, addDays(today, -45));

  const statusOf = async (s) => (await t.api('GET', `/loans?status=${s}`, { token: admin })).body.data.items.map((i) => i.ticketCode).sort();
  assert.deepEqual(await statusOf('COMPLETED'), ['PM000005', 'PM000007']);
  assert.deepEqual(await statusOf('OVERDUE'), ['PM000003', 'PM000004']);

  const byCode = await t.api('GET', '/loans?keyword=pm000002', { token: admin });
  assert.deepEqual(byCode.body.data.items.map((i) => i.reader.readerCode), ['HS2026003']);
  const byName = await t.api('GET', '/loans?keyword=Hoàng Văn Toán', { token: admin });
  assert.deepEqual(byName.body.data.items.map((i) => i.ticketCode), ['PM000007']);

  const recent = await t.api('GET', `/loans?from=${addDays(today, -5)}&to=${today}`, { token: admin });
  assert.equal(recent.body.data.total, 3);   // PM000001 (-3), PM000002 (-5), PM000006 (-2); PM000008 lập -6

  assert.equal((await t.api('GET', '/loans?status=XYZ', { token: admin })).status, 400);
  assert.equal((await t.api('GET', '/loans', { token: await t.login('HS2026001') })).status, 403);
});
