const { pool } = require('../../config/db');

// Hồ sơ độc giả kèm tài khoản (nếu có) và thẻ (nếu có).
// card_effective_status: trạng thái thực tế của thẻ — LOCKED, EXPIRED (tính từ ngày hết hạn) hoặc ACTIVE.
const READER_COLUMNS = `
  r.reader_id, r.reader_code, r.full_name, r.reader_type, r.class_name, r.department,
  r.email, r.date_of_birth, r.created_at, r.user_id,
  u.username, u.status AS account_status,
  c.card_id, c.issued_date, c.expiry_date, c.status AS card_status,
  CASE WHEN c.card_id IS NULL        THEN NULL
       WHEN c.status = 'LOCKED'      THEN 'LOCKED'
       WHEN c.expiry_date < CURDATE() THEN 'EXPIRED'
       ELSE 'ACTIVE' END AS card_effective_status`;

const READER_FROM = `
  FROM readers r
  LEFT JOIN users u         ON u.user_id = r.user_id
  LEFT JOIN library_cards c ON c.reader_id = r.reader_id`;

async function search({ keyword, readerType, limit, offset }, db = pool) {
  const where = [];
  const params = [];
  if (keyword) {
    where.push('(r.reader_code LIKE ? OR r.full_name LIKE ? OR r.class_name LIKE ? OR r.department LIKE ?)');
    params.push(...Array(4).fill(`%${keyword}%`));
  }
  if (readerType) {
    where.push('r.reader_type = ?');
    params.push(readerType);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT ${READER_COLUMNS} ${READER_FROM} ${whereSql} ORDER BY r.reader_code LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM readers r ${whereSql}`, params);
  return { rows, total };
}

async function findById(readerId, db = pool) {
  const [rows] = await db.query(`SELECT ${READER_COLUMNS} ${READER_FROM} WHERE r.reader_id = ?`, [readerId]);
  return rows[0] ?? null;
}

// Khóa dòng hồ sơ đến hết transaction, tránh hai thủ thư cùng sửa một độc giả
async function lockById(readerId, db = pool) {
  const [rows] = await db.query('SELECT reader_id, user_id FROM readers WHERE reader_id = ? FOR UPDATE', [readerId]);
  return rows[0] ?? null;
}

async function existsByCode(readerCode, db = pool) {
  const [rows] = await db.query('SELECT 1 FROM readers WHERE reader_code = ?', [readerCode]);
  return rows.length > 0;
}

async function insert(data, db = pool) {
  const [result] = await db.query(
    `INSERT INTO readers (reader_code, full_name, reader_type, class_name, department, email, date_of_birth)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.readerCode, data.fullName, data.readerType, data.className, data.department, data.email, data.dateOfBirth],
  );
  return result.insertId;
}

async function update(readerId, data, db = pool) {
  await db.query(
    `UPDATE readers
     SET full_name = ?, reader_type = ?, class_name = ?, department = ?, email = ?, date_of_birth = ?
     WHERE reader_id = ?`,
    [data.fullName, data.readerType, data.className, data.department, data.email, data.dateOfBirth, readerId],
  );
}

// Giữ họ tên, email của tài khoản trùng với hồ sơ độc giả
async function syncAccount(userId, { fullName, email }, db = pool) {
  await db.query('UPDATE users SET full_name = ?, email = ? WHERE user_id = ?', [fullName, email, userId]);
}

async function findCardForUpdate(readerId, db = pool) {
  const [rows] = await db.query('SELECT * FROM library_cards WHERE reader_id = ? FOR UPDATE', [readerId]);
  return rows[0] ?? null;
}

async function insertCard(readerId, { issuedDate, expiryDate }, db = pool) {
  await db.query(
    'INSERT INTO library_cards (reader_id, issued_date, expiry_date) VALUES (?, ?, ?)',
    [readerId, issuedDate, expiryDate],
  );
}

async function updateCardExpiry(readerId, expiryDate, db = pool) {
  await db.query('UPDATE library_cards SET expiry_date = ? WHERE reader_id = ?', [expiryDate, readerId]);
}

async function updateCardStatus(readerId, status, db = pool) {
  await db.query('UPDATE library_cards SET status = ? WHERE reader_id = ?', [status, readerId]);
}

module.exports = {
  search,
  findById,
  lockById,
  existsByCode,
  insert,
  update,
  syncAccount,
  findCardForUpdate,
  insertCard,
  updateCardExpiry,
  updateCardStatus,
};
