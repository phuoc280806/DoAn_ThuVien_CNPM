const bcrypt = require('bcryptjs');
const { withTransaction } = require('../../config/db');
const AppError = require('../../utils/AppError');
const { writeAudit } = require('../../utils/audit');
const ROLES = require('../../constants/roles');
const repo = require('./users.repository');
const { toUserDto } = require('./users.mapper');

const BCRYPT_ROUNDS = 10;

async function list({ keyword, role, status, page = 1, pageSize = 20 }) {
  const { rows, total } = await repo.search({
    keyword,
    role,
    status,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  return { items: rows.map(toUserDto), page, pageSize, total };
}

async function getById(userId) {
  const user = await repo.findById(userId);
  if (!user) throw new AppError(404, 'Không tìm thấy tài khoản');
  return toUserDto(user);
}

/**
 * Tạo tài khoản (UC002).
 * - Thủ thư / Admin: nhập tên đăng nhập, họ tên.
 * - Độc giả: tên đăng nhập = mã độc giả đã có hồ sơ (UC003); họ tên, email lấy từ hồ sơ.
 */
async function create(data, actor) {
  return withTransaction(async (conn) => {
    if (await repo.findByUsername(data.username, conn)) {
      throw new AppError(409, 'Tên đăng nhập đã tồn tại');
    }

    let reader = null;
    if (data.role === ROLES.READER) {
      reader = await repo.findReaderByCode(data.username, conn);
      if (!reader) {
        throw new AppError(404, `Không tìm thấy hồ sơ độc giả ${data.username}. Thủ thư cần lập hồ sơ độc giả trước`);
      }
      if (reader.user_id) {
        throw new AppError(409, `Độc giả ${data.username} đã có tài khoản`);
      }
    } else if (!data.fullName) {
      throw new AppError(400, 'Cần nhập họ và tên', [{ field: 'fullName', message: 'Cần nhập họ và tên' }]);
    }

    const userId = await repo.insert(
      {
        username: data.username,
        passwordHash: await bcrypt.hash(data.password, BCRYPT_ROUNDS),
        fullName: reader ? reader.full_name : data.fullName,
        email: data.email ?? reader?.email ?? null,
        phone: data.phone ?? null,
        roleId: await repo.findRoleId(data.role, conn),
      },
      conn,
    );
    if (reader) await repo.linkReader(reader.reader_id, userId, conn);

    await writeAudit(
      {
        userId: actor.userId,
        action: 'CREATE_USER',
        targetType: 'USER',
        targetId: userId,
        detail: { username: data.username, role: data.role },
        ip: actor.ip,
      },
      conn,
    );

    return toUserDto(await repo.findById(userId, conn));
  });
}

/**
 * UC002 7c: không khóa / hạ vai trò chính tài khoản đang đăng nhập,
 * và không khóa / hạ vai trò Admin đang hoạt động cuối cùng.
 */
async function assertCanRestrict(target, actor, conn) {
  if (target.user_id === actor.userId) {
    throw new AppError(409, 'Không thể khóa hoặc hạ vai trò chính tài khoản đang đăng nhập');
  }
  if (target.role === ROLES.ADMIN && target.status === 'ACTIVE' && (await repo.countActiveAdmins(conn)) <= 1) {
    throw new AppError(409, 'Không thể khóa hoặc hạ vai trò Admin duy nhất của hệ thống');
  }
}

async function findForUpdate(userId, conn) {
  const user = await repo.findById(userId, conn, { forUpdate: true });
  if (!user) throw new AppError(404, 'Không tìm thấy tài khoản');
  return user;
}

async function setStatus(userId, status, actor) {
  return withTransaction(async (conn) => {
    const target = await findForUpdate(userId, conn);
    if (target.status === status) {
      throw new AppError(409, status === 'LOCKED' ? 'Tài khoản đã bị khóa từ trước' : 'Tài khoản đang hoạt động');
    }
    if (status === 'LOCKED') await assertCanRestrict(target, actor, conn);

    await repo.updateStatus(userId, status, conn);
    await writeAudit(
      {
        userId: actor.userId,
        action: status === 'LOCKED' ? 'LOCK_USER' : 'UNLOCK_USER',
        targetType: 'USER',
        targetId: userId,
        detail: { username: target.username, oldStatus: target.status, newStatus: status },
        ip: actor.ip,
      },
      conn,
    );
    return toUserDto(await repo.findById(userId, conn));
  });
}

async function resetPassword(userId, password, actor) {
  return withTransaction(async (conn) => {
    const target = await findForUpdate(userId, conn);
    await repo.updatePassword(userId, await bcrypt.hash(password, BCRYPT_ROUNDS), conn);
    await writeAudit(
      {
        userId: actor.userId,
        action: 'RESET_PASSWORD',
        targetType: 'USER',
        targetId: userId,
        detail: { username: target.username },
        ip: actor.ip,
      },
      conn,
    );
    return toUserDto(target);
  });
}

/**
 * Đổi vai trò. Học sinh / Giáo viên là loại độc giả trong hồ sơ (readers.reader_type),
 * nên ở đây chỉ đổi qua lại giữa Thủ thư và Admin; tài khoản độc giả giữ vai trò READER.
 */
async function changeRole(userId, role, actor) {
  return withTransaction(async (conn) => {
    const target = await findForUpdate(userId, conn);
    if (target.role === role) {
      throw new AppError(409, 'Tài khoản đã có vai trò này');
    }
    if (target.role === ROLES.READER || role === ROLES.READER) {
      throw new AppError(409, 'Chỉ đổi được vai trò giữa Thủ thư và Admin. Tài khoản độc giả gắn với hồ sơ độc giả');
    }
    if (target.role === ROLES.ADMIN) await assertCanRestrict(target, actor, conn);

    await repo.updateRole(userId, await repo.findRoleId(role, conn), conn);
    await writeAudit(
      {
        userId: actor.userId,
        action: 'CHANGE_ROLE',
        targetType: 'USER',
        targetId: userId,
        detail: { username: target.username, oldRole: target.role, newRole: role },
        ip: actor.ip,
      },
      conn,
    );
    return toUserDto(await repo.findById(userId, conn));
  });
}

module.exports = { list, getById, create, setStatus, resetPassword, changeRole };
