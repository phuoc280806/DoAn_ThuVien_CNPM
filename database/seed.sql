-- =============================================================
-- Dữ liệu mẫu – chạy SAU schema.sql
--
-- Mật khẩu mọi tài khoản: Thuvien@2026
-- Ngày tháng tính lùi từ ngày chạy file (CURDATE()) nên các tình huống
-- thử nghiệm luôn đúng, ví dụ HS2026004 luôn trễ đúng 5 ngày nếu trả hôm nay.
--
-- Tài khoản và tình huống:
--   AD001      Admin
--   TT01, TT02 Thủ thư
--   HS2026001  Không mượn gì              → TH1: mượn 2 cuốn bình thường
--   HS2026002  Đang mượn 3/3 cuốn         → TH2: mượn thêm bị từ chối
--   HS2026003  1 cuốn, còn 2 ngày đến hạn → TH3: trả đúng hạn; có trong danh sách nhắc hạn
--   HS2026004  1 cuốn, quá hạn 5 ngày     → TH4: trả hôm nay phạt 5.000đ; đang bị chặn mượn
--   HS2026005  Còn nợ phạt 3.000đ         → TH5: bị chặn mượn mới
--   HS2026006  1 cuốn, quá hạn 45 ngày, phiếu lập theo quy định cũ 14 ngày
--                                         → TH4 (chạm mức tối đa 30.000đ) và TH6 (snapshot)
--   HS2026007  Thẻ hết hạn                → bị chặn lập phiếu
--   HS2026008  1 cuốn đã gia hạn 1 lần    → gia hạn lần 2 bị từ chối
--   HS2026009  Thẻ bị khóa                → bị chặn lập phiếu
--   HS2026010  Tài khoản bị khóa          → không đăng nhập được
--   GV2026001  Đang mượn 2 cuốn
--   GV2026002  Có lịch sử trả trễ, đã nộp phạt 4.000đ (có biên lai)
--   GV2026003  Không mượn gì
-- =============================================================

USE thuvien_thpt;

SET @today = CURDATE();
SET @pw = '$2b$10$KeaugFykNsjEEVNgyx0C..0C8aRQeZfnnb2iHr.J7qGadtlG6glea';  -- Thuvien@2026

-- -------------------------------------------------------------
-- Thể loại
-- -------------------------------------------------------------
INSERT INTO categories (name) VALUES
  ('Văn học'), ('Toán học'), ('Vật lý'), ('Hóa học'), ('Sinh học'), ('Tin học'),
  ('Lịch sử'), ('Địa lý'), ('Ngoại ngữ'), ('Kỹ năng sống'), ('Tham khảo – Từ điển');

-- -------------------------------------------------------------
-- Độc giả
-- -------------------------------------------------------------
INSERT INTO readers (reader_code, full_name, reader_type, class_or_dept, email) VALUES
  ('HS2026001', 'Trần Thị Bình',    'STUDENT', '11A3',         'hs2026001@thptmau.edu.vn'),
  ('HS2026002', 'Lê Minh Châu',     'STUDENT', '11A3',         'hs2026002@thptmau.edu.vn'),
  ('HS2026003', 'Phạm Gia Huy',     'STUDENT', '10A1',         'hs2026003@thptmau.edu.vn'),
  ('HS2026004', 'Võ Ngọc Hân',      'STUDENT', '10A2',         'hs2026004@thptmau.edu.vn'),
  ('HS2026005', 'Đặng Quốc Khánh',  'STUDENT', '12A1',         'hs2026005@thptmau.edu.vn'),
  ('HS2026006', 'Bùi Thanh Tâm',    'STUDENT', '12A2',         NULL),
  ('HS2026007', 'Hoàng Anh Thư',    'STUDENT', '11A1',         'hs2026007@thptmau.edu.vn'),
  ('HS2026008', 'Ngô Đức Minh',     'STUDENT', '10A3',         'hs2026008@thptmau.edu.vn'),
  ('HS2026009', 'Đỗ Khánh Linh',    'STUDENT', '12A3',         'hs2026009@thptmau.edu.vn'),
  ('HS2026010', 'Huỳnh Tấn Phát',   'STUDENT', '11A2',         'hs2026010@thptmau.edu.vn'),
  ('GV2026001', 'Nguyễn Thị Hoa',   'TEACHER', 'Tổ Ngữ văn',   'gv2026001@thptmau.edu.vn'),
  ('GV2026002', 'Trần Văn Nam',     'TEACHER', 'Tổ Toán',      'gv2026002@thptmau.edu.vn'),
  ('GV2026003', 'Lê Thị Mai',       'TEACHER', 'Tổ Tin học',   'gv2026003@thptmau.edu.vn');

