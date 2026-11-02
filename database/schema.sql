-- =============================================================
-- Hệ thống quản lý thư viện trường THPT – Nhóm 07
-- Tạo cơ sở dữ liệu và các bảng (MySQL 8)
--
-- CẢNH BÁO: file này XÓA database thuvien_thpt rồi tạo lại từ đầu.
-- Chạy xong file này thì chạy tiếp seed.sql để có dữ liệu mẫu.
-- =============================================================

DROP DATABASE IF EXISTS thuvien_thpt;
CREATE DATABASE thuvien_thpt
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;   -- không phân biệt hoa thường và dấu khi tìm kiếm

USE thuvien_thpt;

-- -------------------------------------------------------------
-- Độc giả, tài khoản, thẻ thư viện (UC001–UC003)
-- -------------------------------------------------------------

CREATE TABLE readers (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reader_code   VARCHAR(20)  NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  reader_type   ENUM('STUDENT', 'TEACHER') NOT NULL,
  class_or_dept VARCHAR(50)  NULL,              -- lớp (học sinh) hoặc tổ bộ môn (giáo viên)
  email         VARCHAR(100) NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_readers_code UNIQUE (reader_code)
) ENGINE = InnoDB;

-- Tên đăng nhập của độc giả = mã độc giả; reader_id liên kết với hồ sơ.
-- Tài khoản Thủ thư / Admin không có reader_id.
CREATE TABLE accounts (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(20)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name     VARCHAR(100) NOT NULL,
  role          ENUM('STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN') NOT NULL,
  status        ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  reader_id     INT UNSIGNED NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_accounts_username UNIQUE (username),
  CONSTRAINT uq_accounts_reader UNIQUE (reader_id),
  CONSTRAINT fk_accounts_reader FOREIGN KEY (reader_id) REFERENCES readers (id),
  CONSTRAINT ck_accounts_reader_role CHECK (
    (role IN ('STUDENT', 'TEACHER')) = (reader_id IS NOT NULL)
  )
) ENGINE = InnoDB;

