const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { isValidIsbn13 } = require('../src/utils/isbn');

let t;
let librarian;
let reader;
before(async () => {
  t = await startApp();
  librarian = await t.login('TT01');
  reader = await t.login('HS2026001');
});
after(async () => { await t.stop(); });

const newBook = {
  isbn: '978-604-300-742-8',   // có dấu gạch, sẽ được chuẩn hóa
  title: 'Hóa học 12',
  author: 'Bộ GD&ĐT',
  publisher: 'NXB Giáo dục Việt Nam',
  publishYear: 2024,
  categoryId: 1,
  description: 'Sách giáo khoa Hóa học lớp 12',
  copies: 3,
  location: 'Kệ A2',
};

test('Kiểm tra ISBN-13', () => {
  assert.equal(isValidIsbn13('9786043000535'), true);
  assert.equal(isValidIsbn13('9786043000536'), false);   // sai số kiểm tra
  assert.equal(isValidIsbn13('978604300053'), false);    // thiếu số
});

test('Thể loại: ai đăng nhập cũng xem được', async () => {
  const res = await t.api('GET', '/categories', { token: reader });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 6);
  assert.equal((await t.api('GET', '/categories')).status, 401);
});

test('UC006: tra cứu không dấu, kèm số bản khả dụng', async () => {
  const res = await t.api('GET', '/books?keyword=de men', { token: reader });
  assert.equal(res.status, 200);
  const [book] = res.body.data.items;
  assert.equal(book.title, 'Dế Mèn phiêu lưu ký');
  assert.equal(book.totalCopies, 3);
  assert.equal(book.availableCopies, 2);   // BS000010 đang được HS2026003 mượn

  const byIsbn = await t.api('GET', '/books?keyword=9786043004779', { token: reader });
  assert.deepEqual(byIsbn.body.data.items.map((b) => b.title), ['Truyện Kiều']);

  const byCategory = await t.api('GET', '/books?categoryId=3', { token: reader });
  assert.deepEqual(byCategory.body.data.items.map((b) => b.title).sort(),
    ['Lược sử thời gian', 'Nguồn gốc các loài', 'Vũ trụ trong vỏ hạt dẻ', 'Vật lý vui']);
});

test('UC006 8a: đầu sách không còn bản khả dụng trả về 0', async () => {
  const res = await t.api('GET', '/books/13', { token: reader });   // Không gia đình
  assert.equal(res.body.data.availableCopies, 0);
  assert.equal(res.body.data.totalCopies, 3);
});

test('Đầu sách ẩn: độc giả không thấy, Thủ thư thấy', async () => {
  const byReader = await t.api('GET', '/books?keyword=vat li', { token: reader });
  assert.deepEqual(byReader.body.data.items.map((b) => b.bookId), [3]);
  assert.equal((await t.api('GET', '/books/12', { token: reader })).status, 404);

  const byLibrarian = await t.api('GET', '/books?keyword=vat li', { token: librarian });
  assert.deepEqual(byLibrarian.body.data.items.map((b) => b.bookId).sort(), [12, 3]);
  assert.equal((await t.api('GET', '/books/12', { token: librarian })).body.data.isHidden, true);
});

test('Phân quyền: độc giả không thêm / sửa / xóa sách', async () => {
  assert.equal((await t.api('POST', '/books', { token: reader, body: newBook })).status, 403);
  assert.equal((await t.api('DELETE', '/books/1', { token: reader })).status, 403);
  assert.equal((await t.api('GET', '/books/1/copies', { token: reader })).status, 403);
});

test('UC004: thêm đầu sách kèm 3 bản; 7a dữ liệu sai; 8a trùng ISBN', async () => {
  const res = await t.api('POST', '/books', { token: librarian, body: newBook });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.isbn, '9786043007428');
  assert.equal(res.body.data.totalCopies, 3);
  assert.equal(res.body.data.availableCopies, 3);

  const copies = await t.api('GET', `/books/${res.body.data.bookId}/copies`, { token: librarian });
  assert.deepEqual(copies.body.data.copies.map((c) => c.copyCode), ['BS000091', 'BS000092', 'BS000093']);
  assert.equal(copies.body.data.copies[0].location, 'Kệ A2');

  const duplicate = await t.api('POST', '/books', { token: librarian, body: newBook });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.message, 'ISBN đã tồn tại trong hệ thống');

  const badIsbn = await t.api('POST', '/books', { token: librarian, body: { ...newBook, isbn: '9786043007429' } });
  assert.equal(badIsbn.body.message, 'ISBN không đúng định dạng ISBN-13');

  const noIsbn = await t.api('POST', '/books', { token: librarian, body: { ...newBook, isbn: '' } });
  assert.equal(noIsbn.body.message, 'Cần nhập ISBN');

  const future = await t.api('POST', '/books', { token: librarian, body: { ...newBook, isbn: '9786043007954', publishYear: 2999 } });
  assert.equal(future.body.message, 'Năm xuất bản không được vượt quá năm hiện tại');

  const badCategory = await t.api('POST', '/books', { token: librarian, body: { ...newBook, isbn: '9786043007954', categoryId: 99 } });
  assert.equal(badCategory.status, 400);
  assert.equal(badCategory.body.message, 'Thể loại không thuộc danh sách được quản lý');
});