-- -------------------------------------------------------------
-- Tài khoản
-- -------------------------------------------------------------
INSERT INTO accounts (username, password_hash, full_name, role) VALUES
  ('AD001', @pw, 'Phạm Văn Đức',    'ADMIN'),
  ('TT01',  @pw, 'Nguyễn Thị Lan',  'LIBRARIAN'),
  ('TT02',  @pw, 'Trần Minh Tuấn',  'LIBRARIAN');

-- Tài khoản độc giả: tên đăng nhập = mã độc giả
INSERT INTO accounts (username, password_hash, full_name, role, reader_id)
SELECT reader_code, @pw, full_name, reader_type, id FROM readers ORDER BY id;

UPDATE accounts SET status = 'LOCKED' WHERE username = 'HS2026010';

SET @ad001 = (SELECT id FROM accounts WHERE username = 'AD001');
SET @tt01  = (SELECT id FROM accounts WHERE username = 'TT01');
SET @tt02  = (SELECT id FROM accounts WHERE username = 'TT02');

-- -------------------------------------------------------------
-- Thẻ thư viện
-- -------------------------------------------------------------
INSERT INTO library_cards (reader_id, issued_date, expiry_date)
SELECT id, @today - INTERVAL 60 DAY, @today + INTERVAL 210 DAY FROM readers ORDER BY id;

UPDATE library_cards c JOIN readers r ON r.id = c.reader_id
SET c.issued_date = @today - INTERVAL 400 DAY, c.expiry_date = @today - INTERVAL 10 DAY
WHERE r.reader_code = 'HS2026007';

UPDATE library_cards c JOIN readers r ON r.id = c.reader_id
SET c.status = 'LOCKED'
WHERE r.reader_code = 'HS2026009';

