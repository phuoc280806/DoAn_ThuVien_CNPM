const { pool } = require('../../config/db');

const FINE_COLUMNS = `
  f.fine_id, f.borrow_detail_id, f.reader_id, f.late_days, f.amount, f.reason, f.status,
  f.created_at, f.paid_at, f.collected_by,
  r.reader_code, r.full_name AS reader_name,
  d.borrow_id, d.due_date, d.return_date,
  c.copy_code, b.title,
  u.username AS collector_username, u.full_name AS collector_name`;

const FINE_FROM = `
  FROM fines f
  JOIN readers r        ON r.reader_id = f.reader_id
  JOIN borrow_details d ON d.borrow_detail_id = f.borrow_detail_id
  JOIN book_copies c    ON c.copy_id = d.copy_id
  JOIN books b          ON b.book_id = c.book_id
  LEFT JOIN users u     ON u.user_id = f.collected_by`;

async function search({ readerCode, status, limit, offset }, db = pool) {
  const where = [];
  const params = [];
  if (readerCode) {
    where.push('r.reader_code = ?');
    params.push(readerCode);
  }
  if (status) {
    where.push('f.status = ?');
    params.push(status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [rows] = await db.query(
    `SELECT ${FINE_COLUMNS} ${FINE_FROM} ${whereSql} ORDER BY f.status DESC, f.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${FINE_FROM} ${whereSql}`, params);
  return { rows, total };
}

async function findById(fineId, db = pool) {
  const [rows] = await db.query(`SELECT ${FINE_COLUMNS} ${FINE_FROM} WHERE f.fine_id = ?`, [fineId]);
  return rows[0] ?? null;
}

async function lockById(fineId, db = pool) {
  const [rows] = await db.query('SELECT fine_id, reader_id, status FROM fines WHERE fine_id = ? FOR UPDATE', [fineId]);
  return rows[0] ?? null;
}

async function markPaid(fineId, collectedBy, db = pool) {
  await db.query(
    "UPDATE fines SET status = 'PAID', paid_at = NOW(), collected_by = ? WHERE fine_id = ?",
    [collectedBy, fineId],
  );
}

async function unpaidTotal(readerId, db = pool) {
  const [[{ total }]] = await db.query(
    "SELECT COALESCE(SUM(amount), 0) AS total FROM fines WHERE reader_id = ? AND status = 'UNPAID'",
    [readerId],
  );
  return total;
}

// reader_id và tổng nợ chưa thu theo mã độc giả; null nếu không có độc giả
async function findReaderDebt(readerCode, db = pool) {
  const [rows] = await db.query(
    `SELECT r.reader_id,
            (SELECT COALESCE(SUM(amount), 0) FROM fines f WHERE f.reader_id = r.reader_id AND f.status = 'UNPAID') AS unpaid_total
     FROM readers r WHERE r.reader_code = ?`,
    [readerCode],
  );
  return rows[0] ?? null;
}

module.exports = { search, findById, lockById, markPaid, unpaidTotal, findReaderDebt };
