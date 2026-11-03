# CHƯƠNG 6. KIỂM THỬ CHƯƠNG TRÌNH

Tài liệu này tổng hợp phương pháp kiểm thử, bộ ca kiểm thử (Test Cases) theo **6 tình huống nghiệp vụ cốt lõi (TH1–TH6)** và theo toàn bộ **17 Use Case (UC001–UC017)** của đề tài **Hệ thống quản lý thư viện trường THPT – Nhóm 07**. Nội dung dưới đây dùng trực tiếp cho **Chương 6** của tiểu luận.

---

## 6.1. Phương pháp và môi trường kiểm thử

1. **Phương pháp kiểm thử:**
   - **Kiểm thử hộp đen (Black-box Testing):** Thiết kế ca kiểm thử dựa trên đặc tả Use Case (Chương 2), phân hoạch tương đương và phân tích giá trị biên cho các quy định nghiệp vụ (`QĐ01`–`QĐ06`).
   - **Kiểm thử theo kịch bản đóng vai (Scenario-based Testing):** Kiểm chứng 6 tình huống diễn tập thực tế `TH1`–`TH6`.
   - **Kiểm thử tích hợp tự động (Automated Integration Testing):** Sử dụng `node:test` và `node:assert/strict` gọi trực tiếp REST API trên database kiểm thử riêng (`thuvien_thpt_test`), tự động nạp lại `database/schema.sql` và `database/seed.sql` trước mỗi bộ test để đảm bảo tính độc lập và lặp lại.
2. **Công cụ kiểm thử:**
   - Bộ test tự động: `cd backend && npm test` (11 file test, **90 ca kiểm thử tự động**).
   - Bộ sưu tập Postman: `docs/ThuVien_THPT_Nhom07.postman_collection.json`.
   - Kịch bản kiểm thử SQL: `database/test_borrow_return.sql`.
   - Các file REST Client theo từng giai đoạn: `backend/requests/gd2-auth.http` → `gd9-reminders.http`.

---

## 6.2. Bảng kiểm thử 6 tình huống nghiệp vụ cốt lõi (TH1 – TH6)