-- -------------------------------------------------------------
-- Đầu sách (ISBN-13 hợp lệ, chỉ dùng làm dữ liệu mẫu)
-- -------------------------------------------------------------
INSERT INTO book_titles (isbn, title, author, category_id, publisher, publish_year) VALUES
  ('9786041200371', 'Dế Mèn phiêu lưu ký',            'Tô Hoài',          (SELECT id FROM categories WHERE name = 'Văn học'),             'NXB Kim Đồng',                    2020),
  ('9786041200746', 'Tắt đèn',                        'Ngô Tất Tố',       (SELECT id FROM categories WHERE name = 'Văn học'),             'NXB Văn học',                     2019),
  ('9786041201118', 'Số đỏ',                          'Vũ Trọng Phụng',   (SELECT id FROM categories WHERE name = 'Văn học'),             'NXB Văn học',                     2018),
  ('9786041201484', 'Truyện Kiều',                    'Nguyễn Du',        (SELECT id FROM categories WHERE name = 'Văn học'),             'NXB Giáo dục Việt Nam',           2021),
  ('9786041201859', 'Chí Phèo',                       'Nam Cao',          (SELECT id FROM categories WHERE name = 'Văn học'),             'NXB Văn học',                     2020),
  ('9786041202221', 'Nhà giả kim',                    'Paulo Coelho',     (SELECT id FROM categories WHERE name = 'Văn học'),             'NXB Hội Nhà văn',                 2020),
  ('9786041202597', 'Đắc nhân tâm',                   'Dale Carnegie',    (SELECT id FROM categories WHERE name = 'Kỹ năng sống'),        'NXB Tổng hợp TP.HCM',             2021),
  ('9786041202962', 'Tuổi trẻ đáng giá bao nhiêu',    'Rosie Nguyễn',     (SELECT id FROM categories WHERE name = 'Kỹ năng sống'),        'NXB Hội Nhà văn',                 2018),
  ('9786041203334', 'Lược sử thời gian',              'Stephen Hawking',  (SELECT id FROM categories WHERE name = 'Vật lý'),              'NXB Trẻ',                         2019),
  ('9786041203709', 'Toán 11 – Tập một',              'Nhiều tác giả',    (SELECT id FROM categories WHERE name = 'Toán học'),            'NXB Giáo dục Việt Nam',           2023),
  ('9786041204072', 'Hóa học 12',                     'Nhiều tác giả',    (SELECT id FROM categories WHERE name = 'Hóa học'),             'NXB Giáo dục Việt Nam',           2024),
  ('9786041204447', 'Sinh học 10',                    'Nhiều tác giả',    (SELECT id FROM categories WHERE name = 'Sinh học'),            'NXB Giáo dục Việt Nam',           2022),
  ('9786041204812', 'Tin học 10',                     'Nhiều tác giả',    (SELECT id FROM categories WHERE name = 'Tin học'),             'NXB Giáo dục Việt Nam',           2022),
  ('9786041205185', 'Lập trình C++ cơ bản',           'Nhiều tác giả',    (SELECT id FROM categories WHERE name = 'Tin học'),             'NXB Thông tin và Truyền thông',   2021),
  ('9786041205550', 'Lịch sử Việt Nam bằng tranh',    'Trần Bạch Đằng',   (SELECT id FROM categories WHERE name = 'Lịch sử'),             'NXB Trẻ',                         2017),
  ('9786041205925', 'Địa lý 12',                      'Nhiều tác giả',    (SELECT id FROM categories WHERE name = 'Địa lý'),              'NXB Giáo dục Việt Nam',           2024),
  ('9786041206298', 'English Grammar in Use',         'Raymond Murphy',   (SELECT id FROM categories WHERE name = 'Ngoại ngữ'),           'Cambridge University Press',      2019),
  ('9786041206663', 'Từ điển Tiếng Việt',             'Hoàng Phê',        (SELECT id FROM categories WHERE name = 'Tham khảo – Từ điển'), 'NXB Đà Nẵng',                     2018),
  ('9786041207035', 'Vật lý 11 (bản cũ)',             'Nhiều tác giả',    (SELECT id FROM categories WHERE name = 'Vật lý'),              'NXB Giáo dục Việt Nam',           2007),
  ('9786041207400', 'Không gia đình',                 'Hector Malot',     (SELECT id FROM categories WHERE name = 'Văn học'),             'NXB Văn học',                     2019);

-- Đầu sách đã ẩn: độc giả tra cứu không thấy
UPDATE book_titles SET is_hidden = TRUE WHERE isbn = '9786041207035';

-- -------------------------------------------------------------
-- Bản sách: mỗi đầu sách 3 bản, mã BS000001 … BS000060
-- (đầu sách thứ t có các bản BS(3t-2), BS(3t-1), BS(3t))
-- -------------------------------------------------------------
INSERT INTO book_copies (title_id)
WITH RECURSIVE n AS (SELECT 1 AS k UNION ALL SELECT k + 1 FROM n WHERE k < 3)
SELECT t.id FROM book_titles t CROSS JOIN n ORDER BY t.id, n.k;

UPDATE book_copies SET copy_code = CONCAT('BS', LPAD(id, 6, '0'));

-- "Không gia đình" không còn bản khả dụng (UC006 8a)
UPDATE book_copies SET status = 'DAMAGED', note = 'Bìa sách bị rách'     WHERE copy_code IN ('BS000058', 'BS000059');
UPDATE book_copies SET status = 'LOST',    note = 'Độc giả báo mất sách' WHERE copy_code = 'BS000060';

INSERT INTO copy_status_logs (copy_id, old_status, new_status, reason, changed_by, changed_at)
SELECT id, 'AVAILABLE', status, note, @tt01, @today - INTERVAL 15 DAY + INTERVAL 10 HOUR
FROM book_copies WHERE copy_code IN ('BS000058', 'BS000059', 'BS000060');

