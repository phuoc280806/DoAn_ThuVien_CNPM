import client from './client';

// Nhật ký hệ thống (audit_logs), chỉ Admin. params: { action, keyword, from, to, page, pageSize }
export const listAuditLogs = (params) => client.get('/audit-logs', { params });
