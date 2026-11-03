import client from './client';

// UC003 – Quản lý hồ sơ độc giả & thẻ thư viện (Thủ thư / Admin)
// params: { keyword, readerType: STUDENT | TEACHER, page, pageSize }
export const listReaders = (params) => client.get('/readers', { params });
export const getReader = (readerId) => client.get(`/readers/${readerId}`);

// body: { readerCode (chỉ khi thêm), fullName, readerType, className?, department?, email?, dateOfBirth? }
export const createReader = (body) => client.post('/readers', body);
export const updateReader = (readerId, body) => client.put(`/readers/${readerId}`, body);

// Thẻ thư viện: cấp (issuedDate mặc định hôm nay), gia hạn, khóa / mở khóa
export const issueCard = (readerId, expiryDate, issuedDate) =>
  client.post(`/readers/${readerId}/card`, { expiryDate, ...(issuedDate ? { issuedDate } : {}) });
export const renewCard = (readerId, expiryDate) => client.patch(`/readers/${readerId}/card/expiry`, { expiryDate });
export const setCardStatus = (readerId, status) => client.patch(`/readers/${readerId}/card/status`, { status });