| Mã TC | Tình huống | Use Case liên quan | Dữ liệu đầu vào (Seed Data) | Các bước thực hiện | Kết quả mong đợi | Kết quả thực tế | Đánh giá |
|---|---|---|---|---|---|---|---|
| **TC-TH1** | **TH1:** Học sinh mượn 2 cuốn, đúng quy định | UC007 | Độc giả: `HS2026001` (đang mượn `0/3`, thẻ `ACTIVE`, nợ `0đ`). Bản sách: `BS000005`, `BS000014` (`AVAILABLE`) | 1. Thủ thư kiểm tra `GET /api/loans/eligibility/HS2026001`<br>2. Lập phiếu `POST /api/loans` với `copyCodes: ["BS000005", "BS000014"]` | - Bước 1: `eligible = true`, `summary = "Đã mượn 0/3, còn được mượn 3"`<br>- Bước 2: Trả mã `201`, tạo phiếu `PM000009`, lưu snapshot (`borrowDays = 7`, `finePerDay = 1000`, `maxFinePerBook = 30000`, `renewDays = 7`), hạn trả = ngày lập + 7 ngày; 2 bản sách chuyển sang `BORROWED` | Khớp hoàn toàn với kết quả mong đợi (`tests/loans.test.js`) | **PASS** |
| **TC-TH2** | **TH2:** Học sinh đang giữ 3 cuốn, muốn mượn thêm 1 cuốn | UC007 (5c, 8c) | Độc giả: `HS2026002` (đang giữ 3 cuốn của `PM000001`, giới hạn học sinh = 3 cuốn). Bản sách: `BS000017` | 1. Kiểm tra `GET /api/loans/eligibility/HS2026002`<br>2. Gửi `POST /api/loans` mượn thêm `BS000017` | - Bước 1: `eligible = false`, `problems` chứa mã `LIMIT_REACHED` (`"Đã mượn 3/3 cuốn"`)<br>- Bước 2: Từ chối với mã `409`, thông báo `"Đã mượn 3/3 cuốn"`, không tạo phiếu, `BS000017` vẫn `AVAILABLE` | Khớp hoàn toàn với kết quả mong đợi (`tests/loans.test.js`) | **PASS** |
| **TC-TH3** | **TH3:** Học sinh trả sách đúng hạn | UC009 (5a), UC010 (3a) | Độc giả: `HS2026003`, phiếu `PM000002`, bản sách `BS000010` (còn 2 ngày đến hạn) | 1. Quét mã `GET /api/returns/lookup/BS000010`<br>2. Xác nhận trả `POST /api/returns` (`copyCode: "BS000010"`, `condition: "GOOD"`) | - Bước 1: `lateDays = 0`, `fineAmount = 0`, `onTime = true`<br>- Bước 2: Trả mã `200`, thông báo `"Trả sách thành công"`, `fine = null` (không sinh khoản phạt), `BS000010` về `AVAILABLE`, phiếu `PM000002` chuyển sang `COMPLETED` | Khớp hoàn toàn với kết quả mong đợi (`tests/returns.test.js`) | **PASS** |
| **TC-TH4A** | **TH4 (trường hợp 1):** Học sinh trả trễ 5 ngày, 1 cuốn | UC009, UC010, UC011 | Độc giả: `HS2026004`, phiếu `PM000003`, bản sách `BS000013` (quá hạn 5 ngày; snapshot `1.000đ/ngày`, trần `30.000đ`) | 1. Quét mã `GET /api/returns/lookup/BS000013`<br>2. Xác nhận trả `POST /api/returns` (`copyCode: "BS000013"`, `condition: "GOOD"`) | - Bước 1: `lateDays = 5`, `fineAmount = 5000`<br>- Bước 2: Trả mã `200`, lưu ngày trả, tạo khoản phạt `UNPAID` với số tiền `5.000đ`, thông báo `"Trả sách thành công. Trễ 5 ngày, tiền phạt 5.000đ"` | Khớp hoàn toàn với kết quả mong đợi (`tests/returns.test.js`) | **PASS** |
| **TC-TH4B** | **TH4 (trường hợp 2):** Học sinh trả trễ 45 ngày, chạm mức phạt trần | UC009, UC010 | Độc giả: `HS2026006`, phiếu `PM000004`, bản sách `BS000016` (quá hạn 45 ngày; snapshot `1.000đ/ngày`, trần `30.000đ`) | Xác nhận trả `POST /api/returns` (`copyCode: "BS000016"`, `condition: "GOOD"`) | `lateDays = 45`, tiền phạt tính theo công thức $\min(45 \times 1.000, 30.000) = 30.000\text{đ}$ (không vượt mức tối đa mỗi cuốn), tạo khoản phạt `30.000đ` | Khớp hoàn toàn với kết quả mong đợi (`tests/returns.test.js`) | **PASS** |
| **TC-TH5** | **TH5:** Học sinh còn nợ phạt đến mượn sách mới → thu phạt xong mượn lại được | UC007 (5b), UC011 (bước 7) | Độc giả: `HS2026005` (đã trả hết sách nhưng còn khoản phạt `fine_id = 1` trị giá `3.000đ` ở trạng thái `UNPAID`) | 1. Thử lập phiếu mượn `POST /api/loans` cho `HS2026005`<br>2. Thu phạt `POST /api/fines/1/pay`<br>3. Lập lại phiếu mượn cho `HS2026005` | - Bước 1: Bị chặn `409` với mã `UNPAID_FINE` (`"Độc giả còn nợ phạt 3.000đ chưa thu, cần nộp phạt trước khi mượn mới"`)<br>- Bước 2: Khoản phạt chuyển sang `PAID`, cấp biên lai `BL000001`, `remainingUnpaid = 0`<br>- Bước 3: Lập phiếu thành công (`201`) | Khớp hoàn toàn với kết quả mong đợi (`tests/loans.test.js`, `tests/returns.test.js`) | **PASS** |
| **TC-TH6** | **TH6:** Ban giám hiệu đổi quy định khi đang có phiếu mượn (Snapshot & Áp dụng đặc biệt) | UC013, UC014, UC015 | Admin `AD001` đổi quy định Học sinh sang `borrowDays = 3`, `finePerDay = 2000` hiệu lực từ hôm nay | 1. Tạo quy định mới `POST /api/regulations`<br>2. Kiểm tra phiếu cũ `PM000001` và phiếu trả trễ `PM000003`<br>3. Admin chủ động gọi `POST /api/regulations/apply-active-loans` kèm lý do | - Bước 1 & 2 (mặc định không hồi tố): Phiếu cũ giữ nguyên snapshot (`borrowDays = 7`, `finePerDay = 1000`); phiếu lập mới từ hôm nay mới áp quy định `2.000đ/ngày`<br>- Bước 3 (khi Admin chủ động áp dụng UC015): Cập nhật snapshot của 5 phiếu Học sinh đang mở, ghi `regulation_logs` và `ticket_snapshot_changes` | Khớp hoàn toàn với kết quả mong đợi (`tests/loans.test.js`, `tests/apply-regulation.test.js`) | **PASS** |

