-- =====================================================================
-- seed.sql — Dữ liệu mẫu (chạy SAU schema.sql)
--
-- Cách chạy:   cd backend && npm run db:reset   (chạy cả schema.sql và seed.sql)
-- Hoặc Workbench: chạy schema.sql, rồi mở file này → Ctrl+Shift+Enter
--
-- Lưu ý:
--   - Mật khẩu mọi tài khoản: Thuvien@2026  (UC002 yêu cầu tối thiểu 8 ký tự)
--   - Ngày tháng tính lùi từ ngày chạy (CURDATE()), nên các tình huống luôn đúng:
--     ví dụ HS2026004 trả sách hôm nay luôn trễ đúng 5 ngày.
--
-- Quy định:
--   #1, #2  Quy định cũ (theo đặc tả ban đầu): HS 14 ngày, GV 30 ngày — hiệu lực từ 120 ngày trước
--   #3, #4  Quy định hiện hành (nhóm chốt): HS và GV đều 7 ngày — hiệu lực từ 30 ngày trước
--
-- Tài khoản và tình huống thử:
--   AD001        Admin
--   TT01, TT02   Thủ thư
--   HS2026001    Không mượn gì                       → TH1: mượn bình thường
--   HS2026002    Đang mượn 3/3 cuốn                  → TH2: mượn thêm bị từ chối
--   HS2026003    1 cuốn, còn 2 ngày đến hạn          → TH3: trả đúng hạn; có trong danh sách nhắc hạn
--   HS2026004    1 cuốn, quá hạn 5 ngày              → TH4: trả hôm nay phạt 5.000đ; đang bị chặn mượn
--   HS2026005    Còn nợ phạt 3.000đ                  → TH5: bị chặn mượn mới
--   HS2026006    1 cuốn quá hạn 45 ngày, phiếu lập theo quy định cũ 14 ngày
--                                                    → TH4: phạt chạm mức tối đa 30.000đ; TH6: snapshot
--   HS2026007    Thẻ hết hạn                         → bị chặn lập phiếu
--   HS2026008    1 cuốn đã gia hạn 1 lần             → gia hạn lần 2 bị từ chối
--   HS2026009    Thẻ bị khóa                         → bị chặn lập phiếu
--   HS2026010    Tài khoản bị khóa                   → không đăng nhập được
--   HS2026011    Có hồ sơ và thẻ nhưng chưa có tài khoản (UC003 làm trước UC002)
--   GV2026001    Đang mượn 2 cuốn
--   GV2026002    Có lịch sử: 1 cuốn trả đúng hạn, 1 cuốn trả trễ 4 ngày đã nộp phạt 4.000đ
--   GV2026003    Không mượn gì
-- =====================================================================

USE thuvien_thpt;

SET NAMES utf8mb4;
SET @today := CURDATE();
SET @pw    := '$2b$10$KeaugFykNsjEEVNgyx0C..0C8aRQeZfnnb2iHr.J7qGadtlG6glea';  -- bcrypt("Thuvien@2026")

-- ---------------------------------------------------------------------
-- 1. ROLES
-- ---------------------------------------------------------------------
INSERT INTO roles (role_id, role_name) VALUES
  (1, 'READER'),
  (2, 'LIBRARIAN'),
  (3, 'ADMIN');

