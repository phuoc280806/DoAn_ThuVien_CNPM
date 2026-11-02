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

// Gắn route của từng module tại đây, ví dụ:
// router.use('/auth', require('./modules/auth/auth.routes'));

module.exports = router;
