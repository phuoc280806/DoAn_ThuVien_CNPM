const { matchedData } = require('express-validator');
const service = require('./me.service');
const { ok } = require('../../utils/response');

const viewerOf = (req) => ({ ...req.user, ip: req.ip });

async function history(req, res) {
  const { data, message } = await service.history(viewerOf(req), matchedData(req, { locations: ['query'] }));
  ok(res, data, message);
}

async function ticket(req, res) {
  ok(res, await service.ticket(viewerOf(req), matchedData(req).id));
}

module.exports = { history, ticket };
