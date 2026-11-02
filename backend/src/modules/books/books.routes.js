const { Router } = require('express');
const { body, param, query } = require('express-validator');
const controller = require('./books.controller');
const { authenticate, authorize } = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const ROLES = require('../../constants/roles');
const { todayVN } = require('../../utils/date');
const { normalizeIsbn, isValidIsbn13 } = require('../../utils/isbn');

// UC004 – Quản lý đầu sách, UC006 – Tra cứu sách
const router = Router();
router.use(authenticate);

const librarianOnly = authorize(ROLES.LIBRARIAN);
const idParam = param('id').isInt({ min: 1 }).withMessage('Mã đầu sách không hợp lệ').toInt();

const requiredText = (field, label, max) =>
  body(field)
    .isString().withMessage(`Cần nhập ${label}`)
    .trim()
    .notEmpty().withMessage(`Cần nhập ${label}`)
    .isLength({ max }).withMessage(`${label[0].toUpperCase()}${label.slice(1)} tối đa ${max} ký tự`);

// Thông tin đầu sách (Bảng 2.19)
const bookRules = [
  body('isbn')
    .customSanitizer(normalizeIsbn)
    .notEmpty().withMessage('Cần nhập ISBN')
    .custom(isValidIsbn13).withMessage('ISBN không đúng định dạng ISBN-13'),
  requiredText('title', 'tên sách', 255),
  requiredText('author', 'tác giả', 150),
  requiredText('publisher', 'nhà xuất bản', 150),
  body('publishYear')
    .isInt({ min: 1000 }).withMessage('Năm xuất bản phải là số nguyên dương')
    .toInt()
    .custom((year) => year <= Number(todayVN().slice(0, 4))).withMessage('Năm xuất bản không được vượt quá năm hiện tại'),
  body('categoryId').isInt({ min: 1 }).withMessage('Cần chọn thể loại').toInt(),
  body('description').optional({ values: 'null' }).isString().trim(),
];

const copiesRules = (field, required) => [
  (required ? body(field) : body(field).optional())
    .isInt({ min: required ? 1 : 0, max: 100 }).withMessage(`Số bản sách từ ${required ? 1 : 0} đến 100`)
    .toInt(),
  body('location').optional({ values: 'falsy' }).isString().trim().isLength({ max: 100 }).withMessage('Vị trí tối đa 100 ký tự'),
];

router.get(
  '/',
  query('keyword').optional().trim(),
  query('categoryId').optional().isInt({ min: 1 }).withMessage('Thể loại không hợp lệ').toInt(),
  query('page').optional().isInt({ min: 1 }).withMessage('Trang không hợp lệ').toInt(),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('Số dòng mỗi trang từ 1 đến 100').toInt(),
  validate,
  controller.list,
);

router.get('/:id', idParam, validate, controller.getById);

router.post('/', librarianOnly, ...bookRules, ...copiesRules('copies', false), validate, controller.create);

router.put('/:id', librarianOnly, idParam, ...bookRules, validate, controller.update);

router.delete('/:id', librarianOnly, idParam, validate, controller.remove);

router.patch(
  '/:id/hidden',
  librarianOnly,
  idParam,
  body('hidden').isBoolean({ strict: true }).withMessage('hidden phải là true hoặc false'),
  validate,
  controller.setHidden,
);

router.get('/:id/copies', librarianOnly, idParam, validate, controller.listCopies);

router.post('/:id/copies', librarianOnly, idParam, ...copiesRules('quantity', true), validate, controller.addCopies);

module.exports = router;
