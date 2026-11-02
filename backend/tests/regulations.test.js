const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startApp } = require('./helpers');
const { todayVN } = require('../src/utils/date');

let t;
let admin;
let librarian;
before(async () => {
  t = await startApp();
  admin = await t.login('AD001');
  librarian = await t.login('TT01');
});
after(async () => { await t.stop(); });

const addDays = (date, days) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const today = todayVN();
const tomorrow = addDays(today, 1);

// Quy định hiện hành của học sinh trong seed
const studentNow = { readerType: 'STUDENT', maxBooks: 3, borrowDays: 7, finePerDay: 1000, maxFinePerBook: 30000, renewDays: 7 };

test('Phân quyền: Thủ thư chỉ xem quy định hiện hành; độc giả không xem được', async () => {
  assert.equal((await t.api('GET', '/regulations', { token: librarian })).status, 403);
  assert.equal((await t.api('POST', '/regulations', { token: librarian, body: {} })).status, 403);
  assert.equal((await t.api('GET', '/regulations/logs', { token: librarian })).status, 403);
  assert.equal((await t.api('GET', '/regulations/current?readerType=STUDENT', { token: await t.login('HS2026001') })).status, 403);

  const current = await t.api('GET', '/regulations/current?readerType=TEACHER', { token: librarian });
  assert.equal(current.status, 200);
  assert.equal(current.body.data.maxBooks, 5);
  assert.equal(current.body.data.borrowDays, 7);
  assert.equal(current.body.data.renewDays, 14);
});

test('UC013 bước 2: quy định hiện hành và các phiên bản theo loại độc giả', async () => {
  const res = await t.api('GET', '/regulations', { token: admin });
  assert.equal(res.status, 200);
  const student = res.body.data.find((g) => g.readerType === 'STUDENT');
  assert.equal(student.current.borrowDays, 7);
  assert.deepEqual(student.versions.map((v) => [v.borrowDays, v.status]), [[7, 'CURRENT'], [14, 'PAST']]);
});

test('UC013: tạo quy định có hiệu lực từ ngày mai; hôm nay vẫn dùng quy định cũ', async () => {
  const res = await t.api('POST', '/regulations', {
    token: admin,
    body: { ...studentNow, finePerDay: 2000, effectiveFrom: tomorrow },
  });
  assert.equal(res.status, 201);
  assert.match(res.body.message, new RegExp(`từ ngày ${tomorrow}`));

  const current = await t.api('GET', '/regulations/current?readerType=STUDENT', { token: librarian });
  assert.equal(current.body.data.finePerDay, 1000);

  const overview = await t.api('GET', '/regulations', { token: admin });
  const statuses = overview.body.data.find((g) => g.readerType === 'STUDENT').versions.map((v) => v.status);
  assert.deepEqual(statuses, ['UPCOMING', 'CURRENT', 'PAST']);

  // Nhật ký chỉ ghi tham số có thay đổi
  const logs = await t.api('GET', '/regulations/logs?pageSize=1', { token: admin });
  const [log] = logs.body.data.items;
  assert.equal(log.changeType, 'CONFIG');
  assert.deepEqual(log.oldValues, { finePerDay: 1000 });
  assert.deepEqual(log.newValues, { finePerDay: 2000 });
  assert.equal(log.changedBy.username, 'AD001');
});

test('UC013 luồng thay thế: 6b quá khứ, 6c trùng ngày, 4a không thay đổi, 6a giá trị sai', async () => {
  const post = (body) => t.api('POST', '/regulations', { token: admin, body });

  const past = await post({ ...studentNow, borrowDays: 10, effectiveFrom: addDays(today, -1) });
  assert.equal(past.status, 400);
  assert.equal(past.body.message, 'Ngày hiệu lực không được ở quá khứ');

  const sameDate = await post({ ...studentNow, borrowDays: 10, effectiveFrom: tomorrow });
  assert.equal(sameDate.status, 409);

  // Ngày kia: quy định đang áp dụng lúc đó là bản 2.000đ vừa tạo → gửi y hệt là không thay đổi
  const noChange = await post({ ...studentNow, finePerDay: 2000, effectiveFrom: addDays(today, 2) });
  assert.equal(noChange.status, 400);
  assert.equal(noChange.body.message, 'Chưa có thay đổi nào so với quy định hiện hành');

  const negative = await post({ ...studentNow, borrowDays: 0, effectiveFrom: addDays(today, 3) });
  assert.equal(negative.body.message, 'Số ngày mượn phải là số nguyên từ 1 đến 365');

  const capTooLow = await post({ ...studentNow, maxFinePerBook: 500, effectiveFrom: addDays(today, 3) });
  assert.equal(capTooLow.body.message, 'Mức phạt tối đa mỗi cuốn phải lớn hơn hoặc bằng tiền phạt mỗi ngày');
});

test('UC013: quy định hiệu lực từ hôm nay áp dụng ngay', async () => {
  const res = await t.api('POST', '/regulations', {
    token: admin,
    body: { readerType: 'TEACHER', maxBooks: 6, borrowDays: 7, finePerDay: 1000, maxFinePerBook: 30000, renewDays: 14, effectiveFrom: today },
  });
  assert.equal(res.status, 201);
  const current = await t.api('GET', '/regulations/current?readerType=TEACHER', { token: librarian });
  assert.equal(current.body.data.maxBooks, 6);
});

test('UC014: xem và lọc nhật ký thay đổi quy định', async () => {
  const all = await t.api('GET', '/regulations/logs', { token: admin });
  assert.equal(all.body.data.total, 6);   // 4 dòng seed + 2 dòng vừa tạo

  const teacher = await t.api('GET', '/regulations/logs?readerType=TEACHER', { token: admin });
  assert.equal(teacher.body.data.total, 3);

  const todayOnly = await t.api('GET', `/regulations/logs?from=${today}&to=${today}`, { token: admin });
  assert.equal(todayOnly.body.data.total, 2);

  const byUser = await t.api('GET', '/regulations/logs?changedBy=TT01', { token: admin });
  assert.equal(byUser.body.data.total, 0);

  const badRange = await t.api('GET', `/regulations/logs?from=${today}&to=${addDays(today, -5)}`, { token: admin });
  assert.equal(badRange.status, 400);
  assert.equal(badRange.body.message, 'Khoảng thời gian không hợp lệ');

  const future = await t.api('GET', `/regulations/logs?to=${tomorrow}`, { token: admin });
  assert.equal(future.body.message, 'Đến ngày không được lớn hơn ngày hiện tại');
});
