import client from './client';

const enc = encodeURIComponent;

// UC007 – Lập phiếu mượn
export const checkEligibility = (readerCode) => client.get(`/loans/eligibility/${enc(readerCode)}`);
export const createLoan = (readerCode, copyCodes) => client.post('/loans', { readerCode, copyCodes });
export const getLoan = (borrowId) => client.get(`/loans/${borrowId}`);

// UC008 – Gia hạn: tìm sách đang mượn theo { readerCode } hoặc { copyCode }
export const listActiveItems = (params) => client.get('/loans/active', { params });
export const renewItem = (borrowDetailId) => client.post(`/loans/items/${borrowDetailId}/renew`);
