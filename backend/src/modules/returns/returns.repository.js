const { pool } = require('../../config/db');

const ITEM_COLUMNS = `
  d.borrow_detail_id, d.borrow_id, d.copy_id, d.due_date, d.return_date,
  t.borrow_date, t.reader_id, t.snap_fine_per_day, t.snap_max_fine_per_book,
  c.copy_code, c.status AS copy_status, b.book_id, b.title,
  r.reader_code, r.full_name AS reader_name`;

const ITEM_FROM = `
  FROM borrow_details d
  JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
  JOIN readers r        ON r.reader_id = t.reader_id
  JOIN book_copies c    ON c.copy_id = d.copy_id
  JOIN books b          ON b.book_id = c.book_id`;

async function copyExists(copyCode, db = pool) {
  const [rows] = await db.query('SELECT 1 FROM book_copies WHERE copy_code = ?', [copyCode]);
  return rows.length > 0;
}

// Cuốn đang mượn (phiếu đang mở) chứa bản sách này — UC009 bước 4
async function findOpenItemByCopyCode(copyCode, db = pool, { forUpdate = false } = {}) {
  const [rows] = await db.query(
    `SELECT ${ITEM_COLUMNS} ${ITEM_FROM}
     WHERE c.copy_code = ? AND d.return_date IS NULL
     ${forUpdate ? 'FOR UPDATE OF d, c' : ''}`,
    [copyCode],
  );
  return rows[0] ?? null;
}

async function markReturned({ borrowDetailId, condition, note, lateDays, fineAmount, receivedBy }, db = pool) {
  await db.query(
    `UPDATE borrow_details
     SET return_date = NOW(), return_condition = ?, return_note = ?,
         late_days = ?, fine_amount = ?, received_by = ?
     WHERE borrow_detail_id = ?`,
    [condition, note, lateDays, fineAmount, receivedBy, borrowDetailId],
  );
}

async function updateCopyAfterReturn({ copyId, status, note }, db = pool) {
  await db.query('UPDATE book_copies SET status = ?, note = ? WHERE copy_id = ?', [status, note, copyId]);
}

async function insertCopyLog({ copyId, newStatus, reason, changedBy }, db = pool) {
  await db.query(
    `INSERT INTO copy_status_logs (copy_id, old_status, new_status, reason, changed_by)
     VALUES (?, 'BORROWED', ?, ?, ?)`,
    [copyId, newStatus, reason, changedBy],
  );
}

async function insertFine({ borrowDetailId, readerId, lateDays, amount }, db = pool) {
  const [result] = await db.query(
    `INSERT INTO fines (borrow_detail_id, reader_id, late_days, amount, reason)
     VALUES (?, ?, ?, ?, ?)`,
    [borrowDetailId, readerId, lateDays, amount, `Trả sách trễ ${lateDays} ngày`],
  );
  return result.insertId;
}

// Đóng phiếu nếu mọi cuốn đã trả; trả về true nếu phiếu vừa được đóng
async function completeTicketIfDone(borrowId, db = pool) {
  const [result] = await db.query(
    `UPDATE borrow_tickets
     SET status = 'COMPLETED', completed_at = NOW()
     WHERE borrow_id = ? AND status = 'BORROWING'
       AND NOT EXISTS (SELECT 1 FROM borrow_details WHERE borrow_id = ? AND return_date IS NULL)`,
    [borrowId, borrowId],
  );
  return result.affectedRows > 0;
}

async function findReturnedItem(borrowDetailId, db = pool) {
  const [rows] = await db.query(
    `SELECT ${ITEM_COLUMNS}, d.return_condition, d.return_note, d.late_days, d.fine_amount,
            t.status AS ticket_status
     ${ITEM_FROM} WHERE d.borrow_detail_id = ?`,
    [borrowDetailId],
  );
  return rows[0] ?? null;
}

module.exports = {
  copyExists,
  findOpenItemByCopyCode,
  markReturned,
  updateCopyAfterReturn,
  insertCopyLog,
  insertFine,
  completeTicketIfDone,
  findReturnedItem,
};