---

## 6.3. Bảng ca kiểm thử chi tiết theo từng Use Case (UC001 – UC017)

### 6.3.1. Nhóm Xác thực, Tài khoản, Độc giả và Sách (UC001 – UC006)

| Mã TC | Use Case & Luồng | Mô tả ca kiểm thử | Đầu vào / Thao tác | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| **TC-01** | UC001 – Luồng chính | Đăng nhập thành công với tài khoản hợp lệ | `POST /api/auth/login` (`AD001` / `Thuvien@2026`) | HTTP `200`, trả JWT `token` và thông tin `user` (không lộ `password_hash`) | **PASS** |
| **TC-02** | UC001 – Luồng `5a` | Đăng nhập thiếu tên đăng nhập hoặc mật khẩu | `POST /api/auth/login` (`username: ""`, `password: ""`) | HTTP `400`, thông báo `"Cần nhập đầy đủ tên đăng nhập và mật khẩu"` | **PASS** |
| **TC-03** | UC001 – Luồng `6a` | Sai tên đăng nhập hoặc sai mật khẩu | `POST /api/auth/login` (`HS2026001` / `SaiMatKhau`) | HTTP `401`, thông báo `"Tên đăng nhập hoặc mật khẩu chưa đúng"` | **PASS** |
| **TC-04** | UC001 – Luồng `7a` | Tài khoản đã bị khóa đăng nhập | `POST /api/auth/login` (`HS2026010` / `Thuvien@2026`) | HTTP `403`, thông báo `"Tài khoản đã bị khóa, vui lòng liên hệ Admin"` | **PASS** |
| **TC-05** | UC002 – Luồng chính | Admin cấp tài khoản cho độc giả đã có hồ sơ | `POST /api/users` (`username: "HS2026011"`, `role: "READER"`) | HTTP `201`, tự động liên kết `readers.user_id`, ghi `audit_logs (CREATE_USER)` | **PASS** |
| **TC-06** | UC002 – Luồng `7b` | Tạo tài khoản trùng tên đăng nhập | `POST /api/users` (`username: "TT01"`) | HTTP `409`, thông báo `"Tên đăng nhập đã tồn tại"` | **PASS** |
| **TC-07** | UC002 – Luồng `7c` | Admin tự khóa mình hoặc khóa Admin cuối cùng | `PATCH /api/users/1/status` (`status: "LOCKED"`) | HTTP `409`, chặn thao tác và báo lỗi rõ ràng | **PASS** |
| **TC-08** | UC003 – Luồng chính | Thêm hồ sơ độc giả và cấp thẻ thư viện | `POST /api/readers` → `POST /api/readers/:id/card` | HTTP `201`, tạo hồ sơ và thẻ ở trạng thái `ACTIVE` | **PASS** |
| **TC-09** | UC003 – Luồng `7b`, `7c` | Trùng mã độc giả / Ngày hết hạn thẻ không sau ngày cấp | `POST /api/readers` trùng mã; `POST /api/readers/:id/card` (`expiryDate <= issuedDate`) | HTTP `409` `"Mã độc giả đã tồn tại"`; HTTP `400` `"Ngày hết hạn thẻ phải sau ngày cấp"` | **PASS** |
| **TC-10** | UC004 – Luồng chính & `8a` | Thêm đầu sách kèm bản sách; kiểm tra ISBN-13 và trùng ISBN | `POST /api/books` (`isbn: "978-604-300-742-8"`, `copies: 3`) | Chuẩn hóa ISBN-13, sinh 3 bản sách `BS000091`–`BS000093`; nếu trùng ISBN trả `409` `"ISBN đã tồn tại trong hệ thống"` | **PASS** |
| **TC-11** | UC004 – Luồng `8b` | Xóa đầu sách: còn bản đang mượn / đã có lịch sử / chưa từng mượn | `DELETE /api/books/4`, `/books/10`, `/books/13` | Sách 4 bị từ chối `409`; sách 10 được ẩn (`deleted: false, isHidden: true`); sách 13 xóa hẳn (`deleted: true`) | **PASS** |
| **TC-12** | UC005 – Luồng chính & `11c` | Đổi trạng thái bản sách hợp lệ và ghi `copy_status_logs` | `PATCH /api/copies/5/status` (`DAMAGED`, kèm lý do) | HTTP `200`, giảm `availableCopies`, ghi `copy_status_logs`; chặn đổi bản đang mượn hoặc chuyển sang `BORROWED` bằng tay | **PASS** |
| **TC-13** | UC006 – Luồng chính & `8a` | Tra cứu sách không dấu, lọc thể loại, ẩn sách với độc giả | `GET /api/books?keyword=de men` | Trả về `"Dế Mèn phiêu lưu ký"` kèm `totalCopies: 3, availableCopies: 2`; độc giả không thấy sách đã ẩn | **PASS** |

