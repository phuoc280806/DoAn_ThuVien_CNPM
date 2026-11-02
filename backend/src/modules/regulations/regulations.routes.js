const { Router } = require('express');
const { body, query } = require('express-validator');
const controller = require('./regulations.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');
const { todayVN } = require('../../utils/date');

// UC013 – Cấu hình quy định, UC014 – Xem nhật ký thay đổi quy định
const router = Router();
router.use(authenticate);

const adminOnly = authorize(ROLES.ADMIN);
const readerTypeRule = (chain) =>
  chain.isIn(['STUDENT', 'TEACHER']).withMessage('Loại độc giả phải là STUDENT hoặc TEACHER');

const intRule = (field, label, min, max) =>
  body(field)
    .isInt({ min, max }).withMessage(`${label} phải là số nguyên từ ${min} đến ${max}`)   // 6a
    .toInt();

const dateQuery = (field, label) =>
  query(field).optional().isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage(`${label} phải có dạng YYYY-MM-DD`);

// Quy định đang hiệu lực của một loại độc giả — Thủ thư cần khi lập phiếu (UC007)
router.get('/current', authorize(ROLES.LIBRARIAN), readerTypeRule(query('readerType')), validate, controller.current);

router.get('/', adminOnly, controller.overview);

// Bảng 2.39
router.post(
  '/',
  adminOnly,
  readerTypeRule(body('readerType')),
  intRule('maxBooks', 'Số sách tối đa', 1, 50),
  intRule('borrowDays', 'Số ngày mượn', 1, 365),
  intRule('finePerDay', 'Tiền phạt mỗi ngày', 0, 1000000),
  intRule('maxFinePerBook', 'Mức phạt tối đa mỗi cuốn', 0, 10000000)
    .custom((value, { req }) => value >= Number(req.body.finePerDay))
    .withMessage('Mức phạt tối đa mỗi cuốn phải lớn hơn hoặc bằng tiền phạt mỗi ngày'),
  intRule('renewDays', 'Số ngày gia hạn', 0, 365),
  body('effectiveFrom').isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage('Cần nhập ngày hiệu lực dạng YYYY-MM-DD'),
  validate,
  controller.create,
);

// Bảng 2.41
router.get(
  '/logs',
  adminOnly,
  dateQuery('from', 'Từ ngày'),
  dateQuery('to', 'Đến ngày').custom((to) => to <= todayVN()).withMessage('Đến ngày không được lớn hơn ngày hiện tại'),
  readerTypeRule(query('readerType').optional()),
  query('changedBy').optional().trim(),
  query('page').optional().isInt({ min: 1 }).withMessage('Trang không hợp lệ').toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Số dòng mỗi trang từ 1 đến 100').toInt(),
  validate,
  controller.listLogs,
);

module.exports = router;
