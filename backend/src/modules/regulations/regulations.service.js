const { pool, withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const { todayVN } = require('../../utils/date');
const repo = require('./regulations.repository');
const { PARAMS, toRegulationDto, toLogDto } = require('./regulations.mapper');

const READER_TYPES = ['STUDENT', 'TEACHER'];
const TYPE_LABEL = { STUDENT: 'học sinh', TEACHER: 'giáo viên' };

/**
 * Quy định hiệu lực của một loại độc giả tại một ngày (mặc định hôm nay).
 * Dùng ở UC007 khi lập phiếu để lấy snapshot. Chưa cấu hình thì báo lỗi (UC007 10a).
 */
async function getEffective(readerType, date = todayVN(), db = pool) {
  const row = await repo.findEffective(readerType, date, db);
  if (!row) throw new AppError(409, 'Chưa cấu hình quy định cho vai trò này');
  return toRegulationDto(row);
}

// UC013 bước 2 – Quy định đang hiệu lực và các phiên bản (đã / đang / sắp hiệu lực) theo từng loại độc giả
async function overview() {
  const today = todayVN();
  const rows = await repo.listVersions();

  return READER_TYPES.map((readerType) => {
    const versions = rows.filter((r) => r.reader_type === readerType);   // mới nhất trước
    const currentRow = versions.find((r) => r.effective_from <= today) ?? null;
    return {
      readerType,
      current: currentRow ? toRegulationDto(currentRow) : null,
      versions: versions.map((r) => toRegulationDto(
        r,
        r.effective_from > today ? 'UPCOMING' : r === currentRow ? 'CURRENT' : 'PAST',
      )),
    };
  });
}

// Chỉ giữ các tham số có thay đổi, khóa JSON theo tên cột: { borrow_days: 7 }
function diff(before, after) {
  const oldValues = {};
  const newValues = {};
  for (const [param, column] of Object.entries(PARAMS)) {
    if (!before || before[column] !== after[param]) {
      if (before) oldValues[column] = before[column];
      newValues[column] = after[param];
    }
  }
  return { oldValues: before ? oldValues : null, newValues };
}

/**
 * UC013 – Cấu hình quy định: tạo phiên bản mới, không sửa phiên bản cũ.
 * Phiếu đã lập không bị ảnh hưởng vì dùng snapshot (phương án B).
 */
async function create(data, actor) {
  if (data.effectiveFrom < todayVN()) {
    throw new AppError(400, 'Ngày hiệu lực không được ở quá khứ', [
      { field: 'effectiveFrom', message: 'Ngày hiệu lực không được ở quá khứ' },
    ]);
  }

  return withTransaction(async (conn) => {
    // 6c: mỗi loại độc giả chỉ có một phiên bản cho mỗi ngày hiệu lực
    if (await repo.existsOnDate(data.readerType, data.effectiveFrom, conn)) {
      throw new AppError(409,
        `Đã có quy định cho ${TYPE_LABEL[data.readerType]} hiệu lực ngày ${data.effectiveFrom}, hãy chọn ngày khác`);
    }

    // 4a: so với quy định sẽ đang áp dụng vào ngày hiệu lực mới
    const before = await repo.findEffective(data.readerType, data.effectiveFrom, conn);
    const { oldValues, newValues } = diff(before, data);
    if (Object.keys(newValues).length === 0) {
      throw new AppError(400, 'Chưa có thay đổi nào so với quy định hiện hành');
    }

    const regulationId = await repo.insert({ ...data, createdBy: actor.userId }, conn);
    await repo.insertLog(
      {
        changeType: 'CONFIG',
        readerType: data.readerType,
        regulationId,
        oldValues,
        newValues,
        effectiveFrom: data.effectiveFrom,
        changedBy: actor.userId,
      },
      conn,
    );

    return toRegulationDto(await repo.findById(regulationId, conn));
  });
}

// UC014 – Xem nhật ký thay đổi quy định (chỉ đọc)
async function listLogs({ from, to, readerType, changedBy, page = 1, pageSize = 20 }) {
  if (from && to && from > to) {
    throw new AppError(400, 'Khoảng thời gian không hợp lệ');   // 4a
  }
  const { rows, total } = await repo.searchLogs({
    from, to, readerType, changedBy, limit: pageSize, offset: (page - 1) * pageSize,
  });
  return { items: rows.map(toLogDto), page, pageSize, total };
}

module.exports = { getEffective, overview, create, listLogs };
