const { Router } = require('express');
const { body, param, query } = require('express-validator');
const controller = require('./loans.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');

// UC007 – Lập phiếu mượn, UC008 – Gia hạn mượn: Thủ thư (và Admin). Độc giả không tự mượn (GĐ05).
const router = Router();
router.use(authenticate, authorize(ROLES.LIBRARIAN));

const code = (chain, message) => chain.trim().toUpperCase().notEmpty().withMessage(message);

// UC007 bước 3–6
router.get(
  '/eligibility/:readerCode',
  code(param('readerCode'), 'Cần nhập mã độc giả'),
  validate,
  controller.eligibility,
);

// UC008 bước 3–4: theo mã độc giả hoặc mã bản sách
router.get(
  '/active',
  query('readerCode').optional({ values: 'falsy' }).trim().toUpperCase(),
  query('copyCode').optional({ values: 'falsy' }).trim().toUpperCase(),
  validate,
  controller.listActive,
);

// UC007 bước 7–13 (Bảng 2.25)
router.post(
  '/',
  code(body('readerCode'), 'Cần nhập mã độc giả'),
  body('copyCodes')
    .isArray({ min: 1 }).withMessage('Chưa chọn bản sách nào')   // 9b
    .isArray({ max: 20 }).withMessage('Mỗi phiếu tối đa 20 bản sách'),
  code(body('copyCodes.*'), 'Mã bản sách không được để trống'),
  body('copyCodes').custom((codes) => {
    const seen = new Set();
    for (const c of codes) {
      if (seen.has(c)) throw new Error(`Bản sách ${c} bị chọn trùng`);
      seen.add(c);
    }
    return true;
  }),
  validate,
  controller.create,
);

router.get('/:id', param('id').isInt({ min: 1 }).withMessage('Mã phiếu không hợp lệ').toInt(), validate, controller.getById);

// UC008 bước 8–10: gia hạn một cuốn trong phiếu
router.post(
  '/items/:id/renew',
  param('id').isInt({ min: 1 }).withMessage('Mã chi tiết phiếu không hợp lệ').toInt(),
  validate,
  controller.renew,
);

module.exports = router;
