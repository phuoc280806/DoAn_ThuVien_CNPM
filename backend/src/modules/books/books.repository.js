const { pool } = require('../../config/db');

const BOOK_COLUMNS = `
  b.book_id, b.isbn, b.title, b.author, b.publisher, b.publish_year, b.description, b.is_hidden,
  b.category_id, g.category_name,
  (SELECT COUNT(*) FROM book_copies c WHERE c.book_id = b.book_id) AS total_copies,
  (SELECT COUNT(*) FROM book_copies c WHERE c.book_id = b.book_id AND c.status = 'AVAILABLE') AS available_copies`;

const BOOK_FROM = 'FROM books b JOIN categories g ON g.category_id = b.category_id';

async function listCategories(db = pool) {
  const [rows] = await db.query('SELECT category_id, category_name, description FROM categories ORDER BY category_name');
  return rows;
}

async function categoryExists(categoryId, db = pool) {
  const [rows] = await db.query('SELECT 1 FROM categories WHERE category_id = ?', [categoryId]);
  return rows.length > 0;
}

/**
 * Tra cứu đầu sách (UC005 bước 3–6, UC006).
 * keyword khớp tên sách, tác giả hoặc ISBN; không phân biệt dấu nhờ collation của database.
 */
async function search({ keyword, categoryId, includeHidden, limit, offset }, db = pool) {
  const where = [];
  const params = [];
  if (keyword) {
    where.push('(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword.replace(/[-\s]/g, '')}%`);
  }
  if (categoryId) {
    where.push('b.category_id = ?');
    params.push(categoryId);
  }
  if (!includeHidden) where.push('b.is_hidden = FALSE');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT ${BOOK_COLUMNS} ${BOOK_FROM} ${whereSql} ORDER BY b.title, b.book_id LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM books b ${whereSql}`, params);
  return { rows, total };
}

async function findById(bookId, db = pool) {
  const [rows] = await db.query(`SELECT ${BOOK_COLUMNS} ${BOOK_FROM} WHERE b.book_id = ?`, [bookId]);
  return rows[0] ?? null;
}

// Khóa đầu sách đến hết transaction (sửa, xóa, thêm bản sách)
async function lockById(bookId, db = pool) {
  const [rows] = await db.query('SELECT book_id, isbn, is_hidden FROM books WHERE book_id = ? FOR UPDATE', [bookId]);
  return rows[0] ?? null;
}

async function findIdByIsbn(isbn, db = pool) {
  const [rows] = await db.query('SELECT book_id FROM books WHERE isbn = ?', [isbn]);
  return rows[0]?.book_id ?? null;
}

async function insert(data, db = pool) {
  const [result] = await db.query(
    `INSERT INTO books (isbn, title, author, publisher, publish_year, category_id, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.isbn, data.title, data.author, data.publisher, data.publishYear, data.categoryId, data.description],
  );
  return result.insertId;
}

async function update(bookId, data, db = pool) {
  await db.query(
    `UPDATE books
     SET isbn = ?, title = ?, author = ?, publisher = ?, publish_year = ?, category_id = ?, description = ?
     WHERE book_id = ?`,
    [data.isbn, data.title, data.author, data.publisher, data.publishYear, data.categoryId, data.description, bookId],
  );
}

async function setHidden(bookId, hidden, db = pool) {
  await db.query('UPDATE books SET is_hidden = ? WHERE book_id = ?', [hidden, bookId]);
}

async function countBorrowedCopies(bookId, db = pool) {
  const [[{ total }]] = await db.query(
    "SELECT COUNT(*) AS total FROM book_copies WHERE book_id = ? AND status = 'BORROWED'",
    [bookId],
  );
  return total;
}

// Đã từng có bản sách nào của đầu sách này nằm trong phiếu mượn chưa
async function hasBorrowHistory(bookId, db = pool) {
  const [rows] = await db.query(
    `SELECT 1 FROM borrow_details d JOIN book_copies c ON c.copy_id = d.copy_id
     WHERE c.book_id = ? LIMIT 1`,
    [bookId],
  );
  return rows.length > 0;
}

// Chỉ gọi khi đầu sách chưa từng được mượn
async function deleteWithCopies(bookId, db = pool) {
  await db.query(
    'DELETE l FROM copy_status_logs l JOIN book_copies c ON c.copy_id = l.copy_id WHERE c.book_id = ?',
    [bookId],
  );
  await db.query('DELETE FROM book_copies WHERE book_id = ?', [bookId]);
  await db.query('DELETE FROM books WHERE book_id = ?', [bookId]);
}

module.exports = {
  listCategories,
  categoryExists,
  search,
  findById,
  lockById,
  findIdByIsbn,
  insert,
  update,
  setHidden,
  countBorrowedCopies,
  hasBorrowHistory,
  deleteWithCopies,
};