-- ---------------------------------------------------------------------
-- 2. USERS — tài khoản độc giả có username = mã độc giả
-- ---------------------------------------------------------------------
INSERT INTO users (user_id, username, password_hash, full_name, email, phone, role_id, status) VALUES
  -- Quản trị viên, thủ thư
  ( 1, 'AD001',     @pw, 'Nguyễn Văn Quản',  'admin@thptmau.edu.vn',    '0900000001', 3, 'ACTIVE'),
  ( 2, 'TT01',      @pw, 'Trần Thị Thư',     'thuthu01@thptmau.edu.vn', '0900000002', 2, 'ACTIVE'),
  ( 3, 'TT02',      @pw, 'Phan Minh Tuấn',   'thuthu02@thptmau.edu.vn', '0900000003', 2, 'ACTIVE'),
  -- Độc giả: học sinh
  ( 4, 'HS2026001', @pw, 'Lê Minh An',       NULL, NULL, 1, 'ACTIVE'),
  ( 5, 'HS2026002', @pw, 'Phạm Thu Hà',      NULL, NULL, 1, 'ACTIVE'),
  ( 6, 'HS2026003', @pw, 'Võ Quốc Bảo',      NULL, NULL, 1, 'ACTIVE'),
  ( 7, 'HS2026004', @pw, 'Trần Gia Huy',     NULL, NULL, 1, 'ACTIVE'),
  ( 8, 'HS2026005', @pw, 'Nguyễn Khánh Vy',  NULL, NULL, 1, 'ACTIVE'),
  ( 9, 'HS2026006', @pw, 'Bùi Thanh Tâm',    NULL, NULL, 1, 'ACTIVE'),
  (10, 'HS2026007', @pw, 'Hoàng Anh Thư',    NULL, NULL, 1, 'ACTIVE'),
  (11, 'HS2026008', @pw, 'Ngô Đức Minh',     NULL, NULL, 1, 'ACTIVE'),
  (12, 'HS2026009', @pw, 'Đỗ Khánh Linh',    NULL, NULL, 1, 'ACTIVE'),
  (13, 'HS2026010', @pw, 'Đặng Ngọc Linh',   NULL, NULL, 1, 'LOCKED'),   -- bị khóa
  -- Độc giả: giáo viên
  (14, 'GV2026001', @pw, 'Bùi Thị Văn',      NULL, '0922000002', 1, 'ACTIVE'),
  (15, 'GV2026002', @pw, 'Hoàng Văn Toán',   NULL, '0922000001', 1, 'ACTIVE'),
  (16, 'GV2026003', @pw, 'Lê Thị Mai',       NULL, '0922000003', 1, 'ACTIVE');

-- ---------------------------------------------------------------------
-- 3. READERS
-- ---------------------------------------------------------------------
INSERT INTO readers (reader_id, user_id, reader_code, full_name, reader_type, class_name, department, email, date_of_birth) VALUES
  ( 1,    4, 'HS2026001', 'Lê Minh An',      'STUDENT', '10A1', NULL,         'an.le@student.thptmau.edu.vn',     '2010-03-12'),
  ( 2,    5, 'HS2026002', 'Phạm Thu Hà',     'STUDENT', '10A1', NULL,         'ha.pham@student.thptmau.edu.vn',   '2010-07-25'),
  ( 3,    6, 'HS2026003', 'Võ Quốc Bảo',     'STUDENT', '11B2', NULL,         'bao.vo@student.thptmau.edu.vn',    '2009-11-02'),
  ( 4,    7, 'HS2026004', 'Trần Gia Huy',    'STUDENT', '11B2', NULL,         'huy.tran@student.thptmau.edu.vn',  '2009-05-14'),
  ( 5,    8, 'HS2026005', 'Nguyễn Khánh Vy', 'STUDENT', '12C3', NULL,         'vy.nguyen@student.thptmau.edu.vn', '2008-08-08'),
  ( 6,    9, 'HS2026006', 'Bùi Thanh Tâm',   'STUDENT', '12C3', NULL,         NULL,                               '2008-02-20'),
  ( 7,   10, 'HS2026007', 'Hoàng Anh Thư',   'STUDENT', '11A1', NULL,         'thu.hoang@student.thptmau.edu.vn', '2009-09-30'),
  ( 8,   11, 'HS2026008', 'Ngô Đức Minh',    'STUDENT', '10A3', NULL,         'minh.ngo@student.thptmau.edu.vn',  '2010-12-01'),
  ( 9,   12, 'HS2026009', 'Đỗ Khánh Linh',   'STUDENT', '12A3', NULL,         'linh.do@student.thptmau.edu.vn',   '2008-04-17'),
  (10,   13, 'HS2026010', 'Đặng Ngọc Linh',  'STUDENT', '12C3', NULL,         'linh.dang@student.thptmau.edu.vn', '2008-01-18'),
  (11,   14, 'GV2026001', 'Bùi Thị Văn',     'TEACHER', NULL,   'Tổ Ngữ văn', 'van.bui@thptmau.edu.vn',           '1990-09-09'),
  (12,   15, 'GV2026002', 'Hoàng Văn Toán',  'TEACHER', NULL,   'Tổ Toán',    'toan.hoang@thptmau.edu.vn',        '1985-05-30'),
  (13,   16, 'GV2026003', 'Lê Thị Mai',      'TEACHER', NULL,   'Tổ Tin học', 'mai.le@thptmau.edu.vn',            '1988-06-15'),
  (14, NULL, 'HS2026011', 'Mai Phương Thảo', 'STUDENT', '10A2', NULL,         NULL,                               '2010-10-10');