-- -------------------------------------------------------------
-- Quy định
--   Phiên bản cũ (theo đặc tả ban đầu): HS 14 ngày, GV 30 ngày
--   Phiên bản hiện hành (nhóm chốt):     HS và GV đều 7 ngày, có hiệu lực từ 30 ngày trước
-- -------------------------------------------------------------
INSERT INTO regulation_versions
  (reader_type, max_books, loan_days, fine_per_day, max_fine_per_book, renew_days, effective_date, created_by, created_at)
VALUES
  ('STUDENT', 3, 14, 1000, 30000,  7, @today - INTERVAL 120 DAY, @ad001, @today - INTERVAL 121 DAY + INTERVAL 8 HOUR);
SET @v_hs_old = LAST_INSERT_ID();

INSERT INTO regulation_versions
  (reader_type, max_books, loan_days, fine_per_day, max_fine_per_book, renew_days, effective_date, created_by, created_at)
VALUES
  ('TEACHER', 5, 30, 1000, 30000, 14, @today - INTERVAL 120 DAY, @ad001, @today - INTERVAL 121 DAY + INTERVAL 8 HOUR);
SET @v_gv_old = LAST_INSERT_ID();

INSERT INTO regulation_versions
  (reader_type, max_books, loan_days, fine_per_day, max_fine_per_book, renew_days, effective_date, created_by, created_at)
VALUES
  ('STUDENT', 3, 7, 1000, 30000,  7, @today - INTERVAL 30 DAY, @ad001, @today - INTERVAL 35 DAY + INTERVAL 14 HOUR);
SET @v_hs = LAST_INSERT_ID();

INSERT INTO regulation_versions
  (reader_type, max_books, loan_days, fine_per_day, max_fine_per_book, renew_days, effective_date, created_by, created_at)
VALUES
  ('TEACHER', 5, 7, 1000, 30000, 14, @today - INTERVAL 30 DAY, @ad001, @today - INTERVAL 35 DAY + INTERVAL 14 HOUR);
SET @v_gv = LAST_INSERT_ID();

INSERT INTO regulation_logs
  (change_type, reader_type, regulation_version_id, old_values, new_values, effective_date, changed_by, changed_at)
VALUES
  ('CONFIG', 'STUDENT', @v_hs_old, NULL,
   JSON_OBJECT('max_books', 3, 'loan_days', 14, 'fine_per_day', 1000, 'max_fine_per_book', 30000, 'renew_days', 7),
   @today - INTERVAL 120 DAY, @ad001, @today - INTERVAL 121 DAY + INTERVAL 8 HOUR),
  ('CONFIG', 'TEACHER', @v_gv_old, NULL,
   JSON_OBJECT('max_books', 5, 'loan_days', 30, 'fine_per_day', 1000, 'max_fine_per_book', 30000, 'renew_days', 14),
   @today - INTERVAL 120 DAY, @ad001, @today - INTERVAL 121 DAY + INTERVAL 8 HOUR),
  ('CONFIG', 'STUDENT', @v_hs,
   JSON_OBJECT('loan_days', 14), JSON_OBJECT('loan_days', 7),
   @today - INTERVAL 30 DAY, @ad001, @today - INTERVAL 35 DAY + INTERVAL 14 HOUR),
  ('CONFIG', 'TEACHER', @v_gv,
   JSON_OBJECT('loan_days', 30), JSON_OBJECT('loan_days', 7),
   @today - INTERVAL 30 DAY, @ad001, @today - INTERVAL 35 DAY + INTERVAL 14 HOUR);

-- -------------------------------------------------------------
-- Phiếu mượn
-- -------------------------------------------------------------

-- PM000001 – HS2026002 đang mượn 3/3 cuốn (TH2)
INSERT INTO loans (loan_code, reader_id, librarian_id, regulation_version_id, loan_date,
                   snap_loan_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days, created_at)
VALUES ('PM000001', (SELECT id FROM readers WHERE reader_code = 'HS2026002'), @tt01, @v_hs,
        @today - INTERVAL 3 DAY, 7, 1000, 30000, 7, @today - INTERVAL 3 DAY + INTERVAL 9 HOUR);
