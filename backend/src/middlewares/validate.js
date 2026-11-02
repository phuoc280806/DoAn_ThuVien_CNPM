const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

/**
 * Đặt sau các rule của express-validator. Có lỗi thì trả 400,
 * message là lỗi đầu tiên, errors là danh sách { field, message }.
 *
 * Lấy dữ liệu đã kiểm tra bằng matchedData(req) trong controller
 * (Express 5 không cho sửa req.query nên giá trị đã trim chỉ có trong matchedData).
 */
function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, message: e.msg }));
  next(new AppError(400, errors[0].message, errors));
}

module.exports = validate;
