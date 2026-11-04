const mysql = require('mysql2/promise');
const dbSsl = require('./dbSsl');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: dbSsl(),
  waitForConnections: true,
  connectionLimit: 10,
  // Trả cột DATE / DATETIME dạng chuỗi 'YYYY-MM-DD' để không bị lệch ngày do múi giờ
  dateStrings: true,
  // SUM(), COUNT() ... trả về số thay vì chuỗi
  decimalNumbers: true,
});

// CURDATE(), NOW() trong SQL luôn theo giờ Việt Nam, không phụ thuộc cấu hình máy chủ MySQL
pool.on('connection', (conn) => {
  conn.query("SET time_zone = '+07:00'");
});

/**
 * Chạy nhiều câu lệnh trong một transaction.
 * Lỗi bất kỳ ở giữa chừng thì hoàn tác toàn bộ.
 *
 *   const loanId = await withTransaction(async (conn) => {
 *     const [r] = await conn.query('INSERT INTO loans ...');
 *     await conn.query('UPDATE book_copies ...');
 *     return r.insertId;
 *   });
 */
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, withTransaction };
