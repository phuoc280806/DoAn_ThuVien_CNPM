-- =====================================================================
-- test_borrow_return.sql — Diễn tập MƯỢN → GIA HẠN → TRẢ TRỄ → THU PHẠT → ĐỔI QUY ĐỊNH bằng SQL
--
-- Mục đích:
--   Kiểm chứng database đủ cho nghiệp vụ chính trước khi viết backend.
--   Mỗi khối dưới đây là việc backend sẽ làm trong một API.
--
-- Cách dùng: chạy npm run db:reset (hoặc schema.sql + seed.sql) trước,
--            rồi chạy file này TỪNG KHỐI một (bôi đen khối → Ctrl+Enter) và đọc kết quả.
--            Chạy lại npm run db:reset để đưa dữ liệu về ban đầu.
--
-- Kịch bản (TH1): hôm nay, thủ thư TT01 cho HS2026001 (Lê Minh An, chưa mượn gì)
--   mượn "Toán 10" (BS000005) và "Số đỏ" (BS000014). Sau đó gia hạn "Toán 10",
--   trả "Số đỏ" trễ 4 ngày, thu phạt, rồi Admin đổi quy định.
-- =====================================================================

USE thuvien_thpt;

SET @today        := CURDATE();
SET @librarian_id := (SELECT user_id FROM users WHERE username = 'TT01');
SET @admin_id     := (SELECT user_id FROM users WHERE username = 'AD001');


-- =====================================================================
-- PHẦN A — LẬP PHIẾU MƯỢN (UC007)
-- =====================================================================

-- A1. Thủ thư nhập mã độc giả → hiển thị hồ sơ (bước 3–4)
SELECT reader_id, reader_type INTO @reader_id, @reader_type
FROM readers WHERE reader_code = 'HS2026001';

SELECT r.reader_code, r.full_name, r.reader_type, r.class_name,
       c.status AS card_status, c.expiry_date
FROM readers r JOIN library_cards c ON c.reader_id = r.reader_id
WHERE r.reader_id = @reader_id;

-- A2. Lấy quy định đang hiệu lực cho LOẠI độc giả này (không hard-code số)
SELECT regulation_id, max_books, borrow_days, fine_per_day, max_fine_per_book, renew_days
INTO @regulation_id, @max_books, @borrow_days, @fine_per_day, @max_fine, @renew_days
FROM regulations
WHERE reader_type = @reader_type AND effective_from <= @today
ORDER BY effective_from DESC
LIMIT 1;

SELECT @regulation_id AS regulation_id, @max_books AS max_books, @borrow_days AS borrow_days,
       @fine_per_day AS fine_per_day, @max_fine AS max_fine_per_book, @renew_days AS renew_days;
-- Kỳ vọng: học sinh → 3 cuốn, 7 ngày, 1.000đ/ngày, tối đa 30.000đ, gia hạn 7 ngày

-- A3. Kiểm tra điều kiện mượn (bước 5, QĐ01 + QĐ05) cho MỌI độc giả
--     Backend chỉ chạy cho 1 độc giả; ở đây chạy cho tất cả để thấy các tình huống bị chặn.
SELECT r.reader_code, r.full_name,
       COALESCE(u.status, 'CHƯA CÓ')                                    AS account,
       IF(c.status = 'LOCKED', 'LOCKED', IF(c.expiry_date < @today, 'EXPIRED', 'ACTIVE')) AS card,
       (SELECT COUNT(*) FROM borrow_details d JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
         WHERE t.reader_id = r.reader_id AND d.return_date IS NULL)                     AS holding,
       (SELECT COUNT(*) FROM borrow_details d JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
         WHERE t.reader_id = r.reader_id AND d.return_date IS NULL AND d.due_date < @today) AS overdue,
       (SELECT COALESCE(SUM(amount), 0) FROM fines f
         WHERE f.reader_id = r.reader_id AND f.status = 'UNPAID')                        AS unpaid,
       g.max_books