-- ---------------------------------------------------------------------
-- 4. LIBRARY_CARDS — mặc định còn hiệu lực ~7 tháng
-- ---------------------------------------------------------------------
INSERT INTO library_cards (reader_id, issued_date, expiry_date, status)
SELECT reader_id, @today - INTERVAL 60 DAY, @today + INTERVAL 210 DAY, 'ACTIVE' FROM readers ORDER BY reader_id;

UPDATE library_cards SET issued_date = @today - INTERVAL 400 DAY, expiry_date = @today - INTERVAL 10 DAY
WHERE reader_id = 7;                                                       -- HS2026007: thẻ hết hạn
UPDATE library_cards SET status = 'LOCKED' WHERE reader_id = 9;            -- HS2026009: thẻ bị khóa

-- ---------------------------------------------------------------------
-- 5. CATEGORIES
-- ---------------------------------------------------------------------
INSERT INTO categories (category_id, category_name, description) VALUES
  (1, 'Sách giáo khoa', 'Sách giáo khoa theo chương trình THPT'),
  (2, 'Văn học',        'Tiểu thuyết, truyện ngắn, thơ'),
  (3, 'Khoa học',       'Sách phổ biến khoa học'),
  (4, 'Tham khảo',      'Sách bài tập, ôn thi, nâng cao'),
  (5, 'Kỹ năng sống',   'Phát triển bản thân, kỹ năng mềm'),
  (6, 'Ngoại ngữ',      'Sách học ngoại ngữ');

