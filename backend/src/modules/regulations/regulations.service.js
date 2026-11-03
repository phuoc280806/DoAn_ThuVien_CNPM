const { pool, withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const { todayVN, addDays } = require('../../utils/date');
const repo = require('./regulations.repository');
const { PARAMS, SNAPSHOT_PARAMS, toRegulationDto, toLogDto, toAffectedTicketDto } = require('./regulations.mapper');

const READER_TYPES = ['STUDENT', 'TEACHER'];
const TYPE_LABEL = { STUDENT: 'học sinh', TEACHER: 'giáo viên' };

/**
 * Quy định hiệu lực của một loại độc giả tại một ngày (mặc định hôm nay); null nếu chưa cấu hình.
 * Dùng ở UC007 khi lập phiếu để lấy snapshot.
 */
async function findEffective(readerType, date = todayVN(), db = pool) {
  const row = await repo.findEffective(readerType, date, db);
  return row ? toRegulationDto(row) : null;
}

// Như findEffective nhưng báo lỗi khi chưa cấu hình (UC007 10a)
async function getEffective(readerType, date = todayVN(), db = pool) {
  const regulation = await findEffective(readerType, date, db);
  if (!regulation) throw new AppError(409, 'Chưa cấu hình quy định cho vai trò này');
  return regulation;
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

// ---------------------------------------------------------------------
// UC015 – Áp dụng quy định mới cho phiếu đang mượn
// ---------------------------------------------------------------------

function normalizeParams(params = []) {
  const mapped = params.map((p) => (p === 'dueDate' ? 'borrowDays' : p));
  return [...new Set(mapped)].filter((p) => SNAPSHOT_PARAMS[p]);
}

function summarizeValues(tickets, field) {
  const values = [...new Set(tickets.map((t) => t[field]).filter((v) => v !== undefined))];
  if (values.length === 0) return undefined;
  return values.length === 1 ? values[0] : values;
}

// Giá trị lưu vào ticket_snapshot_changes: tham số snapshot kèm hạn trả của từng cuốn
// dạng { due_dates: { <borrow_detail_id>: 'YYYY-MM-DD' } } để truy vết (bước 10)
function withDueDates(values, dueDates, key, include) {
  if (!include) return values;
  return { ...values, due_dates: Object.fromEntries(dueDates.map((d) => [d.borrowDetailId, d[key]])) };
}

/**
 * UC015 bước 5–6 – Kiểm tra lựa chọn, tìm các phiếu đang mượn thuộc phạm vi
 * và tính giá trị hiện tại → giá trị mới kèm cảnh báo chuyển sang quá hạn.
 */
async function planActiveLoans({ readerType, params, fixedDueDate = null }, conn = pool, { forUpdate = false } = {}) {
  const today = todayVN();
  if (fixedDueDate && fixedDueDate < today) {
    throw new AppError(400, 'Ngày thu hồi cố định không được ở quá khứ', [   // 5b
      { field: 'fixedDueDate', message: 'Ngày thu hồi cố định không được ở quá khứ' },
    ]);
  }

  const selectedParams = normalizeParams(params);
  if (selectedParams.length === 0) {
    throw new AppError(400, 'Cần chọn ít nhất một tham số áp dụng');        // 3a
  }

  const targetTypes = readerType === 'ALL' ? READER_TYPES : [readerType];
  const effectiveByType = {};
  for (const rt of targetTypes) {
    const reg = await repo.findEffective(rt, today, conn);
    if (!reg) throw new AppError(409, 'Chưa cấu hình quy định cho vai trò này');   // 5b
    effectiveByType[rt] = reg;
  }

  const activeTickets = await repo.listActiveTickets(readerType, conn, { forUpdate });
  if (activeTickets.length === 0) {
    throw new AppError(404, 'Không có phiếu đang mượn trong phạm vi đã chọn');     // 5a
  }

  const openDetails = await repo.listOpenDetailsByTickets(
    activeTickets.map((t) => t.borrow_id),
    conn,
    { forUpdate },
  );
  const detailsByBorrowId = new Map();
  for (const d of openDetails) {
    if (!detailsByBorrowId.has(d.borrow_id)) detailsByBorrowId.set(d.borrow_id, []);
    detailsByBorrowId.get(d.borrow_id).push(d);
  }

  const updatesDueDate = Boolean(fixedDueDate)
    || selectedParams.includes('borrowDays')
    || selectedParams.includes('renewDays');

  const tickets = [];
  for (const row of activeTickets) {
    const reg = effectiveByType[row.reader_type];
    const items = detailsByBorrowId.get(row.borrow_id) ?? [];

    const oldValues = {};
    const newValues = {};
    const snapUpdates = {};

    for (const param of selectedParams) {
      const { regColumn, snapColumn } = SNAPSHOT_PARAMS[param];
      oldValues[regColumn] = row[snapColumn];
      newValues[regColumn] = reg[regColumn];
      snapUpdates[snapColumn] = reg[regColumn];
    }

    const effBorrowDays = snapUpdates.snap_borrow_days ?? row.snap_borrow_days;
    const effRenewDays = snapUpdates.snap_renew_days ?? row.snap_renew_days;

    // Hạn trả tính riêng cho từng cuốn (mỗi cuốn có thể đã gia hạn số lần khác nhau)
    const dueDates = items.map((d) => ({
      borrowDetailId: d.borrow_detail_id,
      copyCode: d.copy_code,
      oldDueDate: d.due_date,
      newDueDate: fixedDueDate
        ?? (updatesDueDate ? addDays(row.borrow_date, effBorrowDays + d.renew_count * effRenewDays) : d.due_date),
    }));

    const wasOverdue = dueDates.some((d) => d.oldDueDate < today);
    const isOverdue = dueDates.some((d) => d.newDueDate < today);
    const willBecomeOverdue = !wasOverdue && isOverdue;

    const hasChange = Object.keys(newValues).some((k) => oldValues[k] !== newValues[k])
      || dueDates.some((d) => d.oldDueDate !== d.newDueDate);

    if (hasChange) {
      tickets.push({
        row,
        regulationId: reg.regulation_id,
        oldValues,
        newValues,
        snapUpdates,
        dueDates,
        wasOverdue,
        isOverdue,
        willBecomeOverdue,
      });
    }
  }

  if (tickets.length === 0) {
    throw new AppError(409, 'Các phiếu đang mượn trong phạm vi đã dùng đúng giá trị này, không có phiếu nào cần thay đổi');
  }

  const overdueWarningCount = tickets.filter((t) => t.willBecomeOverdue).length;
  return {
    readerType,
    selectedParams,
    fixedDueDate: fixedDueDate || null,
    updatesDueDate,
    effectiveByType,
    tickets,
    overdueWarningCount,
  };
}

// UC015 bước 4–6 – Xem trước các phiếu bị ảnh hưởng
async function previewActiveLoans(input) {
  const plan = await planActiveLoans(input);
  return {
    readerType: plan.readerType,
    params: plan.selectedParams,
    fixedDueDate: plan.fixedDueDate,
    totalAffected: plan.tickets.length,
    overdueWarningCount: plan.overdueWarningCount,
    tickets: plan.tickets.map((t) => toAffectedTicketDto(t.row, t)),
  };
}

// UC015 bước 7–12 – Áp dụng quy định mới cho phiếu đang mượn (1 transaction)
async function applyActiveLoans(input, actor) {
  return withTransaction(async (conn) => {
    const plan = await planActiveLoans(input, conn, { forUpdate: true });

    for (const t of plan.tickets) {
      await repo.updateTicketSnapshot(t.row.borrow_id, t.regulationId, t.snapUpdates, conn);
      for (const du of t.dueDates) {
        if (du.oldDueDate !== du.newDueDate) {
          await repo.updateDetailDueDate(du.borrowDetailId, du.newDueDate, conn);
        }
      }
    }

    const logOldValues = {};
    const logNewValues = {};
    const allKeys = new Set(plan.tickets.flatMap((t) => Object.keys(t.newValues)));
    for (const key of allKeys) {
      logOldValues[key] = summarizeValues(plan.tickets.map((t) => t.oldValues), key);
      logNewValues[key] = summarizeValues(plan.tickets.map((t) => t.newValues), key);
    }
    if (plan.fixedDueDate) logNewValues.fixed_due_date = plan.fixedDueDate;

    const logId = await repo.insertLog(
      {
        changeType: 'APPLY_ACTIVE_LOANS',
        readerType: plan.readerType === 'ALL' ? null : plan.readerType,
        regulationId: plan.readerType === 'ALL' ? null : plan.effectiveByType[plan.readerType].regulation_id,
        oldValues: logOldValues,
        newValues: logNewValues,
        effectiveFrom: todayVN(),
        reason: input.reason,
        affectedTickets: plan.tickets.length,
        changedBy: actor.userId,
      },
      conn,
    );

    await repo.insertSnapshotChanges(
      logId,
      plan.tickets.map((t) => ({
        borrowId: t.row.borrow_id,
        oldValues: withDueDates(t.oldValues, t.dueDates, 'oldDueDate', plan.updatesDueDate),
        newValues: withDueDates(t.newValues, t.dueDates, 'newDueDate', plan.updatesDueDate),
      })),
      conn,
    );

    return {
      logId,
      readerType: plan.readerType,
      params: plan.selectedParams,
      fixedDueDate: plan.fixedDueDate,
      reason: input.reason,
      affectedTickets: plan.tickets.length,
      overdueWarningCount: plan.overdueWarningCount,
      tickets: plan.tickets.map((t) => toAffectedTicketDto(t.row, t)),
    };
  });
}

module.exports = {
  findEffective,
  getEffective,
  overview,
  create,
  listLogs,
  previewActiveLoans,
  applyActiveLoans,
};
