// 3000 → "3.000đ"
function formatVND(amount) {
  return `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
}

// Mã hiển thị sinh từ id, không lưu trong database: ticketCode(9) → "PM000009"
const pad = (prefix, id) => `${prefix}${String(id).padStart(6, '0')}`;
const ticketCode = (borrowId) => pad('PM', borrowId);
const receiptCode = (fineId) => pad('BL', fineId);

module.exports = { formatVND, ticketCode, receiptCode };
