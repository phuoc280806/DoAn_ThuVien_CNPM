const { test, before, after, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const mailer = require('../src/modules/reminders/reminders.mailer');

let t;
let admin;
let librarian;
let reader;
let sentEmails = [];

before(async () => {
  t = await startApp();
  admin = await t.login('AD001');
  librarian = await t.login('TT01');
  reader = await t.login('HS2026001');

  mailer.setMailSender(async (mailOptions, payload) => {
    sentEmails.push({ mailOptions, payload });
    return { messageId: `<mock-${Date.now()}@thptmau.edu.vn>` };
  });
});

afterEach(() => {
  sentEmails = [];
  mailer.setMailSender(async (mailOptions, payload) => {
    sentEmails.push({ mailOptions, payload });
    return { messageId: `<mock-${Date.now()}@thptmau.edu.vn>` };
  });
});

after(async () => {
  mailer.resetMailSender();
  await t.stop();
});

test('Phân quyền UC017: Độc giả không được phép truy cập danh sách hoặc gửi nhắc hạn (403)', async () => {
  const listRes = await t.api('GET', '/reminders', { token: reader });
  assert.equal(listRes.status, 403);

  const sendRes = await t.api('POST', '/reminders/send', {
    token: reader,
    body: { borrowDetailIds: [4] },
  });
  assert.equal(sendRes.status, 403);
});

test('UC017 bước 2: GET /api/reminders trả danh sách các mục sắp đến hạn (<= 3 ngày) và đã quá hạn', async () => {
  const res = await t.api('GET', '/reminders', { token: librarian });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.totalItems, 3);
  assert.equal(res.body.data.dueSoonCount, 1);
  assert.equal(res.body.data.overdueCount, 2);

  const dueSoonItem = res.body.data.items.find((i) => i.borrowDetailId === 4);
  assert.ok(dueSoonItem);
  assert.equal(dueSoonItem.ticketCode, 'PM000002');
  assert.equal(dueSoonItem.readerCode, 'HS2026003');
  assert.equal(dueSoonItem.status, 'DUE_SOON');
  assert.equal(dueSoonItem.daysLeft, 2);
  assert.equal(dueSoonItem.canSendEmail, true);

  const overdueWithEmail = res.body.data.items.find((i) => i.borrowDetailId === 5);
  assert.ok(overdueWithEmail);
  assert.equal(overdueWithEmail.ticketCode, 'PM000003');
  assert.equal(overdueWithEmail.readerCode, 'HS2026004');
  assert.equal(overdueWithEmail.status, 'OVERDUE');
  assert.equal(overdueWithEmail.daysOverdue, 5);
  assert.equal(overdueWithEmail.canSendEmail, true);

  const overdueNoEmail = res.body.data.items.find((i) => i.borrowDetailId === 6);
  assert.ok(overdueNoEmail);
  assert.equal(overdueNoEmail.ticketCode, 'PM000004');
  assert.equal(overdueNoEmail.readerCode, 'HS2026006');
  assert.equal(overdueNoEmail.status, 'OVERDUE');
  assert.equal(overdueNoEmail.email, null);
  assert.equal(overdueNoEmail.canSendEmail, false);
  assert.equal(overdueNoEmail.missingEmailReason, 'Độc giả chưa có email, hãy nhắc trực tiếp');
});

test('GET /api/reminders hỗ trợ lọc theo status=DUE_SOON hoặc status=OVERDUE', async () => {
  const dueSoonRes = await t.api('GET', '/reminders?status=DUE_SOON', { token: librarian });
  assert.equal(dueSoonRes.status, 200);
  assert.equal(dueSoonRes.body.data.items.length, 1);
  assert.equal(dueSoonRes.body.data.items[0].borrowDetailId, 4);

  const overdueRes = await t.api('GET', '/reminders?status=OVERDUE', { token: admin });
  assert.equal(overdueRes.status, 200);
  assert.equal(overdueRes.body.data.items.length, 2);
});

