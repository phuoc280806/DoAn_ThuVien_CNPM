const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { todayVN, addDays } = require('../src/utils/date');

let t;
let librarian;
before(async () => {
  t = await startApp();
  librarian = await t.login('TT01');
});
after(async () => { await t.stop(); });

const today = todayVN();
const eligibility = (code) => t.api('GET', `/loans/eligibility/${code}`, { token: librarian });
const borrow = (readerCode, copyCodes) => t.api('POST', '/loans', { token: librarian, body: { readerCode, copyCodes } });
const countTickets = async () => (await t.pool.query('SELECT COUNT(*) AS n FROM borrow_tickets'))[0][0].n;
const copyStatus = async (code) =>
  (await t.pool.query('SELECT status FROM book_copies WHERE copy_code = ?', [code]))[0][0].status;

test('Phân quyền: độc giả không tự mượn (GĐ05)', async () => {
  const reader = await t.login('HS2026001');
  assert.equal((await t.api('POST', '/loans', { token: reader, body: { readerCode: 'HS2026001', copyCodes: ['BS000005'] } })).status, 403);
});

test('UC007 bước 4–6: hồ sơ, sách đang mượn, số cuốn còn được mượn', async () => {
  const ok = await eligibility('hs2026001');
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.eligible, true);
  assert.equal(ok.body.data.summary, 'Đã mượn 0/3, còn được mượn 3');

  const gv = await eligibility('GV2026001');
  assert.equal(gv.body.data.summary, 'Đã mượn 2/5, còn được mượn 3');
  assert.equal(gv.body.data.borrowing.length, 2);

  assert.equal((await eligibility('HS9999999')).body.message, 'Không tìm thấy độc giả');   // 3a
});

test('UC007 bước 5: các lý do bị chặn mượn', async () => {
  const codesOf = async (reader) => (await eligibility(reader)).body.data.problems.map((p) => p.code);

  assert.deepEqual(await codesOf('HS2026002'), ['LIMIT_REACHED']);           // TH2 3/3
  assert.deepEqual(await codesOf('HS2026004'), ['OVERDUE']);                 // quá hạn 5 ngày
  assert.deepEqual(await codesOf('HS2026005'), ['UNPAID_FINE']);             // TH5 nợ 3.000đ
  assert.deepEqual(await codesOf('HS2026007'), ['CARD_EXPIRED']);
  assert.deepEqual(await codesOf('HS2026009'), ['CARD_LOCKED']);
  assert.deepEqual(await codesOf('HS2026010'), ['ACCOUNT_LOCKED']);

  const limit = await eligibility('HS2026002');
  assert.equal(limit.body.data.problems[0].message, 'Đã mượn 3/3 cuốn');
  const unpaid = await eligibility('HS2026005');
  assert.equal(unpaid.body.data.unpaidTotal, 3000);
  assert.match(unpaid.body.data.problems[0].message, /3\.000đ/);
});

test('TH1: lập phiếu 2 cuốn, lưu snapshot, hạn trả = hôm nay + 7, bản sách chuyển Đang mượn', async () => {
  const res = await borrow('HS2026001', ['bs000005', 'BS000014']);
  assert.equal(res.status, 201);
  const ticket = res.body.data;
  assert.match(ticket.ticketCode, /^PM\d{6}$/);
  assert.equal(ticket.borrowDate, today);
  assert.equal(ticket.librarian.username, 'TT01');
  assert.deepEqual(ticket.snapshot, { regulationId: 3, borrowDays: 7, finePerDay: 1000, maxFinePerBook: 30000, renewDays: 7 });
  assert.deepEqual(ticket.items.map((i) => [i.copyCode, i.dueDate]), [
    ['BS000005', addDays(today, 7)],
    ['BS000014', addDays(today, 7)],
  ]);
  assert.equal(await copyStatus('BS000005'), 'BORROWED');

  const book = await t.api('GET', '/books/2', { token: librarian });   // Toán 10: 3 bản, 2 đang mượn
  assert.equal(book.body.data.availableCopies, 1);

  assert.equal((await t.api('GET', `/loans/${ticket.borrowId}`, { token: librarian })).body.data.items.length, 2);
  assert.equal((await eligibility('HS2026001')).body.data.summary, 'Đã mượn 2/3, còn được mượn 1');
});

test('TH2, TH5, 5a: độc giả bị chặn thì không tạo phiếu', async () => {
  const before = await countTickets();

  const th2 = await borrow('HS2026002', ['BS000006']);
  assert.equal(th2.status, 409);
  assert.equal(th2.body.message, 'Đã mượn 3/3 cuốn');

  const th5 = await borrow('HS2026005', ['BS000006']);
  assert.equal(th5.status, 409);
  assert.equal(th5.body.errors[0].code, 'UNPAID_FINE');

  assert.equal((await borrow('HS2026007', ['BS000006'])).body.errors[0].code, 'CARD_EXPIRED');

  assert.equal(await countTickets(), before);
  assert.equal(await copyStatus('BS000006'), 'AVAILABLE');
});