-- Mỗi độc giả có một thẻ; gia hạn thẻ thì cập nhật expiry_date.
-- "Hết hạn" không lưu trong status mà tính từ expiry_date.
CREATE TABLE library_cards (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reader_id   INT UNSIGNED NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status      ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_cards_reader UNIQUE (reader_id),
  CONSTRAINT fk_cards_reader FOREIGN KEY (reader_id) REFERENCES readers (id),
  CONSTRAINT ck_cards_dates CHECK (expiry_date > issued_date)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Sách (UC004–UC006)
-- -------------------------------------------------------------

CREATE TABLE categories (
  id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  CONSTRAINT uq_categories_name UNIQUE (name)
) ENGINE = InnoDB;

CREATE TABLE book_titles (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  isbn         CHAR(13)     NOT NULL,
  title        VARCHAR(255) NOT NULL,
  author       VARCHAR(150) NOT NULL,
  category_id  INT UNSIGNED NOT NULL,
  publisher    VARCHAR(150) NOT NULL,
  publish_year SMALLINT UNSIGNED NOT NULL,
  is_hidden    BOOLEAN NOT NULL DEFAULT FALSE,  -- đầu sách đã có lịch sử mượn thì chỉ ẩn, không xóa
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_titles_isbn UNIQUE (isbn),
  CONSTRAINT fk_titles_category FOREIGN KEY (category_id) REFERENCES categories (id),
  INDEX idx_titles_title (title),
  INDEX idx_titles_author (author)
) ENGINE = InnoDB;

-- copy_code dạng BS000001, sinh từ id ngay sau khi INSERT (cùng transaction).
CREATE TABLE book_copies (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  copy_code  VARCHAR(20) NULL,
  title_id   INT UNSIGNED NOT NULL,
  status     ENUM('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST') NOT NULL DEFAULT 'AVAILABLE',
  note       VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_copies_code UNIQUE (copy_code),
  CONSTRAINT fk_copies_title FOREIGN KEY (title_id) REFERENCES book_titles (id),
  INDEX idx_copies_title_status (title_id, status)
) ENGINE = InnoDB;

CREATE TABLE copy_status_logs (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  copy_id    INT UNSIGNED NOT NULL,
  old_status ENUM('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST') NOT NULL,
  new_status ENUM('AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST') NOT NULL,
  reason     VARCHAR(255) NULL,
  changed_by INT UNSIGNED NOT NULL,
  changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_copylogs_copy FOREIGN KEY (copy_id) REFERENCES book_copies (id),
  CONSTRAINT fk_copylogs_account FOREIGN KEY (changed_by) REFERENCES accounts (id)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Quy định (UC013–UC015)
-- -------------------------------------------------------------

-- Mỗi lần đổi quy định tạo một phiên bản mới, không sửa phiên bản cũ.
-- Quy định hiệu lực tại ngày D = phiên bản có effective_date <= D lớn nhất.
CREATE TABLE regulation_versions (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reader_type       ENUM('STUDENT', 'TEACHER') NOT NULL,
  max_books         TINYINT UNSIGNED  NOT NULL,   -- QĐ01
  loan_days         SMALLINT UNSIGNED NOT NULL,   -- QĐ02
  fine_per_day      INT UNSIGNED      NOT NULL,   -- QĐ03 (đồng / ngày / cuốn)
  max_fine_per_book INT UNSIGNED      NOT NULL,   -- QĐ06 (đồng)
  renew_days        SMALLINT UNSIGNED NOT NULL,   -- QĐ04
  effective_date    DATE NOT NULL,
  created_by        INT UNSIGNED NOT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_regulations_type_date UNIQUE (reader_type, effective_date),
  CONSTRAINT fk_regulations_account FOREIGN KEY (created_by) REFERENCES accounts (id),
  CONSTRAINT ck_regulations_values CHECK (
    max_books >= 1 AND loan_days >= 1 AND max_fine_per_book >= fine_per_day
  )
) ENGINE = InnoDB;

-- Nhật ký thay đổi quy định.
--   CONFIG              : tạo phiên bản mới (UC013)
--   APPLY_ACTIVE_LOANS  : áp dụng quy định cho phiếu đang mượn (UC015), bắt buộc có reason
-- old_values / new_values dạng JSON, ví dụ {"loan_days": 14, "fine_per_day": 1000}
CREATE TABLE regulation_logs (
  id                    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  change_type           ENUM('CONFIG', 'APPLY_ACTIVE_LOANS') NOT NULL,
  reader_type           ENUM('STUDENT', 'TEACHER') NULL,   -- NULL = áp dụng cho tất cả
  regulation_version_id INT UNSIGNED NULL,
  old_values            JSON NULL,
  new_values            JSON NOT NULL,
  effective_date        DATE NULL,
  reason                VARCHAR(255) NULL,
  affected_loans        INT UNSIGNED NULL,
  changed_by            INT UNSIGNED NOT NULL,
  changed_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reglogs_version FOREIGN KEY (regulation_version_id) REFERENCES regulation_versions (id),
  CONSTRAINT fk_reglogs_account FOREIGN KEY (changed_by) REFERENCES accounts (id),
  CONSTRAINT ck_reglogs_reason CHECK (change_type = 'CONFIG' OR reason IS NOT NULL),
  INDEX idx_reglogs_changed_at (changed_at)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Mượn – trả (UC007–UC010)
-- -------------------------------------------------------------

-- loan_code dạng PM000001. Các cột snap_* là snapshot quy định tại lúc lập phiếu
-- (phương án B): tính phạt và gia hạn luôn dùng các cột này, không dùng quy định hiện hành.
CREATE TABLE loans (
  id                     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  loan_code              VARCHAR(20) NULL,
  reader_id              INT UNSIGNED NOT NULL,
  librarian_id           INT UNSIGNED NOT NULL,
  regulation_version_id  INT UNSIGNED NOT NULL,
  loan_date              DATE NOT NULL,
  snap_loan_days         SMALLINT UNSIGNED NOT NULL,
  snap_fine_per_day      INT UNSIGNED      NOT NULL,
  snap_max_fine_per_book INT UNSIGNED      NOT NULL,
  snap_renew_days        SMALLINT UNSIGNED NOT NULL,
  status                 ENUM('OPEN', 'CLOSED') NOT NULL DEFAULT 'OPEN',
  closed_at              DATETIME NULL,
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_loans_code UNIQUE (loan_code),
  CONSTRAINT fk_loans_reader FOREIGN KEY (reader_id) REFERENCES readers (id),
  CONSTRAINT fk_loans_librarian FOREIGN KEY (librarian_id) REFERENCES accounts (id),
  CONSTRAINT fk_loans_regulation FOREIGN KEY (regulation_version_id) REFERENCES regulation_versions (id),
  INDEX idx_loans_reader_status (reader_id, status),
  INDEX idx_loans_date (loan_date)
) ENGINE = InnoDB;

-- Mỗi dòng là một cuốn trong phiếu. Hạn trả và số lần gia hạn tính theo từng cuốn.
-- Các cột return_* / late_days / fine_amount chỉ có giá trị sau khi trả.
CREATE TABLE loan_items (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  loan_id          INT UNSIGNED NOT NULL,
  copy_id          INT UNSIGNED NOT NULL,
  due_date         DATE NOT NULL,
  renew_count      TINYINT UNSIGNED NOT NULL DEFAULT 0,
  returned_date    DATE NULL,
  return_condition ENUM('GOOD', 'DAMAGED', 'LOST') NULL,
  return_note      VARCHAR(255) NULL,
  late_days        INT UNSIGNED NULL,
  fine_amount      INT UNSIGNED NULL,
  received_by      INT UNSIGNED NULL,
  -- Một bản sách chỉ được nằm trong tối đa một dòng chưa trả
  active_copy_id   INT UNSIGNED AS (IF(returned_date IS NULL, copy_id, NULL)) STORED,
  CONSTRAINT uq_items_loan_copy UNIQUE (loan_id, copy_id),
  CONSTRAINT uq_items_active_copy UNIQUE (active_copy_id),
  CONSTRAINT fk_items_loan FOREIGN KEY (loan_id) REFERENCES loans (id),
  CONSTRAINT fk_items_copy FOREIGN KEY (copy_id) REFERENCES book_copies (id),
  CONSTRAINT fk_items_receiver FOREIGN KEY (received_by) REFERENCES accounts (id),
  CONSTRAINT ck_items_returned CHECK (
    (returned_date IS NULL AND return_condition IS NULL)
    OR (returned_date IS NOT NULL AND return_condition IS NOT NULL
        AND late_days IS NOT NULL AND fine_amount IS NOT NULL)
  ),
  INDEX idx_items_due (due_date)
) ENGINE = InnoDB;

CREATE TABLE renewal_logs (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  loan_item_id INT UNSIGNED NOT NULL,
  old_due_date DATE NOT NULL,
  new_due_date DATE NOT NULL,
  renewed_by   INT UNSIGNED NOT NULL,
  renewed_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_renewals_item FOREIGN KEY (loan_item_id) REFERENCES loan_items (id),
  CONSTRAINT fk_renewals_account FOREIGN KEY (renewed_by) REFERENCES accounts (id)
) ENGINE = InnoDB;

-- Lưu snapshot cũ / mới của từng phiếu khi Admin áp dụng quy định cho phiếu đang mượn (UC015).
CREATE TABLE loan_snapshot_changes (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  regulation_log_id INT UNSIGNED NOT NULL,
  loan_id           INT UNSIGNED NOT NULL,
  old_values        JSON NOT NULL,
  new_values        JSON NOT NULL,
  CONSTRAINT fk_snapchanges_log FOREIGN KEY (regulation_log_id) REFERENCES regulation_logs (id),
  CONSTRAINT fk_snapchanges_loan FOREIGN KEY (loan_id) REFERENCES loans (id)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Tiền phạt (UC009–UC011)
-- -------------------------------------------------------------

-- fine_code dạng KP000001. Chỉ tạo khi tiền phạt > 0.
-- Độc giả còn khoản UNPAID thì bị chặn mượn mới (QĐ05).
CREATE TABLE fines (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  fine_code    VARCHAR(20) NULL,
  loan_item_id INT UNSIGNED NOT NULL,
  reader_id    INT UNSIGNED NOT NULL,
  late_days    INT UNSIGNED NOT NULL,
  amount       INT UNSIGNED NOT NULL,
  status       ENUM('UNPAID', 'PAID') NOT NULL DEFAULT 'UNPAID',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at      DATETIME NULL,
  CONSTRAINT uq_fines_code UNIQUE (fine_code),
  CONSTRAINT uq_fines_item UNIQUE (loan_item_id),
  CONSTRAINT fk_fines_item FOREIGN KEY (loan_item_id) REFERENCES loan_items (id),
  CONSTRAINT fk_fines_reader FOREIGN KEY (reader_id) REFERENCES readers (id),
  CONSTRAINT ck_fines_amount CHECK (amount > 0),
  INDEX idx_fines_reader_status (reader_id, status)
) ENGINE = InnoDB;

-- Biên lai điện tử, receipt_code dạng BL000001. Mỗi khoản phạt thu đủ một lần.
CREATE TABLE receipts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  receipt_code VARCHAR(20) NULL,
  fine_id      INT UNSIGNED NOT NULL,
  amount       INT UNSIGNED NOT NULL,
  collected_by INT UNSIGNED NOT NULL,
  collected_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_receipts_code UNIQUE (receipt_code),
  CONSTRAINT uq_receipts_fine UNIQUE (fine_id),
  CONSTRAINT fk_receipts_fine FOREIGN KEY (fine_id) REFERENCES fines (id),
  CONSTRAINT fk_receipts_account FOREIGN KEY (collected_by) REFERENCES accounts (id),
  INDEX idx_receipts_collected_at (collected_at)
) ENGINE = InnoDB;

-- -------------------------------------------------------------
-- Nhật ký hệ thống, nhắc hạn (UC002, UC012, UC017)
-- -------------------------------------------------------------

-- Thao tác quản trị tài khoản (UC002) và truy cập trái phép (UC012 7a).
CREATE TABLE audit_logs (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  account_id  INT UNSIGNED NULL,
  action      VARCHAR(50) NOT NULL,      -- ví dụ CREATE_ACCOUNT, LOCK_ACCOUNT, UNAUTHORIZED_ACCESS
  target_type VARCHAR(50) NULL,
  target_id   INT UNSIGNED NULL,
  detail      JSON NULL,
  ip_address  VARCHAR(45) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_account FOREIGN KEY (account_id) REFERENCES accounts (id),
  INDEX idx_audit_created_at (created_at)
) ENGINE = InnoDB;

CREATE TABLE reminder_logs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  loan_item_id  INT UNSIGNED NOT NULL,
  email         VARCHAR(100) NOT NULL,
  sent_by       INT UNSIGNED NOT NULL,
  sent_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success       BOOLEAN NOT NULL,
  error_message VARCHAR(255) NULL,
  CONSTRAINT fk_reminders_item FOREIGN KEY (loan_item_id) REFERENCES loan_items (id),
  CONSTRAINT fk_reminders_account FOREIGN KEY (sent_by) REFERENCES accounts (id)
) ENGINE = InnoDB;
