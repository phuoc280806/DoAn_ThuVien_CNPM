const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json());

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
