const { matchedData } = require('express-validator');
const service = require('./readers.service');
const { ok, created } = require('../../utils/response');

async function list(req, res) {
  const data = await service.list(matchedData(req, { locations: ['query'] }));
  ok(res, data, data.items.length === 0 ? 'Không tìm thấy độc giả' : undefined);
}

async function getById(req, res) {
  ok(res, await service.getById(matchedData(req).id));
}

async function create(req, res) {
  created(res, await service.create(matchedData(req, { locations: ['body'] })), 'Thêm hồ sơ độc giả thành công');
}

async function update(req, res) {
  const { id, ...data } = matchedData(req);
  ok(res, await service.update(id, data), 'Cập nhật hồ sơ độc giả thành công');
}

async function issueCard(req, res) {
  const { id, ...data } = matchedData(req);
  created(res, await service.issueCard(id, data), 'Cấp thẻ thư viện thành công');
}

async function renewCard(req, res) {
  const { id, expiryDate } = matchedData(req);
  ok(res, await service.renewCard(id, expiryDate), 'Gia hạn thẻ thành công');
}

async function setCardStatus(req, res) {
  const { id, status } = matchedData(req);
  ok(res, await service.setCardStatus(id, status), status === 'LOCKED' ? 'Đã khóa thẻ' : 'Đã mở khóa thẻ');
}

module.exports = { list, getById, create, update, issueCard, renewCard, setCardStatus };
