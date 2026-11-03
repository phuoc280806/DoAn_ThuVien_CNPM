const AppError = require('../../utils/AppError');
const { todayVN, addDays, diffDays } = require('../../utils/date');
const { ticketCode } = require('../../utils/format');
const repo = require('./reminders.repository');
const mailer = require('./reminders.mailer');

const DUE_SOON_DAYS = 3;
const SIMULATED_NOTE = 'Chưa cấu hình SMTP: email chỉ được giả lập, độc giả không nhận được';

function mapCandidateRow(row, today) {
  const dueDate = String(row.due_date).slice(0, 10);
  const diff = diffDays(today, dueDate); // dueDate - today (dương nếu còn hạn, âm nếu quá hạn)
  const isOverdue = diff < 0;
  const email = row.email ? String(row.email).trim() : null;

  return {
    borrowDetailId: row.borrow_detail_id,
    borrowId: row.borrow_id,
    ticketCode: ticketCode(row.borrow_id),
    borrowDate: String(row.borrow_date).slice(0, 10),
    dueDate,
    status: isOverdue ? 'OVERDUE' : 'DUE_SOON',
    daysLeft: isOverdue ? 0 : diff,
    daysOverdue: isOverdue ? Math.abs(diff) : 0,
    readerId: row.reader_id,
    readerCode: row.reader_code,
    readerName: row.reader_name,
    readerType: row.reader_type,
    className: row.class_name,
    department: row.department,
    email,
    canSendEmail: Boolean(email),
    missingEmailReason: email ? null : 'Độc giả chưa có email, hãy nhắc trực tiếp',
    copyId: row.copy_id,
    copyCode: row.copy_code,
    bookId: row.book_id,
    isbn: row.isbn,
    title: row.title,
    sentCount: Number(row.sent_count || 0),
    lastAttemptAt: row.last_attempt_at || null,
  };
}

async function list(query = {}) {
  const today = todayVN();
  const maxDueDate = addDays(today, DUE_SOON_DAYS);
  const rows = await repo.listCandidates(maxDueDate);

  let items = rows.map((r) => mapCandidateRow(r, today));

  if (query.status) {
    const statusFilter = String(query.status).toUpperCase();
    items = items.filter((item) => item.status === statusFilter);
  }

  const dueSoonCount = items.filter((i) => i.status === 'DUE_SOON').length;
  const overdueCount = items.filter((i) => i.status === 'OVERDUE').length;

  return {
    data: {
      today,
      thresholdDays: DUE_SOON_DAYS,
      totalItems: items.length,
      dueSoonCount,
      overdueCount,
      items,
    },
    message: items.length === 0 ? 'Không có phiếu cần nhắc' : undefined,
  };
}

function normalizeIdArray(val) {
  if (val === undefined || val === null) return [];
  const arr = Array.isArray(val) ? val : [val];
  return [...new Set(arr.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0))];
}

