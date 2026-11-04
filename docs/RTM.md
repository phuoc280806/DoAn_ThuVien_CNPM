# Ma trận truy vết yêu cầu (RTM)

Liên kết từng yêu cầu trong **Yêu cầu theo đề tài – Nhóm 7** ([2611COMP104406_Yeu-cau (1)_removed.pdf](2611COMP104406_Yeu-cau%20(1)_removed.pdf)) với Use Case trong đặc tả ([N7.pdf](N7.pdf)), module backend và ca kiểm thử trong [BANG_TEST_CASE_CHUONG_6.md](BANG_TEST_CASE_CHUONG_6.md).

Mã `GUI-xx` là ca kiểm thử giao diện thủ công (mục 6.5 của bảng test case). Kết quả kiểm thử tự động lấy từ lần chạy `cd backend && npm test` ngày **04/11/2026**: **94/94 test PASS**.

## 1. Yêu cầu chức năng ↔ Use Case ↔ Test case

| Mã yêu cầu | Ưu tiên | Yêu cầu (tóm tắt) | Use Case | Module backend | Test case | File test tự động | Kết quả |
|---|---|---|---|---|---|---|---|
| G7-FR01 | MUST | Đăng nhập và phân quyền Độc giả / Thủ thư / Admin | UC001, UC002 | `auth`, `users`, `middlewares/auth.js` | TC-01, TC-02, TC-03, TC-04, TC-05, TC-06, TC-07, TC-21, GUI-01 → GUI-03, GUI-15 → GUI-17 | `auth.test.js`, `users.test.js`, `history.test.js` | **PASS** |
| G7-FR02 | MUST | Quản lý đầu sách: ISBN, tên, tác giả, thể loại, NXB, năm, mô tả | UC004 | `books` | TC-10, TC-11, GUI-33, GUI-34 | `books.test.js` | **PASS** |
| G7-FR03 | MUST | Quản lý bản sao để biết tài liệu có thể mượn | UC004, UC005 | `books`, `copies` | TC-10, TC-12, GUI-35, GUI-36 | `books.test.js` | **PASS** |
| G7-FR04 | MUST | Quản lý hồ sơ độc giả và trạng thái được phép mượn | UC003, UC007 | `readers`, `loans` | TC-08, TC-09, TC-14, GUI-30 → GUI-32 | `readers.test.js`, `loans.test.js` | **PASS** |
| G7-FR05 | MUST | Độc giả tra cứu / lọc sách, xem số bản có sẵn | UC006 | `books` | TC-13, GUI-23, GUI-24 | `books.test.js` | **PASS** |
| G7-FR06 | MUST | Lập phiếu mượn: kiểm tra số sách tối đa, tình trạng bản sách, hạn trả theo quy định hiện hành | UC007 | `loans` | TC-TH1, TC-TH2, TC-14, TC-15, TC-16, TC-27, GUI-06 → GUI-08 | `loans.test.js` | **PASS** |
| G7-FR07 | MUST | Trả sách, cập nhật tình trạng bản sao, xác định số ngày trễ | UC009 | `returns` | TC-TH3, TC-TH4A, TC-TH4B, TC-18, TC-28, GUI-09, GUI-11 | `returns.test.js` | **PASS** |
| G7-FR08 | MUST | Tính tiền phạt trả trễ; lưu số tiền phải thu / đã thu | UC010, UC011 | `returns`, `fines`, `utils/fine.js` | TC-TH4A, TC-TH4B, TC-TH5, TC-19, TC-20, TC-28, GUI-10, GUI-12 | `returns.test.js`, `loans.test.js` | **PASS** |
| G7-FR09 | MUST | Độc giả xem lịch sử mượn/trả và khoản phạt của chính mình | UC012 | `readers` (`/api/me`) | TC-21, GUI-25 → GUI-28 | `history.test.js`, `returns.test.js` | **PASS** |
| G7-FR10 | MUST | Admin đổi số sách tối đa, thời hạn mượn, tiền phạt/ngày; lưu thời điểm / phiên bản áp dụng | UC013, UC014, UC015 | `regulations` | TC-TH6, TC-22, TC-23, TC-24, GUI-18, GUI-19, GUI-21, GUI-22 | `regulations.test.js`, `apply-regulation.test.js`, `loans.test.js` | **PASS** |
| G7-FR11 | SHOULD | Báo cáo sách đang mượn, quá hạn, độc giả có phạt, thống kê theo thời gian | UC016 | `reports` | TC-25, GUI-40 → GUI-43 | `reports.test.js` | **PASS** |
| G7-FR12 | SHOULD | Gia hạn mượn nếu không vi phạm; cảnh báo sắp đến hạn | UC008, UC017 | `loans`, `reminders` | TC-17, TC-26, GUI-44 → GUI-46 | `loans.test.js`, `reminders.test.js` | **PASS** |
| G7-FR13 | COULD | Đặt trước / giữ sách **hoặc** gửi email nhắc trả | UC017 | `reminders` | TC-26, GUI-44, GUI-45 | `reminders.test.js` | **PASS** (làm phần email nhắc trả; đặt trước sách nằm ngoài phạm vi) |

