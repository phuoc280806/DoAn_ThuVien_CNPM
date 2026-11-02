const { withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const repo = require('./copies.repository');
const { toCopyDto } = require('../books/books.mapper');

const STATUS_LABEL = { AVAILABLE: 'Khả dụng', BORROWED: 'Đang mượn', DAMAGED: 'Hư hỏng', LOST: 'Mất' };

// Các lần đổi trạng thái bằng tay được phép (quyết định 6).
// Đang mượn chỉ đổi qua lập phiếu (UC007) và trả sách (UC009).
const ALLOWED = {
  AVAILABLE: ['DAMAGED', 'LOST'],
  DAMAGED: ['AVAILABLE', 'LOST'],
  LOST: ['AVAILABLE'],
  BORROWED: [],
};

// Tra bản sách theo mã quét được (dùng ở UC005, sau này ở UC007, UC009)
async function getByCode(copyCode) {
  const copy = await repo.findByCode(copyCode);
  if (!copy) throw new AppError(404, 'Không tìm thấy bản sách');
  return toCopyDto(copy);
}

// UC005 bước 9–14 – Cập nhật trạng thái một bản sách
async function changeStatus(copyId, { status, reason }, actor) {
  return withTransaction(async (conn) => {
    const copy = await repo.lockById(copyId, conn);
    if (!copy) throw new AppError(404, 'Không tìm thấy bản sách');

    if (copy.status === status) {
      throw new AppError(409, `Bản sách đang ở trạng thái ${STATUS_LABEL[status]}`);
    }
    if (copy.status === 'BORROWED') {
      throw new AppError(409, 'Bản sách đang được mượn, trạng thái chỉ thay đổi khi trả sách');
    }
    if (status === 'BORROWED') {
      throw new AppError(409, 'Không thể chuyển sang Đang mượn bằng tay, hãy lập phiếu mượn');
    }
    if (!ALLOWED[copy.status].includes(status)) {
      throw new AppError(409, `Không thể chuyển từ ${STATUS_LABEL[copy.status]} sang ${STATUS_LABEL[status]}`);
    }
    if (status !== 'AVAILABLE' && !reason) {
      throw new AppError(400, 'Cần nhập lý do khi bản sách bị hư hỏng hoặc mất', [
        { field: 'reason', message: 'Cần nhập lý do khi bản sách bị hư hỏng hoặc mất' },
      ]);
    }

    // Ghi chú trên bản sách mô tả tình trạng hiện tại; về Khả dụng thì xóa ghi chú
    await repo.updateStatus(copyId, status, status === 'AVAILABLE' ? null : reason, conn);
    await repo.insertStatusLog(
      { copyId, oldStatus: copy.status, newStatus: status, reason: reason || null, changedBy: actor.userId },
      conn,
    );
    return toCopyDto(await repo.findById(copyId, conn));
  });
}

module.exports = { getByCode, changeStatus };
