// Chuyển dòng database (snake_case) sang dữ liệu trả về API (camelCase). Không bao giờ trả password_hash.
function toUserDto(row) {
  return {
    userId: row.user_id,
    username: row.username,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    reader: row.reader_id
      ? { readerId: row.reader_id, readerCode: row.reader_code, readerType: row.reader_type }
      : null,
  };
}

module.exports = { toUserDto };
