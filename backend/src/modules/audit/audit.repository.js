const { pool } = require('../../config/db');

async function search({ action, keyword, from, to, limit, offset }, db = pool) {
  const where = [];
  const params = [];
  if (action) {
    where.push('a.action = ?');
    params.push(action);
  }
  if (keyword) {
    where.push('(u.username LIKE ? OR u.full_name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (from) {
    where.push('a.created_at >= ?');
    params.push(from);
  }
  if (to) {
    where.push('a.created_at < ? + INTERVAL 1 DAY');
    params.push(to);
  }
  const sql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT a.log_id, a.action, a.target_type, a.target_id, a.detail, a.ip_address, a.created_at,
            u.username, u.full_name
     FROM audit_logs a
     LEFT JOIN users u ON u.user_id = a.user_id
     ${sql}
     ORDER BY a.created_at DESC, a.log_id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON u.user_id = a.user_id ${sql}`,
    params,
  );
  return { rows, total };
}

module.exports = { search };
