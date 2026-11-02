const { Router } = require('express');
const { param, query } = require('express-validator');
const controller = require('./me.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');
const { todayVN } = require('../../utils/date');

// UC012 – Xem lịch sử mượn/trả & khoản phạt: chỉ độc giả, chỉ dữ liệu của chính mình
const router = Router();
router.use(authenticate, authorize(ROLES.READER));

const dateQuery = (field, label) =>
  query(field).optional({ values: 'falsy' }).isDate({ format: 'YYYY-MM-DD', strictMode: true })
    .withMessage(`${label} phải có dạng YYYY-MM-DD`);

// Bảng 2.37
router.get(
  '/loans',
  dateQuery('from', 'Từ ngày'),
  dateQuery('to', 'Đến ngày').custom((to) => to <= todayVN()).withMessage('Đến ngày không được lớn hơn ngày hiện tại'),
  query('status').optional({ values: 'falsy' }).isIn(['BORROWING', 'OVERDUE', 'RETURNED'])
    .withMessage('Trạng thái phải là BORROWING, OVERDUE hoặc RETURNED'),
  validate,
  controller.history,
);

router.get(
  '/loans/:id',
  param('id').isInt({ min: 1 }).withMessage('Mã phiếu không hợp lệ').toInt(),
  validate,
  controller.ticket,
);

module.exports = router;
