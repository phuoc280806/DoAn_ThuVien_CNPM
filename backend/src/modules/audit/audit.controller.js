const { matchedData } = require('express-validator');
const service = require('./audit.service');
const { ok } = require('../../utils/response');

async function list(req, res) {
  ok(res, await service.list(matchedData(req, { locations: ['query'] })));
}

module.exports = { list };
