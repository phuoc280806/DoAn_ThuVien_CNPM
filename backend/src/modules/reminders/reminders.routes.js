const { Router } = require('express');
const { query } = require('express-validator');
const validate = require('../../middlewares/validate');
const { authenticate, authorize } = require('../../middlewares/auth');
const ROLES = require('../../constants/roles');
const controller = require('./reminders.controller');

const router = Router();

router.use(authenticate, authorize(ROLES.LIBRARIAN));

router.get(
  '/',
  query('status')
    .optional()
    .isIn(['DUE_SOON', 'OVERDUE', 'due_soon', 'overdue'])
    .withMessage('status chỉ nhận DUE_SOON hoặc OVERDUE'),
  validate,
  controller.list
);

router.get(
  '/logs',
  query('borrowDetailId').optional().isInt({ min: 1 }).withMessage('borrowDetailId không hợp lệ'),
  validate,
  controller.listLogs
);

router.post('/send', controller.send);
router.post('/', controller.send);

module.exports = router;
