const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, PASSWORD } = require('./helpers');

let t;
before(async () => { t = await startApp(); });
after(async () => { await t.stop(); });

test('UC001 5a: thiếu tên đăng nhập hoặc mật khẩu', async () => {
  const res = await t.api('POST', '/auth/login', { body: { username: 'AD001' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.message, 'Cần nhập đầy đủ tên đăng nhập và mật khẩu');
});

test('UC001 6a: sai mật khẩu và sai tên đăng nhập báo cùng một câu', async () => {
  const wrongPassword = await t.api('POST', '/auth/login', { body: { username: 'AD001', password: 'sai-mat-khau' } });
  const wrongUsername = await t.api('POST', '/auth/login', { body: { username: 'KHONGCO', password: PASSWORD } });
  assert.equal(wrongPassword.status, 401);
  assert.equal(wrongUsername.status, 401);
  assert.equal(wrongPassword.body.message, 'Tên đăng nhập hoặc mật khẩu chưa đúng');
  assert.equal(wrongUsername.body.message, wrongPassword.body.message);
});

test('UC001 7a: tài khoản bị khóa không đăng nhập được', async () => {
  const res = await t.api('POST', '/auth/login', { body: { username: 'HS2026010', password: PASSWORD } });
  assert.equal(res.status, 403);
  assert.equal(res.body.message, 'Tài khoản đã bị khóa, vui lòng liên hệ Admin');
});

test('UC001: đăng nhập thành công trả token và vai trò, không trả mật khẩu', async () => {
  const admin = await t.api('POST', '/auth/login', { body: { username: 'AD001', password: PASSWORD } });
  assert.equal(admin.status, 200);
  assert.ok(admin.body.data.token);
  assert.equal(admin.body.data.user.role, 'ADMIN');
  assert.equal(admin.body.data.user.reader, null);
  assert.equal(admin.body.data.user.password_hash, undefined);

  const reader = await t.api('POST', '/auth/login', { body: { username: 'HS2026001', password: PASSWORD } });
  assert.equal(reader.body.data.user.role, 'READER');
  assert.deepEqual(reader.body.data.user.reader, { readerId: 1, readerCode: 'HS2026001', readerType: 'STUDENT' });
});

test('/auth/me: cần token hợp lệ', async () => {
  assert.equal((await t.api('GET', '/auth/me')).status, 401);
  assert.equal((await t.api('GET', '/auth/me', { token: 'token-gia' })).status, 401);

  const token = await t.login('TT01');
  const res = await t.api('GET', '/auth/me', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.username, 'TT01');
  assert.equal(res.body.data.role, 'LIBRARIAN');
});

test('UC001 9b: đăng xuất', async () => {
  const token = await t.login('HS2026001');
  const res = await t.api('POST', '/auth/logout', { token });
  assert.equal(res.status, 200);
});
