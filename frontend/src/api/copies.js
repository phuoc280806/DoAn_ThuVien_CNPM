import client from './client';

// UC005 – Tra bản sách theo mã quét được
export const getCopyByCode = (copyCode) => client.get(`/copies/code/${encodeURIComponent(copyCode)}`);
export const changeCopyStatus = (copyId, status, reason) => client.patch(`/copies/${copyId}/status`, { status, reason });
