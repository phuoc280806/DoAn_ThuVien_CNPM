const { matchedData } = require('express-validator');
const service = require('./users.service');
const { ok, created } = require('../../utils/response');

// Người thực hiện thao tác, dùng để kiểm tra 7c và ghi audit_logs
const actorOf = (req) => ({ userId: req.user.userId, ip: req.ip });

async function list(req, res) {
  ok(res, await service.list(matchedData(req, { locations: ['query'] })));
}

async function getById(req, res) {
  ok(res, await service.getById(matchedData(req).id));
}

async function create(req, res) {
  const user = await service.create(matchedData(req, { locations: ['body'] }), actorOf(req));
  created(res, user, 'Tạo tài khoản thành công');
}

async function setStatus(req, res) {
  const { id, status } = matchedData(req);
  const user = await service.setStatus(id, status, actorOf(req));
  ok(res, user, status === 'LOCKED' ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
}

async function resetPassword(req, res) {
  const { id, password } = matchedData(req);
  ok(res, await service.resetPassword(id, password, actorOf(req)), 'Đặt lại mật khẩu thành công');
}

async function changeRole(req, res) {
  const { id, role } = matchedData(req);
  ok(res, await service.changeRole(id, role, actorOf(req)), 'Đổi vai trò thành công');
}

module.exports = { list, getById, create, setStatus, resetPassword, changeRole };
