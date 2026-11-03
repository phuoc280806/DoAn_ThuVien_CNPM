const path = require('node:path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { formatVND } = require('../../utils/format');

const FONT_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'Roboto-Regular.ttf');

const REPORT_META = {
  loans: {
    title: 'BÁO CÁO THỐNG KÊ MƯỢN - TRẢ SÁCH',
    sheetName: 'MuonTra',
    columns: [
      { header: 'Mã phiếu', key: 'ticketCode', width: 14 },
      { header: 'Mã độc giả', key: 'readerCode', width: 14 },
      { header: 'Họ tên độc giả', key: 'readerName', width: 24 },
      { header: 'Đối tượng', key: 'readerTypeLabel', width: 14 },
      { header: 'Ngày mượn', key: 'borrowDate', width: 14 },
      { header: 'Tổng số cuốn', key: 'totalBooks', width: 14 },
      { header: 'Đã trả', key: 'returnedBooks', width: 12 },
      { header: 'Đang mượn', key: 'borrowingBooks', width: 12 },
      { header: 'Quá hạn', key: 'overdueBooks', width: 12 },
      { header: 'Trạng thái', key: 'statusLabel', width: 16 },
    ],
    toRow: (item) => ({
      ticketCode: item.ticketCode,
      readerCode: item.reader.readerCode,
      readerName: item.reader.fullName,
      readerTypeLabel: item.reader.readerType === 'TEACHER' ? 'Giáo viên' : 'Học sinh',
      borrowDate: item.borrowDate,
      totalBooks: item.totalBooks,
      returnedBooks: item.returnedBooks,
      borrowingBooks: item.borrowingBooks,
      overdueBooks: item.overdueBooks,
      statusLabel: item.status === 'COMPLETED' ? 'Đã hoàn tất' : 'Đang mượn',
    }),
    summaryRow: (s) => ({
      ticketCode: 'TỔNG CỘNG',
      readerCode: `${s.totalTickets} phiếu`,
      readerName: `HS: ${s.studentTickets}, GV: ${s.teacherTickets}`,
      readerTypeLabel: '',
      borrowDate: '',
      totalBooks: s.totalBorrowedBooks,
      returnedBooks: s.totalReturnedBooks,
      borrowingBooks: s.borrowingBooks,
      overdueBooks: s.overdueBooks,
      statusLabel: `Trả trong kỳ: ${s.returnedInPeriod}`,
    }),
    summaryLines: (s) => [
      `Tổng số phiếu mượn: ${s.totalTickets} (Học sinh: ${s.studentTickets}, Giáo viên: ${s.teacherTickets})`,
      `Tổng số sách mượn: ${s.totalBorrowedBooks} cuốn | Đã trả: ${s.totalReturnedBooks} cuốn | Đang mượn: ${s.borrowingBooks} cuốn | Đang quá hạn: ${s.overdueBooks} cuốn`,
    ],
  },
  overdue: {
    title: 'BÁO CÁO SÁCH TRẢ TRỄ VÀ ĐANG QUÁ HẠN',
    sheetName: 'QuaHan_TraTre',
    columns: [
      { header: 'Mã phiếu', key: 'ticketCode', width: 14 },
      { header: 'Mã độc giả', key: 'readerCode', width: 14 },
      { header: 'Họ tên độc giả', key: 'readerName', width: 22 },
      { header: 'Mã bản sách', key: 'copyCode', width: 14 },
      { header: 'Tên sách', key: 'title', width: 28 },
      { header: 'Hạn trả', key: 'dueDate', width: 14 },
      { header: 'Ngày trả', key: 'returnDate', width: 18 },
      { header: 'Số ngày trễ', key: 'lateDays', width: 14 },
      { header: 'Tiền phạt (đ)', key: 'fineAmount', width: 16 },
      { header: 'Tình trạng', key: 'statusLabel', width: 16 },
    ],
    toRow: (item) => ({
      ticketCode: item.ticketCode,
      readerCode: item.reader.readerCode,
      readerName: item.reader.fullName,
      copyCode: item.copyCode,
      title: item.title,
      dueDate: item.dueDate,
      returnDate: item.returnDate ? item.returnDate.slice(0, 10) : 'Chưa trả',
      lateDays: item.lateDays,
      fineAmount: item.fineAmount,
      statusLabel: item.status === 'OVERDUE' ? 'Đang quá hạn' : 'Đã trả trễ',
    }),
    summaryRow: (s) => ({
      ticketCode: 'TỔNG CỘNG',
      readerCode: `${s.totalItems} cuốn`,
      readerName: `Quá hạn: ${s.overdueCount}, Trả trễ: ${s.lateReturnedCount}`,
      copyCode: '',
      title: '',
      dueDate: '',
      returnDate: '',
      lateDays: '',
      fineAmount: s.totalFineAmount,
      statusLabel: formatVND(s.totalFineAmount),
    }),
    summaryLines: (s) => [
      `Tổng số cuốn vi phạm: ${s.totalItems} cuốn (Đang quá hạn: ${s.overdueCount} cuốn, Đã trả trễ: ${s.lateReturnedCount} cuốn)`,
      `Tổng tiền phạt (bao gồm dự kiến): ${formatVND(s.totalFineAmount)}`,
    ],
  },
  fines: {
    title: 'BÁO CÁO TIỀN PHẠT VÀ ĐỘC GIẢ CÒN NỢ',
    sheetName: 'TienPhat',
    columns: [
      { header: 'Mã biên lai', key: 'receiptCode', width: 14 },
      { header: 'Mã phiếu', key: 'ticketCode', width: 14 },
      { header: 'Mã độc giả', key: 'readerCode', width: 14 },
      { header: 'Họ tên độc giả', key: 'readerName', width: 22 },
      { header: 'Mã bản sách', key: 'copyCode', width: 14 },
      { header: 'Tên sách', key: 'title', width: 26 },
      { header: 'Số ngày trễ', key: 'lateDays', width: 14 },
      { header: 'Số tiền (đ)', key: 'amount', width: 16 },
      { header: 'Trạng thái', key: 'statusLabel', width: 14 },
      { header: 'Ngày thu', key: 'paidAt', width: 18 },
    ],
    toRow: (item) => ({
      receiptCode: item.receiptCode ?? '-',
      ticketCode: item.ticketCode,
      readerCode: item.reader.readerCode,
      readerName: item.reader.fullName,
      copyCode: item.copyCode,
      title: item.title,
      lateDays: item.lateDays,
      amount: item.amount,
      statusLabel: item.status === 'PAID' ? 'Đã thu' : 'Chưa thu',
      paidAt: item.paidAt ? item.paidAt.slice(0, 10) : '-',
    }),
    summaryRow: (s) => ({
      receiptCode: 'TỔNG CỘNG',
      ticketCode: `${s.totalFines} khoản`,
      readerCode: `Còn nợ: ${s.debtorCount} ĐG`,
      readerName: '',
      copyCode: '',
      title: `Đã thu: ${formatVND(s.paidAmount)} | Chưa thu: ${formatVND(s.unpaidAmount)}`,
      lateDays: '',
      amount: s.totalAmount,
      statusLabel: formatVND(s.totalAmount),
      paidAt: '',
    }),
    summaryLines: (s) => [
      `Tổng số khoản phạt: ${s.totalFines} khoản | Tổng số tiền: ${formatVND(s.totalAmount)}`,
      `Đã thu: ${s.paidCount} khoản (${formatVND(s.paidAmount)}) | Chưa thu: ${s.unpaidCount} khoản (${formatVND(s.unpaidAmount)}) | Độc giả còn nợ: ${s.debtorCount}`,
    ],
  },
};

