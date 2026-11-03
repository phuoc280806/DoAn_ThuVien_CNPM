const { pool } = require('../../config/db');

const BASE_SELECT = `
  SELECT d.borrow_detail_id, d.borrow_id, d.copy_id, d.due_date, d.return_date,
         d.renew_count,
         t.reader_id, t.borrow_date,
         r.reader_code, r.full_name AS reader_name, r.reader_type,
         r.class_name, r.department, r.email,
         c.copy_code,
         b.book_id, b.isbn, b.title,
         (
           SELECT COUNT(*)
           FROM reminder_logs rl
           WHERE rl.borrow_detail_id = d.borrow_detail_id AND rl.success = TRUE
         ) AS sent_count,
         (
           SELECT MAX(rl.sent_at)
           FROM reminder_logs rl
           WHERE rl.borrow_detail_id = d.borrow_detail_id
         ) AS last_attempt_at
  FROM borrow_details d
  JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
  JOIN readers r ON r.reader_id = t.reader_id
  JOIN book_copies c ON c.copy_id = d.copy_id
  JOIN books b ON b.book_id = c.book_id
`;

async function listCandidates(maxDueDate) {
  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE d.return_date IS NULL
       AND d.due_date <= ?
     ORDER BY d.due_date ASC, d.borrow_detail_id ASC`,
    [maxDueDate]
  );
  return rows;
}

async function findOpenItemsByIds({ borrowDetailIds = [], borrowIds = [] }) {
  const conditions = [];
  const params = [];

  if (borrowDetailIds.length > 0) {
    conditions.push(`d.borrow_detail_id IN (${borrowDetailIds.map(() => '?').join(', ')})`);
    params.push(...borrowDetailIds);
  }
  if (borrowIds.length > 0) {
    conditions.push(`d.borrow_id IN (${borrowIds.map(() => '?').join(', ')})`);
    params.push(...borrowIds);
  }

  if (conditions.length === 0) return [];

  const [rows] = await pool.query(
    `${BASE_SELECT}
     WHERE d.return_date IS NULL
       AND (${conditions.join(' OR ')})
     ORDER BY d.due_date ASC, d.borrow_detail_id ASC`,
    params
  );
  return rows;
}

async function insertLog({ borrowDetailId, email, sentBy, success, errorMessage = null }) {
  const [res] = await pool.query(
    `INSERT INTO reminder_logs (borrow_detail_id, email, sent_by, success, error_message)
     VALUES (?, ?, ?, ?, ?)`,
    [borrowDetailId, email, sentBy, Boolean(success), errorMessage]
  );
  return res.insertId;
}

async function listLogs({ borrowDetailId } = {}) {
  const where = borrowDetailId ? 'WHERE rl.borrow_detail_id = ?' : '';
  const params = borrowDetailId ? [borrowDetailId] : [];
  const [rows] = await pool.query(
    `SELECT rl.reminder_id, rl.borrow_detail_id, rl.email, rl.sent_by,
            rl.sent_at, rl.success, rl.error_message,
            u.username AS sent_by_username, u.full_name AS sent_by_name
     FROM reminder_logs rl
     JOIN users u ON u.user_id = rl.sent_by
     ${where}
     ORDER BY rl.reminder_id DESC`,
    params
  );
  return rows;
}

module.exports = {
  listCandidates,
  findOpenItemsByIds,
  insertLog,
  listLogs,
};