INSERT INTO loan_items (loan_id, copy_id, due_date)
SELECT LAST_INSERT_ID(), id, @today + INTERVAL 4 DAY
FROM book_copies WHERE copy_code IN ('BS000001', 'BS000004', 'BS000007');

-- PM000002 – HS2026003 còn 2 ngày đến hạn (TH3, nhắc hạn)
INSERT INTO loans (loan_code, reader_id, librarian_id, regulation_version_id, loan_date,
                   snap_loan_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days, created_at)
VALUES ('PM000002', (SELECT id FROM readers WHERE reader_code = 'HS2026003'), @tt01, @v_hs,
        @today - INTERVAL 5 DAY, 7, 1000, 30000, 7, @today - INTERVAL 5 DAY + INTERVAL 10 HOUR);
INSERT INTO loan_items (loan_id, copy_id, due_date)
SELECT LAST_INSERT_ID(), id, @today + INTERVAL 2 DAY
FROM book_copies WHERE copy_code = 'BS000010';

-- PM000003 – HS2026004 quá hạn 5 ngày (TH4)
INSERT INTO loans (loan_code, reader_id, librarian_id, regulation_version_id, loan_date,
                   snap_loan_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days, created_at)
VALUES ('PM000003', (SELECT id FROM readers WHERE reader_code = 'HS2026004'), @tt02, @v_hs,
        @today - INTERVAL 12 DAY, 7, 1000, 30000, 7, @today - INTERVAL 12 DAY + INTERVAL 14 HOUR);
INSERT INTO loan_items (loan_id, copy_id, due_date)
SELECT LAST_INSERT_ID(), id, @today - INTERVAL 5 DAY
FROM book_copies WHERE copy_code = 'BS000013';

-- PM000004 – HS2026006 lập theo quy định cũ 14 ngày, quá hạn 45 ngày (TH4 mức tối đa, TH6)
INSERT INTO loans (loan_code, reader_id, librarian_id, regulation_version_id, loan_date,
                   snap_loan_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days, created_at)
VALUES ('PM000004', (SELECT id FROM readers WHERE reader_code = 'HS2026006'), @tt02, @v_hs_old,
        @today - INTERVAL 59 DAY, 14, 1000, 30000, 7, @today - INTERVAL 59 DAY + INTERVAL 9 HOUR);
INSERT INTO loan_items (loan_id, copy_id, due_date)
SELECT LAST_INSERT_ID(), id, @today - INTERVAL 45 DAY
FROM book_copies WHERE copy_code = 'BS000016';

-- PM000005 – HS2026005 đã trả trễ 3 ngày, chưa nộp phạt (TH5)
INSERT INTO loans (loan_code, reader_id, librarian_id, regulation_version_id, loan_date,
                   snap_loan_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days,
                   status, closed_at, created_at)
VALUES ('PM000005', (SELECT id FROM readers WHERE reader_code = 'HS2026005'), @tt01, @v_hs,
        @today - INTERVAL 20 DAY, 7, 1000, 30000, 7,
        'CLOSED', @today - INTERVAL 10 DAY + INTERVAL 15 HOUR, @today - INTERVAL 20 DAY + INTERVAL 9 HOUR);
INSERT INTO loan_items (loan_id, copy_id, due_date, returned_date, return_condition,
                        late_days, fine_amount, received_by)
SELECT LAST_INSERT_ID(), id, @today - INTERVAL 13 DAY, @today - INTERVAL 10 DAY, 'GOOD', 3, 3000, @tt01
FROM book_copies WHERE copy_code = 'BS000019';
SET @item_hs005 = LAST_INSERT_ID();

-- PM000006 – GV2026001 đang mượn 2 cuốn
INSERT INTO loans (loan_code, reader_id, librarian_id, regulation_version_id, loan_date,
                   snap_loan_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days, created_at)
VALUES ('PM000006', (SELECT id FROM readers WHERE reader_code = 'GV2026001'), @tt01, @v_gv,
        @today - INTERVAL 2 DAY, 7, 1000, 30000, 14, @today - INTERVAL 2 DAY + INTERVAL 13 HOUR);
INSERT INTO loan_items (loan_id, copy_id, due_date)
SELECT LAST_INSERT_ID(), id, @today + INTERVAL 5 DAY
FROM book_copies WHERE copy_code IN ('BS000022', 'BS000025');

