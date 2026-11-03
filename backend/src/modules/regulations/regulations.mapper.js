const { ticketCode } = require('../../utils/format');

// Tham số quy định: tên trong API (camelCase) ↔ tên cột / khóa JSON trong database (snake_case)
const PARAMS = {
  maxBooks: 'max_books',               // QĐ01
  borrowDays: 'borrow_days',           // QĐ02
  finePerDay: 'fine_per_day',          // QĐ03
  maxFinePerBook: 'max_fine_per_book', // QĐ06
  renewDays: 'renew_days',             // QĐ04
};

// Tham số lưu trong snapshot của phiếu mượn (UC007, UC015)
const SNAPSHOT_PARAMS = {
  borrowDays: { regColumn: 'borrow_days', snapColumn: 'snap_borrow_days' },
  finePerDay: { regColumn: 'fine_per_day', snapColumn: 'snap_fine_per_day' },
  maxFinePerBook: { regColumn: 'max_fine_per_book', snapColumn: 'snap_max_fine_per_book' },
  renewDays: { regColumn: 'renew_days', snapColumn: 'snap_renew_days' },
};

const toCamel = (key) => key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

function camelKeys(obj) {
  return obj ? Object.fromEntries(Object.entries(obj).map(([k, v]) => [toCamel(k), v])) : null;
}

// status: PAST (đã hết hiệu lực), CURRENT (đang hiệu lực), UPCOMING (chưa đến ngày hiệu lực)
function toRegulationDto(row, status) {
  return {
    regulationId: row.regulation_id,
    readerType: row.reader_type,
    maxBooks: row.max_books,
    borrowDays: row.borrow_days,
    finePerDay: row.fine_per_day,
    maxFinePerBook: row.max_fine_per_book,
    renewDays: row.renew_days,
    effectiveFrom: row.effective_from,
    createdAt: row.created_at,
    createdBy: { userId: row.created_by_id, username: row.created_by_username, fullName: row.created_by_name },
    ...(status ? { status } : {}),
  };
}

function toLogDto(row) {
  return {
    logId: row.log_id,
    changeType: row.change_type,           // CONFIG | APPLY_ACTIVE_LOANS
    readerType: row.reader_type,           // null = mọi loại độc giả
    regulationId: row.regulation_id,
    oldValues: camelKeys(row.old_values),
    newValues: camelKeys(row.new_values),
    effectiveFrom: row.effective_from,
    reason: row.reason,
    affectedTickets: row.affected_tickets,
    changedAt: row.changed_at,
    changedBy: { username: row.changed_by_username, fullName: row.changed_by_name },
  };
}

// UC015 bước 6 – Phiếu đang mượn bị ảnh hưởng: giá trị cũ → mới và cảnh báo chuyển sang quá hạn
function toAffectedTicketDto(ticket, { oldValues, newValues, wasOverdue, isOverdue, willBecomeOverdue }) {
  return {
    borrowId: ticket.borrow_id,
    ticketCode: ticketCode(ticket.borrow_id),
    borrowDate: ticket.borrow_date,
    reader: {
      readerId: ticket.reader_id,
      readerCode: ticket.reader_code,
      fullName: ticket.reader_name,
      readerType: ticket.reader_type,
    },
    oldValues: camelKeys(oldValues),
    newValues: camelKeys(newValues),
    wasOverdue,
    isOverdue,
    willBecomeOverdue,
    warning: willBecomeOverdue ? 'Phiếu sẽ chuyển sang quá hạn' : null,
  };
}

module.exports = { PARAMS, SNAPSHOT_PARAMS, camelKeys, toRegulationDto, toLogDto, toAffectedTicketDto };