async function send(body = {}, actor) {
  const borrowDetailIds = normalizeIdArray(
    body.borrowDetailIds !== undefined ? body.borrowDetailIds : body.borrowDetailId
  );
  const borrowIds = normalizeIdArray(
    body.borrowIds !== undefined ? body.borrowIds : body.borrowId
  );

  if (borrowDetailIds.length === 0 && borrowIds.length === 0) {
    throw new AppError(400, 'Vui lòng chọn ít nhất một phiếu hoặc sách cần nhắc hạn');
  }

  const today = todayVN();
  const maxDueDate = addDays(today, DUE_SOON_DAYS);

  const openRows = await repo.findOpenItemsByIds({ borrowDetailIds, borrowIds });
  if (openRows.length === 0) {
    throw new AppError(404, 'Không tìm thấy phiếu đang mượn tương ứng');
  }

  if (borrowDetailIds.length > 0) {
    const foundIds = new Set(openRows.map((r) => r.borrow_detail_id));
    const missingId = borrowDetailIds.find((id) => !foundIds.has(id));
    if (missingId) {
      throw new AppError(404, `Không tìm thấy mục mượn đang mở #${missingId}`);
    }
  }

  const items = openRows.map((r) => mapCandidateRow(r, today));

  const notEligible = items.find((item) => item.dueDate > maxDueDate);
  if (notEligible) {
    throw new AppError(
      409,
      `Phiếu ${notEligible.ticketCode} (hạn trả ${notEligible.dueDate}) chưa đến diện nhắc hạn (chỉ nhắc trước tối đa ${DUE_SOON_DAYS} ngày)`
    );
  }

  // Luồng 4a: Nếu độc giả thiếu email -> thông báo "Độc giả chưa có email, hãy nhắc trực tiếp"
  const missingEmailItem = items.find((item) => !item.email);
  if (missingEmailItem) {
    throw new AppError(409, 'Độc giả chưa có email, hãy nhắc trực tiếp', [
      {
        borrowDetailId: missingEmailItem.borrowDetailId,
        ticketCode: missingEmailItem.ticketCode,
        readerCode: missingEmailItem.readerCode,
        readerName: missingEmailItem.readerName,
      },
    ]);
  }

  const simulated = mailer.isSimulated();
  if (simulated) console.warn(`[UC017] ${SIMULATED_NOTE}. Cấu hình SMTP_* trong backend/.env để gửi thật.`);

  const results = [];
  const failedItems = [];

  for (const item of items) {
    try {
      await mailer.sendReminderEmail({
        to: item.email,
        readerName: item.readerName,
        readerCode: item.readerCode,
        ticketCode: item.ticketCode,
        copyCode: item.copyCode,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        daysLeft: item.daysLeft,
        daysOverdue: item.daysOverdue,
      });

      const reminderId = await repo.insertLog({
        borrowDetailId: item.borrowDetailId,
        email: item.email,
        sentBy: actor.userId,
        success: true,
        errorMessage: simulated ? SIMULATED_NOTE : null,   // ghi chú để lịch sử không hiểu nhầm là đã gửi thật
      });

      results.push({
        reminderId,
        borrowDetailId: item.borrowDetailId,
        borrowId: item.borrowId,
        ticketCode: item.ticketCode,
        readerCode: item.readerCode,
        readerName: item.readerName,
        email: item.email,
        copyCode: item.copyCode,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        success: true,
        errorMessage: null,
      });
    } catch (err) {
      const errorMessage = String(err.message || 'Lỗi gửi email').slice(0, 255);
      const reminderId = await repo.insertLog({
        borrowDetailId: item.borrowDetailId,
        email: item.email,
        sentBy: actor.userId,
        success: false,
        errorMessage,
      });

      const failedEntry = {
        reminderId,
        borrowDetailId: item.borrowDetailId,
        borrowId: item.borrowId,
        ticketCode: item.ticketCode,
        readerCode: item.readerCode,
        readerName: item.readerName,
        email: item.email,
        copyCode: item.copyCode,
        title: item.title,
        dueDate: item.dueDate,
        status: item.status,
        success: false,
        errorMessage,
      };
      results.push(failedEntry);
      failedItems.push(failedEntry);
    }
  }

  // Luồng 5a: Nếu có lỗi gửi email -> báo lỗi gửi email, đã ghi nhận thất bại và cho phép gửi lại
  if (failedItems.length > 0) {
    throw new AppError(
      502,
      `Gửi email nhắc hạn thất bại (${failedItems.length}/${items.length} mục). Đã ghi nhận lịch sử lỗi, vui lòng thử gửi lại`,
      results
    );
  }

  return {
    totalSelected: items.length,
    sentCount: results.length,
    failedCount: 0,
    simulated,
    results,
  };
}

async function listLogs(query = {}) {
  const borrowDetailId = query.borrowDetailId ? Number(query.borrowDetailId) : undefined;
  const rows = await repo.listLogs({ borrowDetailId });
  return rows.map((r) => ({
    reminderId: r.reminder_id,
    borrowDetailId: r.borrow_detail_id,
    email: r.email,
    sentBy: {
      userId: r.sent_by,
      username: r.sent_by_username,
      fullName: r.sent_by_name,
    },
    sentAt: r.sent_at,
    success: Boolean(r.success),
    errorMessage: r.error_message,
  }));
}

module.exports = {
  list,
  send,
  listLogs,
};
