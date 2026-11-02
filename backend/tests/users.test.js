const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp, PASSWORD } = require('./helpers');

let t;
let admin;
before(async () => {
  t = await startApp();
  admin = await t.login('AD001');
});
after(async () => { await t.stop(); });

const userIdOf = async (username) => {
  const [[row]] = await t.pool.query('SELECT user_id FROM users WHERE username = ?', [username]);
  return row.user_id;
};

test('Phân quyền: Thủ thư và độc giả không vào được UC002', async () => {
  assert.equal((await t.api('GET', '/users')).status, 401);
  assert.equal((await t.api('GET', '/users', { token: await t.login('TT01') })).status, 403);
  assert.equal((await t.api('GET', '/users', { token: await t.login('HS2026001') })).status, 403);
});

test('UC002 bước 2–3: danh sách và tìm kiếm tài khoản', async () => {
  const all = await t.api('GET', '/users?pageSize=100', { token: admin });
  assert.equal(all.status, 200);
  assert.equal(all.body.data.total, 16);

  const found = await t.api('GET', '/users?keyword=Bùi', { token: admin });
  assert.deepEqual(found.body.data.items.map((u) => u.username).sort(), ['GV2026001', 'HS2026006']);

  const locked = await t.api('GET', '/users?status=LOCKED', { token: admin });
  assert.deepEqual(locked.body.data.items.map((u) => u.username), ['HS2026010']);

  assert.equal((await t.api('GET', '/users/9999', { token: admin })).status, 404);
});

test('UC002: tạo tài khoản Thủ thư; 7a dữ liệu sai; 7b trùng tên đăng nhập', async () => {
  const body = { username: 'TT03', password: 'Matkhau@123', role: 'LIBRARIAN', fullName: 'Lý Thu Hằng' };

  const res = await t.api('POST', '/users', { token: admin, body });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.role, 'LIBRARIAN');
  assert.ok(await t.login('TT03', 'Matkhau@123'));

  assert.equal((await t.api('POST', '/users', { token: admin, body })).body.message, 'Tên đăng nhập đã tồn tại');

  const shortPassword = await t.api('POST', '/users', { token: admin, body: { ...body, username: 'TT04', password: '123' } });
  assert.equal(shortPassword.status, 400);
  assert.equal(shortPassword.body.message, 'Mật khẩu tối thiểu 8 ký tự');

  const noName = await t.api('POST', '/users', { token: admin, body: { ...body, username: 'TT04', fullName: undefined } });
  assert.equal(noName.status, 400);
});

test('UC002: cấp tài khoản cho độc giả đã có hồ sơ', async () => {
  const res = await t.api('POST', '/users', {
    token: admin,
    body: { username: 'HS2026011', password: PASSWORD, role: 'READER' },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.fullName, 'Mai Phương Thảo');
  assert.equal(res.body.data.reader.readerCode, 'HS2026011');

  const me = await t.api('GET', '/auth/me', { token: await t.login('HS2026011') });
  assert.equal(me.body.data.reader.readerId, 14);

  const noProfile = await t.api('POST', '/users', { token: admin, body: { username: 'HS9999999', password: PASSWORD, role: 'READER' } });
  assert.equal(noProfile.status, 404);
});

test('UC002: khóa thì không đăng nhập được, mở khóa thì đăng nhập lại được', async () => {
  const id = await userIdOf('TT02');

  const lock = await t.api('PATCH', `/users/${id}/status`, { token: admin, body: { status: 'LOCKED' } });
  assert.equal(lock.status, 200);
  assert.equal(lock.body.data.status, 'LOCKED');
  const login = await t.api('POST', '/auth/login', { body: { username: 'TT02', password: PASSWORD } });
  assert.equal(login.status, 403);

  assert.equal((await t.api('PATCH', `/users/${id}/status`, { token: admin, body: { status: 'LOCKED' } })).status, 409);

  await t.api('PATCH', `/users/${id}/status`, { token: admin, body: { status: 'ACTIVE' } });
  assert.ok(await t.login('TT02'));
});

test('UC002: đặt lại mật khẩu', async () => {
  const id = await userIdOf('GV2026003');
  const res = await t.api('PATCH', `/users/${id}/password`, { token: admin, body: { password: 'MatKhauMoi@1' } });
  assert.equal(res.status, 200);
  assert.ok(await t.login('GV2026003', 'MatKhauMoi@1'));
  assert.equal((await t.api('POST', '/auth/login', { body: { username: 'GV2026003', password: PASSWORD } })).status, 401);
});

test('UC002: đổi vai trò chỉ giữa Thủ thư và Admin', async () => {
  const tt03 = await userIdOf('TT03');
  const toAdmin = await t.api('PATCH', `/users/${tt03}/role`, { token: admin, body: { role: 'ADMIN' } });
  assert.equal(toAdmin.status, 200);
  assert.equal(toAdmin.body.data.role, 'ADMIN');

  const reader = await userIdOf('HS2026001');
  const readerToStaff = await t.api('PATCH', `/users/${reader}/role`, { token: admin, body: { role: 'LIBRARIAN' } });
  assert.equal(readerToStaff.status, 409);
});

test('UC002 7c: không tự khóa / tự hạ vai trò, không khóa Admin cuối cùng', async () => {
  const ad001 = await userIdOf('AD001');
  const tt03 = await userIdOf('TT03');   // đã thành Admin ở test trước

  const selfLock = await t.api('PATCH', `/users/${ad001}/status`, { token: admin, body: { status: 'LOCKED' } });
  assert.equal(selfLock.status, 409);
  assert.equal(selfLock.body.message, 'Không thể khóa hoặc hạ vai trò chính tài khoản đang đăng nhập');
  assert.equal((await t.api('PATCH', `/users/${ad001}/role`, { token: admin, body: { role: 'LIBRARIAN' } })).status, 409);

  // TT03 (Admin) khóa AD001 → còn đúng 1 Admin hoạt động là TT03.
  // Token cũ của AD001 vẫn còn hạn, thử khóa TT03 → bị chặn vì TT03 là Admin cuối cùng.
  const tt03Token = await t.login('TT03', 'Matkhau@123');
  assert.equal((await t.api('PATCH', `/users/${ad001}/status`, { token: tt03Token, body: { status: 'LOCKED' } })).status, 200);
  const lastAdmin = await t.api('PATCH', `/users/${tt03}/status`, { token: admin, body: { status: 'LOCKED' } });
  assert.equal(lastAdmin.status, 409);
  assert.equal(lastAdmin.body.message, 'Không thể khóa hoặc hạ vai trò Admin duy nhất của hệ thống');
});

test('UC002 bước 8: mọi thao tác đều ghi audit_logs', async () => {
  const [rows] = await t.pool.query('SELECT action, COUNT(*) AS n FROM audit_logs GROUP BY action ORDER BY action');
  const counts = Object.fromEntries(rows.map((r) => [r.action, r.n]));
  assert.deepEqual(counts, { CHANGE_ROLE: 1, CREATE_USER: 2, LOCK_USER: 2, RESET_PASSWORD: 1, UNLOCK_USER: 1 });
});
