// 3000 → "3.000đ"
function formatVND(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

// '2026-11-17' → "17/11/2026"
function formatDateVN(date) {
  const [y, m, d] = String(date).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

// Mã hiển thị sinh từ id, không lưu trong database: ticketCode(9) → "PM000009"
const pad = (prefix, id) => `${prefix}${String(id).padStart(6, '0')}`;
const ticketCode = (borrowId) => pad('PM', borrowId);
const receiptCode = (fineId) => pad('BL', fineId);

module.exports = { formatVND, formatDateVN, ticketCode, receiptCode };
