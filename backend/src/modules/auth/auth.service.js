const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../../utils/AppError');
const { withTransaction } = require('../../config/db');
const { writeAudit } = require('../../utils/audit');
const usersRepo = require('../users/users.repository');
const { toUserDto } = require('../users/users.mapper');

// So sánh với hash giả khi không có tài khoản, để thời gian phản hồi như nhau
// và không đoán được tên đăng nhập nào tồn tại.
const BCRYPT_ROUNDS = 10;
const DUMMY_HASH ='$2b$10$SaxJ0JqSztKyyuhbYv7hYuRZiSK4K.ySuW84.YnYzK7OiAYTmuPxm';

/**
 * UC001 – Đăng nhập. Sai tên đăng nhập hay sai mật khẩu đều báo cùng một câu (6a).
 */
async function login(username, password) {
  const user = await usersRepo.findByUsername(username);
  const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !passwordOk) {
    throw new AppError(401, 'Tên đăng nhập hoặc mật khẩu chưa đúng');
  }
  if (user.status === 'LOCKED') {
    throw new AppError(403, 'Tài khoản đã bị khóa, vui lòng liên hệ Admin');
  }

  const token = jwt.sign(
    { username: user.username, role: user.role, readerId: user.reader_id },
    process.env.JWT_SECRET,
    { subject: String(user.user_id), expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
  );
  return { token, user: toUserDto(user) };
}

async function me(userId) {
  const user = await usersRepo.findById(userId);
  if (!user) throw new AppError(404, 'Không tìm thấy tài khoản');
  return toUserDto(user);
}

/**
 * Tự đổi mật khẩu: phải nhập đúng mật khẩu hiện tại, mật khẩu mới khác mật khẩu cũ.
 */
async function changePassword(userId, currentPassword, newPassword, ip) {
  const user = await usersRepo.findById(userId);
  if (!user) throw new AppError(404, 'Không tìm thấy tài khoản');
  if (!(await bcrypt.compare(currentPassword, user.password_hash))) {
    throw new AppError(400, 'Mật khẩu hiện tại chưa đúng');
  }
  if (currentPassword === newPassword) {
    throw new AppError(400, 'Mật khẩu mới phải khác mật khẩu hiện tại');
  }

  await withTransaction(async (conn) => {
    await usersRepo.updatePassword(userId, await bcrypt.hash(newPassword, BCRYPT_ROUNDS), conn);
    await writeAudit({ userId, action: 'CHANGE_OWN_PASSWORD', targetType: 'USER', targetId: userId, ip }, conn);
  });
}

module.exports = { login, me, changePassword };