FROM readers r
JOIN library_cards c ON c.reader_id = r.reader_id
LEFT JOIN users u    ON u.user_id = r.user_id
JOIN regulations g   ON g.regulation_id = (
       SELECT regulation_id FROM regulations x
       WHERE x.reader_type = r.reader_type AND x.effective_from <= @today
       ORDER BY x.effective_from DESC LIMIT 1)
ORDER BY r.reader_id;
-- Kỳ vọng: HS2026001 đủ điều kiện (0/3).
--   Bị chặn: HS2026002 (3/3 – TH2), HS2026004 và HS2026006 (có sách quá hạn),
--            HS2026005 (nợ 3.000đ – TH5), HS2026007 (thẻ hết hạn), HS2026009 (thẻ khóa),
--            HS2026010 (tài khoản khóa).

-- A4. LẬP PHIẾU — mọi lệnh ghi phải cùng thành công hoặc cùng thất bại → TRANSACTION.
--     SELECT ... FOR UPDATE khóa các bản sách đang chọn: nếu 2 thủ thư cùng cho mượn
--     một cuốn, người thứ hai phải chờ, đọc lại thấy BORROWED và bị từ chối.
START TRANSACTION;

  SELECT copy_id, copy_code, status
  FROM book_copies
  WHERE copy_code IN ('BS000005', 'BS000014')
  FOR UPDATE;
  -- Kỳ vọng: cả hai AVAILABLE. Backend: nếu có cuốn khác AVAILABLE → ROLLBACK, báo lỗi (8b).

  -- (1) tạo phiếu + SNAPSHOT quy định (bước 10–11)
  INSERT INTO borrow_tickets (reader_id, librarian_id, regulation_id, borrow_date,
                              snap_borrow_days, snap_fine_per_day, snap_max_fine_per_book, snap_renew_days)
  VALUES (@reader_id, @librarian_id, @regulation_id, @today,
          @borrow_days, @fine_per_day, @max_fine, @renew_days);

  SET @borrow_id := LAST_INSERT_ID();

  -- (2) từng cuốn, hạn trả = ngày lập + số ngày mượn
  INSERT INTO borrow_details (borrow_id, copy_id, due_date)
  SELECT @borrow_id, copy_id, @today + INTERVAL @borrow_days DAY
  FROM book_copies WHERE copy_code IN ('BS000005', 'BS000014');

  -- (3) bản sách chuyển sang Đang mượn (bước 12)
  UPDATE book_copies SET status = 'BORROWED' WHERE copy_code IN ('BS000005', 'BS000014');

COMMIT;

-- A5. Xem phiếu vừa lập (bước 13). Mã phiếu hiển thị = 'PM' + borrow_id
SELECT CONCAT('PM', LPAD(t.borrow_id, 6, '0')) AS ticket_code, r.full_name AS reader,
       t.borrow_date, t.snap_borrow_days, t.snap_fine_per_day, t.status,
       c.copy_code, b.title, d.due_date
FROM borrow_tickets t
JOIN readers r        ON r.reader_id = t.reader_id
JOIN borrow_details d ON d.borrow_id = t.borrow_id
JOIN book_copies c    ON c.copy_id = d.copy_id
JOIN books b          ON b.book_id = c.book_id
WHERE t.borrow_id = @borrow_id;
-- Kỳ vọng: 2 cuốn, hạn trả = hôm nay + 7

-- A6. Cho mượn lại đúng cuốn đang mượn → database tự chặn (Duplicate entry ... uq_details_active_copy).
--     Bỏ dấu -- ở 2 dòng dưới để thử:
-- INSERT INTO borrow_details (borrow_id, copy_id, due_date)
-- SELECT 2, copy_id, @today FROM book_copies WHERE copy_code = 'BS000005';


-- =====================================================================
-- PHẦN B — GIA HẠN (UC008)
-- =====================================================================

-- B1. Kiểm tra điều kiện gia hạn (bước 6): chưa quá hạn, chưa gia hạn lần nào
SELECT d.borrow_detail_id, c.copy_code, d.due_date, d.renew_count, t.snap_renew_days,
       CASE WHEN d.due_date < @today THEN 'TỪ CHỐI: sách đã quá hạn'
            WHEN d.renew_count >= 1  THEN 'TỪ CHỐI: chỉ được gia hạn 1 lần'
            ELSE 'ĐƯỢC GIA HẠN' END AS verdict
