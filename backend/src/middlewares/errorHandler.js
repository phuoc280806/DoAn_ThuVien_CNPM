const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  }

  // Body gửi lên không phải JSON hợp lệ
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Dữ liệu gửi lên không đúng định dạng JSON' });
  }

  console.error(err);
  return res.status(500).json({ success: false, message: 'Lỗi hệ thống, vui lòng thử lại sau' });
}

module.exports = { notFound, errorHandler };
