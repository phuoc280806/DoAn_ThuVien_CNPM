// Xóa và tạo lại database từ database/schema.sql, rồi nạp database/seed.sql.
// Chạy: npm run db:reset
require('dotenv').config({ quiet: true });

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const SQL_DIR = path.join(__dirname, '..', '..', 'database');

async function main() {
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
      const sql = fs.readFileSync(path.join(SQL_DIR, file), 'utf8');
      await conn.query(sql);
      console.log(`Đã chạy ${file}`);
    }
    console.log('Tạo lại database thành công.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(`Lỗi: ${err.message}`);
  process.exit(1);
});
