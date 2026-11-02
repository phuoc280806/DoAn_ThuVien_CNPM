-- =====================================================================
-- schema.sql — Hệ thống quản lý thư viện trường THPT – Nhóm 07 (MySQL 8)
--
-- Phát triển từ database library_management của nhóm, bổ sung theo đặc tả N7:
--   snapshot quy định trên phiếu (phương án B), quy định riêng HS/GV,
--   thẻ thư viện, gia hạn theo từng cuốn, tình trạng sách khi trả,
--   thu phạt có người thu, nhật ký thay đổi quy định.
--
-- CẢNH BÁO: file này XÓA database thuvien_thpt rồi tạo lại từ đầu.
-- Chạy xong thì chạy tiếp seed.sql (hoặc dùng: cd backend && npm run db:reset).
-- =====================================================================

DROP DATABASE IF EXISTS thuvien_thpt;
CREATE DATABASE thuvien_thpt
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;   -- tìm kiếm không phân biệt hoa thường và dấu ("de men" ra "Dế Mèn")

USE thuvien_thpt;

-- ---------------------------------------------------------------------
-- NGƯỜI DÙNG, ĐỘC GIẢ, THẺ THƯ VIỆN (UC001–UC003)
-- ---------------------------------------------------------------------

CREATE TABLE roles (
  role_id   INT NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(50) NOT NULL,              -- READER, LIBRARIAN, ADMIN
  PRIMARY KEY (role_id),
  UNIQUE KEY uq_roles_name (role_name)
) ENGINE = InnoDB;

-- Tài khoản đăng nhập (UC001, UC002). Tài khoản độc giả: username = reader_code.
CREATE TABLE users (
  user_id       INT NOT NULL AUTO_INCREMENT,
  username      VARCHAR(50)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(100) DEFAULT NULL,
  phone         VARCHAR(20)  DEFAULT NULL,
  role_id       INT NOT NULL,
  status        ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_username (username),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (role_id)
) ENGINE = InnoDB;