Mọi yêu cầu MUST (G7-FR01 → G7-FR10) đều có ít nhất một test case liên kết và đang PASS.

## 2. Nhóm kiểm thử bắt buộc (mục 8 của đề) ↔ Test case

| Nhóm kiểm thử bắt buộc | Test case | Dữ liệu seed dùng | Kết quả |
|---|---|---|---|
| Mượn ở **dưới** giới hạn | TC-TH1 | `HS2026001` mượn 2/3 | **PASS** |
| Mượn **bằng** giới hạn | TC-27 | `GV2026001` từ 2/5 mượn thêm 3 → 5/5 | **PASS** |
| Mượn **vượt** giới hạn | TC-TH2, TC-27, TC-15 | `HS2026002` đang 3/3; `GV2026001` đã 5/5; `HS2026003` chọn 3 cuốn khi chỉ còn được 2 | **PASS** |
| Bản sách đang mượn không được mượn lại | TC-15, TC-16 | `BS000001` đang thuộc `PM000001`; hai thủ thư cùng mượn `BS000011` | **PASS** |
| Trả **đúng hạn** | TC-TH3 | `HS2026003` – `BS000010` | **PASS** |
| Trả **trễ 1 ngày** | TC-28 | `GV2026003` – `BS000040` | **PASS** |
| Trả **trễ nhiều ngày** | TC-TH4A, TC-TH4B | `HS2026004` trễ 5 ngày; `HS2026006` trễ 45 ngày (chạm mức tối đa) | **PASS** |
| Đổi mức phạt / thời hạn, kiểm tra giao dịch cũ / mới | TC-TH6, TC-24 | Đổi quy định học sinh; so sánh `PM000001` (cũ) với phiếu lập sau khi đổi | **PASS** |
| Độc giả chỉ xem dữ liệu của mình | TC-21 | `HS2026001` xem biên lai của `GV2026002` → `403` | **PASS** |
| Thủ thư / Admin đúng quyền | TC-07, TC-21 và test "Phân quyền" ở đầu mỗi file test | Độc giả gọi API thủ thư, thủ thư gọi API Admin → `403` | **PASS** |

## 3. Luồng nghiệp vụ phải demo (mục 6 của đề) ↔ Test case

| Luồng demo | Use Case | Test case | Kết quả |
|---|---|---|---|
| 1. Admin cấu hình quy định → thủ thư mượn sách → hệ thống tính hạn trả | UC013 → UC007 | TC-22, TC-TH1, TC-TH6 | **PASS** |
| 2. Trả đúng hạn / trễ → cập nhật bản sao → tính phạt | UC009 → UC010 | TC-TH3, TC-TH4A, TC-28 | **PASS** |
| 3. Admin đổi quy định → tạo lượt mượn mới → so sánh với lượt mượn cũ | UC013 → UC007 | TC-TH6, GUI-19 (màn hình Quản lý mượn trả hiện snapshot từng phiếu) | **PASS** |

## 4. Business rule (mục 4 của đề) ↔ Cách hiện thực ↔ Test case

| Business rule | Cách hiện thực | Test case |
|---|---|---|
| Không cho mượn khi độc giả đạt / vượt giới hạn, bị khóa, hoặc bản sách không sẵn sàng | `loans.service.js` kiểm tra số cuốn đang giữ, thẻ (hết hạn / khóa), tài khoản khóa, quá hạn, nợ phạt, trạng thái bản sách; lỗi thì rollback cả phiếu | TC-14, TC-15, TC-TH2, TC-27 |
| Hạn trả xác định tại thời điểm mượn từ quy định phù hợp; đổi quy định không làm sai lịch sử | Lúc lập phiếu, chép quy định đang hiệu lực vào các cột `borrow_tickets.snap_*` (snapshot); tính phạt và gia hạn chỉ đọc snapshot | TC-TH1, TC-TH6 |
| Tiền phạt xác định từ số ngày trễ và mức phạt theo rule | `utils/fine.js`: `min(số ngày trễ × phạt/ngày, mức tối đa)` cho mỗi cuốn, lấy tham số từ snapshot | TC-19, TC-TH4A, TC-TH4B, TC-28 |
| Mỗi bản sao tối đa một lượt mượn đang mở | Cột sinh `borrow_details.active_copy_id` + unique index, kết hợp `SELECT … FOR UPDATE` khi lập phiếu | TC-15, TC-16 |
