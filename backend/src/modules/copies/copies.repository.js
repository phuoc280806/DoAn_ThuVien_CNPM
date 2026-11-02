const { pool } = require('../../config/db');

const COPY_COLUMNS = `
  c.copy_id, c.copy_code, c.status, c.location, c.note, c.book_id, b.title, b.isbn`;

const COPY_FROM = 'FROM book_copies c JOIN books b ON b.book_id = c.book_id';

async function listByBook(bookId, db = pool) {
  const [rows] = await db.query(`SELECT ${COPY_COLUMNS} ${COPY_FROM} WHERE c.book_id = ? ORDER BY c.copy_id`, [bookId]);
  return rows;
}

async function findById(copyId, db = pool) {
  const [rows] = await db.query(`SELECT ${COPY_COLUMNS} ${COPY_FROM} WHERE c.copy_id = ?`, [copyId]);
  return rows[0] ?? null;
}

async function findByCode(copyCode, db = pool) {
  const [rows] = await db.query(`SELECT ${COPY_COLUMNS} ${COPY_FROM} WHERE c.copy_code = ?`, [copyCode]);
  return rows[0] ?? null;
}

async function lockById(copyId, db = pool) {
  const [rows] = await db.query('SELECT copy_id, status FROM book_copies WHERE copy_id = ? FOR UPDATE', [copyId]);
  return rows[0] ?? null;
}

/**
 * Nhập thêm `quantity` bản cho một đầu sách, mã tự sinh BS + copy_id (BS000040, ...).
 * Gọi trong transaction, sau khi đã khóa dòng đầu sách, để hai lần nhập cùng lúc không lẫn mã.
 */
async function insertMany(bookId, quantity, location, db = pool) {
  const values = Array.from({ length: quantity }, () => [bookId, location]);
  await db.query('INSERT INTO book_copies (book_id, location) VALUES ?', [values]);
  await db.query(
    "UPDATE book_copies SET copy_code = CONCAT('BS', LPAD(copy_id, 6, '0')) WHERE book_id = ? AND copy_code IS NULL",
    [bookId],
  );
}

async function updateStatus(copyId, status, note, db = pool) {
  await db.query('UPDATE book_copies SET status = ?, note = ? WHERE copy_id = ?', [status, note, copyId]);
}

async function insertStatusLog({ copyId, oldStatus, newStatus, reason, changedBy }, db = pool) {
  await db.query(
    `INSERT INTO copy_status_logs (copy_id, old_status, new_status, reason, changed_by)
     VALUES (?, ?, ?, ?, ?)`,
    [copyId, oldStatus, newStatus, reason, changedBy],
  );
}

module.exports = { listByBook, findById, findByCode, lockById, insertMany, updateStatus, insertStatusLog };