-- ---------------------------------------------------------------------
-- 6. BOOKS (đầu sách) — ISBN-13 hợp lệ, chỉ dùng làm dữ liệu mẫu
-- ---------------------------------------------------------------------
INSERT INTO books (book_id, isbn, title, author, publisher, publish_year, category_id, description, is_hidden) VALUES
  ( 1, '9786043000535', 'Ngữ văn 10',                'Bộ GD&ĐT',        'NXB Giáo dục Việt Nam', 2023, 1, 'Sách giáo khoa Ngữ văn lớp 10', FALSE),
  ( 2, '9786043001068', 'Toán 10',                   'Bộ GD&ĐT',        'NXB Giáo dục Việt Nam', 2023, 1, 'Sách giáo khoa Toán lớp 10', FALSE),
  ( 3, '9786043001594', 'Vật lí 11',                 'Bộ GD&ĐT',        'NXB Giáo dục Việt Nam', 2023, 1, 'Sách giáo khoa Vật lí lớp 11', FALSE),
  ( 4, '9786043002126', 'Dế Mèn phiêu lưu ký',       'Tô Hoài',         'NXB Kim Đồng',          2019, 2, 'Truyện thiếu nhi kinh điển', FALSE),
  ( 5, '9786043002652', 'Số đỏ',                     'Vũ Trọng Phụng',  'NXB Văn học',           2020, 2, 'Tiểu thuyết trào phúng', FALSE),
  ( 6, '9786043003185', 'Lược sử thời gian',         'Stephen Hawking', 'NXB Trẻ',               2018, 3, 'Phổ biến khoa học về vũ trụ', FALSE),
  ( 7, '9786043003710', 'Vật lý vui',                'Ya. Perelman',    'NXB Trẻ',               2015, 3, 'Thí nghiệm vật lý thú vị', FALSE),
  ( 8, '9786043004243', 'Ôn thi THPT Quốc gia Toán', 'Nhiều tác giả',   'NXB ĐHQG Hà Nội',       2024, 4, 'Bộ đề luyện thi', FALSE),
  ( 9, '9786043004779', 'Truyện Kiều',               'Nguyễn Du',       'NXB Giáo dục Việt Nam', 2021, 2, 'Truyện thơ Nôm', FALSE),
  (10, '9786043005301', 'Đắc nhân tâm',              'Dale Carnegie',   'NXB Tổng hợp TP.HCM',   2021, 5, 'Nghệ thuật giao tiếp', FALSE),
  (11, '9786043005837', 'English Grammar in Use',    'Raymond Murphy',  'Cambridge University Press', 2019, 6, 'Ngữ pháp tiếng Anh trình độ trung cấp', FALSE),
  -- Đầu sách đã ẩn: độc giả tra cứu không thấy (UC004)
  (12, '9786043006360', 'Vật lí 11 (chương trình cũ)', 'Bộ GD&ĐT',      'NXB Giáo dục Việt Nam', 2007, 1, 'Sách giáo khoa chương trình cũ', TRUE),
  -- Không còn bản nào khả dụng (UC006 8a)
  (13, '9786043006896', 'Không gia đình',            'Hector Malot',    'NXB Văn học',           2019, 2, 'Tiểu thuyết', FALSE),
  -- Bổ sung cho đủ tiêu chí nghiệm thu: tối thiểu 30 đầu sách / 60 bản sách
  (14, '9786043010374', 'Hóa học 10',                'Bộ GD&ĐT',        'NXB Giáo dục Việt Nam', 2023, 1, 'Sách giáo khoa Hóa học lớp 10', FALSE),
  (15, '9786043010749', 'Lịch sử 11',                'Bộ GD&ĐT',        'NXB Giáo dục Việt Nam', 2023, 1, 'Sách giáo khoa Lịch sử lớp 11', FALSE),
  (16, '9786043011111', 'Sinh học 12',               'Bộ GD&ĐT',        'NXB Giáo dục Việt Nam', 2024, 1, 'Sách giáo khoa Sinh học lớp 12', FALSE),
  (17, '9786043011487', 'Địa lí 12',                 'Bộ GD&ĐT',        'NXB Giáo dục Việt Nam', 2024, 1, 'Sách giáo khoa Địa lí lớp 12', FALSE),
  (18, '9786043011852', 'Tắt đèn',                   'Ngô Tất Tố',      'NXB Văn học',           2020, 2, 'Tiểu thuyết hiện thực phê phán', FALSE),
  (19, '9786043012224', 'Chí Phèo',                  'Nam Cao',         'NXB Văn học',           2021, 2, 'Tuyển tập truyện ngắn', FALSE),
  (20, '9786043012590', 'Cho tôi xin một vé đi tuổi thơ', 'Nguyễn Nhật Ánh', 'NXB Trẻ',          2022, 2, 'Truyện dài về tuổi thơ', FALSE),
  (21, '9786043012965', 'Nhật ký Đặng Thùy Trâm',    'Đặng Thùy Trâm',  'NXB Hội Nhà văn',       2020, 2, 'Nhật ký thời chiến', FALSE),
  (22, '9786043013337', 'Nhà giả kim',               'Paulo Coelho',    'NXB Hội Nhà văn',       2021, 2, 'Tiểu thuyết', FALSE),
  (23, '9786043013702', 'Vũ trụ trong vỏ hạt dẻ',    'Stephen Hawking', 'NXB Trẻ',               2019, 3, 'Phổ biến khoa học về không – thời gian', FALSE),
  (24, '9786043014075', 'Nguồn gốc các loài',        'Charles Darwin',  'NXB Tri thức',          2018, 3, 'Thuyết tiến hóa qua chọn lọc tự nhiên', FALSE),
  (25, '9786043014440', 'Ôn thi THPT Quốc gia Ngữ văn',   'Nhiều tác giả', 'NXB ĐHQG Hà Nội',    2024, 4, 'Bộ đề luyện thi', FALSE),
  (26, '9786043014815', 'Ôn thi THPT Quốc gia Tiếng Anh', 'Nhiều tác giả', 'NXB ĐHQG Hà Nội',    2024, 4, 'Bộ đề luyện thi', FALSE),
  (27, '9786043015188', 'Tuổi trẻ đáng giá bao nhiêu', 'Rosie Nguyễn',  'NXB Hội Nhà văn',       2020, 5, 'Sách phát triển bản thân', FALSE),
  (28, '9786043015553', '7 thói quen của bạn trẻ thành đạt', 'Sean Covey', 'NXB Tổng hợp TP.HCM', 2021, 5, 'Kỹ năng sống cho tuổi teen', FALSE),
  (29, '9786043015928', 'Oxford Word Skills',        'Ruth Gairns',     'Oxford University Press', 2020, 6, 'Từ vựng tiếng Anh theo chủ đề', FALSE),
  (30, '9786043016291', 'Tiếng Nhật cho mọi người – Sơ cấp 1', '3A Corporation', 'NXB Trẻ',     2022, 6, 'Giáo trình tiếng Nhật sơ cấp', FALSE);

