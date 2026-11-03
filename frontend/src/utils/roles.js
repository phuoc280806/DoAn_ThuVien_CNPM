// Tên vai trò, trùng với backend (backend/src/constants/roles.js)
export const ROLES = Object.freeze({
  READER: 'READER',
  LIBRARIAN: 'LIBRARIAN',
  ADMIN: 'ADMIN',
});

export const ROLE_LABELS = {
  READER: 'Độc giả',
  LIBRARIAN: 'Thủ thư',
  ADMIN: 'Admin / Ban giám hiệu',
};

export const READER_TYPE_LABELS = {
  STUDENT: 'Học sinh',
  TEACHER: 'Giáo viên',
};

/**
 * Vai trò có được vào trang dành cho `roles` không.
 * Giống backend: Admin có mọi quyền của Thủ thư.
 */
export function canAccess(role, roles) {
  if (!roles || roles.length === 0) return true;
  return roles.includes(role) || (role === ROLES.ADMIN && roles.includes(ROLES.LIBRARIAN));
}

// Nhãn hiển thị dưới tên người dùng: "Học sinh · HS2026001", "Thủ thư"...
export function roleLabelOf(user) {
  if (user?.reader) return `${READER_TYPE_LABELS[user.reader.readerType]} · ${user.reader.readerCode}`;
  return ROLE_LABELS[user?.role] ?? '';
}
