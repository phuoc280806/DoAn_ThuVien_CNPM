const { withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const { todayVN } = require('../../utils/date');
const repo = require('./readers.repository');
const { toReaderDto } = require('./readers.mapper');

async function list({ keyword, readerType, page = 1, pageSize = 20 }) {
  const { rows, total } = await repo.search({ keyword, readerType, limit: pageSize, offset: (page - 1) * pageSize });
  return { items: rows.map(toReaderDto), page, pageSize, total };
}

async function getById(readerId) {
  const reader = await repo.findById(readerId);
  if (!reader) throw new AppError(404, 'Không tìm thấy độc giả');
  return toReaderDto(reader);
}

// Học sinh lưu lớp, giáo viên lưu tổ bộ môn; trường không thuộc loại độc giả thì bỏ
function normalizeProfile(data) {
  return {
    ...data,
    className: data.readerType === 'STUDENT' ? data.className || null : null,
    department: data.readerType === 'TEACHER' ? data.department || null : null,
    email: data.email || null,
    dateOfBirth: data.dateOfBirth || null,
  };
}

// UC003 – Thêm hồ sơ độc giả. Mã độc giả không trùng (7b, GĐ01).
async function create(data) {
  return withTransaction(async (conn) => {
    if (await repo.existsByCode(data.readerCode, conn)) {
      throw new AppError(409, 'Mã độc giả đã tồn tại');
    }
    const readerId = await repo.insert(normalizeProfile(data), conn);
    return toReaderDto(await repo.findById(readerId, conn));
  });
}

// UC003 – Sửa hồ sơ. Mã độc giả không đổi vì là tên đăng nhập của tài khoản độc giả.
async function update(readerId, data) {
  return withTransaction(async (conn) => {
    const reader = await repo.lockById(readerId, conn);
    if (!reader) throw new AppError(404, 'Không tìm thấy độc giả');

    const profile = normalizeProfile(data);
    await repo.update(readerId, profile, conn);
    if (reader.user_id) await repo.syncAccount(reader.user_id, profile, conn);

    return toReaderDto(await repo.findById(readerId, conn));
  });
}

async function lockReaderWithCard(readerId, conn) {
  if (!(await repo.lockById(readerId, conn))) throw new AppError(404, 'Không tìm thấy độc giả');
  return repo.findCardForUpdate(readerId, conn);
}

function assertExpiryAfter(expiryDate, issuedDate) {
  if (expiryDate <= issuedDate) {
    throw new AppError(400, 'Ngày hết hạn thẻ phải sau ngày cấp', [
      { field: 'expiryDate', message: 'Ngày hết hạn thẻ phải sau ngày cấp' },
    ]);
  }
}

// UC003 – Cấp thẻ. Ngày cấp mặc định là hôm nay; ngày hết hạn phải sau ngày cấp (7c).
async function issueCard(readerId, { issuedDate = todayVN(), expiryDate }) {
  return withTransaction(async (conn) => {
    if (await lockReaderWithCard(readerId, conn)) {
      throw new AppError(409, 'Độc giả đã có thẻ thư viện. Dùng chức năng gia hạn hoặc khóa thẻ');
    }
    assertExpiryAfter(expiryDate, issuedDate);
    await repo.insertCard(readerId, { issuedDate, expiryDate }, conn);
    return toReaderDto(await repo.findById(readerId, conn));
  });
}

// UC003 – Gia hạn thẻ: cập nhật ngày hết hạn mới
async function renewCard(readerId, expiryDate) {
  return withTransaction(async (conn) => {
    const card = await lockReaderWithCard(readerId, conn);
    if (!card) throw new AppError(404, 'Độc giả chưa được cấp thẻ');

    assertExpiryAfter(expiryDate, card.issued_date);
    if (expiryDate <= todayVN()) {
      throw new AppError(400, 'Ngày hết hạn mới phải sau ngày hôm nay', [
        { field: 'expiryDate', message: 'Ngày hết hạn mới phải sau ngày hôm nay' },
      ]);
    }
    await repo.updateCardExpiry(readerId, expiryDate, conn);
    return toReaderDto(await repo.findById(readerId, conn));
  });
}

// UC003 – Khóa / mở khóa thẻ. Thẻ khóa thì bị chặn lập phiếu mượn (UC007 5a).
async function setCardStatus(readerId, status) {
  return withTransaction(async (conn) => {
    const card = await lockReaderWithCard(readerId, conn);
    if (!card) throw new AppError(404, 'Độc giả chưa được cấp thẻ');
    if (card.status === status) {
      throw new AppError(409, status === 'LOCKED' ? 'Thẻ đã bị khóa từ trước' : 'Thẻ đang không bị khóa');
    }
    await repo.updateCardStatus(readerId, status, conn);
    return toReaderDto(await repo.findById(readerId, conn));
  });
}

module.exports = { list, getById, create, update, issueCard, renewCard, setCardStatus };
