const AppError = require('../../utils/AppError');
const { todayVN } = require('../../utils/date');
const { calculateFine } = require('../../utils/fine');
const { ticketCode, receiptCode } = require('../../utils/format');
const repo = require('./reports.repository');
const { buildExcel, buildPdf } = require('./reports.exporter');

/**
 * UC016 bước 6, 6a – Kiểm tra kỳ báo cáo (định dạng ngày đã kiểm tra ở routes):
 * "Từ ngày" lớn hơn "Đến ngày" hoặc "Đến ngày" ở tương lai → "Kỳ báo cáo không hợp lệ".
 */
function resolvePeriod({ from, to }) {
  if (from > to || to > todayVN()) {
    throw new AppError(400, 'Kỳ báo cáo không hợp lệ');      // 6a
  }
  return { from, to };
}

/**
 * UC016 (1) – Báo cáo thống kê mượn/trả theo kỳ.
 */
async function loansReport(query) {
  const period = resolvePeriod(query);
  const [rows, returnedInPeriod] = await Promise.all([
    repo.listLoanTickets(period),
    repo.countReturnedInPeriod(period),
  ]);

  const items = rows.map((r) => ({
    borrowId: r.borrow_id,
    ticketCode: ticketCode(r.borrow_id),
    borrowDate: r.borrow_date,
    status: r.status,
    completedAt: r.completed_at,
    reader: {
      readerId: r.reader_id,
      readerCode: r.reader_code,
      fullName: r.reader_name,
      readerType: r.reader_type,
    },
    librarian: {
      username: r.librarian_username,
      fullName: r.librarian_name,
    },
    totalBooks: r.total_books,
    returnedBooks: r.returned_books,
    borrowingBooks: r.borrowing_books,
    overdueBooks: r.overdue_books,
  }));

  const summary = {
    totalTickets: items.length,
    totalBorrowedBooks: items.reduce((s, i) => s + i.totalBooks, 0),
    totalReturnedBooks: items.reduce((s, i) => s + i.returnedBooks, 0),
    returnedInPeriod,
    borrowingBooks: items.reduce((s, i) => s + i.borrowingBooks, 0),
    overdueBooks: items.reduce((s, i) => s + i.overdueBooks, 0),
    studentTickets: items.filter((i) => i.reader.readerType === 'STUDENT').length,
    teacherTickets: items.filter((i) => i.reader.readerType === 'TEACHER').length,
  };

  const message = items.length === 0 && returnedInPeriod === 0
    ? 'Không có dữ liệu trong kỳ đã chọn'                    // 8a
    : undefined;

  return {
    message,
    data: { period, summary, items },
  };
}

/**
 * UC016 (2) – Báo cáo sách trả trễ và đang quá hạn theo kỳ.
 */
async function overdueReport(query) {
  const period = resolvePeriod(query);
  const today = todayVN();
  const rows = await repo.listOverdueAndLateItems(period);

  const items = rows.map((r) => {
    const isOverdue = r.item_status === 'OVERDUE';
    const calc = isOverdue
      ? calculateFine({
          dueDate: r.due_date,
          returnDate: today,
          finePerDay: r.snap_fine_per_day,
          maxFinePerBook: r.snap_max_fine_per_book,
        })
      : { lateDays: r.late_days, amount: r.fine_amount };

    return {
      borrowDetailId: r.borrow_detail_id,
      borrowId: r.borrow_id,
      ticketCode: ticketCode(r.borrow_id),
      status: r.item_status,                 // OVERDUE | LATE_RETURNED
      reader: {
        readerId: r.reader_id,
        readerCode: r.reader_code,
        fullName: r.reader_name,
        readerType: r.reader_type,
      },
      copyCode: r.copy_code,
      book: { bookId: r.book_id, title: r.title },
      title: r.title,
      borrowDate: r.borrow_date,
      dueDate: r.due_date,
      returnDate: r.return_date,
      lateDays: calc.lateDays,
      fineAmount: calc.amount,
    };
  });

  const overdueItems = items.filter((i) => i.status === 'OVERDUE');
  const lateReturnedItems = items.filter((i) => i.status === 'LATE_RETURNED');

  const summary = {
    totalItems: items.length,
    overdueCount: overdueItems.length,
    lateReturnedCount: lateReturnedItems.length,
    overdueFineAmount: overdueItems.reduce((s, i) => s + i.fineAmount, 0),
    lateReturnedFineAmount: lateReturnedItems.reduce((s, i) => s + i.fineAmount, 0),
    totalFineAmount: items.reduce((s, i) => s + i.fineAmount, 0),
  };

  const message = items.length === 0 ? 'Không có dữ liệu trong kỳ đã chọn' : undefined;   // 8a

  return {
    message,
    data: {
      period,
      summary,
      overdueItems,
      lateReturnedItems,
      items,
    },
  };
}

