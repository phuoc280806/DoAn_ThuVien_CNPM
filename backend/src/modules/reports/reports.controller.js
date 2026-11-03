const service = require('./reports.service');
const { ok } = require('../../utils/response');

async function loans(req, res) {
  const result = await service.loansReport({ from: req.query.from, to: req.query.to });
  ok(res, result.data, result.message);
}

async function overdue(req, res) {
  const result = await service.overdueReport({ from: req.query.from, to: req.query.to });
  ok(res, result.data, result.message);
}

async function fines(req, res) {
  const result = await service.finesReport({ from: req.query.from, to: req.query.to });
  ok(res, result.data, result.message);
}

async function exportFile(req, res) {
  const { buffer, contentType, filename } = await service.exportReport(req.params.type, {
    from: req.query.from,
    to: req.query.to,
    format: req.query.format,
  });
  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(buffer);
}

module.exports = { loans, overdue, fines, exportFile };