-- ---------------------------------------------------------------------
-- 7. BOOK_COPIES — mỗi đầu sách 3 bản, mã BS000001 … BS000090
--    Đầu sách b có các bản copy_id = 3b-2, 3b-1, 3b. Kệ theo thể loại: A = SGK, B = Văn học, ...
-- ---------------------------------------------------------------------
INSERT INTO book_copies (copy_id, book_id, copy_code, location)
WITH RECURSIVE n AS (SELECT 1 AS k UNION ALL SELECT k + 1 FROM n WHERE k < 3)
SELECT (b.book_id - 1) * 3 + n.k,
       b.book_id,
       CONCAT('BS', LPAD((b.book_id - 1) * 3 + n.k, 6, '0')),
       CONCAT('Kệ ', ELT(b.category_id, 'A', 'B', 'C', 'D', 'E', 'F'), '1')
FROM books b CROSS JOIN n
ORDER BY b.book_id, n.k;

UPDATE book_copies SET status = 'DAMAGED', location = 'Kho', note = 'Bìa sách bị rách'     WHERE copy_id IN (37, 38);
UPDATE book_copies SET status = 'LOST',    location = NULL,  note = 'Độc giả báo mất sách' WHERE copy_id = 39;

INSERT INTO copy_status_logs (copy_id, old_status, new_status, reason, changed_by, changed_at) VALUES
  (37, 'AVAILABLE', 'DAMAGED', 'Bìa sách bị rách',     2, @today - INTERVAL 15 DAY + INTERVAL 10 HOUR),
  (38, 'AVAILABLE', 'DAMAGED', 'Bìa sách bị rách',     2, @today - INTERVAL 15 DAY + INTERVAL 10 HOUR),
  (39, 'AVAILABLE', 'LOST',    'Độc giả báo mất sách', 2, @today - INTERVAL 15 DAY + INTERVAL 10 HOUR);

-- ---------------------------------------------------------------------
-- 8. REGULATIONS + nhật ký thay đổi
-- ---------------------------------------------------------------------
INSERT INTO regulations (regulation_id, reader_type, max_books, borrow_days, fine_per_day, max_fine_per_book, renew_days, effective_from, created_by, created_at) VALUES
  (1, 'STUDENT', 3, 14, 1000, 30000,  7, @today - INTERVAL 120 DAY, 1, @today - INTERVAL 121 DAY + INTERVAL 8 HOUR),
  (2, 'TEACHER', 5, 30, 1000, 30000, 14, @today - INTERVAL 120 DAY, 1, @today - INTERVAL 121 DAY + INTERVAL 8 HOUR),
  (3, 'STUDENT', 3,  7, 1000, 30000,  7, @today - INTERVAL  30 DAY, 1, @today - INTERVAL  35 DAY + INTERVAL 14 HOUR),
  (4, 'TEACHER', 5,  7, 1000, 30000, 14, @today - INTERVAL  30 DAY, 1, @today - INTERVAL  35 DAY + INTERVAL 14 HOUR);