test('UC004: sửa đầu sách; đổi sang ISBN của sách khác bị chặn', async () => {
  const body = { ...newBook, isbn: '9786043000535', title: 'Ngữ văn 10 (tái bản)', copies: undefined, location: undefined };
  assert.equal((await t.api('PUT', '/books/2', { token: librarian, body })).status, 409);   // ISBN của sách 1

  const res = await t.api('PUT', '/books/1', { token: librarian, body });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.title, 'Ngữ văn 10 (tái bản)');
});

test('Nhập thêm bản sách cho đầu sách đã có', async () => {
  const res = await t.api('POST', '/books/5/copies', { token: librarian, body: { quantity: 2, location: 'Kệ B2' } });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.book.totalCopies, 5);
  assert.deepEqual(res.body.data.copies.slice(-2).map((c) => c.copyCode), ['BS000094', 'BS000095']);

  assert.equal((await t.api('POST', '/books/5/copies', { token: librarian, body: { quantity: 0 } })).status, 400);
});

test('UC004: xóa – 8b còn bản đang mượn; đã có lịch sử thì ẩn; chưa từng mượn thì xóa hẳn', async () => {
  const borrowed = await t.api('DELETE', '/books/4', { token: librarian });   // BS000010 đang mượn
  assert.equal(borrowed.status, 409);
  assert.equal(borrowed.body.message, 'Đầu sách còn bản sách đang được mượn, không thể xóa');

  const hidden = await t.api('DELETE', '/books/10', { token: librarian });    // Đắc nhân tâm: đã trả hết
  assert.equal(hidden.status, 200);
  assert.equal(hidden.body.data.deleted, false);
  assert.equal(hidden.body.data.book.isHidden, true);

  const deleted = await t.api('DELETE', '/books/13', { token: librarian });   // Không gia đình: chưa từng mượn
  assert.equal(deleted.body.data.deleted, true);
  assert.equal((await t.api('GET', '/books/13', { token: librarian })).status, 404);

  const unhide = await t.api('PATCH', '/books/10/hidden', { token: librarian, body: { hidden: false } });
  assert.equal(unhide.body.data.isHidden, false);
});

test('Tra bản sách theo mã quét', async () => {
  const res = await t.api('GET', '/copies/code/bs000005', { token: librarian });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.book.title, 'Toán 10');
  assert.equal((await t.api('GET', '/copies/code/BS999999', { token: librarian })).status, 404);
});

test('UC005: đổi trạng thái bản sách theo quy tắc, có ghi lịch sử', async () => {
  const change = (id, body) => t.api('PATCH', `/copies/${id}/status`, { token: librarian, body });

  const noReason = await change(5, { status: 'DAMAGED' });
  assert.equal(noReason.status, 400);
  assert.equal(noReason.body.message, 'Cần nhập lý do khi bản sách bị hư hỏng hoặc mất');

  const damaged = await change(5, { status: 'DAMAGED', reason: 'Bìa sách bị rách' });
  assert.equal(damaged.status, 200);
  assert.equal(damaged.body.data.status, 'DAMAGED');
  assert.equal(damaged.body.data.note, 'Bìa sách bị rách');

  const repaired = await change(5, { status: 'AVAILABLE' });
  assert.equal(repaired.body.data.note, null);

  assert.equal((await change(5, { status: 'AVAILABLE' })).status, 409);                       // đã Khả dụng
  assert.equal((await change(1, { status: 'AVAILABLE' })).body.message,
    'Bản sách đang được mượn, trạng thái chỉ thay đổi khi trả sách');                           // BS000001 đang mượn
  assert.equal((await change(6, { status: 'BORROWED' })).body.message,
    'Không thể chuyển sang Đang mượn bằng tay, hãy lập phiếu mượn');
  assert.equal((await change(6, { status: 'MISSING' })).status, 400);                          // 11c

  await change(6, { status: 'LOST', reason: 'Độc giả báo mất' });
  assert.equal((await change(6, { status: 'DAMAGED', reason: 'x' })).body.message, 'Không thể chuyển từ Mất sang Hư hỏng');
  assert.equal((await change(6, { status: 'AVAILABLE' })).status, 200);                        // tìm lại được

  const [[{ n }]] = await t.pool.query('SELECT COUNT(*) AS n FROM copy_status_logs WHERE copy_id IN (5, 6)');
  assert.equal(n, 4);
});