### 6.3.2. Nhóm Mượn sách, Gia hạn, Trả sách, Tiền phạt và Lịch sử cá nhân (UC007 – UC012)

| Mã TC | Use Case & Luồng | Mô tả ca kiểm thử | Đầu vào / Thao tác | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| **TC-14** | UC007 – Luồng `5a`, `5b` | Chặn mượn khi thẻ hết hạn / thẻ khóa / tài khoản khóa / quá hạn / nợ phạt | `GET /api/loans/eligibility/:code` với `HS2026007`, `HS2026009`, `HS2026010`, `HS2026004`, `HS2026005` | Trả đầy đủ mã lỗi trong `problems[]`: `CARD_EXPIRED`, `CARD_LOCKED`, `ACCOUNT_LOCKED`, `OVERDUE`, `UNPAID_FINE` | **PASS** |
| **TC-15** | UC007 – Luồng `8a`, `8b`, `8c`, `9b` | Kiểm tra bản sách khi lập phiếu và tính toàn vẹn giao dịch (Transaction) | `POST /api/loans` với mã bản sách không tồn tại, bản sách đang mượn/hư/mất, hoặc vượt hạn mức | Từ chối `404`/`409`/`400`; rollback toàn bộ, không tạo phiếu dở dang và không đổi trạng thái bản sách nào | **PASS** |
| **TC-16** | UC007 – Concurrency | Hai thủ thư cùng lập phiếu cho cùng 1 bản sách một lúc | `Promise.all` gọi 2 request `POST /api/loans` cùng chọn `BS000011` | Nhờ `SELECT ... FOR UPDATE` và unique index `active_copy_id`, đúng 1 request thành công (`201`) và 1 request bị từ chối (`409`) | **PASS** |
| **TC-17** | UC008 – Luồng chính & `6a`, `6b` | Gia hạn 1 lần theo `snap_renew_days`; chặn khi quá hạn hoặc đã gia hạn | `POST /api/loans/items/:id/renew` cho `HS2026003` (hợp lệ), `HS2026004` (quá hạn), `HS2026008` (đã gia hạn 1 lần) | Hợp lệ: cộng đúng `snap_renew_days` từ snapshot và ghi `renewal_logs`; quá hạn trả `409` `"Sách đã quá hạn, không thể gia hạn; cần trả sách"`; đã gia hạn trả `409` `"Chỉ được gia hạn 1 lần"` | **PASS** |
| **TC-18** | UC009 – Luồng `4a`, `4b`, `7a` | Trả sách: mã không tồn tại, không đang mượn, trả sách Hư hỏng/Mất | `POST /api/returns` với `BS999999`, `BS000005` (đang trên kệ), hoặc `condition: "DAMAGED"` thiếu `note` | Báo lỗi `404` `"Không tìm thấy bản sách"`, `409` `"Bản sách không ở trạng thái Đang mượn"`, `400` `"Cần nhập ghi chú khi sách bị hư hỏng hoặc mất"` | **PASS** |
| **TC-19** | UC010 – Luồng `2a` & Bảng 2.33 | Đơn vị tính phạt theo snapshot và kiểm tra thiếu snapshot | Gọi `calculateFine` với bộ dữ liệu Bảng 2.33 và trường hợp thiếu tham số snapshot | Tính chính xác mọi trường hợp trong Bảng 2.33; nếu thiếu snapshot ném lỗi `"Phiếu thiếu thông số quy định"` | **PASS** |
| **TC-20** | UC011 – Luồng chính & `7a` | Thu phạt nhiều khoản nợ, chặn thu 2 lần, xem biên lai điện tử | `POST /api/fines/:id/pay` và `GET /api/fines/:id/receipt` | Cập nhật `PAID`, sinh biên lai `BL00000x`, trả về `remainingUnpaid` chính xác; thu lần 2 bị chặn `409` | **PASS** |
| **TC-27** | UC007 – Giá trị biên giới hạn mượn | Mượn **đúng bằng** giới hạn thì được, mượn thêm 1 cuốn thì bị chặn | `GV2026001` (đang giữ `2/5`) mượn thêm `BS000040`, `BS000043`, `BS000046`; sau đó mượn thêm `BS000049` | Lần 1: HTTP `201`, đạt `5/5`, kiểm tra điều kiện báo `LIMIT_REACHED`. Lần 2: HTTP `409` `"Đã mượn 5/5 cuốn"`, `BS000049` vẫn `AVAILABLE` | **PASS** |
| **TC-28** | UC009, UC010 – Giá trị biên trả trễ | Trả trễ **đúng 1 ngày** | `GV2026003` mượn `BS000040`, hạn trả đặt về hôm qua; quét `GET /api/returns/lookup/BS000040` rồi `POST /api/returns` | `lateDays = 1`, `fineAmount = 1000`; thông báo `"Trả sách thành công. Trễ 1 ngày, tiền phạt 1.000đ"` | **PASS** |
| **TC-21** | UC012 – Luồng chính & `3a`, `5a`, `5b`, `7a` | Độc giả xem lịch sử của mình; chặn xem phiếu/biên lai của người khác | `GET /api/me/loans`, `GET /api/me/loans/:id`, `GET /api/fines/:id/receipt` | Lấy `readerId` từ JWT; chưa có giao dịch báo `"Bạn chưa có giao dịch mượn nào"`; xem phiếu hoặc biên lai người khác trả `403` `"Bạn không có quyền xem dữ liệu này"` và ghi `audit_logs (UNAUTHORIZED_ACCESS)` | **PASS** |

