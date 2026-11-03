const { pool } = require('../../config/db');

// ---------------------------------------------------------------------
// Độc giả và điều kiện mượn (UC007 bước 3–6)
// ---------------------------------------------------------------------

// Hồ sơ độc giả kèm trạng thái thẻ thực tế và trạng thái tài khoản.
// forUpdate: khóa dòng độc giả đến hết transaction → hai thủ thư không thể cùng lập phiếu
// cho một độc giả và vượt giới hạn số sách.
async function findReaderByCode(readerCode, db = pool, { forUpdate = false } = {}) {
  const [rows] = await db.query(
    `SELECT r.reader_id, r.reader_code, r.full_name, r.reader_type, r.class_name, r.department,
            u.status AS account_status,
            c.expiry_date AS card_expiry_date,
            CASE WHEN c.card_id IS NULL        THEN NULL
                 WHEN c.status = 'LOCKED'      THEN 'LOCKED'
                 WHEN c.expiry_date < CURDATE() THEN 'EXPIRED'
                 ELSE 'ACTIVE' END AS card_status
     FROM readers r
     LEFT JOIN users u         ON u.user_id = r.user_id
     LEFT JOIN library_cards c ON c.reader_id = r.reader_id
     WHERE r.reader_code = ? ${forUpdate ? 'FOR UPDATE OF r' : ''}`,
    [readerCode],
  );
  return rows[0] ?? null;
}

// Các cuốn độc giả đang giữ (chưa trả), kể cả quá hạn
const ACTIVE_ITEM_COLUMNS = `
  d.borrow_detail_id, d.borrow_id, d.copy_id, d.due_date, d.renew_count,
  t.borrow_date, t.snap_renew_days, t.reader_id,
  c.copy_code, b.book_id, b.title,
  (d.due_date < CURDATE()) AS is_overdue`;

const ACTIVE_ITEM_FROM = `
  FROM borrow_details d
  JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
  JOIN book_copies c    ON c.copy_id = d.copy_id
  JOIN books b          ON b.book_id = c.book_id`;

async function listActiveItemsByReader(readerId, db = pool) {
  const [rows] = await db.query(
    `SELECT ${ACTIVE_ITEM_COLUMNS} ${ACTIVE_ITEM_FROM}
     WHERE t.reader_id = ? AND d.return_date IS NULL
     ORDER BY d.due_date, d.borrow_detail_id`,
    [readerId],
  );
  return rows;
}

async function findActiveItemByCopyCode(copyCode, db = pool) {
  const [rows] = await db.query(
    `SELECT ${ACTIVE_ITEM_COLUMNS}, r.reader_code ${ACTIVE_ITEM_FROM}
     JOIN readers r ON r.reader_id = t.reader_id
     WHERE c.copy_code = ? AND d.return_date IS NULL`,
    [copyCode],
  );
  return rows[0] ?? null;
}

async function listUnpaidFines(readerId, db = pool) {
  const [rows] = await db.query(
    `SELECT f.fine_id, f.amount, f.late_days, f.created_at, c.copy_code, b.title
     FROM fines f
     JOIN borrow_details d ON d.borrow_detail_id = f.borrow_detail_id
     JOIN book_copies c    ON c.copy_id = d.copy_id
     JOIN books b          ON b.book_id = c.book_id
     WHERE f.reader_id = ? AND f.status = 'UNPAID'
     ORDER BY f.created_at`,
    [readerId],
  );
  return rows;
}

// ---------------------------------------------------------------------
// Lập phiếu (UC007 bước 7–12)
// ---------------------------------------------------------------------

// Khóa các bản sách được chọn theo thứ tự copy_id (tránh deadlock khi hai phiếu chọn trùng sách)
async function lockCopiesByCodes(copyCodes, db = pool) {
  const [rows] = await db.query(
    `SELECT c.copy_id, c.copy_code, c.status, b.title
     FROM book_copies c JOIN books b ON b.book_id = c.book_id
     WHERE c.copy_code IN (?)
     ORDER BY c.copy_id
     FOR UPDATE OF c`,
    [copyCodes],
  );
  return rows;
}

