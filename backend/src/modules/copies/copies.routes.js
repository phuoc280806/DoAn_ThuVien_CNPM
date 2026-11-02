const { Router } = require('express');
const { body, param } = require('express-validator');
const controller = require('./copies.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');

// UC005 – Quản lý trạng thái bản sách: Thủ thư (và Admin)
const router = Router();
router.use(authenticate, authorize(ROLES.LIBRARIAN));

router.get(
  '/code/:code',
  param('code').trim().toUpperCase().notEmpty().withMessage('Cần nhập mã bản sách'),
  validate,
  controller.getByCode,
);

router.patch(
  '/:id/status',
  param('id').isInt({ min: 1 }).withMessage('Mã bản sách không hợp lệ').toInt(),
  body('status')
    .isIn(['AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST'])
    .withMessage('Trạng thái phải là một trong: Khả dụng, Đang mượn, Hư hỏng hoặc Mất'),   // UC005 11c
  body('reason').optional({ values: 'falsy' }).isString().trim().isLength({ max: 255 }).withMessage('Lý do tối đa 255 ký tự'),
  validate,
  controller.changeStatus,
);

module.exports = router;
