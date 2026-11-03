import client from './client';

// UC012 – Độc giả xem lịch sử mượn/trả và khoản phạt của chính mình
// params: { status: BORROWING | OVERDUE | RETURNED, from, to } → { unpaidTotal, items: [...] }
export const getMyLoans = (params) => client.get('/me/loans', { params });

// Chi tiết một phiếu của mình; phiếu của người khác → 403 và bị ghi nhật ký
export const getMyTicket = (borrowId) => client.get(`/me/loans/${borrowId}`);
