const { withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const { todayVN } = require('../../utils/date');
const { calculateFine } = require('../../utils/fine');
const { formatVND, ticketCode } = require('../../utils/format');
const repo = require('./returns.repository');

// Tình trạng khi trả → trạng thái mới của bản sách (UC009 bước 9)
const COPY_STATUS_AFTER = { GOOD: 'AVAILABLE', DAMAGED: 'DAMAGED', LOST: 'LOST' };

// UC009 bước 3–4: tìm cuốn đang mượn theo mã bản sách. 4a: không có bản sách; 4b: bản sách không đang mượn.
async function findOpenItem(copyCode, conn, options) {
  const item = await repo.findOpenItemByCopyCode(copyCode, conn, options);
  if (item) return item;
  if (!(await repo.copyExists(copyCode, conn))) throw new AppError(404, 'Không tìm thấy bản sách');
  throw new AppError(409, 'Bản sách không ở trạng thái Đang mượn');
}

function fineFor(item, returnDate) {
  return calculateFine({
    dueDate: item.due_date,
    returnDate,
    finePerDay: item.snap_fine_per_day,
    maxFinePerBook: item.snap_max_fine_per_book,
  });
}

function itemSummary(item) {
  return {
    borrowDetailId: item.borrow_detail_id,
    ticketCode: ticketCode(item.borrow_id),
    copyCode: item.copy_code,
    book: { bookId: item.book_id, title: item.title },
    reader: { readerId: item.reader_id, readerCode: item.reader_code, fullName: item.reader_name },
    borrowDate: item.borrow_date,
    dueDate: item.due_date,
  };
}

/**
 * UC009 bước 3–6 – Quét mã bản sách: hiển thị độc giả, sách, hạn trả (theo snapshot)
 * và tính trước số ngày trễ, tiền phạt nếu trả hôm nay (UC010).
 */
async function lookup(copyCode) {
  const item = await findOpenItem(copyCode);
  const { lateDays, amount } = fineFor(item, todayVN());
  return {
    ...itemSummary(item),
    snapshot: { finePerDay: item.snap_fine_per_day, maxFinePerBook: item.snap_max_fine_per_book },
    lateDays,
    fineAmount: amount,
    onTime: lateDays === 0,
  };
}

/**
 * UC009 bước 7–11 – Xác nhận trả một cuốn, trong một transaction:
 * lưu ngày trả, tình trạng, tiền phạt → cập nhật bản sách → tạo khoản phạt "Chưa thu" nếu trễ
 * → đóng phiếu nếu đã trả hết. Thu tiền là bước riêng (UC011, extend).
 */
async function returnCopy({ copyCode, condition, note }, actor) {
  if (condition !== 'GOOD' && !note) {
    throw new AppError(400, 'Cần nhập ghi chú khi sách bị hư hỏng hoặc mất', [   // 7a
      { field: 'note', message: 'Cần nhập ghi chú khi sách bị hư hỏng hoặc mất' },
    ]);
  }

  return withTransaction(async (conn) => {
    const item = await findOpenItem(copyCode, conn, { forUpdate: true });
    const { lateDays, amount } = fineFor(item, todayVN());   // ngày trả = hôm nay, không sửa tay
    const copyStatus = COPY_STATUS_AFTER[condition];

    await repo.markReturned(
      {
        borrowDetailId: item.borrow_detail_id,
        condition,
        note: note || null,
        lateDays,
        fineAmount: amount,
        receivedBy: actor.userId,
      },
      conn,
    );
    await repo.updateCopyAfterReturn(
      { copyId: item.copy_id, status: copyStatus, note: condition === 'GOOD' ? null : note },
      conn,
    );
    await repo.insertCopyLog(
      { copyId: item.copy_id, newStatus: copyStatus, reason: note || 'Trả sách', changedBy: actor.userId },
      conn,
    );

    let fine = null;
    if (amount > 0) {
      const fineId = await repo.insertFine(
        { borrowDetailId: item.borrow_detail_id, readerId: item.reader_id, lateDays, amount },
        conn,
      );
      fine = { fineId, amount, lateDays, status: 'UNPAID' };
    }
    const ticketCompleted = await repo.completeTicketIfDone(item.borrow_id, conn);

    const returned = await repo.findReturnedItem(item.borrow_detail_id, conn);
    return {
      ...itemSummary(returned),
      returnDate: returned.return_date,
      condition: returned.return_condition,
      note: returned.return_note,
      lateDays,
      fineAmount: amount,
      fine,                 // khác null → giao diện chuyển sang thu phạt (UC011)
      ticketCompleted,
    };
  });
}

function returnMessage(result) {
  if (!result.fine) return 'Trả sách thành công';
  return `Trả sách thành công. Trễ ${result.lateDays} ngày, tiền phạt ${formatVND(result.fineAmount)}`;
}

module.exports = { lookup, returnCopy, returnMessage };