INSERT INTO regulation_logs (change_type, reader_type, regulation_id, old_values, new_values, effective_from, changed_by, changed_at) VALUES
  ('CONFIG', 'STUDENT', 1, NULL,
   JSON_OBJECT('max_books', 3, 'borrow_days', 14, 'fine_per_day', 1000, 'max_fine_per_book', 30000, 'renew_days', 7),
   @today - INTERVAL 120 DAY, 1, @today - INTERVAL 121 DAY + INTERVAL 8 HOUR),
  ('CONFIG', 'TEACHER', 2, NULL,
   JSON_OBJECT('max_books', 5, 'borrow_days', 30, 'fine_per_day', 1000, 'max_fine_per_book', 30000, 'renew_days', 14),
   @today - INTERVAL 120 DAY, 1, @today - INTERVAL 121 DAY + INTERVAL 8 HOUR),
  ('CONFIG', 'STUDENT', 3, JSON_OBJECT('borrow_days', 14), JSON_OBJECT('borrow_days', 7),
   @today - INTERVAL 30 DAY, 1, @today - INTERVAL 35 DAY + INTERVAL 14 HOUR),
  ('CONFIG', 'TEACHER', 4, JSON_OBJECT('borrow_days', 30), JSON_OBJECT('borrow_days', 7),
   @today - INTERVAL 30 DAY, 1, @today - INTERVAL 35 DAY + INTERVAL 14 HOUR);

-- ---------------------------------------------------------------------
-- 9. BORROW_TICKETS (phiếu mượn) — snap_* chép từ quy định hiệu lực tại ngày lập phiếu
-- ---------------------------------------------------------------------
INSERT INTO borrow_tickets (borrow_id, reader_id, librarian_id, regulation_id, borrow_date,
                            snap_borrow_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days,
                            status, completed_at, created_at) VALUES
  -- #1: HS2026002 mượn 3 cuốn → đạt giới hạn 3/3 (TH2)
  (1,  2, 2, 3, @today - INTERVAL  3 DAY,  7, 1000, 30000,  7, 'BORROWING', NULL,
       @today - INTERVAL  3 DAY + INTERVAL  9 HOUR),
  -- #2: HS2026003 còn 2 ngày đến hạn (TH3)
  (2,  3, 2, 3, @today - INTERVAL  5 DAY,  7, 1000, 30000,  7, 'BORROWING', NULL,
       @today - INTERVAL  5 DAY + INTERVAL 10 HOUR),
  -- #3: HS2026004 quá hạn 5 ngày (TH4)
  (3,  4, 3, 3, @today - INTERVAL 12 DAY,  7, 1000, 30000,  7, 'BORROWING', NULL,
       @today - INTERVAL 12 DAY + INTERVAL 14 HOUR),
  -- #4: HS2026006 lập theo QUY ĐỊNH CŨ 14 ngày, quá hạn 45 ngày (TH4 mức tối đa, TH6)
  (4,  6, 3, 1, @today - INTERVAL 59 DAY, 14, 1000, 30000,  7, 'BORROWING', NULL,
       @today - INTERVAL 59 DAY + INTERVAL  9 HOUR),
  -- #5: HS2026005 trả trễ 3 ngày, CHƯA nộp phạt (TH5)
  (5,  5, 2, 3, @today - INTERVAL 20 DAY,  7, 1000, 30000,  7, 'COMPLETED', @today - INTERVAL 10 DAY + INTERVAL 15 HOUR,
       @today - INTERVAL 20 DAY + INTERVAL  9 HOUR),
  -- #6: GV2026001 mượn 2 cuốn, còn hạn
  (6, 11, 2, 4, @today - INTERVAL  2 DAY,  7, 1000, 30000, 14, 'BORROWING', NULL,
       @today - INTERVAL  2 DAY + INTERVAL 13 HOUR),
  -- #7: GV2026002 lập theo quy định cũ 30 ngày; 1 cuốn đúng hạn, 1 cuốn trễ 4 ngày, đã nộp phạt
  (7, 12, 3, 2, @today - INTERVAL 50 DAY, 30, 1000, 30000, 14, 'COMPLETED', @today - INTERVAL 16 DAY + INTERVAL 10 HOUR,
       @today - INTERVAL 50 DAY + INTERVAL  8 HOUR),
  -- #8: HS2026008 đã gia hạn 1 lần
  (8,  8, 2, 3, @today - INTERVAL  6 DAY,  7, 1000, 30000,  7, 'BORROWING', NULL,
       @today - INTERVAL  6 DAY + INTERVAL  9 HOUR);

