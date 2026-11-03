const { matchedData } = require('express-validator');
const service = require('./reports.service');
const { ok } = require('../../utils/response');

async function loans(req, res) {
  const result = await service.loansReport(matchedData(req, { locations: ['query'] }));
  ok(res, result.data, result.message);
}

async function overdue(req, res) {
  const result = await service.overdueReport(matchedData(req, { locations: ['query'] }));
  ok(res, result.data, result.message);
}

async function fines(req, res) {
  const result = await service.finesReport(matchedData(req, { locations: ['query'] }));
  ok(res, result.data, result.message);
}

async function exportFile(req, res) {
  const { type, from, to, format } = matchedData(req);
  const { buffer, contentType, filename } = await service.exportReport(type, { from, to, format });
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(buffer);
}

module.exports = { loans, overdue, fines, exportFile };
