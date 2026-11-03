import client from './client';

// UC017 – Nhắc hạn trả: sách còn ≤ 3 ngày đến hạn hoặc đã quá hạn. params: { status: DUE_SOON | OVERDUE }
export const listReminders = (params) => client.get('/reminders', { params });

// Gửi email nhắc cho các cuốn đã chọn (borrowDetailId lấy từ listReminders)
export const sendReminders = (borrowDetailIds) => client.post('/reminders/send', { borrowDetailIds });

// Lịch sử gửi. params: { borrowDetailId }
export const listReminderLogs = (params) => client.get('/reminders/logs', { params });
