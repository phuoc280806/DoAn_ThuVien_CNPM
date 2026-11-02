const { Router } = require('express');
const { body, param, query } = require('express-validator');
const controller = require('./users.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');

// UC002 – Quản lý tài khoản & phân quyền: chỉ Admin
const router = Router();
router.use(authenticate, authorize(ROLES.ADMIN));

const idParam = param('id').isInt({ min: 1 }).withMessage('Mã tài khoản không hợp lệ').toInt();

const passwordRule = (field) =>
  body(field)
    .isString().withMessage('Cần nhập mật khẩu')
    .isLength({ min: 8 }).withMessage('Mật khẩu tối thiểu 8 ký tự');

const roleRule = body('role')
  .isIn(Object.values(ROLES))
  .withMessage('Vai trò phải là một trong: READER, LIBRARIAN, ADMIN');

router.get(
  '/',
  query('keyword').optional().trim(),
  query('role').optional().isIn(Object.values(ROLES)).withMessage('Vai trò không hợp lệ'),
  query('status').optional().isIn(['ACTIVE', 'LOCKED']).withMessage('Trạng thái không hợp lệ'),
  query('page').optional().isInt({ min: 1 }).withMessage('Trang không hợp lệ').toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Số dòng mỗi trang từ 1 đến 100').toInt(),
  validate,
  controller.list,
);

router.get('/:id', idParam, validate, controller.getById);

router.post(
  '/',
  body('username')
    .trim()
    .notEmpty().withMessage('Cần nhập tên đăng nhập')
    .isLength({ max: 50 }).withMessage('Tên đăng nhập tối đa 50 ký tự')
    .matches(/^[A-Za-z0-9._-]+$/).withMessage('Tên đăng nhập chỉ gồm chữ không dấu, số và . _ -'),
  passwordRule('password'),
  roleRule,
  body('fullName').optional().trim().isLength({ max: 100 }).withMessage('Họ tên tối đa 100 ký tự'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Email không đúng định dạng'),
  body('phone').optional({ values: 'falsy' }).trim().matches(/^[0-9+ ]{8,20}$/).withMessage('Số điện thoại không hợp lệ'),
  validate,
  controller.create,
);

router.patch(
  '/:id/status',
  idParam,
  body('status').isIn(['ACTIVE', 'LOCKED']).withMessage('Trạng thái phải là ACTIVE hoặc LOCKED'),
  validate,
  controller.setStatus,
);

router.patch('/:id/password', idParam, passwordRule('password'), validate, controller.resetPassword);

router.patch('/:id/role', idParam, roleRule, validate, controller.changeRole);

module.exports = router;