async function insertTicket({ readerId, librarianId, regulation, borrowDate }, db = pool) {
  const [result] = await db.query(
    `INSERT INTO borrow_tickets
       (reader_id, librarian_id, regulation_id, borrow_date,
        snap_borrow_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [readerId, librarianId, regulation.regulationId, borrowDate,
      regulation.borrowDays, regulation.finePerDay, regulation.maxFinePerBook, regulation.renewDays],
  );
  return result.insertId;
}

async function insertDetails(borrowId, copyIds, dueDate, db = pool) {
  await db.query(
    'INSERT INTO borrow_details (borrow_id, copy_id, due_date) VALUES ?',
    [copyIds.map((copyId) => [borrowId, copyId, dueDate])],
  );
}

async function markCopiesBorrowed(copyIds, db = pool) {
  await db.query("UPDATE book_copies SET status = 'BORROWED' WHERE copy_id IN (?)", [copyIds]);
}

// ---------------------------------------------------------------------
// Xem phiếu
// ---------------------------------------------------------------------

async function findTicket(borrowId, db = pool) {
  const [rows] = await db.query(
    `SELECT t.*, r.reader_code, r.full_name AS reader_name, r.reader_type,
            u.username AS librarian_username, u.full_name AS librarian_name
     FROM borrow_tickets t
     JOIN readers r ON r.reader_id = t.reader_id
     JOIN users u   ON u.user_id = t.librarian_id
     WHERE t.borrow_id = ?`,
    [borrowId],
  );
  return rows[0] ?? null;
}

async function listTicketItems(borrowId, db = pool) {
  const [rows] = await db.query(
    `SELECT d.*, c.copy_code, b.book_id, b.title,
            (d.return_date IS NULL AND d.due_date < CURDATE()) AS is_overdue
     FROM borrow_details d
     JOIN book_copies c ON c.copy_id = d.copy_id
     JOIN books b       ON b.book_id = c.book_id
     WHERE d.borrow_id = ?
     ORDER BY d.borrow_detail_id`,
    [borrowId],
  );
  return rows;
}

// ---------------------------------------------------------------------
// Gia hạn (UC008)
// ---------------------------------------------------------------------

async function lockDetail(borrowDetailId, db = pool) {
  const [rows] = await db.query(
    `SELECT d.borrow_detail_id, d.borrow_id, d.due_date, d.renew_count, d.return_date, t.snap_renew_days
     FROM borrow_details d JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
     WHERE d.borrow_detail_id = ?
     FOR UPDATE OF d`,
    [borrowDetailId],
  );
  return rows[0] ?? null;
}

async function renew(borrowDetailId, newDueDate, db = pool) {
  await db.query(
    'UPDATE borrow_details SET due_date = ?, renew_count = renew_count + 1 WHERE borrow_detail_id = ?',
    [newDueDate, borrowDetailId],
  );
}

async function insertRenewalLog({ borrowDetailId, oldDueDate, newDueDate, renewedBy }, db = pool) {
  await db.query(
    `INSERT INTO renewal_logs (borrow_detail_id, old_due_date, new_due_date, renewed_by)
     VALUES (?, ?, ?, ?)`,
    [borrowDetailId, oldDueDate, newDueDate, renewedBy],
  );
}

// ---------------------------------------------------------------------
// Danh sách phiếu mượn (Admin – Quản lý mượn trả)
// ---------------------------------------------------------------------

// status: BORROWING | COMPLETED | OVERDUE (phiếu còn cuốn quá hạn chưa trả)
function ticketFilters({ keyword, borrowId, status, from, to }) {
  const where = [];
  const params = [];
  if (keyword) {
    where.push('(r.reader_code LIKE ? OR r.full_name LIKE ? OR t.borrow_id = ?)');
    params.push(`%${keyword}%`, `%${keyword}%`, borrowId ?? 0);
  }
  if (status === 'BORROWING' || status === 'COMPLETED') {
    where.push('t.status = ?');
    params.push(status);
  }
  if (status === 'OVERDUE') {
    where.push(`EXISTS (SELECT 1 FROM borrow_details od
                        WHERE od.borrow_id = t.borrow_id AND od.return_date IS NULL AND od.due_date < CURDATE())`);
  }
  if (from) {
    where.push('t.borrow_date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('t.borrow_date <= ?');
    params.push(to);
  }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

async function searchTickets(filters, { limit, offset }, db = pool) {
  const { sql, params } = ticketFilters(filters);
  const [rows] = await db.query(
    `SELECT t.borrow_id, t.borrow_date, t.status, t.completed_at, t.regulation_id,
            t.snap_borrow_days, t.snap_fine_per_day, t.snap_max_fine_per_book, t.snap_renew_days,
            r.reader_code, r.full_name AS reader_name, r.reader_type,
            u.username AS librarian_username, u.full_name AS librarian_name,
            COUNT(d.borrow_detail_id) AS total_books,
            SUM(d.return_date IS NOT NULL) AS returned_books,
            SUM(d.return_date IS NULL AND d.due_date < CURDATE()) AS overdue_books,
            MIN(CASE WHEN d.return_date IS NULL THEN d.due_date END) AS next_due_date
     FROM borrow_tickets t
     JOIN readers r        ON r.reader_id = t.reader_id
     JOIN users u          ON u.user_id = t.librarian_id
     JOIN borrow_details d ON d.borrow_id = t.borrow_id
     ${sql}
     GROUP BY t.borrow_id
     ORDER BY t.borrow_date DESC, t.borrow_id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM borrow_tickets t
     JOIN readers r ON r.reader_id = t.reader_id
     ${sql}`,
    params,
  );
  return { rows, total };
}

module.exports = {
  searchTickets,
  findReaderByCode,
  listActiveItemsByReader,
  findActiveItemByCopyCode,
  listUnpaidFines,
  lockCopiesByCodes,
  insertTicket,
  insertDetails,
  markCopiesBorrowed,
  findTicket,
  listTicketItems,
  lockDetail,
  renew,
  insertRenewalLog,
};
