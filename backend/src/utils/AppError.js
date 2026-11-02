/**
 * Lỗi nghiệp vụ có mã HTTP, ném ra từ service để errorHandler trả về client.
 *
 *   throw new AppError(409, 'Đã mượn 3/3 cuốn');
 *   throw new AppError(400, 'Dữ liệu không hợp lệ', [{ field: 'isbn', message: '...' }]);
 */
class AppError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

module.exports = AppError;
