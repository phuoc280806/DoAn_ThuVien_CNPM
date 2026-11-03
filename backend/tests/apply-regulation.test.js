const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { todayVN, addDays } = require('../src/utils/date');

let t;
let admin;
let librarian;
before(async () => {
  t = await startApp();
  admin = await t.login('AD001');
  librarian = await t.login('TT01');
});
after(async () => { await t.stop(); });

const today = todayVN();

test('Phân quyền UC015: chỉ Admin được xem trước và áp dụng cho phiếu đang mượn', async () => {
  const body = { readerType: 'STUDENT', params: ['borrowDays'], reason: 'Kiểm tra quyền' };
  assert.equal((await t.api('POST', '/regulations/apply-active-loans/preview', { body })).status, 401);
  assert.equal((await t.api('POST', '/regulations/apply-active-loans/preview', { token: librarian, body })).status, 403);
  assert.equal((await t.api('POST', '/regulations/apply-active-loans', { token: librarian, body })).status, 403);
  assert.equal(
    (await t.api('POST', '/regulations/apply-active-loans', { token: await t.login('HS2026001'), body })).status,
    403,
  );
});

test('UC015 luồng thay thế 3a, 5b, 9a: thiếu phạm vi / tham số, ngày thu hồi quá khứ, thiếu lý do', async () => {
  const preview = (body) => t.api('POST', '/regulations/apply-active-loans/preview', { token: admin, body });
  const apply = (body) => t.api('POST', '/regulations/apply-active-loans', { token: admin, body });

  const noScope = await preview({ params: ['borrowDays'] });
  assert.equal(noScope.status, 400);
  assert.equal(noScope.body.message, 'Phạm vi áp dụng phải là ALL, STUDENT hoặc TEACHER');

  const noParams = await preview({ readerType: 'STUDENT', params: [] });
  assert.equal(noParams.status, 400);
  assert.equal(noParams.body.message, 'Cần chọn ít nhất một tham số áp dụng');

  const pastDue = await preview({
    readerType: 'STUDENT',
    params: ['borrowDays'],
    fixedDueDate: addDays(today, -1),
  });
  assert.equal(pastDue.status, 400);
  assert.equal(pastDue.body.message, 'Ngày thu hồi cố định không được ở quá khứ');

  const noReason = await apply({ readerType: 'STUDENT', params: ['borrowDays'], reason: '   ' });
  assert.equal(noReason.status, 400);
  assert.equal(noReason.body.message, 'Cần nhập lý do áp dụng');
});

