const { matchedData } = require('express-validator');
const service = require('./returns.service');
const { ok } = require('../../utils/response');

async function lookup(req, res) {
  ok(res, await service.lookup(matchedData(req).copyCode));
}

async function returnCopy(req, res) {
  const result = await service.returnCopy(matchedData(req, { locations: ['body'] }), { userId: req.user.userId });
  ok(res, result, service.returnMessage(result));
}

module.exports = { lookup, returnCopy };