-- PM000007 – GV2026002 lập theo quy định cũ 30 ngày; 1 cuốn trả đúng hạn, 1 cuốn trễ 4 ngày, đã nộp phạt
INSERT INTO loans (loan_code, reader_id, librarian_id, regulation_version_id, loan_date,
                   snap_loan_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days,
                   status, closed_at, created_at)
VALUES ('PM000007', (SELECT id FROM readers WHERE reader_code = 'GV2026002'), @tt02, @v_gv_old,
        @today - INTERVAL 50 DAY, 30, 1000, 30000, 14,
        'CLOSED', @today - INTERVAL 16 DAY + INTERVAL 10 HOUR, @today - INTERVAL 50 DAY + INTERVAL 8 HOUR);
SET @pm7 = LAST_INSERT_ID();
INSERT INTO loan_items (loan_id, copy_id, due_date, returned_date, return_condition,
                        late_days, fine_amount, received_by)
SELECT @pm7, id, @today - INTERVAL 20 DAY, @today - INTERVAL 22 DAY, 'GOOD', 0, 0, @tt02
FROM book_copies WHERE copy_code = 'BS000028';
INSERT INTO loan_items (loan_id, copy_id, due_date, returned_date, return_condition,
                        late_days, fine_amount, received_by)
SELECT @pm7, id, @today - INTERVAL 20 DAY, @today - INTERVAL 16 DAY, 'GOOD', 4, 4000, @tt02
FROM book_copies WHERE copy_code = 'BS000031';
SET @item_gv002 = LAST_INSERT_ID();

-- PM000008 – HS2026008 đã gia hạn 1 lần (hạn ban đầu +1 ngày, sau gia hạn +8 ngày)
INSERT INTO loans (loan_code, reader_id, librarian_id, regulation_version_id, loan_date,
                   snap_loan_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days, created_at)
VALUES ('PM000008', (SELECT id FROM readers WHERE reader_code = 'HS2026008'), @tt01, @v_hs,
        @today - INTERVAL 6 DAY, 7, 1000, 30000, 7, @today - INTERVAL 6 DAY + INTERVAL 9 HOUR);
INSERT INTO loan_items (loan_id, copy_id, due_date, renew_count)
SELECT LAST_INSERT_ID(), id, @today + INTERVAL 8 DAY, 1
FROM book_copies WHERE copy_code = 'BS000034';
INSERT INTO renewal_logs (loan_item_id, old_due_date, new_due_date, renewed_by, renewed_at)
VALUES (LAST_INSERT_ID(), @today + INTERVAL 1 DAY, @today + INTERVAL 8 DAY, @tt01,
        @today - INTERVAL 1 DAY + INTERVAL 15 HOUR);

-- Bản sách đang nằm trong phiếu chưa trả → Đang mượn
UPDATE book_copies c JOIN loan_items i ON i.copy_id = c.id
SET c.status = 'BORROWED'
WHERE i.returned_date IS NULL;

-- -------------------------------------------------------------
-- Tiền phạt và biên lai
-- -------------------------------------------------------------
INSERT INTO fines (fine_code, loan_item_id, reader_id, late_days, amount, status, created_at)
VALUES ('KP000001', @item_hs005, (SELECT id FROM readers WHERE reader_code = 'HS2026005'),
        3, 3000, 'UNPAID', @today - INTERVAL 10 DAY + INTERVAL 15 HOUR);

INSERT INTO fines (fine_code, loan_item_id, reader_id, late_days, amount, status, created_at, paid_at)
VALUES ('KP000002', @item_gv002, (SELECT id FROM readers WHERE reader_code = 'GV2026002'),
        4, 4000, 'PAID', @today - INTERVAL 16 DAY + INTERVAL 10 HOUR, @today - INTERVAL 16 DAY + INTERVAL 10 HOUR);

INSERT INTO receipts (receipt_code, fine_id, amount, collected_by, collected_at)
VALUES ('BL000001', LAST_INSERT_ID(), 4000, @tt02, @today - INTERVAL 16 DAY + INTERVAL 10 HOUR);
