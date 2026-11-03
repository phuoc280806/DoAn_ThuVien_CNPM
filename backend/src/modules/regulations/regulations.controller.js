const { matchedData } = require('express-validator');
const service = require('./regulations.service');
const { ok, created } = require('../../utils/response');

async function overview(req, res) {
  ok(res, await service.overview());
}

async function current(req, res) {
  ok(res, await service.getEffective(matchedData(req).readerType));
}

async function create(req, res) {
  const regulation = await service.create(matchedData(req, { locations: ['body'] }), { userId: req.user.userId });
  created(res, regulation,
    `Đã lưu quy định mới. Quy định chỉ áp dụng cho phiếu lập từ ngày ${regulation.effectiveFrom} trở đi`);
}

async function listLogs(req, res) {
  ok(res, await service.listLogs(matchedData(req, { locations: ['query'] })));
}

async function previewActiveLoans(req, res) {
  const result = await service.previewActiveLoans(matchedData(req, { locations: ['body'] }));
  ok(res, result);
}

async function applyActiveLoans(req, res) {
  const result = await service.applyActiveLoans(
    matchedData(req, { locations: ['body'] }),
    { userId: req.user.userId },
  );
  ok(res, result, `Đã áp dụng quy định mới cho ${result.affectedTickets} phiếu đang mượn`);
}

module.exports = {
  overview,
  current,
  create,
  listLogs,
  previewActiveLoans,
  applyActiveLoans,
};
