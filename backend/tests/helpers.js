// Dùng chung cho các file test. Test chạy trên database riêng thuvien_thpt_test,
// tạo lại từ schema.sql + seed.sql trước mỗi file, không đụng tới database chính.
require('dotenv').config({ quiet: true });
process.env.DB_NAME = 'thuvien_thpt_test';
process.env.JWT_SECRET ||= 'test-secret';

const { resetDatabase } = require('../scripts/db-reset');

const PASSWORD = 'Thuvien@2026';

async function startApp() {
  await resetDatabase(process.env.DB_NAME);

  const app = require('../src/app');
  const { pool } = require('../src/config/db');
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const baseUrl = `http://localhost:${server.address().port}/api`;

  async function api(method, path, { token, body } = {}) {
    const res = await fetch(baseUrl + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, body: await res.json() };
  }

  async function login(username, password = PASSWORD) {
    const res = await api('POST', '/auth/login', { body: { username, password } });
    if (res.status !== 200) throw new Error(`Không đăng nhập được ${username}: ${res.body.message}`);
    return res.body.data.token;
  }

  async function stop() {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }

  return { api, login, stop, pool };
}

module.exports = { startApp, PASSWORD };