async function buildExcel(type, reportData) {
  const meta = REPORT_META[type];
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Hệ thống quản lý thư viện THPT';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(meta.sheetName);

  sheet.columns = meta.columns;

  // Dòng tiêu đề và kỳ báo cáo
  sheet.spliceRows(1, 0, [meta.title], [`Kỳ báo cáo: Từ ngày ${reportData.period.from} đến ngày ${reportData.period.to}`], []);
  sheet.getRow(1).font = { bold: true, size: 14 };
  sheet.getRow(2).font = { italic: true, size: 11 };
  sheet.getRow(4).font = { bold: true };

  for (const item of reportData.items) {
    sheet.addRow(meta.toRow(item));
  }

  const totalRow = sheet.addRow(meta.summaryRow(reportData.summary));
  totalRow.font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function buildPdf(type, reportData) {
  const meta = REPORT_META[type];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('VN', FONT_PATH);
    doc.font('VN');

    doc.fontSize(11).text('TRƯỜNG THPT MẪU - THƯ VIỆN', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(15).text(meta.title, { align: 'center' });
    doc.fontSize(10).text(
      `Kỳ báo cáo: Từ ngày ${reportData.period.from} đến ngày ${reportData.period.to}`,
      { align: 'center' },
    );
    doc.moveDown(1);

    // Header bảng
    const headers = meta.columns.map((c) => c.header).join(' | ');
    doc.fontSize(9).text(headers);
    doc.text('-'.repeat(130));

    if (reportData.items.length === 0) {
      doc.moveDown(0.5);
      doc.fontSize(10).text('Không có dữ liệu trong kỳ đã chọn.');
    } else {
      for (const item of reportData.items) {
        const rowObj = meta.toRow(item);
        const line = meta.columns.map((c) => String(rowObj[c.key] ?? '')).join(' | ');
        doc.fontSize(9).text(line);
      }
    }

    doc.moveDown(0.8);
    doc.text('-'.repeat(130));
    doc.fontSize(10).text('TỔNG CỘNG:');
    for (const line of meta.summaryLines(reportData.summary)) {
      doc.fontSize(10).text(`- ${line}`);
    }

    doc.end();
  });
}

module.exports = { buildExcel, buildPdf };