### 6.3.3. Nhóm Quy định, Báo cáo thống kê và Nhắc hạn trả (UC013 – UC017)

| Mã TC | Use Case & Luồng | Mô tả ca kiểm thử | Đầu vào / Thao tác | Kết quả mong đợi | Trạng thái |
|---|---|---|---|---|---|
| **TC-22** | UC013 – Luồng chính & `4a`, `6a`, `6b`, `6c` | Tạo phiên bản quy định mới và kiểm tra ràng buộc ngày hiệu lực | `POST /api/regulations` (ngày hiệu lực hôm nay / tương lai / quá khứ / trùng ngày / không đổi giá trị) | Lưu phiên bản mới và ghi `regulation_logs (CONFIG)` chỉ gồm các tham số thay đổi; từ chối ngày quá khứ (`400`), trùng ngày (`409`), không đổi (`400`) | **PASS** |
| **TC-23** | UC014 – Luồng chính & `4a`, `4b` | Xem và lọc nhật ký thay đổi quy định | `GET /api/regulations/logs?from=&to=&readerType=&changedBy=` | Hiển thị mới nhất trước; lọc đúng theo loại độc giả, người thay đổi và kỳ; báo lỗi khi `from > to` hoặc `to` ở tương lai | **PASS** |
| **TC-24** | UC015 – Luồng chính & `3a`, `5a`, `5b`, `9a` | Xem trước và áp dụng quy định mới / ngày thu hồi cố định cho phiếu đang mượn | `POST /api/regulations/apply-active-loans/preview` và `/apply-active-loans` | Xem trước hiển thị giá trị cũ → mới (hạn trả tính riêng từng cuốn) và cảnh báo `"Phiếu sẽ chuyển sang quá hạn"`; bắt buộc nhập lý do (`9a`); chạy trong 1 transaction và lưu `ticket_snapshot_changes` kèm hạn trả cũ/mới của từng cuốn | **PASS** |
| **TC-25** | UC016 – Luồng chính & `6a`, `8a` | Báo cáo (1) Mượn/trả, (2) Quá hạn/trả trễ, (3) Tiền phạt; xuất Excel & PDF | `GET /api/reports/:type` và `GET /api/reports/:type/export?format=xlsx\|pdf` | Bắt buộc nhập "Từ ngày", "Đến ngày" (cả khi xuất file); kiểm tra kỳ báo cáo (`6a`), báo `"Không có dữ liệu trong kỳ đã chọn"` khi trống (`8a`), xuất file `.xlsx` và `.pdf` tiếng Việt hợp lệ | **PASS** |
| **TC-26** | UC017 – Luồng chính & `2a`, `4a`, `5a` | Xem danh sách sắp đến hạn (≤ 3 ngày) / quá hạn và gửi email nhắc hạn | `GET /api/reminders` và `POST /api/reminders/send` | Trả danh sách đúng hạn mức ≤ 3 ngày và quá hạn; trống báo `"Không có phiếu cần nhắc"` (`2a`); thiếu email báo `"Độc giả chưa có email, hãy nhắc trực tiếp"` (`4a`); lỗi SMTP vẫn ghi `reminder_logs (success = false)` và cho phép gửi lại (`5a`); chưa cấu hình SMTP thì báo rõ email chỉ được giả lập | **PASS** |

