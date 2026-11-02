const { pool } = require('../../config/db');

const VERSION_COLUMNS = `
  g.regulation_id, g.reader_type, g.max_books, g.borrow_days, g.fine_per_day,
  g.max_fine_per_book, g.renew_days, g.effective_from, g.created_at,
  u.user_id AS created_by_id, u.username AS created_by_username, u.full_name AS created_by_name`;

const VERSION_FROM = 'FROM regulations g JOIN users u ON u.user_id = g.created_by';

/**
 * Quy định hiệu lực của một loại độc giả tại một ngày:
 * dòng có effective_from <= ngày đó, mới nhất.
 */
async function findEffective(readerType, date, db = pool) {
  const [rows] = await db.query(
    `SELECT ${VERSION_COLUMNS} ${VERSION_FROM}
     WHERE g.reader_type = ? AND g.effective_from <= ?
     ORDER BY g.effective_from DESC LIMIT 1`,
    [readerType, date],
  );
  return rows[0] ?? null;
}

async function listVersions(db = pool) {
  const [rows] = await db.query(
    `SELECT ${VERSION_COLUMNS} ${VERSION_FROM} ORDER BY g.reader_type, g.effective_from DESC`,
  );
  return rows;
}

async function findById(regulationId, db = pool) {
  const [rows] = await db.query(`SELECT ${VERSION_COLUMNS} ${VERSION_FROM} WHERE g.regulation_id = ?`, [regulationId]);
  return rows[0] ?? null;
}

async function existsOnDate(readerType, effectiveFrom, db = pool) {
  const [rows] = await db.query(
    'SELECT 1 FROM regulations WHERE reader_type = ? AND effective_from = ?',
    [readerType, effectiveFrom],
  );
  return rows.length > 0;
}

async function insert(data, db = pool) {
  const [result] = await db.query(
    `INSERT INTO regulations
       (reader_type, max_books, borrow_days, fine_per_day, max_fine_per_book, renew_days, effective_from, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.readerType, data.maxBooks, data.borrowDays, data.finePerDay, data.maxFinePerBook,
      data.renewDays, data.effectiveFrom, data.createdBy],
  );
  return result.insertId;
}

async function insertLog(data, db = pool) {
  await db.query(
    `INSERT INTO regulation_logs
       (change_type, reader_type, regulation_id, old_values, new_values, effective_from,
        reason, affected_tickets, changed_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.changeType, data.readerType, data.regulationId,
      data.oldValues ? JSON.stringify(data.oldValues) : null, JSON.stringify(data.newValues),
      data.effectiveFrom, data.reason ?? null, data.affectedTickets ?? null, data.changedBy],
  );
}

// UC014 – Nhật ký thay đổi quy định, mới nhất trước
async function searchLogs({ from, to, readerType, changedBy, limit, offset }, db = pool) {
  const where = [];
  const params = [];
  if (from) {
    where.push('l.changed_at >= ?');
    params.push(from);
  }
  if (to) {
    where.push('l.changed_at < ? + INTERVAL 1 DAY');
    params.push(to);
  }
  if (readerType) {
    where.push('(l.reader_type = ? OR l.reader_type IS NULL)');   // NULL = áp dụng cho mọi loại
    params.push(readerType);
  }
  if (changedBy) {
    where.push('u.username = ?');
    params.push(changedBy);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const from_ = 'FROM regulation_logs l JOIN users u ON u.user_id = l.changed_by';

  const [rows] = await db.query(
    `SELECT l.*, u.username AS changed_by_username, u.full_name AS changed_by_name
     ${from_} ${whereSql} ORDER BY l.changed_at DESC, l.log_id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total ${from_} ${whereSql}`, params);
  return { rows, total };
}

module.exports = { findEffective, listVersions, findById, existsOnDate, insert, insertLog, searchLogs };
