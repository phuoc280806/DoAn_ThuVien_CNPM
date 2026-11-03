const { pool } = require('../../config/db');

// ---------------------------------------------------------------------
// 1. Thống kê mượn / trả (UC016 - loans)
// ---------------------------------------------------------------------

async function listLoanTickets({ from, to }, db = pool) {
  const [rows] = await db.query(
    `SELECT t.borrow_id, t.borrow_date, t.status, t.completed_at,
            r.reader_id, r.reader_code, r.full_name AS reader_name, r.reader_type,
            u.username AS librarian_username, u.full_name AS librarian_name,
            COUNT(d.borrow_detail_id) AS total_books,
            SUM(d.return_date IS NOT NULL) AS returned_books,
            SUM(d.return_date IS NULL) AS borrowing_books,
            SUM(d.return_date IS NULL AND d.due_date < CURDATE()) AS overdue_books
     FROM borrow_tickets t
     JOIN readers r        ON r.reader_id = t.reader_id
     JOIN users u          ON u.user_id = t.librarian_id
     JOIN borrow_details d ON d.borrow_id = t.borrow_id
     WHERE t.borrow_date BETWEEN ? AND ?
     GROUP BY t.borrow_id
     ORDER BY t.borrow_date DESC, t.borrow_id DESC`,
    [from, to],
  );
  return rows;
}

async function countReturnedInPeriod({ from, to }, db = pool) {
  const [[{ returned_in_period }]] = await db.query(
    `SELECT COUNT(*) AS returned_in_period
     FROM borrow_details
     WHERE return_date IS NOT NULL AND DATE(return_date) BETWEEN ? AND ?`,
    [from, to],
  );
  return returned_in_period;
}

// ---------------------------------------------------------------------
// 2. Sách trả trễ và đang quá hạn (UC016 - overdue)
// ---------------------------------------------------------------------

async function listOverdueAndLateItems({ from, to }, db = pool) {
  const [rows] = await db.query(
    `SELECT d.borrow_detail_id, d.borrow_id, d.due_date, d.return_date,
            d.late_days, d.fine_amount,
            t.borrow_date, t.snap_fine_per_day, t.snap_max_fine_per_book,
            r.reader_id, r.reader_code, r.full_name AS reader_name, r.reader_type,
            c.copy_code, b.book_id, b.title,
            CASE WHEN d.return_date IS NULL THEN 'OVERDUE' ELSE 'LATE_RETURNED' END AS item_status
     FROM borrow_details d
     JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
     JOIN readers r        ON r.reader_id = t.reader_id
     JOIN book_copies c    ON c.copy_id = d.copy_id
     JOIN books b          ON b.book_id = c.book_id
     WHERE (
       (d.return_date IS NULL AND d.due_date < CURDATE()
          AND (t.borrow_date BETWEEN ? AND ? OR d.due_date BETWEEN ? AND ?))
       OR
       (d.return_date IS NOT NULL AND d.late_days > 0
          AND (DATE(d.return_date) BETWEEN ? AND ? OR t.borrow_date BETWEEN ? AND ?))
     )
     ORDER BY item_status ASC, d.due_date ASC, d.borrow_detail_id ASC`,
    [from, to, from, to, from, to, from, to],
  );
  return rows;
}

// ---------------------------------------------------------------------
// 3. Tiền phạt đã thu / chưa thu và độc giả còn nợ (UC016 - fines)
// ---------------------------------------------------------------------

async function listFinesInPeriod({ from, to }, db = pool) {
  const [rows] = await db.query(
    `SELECT f.fine_id, f.borrow_detail_id, f.reader_id, f.late_days, f.amount, f.reason, f.status,
            f.created_at, f.paid_at,
            r.reader_code, r.full_name AS reader_name, r.reader_type,
            d.borrow_id, d.due_date, d.return_date,
            c.copy_code, b.title,
            u.username AS collector_username, u.full_name AS collector_name
     FROM fines f
     JOIN readers r        ON r.reader_id = f.reader_id
     JOIN borrow_details d ON d.borrow_detail_id = f.borrow_detail_id
     JOIN book_copies c    ON c.copy_id = d.copy_id
     JOIN books b          ON b.book_id = c.book_id
     LEFT JOIN users u     ON u.user_id = f.collected_by
     WHERE DATE(f.created_at) BETWEEN ? AND ?
        OR (f.paid_at IS NOT NULL AND DATE(f.paid_at) BETWEEN ? AND ?)
     ORDER BY f.status ASC, f.created_at DESC, f.fine_id DESC`,
    [from, to, from, to],
  );
  return rows;
}

module.exports = {
  listLoanTickets,
  countReturnedInPeriod,
  listOverdueAndLateItems,
  listFinesInPeriod,
};

