import client from './client';

// UC009 – Trả sách (kèm UC010 – Tính tiền phạt)
export const lookupReturn = (copyCode) => client.get(`/returns/lookup/${encodeURIComponent(copyCode)}`);

// condition: GOOD | DAMAGED | LOST; note bắt buộc khi DAMAGED / LOST
export const returnCopy = ({ copyCode, condition, note }) => client.post('/returns', { copyCode, condition, note });
