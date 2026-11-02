const { Router } = require('express');
const { param, query } = require('express-validator');
const controller = require('./fines.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');

// UC011 – Thu tiền phạt
const router = Router();
router.use(authenticate);

const librarianOnly = authorize(ROLES.LIBRARIAN);
const idParam = param('id').isInt({ min: 1 }).withMessage('Mã khoản phạt không hợp lệ').toInt();

router.get(
  '/',
  librarianOnly,
  query('readerCode').optional({ values: 'falsy' }).trim().toUpperCase(),
  query('status').optional().isIn(['UNPAID', 'PAID']).withMessage('Trạng thái phải là UNPAID hoặc PAID'),
  query('page').optional().isInt({ min: 1 }).withMessage('Trang không hợp lệ').toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Số dòng mỗi trang từ 1 đến 100').toInt(),
  validate,
  controller.list,
);

router.post('/:id/pay', librarianOnly, idParam, validate, controller.pay);

// Thủ thư hoặc chính độc giả có khoản phạt
router.get('/:id/receipt', idParam, validate, controller.receipt);

module.exports = router;