test('UC017 4a: POST /api/reminders/send từ chối nếu độc giả chưa có email', async () => {
  const res = await t.api('POST', '/reminders/send', {
    token: librarian,
    body: { borrowDetailIds: [6] },
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.message, 'Độc giả chưa có email, hãy nhắc trực tiếp');
  assert.equal(sentEmails.length, 0);
});

test('POST /api/reminders/send từ chối nếu chọn phiếu chưa đến diện nhắc hạn (> 3 ngày)', async () => {
  // borrowDetailId = 1 thuộc PM000001 có hạn trả còn +4 ngày
  const res = await t.api('POST', '/reminders/send', {
    token: librarian,
    body: { borrowDetailIds: [1] },
  });
  assert.equal(res.status, 409);
  assert.equal(sentEmails.length, 0);
});

test('UC017 bước 3–6: POST /api/reminders/send gửi email giả lập thành công và ghi nhận reminder_logs', async () => {
  const res = await t.api('POST', '/reminders/send', {
    token: librarian,
    body: { borrowDetailIds: [4, 5] },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.sentCount, 2);
  assert.equal(res.body.data.failedCount, 0);
  assert.equal(sentEmails.length, 2);

  assert.equal(sentEmails[0].mailOptions.to, 'huy.tran@student.thptmau.edu.vn');
  assert.match(sentEmails[0].mailOptions.subject, /quá hạn/i);
  assert.equal(sentEmails[1].mailOptions.to, 'bao.vo@student.thptmau.edu.vn');
  assert.match(sentEmails[1].mailOptions.subject, /sắp đến hạn/i);

  const [logs] = await t.pool.query(
    'SELECT * FROM reminder_logs WHERE borrow_detail_id IN (4, 5) ORDER BY reminder_id ASC'
  );
  assert.equal(logs.length, 2);
  assert.equal(Boolean(logs[0].success), true);
  assert.equal(logs[0].error_message, null);
  assert.equal(Boolean(logs[1].success), true);
});

test('UC017 5a: khi lỗi gửi mail vẫn ghi reminder_logs(success=false) và cho phép gửi lại', async () => {
  mailer.setMailSender(async () => {
    throw new Error('SMTP connection timeout');
  });

  const failRes = await t.api('POST', '/reminders/send', {
    token: librarian,
    body: { borrowDetailIds: [4] },
  });
  assert.equal(failRes.status, 502);
  assert.match(failRes.body.message, /thất bại/i);

  const [failedLogs] = await t.pool.query(
    'SELECT * FROM reminder_logs WHERE borrow_detail_id = 4 AND success = FALSE ORDER BY reminder_id DESC'
  );
  assert.equal(failedLogs.length, 1);
  assert.equal(failedLogs[0].error_message, 'SMTP connection timeout');

  // Khôi phục mailer và thử gửi lại theo đúng luồng 5a
  mailer.setMailSender(async (mailOptions, payload) => {
    sentEmails.push({ mailOptions, payload });
    return { messageId: '<retry-ok@thptmau.edu.vn>' };
  });

  const retryRes = await t.api('POST', '/reminders/send', {
    token: librarian,
    body: { borrowDetailIds: [4] },
  });
  assert.equal(retryRes.status, 200);
  assert.equal(retryRes.body.data.sentCount, 1);
  assert.equal(sentEmails.length, 1);
});

test('UC017 2a: GET /api/reminders trả thông báo "Không có phiếu cần nhắc" khi danh sách trống', async () => {
  // Tạm dời hạn trả của các mục 4, 5, 6 sang +10 ngày để danh sách nhắc hạn trống
  await t.pool.query(
    'UPDATE borrow_details SET due_date = DATE_ADD(CURDATE(), INTERVAL 10 DAY) WHERE borrow_detail_id IN (4, 5, 6)'
  );

  const res = await t.api('GET', '/reminders', { token: librarian });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.items.length, 0);
  assert.equal(res.body.message, 'Không có phiếu cần nhắc');
});