test('UC007 8a, 8b, 8c, 9b: lỗi khi chọn bản sách, không ghi dữ liệu nào', async () => {
  const before = await countTickets();

  const missing = await borrow('HS2026003', ['BS000006', 'BS999999']);
  assert.equal(missing.status, 404);
  assert.equal(missing.body.message, 'Không tìm thấy bản sách BS999999');

  const borrowed = await borrow('HS2026003', ['BS000006', 'BS000001']);
  assert.equal(borrowed.status, 409);
  assert.equal(borrowed.body.message, 'Bản sách BS000001 (Ngữ văn 10) đang được mượn, không thể cho mượn');

  // HS2026003 đang giữ 1 cuốn → còn được mượn 2
  const tooMany = await borrow('HS2026003', ['BS000006', 'BS000008', 'BS000009']);
  assert.equal(tooMany.status, 409);
  assert.equal(tooMany.body.message, 'Chỉ còn được mượn 2 cuốn');

  assert.equal((await borrow('HS2026003', [])).body.message, 'Chưa chọn bản sách nào');
  assert.equal((await borrow('HS2026003', ['BS000006', 'bs000006'])).body.message, 'Bản sách BS000006 bị chọn trùng');

  assert.equal(await countTickets(), before);
  assert.equal(await copyStatus('BS000006'), 'AVAILABLE');
});

test('Hai thủ thư cùng cho mượn một cuốn cùng lúc: chỉ một người thành công', async () => {
  const otherLibrarian = await t.login('TT02');
  const [a, b] = await Promise.all([
    borrow('GV2026003', ['BS000011']),
    t.api('POST', '/loans', { token: otherLibrarian, body: { readerCode: 'HS2026003', copyCodes: ['BS000011'] } }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const [[{ n }]] = await t.pool.query(
    'SELECT COUNT(*) AS n FROM borrow_details d JOIN book_copies c ON c.copy_id = d.copy_id WHERE c.copy_code = ?',
    ['BS000011'],
  );
  assert.equal(n, 1);
});

test('UC008 bước 3–7: danh sách sách đang mượn kèm khả năng gia hạn', async () => {
  const items = (await t.api('GET', '/loans/active?readerCode=HS2026001', { token: librarian })).body.data;
  assert.equal(items.length, 2);
  assert.equal(items[0].canRenew, true);
  assert.equal(items[0].newDueDate, addDays(today, 14));

  const renewed = (await t.api('GET', '/loans/active?copyCode=BS000002', { token: librarian })).body.data[0];
  assert.equal(renewed.readerCode, 'HS2026008');
  assert.equal(renewed.canRenew, false);
  assert.equal(renewed.renewBlockedReason, 'Chỉ được gia hạn 1 lần');

  const overdue = (await t.api('GET', '/loans/active?readerCode=HS2026004', { token: librarian })).body.data[0];
  assert.equal(overdue.renewBlockedReason, 'Sách đã quá hạn, không thể gia hạn; cần trả sách');

  const none = await t.api('GET', '/loans/active?readerCode=GV2026002', { token: librarian });
  assert.equal(none.status, 404);
  assert.equal(none.body.message, 'Không tìm thấy sách đang mượn');   // 4a

  assert.equal((await t.api('GET', '/loans/active', { token: librarian })).status, 400);
});

test('UC008: gia hạn 1 lần theo snapshot; 6a quá hạn, 6b đã gia hạn', async () => {
  const [item] = (await t.api('GET', '/loans/active?copyCode=BS000005', { token: librarian })).body.data;
  const res = await t.api('POST', `/loans/items/${item.borrowDetailId}/renew`, { token: librarian });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.oldDueDate, addDays(today, 7));
  assert.equal(res.body.data.newDueDate, addDays(today, 14));
  assert.equal(res.body.data.renewCount, 1);

  const again = await t.api('POST', `/loans/items/${item.borrowDetailId}/renew`, { token: librarian });
  assert.equal(again.status, 409);
  assert.equal(again.body.message, 'Chỉ được gia hạn 1 lần');

  const overdue = await t.api('POST', '/loans/items/5/renew', { token: librarian });   // HS2026004
  assert.equal(overdue.body.message, 'Sách đã quá hạn, không thể gia hạn; cần trả sách');

  const returned = await t.api('POST', '/loans/items/7/renew', { token: librarian });  // HS2026005 đã trả
  assert.equal(returned.body.message, 'Cuốn sách đã được trả');

  const [[log]] = await t.pool.query('SELECT * FROM renewal_logs WHERE borrow_detail_id = ?', [item.borrowDetailId]);
  assert.equal(log.new_due_date, addDays(today, 14));
});

test('TH6: đổi quy định hôm nay — phiếu mới dùng quy định mới, phiếu cũ giữ snapshot', async () => {
  const admin = await t.login('AD001');
  const change = await t.api('POST', '/regulations', {
    token: admin,
    body: { readerType: 'STUDENT', maxBooks: 3, borrowDays: 10, finePerDay: 2000, maxFinePerBook: 30000, renewDays: 5, effectiveFrom: today },
  });
  assert.equal(change.status, 201);

  const res = await borrow('HS2026003', ['BS000006']);
  assert.equal(res.status, 201);
  assert.equal(res.body.data.snapshot.borrowDays, 10);
  assert.equal(res.body.data.snapshot.finePerDay, 2000);
  assert.equal(res.body.data.items[0].dueDate, addDays(today, 10));

  const old = await t.api('GET', '/loans/1', { token: librarian });   // PM000001 lập trước khi đổi
  assert.equal(old.body.data.snapshot.borrowDays, 7);
  assert.equal(old.body.data.snapshot.finePerDay, 1000);
});
