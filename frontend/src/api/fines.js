import client from './client';

// UC011 – Thu tiền phạt. params: { readerCode, status: UNPAID | PAID, page, pageSize }
export const listFines = (params) => client.get('/fines', { params });
export const payFine = (fineId) => client.post(`/fines/${fineId}/pay`);

// Biên lai: Thủ thư xem mọi biên lai, độc giả chỉ xem biên lai của mình
export const getReceipt = (fineId) => client.get(`/fines/${fineId}/receipt`);