test('TH6 + UC015 bước 4–6: đổi quy định xong phiếu cũ giữ snapshot; xem trước thấy phiếu bị ảnh hưởng và cảnh báo quá hạn', async () => {
  // Tạo quy định mới cho học sinh hiệu lực từ hôm nay: hạn mượn giảm còn 3 ngày, phạt 2.000đ/ngày
  const created = await t.api('POST', '/regulations', {
    token: admin,
    body: {
      readerType: 'STUDENT',
      maxBooks: 3,
      borrowDays: 3,
      finePerDay: 2000,
      maxFinePerBook: 30000,
      renewDays: 7,
      effectiveFrom: today,
    },
  });
  assert.equal(created.status, 201);

  // Trước khi áp dụng UC015: phiếu PM000001 vẫn giữ snapshot cũ (7 ngày, 1.000đ)
  const beforeTicket = await t.api('GET', '/loans/1', { token: librarian });
  assert.equal(beforeTicket.body.data.snapshot.borrowDays, 7);
  assert.equal(beforeTicket.body.data.snapshot.finePerDay, 1000);

  // Xem trước áp dụng cho học sinh
  const preview = await t.api('POST', '/regulations/apply-active-loans/preview', {
    token: admin,
    body: { readerType: 'STUDENT', params: ['borrowDays', 'finePerDay'] },
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.data.totalAffected, 5);   // PM000001, PM000002, PM000003, PM000004, PM000008

  // PM000002 (lập 5 ngày trước, hạn cũ today + 2) khi đổi sang 3 ngày → hạn mới today - 2 → chuyển sang quá hạn
  const pm2 = preview.body.data.tickets.find((x) => x.ticketCode === 'PM000002');
  assert.equal(pm2.wasOverdue, false);
  assert.equal(pm2.isOverdue, true);
  assert.equal(pm2.willBecomeOverdue, true);
  assert.equal(pm2.warning, 'Phiếu sẽ chuyển sang quá hạn');
  assert.deepEqual(pm2.oldValues, { borrowDays: 7, finePerDay: 1000 });
  assert.deepEqual(pm2.newValues, { borrowDays: 3, finePerDay: 2000 });
  assert.deepEqual(pm2.dueDates, [
    { borrowDetailId: 4, copyCode: 'BS000010', oldDueDate: addDays(today, 2), newDueDate: addDays(today, -2) },
  ]);
});

test('UC015 bước 7–12: áp dụng quy định mới, cập nhật snapshot, ghi regulation_logs và ticket_snapshot_changes', async () => {
  // Gia hạn cuốn thứ 2 của PM000001 để 3 cuốn trong phiếu có hạn trả khác nhau (today + 4 → today + 11)
  const renew = await t.api('POST', '/loans/items/2/renew', { token: librarian });
  assert.equal(renew.status, 200);

  const res = await t.api('POST', '/regulations/apply-active-loans', {
    token: admin,
    body: {
      readerType: 'STUDENT',
      params: ['borrowDays', 'finePerDay'],
      reason: 'Đồng bộ quy định học kỳ 2',
    },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.affectedTickets, 5);
  assert.match(res.body.message, /5 phiếu đang mượn/);

  // PM000001 đã đổi snapshot sang 3 ngày, 2.000đ/ngày và hạn trả mới = borrow_date (today - 3) + 3 = today
  const afterTicket = await t.api('GET', '/loans/1', { token: librarian });
  assert.equal(afterTicket.body.data.snapshot.borrowDays, 3);
  assert.equal(afterTicket.body.data.snapshot.finePerDay, 2000);
  assert.equal(afterTicket.body.data.items[0].dueDate, today);
  // Cuốn đã gia hạn: borrow_date + 3 + 1 × 7 = today + 7
  assert.equal(afterTicket.body.data.items.find((i) => i.borrowDetailId === 2).dueDate, addDays(today, 7));

  // Phiếu của giáo viên (PM000006) ngoài phạm vi nên giữ nguyên
  const teacherTicket = await t.api('GET', '/loans/6', { token: librarian });
  assert.equal(teacherTicket.body.data.snapshot.borrowDays, 7);
  assert.equal(teacherTicket.body.data.snapshot.finePerDay, 1000);

  // Phiếu đã trả (PM000005) giữ nguyên
  const completedTicket = await t.api('GET', '/loans/5', { token: librarian });
  assert.equal(completedTicket.body.data.snapshot.borrowDays, 7);
  assert.equal(completedTicket.body.data.snapshot.finePerDay, 1000);

  // Kiểm tra nhật ký thay đổi quy định (UC014)
  const logs = await t.api('GET', '/regulations/logs?pageSize=1', { token: admin });
  const [latestLog] = logs.body.data.items;
  assert.equal(latestLog.changeType, 'APPLY_ACTIVE_LOANS');
  assert.equal(latestLog.readerType, 'STUDENT');
  assert.equal(latestLog.reason, 'Đồng bộ quy định học kỳ 2');
  assert.equal(latestLog.affectedTickets, 5);

  // Kiểm tra bảng ticket_snapshot_changes lưu đúng 5 dòng truy vết
  const [[{ count }]] = await t.pool.query(
    'SELECT COUNT(*) AS count FROM ticket_snapshot_changes WHERE log_id = ?',
    [res.body.data.logId],
  );
  assert.equal(count, 5);

  // Truy vết: lưu hạn trả cũ / mới của từng cuốn trong PM000001, không chỉ cuốn đầu tiên
  const [[change]] = await t.pool.query(
    'SELECT old_values, new_values FROM ticket_snapshot_changes WHERE log_id = ? AND borrow_id = 1',
    [res.body.data.logId],
  );
  assert.deepEqual(change.old_values.due_dates, {
    1: addDays(today, 4), 2: addDays(today, 11), 3: addDays(today, 4),
  });
  assert.deepEqual(change.new_values.due_dates, {
    1: today, 2: addDays(today, 7), 3: today,
  });
});

test('UC015: các phiếu trong phạm vi đã dùng đúng giá trị mới thì báo không có gì thay đổi', async () => {
  const res = await t.api('POST', '/regulations/apply-active-loans/preview', {
    token: admin,
    body: { readerType: 'STUDENT', params: ['borrowDays', 'finePerDay'] },
  });
  assert.equal(res.status, 409);
  assert.equal(res.body.message,
    'Các phiếu đang mượn trong phạm vi đã dùng đúng giá trị này, không có phiếu nào cần thay đổi');
});

test('UC015: áp dụng ngày thu hồi cố định cho toàn bộ phiếu đang mượn (ALL)', async () => {
  const recallDate = addDays(today, 15);
  const res = await t.api('POST', '/regulations/apply-active-loans', {
    token: admin,
    body: {
      readerType: 'ALL',
      params: ['borrowDays'],
      fixedDueDate: recallDate,
      reason: 'Thu hồi sách cuối năm học',
    },
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.affectedTickets, 6);   // 5 phiếu HS + 1 phiếu GV đang mượn

  const gvTicket = await t.api('GET', '/loans/6', { token: librarian });
  assert.equal(gvTicket.body.data.items[0].dueDate, recallDate);
});

