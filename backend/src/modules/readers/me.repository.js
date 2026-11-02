const { pool } = require('../../config/db');

// Trạng thái từng cuốn: Đã trả / Quá hạn / Đang mượn (UC012 bước 3)
const ITEM_STATUS = `
  CASE WHEN d.return_date IS NOT NULL THEN 'RETURNED'
       WHEN d.due_date < CURDATE()    THEN 'OVERDUE'
       ELSE 'BORROWING' END`;

/**
 * Lịch sử mượn – trả của MỘT độc giả, mỗi dòng là một cuốn.
 * Lọc theo ngày mượn (from, to) và trạng thái.
 */
async function listItems(readerId, { from, to, status }, db = pool) {
  const where = ['t.reader_id = ?'];
  const params = [readerId];
  if (from) {
    where.push('t.borrow_date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('t.borrow_date <= ?');
    params.push(to);
  }
  if (status) {
    where.push(`${ITEM_STATUS} = ?`);
    params.push(status);
  }

  const [rows] = await db.query(
    `SELECT d.borrow_detail_id, t.borrow_id, t.borrow_date, d.due_date, d.return_date,
            d.return_condition, d.late_days, d.fine_amount, d.renew_count,
            c.copy_code, b.title, f.fine_id, f.status AS fine_status,
            ${ITEM_STATUS} AS item_status
     FROM borrow_details d
     JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
     JOIN book_copies c    ON c.copy_id = d.copy_id
     JOIN books b          ON b.book_id = c.book_id
     LEFT JOIN fines f     ON f.borrow_detail_id = d.borrow_detail_id
     WHERE ${where.join(' AND ')}
     ORDER BY t.borrow_date DESC, d.borrow_detail_id`,
    params,
  );
  return rows;
}

async function summary(readerId, db = pool) {
  const [[row]] = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM borrow_tickets WHERE reader_id = ?) AS total_tickets,
       (SELECT COALESCE(SUM(amount), 0) FROM fines WHERE reader_id = ? AND status = 'UNPAID') AS unpaid_total`,
    [readerId, readerId],
  );
  return row;
}

async function listFinesOfTicket(borrowId, db = pool) {
  const [rows] = await db.query(
    `SELECT f.borrow_detail_id, f.fine_id, f.status
     FROM fines f JOIN borrow_details d ON d.borrow_detail_id = f.borrow_detail_id
     WHERE d.borrow_id = ?`,
    [borrowId],
  );
  return rows;
}

module.exports = { listItems, summary, listFinesOfTicket };
