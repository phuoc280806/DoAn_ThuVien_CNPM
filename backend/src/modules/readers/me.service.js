const AppError = require('../../utils/AppError');
const { writeAudit } = require('../../utils/audit');
const { ticketCode, receiptCode } = require('../../utils/format');
const repo = require('./me.repository');
const loansRepo = require('../loans/loans.repository');
const { toTicketDto } = require('../loans/loans.mapper');

// Mã độc giả luôn lấy từ phiên đăng nhập, không nhận từ người dùng (UC012 bước 2)
function readerIdOf(viewer) {
  if (!viewer.readerId) throw new AppError(403, 'Tài khoản này không gắn với hồ sơ độc giả');
  return viewer.readerId;
}

/**
 * UC012 bước 3–5 – Lịch sử mượn/trả và khoản phạt của chính độc giả,
 * kèm tổng tiền phạt chưa thu.
 */
async function history(viewer, { from, to, status }) {
  const readerId = readerIdOf(viewer);
  if (from && to && from > to) throw new AppError(400, 'Khoảng thời gian không hợp lệ');   // 5a

  const [rows, sum] = await Promise.all([repo.listItems(readerId, { from, to, status }), repo.summary(readerId)]);

  let message;
  if (sum.total_tickets === 0) message = 'Bạn chưa có giao dịch mượn nào';               // 3a
  else if (rows.length === 0) message = 'Không có giao dịch phù hợp';                     // 5b

  return {
    message,
    data: {
      unpaidTotal: sum.unpaid_total,
      items: rows.map((r) => ({
        borrowDetailId: r.borrow_detail_id,
        borrowId: r.borrow_id,
        ticketCode: ticketCode(r.borrow_id),
        title: r.title,
        copyCode: r.copy_code,
        borrowDate: r.borrow_date,
        dueDate: r.due_date,
        returnDate: r.return_date,
        status: r.item_status,           // BORROWING | OVERDUE | RETURNED
        renewCount: r.renew_count,
        lateDays: r.late_days,
        fineAmount: r.fine_amount,
        fineStatus: r.fine_status,       // UNPAID | PAID | null
        receiptCode: r.fine_status === 'PAID' ? receiptCode(r.fine_id) : null,
      })),
    },
  };
}

/**
 * UC012 bước 6–7 – Chi tiết một phiếu. Phiếu không phải của mình (ví dụ sửa đường dẫn)
 * thì từ chối và ghi nhật ký truy cập (7a).
 */
async function ticket(viewer, borrowId) {
  const readerId = readerIdOf(viewer);
  const row = await loansRepo.findTicket(borrowId);
  if (!row) throw new AppError(404, 'Không tìm thấy phiếu mượn');

  if (row.reader_id !== readerId) {
    await writeAudit({
      userId: viewer.userId,
      action: 'UNAUTHORIZED_ACCESS',
      targetType: 'BORROW_TICKET',
      targetId: borrowId,
      ip: viewer.ip,
    });
    throw new AppError(403, 'Bạn không có quyền xem dữ liệu này');
  }

  const dto = toTicketDto(row, await loansRepo.listTicketItems(borrowId));
  const fines = new Map((await repo.listFinesOfTicket(borrowId)).map((f) => [f.borrow_detail_id, f]));
  dto.items = dto.items.map((item) => {
    const fine = fines.get(item.borrowDetailId);
    return {
      ...item,
      fineStatus: fine?.status ?? null,
      receiptCode: fine?.status === 'PAID' ? receiptCode(fine.fine_id) : null,
    };
  });
  return dto;
}

module.exports = { history, ticket };
