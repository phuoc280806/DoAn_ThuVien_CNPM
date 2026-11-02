require('dotenv').config({ quiet: true });

const app = require('./src/app');
const { pool } = require('./src/config/db');

const PORT = Number(process.env.PORT) || 5000;

app.listen(PORT, async () => {
  console.log(`Server đang chạy tại http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log(`Đã kết nối MySQL (database: ${process.env.DB_NAME})`);
  } catch (err) {
    console.error(`Không kết nối được MySQL: ${err.message}`);
  }
});
