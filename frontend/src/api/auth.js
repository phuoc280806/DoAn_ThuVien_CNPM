import client from './client';

// UC001 – Đăng nhập / đăng xuất
export const login = (username, password) => client.post('/auth/login', { username, password });
export const logout = () => client.post('/auth/logout');
export const me = () => client.get('/auth/me');

// Tự đổi mật khẩu
export const changePassword = (currentPassword, newPassword) =>
  client.patch('/auth/password', { currentPassword, newPassword });
