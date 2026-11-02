const { Router } = require('express');
const { body, param } = require('express-validator');
const controller = require('./returns.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');

// UC009 – Trả sách (include UC010 – Tính tiền phạt): Thủ thư (và Admin)
const router = Router();
router.use(authenticate, authorize(ROLES.LIBRARIAN));

const copyCode = (chain) => chain.trim().toUpperCase().notEmpty().withMessage('Cần nhập mã bản sách');

router.get('/lookup/:copyCode', copyCode(param('copyCode')), validate, controller.lookup);

// Bảng 2.30
router.post(
  '/',
  copyCode(body('copyCode')),
  body('condition').isIn(['GOOD', 'DAMAGED', 'LOST']).withMessage('Tình trạng sách phải là GOOD, DAMAGED hoặc LOST'),
  body('note').optional({ values: 'falsy' }).isString().trim().isLength({ max: 255 }).withMessage('Ghi chú tối đa 255 ký tự'),
  validate,
  controller.returnCopy,
);

module.exports = router;
