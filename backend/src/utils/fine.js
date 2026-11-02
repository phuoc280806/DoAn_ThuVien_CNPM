const AppError = require('./AppError');
const { diffDays } = require('./date');

/**
 * UC010 – Tính tiền phạt trả trễ theo SNAPSHOT của phiếu (không dùng quy định hiện hành):
 *
 *   d = max(0, ngày trả − hạn trả)
 *   F = min(d × p × n ; T × n)
 *
 * p: phạt/ngày, T: mức phạt tối đa mỗi cuốn, n: số cuốn trễ (trả từng cuốn nên thường n = 1, GĐ08).
 * Ngày dạng 'YYYY-MM-DD'.
 */
function calculateFine({ dueDate, returnDate, finePerDay, maxFinePerBook, books = 1 }) {
  if (finePerDay == null || maxFinePerBook == null || !dueDate) {
    throw new AppError(500, 'Phiếu thiếu thông số quy định');   // 2a
  }
  const lateDays = Math.max(0, diffDays(dueDate, returnDate));
  if (lateDays === 0) return { lateDays: 0, amount: 0 };       // 3a: trả đúng hạn hoặc sớm
  return {
    lateDays,
    amount: Math.min(lateDays * finePerDay * books, maxFinePerBook * books),
  };
}

module.exports = { calculateFine };
