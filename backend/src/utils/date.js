// Ngày tháng dạng chuỗi 'YYYY-MM-DD' (giống cách mysql2 trả cột DATE với dateStrings: true),
// nên so sánh trực tiếp bằng < > được.

// Ngày hiện tại theo giờ Việt Nam, không phụ thuộc múi giờ của máy chạy server
function todayVN() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}

module.exports = { todayVN };
