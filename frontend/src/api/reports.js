import client, { downloadFile } from './client';

// UC016 – Báo cáo thống kê. type: loans | overdue | fines; from, to bắt buộc dạng YYYY-MM-DD
export const getReport = (type, from, to) => client.get(`/reports/${type}`, { params: { from, to } });

// Xuất file: format xlsx | pdf
export const exportReport = (type, from, to, format) =>
  downloadFile(`/reports/${type}/export`, { from, to, format }, `bao-cao-${type}-${from}-${to}.${format}`);
