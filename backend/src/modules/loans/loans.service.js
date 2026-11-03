const { pool, withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const { todayVN, addDays } = require('../../utils/date');
const { formatVND, ticketCode } = require('../../utils/format');
const regulationsService = require('../regulations/regulations.service');
const repo = require('./loans.repository');
const { toReaderSummary, toActiveItemDto, toUnpaidFineDto, toTicketDto, toTicketSummaryDto } = require('./loans.mapper');

const COPY_STATUS_LABEL = { BORROWED: 'đang được mượn', DAMAGED: 'bị hư hỏng', LOST: 'đã mất' };

async function findReaderOrFail(readerCode, conn, options) {
  const reader = await repo.findReaderByCode(readerCode, conn, options);
  if (!reader) throw new AppError(404, 'Không tìm thấy độc giả');   // UC007 3a
  return reader;
}

/**
 * UC007 bước 5 – Kiểm tra điều kiện mượn (include). Trả về mọi lý do bị chặn, theo thứ tự đặc tả:
 *   5a thẻ hết hạn / bị khóa, tài khoản bị khóa
 *   5b còn sách quá hạn, còn khoản phạt "Chưa thu" (QĐ05)
 *   5c đã đạt giới hạn số sách, tính cả sách quá hạn (QĐ01)
 */
async function evaluate(reader, conn = pool) {
  const regulation = await regulationsService.findEffective(reader.reader_type, todayVN(), conn);
  const items = await repo.listActiveItemsByReader(reader.reader_id, conn);
  const unpaid = await repo.listUnpaidFines(reader.reader_id, conn);

  const holding = items.length;
  const overdueCount = items.filter((i) => i.is_overdue).length;
  const unpaidTotal = unpaid.reduce((sum, f) => sum + f.amount, 0);

  const problems = [];
  const add = (code, message) => problems.push({ code, message });

  if (!reader.card_status) add('CARD_MISSING', 'Độc giả chưa được cấp thẻ thư viện');
  if (reader.card_status === 'EXPIRED') add('CARD_EXPIRED', 'Thẻ thư viện đã hết hạn');
  if (reader.card_status === 'LOCKED') add('CARD_LOCKED', 'Thẻ thư viện đã bị khóa');
  if (reader.account_status === 'LOCKED') add('ACCOUNT_LOCKED', 'Tài khoản của độc giả đã bị khóa');
  if (overdueCount > 0) {
    add('OVERDUE', `Độc giả còn ${overdueCount} cuốn sách quá hạn chưa trả, cần trả sách trước khi mượn mới`);
  }
  if (unpaidTotal > 0) {
    add('UNPAID_FINE', `Độc giả còn nợ phạt ${formatVND(unpaidTotal)} chưa thu, cần nộp phạt trước khi mượn mới`);
  }
  if (!regulation) {
    add('NO_REGULATION', 'Chưa cấu hình quy định cho vai trò này');   // 10a
  } else if (holding >= regulation.maxBooks) {
    add('LIMIT_REACHED', `Đã mượn ${holding}/${regulation.maxBooks} cuốn`);
  }

  return {
    regulation,
    items,
    unpaid,
    holding,
    unpaidTotal,
    remaining: regulation ? Math.max(0, regulation.maxBooks - holding) : 0,
    problems,
  };
}

// UC008 bước 6 – Kiểm tra điều kiện gia hạn (include)
function checkRenewal(item, today = todayVN()) {
  let reason = null;
  if (item.return_date) reason = 'Cuốn sách đã được trả';
  else if (item.due_date < today) reason = 'Sách đã quá hạn, không thể gia hạn; cần trả sách';   // 6a
  else if (item.renew_count >= 1) reason = 'Chỉ được gia hạn 1 lần';                            // 6b
  else if (item.snap_renew_days <= 0) reason = 'Quy định của phiếu không cho phép gia hạn';
  return {
    canRenew: reason === null,
    reason,
    newDueDate: reason === null ? addDays(item.due_date, item.snap_renew_days) : null,
  };
}

/**
 * UC007 bước 3–6 – Thủ thư nhập mã độc giả, xem hồ sơ, sách đang mượn, nợ phạt
 * và còn được mượn bao nhiêu cuốn ("Đã mượn 1/3, còn được mượn 2").
 */
async function eligibility(readerCode) {
  const reader = await findReaderOrFail(readerCode);
  const ev = await evaluate(reader);
  return {
    reader: toReaderSummary(reader),
    regulation: ev.regulation,
    borrowing: ev.items.map((i) => toActiveItemDto(i)),
    unpaidFines: ev.unpaid.map(toUnpaidFineDto),
    unpaidTotal: ev.unpaidTotal,
    holding: ev.holding,
    maxBooks: ev.regulation?.maxBooks ?? null,
    remaining: ev.remaining,
    eligible: ev.problems.length === 0,
    problems: ev.problems,
    summary: ev.regulation
      ? `Đã mượn ${ev.holding}/${ev.regulation.maxBooks}, còn được mượn ${ev.remaining}`
      : null,
  };
}

async function getTicket(borrowId, conn = pool) {
  const ticket = await repo.findTicket(borrowId, conn);
  if (!ticket) throw new AppError(404, 'Không tìm thấy phiếu mượn');
  return toTicketDto(ticket, await repo.listTicketItems(borrowId, conn));
}

/**
 * UC007 – Lập phiếu mượn, chạy trong MỘT transaction:
 * khóa độc giả → kiểm tra điều kiện → khóa và kiểm tra từng bản sách →
 * lấy quy định hiệu lực, lưu snapshot → tạo phiếu + chi tiết → chuyển bản sách sang Đang mượn.
 * Lỗi ở bất kỳ bước nào thì không có gì được ghi (12a).
 */
async function createLoan({ readerCode, copyCodes }, actor) {
  return withTransaction(async (conn) => {
    const reader = await findReaderOrFail(readerCode, conn, { forUpdate: true });

    const ev = await evaluate(reader, conn);
    if (ev.problems.length > 0) {
      throw new AppError(409, ev.problems[0].message, ev.problems);   // 5a, 5b, 5c, 10a
    }

    const copies = await repo.lockCopiesByCodes(copyCodes, conn);
    const found = new Set(copies.map((c) => c.copy_code));
    const missing = copyCodes.filter((code) => !found.has(code));
    if (missing.length > 0) {
      throw new AppError(404, `Không tìm thấy bản sách ${missing.join(', ')}`);   // 8a
    }
    const unavailable = copies.find((c) => c.status !== 'AVAILABLE');
    if (unavailable) {
      throw new AppError(409,                                                      // 8b
        `Bản sách ${unavailable.copy_code} (${unavailable.title}) ${COPY_STATUS_LABEL[unavailable.status]}, không thể cho mượn`);
    }
    if (copies.length > ev.remaining) {
      throw new AppError(409, `Chỉ còn được mượn ${ev.remaining} cuốn`);           // 8c
    }

    // Bước 10–12: hạn trả = ngày lập + số ngày mượn của quy định đang hiệu lực
    const borrowDate = todayVN();
    const dueDate = addDays(borrowDate, ev.regulation.borrowDays);
    const copyIds = copies.map((c) => c.copy_id);

    const borrowId = await repo.insertTicket(
      { readerId: reader.reader_id, librarianId: actor.userId, regulation: ev.regulation, borrowDate },
      conn,
    );
    await repo.insertDetails(borrowId, copyIds, dueDate, conn);
    await repo.markCopiesBorrowed(copyIds, conn);

    return getTicket(borrowId, conn);
  });
}

/**
 * UC008 bước 3–4 – Tìm các cuốn đang mượn theo mã độc giả hoặc mã bản sách,
 * kèm kết quả kiểm tra gia hạn và hạn trả mới (bước 7).
 */
async function listActive({ readerCode, copyCode }) {
  if (!readerCode && !copyCode) throw new AppError(400, 'Cần nhập mã độc giả hoặc mã bản sách');
  const today = todayVN();
  let items;
  if (copyCode) {
    const item = await repo.findActiveItemByCopyCode(copyCode);
    items = item ? [item] : [];
  } else {
    const reader = await findReaderOrFail(readerCode);
    items = await repo.listActiveItemsByReader(reader.reader_id);
  }
  if (items.length === 0) throw new AppError(404, 'Không tìm thấy sách đang mượn');   // 4a
  return items.map((item) => toActiveItemDto(item, checkRenewal(item, today)));
}

// UC008 bước 8–10 – Gia hạn một cuốn: hạn mới = hạn cũ + số ngày gia hạn trong SNAPSHOT của phiếu
async function renew(borrowDetailId, actor) {
  return withTransaction(async (conn) => {
    const item = await repo.lockDetail(borrowDetailId, conn);
    if (!item) throw new AppError(404, 'Không tìm thấy sách đang mượn');

    const check = checkRenewal(item);
    if (!check.canRenew) throw new AppError(409, check.reason);

    await repo.renew(borrowDetailId, check.newDueDate, conn);
    await repo.insertRenewalLog(
      { borrowDetailId, oldDueDate: item.due_date, newDueDate: check.newDueDate, renewedBy: actor.userId },
      conn,
    );
    return {
      borrowDetailId,
      ticketCode: ticketCode(item.borrow_id),
      oldDueDate: item.due_date,
      newDueDate: check.newDueDate,
      renewCount: item.renew_count + 1,
    };
  });
}

/**
 * Danh sách phiếu mượn để Admin theo dõi (menu "Quản lý mượn trả"):
 * lọc theo mã/tên độc giả hoặc mã phiếu, trạng thái, khoảng ngày lập phiếu.
 * Mỗi phiếu kèm snapshot quy định để so sánh phiếu lập trước / sau khi đổi quy định.
 */
async function listTickets({ keyword, status, from, to, page = 1, pageSize = 20 }) {
  if (from && to && from > to) throw new AppError(400, 'Khoảng thời gian không hợp lệ');
  const match = keyword && /^PM0*(\d+)$/i.exec(keyword);
  const { rows, total } = await repo.searchTickets(
    { keyword, borrowId: match ? Number(match[1]) : null, status, from, to },
    { limit: pageSize, offset: (page - 1) * pageSize },
  );
  return { items: rows.map(toTicketSummaryDto), page, pageSize, total };
}

module.exports = { eligibility, createLoan, getTicket, listActive, renew, listTickets };
