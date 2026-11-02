const { Router } = require('express');
const { body } = require('express-validator');
const controller = require('./auth.controller');
const { authenticate } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');

// UC001 – Đăng nhập / đăng xuất
const router = Router();

const MISSING = 'Cần nhập đầy đủ tên đăng nhập và mật khẩu';

router.post(
  '/login',
  body('username').isString().withMessage(MISSING).trim().notEmpty().withMessage(MISSING),
  body('password').isString().withMessage(MISSING).notEmpty().withMessage(MISSING),
  validate,
  controller.login,
);

router.post('/logout', authenticate, controller.logout);

router.get('/me', authenticate, controller.me);

module.exports = router;
