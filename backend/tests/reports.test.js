const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { todayVN, addDays } = require('../src/utils/date');

let t;
let librarian;
let admin;
before(async () => {
  t = await startApp();
  librarian = await t.login('TT01');
  admin = await t.login('AD001');
});
after(async () => { await t.stop(); });

const today = todayVN();
const from60 = addDays(today, -60);
const periodQuery = `?from=${from60}&to=${today}`;

test('Phân quyền UC016: Thủ thư và Admin xem được báo cáo; độc giả bị chặn', async () => {
  const reader = await t.login('HS2026001');
  assert.equal((await t.api('GET', `/reports/loans${periodQuery}`)).status, 401);
  assert.equal((await t.api('GET', `/reports/loans${periodQuery}`, { token: reader })).status, 403);
  assert.equal((await t.api('GET', `/reports/loans/export${periodQuery}&format=pdf`, { token: reader })).status, 403);

  assert.equal((await t.api('GET', `/reports/loans${periodQuery}`, { token: librarian })).status, 200);
  assert.equal((await t.api('GET', `/reports/loans${periodQuery}`, { token: admin })).status, 200);
});

test('UC016 6a: kỳ báo cáo không hợp lệ (từ ngày > đến ngày, đến ngày ở tương lai, thiếu ngày)', async () => {
  const reversed = await t.api('GET', `/reports/loans?from=${today}&to=${addDays(today, -5)}`, { token: librarian });
  assert.equal(reversed.status, 400);
  assert.equal(reversed.body.message, 'Kỳ báo cáo không hợp lệ');

  const future = await t.api('GET', `/reports/overdue?from=${today}&to=${addDays(today, 1)}`, { token: librarian });
  assert.equal(future.status, 400);
  assert.equal(future.body.message, 'Kỳ báo cáo không hợp lệ');

  // Thiếu "Đến ngày" (bắt buộc theo Bảng 2.46) → báo đúng trường bị thiếu
  const missing = await t.api('GET', '/reports/fines?from=2026-10-01', { token: librarian });
  assert.equal(missing.status, 400);
  assert.deepEqual(missing.body.errors, [{ field: 'to', message: 'Cần nhập đến ngày dạng YYYY-MM-DD' }]);

  // Xuất file cũng bắt buộc nhập kỳ báo cáo, không tự lấy kỳ mặc định
  const exportMissing = await t.api('GET', '/reports/loans/export?format=xlsx', { token: librarian });
  assert.equal(exportMissing.status, 400);
  assert.equal(exportMissing.body.message, 'Cần nhập từ ngày dạng YYYY-MM-DD');
});

test('UC016 (1): báo cáo thống kê mượn/trả và dòng tổng cộng', async () => {
  const res = await t.api('GET', `/reports/loans${periodQuery}`, { token: librarian });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.data.summary, {
    totalTickets: 8,
    totalBorrowedBooks: 12,
    totalReturnedBooks: 3,
    returnedInPeriod: 3,
    borrowingBooks: 9,
    overdueBooks: 2,
    studentTickets: 6,
    teacherTickets: 2,
  });
  assert.equal(res.body.data.items.length, 8);
});

test('UC016 (2): báo cáo sách trả trễ và đang quá hạn', async () => {
  const res = await t.api('GET', `/reports/overdue${periodQuery}`, { token: librarian });
  assert.equal(res.status, 200);
  const { summary, overdueItems, lateReturnedItems } = res.body.data;

  assert.equal(summary.overdueCount, 2);        // BS000013 (5 ngày → 5.000đ), BS000016 (45 ngày → 30.000đ)
  assert.equal(summary.lateReturnedCount, 2);   // BS000019 (3 ngày → 3.000đ), BS000031 (4 ngày → 4.000đ)
  assert.equal(summary.totalItems, 4);
  assert.equal(summary.overdueFineAmount, 35000);
  assert.equal(summary.lateReturnedFineAmount, 7000);
  assert.equal(summary.totalFineAmount, 42000);

  assert.deepEqual(overdueItems.map((i) => [i.copyCode, i.lateDays, i.fineAmount]), [
    ['BS000016', 45, 30000],
    ['BS000013', 5, 5000],
  ]);
  assert.deepEqual(lateReturnedItems.map((i) => [i.copyCode, i.lateDays, i.fineAmount]), [
    ['BS000031', 4, 4000],
    ['BS000019', 3, 3000],
  ]);
});

test('UC016 (3): báo cáo tiền phạt đã thu / chưa thu và danh sách độc giả còn nợ', async () => {
  const res = await t.api('GET', `/reports/fines${periodQuery}`, { token: librarian });
  assert.equal(res.status, 200);
  const { summary, debtors, items } = res.body.data;

  assert.deepEqual(summary, {
    totalFines: 2,
    totalAmount: 7000,
    paidCount: 1,
    paidAmount: 4000,
    unpaidCount: 1,
    unpaidAmount: 3000,
    debtorCount: 1,
  });
  assert.equal(items.length, 2);
  assert.equal(debtors.length, 1);
  assert.equal(debtors[0].readerCode, 'HS2026005');
  assert.equal(debtors[0].unpaidTotal, 3000);
});

test('UC016 8a: không có dữ liệu trong kỳ đã chọn', async () => {
  const emptyQuery = `?from=${addDays(today, -300)}&to=${addDays(today, -250)}`;

  for (const type of ['loans', 'overdue', 'fines']) {
    const res = await t.api('GET', `/reports/${type}${emptyQuery}`, { token: librarian });
    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Không có dữ liệu trong kỳ đã chọn');
    assert.deepEqual(res.body.data.items, []);
  }
});

test('UC016 bước 9–10: xuất báo cáo ra file Excel (.xlsx) và PDF (.pdf) có tiếng Việt', async () => {
  const xlsx = await t.api('GET', `/reports/loans/export${periodQuery}&format=xlsx`, { token: librarian });
  assert.equal(xlsx.status, 200);
  assert.match(xlsx.headers.get('content-type'), /spreadsheetml\.sheet/);
  assert.match(xlsx.headers.get('content-disposition'), /bao-cao-loans-.*\.xlsx/);
  assert.equal(xlsx.buffer.subarray(0, 2).toString(), 'PK');   // chữ ký file ZIP/XLSX

  const pdf = await t.api('GET', `/reports/overdue/export${periodQuery}&format=pdf`, { token: librarian });
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get('content-type'), /application\/pdf/);
  assert.match(pdf.headers.get('content-disposition'), /bao-cao-overdue-.*\.pdf/);
  assert.equal(pdf.buffer.subarray(0, 5).toString(), '%PDF-');

  const finesPdf = await t.api('GET', `/reports/fines/export${periodQuery}&format=pdf`, { token: admin });
  assert.equal(finesPdf.status, 200);
  assert.equal(finesPdf.buffer.subarray(0, 5).toString(), '%PDF-');

  const badType = await t.api('GET', `/reports/unknown/export${periodQuery}&format=xlsx`, { token: librarian });
  assert.equal(badType.status, 400);
  assert.equal(badType.body.message, 'Loại báo cáo phải là loans, overdue hoặc fines');

  const badFormat = await t.api('GET', `/reports/loans/export${periodQuery}&format=csv`, { token: librarian });
  assert.equal(badFormat.status, 400);
  assert.equal(badFormat.body.message, 'Định dạng xuất phải là xlsx hoặc pdf');
});

