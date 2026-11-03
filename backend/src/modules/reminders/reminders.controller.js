const { ok } = require('../../utils/response');
const service = require('./reminders.service');

async function list(req, res) {
  const { data, message } = await service.list(req.query);
  return ok(res, data, message);
}

async function send(req, res) {
  const data = await service.send(req.body, req.user);
  return ok(res, data, 'Gửi email nhắc hạn trả thành công');
}

async function listLogs(req, res) {
  const data = await service.listLogs(req.query);
  return ok(res, data);
}

module.exports = {
  list,
  send,
  listLogs,
};

