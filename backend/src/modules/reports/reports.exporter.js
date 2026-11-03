const path = require('node:path');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { formatVND } = require('../../utils/format');
const { todayVN } = require('../../utils/date');

const FONT_PATH = path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'Roboto-Regular.ttf');

// '2026-11-03' hoặc '2026-11-03 15:00:00' → '03/11/2026'
const viDate = (value) => (value ? value.slice(0, 10).split('-').reverse().join('/') : '');

// Cột có money: true là tiền (Excel định dạng số, PDF in kèm "đ"); cột numeric căn phải

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
      { header: 'Tổng số cuốn', key: 'totalBooks', width: 12, numeric: true },
      { header: 'Đã trả', key: 'returnedBooks', width: 10, numeric: true },
      { header: 'Đang mượn', key: 'borrowingBooks', width: 11, numeric: true },
      { header: 'Quá hạn', key: 'overdueBooks', width: 10, numeric: true },
      { header: 'Trạng thái', key: 'statusLabel', width: 20 },
    ],
    toRow: (item) => ({
      ticketCode: item.ticketCode,
      readerCode: item.reader.readerCode,
      readerName: item.reader.fullName,
      readerTypeLabel: item.reader.readerType === 'TEACHER' ? 'Giáo viên' : 'Học sinh',
      borrowDate: viDate(item.borrowDate),
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
      { header: 'Hạn trả', key: 'dueDate', width: 12 },
      { header: 'Ngày trả', key: 'returnDate', width: 12 },
      { header: 'Số ngày trễ', key: 'lateDays', width: 10, numeric: true },
      { header: 'Tiền phạt', key: 'fineAmount', width: 14, numeric: true, money: true },
      { header: 'Tình trạng', key: 'statusLabel', width: 14 },
    ],
    toRow: (item) => ({
      ticketCode: item.ticketCode,
      readerCode: item.reader.readerCode,
      readerName: item.reader.fullName,
      copyCode: item.copyCode,
      title: item.title,
      dueDate: viDate(item.dueDate),
      returnDate: item.returnDate ? viDate(item.returnDate) : 'Chưa trả',
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
      statusLabel: '',
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
      { header: 'Số ngày trễ', key: 'lateDays', width: 10, numeric: true },
      { header: 'Số tiền', key: 'amount', width: 14, numeric: true, money: true },
      { header: 'Trạng thái', key: 'statusLabel', width: 12 },
      { header: 'Ngày thu', key: 'paidAt', width: 12 },
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
      paidAt: item.paidAt ? viDate(item.paidAt) : '-',
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
      statusLabel: '',
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

  sheet.columns = meta.columns.map(({ header, key, width }) => ({ header, key, width }));
  for (const c of meta.columns.filter((col) => col.money)) {
    sheet.getColumn(c.key).numFmt = '#,##0"đ"';
  }

  // Dòng tiêu đề và kỳ báo cáo
  sheet.spliceRows(1, 0, [meta.title], [`Kỳ báo cáo: Từ ngày ${viDate(reportData.period.from)} đến ngày ${viDate(reportData.period.to)}`], []);
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

const PDF_FONT_SIZE = 9;
const CELL_PADDING = 4;
const HEADER_FILL = '#e9ecef';
const TOTAL_FILL = '#f8f9fa';

// Giá trị một ô khi in PDF: tiền in kèm "đ"
function pdfCell(column, value) {
  if (value === null || value === undefined || value === '') return '';
  return column.money && typeof value === 'number' ? formatVND(value) : String(value);
}

/**
 * Vẽ một dòng bảng: mỗi ô có viền, chữ tự xuống dòng trong ô, chiều cao dòng theo ô cao nhất.
 * Hết trang thì sang trang mới và vẽ lại dòng tiêu đề cột.
 */
function drawRow(doc, layout, cells, { fill, onNewPage } = {}) {
  const heights = layout.map((col, i) =>
    doc.heightOfString(cells[i], { width: col.width - CELL_PADDING * 2 }));
  const rowHeight = Math.max(...heights) + CELL_PADDING * 2;

  if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
    if (onNewPage) onNewPage();
  }

  const y = doc.y;
  layout.forEach((col, i) => {
    if (fill) doc.rect(col.x, y, col.width, rowHeight).fill(fill);
    doc.rect(col.x, y, col.width, rowHeight).lineWidth(0.5).stroke('#000000');
    doc.fillColor('#000000').text(cells[i], col.x + CELL_PADDING, y + CELL_PADDING, {
      width: col.width - CELL_PADDING * 2,
      align: col.numeric ? 'right' : 'left',
    });
  });
  doc.x = layout[0].x;
  doc.y = y + rowHeight;
}

async function buildPdf(type, reportData) {
  const meta = REPORT_META[type];

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36, bufferPages: true });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('VN', FONT_PATH);
    doc.font('VN');

    const left = doc.page.margins.left;
    const tableWidth = doc.page.width - left - doc.page.margins.right;

    doc.fontSize(11).text(process.env.SCHOOL_NAME || 'THƯ VIỆN TRƯỜNG THPT', left, doc.y, { continued: false });
    doc.fontSize(9).text(`Ngày lập: ${viDate(todayVN())}`, left, doc.page.margins.top, { align: 'right' });
    doc.moveDown(1);
    doc.fontSize(15).text(meta.title, left, doc.y, { align: 'center' });
    doc.fontSize(10).text(
      `Kỳ báo cáo: Từ ngày ${viDate(reportData.period.from)} đến ngày ${viDate(reportData.period.to)}`,
      { align: 'center' },
    );
    doc.moveDown(1);

    // Chia bề rộng trang cho các cột theo tỉ lệ width khai báo ở REPORT_META
    const totalUnits = meta.columns.reduce((s, c) => s + c.width, 0);
    let x = left;
    const layout = meta.columns.map((c) => {
      const width = (c.width / totalUnits) * tableWidth;
      const col = { ...c, x, width };
      x += width;
      return col;
    });

    doc.fontSize(PDF_FONT_SIZE);
    const drawHeader = () => drawRow(doc, layout, layout.map((c) => c.header), { fill: HEADER_FILL });
    drawHeader();

    if (reportData.items.length === 0) {
      doc.text('Không có dữ liệu trong kỳ đã chọn.', left, doc.y + CELL_PADDING);
      doc.moveDown(0.5);
    } else {
      for (const item of reportData.items) {
        const row = meta.toRow(item);
        drawRow(doc, layout, layout.map((c) => pdfCell(c, row[c.key])), { onNewPage: drawHeader });
      }
      const total = meta.summaryRow(reportData.summary);
      drawRow(doc, layout, layout.map((c) => pdfCell(c, total[c.key])), { fill: TOTAL_FILL, onNewPage: drawHeader });
    }

    doc.moveDown(1);
    doc.fontSize(10).text('TỔNG CỘNG:', left);
    for (const line of meta.summaryLines(reportData.summary)) {
      doc.text(`- ${line}`, left);
    }

    // Số trang ở chân mỗi trang
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i += 1) {
      doc.switchToPage(range.start + i);
      const bottom = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;   // cho phép ghi vào lề dưới mà không tự sang trang
      doc.fontSize(8).text(`Trang ${i + 1}/${range.count}`, left, doc.page.height - bottom + 10, {
        width: tableWidth,
        align: 'center',
      });
      doc.page.margins.bottom = bottom;
    }

    doc.end();
  });
}

module.exports = { buildExcel, buildPdf };

