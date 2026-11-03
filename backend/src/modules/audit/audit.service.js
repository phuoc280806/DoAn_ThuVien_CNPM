const AppError = require('../../utils/AppError');
const repo = require('./audit.repository');

function toAuditDto(row) {
  return {
    logId: row.log_id,
    action: row.action,          // CREATE_USER, LOCK_USER, UNLOCK_USER, RESET_PASSWORD, CHANGE_ROLE, ...
    targetType: row.target_type,
    targetId: row.target_id,
    detail: row.detail,
    ipAddress: row.ip_address,
    createdAt: row.created_at,
    user: row.username ? { username: row.username, fullName: row.full_name } : null,
  };
}

/**
 * Nhật ký hệ thống (audit_logs): thao tác quản trị tài khoản, tự đổi mật khẩu,
 * truy cập dữ liệu trái phép. Chỉ đọc, mới nhất trước.
 */
async function list({ action, keyword, from, to, page = 1, pageSize = 20 }) {
  if (from && to && from > to) throw new AppError(400, 'Khoảng thời gian không hợp lệ');
  const { rows, total } = await repo.search({ action, keyword, from, to, limit: pageSize, offset: (page - 1) * pageSize });
  return { items: rows.map(toAuditDto), page, pageSize, total };
}

module.exports = { list };
