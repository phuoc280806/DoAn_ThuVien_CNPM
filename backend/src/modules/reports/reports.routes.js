const { Router } = require('express');
const { param, query } = require('express-validator');
const controller = require('./reports.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');

// UC016 – Báo cáo thống kê: Thủ thư và Admin (Admin tự động kế thừa quyền Thủ thư)
const router = Router();
router.use(authenticate, authorize(ROLES.LIBRARIAN));

// Bảng 2.46: Từ ngày, Đến ngày bắt buộc; điều kiện 6a kiểm tra trong service
const dateRule = (field, label) =>
  query(field).isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage(`Cần nhập ${label} dạng YYYY-MM-DD`);
const periodRules = [dateRule('from', 'từ ngày'), dateRule('to', 'đến ngày')];

router.get('/loans', ...periodRules, validate, controller.loans);
router.get('/overdue', ...periodRules, validate, controller.overdue);
router.get('/fines', ...periodRules, validate, controller.fines);

router.get(
  '/:type/export',
  param('type').isIn(['loans', 'overdue', 'fines']).withMessage('Loại báo cáo phải là loans, overdue hoặc fines'),
  ...periodRules,
  query('format').isIn(['xlsx', 'pdf']).withMessage('Định dạng xuất phải là xlsx hoặc pdf'),
  validate,
  controller.exportFile,
);

module.exports = router;
