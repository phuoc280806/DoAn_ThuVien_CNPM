const { Router } = require('express');
const controller = require('./books.controller');
const { authenticate } = require('../../middlewares/auth');

// Danh sách thể loại để chọn khi thêm sách / lọc khi tra cứu (dữ liệu có sẵn, không có màn hình quản lý)
const router = Router();

router.get('/', authenticate, controller.listCategories);

module.exports = router;
