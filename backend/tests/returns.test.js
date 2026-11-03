const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { calculateFine } = require('../src/utils/fine');
const { todayVN, addDays } = require('../src/utils/date');

let t;
let librarian;
before(async () => {
  t = await startApp();
  librarian = await t.login('TT01');
});
after(async () => { await t.stop(); });

const lookup = (code) => t.api('GET', `/returns/lookup/${code}`, { token: librarian });
const giveBack = (copyCode, condition = 'GOOD', note) =>
  t.api('POST', '/returns', { token: librarian, body: { copyCode, condition, note } });
const copyStatus = async (code) =>
  (await t.pool.query('SELECT status FROM book_copies WHERE copy_code = ?', [code]))[0][0].status;
const problemsOf = async (readerCode) =>
  (await t.api('GET', `/loans/eligibility/${readerCode}`, { token: librarian })).body.data.problems.map((p) => p.code);

test('UC010: công thức tính phạt theo các ví dụ ở Bảng 2.33', () => {
  const fine = (dueDate, returnDate, finePerDay = 1000, books = 1) =>
    calculateFine({ dueDate, returnDate, finePerDay, maxFinePerBook: 30000, books });

  assert.deepEqual(fine('2026-10-10', '2026-10-15'), { lateDays: 5, amount: 5000 });        // TH4 trễ 5 ngày
  assert.deepEqual(fine('2026-09-01', '2026-10-16'), { lateDays: 45, amount: 30000 });      // chạm mức tối đa
  assert.deepEqual(fine('2026-10-20', '2026-10-18'), { lateDays: 0, amount: 0 });           // trả sớm
  assert.deepEqual(fine('2026-10-05', '2026-10-15', 1000, 2), { lateDays: 10, amount: 20000 }); // 2 cuốn
  assert.deepEqual(fine('2026-10-15', '2026-10-20'), { lateDays: 5, amount: 5000 });        // P001
  assert.deepEqual(fine('2026-10-19', '2026-10-24', 2000), { lateDays: 5, amount: 10000 }); // P002
  assert.throws(() => calculateFine({ dueDate: '2026-10-10', returnDate: '2026-10-15' }), /thiếu thông số/);
});

test('UC009 bước 3–6: quét mã bản sách, tính trước tiền phạt; 4a, 4b', async () => {
  const late = await lookup('bs000013');                       // HS2026004, quá hạn 5 ngày
  assert.equal(late.status, 200);
  assert.equal(late.body.data.reader.readerCode, 'HS2026004');
  assert.equal(late.body.data.lateDays, 5);
  assert.equal(late.body.data.fineAmount, 5000);

  const cap = await lookup('BS000016');                        // HS2026006, quá hạn 45 ngày, snapshot cũ
  assert.equal(cap.body.data.lateDays, 45);
  assert.equal(cap.body.data.fineAmount, 30000);

  assert.equal((await lookup('BS000010')).body.data.onTime, true);

  assert.equal((await lookup('BS999999')).body.message, 'Không tìm thấy bản sách');                  // 4a
  const notBorrowed = await lookup('BS000005');
  assert.equal(notBorrowed.status, 409);
  assert.equal(notBorrowed.body.message, 'Bản sách không ở trạng thái Đang mượn');                   // 4b
});

test('Phân quyền: độc giả không tự trả sách', async () => {
  const reader = await t.login('HS2026003');
  assert.equal((await t.api('POST', '/returns', { token: reader, body: { copyCode: 'BS000010', condition: 'GOOD' } })).status, 403);
});

test('TH3: trả đúng hạn — không phạt, bản sách Khả dụng, phiếu đóng', async () => {
  const res = await giveBack('BS000010');
  assert.equal(res.status, 200);
  assert.equal(res.body.message, 'Trả sách thành công');
  assert.equal(res.body.data.fine, null);
  assert.equal(res.body.data.lateDays, 0);
  assert.equal(res.body.data.ticketCompleted, true);
  assert.equal(await copyStatus('BS000010'), 'AVAILABLE');
});

test('TH4: trả trễ 5 ngày — khoản phạt 5.000đ "Chưa thu", độc giả bị chặn đến khi nộp', async () => {
  const res = await giveBack('BS000013');
  assert.equal(res.body.data.fine.amount, 5000);
  assert.equal(res.body.data.fine.status, 'UNPAID');
  assert.equal(res.body.message, 'Trả sách thành công. Trễ 5 ngày, tiền phạt 5.000đ');
  assert.deepEqual(await problemsOf('HS2026004'), ['UNPAID_FINE']);   // hết quá hạn nhưng còn nợ
});

