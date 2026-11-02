const { ticketCode, receiptCode } = require('../../utils/format');

function toFineDto(row) {
  return {
    fineId: row.fine_id,
    status: row.status,                 // UNPAID | PAID
    amount: row.amount,
    lateDays: row.late_days,
    reason: row.reason,
    createdAt: row.created_at,
    reader: { readerId: row.reader_id, readerCode: row.reader_code, fullName: row.reader_name },
    ticketCode: ticketCode(row.borrow_id),
    copyCode: row.copy_code,
    title: row.title,
    dueDate: row.due_date,
    returnDate: row.return_date,
    paidAt: row.paid_at,
    receiptCode: row.status === 'PAID' ? receiptCode(row.fine_id) : null,
  };
}

// Biên lai điện tử (UC011 bước 6): mã biên lai, độc giả, số tiền, ngày thu, người thu
function toReceiptDto(row) {
  return {
    receiptCode: receiptCode(row.fine_id),
    fineId: row.fine_id,
    reader: { readerCode: row.reader_code, fullName: row.reader_name },
    ticketCode: ticketCode(row.borrow_id),
    copyCode: row.copy_code,
    title: row.title,
    lateDays: row.late_days,
    amount: row.amount,
    paidAt: row.paid_at,
    collectedBy: { username: row.collector_username, fullName: row.collector_name },
  };
}

module.exports = { toFineDto, toReceiptDto };
