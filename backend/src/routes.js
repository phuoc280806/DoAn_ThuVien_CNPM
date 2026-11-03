const { Router } = require('express');
const { pool } = require('./config/db');
const { ok } = require('./utils/response');

const router = Router();

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    ok(res, { server: 'ok', database: 'ok' });
  } catch (err) {
    res.status(503).json({
      success: false,
      data: { server: 'ok', database: 'error' },
      message: `Không kết nối được MySQL: ${err.message}`,
    });
  }
});

router.use('/auth', require('./modules/auth/auth.routes'));
router.use('/users', require('./modules/users/users.routes'));
router.use('/readers', require('./modules/readers/readers.routes'));
router.use('/categories', require('./modules/books/categories.routes'));
router.use('/books', require('./modules/books/books.routes'));
router.use('/copies', require('./modules/copies/copies.routes'));
router.use('/regulations', require('./modules/regulations/regulations.routes'));
router.use('/loans', require('./modules/loans/loans.routes'));
router.use('/returns', require('./modules/returns/returns.routes'));
router.use('/fines', require('./modules/fines/fines.routes'));
router.use('/me', require('./modules/readers/me.routes'));
router.use('/reports', require('./modules/reports/reports.routes'));
router.use('/reminders', require('./modules/reminders/reminders.routes'));

module.exports = router;