---

## 6.4. Tổng hợp bộ kiểm thử tự động trong dự án

| STT | File kiểm thử | Phạm vi Use Case | Số lượng test | Nội dung kiểm chứng chính |
|---|---|---|---|---|
| 1 | `backend/tests/auth.test.js` | Health, UC001 | 6 | `/api/health`, đăng nhập đúng/sai/thiếu trường/bị khóa, `/api/auth/me`, đăng xuất, phân quyền `authorize` |
| 2 | `backend/tests/users.test.js` | UC002 | 9 | Danh sách/tìm kiếm tài khoản, tạo Thủ thư, cấp tài khoản Độc giả, khóa/mở khóa, đặt lại mật khẩu, đổi vai trò, bảo vệ Admin duy nhất (`7c`), `audit_logs` |
| 3 | `backend/tests/readers.test.js` | UC003 | 8 | Danh sách/tìm kiếm không dấu, thêm/sửa hồ sơ độc giả, đồng bộ họ tên tài khoản, cấp thẻ, gia hạn thẻ, khóa/mở khóa thẻ |
| 4 | `backend/tests/books.test.js` | UC004, UC005, UC006 | 12 | Kiểm tra ISBN-13, tra cứu không dấu & số bản khả dụng, ẩn sách với độc giả, thêm/sửa/xóa hoặc ẩn đầu sách, nhập thêm bản sách, đổi trạng thái bản sách và `copy_status_logs` |
| 5 | `backend/tests/regulations.test.js` | UC013, UC014 | 6 | Phân quyền, xem các phiên bản quy định (`CURRENT`/`UPCOMING`/`PAST`), tạo quy định hiệu lực tương lai & hôm nay, kiểm tra `4a`/`6a`/`6b`/`6c`, lọc `regulation_logs` |
| 6 | `backend/tests/loans.test.js` | UC007, UC008 (TH1, TH2, TH5, TH6) | 11 | Kiểm tra mọi lý do chặn mượn, lập phiếu TH1, mượn dưới / bằng / vượt giới hạn (TH2), chặn nợ phạt TH5, chống mượn trùng đồng thời (concurrency), giữ snapshot khi đổi quy định TH6, gia hạn sách |
| 7 | `backend/tests/returns.test.js` | UC009, UC010, UC011 (TH3, TH4, TH5) | 11 | Unit test hàm `calculateFine` theo Bảng 2.33, trả đúng hạn TH3, trả trễ 1 ngày, 5 ngày & 45 ngày TH4, trả sách hư/mất, thu phạt & mở chặn mượn TH5, thu phạt nhiều khoản (`7a`), biên lai điện tử |
| 8 | `backend/tests/history.test.js` | UC012 | 5 | Lịch sử mượn/trả của chính độc giả, lọc trạng thái/thời gian, chi tiết phiếu, thông báo `3a`/`5a`/`5b`, chặn xem dữ liệu người khác (`7a`) và ghi `audit_logs` |
| 9 | `backend/tests/apply-regulation.test.js` | UC015 (TH6) | 6 | Phân quyền Admin, kiểm tra `3a`/`5a`/`5b`/`9a`, xem trước phiếu bị ảnh hưởng & cảnh báo quá hạn, áp dụng quy định mới & ngày thu hồi cố định trong transaction, ghi `ticket_snapshot_changes` |
| 10 | `backend/tests/reports.test.js` | UC016 | 7 | Phân quyền, kiểm tra kỳ báo cáo (`6a`) và kỳ trống (`8a`), thống kê mượn/trả, sách quá hạn/trả trễ, tiền phạt & độc giả nợ, xuất file `.xlsx` và `.pdf` tiếng Việt |
| 11 | `backend/tests/reminders.test.js` | UC017 (COULD) | 9 | Phân quyền, danh sách sắp đến hạn (≤ 3 ngày) & quá hạn, lọc trạng thái, chặn độc giả thiếu email (`4a`), giả lập gửi mail thành công, lỗi SMTP (`5a`) ghi `reminder_logs` & gửi lại, báo rõ khi chưa cấu hình SMTP, danh sách trống (`2a`) |
| **Tổng** | **11 file test** | **UC001 – UC017 (TH1 – TH6)** | **90 test** | **Tất cả hoàn tất trên database kiểm thử độc lập `thuvien_thpt_test`** |

