function toReaderDto(row) {
  return {
    readerId: row.reader_id,
    readerCode: row.reader_code,
    fullName: row.full_name,
    readerType: row.reader_type,
    className: row.class_name,
    department: row.department,
    email: row.email,
    dateOfBirth: row.date_of_birth,
    createdAt: row.created_at,
    // Tài khoản đăng nhập do Admin cấp ở UC002; null nếu chưa cấp
    account: row.user_id ? { userId: row.user_id, username: row.username, status: row.account_status } : null,
    card: row.card_id
      ? {
          cardId: row.card_id,
          issuedDate: row.issued_date,
          expiryDate: row.expiry_date,
          status: row.card_effective_status,   // ACTIVE | EXPIRED | LOCKED
        }
      : null,
  };
}

module.exports = { toReaderDto };