/**
 * UC016 (3) – Báo cáo tiền phạt đã thu / chưa thu và độc giả còn nợ.
 */
async function finesReport(query) {
  const period = resolvePeriod(query);
  const rows = await repo.listFinesInPeriod(period);

  const items = rows.map((r) => ({
    fineId: r.fine_id,
    receiptCode: r.status === 'PAID' ? receiptCode(r.fine_id) : null,
    ticketCode: ticketCode(r.borrow_id),
    status: r.status,                        // UNPAID | PAID
    amount: r.amount,
    lateDays: r.late_days,
    reason: r.reason,
    createdAt: r.created_at,
    paidAt: r.paid_at,
    reader: {
      readerId: r.reader_id,
      readerCode: r.reader_code,
      fullName: r.reader_name,
      readerType: r.reader_type,
    },
    copyCode: r.copy_code,
    title: r.title,
    dueDate: r.due_date,
    returnDate: r.return_date,
    collectedBy: r.collector_username
      ? { username: r.collector_username, fullName: r.collector_name }
      : null,
  }));

  const debtorMap = new Map();
  for (const item of items) {
    if (item.status !== 'UNPAID') continue;
    const key = item.reader.readerId;
    if (!debtorMap.has(key)) {
      debtorMap.set(key, {
        readerId: item.reader.readerId,
        readerCode: item.reader.readerCode,
        fullName: item.reader.fullName,
        readerType: item.reader.readerType,
        unpaidCount: 0,
        unpaidTotal: 0,
      });
    }
    const d = debtorMap.get(key);
    d.unpaidCount += 1;
    d.unpaidTotal += item.amount;
  }
  const debtors = [...debtorMap.values()];

  const paidItems = items.filter((i) => i.status === 'PAID');
  const unpaidItems = items.filter((i) => i.status === 'UNPAID');
  const paidAmount = paidItems.reduce((s, i) => s + i.amount, 0);
  const unpaidAmount = unpaidItems.reduce((s, i) => s + i.amount, 0);

  const summary = {
    totalFines: items.length,
    totalAmount: paidAmount + unpaidAmount,
    paidCount: paidItems.length,
    paidAmount,
    unpaidCount: unpaidItems.length,
    unpaidAmount,
    debtorCount: debtors.length,
  };

  const message = items.length === 0 ? 'Không có dữ liệu trong kỳ đã chọn' : undefined;   // 8a

  return {
    message,
    data: {
      period,
      summary,
      debtors,
      items,
    },
  };
}

const REPORT_HANDLERS = {
  loans: loansReport,
  overdue: overdueReport,
  fines: finesReport,
};

/**
 * UC016 bước 9–10 – Xuất báo cáo ra file Excel (.xlsx) hoặc PDF (.pdf).
 */
async function exportReport(type, { from, to, format }) {
  const { data } = await REPORT_HANDLERS[type]({ from, to });
  const isPdf = format === 'pdf';
  const contentType = isPdf
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const buffer = isPdf ? await buildPdf(type, data) : await buildExcel(type, data);
  const filename = `bao-cao-${type}-${data.period.from}-${data.period.to}.${format}`;

  return { buffer, contentType, filename };
}

module.exports = {
  loansReport,
  overdueReport,
  finesReport,
  exportReport,
};

