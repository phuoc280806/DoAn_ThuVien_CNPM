const { matchedData } = require('express-validator');
const service = require('./auth.service');
const { ok } = require('../../utils/response');

async function login(req, res) {
  const { username, password } = matchedData(req);
  ok(res, await service.login(username, password), 'Đăng nhập thành công');
}

// JWT không lưu phía server: client xóa token là kết thúc phiên (UC001 9b)
async function logout(req, res) {
  ok(res, null, 'Đăng xuất thành công');
}

async function me(req, res) {
  ok(res, await service.me(req.user.userId));
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = matchedData(req);
  await service.changePassword(req.user.userId, currentPassword, newPassword, req.ip);
  ok(res, null, 'Đổi mật khẩu thành công');
}

module.exports = { login, logout, me, changePassword };