-- Hồ sơ độc giả (UC003) do Thủ thư lập. user_id để trống khi Admin chưa cấp tài khoản (UC002).
CREATE TABLE readers (
  reader_id     INT NOT NULL AUTO_INCREMENT,
  user_id       INT DEFAULT NULL,
  reader_code   VARCHAR(20)  NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  reader_type   ENUM('STUDENT', 'TEACHER') NOT NULL,
  class_name    VARCHAR(20)  DEFAULT NULL,     -- lớp (học sinh)
  department    VARCHAR(50)  DEFAULT NULL,     -- tổ bộ môn (giáo viên)
  email         VARCHAR(100) DEFAULT NULL,     -- nhận email nhắc hạn (UC017)
  date_of_birth DATE DEFAULT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (reader_id),
  UNIQUE KEY uq_readers_user (user_id),
  UNIQUE KEY uq_readers_code (reader_code),
  CONSTRAINT fk_readers_user FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE = InnoDB;

-- Mỗi độc giả một thẻ; gia hạn thẻ thì cập nhật expiry_date.
-- "Hết hạn" không lưu mà tính từ expiry_date < hôm nay.
CREATE TABLE library_cards (
  card_id     INT NOT NULL AUTO_INCREMENT,
  reader_id   INT NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status      ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (card_id),
  UNIQUE KEY uq_cards_reader (reader_id),
  CONSTRAINT fk_cards_reader FOREIGN KEY (reader_id) REFERENCES readers (reader_id),
  CONSTRAINT chk_cards_dates CHECK (expiry_date > issued_date)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- SÁCH (UC004–UC006)
-- ---------------------------------------------------------------------

CREATE TABLE categories (
  category_id   INT NOT NULL AUTO_INCREMENT,
  category_name VARCHAR(100) NOT NULL,
  description   TEXT,
  PRIMARY KEY (category_id),
  UNIQUE KEY uq_categories_name (category_name)
) ENGINE = InnoDB;

-- Đầu sách. Đã có lịch sử mượn thì chỉ ẩn (is_hidden), không xóa.
CREATE TABLE books (
  book_id      INT NOT NULL AUTO_INCREMENT,
  isbn         CHAR(13)     NOT NULL,
  title        VARCHAR(255) NOT NULL,
  author       VARCHAR(150) NOT NULL,
  publisher    VARCHAR(150) NOT NULL,
  publish_year SMALLINT     NOT NULL,
  category_id  INT NOT NULL,
  description  TEXT,
  is_hidden    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (book_id),
  UNIQUE KEY uq_books_isbn (isbn),
  KEY idx_books_title (title),
  KEY idx_books_author (author),
  CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories (category_id)
) ENGINE = InnoDB;

-- Bản sách. copy_code dạng BS000001, backend sinh từ copy_id ngay sau INSERT (cùng transaction).
-- BORROWED chỉ được đổi qua lập phiếu (UC007) và trả sách (UC009).
CREATE TABLE book_copies (
  copy_id    INT NOT NULL AUTO_INCREMENT,
  book_id    INT NOT NULL,
  copy_code  VARCHAR(50) DEFAULT NULL,
  status     ENUM('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST') NOT NULL DEFAULT 'AVAILABLE',
  location   VARCHAR(100) DEFAULT NULL,
  note       VARCHAR(255) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (copy_id),
  UNIQUE KEY uq_copies_code (copy_code),
  KEY idx_copies_book_status (book_id, status),
  CONSTRAINT fk_copies_book FOREIGN KEY (book_id) REFERENCES books (book_id)
) ENGINE = InnoDB;

-- Lịch sử đổi trạng thái bản sách bằng tay (UC005).
CREATE TABLE copy_status_logs (
  log_id     INT NOT NULL AUTO_INCREMENT,
  copy_id    INT NOT NULL,
  old_status ENUM('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST') NOT NULL,
  new_status ENUM('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST') NOT NULL,
  reason     VARCHAR(255) DEFAULT NULL,
  changed_by INT NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  CONSTRAINT fk_copylogs_copy FOREIGN KEY (copy_id) REFERENCES book_copies (copy_id),
  CONSTRAINT fk_copylogs_user FOREIGN KEY (changed_by) REFERENCES users (user_id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- QUY ĐỊNH (UC013–UC015)
-- ---------------------------------------------------------------------

-- Mỗi lần đổi quy định tạo một dòng mới, KHÔNG sửa dòng cũ.
-- Quy định hiệu lực tại ngày D của một loại độc giả = dòng có effective_from <= D lớn nhất:
--   SELECT * FROM regulations
--   WHERE reader_type = ? AND effective_from <= ?
--   ORDER BY effective_from DESC LIMIT 1;
CREATE TABLE regulations (
  regulation_id     INT NOT NULL AUTO_INCREMENT,
  reader_type       ENUM('STUDENT', 'TEACHER') NOT NULL,
  max_books         INT NOT NULL,              -- QĐ01
  borrow_days       INT NOT NULL,              -- QĐ02
  fine_per_day      INT NOT NULL,              -- QĐ03 (đồng / ngày / cuốn)
  max_fine_per_book INT NOT NULL,              -- QĐ06 (đồng)
  renew_days        INT NOT NULL,              -- QĐ04
  effective_from    DATE NOT NULL,
  created_by        INT NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (regulation_id),
  UNIQUE KEY uq_regulations_type_date (reader_type, effective_from),
  CONSTRAINT fk_regulations_user FOREIGN KEY (created_by) REFERENCES users (user_id),
  CONSTRAINT chk_regulations_values CHECK (
    max_books >= 1 AND borrow_days >= 1 AND fine_per_day >= 0
    AND renew_days >= 0 AND max_fine_per_book >= fine_per_day
  )
) ENGINE = InnoDB;

-- Nhật ký thay đổi quy định (UC014).
--   CONFIG              : tạo quy định mới (UC013)
--   APPLY_ACTIVE_LOANS  : áp dụng quy định cho phiếu đang mượn (UC015) — bắt buộc có lý do
-- old_values / new_values dạng JSON, ví dụ {"borrow_days": 14} → {"borrow_days": 7}
CREATE TABLE regulation_logs (
  log_id           INT NOT NULL AUTO_INCREMENT,
  change_type      ENUM('CONFIG', 'APPLY_ACTIVE_LOANS') NOT NULL,
  reader_type      ENUM('STUDENT', 'TEACHER') DEFAULT NULL,   -- NULL = mọi loại độc giả
  regulation_id    INT DEFAULT NULL,
  old_values       JSON DEFAULT NULL,
  new_values       JSON NOT NULL,
  effective_from   DATE DEFAULT NULL,
  reason           VARCHAR(255) DEFAULT NULL,
  affected_tickets INT DEFAULT NULL,
  changed_by       INT NOT NULL,
  changed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  KEY idx_reglogs_changed_at (changed_at),
  CONSTRAINT fk_reglogs_regulation FOREIGN KEY (regulation_id) REFERENCES regulations (regulation_id),
  CONSTRAINT fk_reglogs_user FOREIGN KEY (changed_by) REFERENCES users (user_id),
  CONSTRAINT chk_reglogs_reason CHECK (change_type = 'CONFIG' OR reason IS NOT NULL)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- MƯỢN – TRẢ (UC007–UC010)
-- ---------------------------------------------------------------------

-- Phiếu mượn. Các cột snap_* là SNAPSHOT quy định lúc lập phiếu (phương án B):
-- tính phạt và gia hạn luôn dùng các cột này, không dùng bảng regulations.
-- Quá hạn KHÔNG lưu thành trạng thái mà tính từ borrow_details.due_date.
CREATE TABLE borrow_tickets (
  borrow_id              INT NOT NULL AUTO_INCREMENT,
  reader_id              INT NOT NULL,
  librarian_id           INT NOT NULL,
  regulation_id          INT NOT NULL,
  borrow_date            DATE NOT NULL,
  snap_borrow_days       INT NOT NULL,
  snap_fine_per_day      INT NOT NULL,
  snap_max_fine_per_book INT NOT NULL,
  snap_renew_days        INT NOT NULL,
  status                 ENUM('BORROWING', 'COMPLETED') NOT NULL DEFAULT 'BORROWING',
  completed_at           DATETIME DEFAULT NULL,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (borrow_id),
  KEY idx_tickets_reader_status (reader_id, status),
  KEY idx_tickets_borrow_date (borrow_date),
  CONSTRAINT fk_tickets_reader FOREIGN KEY (reader_id) REFERENCES readers (reader_id),
  CONSTRAINT fk_tickets_librarian FOREIGN KEY (librarian_id) REFERENCES users (user_id),
  CONSTRAINT fk_tickets_regulation FOREIGN KEY (regulation_id) REFERENCES regulations (regulation_id)
) ENGINE = InnoDB;

-- Từng cuốn trong phiếu. Hạn trả và số lần gia hạn tính theo từng cuốn (UC008).
-- return_date IS NULL nghĩa là đang mượn.
CREATE TABLE borrow_details (
  borrow_detail_id INT NOT NULL AUTO_INCREMENT,
  borrow_id        INT NOT NULL,
  copy_id          INT NOT NULL,
  due_date         DATE NOT NULL,
  renew_count      INT NOT NULL DEFAULT 0,
  return_date      DATETIME DEFAULT NULL,
  return_condition ENUM('GOOD', 'DAMAGED', 'LOST') DEFAULT NULL,
  return_note      VARCHAR(255) DEFAULT NULL,
  late_days        INT DEFAULT NULL,
  fine_amount      INT DEFAULT NULL,
  received_by      INT DEFAULT NULL,
  -- Một bản sách chỉ nằm trong tối đa MỘT dòng đang mượn
  active_copy_id   INT AS (IF(return_date IS NULL, copy_id, NULL)) STORED,
  PRIMARY KEY (borrow_detail_id),
  UNIQUE KEY uq_details_ticket_copy (borrow_id, copy_id),
  UNIQUE KEY uq_details_active_copy (active_copy_id),
  KEY idx_details_due_date (due_date),
  CONSTRAINT fk_details_ticket FOREIGN KEY (borrow_id) REFERENCES borrow_tickets (borrow_id),
  CONSTRAINT fk_details_copy FOREIGN KEY (copy_id) REFERENCES book_copies (copy_id),
  CONSTRAINT fk_details_receiver FOREIGN KEY (received_by) REFERENCES users (user_id),
  -- Chưa trả: không có thông tin trả. Đã trả: phải đủ tình trạng, số ngày trễ, tiền phạt, người nhận.
  CONSTRAINT chk_details_return CHECK (
    (return_date IS NULL AND return_condition IS NULL AND late_days IS NULL
       AND fine_amount IS NULL AND received_by IS NULL)
    OR (return_date IS NOT NULL AND return_condition IS NOT NULL AND late_days IS NOT NULL
       AND fine_amount IS NOT NULL AND received_by IS NOT NULL)
  ),
  -- Hư hỏng / Mất bắt buộc có ghi chú (UC009 7a)
  CONSTRAINT chk_details_note CHECK (
    return_condition IS NULL OR return_condition = 'GOOD' OR return_note IS NOT NULL
  )
) ENGINE = InnoDB;

-- Lịch sử gia hạn (UC008).
CREATE TABLE renewal_logs (
  renewal_id       INT NOT NULL AUTO_INCREMENT,
  borrow_detail_id INT NOT NULL,
  old_due_date     DATE NOT NULL,
  new_due_date     DATE NOT NULL,
  renewed_by       INT NOT NULL,
  renewed_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (renewal_id),
  CONSTRAINT fk_renewals_detail FOREIGN KEY (borrow_detail_id) REFERENCES borrow_details (borrow_detail_id),
  CONSTRAINT fk_renewals_user FOREIGN KEY (renewed_by) REFERENCES users (user_id),
  CONSTRAINT chk_renewals_dates CHECK (new_due_date > old_due_date)
) ENGINE = InnoDB;

-- Snapshot cũ / mới của từng phiếu khi Admin áp dụng quy định cho phiếu đang mượn (UC015).
CREATE TABLE ticket_snapshot_changes (
  change_id  INT NOT NULL AUTO_INCREMENT,
  log_id     INT NOT NULL,
  borrow_id  INT NOT NULL,
  old_values JSON NOT NULL,
  new_values JSON NOT NULL,
  PRIMARY KEY (change_id),
  CONSTRAINT fk_snapchanges_log FOREIGN KEY (log_id) REFERENCES regulation_logs (log_id),
  CONSTRAINT fk_snapchanges_ticket FOREIGN KEY (borrow_id) REFERENCES borrow_tickets (borrow_id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- TIỀN PHẠT (UC009–UC011)
-- ---------------------------------------------------------------------

-- Chỉ tạo khi tiền phạt > 0. Độc giả còn khoản UNPAID thì bị chặn mượn mới (QĐ05).
-- Khi thu (UC011): status = PAID, ghi paid_at và collected_by.
-- Biên lai điện tử lấy từ chính dòng này, mã biên lai = 'BL' + fine_id (ví dụ BL000002).
CREATE TABLE fines (
  fine_id          INT NOT NULL AUTO_INCREMENT,
  borrow_detail_id INT NOT NULL,
  reader_id        INT NOT NULL,
  late_days        INT NOT NULL,
  amount           INT NOT NULL,
  reason           VARCHAR(255) DEFAULT NULL,
  status           ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at          DATETIME DEFAULT NULL,
  collected_by     INT DEFAULT NULL,
  PRIMARY KEY (fine_id),
  UNIQUE KEY uq_fines_detail (borrow_detail_id),
  KEY idx_fines_reader_status (reader_id, status),
  KEY idx_fines_paid_at (paid_at),
  CONSTRAINT fk_fines_detail FOREIGN KEY (borrow_detail_id) REFERENCES borrow_details (borrow_detail_id),
  CONSTRAINT fk_fines_reader FOREIGN KEY (reader_id) REFERENCES readers (reader_id),
  CONSTRAINT fk_fines_collector FOREIGN KEY (collected_by) REFERENCES users (user_id),
  CONSTRAINT chk_fines_amount CHECK (amount > 0 AND late_days > 0),
  CONSTRAINT chk_fines_paid CHECK (
    (status = 'UNPAID' AND paid_at IS NULL AND collected_by IS NULL)
    OR (status = 'PAID' AND paid_at IS NOT NULL AND collected_by IS NOT NULL)
  )
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- NHẬT KÝ HỆ THỐNG, NHẮC HẠN (UC002, UC012, UC017)
-- ---------------------------------------------------------------------

-- Thao tác quản trị tài khoản (UC002 bước 8) và truy cập trái phép (UC012 7a).
CREATE TABLE audit_logs (
  log_id      INT NOT NULL AUTO_INCREMENT,
  user_id     INT DEFAULT NULL,
  action      VARCHAR(50) NOT NULL,      -- CREATE_USER, LOCK_USER, RESET_PASSWORD, CHANGE_ROLE, UNAUTHORIZED_ACCESS...
  target_type VARCHAR(50) DEFAULT NULL,
  target_id   INT DEFAULT NULL,
  detail      JSON DEFAULT NULL,
  ip_address  VARCHAR(45) DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (log_id),
  KEY idx_audit_created_at (created_at),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (user_id)
) ENGINE = InnoDB;

-- Email nhắc hạn (UC017 – COULD).
CREATE TABLE reminder_logs (
  reminder_id      INT NOT NULL AUTO_INCREMENT,
  borrow_detail_id INT NOT NULL,
  email            VARCHAR(100) NOT NULL,
  sent_by          INT NOT NULL,
  sent_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success          BOOLEAN NOT NULL,
  error_message    VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (reminder_id),
  CONSTRAINT fk_reminders_detail FOREIGN KEY (borrow_detail_id) REFERENCES borrow_details (borrow_detail_id),
  CONSTRAINT fk_reminders_user FOREIGN KEY (sent_by) REFERENCES users (user_id)
) ENGINE = InnoDB;
