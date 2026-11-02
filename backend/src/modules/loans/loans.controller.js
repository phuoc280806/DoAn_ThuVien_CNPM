const { matchedData } = require('express-validator');
const service = require('./loans.service');
const { ok, created } = require('../../utils/response');

async function eligibility(req, res) {
  ok(res, await service.eligibility(matchedData(req).readerCode));
}

async function create(req, res) {
  const ticket = await service.createLoan(matchedData(req, { locations: ['body'] }), { userId: req.user.userId });
  created(res, ticket, `Lập phiếu ${ticket.ticketCode} thành công`);
}

async function getById(req, res) {
  ok(res, await service.getTicket(matchedData(req).id));
}

async function listActive(req, res) {
  ok(res, await service.listActive(matchedData(req, { locations: ['query'] })));
}

async function renew(req, res) {
  const result = await service.renew(matchedData(req).id, { userId: req.user.userId });
  ok(res, result, `Gia hạn thành công, hạn trả mới là ${result.newDueDate}`);
}

module.exports = { eligibility, create, getById, listActive, renew };
