// Bỏ dấu gạch và khoảng trắng: "978-604-300-053-5" → "9786043000535"
function normalizeIsbn(value) {
  return String(value ?? '').replace(/[-\s]/g, '');
}

// ISBN-13 hợp lệ: 13 chữ số, chữ số cuối là số kiểm tra (trọng số 1, 3 xen kẽ)
function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(isbn[i]) * (i % 2 ? 3 : 1);
  return (10 - (sum % 10)) % 10 === Number(isbn[12]);
}

module.exports = { normalizeIsbn, isValidIsbn13 };
