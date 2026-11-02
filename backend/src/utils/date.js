// Ngày tháng dạng chuỗi 'YYYY-MM-DD' (giống cách mysql2 trả cột DATE với dateStrings: true),
// nên so sánh trực tiếp bằng < > được.

// Ngày hiện tại theo giờ Việt Nam, không phụ thuộc múi giờ của máy chạy server
function todayVN() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

// Cộng (hoặc trừ) số ngày: addDays('2026-11-02', 7) → '2026-11-09'
function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

module.exports = { todayVN, addDays };
