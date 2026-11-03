// Định dạng hiển thị. Backend trả ngày dạng 'YYYY-MM-DD' và ngày giờ dạng 'YYYY-MM-DD HH:mm:ss'.

const pad = (n) => String(n).padStart(2, '0');

// '2026-11-03' hoặc '2026-11-03 14:05:00' → '03/11/2026'
export function formatDate(value) {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : String(value);
}

// '2026-11-03 14:05:00' → '03/11/2026 14:05'
export function formatDateTime(value) {
  if (!value) return '';
  const text = String(value).replace('T', ' ');
  const time = text.slice(11, 16);
  return time ? `${formatDate(text)} ${time}` : formatDate(text);
}

// 1000 → '1.000đ'
export function formatMoney(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  return `${new Intl.NumberFormat('vi-VN').format(Number(amount))}đ`;
}

// Ngày hôm nay theo giờ Việt Nam dạng 'YYYY-MM-DD' (giống backend utils/date.js)
export function todayVN() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

// Cộng (trừ) số ngày: addDays('2026-11-03', 7) → '2026-11-10'
export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Số ngày từ `from` đến `to`: diffDays('2026-11-03', '2026-11-10') → 7
export function diffDays(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);
}

// '2026-11-03' → 'Thứ Ba, 03/11/2026'
export function formatLongDate(value) {
  const [y, m, d] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'UTC' }).format(date);
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${pad(d)}/${pad(m)}/${y}`;
}

// 'Nguyễn Văn Quản' → 'VQ' (2 chữ cái đầu của 2 từ cuối)
export function initialsOf(fullName) {
  const words = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((w) => w[0].toUpperCase()).join('');
}
