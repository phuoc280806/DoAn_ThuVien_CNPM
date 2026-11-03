import client from './client';

// UC013 – Cấu hình quy định: [{ readerType, current, versions: [...] }] cho STUDENT và TEACHER
export const getRegulations = () => client.get('/regulations');

// body: { readerType, maxBooks, borrowDays, finePerDay, maxFinePerBook, renewDays, effectiveFrom }
export const createRegulation = (body) => client.post('/regulations', body);

// UC014 – Nhật ký thay đổi quy định. params: { from, to, readerType, changedBy, page, pageSize }
export const listRegulationLogs = (params) => client.get('/regulations/logs', { params });

// UC015 – Áp dụng quy định mới cho phiếu đang mượn
// body: { readerType: ALL | STUDENT | TEACHER, params: [...], fixedDueDate?, reason (khi áp dụng) }
export const previewApply = (body) => client.post('/regulations/apply-active-loans/preview', body);
export const applyActiveLoans = (body) => client.post('/regulations/apply-active-loans', body);
