const { Router } = require('express');
const { query } = require('express-validator');
const controller = require('./audit.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');

// Nhật ký hệ thống (audit_logs): chỉ Admin, chỉ đọc
const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));

const dateQuery = (field, label) =>
  query(field).optional({ values: 'falsy' }).isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage(`${label} phải có dạng YYYY-MM-DD`);

router.get(
  '/',
  query('action').optional({ values: 'falsy' }).trim().toUpperCase(),
  query('keyword').optional({ values: 'falsy' }).trim(),
  dateQuery('from', 'Từ ngày'),
  dateQuery('to', 'Đến ngày'),
  query('page').optional().isInt({ min: 1 }).withMessage('Trang không hợp lệ').toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Số dòng mỗi trang từ 1 đến 100').toInt(),
  validate,
  controller.list,
);

module.exports = router;
