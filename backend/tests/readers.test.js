const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { todayVN } = require('../src/utils/date');

let t;
let librarian;
before(async () => {
  t = await startApp();
  librarian = await t.login('TT01');
});
after(async () => { await t.stop(); });

// Cộng ngày cho chuỗi 'YYYY-MM-DD'
const addDays = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const today = todayVN();

const newReader = {
  readerCode: 'hs2026012',
  fullName: 'Trương Bảo Ngọc',
  readerType: 'STUDENT',
  className: '11A3',
  department: 'Tổ Toán',      // học sinh không lưu tổ bộ môn → bị bỏ
  email: 'ngoc.truong@student.thptmau.edu.vn',
  dateOfBirth: '2009-04-01',
};

test('Phân quyền: độc giả không vào được UC003, Thủ thư và Admin vào được', async () => {
  assert.equal((await t.api('GET', '/readers')).status, 401);
  assert.equal((await t.api('GET', '/readers', { token: await t.login('HS2026001') })).status, 403);
  assert.equal((await t.api('GET', '/readers', { token: librarian })).status, 200);
  assert.equal((await t.api('GET', '/readers', { token: await t.login('AD001') })).status, 200);
});

test('UC003 bước 2–3: danh sách, tìm theo lớp / tên / tổ, lọc loại độc giả', async () => {
  const all = await t.api('GET', '/readers?pageSize=100', { token: librarian });
  assert.equal(all.body.data.total, 14);

  const byClass = await t.api('GET', '/readers?keyword=10A1', { token: librarian });
  assert.deepEqual(byClass.body.data.items.map((r) => r.readerCode), ['HS2026001', 'HS2026002']);

  const byName = await t.api('GET', '/readers?keyword=thao', { token: librarian });   // không dấu vẫn ra "Thảo"
  assert.deepEqual(byName.body.data.items.map((r) => r.readerCode), ['HS2026011']);

  const teachers = await t.api('GET', '/readers?readerType=TEACHER', { token: librarian });
  assert.equal(teachers.body.data.total, 3);

  const none = await t.api('GET', '/readers?keyword=khongcoai', { token: librarian });
  assert.equal(none.body.data.total, 0);
});

test('Chi tiết độc giả: có tài khoản và trạng thái thẻ thực tế', async () => {
  const expired = await t.api('GET', '/readers/7', { token: librarian });   // HS2026007
  assert.equal(expired.body.data.card.status, 'EXPIRED');
  assert.equal(expired.body.data.account.username, 'HS2026007');

  const noAccount = await t.api('GET', '/readers/14', { token: librarian }); // HS2026011
  assert.equal(noAccount.body.data.account, null);

  assert.equal((await t.api('GET', '/readers/999', { token: librarian })).status, 404);
});

test('UC003: thêm hồ sơ; 7a dữ liệu sai; 7b trùng mã', async () => {
  const res = await t.api('POST', '/readers', { token: librarian, body: newReader });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.readerCode, 'HS2026012');   // tự viết hoa
  assert.equal(res.body.data.department, null);
  assert.equal(res.body.data.card, null);
  assert.equal(res.body.data.account, null);

  const duplicate = await t.api('POST', '/readers', { token: librarian, body: newReader });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.message, 'Mã độc giả đã tồn tại');

  const noName = await t.api('POST', '/readers', { token: librarian, body: { ...newReader, readerCode: 'HS2026013', fullName: '  ' } });
  assert.equal(noName.status, 400);
  assert.equal(noName.body.message, 'Cần nhập họ và tên');

  const badEmail = await t.api('POST', '/readers', { token: librarian, body: { ...newReader, readerCode: 'HS2026013', email: 'abc' } });
  assert.equal(badEmail.body.message, 'Email không đúng định dạng');
});

test('UC003: sửa hồ sơ thì tài khoản liên kết cũng đổi họ tên; mã độc giả không đổi', async () => {
  const res = await t.api('PUT', '/readers/1', {
    token: librarian,
    body: { readerCode: 'DOIMA', fullName: 'Lê Minh An Khang', readerType: 'STUDENT', className: '10A2' },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.readerCode, 'HS2026001');
  assert.equal(res.body.data.className, '10A2');

  const me = await t.api('GET', '/auth/me', { token: await t.login('HS2026001') });
  assert.equal(me.body.data.fullName, 'Lê Minh An Khang');
});

test('UC003: cấp thẻ; 7c ngày hết hạn không sau ngày cấp; không cấp thẻ lần 2', async () => {
  const [[{ reader_id: id }]] = await t.pool.query("SELECT reader_id FROM readers WHERE reader_code = 'HS2026012'");

  const badDates = await t.api('POST', `/readers/${id}/card`, { token: librarian, body: { issuedDate: today, expiryDate: today } });
  assert.equal(badDates.status, 400);
  assert.equal(badDates.body.message, 'Ngày hết hạn thẻ phải sau ngày cấp');

  const issued = await t.api('POST', `/readers/${id}/card`, { token: librarian, body: { expiryDate: addDays(today, 200) } });
  assert.equal(issued.status, 201);
  assert.equal(issued.body.data.card.issuedDate, today);
  assert.equal(issued.body.data.card.status, 'ACTIVE');

  const again = await t.api('POST', `/readers/${id}/card`, { token: librarian, body: { expiryDate: addDays(today, 300) } });
  assert.equal(again.status, 409);
});

test('UC003: gia hạn thẻ đã hết hạn', async () => {
  const past = await t.api('PATCH', '/readers/7/card/expiry', { token: librarian, body: { expiryDate: addDays(today, -1) } });
  assert.equal(past.status, 400);

  const res = await t.api('PATCH', '/readers/7/card/expiry', { token: librarian, body: { expiryDate: addDays(today, 180) } });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.card.status, 'ACTIVE');
});

test('UC003: khóa / mở khóa thẻ', async () => {
  const lock = await t.api('PATCH', '/readers/1/card/status', { token: librarian, body: { status: 'LOCKED' } });
  assert.equal(lock.body.data.card.status, 'LOCKED');
  assert.equal((await t.api('PATCH', '/readers/1/card/status', { token: librarian, body: { status: 'LOCKED' } })).status, 409);

  const unlock = await t.api('PATCH', '/readers/9/card/status', { token: librarian, body: { status: 'ACTIVE' } });  // HS2026009
  assert.equal(unlock.body.data.card.status, 'ACTIVE');

  const [{ insertId: noCard }] = await t.pool.query(
    "INSERT INTO readers (reader_code, full_name, reader_type) VALUES ('HS2026099', 'Chưa Có Thẻ', 'STUDENT')",
  );
  const noCardRes = await t.api('PATCH', `/readers/${noCard}/card/status`, { token: librarian, body: { status: 'LOCKED' } });
  assert.equal(noCardRes.status, 404);
  assert.equal(noCardRes.body.message, 'Độc giả chưa được cấp thẻ');
});