test('UC009 7a: hư hỏng / mất phải có ghi chú; mất vẫn tính phạt trễ', async () => {
  const noNote = await giveBack('BS000016', 'LOST');
  assert.equal(noNote.status, 400);
  assert.equal(noNote.body.message, 'Cần nhập ghi chú khi sách bị hư hỏng hoặc mất');

  const lost = await giveBack('BS000016', 'LOST', 'Độc giả làm mất');
  assert.equal(lost.body.data.condition, 'LOST');
  assert.equal(lost.body.data.fine.amount, 30000);
  assert.equal(await copyStatus('BS000016'), 'LOST');
});

test('UC009 11a: phiếu nhiều cuốn chỉ đóng khi trả hết; trả lại lần 2 bị chặn', async () => {
  const first = await giveBack('BS000001', 'DAMAGED', 'Rách bìa');
  assert.equal(first.body.data.ticketCompleted, false);
  assert.equal(await copyStatus('BS000001'), 'DAMAGED');

  assert.equal((await giveBack('BS000004')).body.data.ticketCompleted, false);
  assert.equal((await giveBack('BS000007')).body.data.ticketCompleted, true);

  assert.equal((await giveBack('BS000001')).status, 409);

  const [[{ n }]] = await t.pool.query(
    "SELECT COUNT(*) AS n FROM copy_status_logs WHERE old_status = 'BORROWED' AND changed_by = 2",
  );
  assert.equal(n, 6);   // 6 lần trả trong file test này
});

test('UC011 1a: danh sách khoản phạt của độc giả', async () => {
  const res = await t.api('GET', '/fines?readerCode=hs2026004', { token: librarian });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.unpaidTotal, 5000);
  assert.equal(res.body.data.items[0].status, 'UNPAID');
  assert.equal(res.body.data.items[0].copyCode, 'BS000013');

  assert.equal((await t.api('GET', '/fines?status=UNPAID', { token: librarian })).body.data.total, 3);
  assert.equal((await t.api('GET', '/fines?readerCode=HS9999999', { token: librarian })).status, 404);
});

test('UC011: thu phạt → "Đã thu", có biên lai, độc giả được mượn lại', async () => {
  const [fine] = (await t.api('GET', '/fines?readerCode=HS2026004', { token: librarian })).body.data.items;

  const res = await t.api('POST', `/fines/${fine.fineId}/pay`, { token: librarian });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.receipt.receiptCode, `BL${String(fine.fineId).padStart(6, '0')}`);
  assert.equal(res.body.data.receipt.amount, 5000);
  assert.equal(res.body.data.receipt.collectedBy.username, 'TT01');
  assert.equal(res.body.data.remainingUnpaid, 0);
  assert.equal(res.body.message, 'Đã thu tiền phạt. Độc giả không còn khoản phạt chưa thu');

  assert.deepEqual(await problemsOf('HS2026004'), []);

  assert.equal((await t.api('POST', `/fines/${fine.fineId}/pay`, { token: librarian })).status, 409);
  assert.equal((await t.api('POST', '/fines/9999/pay', { token: librarian })).status, 404);
});

test('Biên lai: Thủ thư và chủ khoản phạt xem được; người khác bị chặn và ghi nhật ký', async () => {
  assert.equal((await t.api('GET', '/fines/2/receipt', { token: librarian })).status, 200);   // GV2026002 đã nộp

  const owner = await t.api('GET', '/fines/2/receipt', { token: await t.login('GV2026002') });
  assert.equal(owner.status, 200);
  assert.equal(owner.body.data.amount, 4000);

  const other = await t.api('GET', '/fines/2/receipt', { token: await t.login('HS2026001') });
  assert.equal(other.status, 403);
  const [[{ n }]] = await t.pool.query("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'UNAUTHORIZED_ACCESS'");
  assert.equal(n, 1);

  assert.equal((await t.api('GET', '/fines/1/receipt', { token: librarian })).status, 409);   // chưa thu
});

test('Trả trễ đúng 1 ngày — phạt 1.000đ', async () => {
  const loan = await t.api('POST', '/loans', { token: librarian, body: { readerCode: 'GV2026003', copyCodes: ['BS000040'] } });
  assert.equal(loan.status, 201);
  // Giả lập phiếu đã quá hạn từ hôm qua
  await t.pool.query('UPDATE borrow_details SET due_date = ? WHERE borrow_detail_id = ?',
    [addDays(todayVN(), -1), loan.body.data.items[0].borrowDetailId]);

  const preview = await lookup('BS000040');
  assert.equal(preview.body.data.lateDays, 1);
  assert.equal(preview.body.data.fineAmount, 1000);

  const res = await giveBack('BS000040');
  assert.equal(res.body.data.fine.amount, 1000);
  assert.equal(res.body.message, 'Trả sách thành công. Trễ 1 ngày, tiền phạt 1.000đ');
});
