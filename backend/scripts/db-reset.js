// Xóa và tạo lại database từ database/schema.sql, rồi nạp database/seed.sql.
// Chạy: npm run db:reset
require('dotenv').config({ quiet: true });

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const SQL_DIR = path.join(__dirname, '..', '..', 'database');
const DEFAULT_DB = 'thuvien_thpt';

/**
 * Tạo lại database. Truyền tên khác (ví dụ thuvien_thpt_test khi chạy test)
 * thì tên database trong các file SQL được thay tương ứng, không đụng tới database chính.
 */
async function resetDatabase(database = DEFAULT_DB) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  try {
    await conn.query("SET time_zone = '+07:00'");
    for (const file of ['schema.sql', 'seed.sql']) {
      const sql = fs.readFileSync(path.join(SQL_DIR, file), 'utf8').replaceAll(DEFAULT_DB, database);
      await conn.query(sql);
    }
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  resetDatabase()
    .then(() => console.log('Tạo lại database thành công (đã chạy schema.sql và seed.sql).'))
    .catch((err) => {
      console.error(`Lỗi: ${err.message}`);
      process.exit(1);
    });
}

module.exports = { resetDatabase };
