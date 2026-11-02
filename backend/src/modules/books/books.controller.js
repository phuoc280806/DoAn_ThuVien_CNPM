const { matchedData } = require('express-validator');
const service = require('./books.service');
const { ok, created } = require('../../utils/response');

async function listCategories(req, res) {
  ok(res, await service.listCategories());
}

async function list(req, res) {
  ok(res, await service.list(matchedData(req, { locations: ['query'] }), req.user));
}

async function getById(req, res) {
  ok(res, await service.getById(matchedData(req).id, req.user));
}

async function create(req, res) {
  created(res, await service.create(matchedData(req, { locations: ['body'] })), 'Thêm đầu sách thành công');
}

async function update(req, res) {
  const { id, ...data } = matchedData(req);
  ok(res, await service.update(id, data), 'Cập nhật đầu sách thành công');
}

async function remove(req, res) {
  const result = await service.remove(matchedData(req).id);
  ok(res, result, result.deleted
    ? 'Đã xóa đầu sách'
    : 'Đầu sách đã có lịch sử mượn nên được ẩn thay vì xóa');
}

async function setHidden(req, res) {
  const { id, hidden } = matchedData(req);
  ok(res, await service.setHidden(id, hidden), hidden ? 'Đã ẩn đầu sách' : 'Đã hiện lại đầu sách');
}

async function listCopies(req, res) {
  ok(res, await service.listCopies(matchedData(req).id));
}

async function addCopies(req, res) {
  const { id, ...data } = matchedData(req);
  created(res, await service.addCopies(id, data), `Đã nhập thêm ${data.quantity} bản sách`);
}

module.exports = { listCategories, list, getById, create, update, remove, setHidden, listCopies, addCopies };
