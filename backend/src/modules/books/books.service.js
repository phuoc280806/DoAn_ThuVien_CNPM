const { withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const ROLES = require('../../constants/roles');
const repo = require('./books.repository');
const copiesRepo = require('../copies/copies.repository');
const { toCategoryDto, toBookDto, toCopyDto } = require('./books.mapper');

async function listCategories() {
  return (await repo.listCategories()).map(toCategoryDto);
}

// Độc giả không thấy đầu sách đã ẩn; Thủ thư / Admin thấy tất cả
const canSeeHidden = (viewer) => viewer.role !== ROLES.READER;

// UC006 – Tra cứu sách & xem số bản khả dụng (UC005 bước 3–6 dùng chung)
async function list({ keyword, categoryId, page = 1, pageSize = 20 }, viewer) {
  const { rows, total } = await repo.search({
    keyword,
    categoryId,
    includeHidden: canSeeHidden(viewer),
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows.map(toBookDto), page, pageSize, total };
}

async function getById(bookId, viewer) {
  const book = await repo.findById(bookId);
  if (!book || (book.is_hidden && !canSeeHidden(viewer))) throw new AppError(404, 'Không tìm thấy đầu sách');
  return toBookDto(book);
}

async function assertCategory(categoryId, conn) {
  if (!(await repo.categoryExists(categoryId, conn))) {
    throw new AppError(400, 'Thể loại không thuộc danh sách được quản lý', [
      { field: 'categoryId', message: 'Thể loại không thuộc danh sách được quản lý' },
    ]);
  }
}

// UC004 8a: ISBN không trùng với đầu sách khác
async function assertIsbnFree(isbn, conn, exceptBookId = null) {
  const owner = await repo.findIdByIsbn(isbn, conn);
  if (owner && owner !== exceptBookId) throw new AppError(409, 'ISBN đã tồn tại trong hệ thống');
}

async function lockBook(bookId, conn) {
  const book = await repo.lockById(bookId, conn);
  if (!book) throw new AppError(404, 'Không tìm thấy đầu sách');
  return book;
}

// UC004 – Thêm đầu sách, có thể nhập luôn N bản sách (quyết định 1)
async function create({ copies = 0, location = null, ...data }) {
  return withTransaction(async (conn) => {
    await assertIsbnFree(data.isbn, conn);
    await assertCategory(data.categoryId, conn);
    const bookId = await repo.insert({ description: null, ...data }, conn);
    if (copies > 0) await copiesRepo.insertMany(bookId, copies, location, conn);
    return toBookDto(await repo.findById(bookId, conn));
  });
}

// UC004 – Sửa đầu sách
async function update(bookId, data) {
  return withTransaction(async (conn) => {
    await lockBook(bookId, conn);
    await assertIsbnFree(data.isbn, conn, bookId);
    await assertCategory(data.categoryId, conn);
    await repo.update(bookId, { description: null, ...data }, conn);
    return toBookDto(await repo.findById(bookId, conn));
  });
}

/**
 * UC004 – Xóa đầu sách (quyết định 7):
 * - còn bản đang được mượn → từ chối (8b)
 * - đã từng được mượn → chỉ ẩn, giữ lịch sử
 * - chưa từng được mượn → xóa hẳn cùng các bản sách
 */
async function remove(bookId) {
  return withTransaction(async (conn) => {
    await lockBook(bookId, conn);
    if ((await repo.countBorrowedCopies(bookId, conn)) > 0) {
      throw new AppError(409, 'Đầu sách còn bản sách đang được mượn, không thể xóa');
    }
    if (await repo.hasBorrowHistory(bookId, conn)) {
      await repo.setHidden(bookId, true, conn);
      return { deleted: false, book: toBookDto(await repo.findById(bookId, conn)) };
    }
    await repo.deleteWithCopies(bookId, conn);
    return { deleted: true, book: null };
  });
}

// UC004 – Ẩn / hiện lại đầu sách
async function setHidden(bookId, hidden) {
  return withTransaction(async (conn) => {
    await lockBook(bookId, conn);
    await repo.setHidden(bookId, hidden, conn);
    return toBookDto(await repo.findById(bookId, conn));
  });
}

// UC005 bước 8 – Danh sách bản sách của một đầu sách
async function listCopies(bookId) {
  const book = await repo.findById(bookId);
  if (!book) throw new AppError(404, 'Không tìm thấy đầu sách');
  return { book: toBookDto(book), copies: (await copiesRepo.listByBook(bookId)).map(toCopyDto) };
}

// Nhập thêm bản sách cho đầu sách đã có (quyết định 1)
async function addCopies(bookId, { quantity, location = null }) {
  return withTransaction(async (conn) => {
    await lockBook(bookId, conn);
    await copiesRepo.insertMany(bookId, quantity, location, conn);
    return {
      book: toBookDto(await repo.findById(bookId, conn)),
      copies: (await copiesRepo.listByBook(bookId, conn)).map(toCopyDto),
    };
  });
}

module.exports = { listCategories, list, getById, create, update, remove, setHidden, listCopies, addCopies };