FROM borrow_details d
JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
JOIN book_copies c    ON c.copy_id = d.copy_id
WHERE d.return_date IS NULL AND c.copy_code IN ('BS000005', 'BS000002', 'BS000013');
-- Kỳ vọng: BS000005 được gia hạn; BS000002 (HS2026008) đã gia hạn; BS000013 (HS2026004) quá hạn

-- B2. Gia hạn BS000005: hạn mới = hạn cũ + snap_renew_days (lấy từ SNAPSHOT của phiếu)
START TRANSACTION;

  SELECT d.borrow_detail_id, d.due_date, t.snap_renew_days
  INTO @renew_detail_id, @old_due, @snap_renew_days
  FROM borrow_details d
  JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
  JOIN book_copies c    ON c.copy_id = d.copy_id
  WHERE c.copy_code = 'BS000005' AND d.return_date IS NULL
  FOR UPDATE;

  UPDATE borrow_details
  SET due_date = @old_due + INTERVAL @snap_renew_days DAY, renew_count = renew_count + 1
  WHERE borrow_detail_id = @renew_detail_id;

  INSERT INTO renewal_logs (borrow_detail_id, old_due_date, new_due_date, renewed_by)
  VALUES (@renew_detail_id, @old_due, @old_due + INTERVAL @snap_renew_days DAY, @librarian_id);

COMMIT;

SELECT * FROM renewal_logs WHERE borrow_detail_id = @renew_detail_id;
-- Kỳ vọng: hạn mới = hôm nay + 14


-- =====================================================================
-- PHẦN C — TRẢ SÁCH TRỄ (UC009, UC010)
-- =====================================================================

-- Giả lập: trả "Số đỏ" (BS000014) sau hạn 4 ngày
SELECT d.borrow_detail_id, d.borrow_id, d.copy_id, d.due_date,
       t.snap_fine_per_day, t.snap_max_fine_per_book
INTO @detail_id, @return_borrow_id, @return_copy_id, @due_date, @snap_fine, @snap_max
FROM borrow_details d
JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
JOIN book_copies c    ON c.copy_id = d.copy_id
WHERE c.copy_code = 'BS000014' AND d.return_date IS NULL;

SET @return_at := TIMESTAMP(@due_date + INTERVAL 4 DAY, '10:00:00');

-- C1. Tính phạt theo SNAPSHOT của phiếu, có mức tối đa (UC010):
--     F = min(số ngày trễ × phạt/ngày ; mức tối đa mỗi cuốn)
SET @late_days := GREATEST(DATEDIFF(@return_at, @due_date), 0);
SET @amount    := LEAST(@late_days * @snap_fine, @snap_max);

SELECT @due_date AS due_date, DATE(@return_at) AS return_date,
       @late_days AS late_days, @snap_fine AS fine_per_day, @amount AS amount;
-- Kỳ vọng: late_days = 4, amount = 4.000

-- C2. Xác nhận trả (bước 9) — một transaction
START TRANSACTION;

  -- (1) ghi ngày trả, tình trạng, số ngày trễ, tiền phạt, người nhận
  UPDATE borrow_details
  SET return_date = @return_at, return_condition = 'GOOD',
      late_days = @late_days, fine_amount = @amount, received_by = @librarian_id
  WHERE borrow_detail_id = @detail_id;

  -- (2) tình trạng Tốt → bản sách về Khả dụng (Hư hỏng → DAMAGED, Mất → LOST)
  UPDATE book_copies SET status = 'AVAILABLE' WHERE copy_id = @return_copy_id;

  -- (3) trễ → tạo khoản phạt "Chưa thu"
  INSERT INTO fines (borrow_detail_id, reader_id, late_days, amount, reason)
  SELECT @detail_id, @reader_id, @late_days, @amount, CONCAT('Trả sách trễ ', @late_days, ' ngày')
  WHERE @amount > 0;

  -- (4) mọi cuốn trong phiếu đã trả → đóng phiếu
  UPDATE borrow_tickets
  SET status = 'COMPLETED', completed_at = @return_at
  WHERE borrow_id = @return_borrow_id
    AND NOT EXISTS (SELECT 1 FROM borrow_details
                    WHERE borrow_id = @return_borrow_id AND return_date IS NULL);

