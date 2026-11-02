const { matchedData } = require('express-validator');
const service = require('./copies.service');
const { ok } = require('../../utils/response');

async function getByCode(req, res) {
  ok(res, await service.getByCode(matchedData(req).code));
}

async function changeStatus(req, res) {
  const { id, ...data } = matchedData(req);
  ok(res, await service.changeStatus(id, data, { userId: req.user.userId }), 'Cập nhật trạng thái bản sách thành công');
}

module.exports = { getByCode, changeStatus };
