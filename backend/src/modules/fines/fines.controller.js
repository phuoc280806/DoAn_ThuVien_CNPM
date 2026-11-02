const { matchedData } = require('express-validator');
const service = require('./fines.service');
const { ok } = require('../../utils/response');

async function list(req, res) {
  ok(res, await service.list(matchedData(req, { locations: ['query'] })));
}

async function pay(req, res) {
  const result = await service.pay(matchedData(req).id, { userId: req.user.userId });
  ok(res, result, service.payMessage(result));
}

async function receipt(req, res) {
  ok(res, await service.receipt(matchedData(req).id, { ...req.user, ip: req.ip }));
}

module.exports = { list, pay, receipt };