COMMIT;

SELECT t.status AS ticket_status, c.copy_code, d.return_date, d.return_condition,
       d.late_days, d.fine_amount, f.fine_id, f.status AS fine_status
FROM borrow_details d
JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
JOIN book_copies c    ON c.copy_id = d.copy_id
LEFT JOIN fines f     ON f.borrow_detail_id = d.borrow_detail_id
WHERE d.borrow_id = @return_borrow_id;
-- Kỳ vọng: phiếu vẫn BORROWING (còn "Toán 10"); "Số đỏ" trễ 4 ngày, 4.000đ, UNPAID

-- C3. (Chỉ đọc) Nếu HS2026006 trả hôm nay: phiếu lập theo quy định CŨ, trễ 45 ngày → chạm mức tối đa
SELECT c.copy_code, t.snap_borrow_days, d.due_date,
       DATEDIFF(@today, d.due_date)                                              AS late_days,
       DATEDIFF(@today, d.due_date) * t.snap_fine_per_day                        AS before_cap,
       LEAST(DATEDIFF(@today, d.due_date) * t.snap_fine_per_day, t.snap_max_fine_per_book) AS amount
FROM borrow_details d
JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
JOIN book_copies c    ON c.copy_id = d.copy_id
WHERE t.reader_id = (SELECT reader_id FROM readers WHERE reader_code = 'HS2026006')
  AND d.return_date IS NULL;
-- Kỳ vọng: snap_borrow_days = 14, late_days = 45, before_cap = 45.000, amount = 30.000


-- =====================================================================
-- PHẦN D — THU TIỀN PHẠT (UC011)
-- =====================================================================

UPDATE fines
SET status = 'PAID', paid_at = NOW(), collected_by = @librarian_id
WHERE borrow_detail_id = @detail_id AND status = 'UNPAID';

-- Biên lai điện tử: mã biên lai = 'BL' + fine_id
SELECT CONCAT('BL', LPAD(f.fine_id, 6, '0')) AS receipt_code, r.reader_code, r.full_name,
       f.amount, f.paid_at, u.full_name AS collected_by
FROM fines f
JOIN readers r ON r.reader_id = f.reader_id
JOIN users u   ON u.user_id = f.collected_by
WHERE f.borrow_detail_id = @detail_id;
-- Kỳ vọng: PAID, có người thu; HS2026001 không còn nợ phạt


-- =====================================================================
-- PHẦN E — ĐỔI QUY ĐỊNH GIỮA CHỪNG (UC013, TH6)
-- =====================================================================

-- E1. Admin tăng phạt học sinh lên 2.000đ/ngày, hiệu lực từ NGÀY MAI (không sửa dòng cũ)
START TRANSACTION;

  INSERT INTO regulations (reader_type, max_books, borrow_days, fine_per_day, max_fine_per_book, renew_days,
                           effective_from, created_by)
  VALUES ('STUDENT', 3, 7, 2000, 30000, 7, @today + INTERVAL 1 DAY, @admin_id);

  INSERT INTO regulation_logs (change_type, reader_type, regulation_id, old_values, new_values,
                               effective_from, changed_by)
  VALUES ('CONFIG', 'STUDENT', LAST_INSERT_ID(),
          JSON_OBJECT('fine_per_day', 1000), JSON_OBJECT('fine_per_day', 2000),
          @today + INTERVAL 1 DAY, @admin_id);

COMMIT;

-- E2. Quy định hiệu lực HÔM NAY và NGÀY MAI
SELECT 'hôm nay' AS ngay, fine_per_day FROM regulations
WHERE reader_type = 'STUDENT' AND effective_from <= @today ORDER BY effective_from DESC LIMIT 1;
SELECT 'ngày mai' AS ngay, fine_per_day FROM regulations
WHERE reader_type = 'STUDENT' AND effective_from <= @today + INTERVAL 1 DAY ORDER BY effective_from DESC LIMIT 1;
-- Kỳ vọng: hôm nay 1.000, ngày mai 2.000

