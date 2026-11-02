const { Router } = require('express');
const { body, param, query } = require('express-validator');
const controller = require('./readers.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');
const { todayVN } = require('../../utils/date');

// UC003 – Quản lý hồ sơ độc giả & thẻ thư viện: Thủ thư (và Admin)
const router = Router();
router.use(authenticate, authorize(ROLES.LIBRARIAN));

const idParam = param('id').isInt({ min: 1 }).withMessage('Mã độc giả không hợp lệ').toInt();

const dateRule = (field, message) =>
  body(field).isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage(message);

// Các trường hồ sơ dùng chung cho thêm và sửa (Bảng 2.17)
const profileRules = [
  body('fullName')
    .isString().withMessage('Cần nhập họ và tên')
    .trim()
    .notEmpty().withMessage('Cần nhập họ và tên')
    .isLength({ max: 100 }).withMessage('Họ tên tối đa 100 ký tự'),
  body('readerType').isIn(['STUDENT', 'TEACHER']).withMessage('Vai trò độc giả phải là STUDENT hoặc TEACHER'),
  body('className').optional({ values: 'falsy' }).trim().isLength({ max: 20 }).withMessage('Lớp tối đa 20 ký tự'),
  body('department').optional({ values: 'falsy' }).trim().isLength({ max: 50 }).withMessage('Tổ bộ môn tối đa 50 ký tự'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Email không đúng định dạng'),
  body('dateOfBirth')
    .optional({ values: 'falsy' })
    .isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage('Ngày sinh phải có dạng YYYY-MM-DD')
    .custom((value) => value < todayVN()).withMessage('Ngày sinh phải trước ngày hôm nay'),
];

router.get(
  '/',
  query('keyword').optional().trim(),
  query('readerType').optional().isIn(['STUDENT', 'TEACHER']).withMessage('Loại độc giả không hợp lệ'),
  query('page').optional().isInt({ min: 1 }).withMessage('Trang không hợp lệ').toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Số dòng mỗi trang từ 1 đến 100').toInt(),
  validate,
  controller.list,
);

router.get('/:id', idParam, validate, controller.getById);

router.post(
  '/',
  body('readerCode')
    .isString().withMessage('Cần nhập mã độc giả')
    .trim()
    .notEmpty().withMessage('Cần nhập mã độc giả')
    .matches(/^[A-Za-z0-9]{3,20}$/).withMessage('Mã độc giả gồm 3–20 chữ cái không dấu hoặc chữ số')
    .toUpperCase(),
  ...profileRules,
  validate,
  controller.create,
);

// Mã độc giả không có trong danh sách rule nên không sửa được
router.put('/:id', idParam, ...profileRules, validate, controller.update);

router.post(
  '/:id/card',
  idParam,
  body('issuedDate').optional().isDate({ format: 'YYYY-MM-DD', strictMode: true }).withMessage('Ngày cấp thẻ phải có dạng YYYY-MM-DD'),
  dateRule('expiryDate', 'Cần nhập ngày hết hạn thẻ dạng YYYY-MM-DD'),
  validate,
  controller.issueCard,
);

router.patch('/:id/card/expiry', idParam, dateRule('expiryDate', 'Cần nhập ngày hết hạn mới dạng YYYY-MM-DD'), validate, controller.renewCard);

router.patch(
  '/:id/card/status',
  idParam,
  body('status').isIn(['ACTIVE', 'LOCKED']).withMessage('Trạng thái thẻ phải là ACTIVE hoặc LOCKED'),
  validate,
  controller.setCardStatus,
);

module.exports = router;