-- ---------------------------------------------------------------------
-- 10. BORROW_DETAILS (từng cuốn trong phiếu)
-- ---------------------------------------------------------------------
INSERT INTO borrow_details (borrow_detail_id, borrow_id, copy_id, due_date, renew_count,
                            return_date, return_condition, return_note, late_days, fine_amount, received_by) VALUES
  ( 1, 1,  1, @today + INTERVAL  4 DAY, 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ( 2, 1,  4, @today + INTERVAL  4 DAY, 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ( 3, 1,  7, @today + INTERVAL  4 DAY, 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ( 4, 2, 10, @today + INTERVAL  2 DAY, 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ( 5, 3, 13, @today - INTERVAL  5 DAY, 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ( 6, 4, 16, @today - INTERVAL 45 DAY, 0, NULL, NULL, NULL, NULL, NULL, NULL),
  -- hạn -13, trả -10 → trễ 3 ngày × 1.000đ
  ( 7, 5, 19, @today - INTERVAL 13 DAY, 0, @today - INTERVAL 10 DAY + INTERVAL 15 HOUR, 'GOOD', NULL, 3, 3000, 2),
  ( 8, 6, 22, @today + INTERVAL  5 DAY, 0, NULL, NULL, NULL, NULL, NULL, NULL),
  ( 9, 6, 25, @today + INTERVAL  5 DAY, 0, NULL, NULL, NULL, NULL, NULL, NULL),
  -- hạn -20, trả -22 → đúng hạn
  (10, 7, 28, @today - INTERVAL 20 DAY, 0, @today - INTERVAL 22 DAY + INTERVAL  9 HOUR, 'GOOD', NULL, 0,    0, 3),
  -- hạn -20, trả -16 → trễ 4 ngày × 1.000đ
  (11, 7, 31, @today - INTERVAL 20 DAY, 0, @today - INTERVAL 16 DAY + INTERVAL 10 HOUR, 'GOOD', NULL, 4, 4000, 3),
  -- hạn ban đầu +1, gia hạn thêm 7 ngày → +8
  (12, 8,  2, @today + INTERVAL  8 DAY, 1, NULL, NULL, NULL, NULL, NULL, NULL);

INSERT INTO renewal_logs (borrow_detail_id, old_due_date, new_due_date, renewed_by, renewed_at) VALUES
  (12, @today + INTERVAL 1 DAY, @today + INTERVAL 8 DAY, 2, @today - INTERVAL 1 DAY + INTERVAL 15 HOUR);

-- Bản sách đang nằm trong phiếu chưa trả → BORROWED
UPDATE book_copies c
JOIN borrow_details d ON d.copy_id = c.copy_id
SET c.status = 'BORROWED'
WHERE d.return_date IS NULL;

-- ---------------------------------------------------------------------
-- 11. FINES
-- ---------------------------------------------------------------------
INSERT INTO fines (fine_id, borrow_detail_id, reader_id, late_days, amount, reason, status, created_at, paid_at, collected_by) VALUES
  (1,  7,  5, 3, 3000, 'Trả sách trễ 3 ngày', 'UNPAID',
       @today - INTERVAL 10 DAY + INTERVAL 15 HOUR, NULL, NULL),
  (2, 11, 12, 4, 4000, 'Trả sách trễ 4 ngày', 'PAID',
       @today - INTERVAL 16 DAY + INTERVAL 10 HOUR, @today - INTERVAL 16 DAY + INTERVAL 10 HOUR + INTERVAL 5 MINUTE, 3);