-- E3. Phiếu đã lập KHÔNG bị ảnh hưởng vì dùng snapshot
SELECT CONCAT('PM', LPAD(borrow_id, 6, '0')) AS ticket_code, regulation_id, snap_fine_per_day
FROM borrow_tickets WHERE status = 'BORROWING' ORDER BY borrow_id;
-- Kỳ vọng: mọi phiếu vẫn 1.000

-- E4. Nhật ký thay đổi quy định (UC014)
SELECT l.changed_at, u.username AS changed_by, l.reader_type, l.old_values, l.new_values, l.effective_from
FROM regulation_logs l JOIN users u ON u.user_id = l.changed_by
ORDER BY l.changed_at DESC;


-- =====================================================================
-- PHẦN F — TRUY VẤN BÁO CÁO, TRA CỨU HAY DÙNG
-- =====================================================================

-- F1. Sách QUÁ HẠN chưa trả — tính từ due_date (UC016, UC017)
SELECT r.reader_code, r.full_name, c.copy_code, b.title,
       d.due_date, DATEDIFF(@today, d.due_date) AS days_overdue
FROM borrow_details d
JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
JOIN readers r        ON r.reader_id = t.reader_id
JOIN book_copies c    ON c.copy_id = d.copy_id
JOIN books b          ON b.book_id = c.book_id
WHERE d.return_date IS NULL AND d.due_date < @today
ORDER BY days_overdue DESC;

-- F2. Sắp đến hạn trong 3 ngày (UC017)
SELECT r.reader_code, r.email, c.copy_code, d.due_date, DATEDIFF(d.due_date, @today) AS days_left
FROM borrow_details d
JOIN borrow_tickets t ON t.borrow_id = d.borrow_id
JOIN readers r        ON r.reader_id = t.reader_id
JOIN book_copies c    ON c.copy_id = d.copy_id
WHERE d.return_date IS NULL AND d.due_date BETWEEN @today AND @today + INTERVAL 3 DAY;

-- F3. Tổng tiền phạt chưa thu theo độc giả (UC016)
SELECT r.reader_code, r.full_name, SUM(f.amount) AS unpaid_total
FROM fines f JOIN readers r ON r.reader_id = f.reader_id
WHERE f.status = 'UNPAID'
GROUP BY r.reader_id, r.reader_code, r.full_name;

-- F4. Tra cứu sách (UC006): không dấu, bỏ đầu sách đã ẩn, kèm số bản khả dụng
SELECT b.book_id, b.title, b.author, g.category_name,
       COUNT(c.copy_id)             AS total_copies,
       SUM(c.status = 'AVAILABLE')  AS available_copies
FROM books b
JOIN categories g        ON g.category_id = b.category_id
LEFT JOIN book_copies c  ON c.book_id = b.book_id
WHERE b.is_hidden = FALSE AND b.title LIKE '%vat li%'
GROUP BY b.book_id, b.title, b.author, g.category_name;
-- Kỳ vọng: chỉ "Vật lí 11" (bản chương trình cũ đã ẩn)

-- F5. Lịch sử của độc giả đang đăng nhập (UC012)
SELECT CONCAT('PM', LPAD(t.borrow_id, 6, '0')) AS ticket_code, b.title, t.borrow_date, d.due_date,
       d.return_date, d.late_days, d.fine_amount, f.status AS fine_status
FROM borrow_tickets t
JOIN borrow_details d ON d.borrow_id = t.borrow_id
JOIN book_copies c    ON c.copy_id = d.copy_id
JOIN books b          ON b.book_id = c.book_id
LEFT JOIN fines f     ON f.borrow_detail_id = d.borrow_detail_id
WHERE t.reader_id = (SELECT reader_id FROM readers WHERE reader_code = 'GV2026002')
ORDER BY t.borrow_date DESC;
