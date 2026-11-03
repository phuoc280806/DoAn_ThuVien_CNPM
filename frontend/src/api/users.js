import client from './client';

// UC002 – Quản lý tài khoản & phân quyền (chỉ Admin)
// params: { keyword, role, status, page, pageSize }
export const listUsers = (params) => client.get('/users', { params });

// body: { username, password, role, fullName?, email?, phone? }
// Tài khoản độc giả: username = mã độc giả đã có hồ sơ, họ tên lấy từ hồ sơ
export const createUser = (body) => client.post('/users', body);
export const setUserStatus = (userId, status) => client.patch(`/users/${userId}/status`, { status });
export const resetPassword = (userId, password) => client.patch(`/users/${userId}/password`, { password });
export const changeRole = (userId, role) => client.patch(`/users/${userId}/role`, { role });
