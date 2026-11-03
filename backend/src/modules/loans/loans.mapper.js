const { ticketCode } = require('../../utils/format');

function toReaderSummary(row) {
  return {
    readerId: row.reader_id,
    readerCode: row.reader_code,
    fullName: row.full_name,
    readerType: row.reader_type,
    className: row.class_name,
    department: row.department,
    cardStatus: row.card_status,          // ACTIVE | EXPIRED | LOCKED | null (chưa có thẻ)
    cardExpiryDate: row.card_expiry_date,
    accountStatus: row.account_status,    // ACTIVE | LOCKED | null (chưa có tài khoản)
  };
}

// Một cuốn đang mượn. renewal: kết quả kiểm tra gia hạn (UC008 bước 6–7)
function toActiveItemDto(row, renewal) {
  return {
    borrowDetailId: row.borrow_detail_id,
    borrowId: row.borrow_id,
    ticketCode: ticketCode(row.borrow_id),
    copyCode: row.copy_code,
    book: { bookId: row.book_id, title: row.title },
    borrowDate: row.borrow_date,
    dueDate: row.due_date,
    renewCount: row.renew_count,
    isOverdue: Boolean(row.is_overdue),
    ...(row.reader_code ? { readerCode: row.reader_code } : {}),
    ...(renewal ? { canRenew: renewal.canRenew, renewBlockedReason: renewal.reason, newDueDate: renewal.newDueDate } : {}),
  };
}

function toUnpaidFineDto(row) {
  return {
    fineId: row.fine_id,
    amount: row.amount,
    lateDays: row.late_days,
    copyCode: row.copy_code,
    title: row.title,
    createdAt: row.created_at,
  };
}

function toTicketDto(ticket, items) {
  return {
    borrowId: ticket.borrow_id,
    ticketCode: ticketCode(ticket.borrow_id),
    status: ticket.status,                // BORROWING | COMPLETED
    borrowDate: ticket.borrow_date,
    completedAt: ticket.completed_at,
    reader: {
      readerId: ticket.reader_id,
      readerCode: ticket.reader_code,
      fullName: ticket.reader_name,
      readerType: ticket.reader_type,
    },
    librarian: { userId: ticket.librarian_id, username: ticket.librarian_username, fullName: ticket.librarian_name },
    // Snapshot quy định lưu lúc lập phiếu (phương án B)
    snapshot: {
      regulationId: ticket.regulation_id,
      borrowDays: ticket.snap_borrow_days,
      finePerDay: ticket.snap_fine_per_day,
      maxFinePerBook: ticket.snap_max_fine_per_book,
      renewDays: ticket.snap_renew_days,
    },
    items: items.map((d) => ({
      borrowDetailId: d.borrow_detail_id,
      copyId: d.copy_id,
      copyCode: d.copy_code,
      book: { bookId: d.book_id, title: d.title },
      dueDate: d.due_date,
      renewCount: d.renew_count,
      isOverdue: Boolean(d.is_overdue),
      returnDate: d.return_date,
      returnCondition: d.return_condition,
      returnNote: d.return_note,
      lateDays: d.late_days,
      fineAmount: d.fine_amount,
    })),
  };
}

// Một dòng trong danh sách phiếu mượn (Admin – Quản lý mượn trả)
function toTicketSummaryDto(row) {
  return {
    borrowId: row.borrow_id,
    ticketCode: ticketCode(row.borrow_id),
    status: row.status,                   // BORROWING | COMPLETED
    borrowDate: row.borrow_date,
    completedAt: row.completed_at,
    reader: { readerCode: row.reader_code, fullName: row.reader_name, readerType: row.reader_type },
    librarian: { username: row.librarian_username, fullName: row.librarian_name },
    totalBooks: row.total_books,
    returnedBooks: Number(row.returned_books),
    overdueBooks: Number(row.overdue_books),
    nextDueDate: row.next_due_date,       // hạn trả gần nhất của các cuốn chưa trả
    snapshot: {
      regulationId: row.regulation_id,
      borrowDays: row.snap_borrow_days,
      finePerDay: row.snap_fine_per_day,
      maxFinePerBook: row.snap_max_fine_per_book,
      renewDays: row.snap_renew_days,
    },
  };
}

module.exports = { toReaderSummary, toActiveItemDto, toUnpaidFineDto, toTicketDto, toTicketSummaryDto };
