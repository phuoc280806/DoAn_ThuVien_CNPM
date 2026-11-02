const { pool } = require('../config/db');

/**
 * Ghi một dòng audit_logs. Truyền conn khi đang trong transaction
 * để nhật ký được lưu (hoặc hoàn tác) cùng với thao tác chính.
 *
 *   await writeAudit({ userId: req.user.userId, action: 'LOCK_USER',
 *                      targetType: 'USER', targetId: 5, detail: { ... }, ip: req.ip }, conn);
 */
async function writeAudit({ userId, action, targetType = null, targetId = null, detail = null, ip = null }, db = pool) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, target_type, target_id, detail, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, action, targetType, targetId, detail ? JSON.stringify(detail) : null, ip],
  );
}

module.exports = { writeAudit };
