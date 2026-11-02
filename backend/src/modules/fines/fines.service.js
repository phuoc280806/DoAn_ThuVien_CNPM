const { withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const { writeAudit } = require('../../utils/audit');
const { formatVND } = require('../../utils/format');
const ROLES = require('../../constants/roles');
const repo = require('./fines.repository');
const { toFineDto, toReceiptDto } = require('./fines.mapper');

/**
 * Danh sách khoản phạt. UC011 1a: thủ thư tìm độc giả theo mã để thu khoản nợ cũ.
 * Có readerCode thì kèm tổng tiền còn nợ của độc giả đó.
 */
async function list({ readerCode, status, page = 1, pageSize = 20 }) {
  const debt = readerCode ? await repo.findReaderDebt(readerCode) : null;
  if (readerCode && !debt) throw new AppError(404, 'Không tìm thấy độc giả');

  const { rows, total } = await repo.search({ readerCode, status, limit: pageSize, offset: (page - 1) * pageSize });
  return { items: rows.map(toFineDto), page, pageSize, total, unpaidTotal: debt?.unpaid_total };
}

/**
 * UC011 bước 2–7 – Thu tiền phạt: chuyển khoản phạt sang "Đã thu", ghi người thu và thời điểm,
 * tạo biên lai. Độc giả hết nợ thì được mượn lại (nếu không còn sách quá hạn).
 */
async function pay(fineId, actor) {
  return withTransaction(async (conn) => {
    const fine = await repo.lockById(fineId, conn);
    if (!fine) throw new AppError(404, 'Không tìm thấy khoản phạt');
    if (fine.status === 'PAID') throw new AppError(409, 'Khoản phạt này đã được thu');

    await repo.markPaid(fineId, actor.userId, conn);
    const remainingUnpaid = await repo.unpaidTotal(fine.reader_id, conn);

    return {
      receipt: toReceiptDto(await repo.findById(fineId, conn)),
      remainingUnpaid,                              // 7a: còn nợ thì vẫn bị chặn mượn
    };
  });
}

function payMessage(result) {
  return result.remainingUnpaid > 0
    ? `Đã thu tiền phạt. Độc giả còn nợ ${formatVND(result.remainingUnpaid)}, vẫn bị chặn mượn mới`
    : 'Đã thu tiền phạt. Độc giả không còn khoản phạt chưa thu';
}

/**
 * Xem / in lại biên lai. Thủ thư xem mọi biên lai; độc giả chỉ xem biên lai của chính mình,
 * xem của người khác thì bị từ chối và ghi nhật ký (giống UC012 7a).
 */
async function receipt(fineId, viewer) {
  const fine = await repo.findById(fineId);
  if (!fine) throw new AppError(404, 'Không tìm thấy khoản phạt');

  if (viewer.role === ROLES.READER && fine.reader_id !== viewer.readerId) {
    await writeAudit({
      userId: viewer.userId,
      action: 'UNAUTHORIZED_ACCESS',
      targetType: 'FINE',
      targetId: fineId,
      ip: viewer.ip,
    });
    throw new AppError(403, 'Bạn không có quyền xem dữ liệu này');
  }
  if (fine.status !== 'PAID') throw new AppError(409, 'Khoản phạt chưa được thu nên chưa có biên lai');
  return toReceiptDto(fine);
}

module.exports = { list, pay, payMessage, receipt };
