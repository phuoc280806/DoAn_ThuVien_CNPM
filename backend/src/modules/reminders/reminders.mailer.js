const nodemailer = require('nodemailer');

let customSender = null;

function createDefaultTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || '',
          }
        : undefined,
    });
  }

  // Fallback transport (jsonTransport) khi môi trường dev chưa cấu hình SMTP thật
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

function buildEmailContent({
  readerName,
  readerCode,
  ticketCode,
  copyCode,
  title,
  dueDate,
  status,
  daysLeft,
  daysOverdue,
}) {
  const from =
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'Thư viện Trường THPT <no-reply@thptmau.edu.vn>';

  const isOverdue = status === 'OVERDUE';
  const subject = isOverdue
    ? `[Thư viện THPT] Thông báo quá hạn trả sách (${ticketCode})`
    : `[Thư viện THPT] Nhắc lịch sắp đến hạn trả sách (${ticketCode})`;

  const statusLine = isOverdue
    ? `Đã quá hạn ${daysOverdue} ngày (Hạn trả: ${dueDate})`
    : daysLeft === 0
      ? `Đến hạn trả hôm nay (${dueDate})`
      : `Còn ${daysLeft} ngày đến hạn trả (Hạn trả: ${dueDate})`;

  const text = [
    `Xin chào ${readerName} (Mã độc giả: ${readerCode}),`,
    '',
    'Thư viện Trường THPT xin thông báo về sách đang mượn của bạn:',
    `- Mã phiếu mượn: ${ticketCode}`,
    `- Sách: ${title} (Mã bản sách: ${copyCode})`,
    `- Tình trạng: ${statusLine}`,
    '',
    'Vui lòng mang sách đến trả tại Thư viện đúng quy định.',
    'Trân trọng,',
    'Thư viện Trường THPT',
  ].join('\n');

  return { from, subject, text };
}

async function sendReminderEmail(payload) {
  const { from, subject, text } = buildEmailContent(payload);
  const mailOptions = {
    from,
    to: payload.to,
    subject,
    text,
  };

  if (typeof customSender === 'function') {
    return customSender(mailOptions, payload);
  }

  const transporter = createDefaultTransport();
  return transporter.sendMail(mailOptions);
}

// Chưa cấu hình SMTP_HOST (và không có sender tùy chỉnh) thì chỉ giả lập bằng jsonTransport:
// email KHÔNG thực sự được gửi tới độc giả
function isSimulated() {
  return typeof customSender !== 'function' && !process.env.SMTP_HOST;
}

function setMailSender(fn) {
  customSender = fn;
}

function resetMailSender() {
  customSender = null;
}

module.exports = {
  sendReminderEmail,
  isSimulated,
  setMailSender,
  resetMailSender,
};
