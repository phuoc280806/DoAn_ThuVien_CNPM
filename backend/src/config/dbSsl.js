/**
 * Tùy chọn SSL khi kết nối MySQL online (DB_SSL=true, DB_CA là nội dung chứng chỉ CA).
 * Chạy local thì để trống DB_SSL, kết nối như bình thường.
 */
function dbSsl() {
  return process.env.DB_SSL === 'true' ? { ca: process.env.DB_CA } : undefined;
}

module.exports = dbSsl;
