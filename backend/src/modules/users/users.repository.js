const { pool } = require('../../config/db');

// Mọi hàm nhận tham số db cuối cùng: mặc định là pool, truyền conn khi chạy trong transaction.

const USER_COLUMNS = `
  u.user_id, u.username, u.password_hash, u.full_name, u.email, u.phone, u.status,
  u.created_at, ro.role_name AS role,
  r.reader_id, r.reader_code, r.reader_type`;

const USER_FROM = `
  FROM users u
  JOIN roles ro       ON ro.role_id = u.role_id
  LEFT JOIN readers r ON r.user_id = u.user_id`;

async function findByUsername(username, db = pool) {
  const [rows] = await db.query(`SELECT ${USER_COLUMNS} ${USER_FROM} WHERE u.username = ?`, [username]);
  return rows[0] ?? null;
}

// forUpdate: khóa dòng đến hết transaction, tránh hai Admin cùng sửa một tài khoản
async function findById(userId, db = pool, { forUpdate = false } = {}) {
  const [rows] = await db.query(
    `SELECT ${USER_COLUMNS} ${USER_FROM} WHERE u.user_id = ? ${forUpdate ? 'FOR UPDATE OF u' : ''}`,
    [userId],
  );
  return rows[0] ?? null;
}

async function search({ keyword, role, status, limit, offset }, db = pool) {
  const where = [];
  const params = [];
  if (keyword) {
    where.push('(u.username LIKE ? OR u.full_name LIKE ? OR r.reader_code LIKE ? OR u.user_id = ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`, Number(keyword) || 0);
  }
  if (role) {
    where.push('ro.role_name = ?');
    params.push(role);
  }
  if (status) {
    where.push('u.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT ${USER_COLUMNS} ${USER_FROM} ${whereSql} ORDER BY u.user_id LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${USER_FROM} ${whereSql}`, params);
  return { rows, total };
}

async function countActiveAdmins(db = pool) {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM users u JOIN roles ro ON ro.role_id = u.role_id
     WHERE ro.role_name = 'ADMIN' AND u.status = 'ACTIVE'`,
  );
  return total;
}

async function findRoleId(roleName, db = pool) {
  const [rows] = await db.query('SELECT role_id FROM roles WHERE role_name = ?', [roleName]);
  return rows[0]?.role_id ?? null;
}

async function insert({ username, passwordHash, fullName, email, phone, roleId }, db = pool) {
  const [result] = await db.query(
    `INSERT INTO users (username, password_hash, full_name, email, phone, role_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [username, passwordHash, fullName, email, phone, roleId],
  );
  return result.insertId;
}

async function updateStatus(userId, status, db = pool) {
  await db.query('UPDATE users SET status = ? WHERE user_id = ?', [status, userId]);
}

async function updatePassword(userId, passwordHash, db = pool) {
  await db.query('UPDATE users SET password_hash = ? WHERE user_id = ?', [passwordHash, userId]);
}

async function updateRole(userId, roleId, db = pool) {
  await db.query('UPDATE users SET role_id = ? WHERE user_id = ?', [roleId, userId]);
}

// Hồ sơ độc giả để cấp tài khoản (UC002 cho độc giả đã có hồ sơ ở UC003)
async function findReaderByCode(readerCode, db = pool) {
  const [rows] = await db.query(
    'SELECT reader_id, reader_code, full_name, email, user_id FROM readers WHERE reader_code = ? FOR UPDATE',
    [readerCode],
  );
  return rows[0] ?? null;
}

async function linkReader(readerId, userId, db = pool) {
  await db.query('UPDATE readers SET user_id = ? WHERE reader_id = ?', [userId, readerId]);
}

module.exports = {
  findByUsername,
  findById,
  search,
  countActiveAdmins,
  findRoleId,
  insert,
  updateStatus,
  updatePassword,
  updateRole,
  findReaderByCode,
  linkReader,
};
