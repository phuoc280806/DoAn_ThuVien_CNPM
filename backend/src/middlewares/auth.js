const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const ROLES = require('../constants/roles');

/**
 * Bắt buộc đăng nhập. Đọc token từ header "Authorization: Bearer <token>"
 * và gắn thông tin người dùng vào req.user = { userId, username, role, readerId }.
 */
function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Bạn chưa đăng nhập'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      userId: Number(payload.sub),
      username: payload.username,
      role: payload.role,
      readerId: payload.readerId ?? null,
    };
    next();
  } catch {
    next(new AppError(401, 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ, vui lòng đăng nhập lại'));
  }
}

/**
 * Chỉ cho các vai trò được liệt kê. Admin có mọi quyền của Thủ thư,
 * nên authorize(ROLES.LIBRARIAN) cũng cho Admin đi qua.
 *
 *   router.get('/', authenticate, authorize(ROLES.LIBRARIAN), controller.list);
 */
function authorize(...roles) {
  return (req, res, next) => {
    const role = req.user?.role;
    const allowed = roles.includes(role) || (role === ROLES.ADMIN && roles.includes(ROLES.LIBRARIAN));
    if (!allowed) {
      return next(new AppError(403, 'Bạn không có quyền thực hiện chức năng này'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
