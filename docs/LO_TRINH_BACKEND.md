# Lộ trình làm Backend

Backend Node.js (Express) + MySQL cho hệ thống quản lý thư viện trường THPT. Đặc tả gốc: [N7.pdf](N7.pdf).

Thứ tự các giai đoạn đi theo phụ thuộc dữ liệu: phải có tài khoản mới phân quyền được, có sách và độc giả mới lập phiếu được, có quy định mới tính được hạn trả và tiền phạt.

```
GĐ0 Khởi tạo ─► GĐ1 Database ─► GĐ2 Đăng nhập & phân quyền
                                        │
                     ┌──────────────────┼──────────────────┐
                     ▼                  ▼                  ▼
              GĐ3 Độc giả & thẻ   GĐ4 Sách & bản sách  GĐ5 Quy định
                     └──────────────────┼──────────────────┘
                                        ▼
                                  GĐ6 Mượn & gia hạn
                                        ▼
                                  GĐ7 Trả sách & tiền phạt
                                        ▼
                     GĐ8 Báo cáo & áp dụng quy định cho phiếu đang mượn
                                        ▼
                     GĐ9 Nhắc hạn (COULD) ─► GĐ10 Kiểm thử & hoàn thiện
```

GĐ3, GĐ4, GĐ5 không phụ thuộc nhau, nên 3 người có thể làm song song.

---

## Quyết định đã chốt (bổ sung cho đặc tả)

Các điểm đặc tả chưa nói rõ hoặc mâu thuẫn, nhóm đã thống nhất như sau:

| # | Vấn đề | Quyết định |
|---|---|---|
| 1 | Chưa có use case tạo bản sách | Thêm "nhập N bản" khi thêm/sửa đầu sách; mã bản sách tự sinh `BS000001`… |
| 2 | Hạn mượn | 7 ngày cho cả học sinh và giáo viên (dữ liệu mặc định); Admin đổi được qua UC013 |
| 3 | Liên kết tài khoản và hồ sơ độc giả | Tên đăng nhập = mã độc giả; tài khoản có cột `reader_id` trỏ tới hồ sơ |
| 4 | Gia hạn theo từng cuốn | Hạn trả và số lần gia hạn lưu ở **từng cuốn trong phiếu**; snapshot quy định lưu ở **phiếu** |
| 5 | Danh sách thể loại | Bảng `categories` có dữ liệu sẵn, không làm màn hình quản lý |
| 6 | Đổi trạng thái bản sách | Khả dụng ↔ Hư hỏng; Khả dụng/Hư hỏng → Mất; Mất → Khả dụng. "Đang mượn" chỉ đổi qua lập phiếu (UC007) và trả sách (UC009) |
| 7 | Xóa hay ẩn đầu sách | Chưa từng được mượn → xóa; đã có lịch sử mượn → chỉ ẩn |
| 8 | Trả sách bị Mất | Vẫn tính phạt trễ như thường; bồi thường xử lý ngoài hệ thống |
| 9 | Thẻ hết hạn | Hệ thống tự xét theo ngày hết hạn khi kiểm tra điều kiện mượn |

**Lựa chọn kỹ thuật:** đăng nhập bằng JWT, mật khẩu băm bằng `bcryptjs` (viết thuần JavaScript, không cần build native nên cài trên Windows không lỗi), kiểm tra dữ liệu bằng `express-validator`, xuất Excel bằng `exceljs`, xuất PDF bằng `pdfkit`, gửi email bằng `nodemailer`. Ngày tháng chỉ so sánh theo ngày (không tính giờ), múi giờ Việt Nam.

---

## Quy ước chung cho API

- Tiền tố: `/api`. Dữ liệu gửi và nhận dạng JSON.
- Response thành công: `{ "success": true, "data": ..., "message": "..." }`
- Response lỗi: `{ "success": false, "message": "Đã mượn 3/3 cuốn", "errors": [...] }`, dùng đúng câu thông báo trong đặc tả.
- Mã HTTP: `200/201` thành công, `400` dữ liệu sai, `401` chưa đăng nhập, `403` không đủ quyền, `404` không tìm thấy, `409` trùng hoặc vi phạm quy tắc nghiệp vụ, `500` lỗi server.
- Phân quyền theo vai trò: `STUDENT`, `TEACHER` (gọi chung là độc giả), `LIBRARIAN`, `ADMIN`. Admin có mọi quyền của Thủ thư.
- Thao tác ghi vào nhiều bảng cùng lúc phải chạy trong **transaction**: lập phiếu, trả sách, thu phạt, áp dụng quy định cho phiếu đang mượn.

---

## GĐ0. Khởi tạo dự án

**Mục tiêu:** chạy được server, kết nối được MySQL.

- [x] `npm init`, cài `express` (v5), `mysql2`, `dotenv`, `cors`, `bcryptjs`, `jsonwebtoken`, `express-validator`; dev: `nodemon`
- [x] Script `npm run dev` (nodemon), `npm start`, `npm test` (test runner có sẵn của Node), `npm run db:reset`
- [x] `server.js`, `src/app.js`, `src/routes.js`
- [x] `src/config/db.js`: connection pool, hàm `withTransaction`
- [x] `src/middlewares/errorHandler.js`, `src/utils/AppError.js`, `src/utils/response.js`
- [x] `GET /api/health` trả về trạng thái server và kết nối DB

Express 5 tự chuyển lỗi của hàm `async` sang `errorHandler`, nên controller không cần `try/catch`; chỉ cần `throw new AppError(409, '...')`.

**Xong khi:** `npm run dev` chạy, gọi `/api/health` thấy kết nối DB thành công.

---

## GĐ1. Thiết kế cơ sở dữ liệu

**Mục tiêu:** có `database/schema.sql` và `database/seed.sql`. Đây cũng là nguồn để vẽ ERD cho mục 3.4 và 4.2 của tiểu luận.

Các bảng dự kiến:

| Bảng | Nội dung chính | Use case |
|---|---|---|
| `accounts` | tên đăng nhập, mật khẩu (đã băm), họ tên, vai trò, trạng thái, `reader_id` | UC001, UC002 |
| `readers` | mã độc giả, họ tên, loại (HS/GV), lớp/tổ, email | UC003 |
| `library_cards` | độc giả, ngày cấp, ngày hết hạn, trạng thái (hoạt động/khóa) | UC003 |
| `categories` | tên thể loại | UC004 |
| `book_titles` | ISBN, tên, tác giả, thể loại, NXB, năm, cờ ẩn | UC004, UC006 |
| `book_copies` | mã bản sách, đầu sách, trạng thái, ghi chú | UC005 |
| `copy_status_logs` | bản sách, trạng thái cũ → mới, lý do, người đổi, thời điểm | UC005 |
| `regulation_versions` | loại độc giả, số sách tối đa, số ngày mượn, phạt/ngày, phạt tối đa, số ngày gia hạn, ngày hiệu lực | UC013 |
| `regulation_logs` | loại thay đổi, giá trị cũ/mới, ngày hiệu lực, lý do, người đổi, thời điểm | UC014, UC015 |
| `loans` | mã phiếu, độc giả, thủ thư, ngày lập, trạng thái, **snapshot**: số ngày mượn, phạt/ngày, phạt tối đa, số ngày gia hạn | UC007 |
| `loan_items` | phiếu, bản sách, **hạn trả**, số lần gia hạn, ngày trả, tình trạng khi trả, ghi chú, số ngày trễ, tiền phạt | UC007–UC010 |
| `renewal_logs` | cuốn trong phiếu, hạn cũ, hạn mới, người gia hạn, thời điểm | UC008 |
| `fines` | mã khoản phạt, cuốn trong phiếu, độc giả, số tiền, trạng thái (chưa thu/đã thu) | UC009, UC011 |
| `receipts` | mã biên lai, khoản phạt, số tiền, người thu, thời điểm thu | UC011 |
| `audit_logs` | thao tác quản trị tài khoản, truy cập trái phép | UC002, UC012 |
| `reminder_logs` | phiếu, email, thời điểm, người gửi, kết quả | UC017 |

Dữ liệu mẫu (`seed.sql`):
- 1 Admin, 2 Thủ thư, vài học sinh và giáo viên (kèm tài khoản và thẻ)
- Quy định mặc định cho HS và GV: số sách 3/5, **7 ngày**, 1.000đ/ngày, tối đa 30.000đ, gia hạn 7/14 ngày
- Danh sách thể loại, khoảng 20 đầu sách, mỗi đầu sách vài bản
- Dữ liệu để thử các tình huống TH1–TH6: một độc giả đang mượn 3/3 cuốn, một độc giả còn nợ phạt, một phiếu đã quá hạn

**Xong khi:** import `schema.sql` và `seed.sql` vào MySQL không lỗi; cả nhóm duyệt sơ đồ bảng.

**Trạng thái:** đã viết xong và chạy thử (`npm run db:reset`), dữ liệu mẫu khớp TH1–TH6, các ràng buộc trong DB chặn đúng dữ liệu sai. Chờ cả nhóm duyệt. Bảng thực tế có thêm `loan_snapshot_changes` (lưu snapshot cũ/mới của từng phiếu khi chạy UC015).

---

## GĐ2. Đăng nhập và phân quyền

**Use case:** UC001, UC002

| Method | Endpoint | Quyền | Việc |
|---|---|---|---|
| POST | `/api/auth/login` | Tất cả | Đăng nhập, trả JWT + thông tin vai trò |
| POST | `/api/auth/logout` | Đã đăng nhập | Đăng xuất (phía client xóa token) |
| GET | `/api/auth/me` | Đã đăng nhập | Thông tin tài khoản hiện tại |
| GET | `/api/users` | Admin | Danh sách, tìm theo mã/tên |
| POST | `/api/users` | Admin | Tạo tài khoản |
| PATCH | `/api/users/:id/status` | Admin | Khóa / mở khóa |
| PATCH | `/api/users/:id/password` | Admin | Đặt lại mật khẩu |
| PATCH | `/api/users/:id/role` | Admin | Gán / đổi vai trò |

- [ ] Middleware `auth` (kiểm tra JWT) và `authorize(...roles)`
- [ ] Không phân biệt sai tên đăng nhập hay sai mật khẩu (UC001 6a); tài khoản khóa thì không đăng nhập được (7a)
- [ ] Không cho Admin tự khóa hoặc tự hạ vai trò chính mình, không khóa Admin duy nhất (UC002 7c)
- [ ] Ghi `audit_logs` cho mọi thao tác ở UC002

**Xong khi:** đăng nhập được bằng tài khoản seed; gọi API của Admin bằng token Thủ thư bị trả `403`.

---

## GĐ3. Độc giả và thẻ thư viện

**Use case:** UC003

| Method | Endpoint | Quyền | Việc |
|---|---|---|---|
| GET | `/api/readers` | Thủ thư | Danh sách, tìm theo mã/tên/lớp |
| GET | `/api/readers/:id` | Thủ thư | Chi tiết hồ sơ + thẻ |
| POST | `/api/readers` | Thủ thư | Thêm hồ sơ (mã không trùng) |
| PUT | `/api/readers/:id` | Thủ thư | Sửa hồ sơ |
| POST | `/api/readers/:id/card` | Thủ thư | Cấp thẻ |
| PATCH | `/api/readers/:id/card` | Thủ thư | Gia hạn / khóa / mở khóa thẻ |

- [ ] Kiểm tra ngày hết hạn thẻ phải sau ngày cấp (7c)
- [ ] Trạng thái "Hết hạn" tính từ ngày hết hạn, không lưu cứng (quyết định 9)

**Xong khi:** thêm, sửa, tìm độc giả và cấp, gia hạn, khóa thẻ đúng các luồng lỗi trong đặc tả.

---

## GĐ4. Sách và bản sách

**Use case:** UC004, UC005, UC006

| Method | Endpoint | Quyền | Việc |
|---|---|---|---|
| GET | `/api/categories` | Đã đăng nhập | Danh sách thể loại |
| GET | `/api/titles` | Độc giả, Thủ thư | Tra cứu theo tên/tác giả/thể loại/ISBN, kèm số bản khả dụng |
| GET | `/api/titles/:id` | Độc giả, Thủ thư | Chi tiết đầu sách |
| POST | `/api/titles` | Thủ thư | Thêm đầu sách + nhập N bản |
| PUT | `/api/titles/:id` | Thủ thư | Sửa đầu sách |
| POST | `/api/titles/:id/copies` | Thủ thư | Nhập thêm bản sách |
| DELETE | `/api/titles/:id` | Thủ thư | Xóa hoặc ẩn (quyết định 7) |
| GET | `/api/titles/:id/copies` | Thủ thư | Danh sách bản sách và trạng thái |
| PATCH | `/api/copies/:id/status` | Thủ thư | Đổi trạng thái theo quy tắc (quyết định 6) |

- [ ] Kiểm tra định dạng ISBN-13, không trùng ISBN; năm xuất bản không vượt năm hiện tại
- [ ] Không xóa đầu sách còn bản đang mượn (UC004 8b)
- [ ] Độc giả không thấy đầu sách đã ẩn
- [ ] Ghi `copy_status_logs` mỗi lần đổi trạng thái

**Xong khi:** tra cứu trả đúng số bản khả dụng; đổi trạng thái sai quy tắc bị từ chối.

---

## GĐ5. Quy định

**Use case:** UC013, UC014

| Method | Endpoint | Quyền | Việc |
|---|---|---|---|
| GET | `/api/regulations` | Admin | Quy định đang hiệu lực + các phiên bản theo vai trò |
| GET | `/api/regulations/current?readerType=` | Thủ thư | Quy định đang hiệu lực (dùng khi lập phiếu) |
| POST | `/api/regulations` | Admin | Tạo phiên bản mới với ngày hiệu lực |
| GET | `/api/regulations/logs` | Admin | Nhật ký, lọc theo thời gian/vai trò/người đổi |

- [ ] Không sửa phiên bản cũ, chỉ tạo phiên bản mới
- [ ] Ngày hiệu lực không ở quá khứ; không trùng ngày với phiên bản chưa hiệu lực khác (6c); phải có thay đổi so với hiện hành (4a)
- [ ] Phạt tối đa ≥ phạt/ngày
- [ ] Hàm dùng chung `getEffectiveRegulation(readerType, date)` cho GĐ6

**Xong khi:** đổi quy định có ngày hiệu lực ở tương lai thì quy định hiện hành chưa đổi; nhật ký ghi đúng giá trị cũ/mới.

---

## GĐ6. Mượn sách và gia hạn

**Use case:** UC007, UC008. Đây là phần nghiệp vụ khó nhất, nên làm kỹ.

| Method | Endpoint | Quyền | Việc |
|---|---|---|---|
| GET | `/api/loans/eligibility/:readerCode` | Thủ thư | Hồ sơ độc giả, sách đang mượn, nợ phạt, số cuốn còn được mượn |
| POST | `/api/loans` | Thủ thư | Lập phiếu với danh sách mã bản sách |
| GET | `/api/loans/:id` | Thủ thư | Xem / in phiếu |
| GET | `/api/loans/active?readerCode=&copyCode=` | Thủ thư | Sách đang mượn để chọn gia hạn |
| POST | `/api/loan-items/:id/renew` | Thủ thư | Gia hạn 1 cuốn |

- [ ] Kiểm tra điều kiện mượn: thẻ còn hiệu lực, tài khoản không khóa, không có sách quá hạn, không nợ phạt "Chưa thu", chưa vượt số sách (tính cả sách quá hạn)
- [ ] Kiểm tra từng bản sách: tồn tại, đang Khả dụng, không vượt số cuốn còn được mượn
- [ ] Trong **một transaction**: lấy quy định hiệu lực → tạo phiếu kèm snapshot → tạo các dòng `loan_items` với hạn trả = ngày lập + số ngày mượn → chuyển bản sách sang Đang mượn
- [ ] Gia hạn: chưa quá hạn, chưa gia hạn lần nào; hạn mới = hạn cũ + số ngày gia hạn **trong snapshot**; ghi `renewal_logs`

**Xong khi:** chạy đúng TH1 (mượn 2 cuốn), TH2 (đã 3/3 bị từ chối), TH5 (nợ phạt bị chặn); lỗi giữa chừng thì không có dữ liệu nào bị ghi.

---

## GĐ7. Trả sách, tiền phạt, lịch sử

**Use case:** UC009, UC010, UC011, UC012

| Method | Endpoint | Quyền | Việc |
|---|---|---|---|
| GET | `/api/returns/lookup/:copyCode` | Thủ thư | Tìm phiếu đang mở theo mã bản sách, tính trước số ngày trễ và tiền phạt |
| POST | `/api/returns` | Thủ thư | Xác nhận trả 1 cuốn (tình trạng, ghi chú) |
| GET | `/api/fines?readerCode=&status=` | Thủ thư | Khoản phạt của độc giả |
| POST | `/api/fines/:id/pay` | Thủ thư | Thu phạt, tạo biên lai |
| GET | `/api/receipts/:id` | Thủ thư, độc giả sở hữu | Xem biên lai |
| GET | `/api/me/loans` | Độc giả | Lịch sử của mình, lọc thời gian/trạng thái, tổng nợ chưa thu |
| GET | `/api/me/loans/:id` | Độc giả | Chi tiết phiếu của mình |

- [ ] `src/utils/fine.js`: `F = min(d × p × n ; T × n)`, lấy p, T **từ snapshot** của phiếu; snapshot thiếu thì báo lỗi, không dùng quy định hiện hành (UC010 2a)
- [ ] Viết unit test cho hàm tính phạt theo đúng các ví dụ ở Bảng 2.33
- [ ] Trả sách trong một transaction: lưu ngày trả, tình trạng, tiền phạt → đổi trạng thái bản sách → tạo khoản phạt "Chưa thu" nếu > 0 → đóng phiếu khi đã trả hết
- [ ] Hư hỏng / Mất bắt buộc có ghi chú; Mất vẫn tính phạt trễ (quyết định 8)
- [ ] `/api/me/...` lấy mã độc giả từ token; xem phiếu không phải của mình thì trả `403` và ghi `audit_logs`

**Xong khi:** chạy đúng TH3 (trả đúng hạn, phạt 0), TH4 (trễ 5 ngày → 5.000đ, trễ 45 ngày → 30.000đ); thu phạt xong thì độc giả mượn lại được.

---

## GĐ8. Áp dụng quy định cho phiếu đang mượn, báo cáo

**Use case:** UC015, UC016

| Method | Endpoint | Quyền | Việc |
|---|---|---|---|
| POST | `/api/regulations/apply-active-loans/preview` | Admin | Danh sách phiếu bị ảnh hưởng, giá trị cũ → mới |
| POST | `/api/regulations/apply-active-loans` | Admin | Áp dụng (bắt buộc lý do) |
| GET | `/api/reports/loans?from=&to=` | Thủ thư | Thống kê mượn/trả |
| GET | `/api/reports/overdue?from=&to=` | Thủ thư | Sách trả trễ và đang quá hạn |
| GET | `/api/reports/fines?from=&to=` | Thủ thư | Tiền phạt đã thu / chưa thu, độc giả còn nợ |
| GET | `/api/reports/:type/export?format=xlsx\|pdf` | Thủ thư | Xuất file |

- [ ] UC015 chạy trong transaction, lỗi thì hoàn tác toàn bộ; lưu giá trị cũ vào `regulation_logs`
- [ ] Báo cáo kiểm tra khoảng thời gian hợp lệ, "Đến ngày" không ở tương lai

**Xong khi:** chạy đúng TH6 (đổi quy định giữa chừng: phiếu cũ giữ snapshot, chỉ đổi khi Admin chủ động áp dụng); xuất được file Excel và PDF.

---

## GĐ9. Nhắc hạn trả (COULD, làm nếu còn thời gian)

**Use case:** UC017

| Method | Endpoint | Quyền | Việc |
|---|---|---|---|
| GET | `/api/reminders` | Thủ thư | Phiếu còn ≤ 3 ngày đến hạn và phiếu quá hạn |
| POST | `/api/reminders/send` | Thủ thư | Gửi email nhắc cho các phiếu đã chọn |

- [ ] Cấu hình SMTP trong `.env` (ví dụ Gmail App Password); ghi `reminder_logs` cả khi gửi thất bại

---

## GĐ10. Kiểm thử và hoàn thiện

- [ ] Bộ request Postman cho mọi endpoint, lưu trong `docs/` để cả nhóm import
- [ ] Bảng test case theo 6 tình huống TH1–TH6 và các luồng thay thế quan trọng (dùng cho chương 6 tiểu luận)
- [ ] Rà lại thông báo lỗi khớp với đặc tả
- [ ] Cập nhật phần "Cài đặt và chạy" trong README

---

## Gợi ý chia việc

| Người | Giai đoạn |
|---|---|
| Cả nhóm | GĐ0, GĐ1 (cùng duyệt sơ đồ bảng) |
| Thành viên A | GĐ2 → GĐ6 |
| Thành viên B | GĐ3 → GĐ7 (trả sách, phạt) |
| Thành viên C | GĐ4 → GĐ7 (lịch sử độc giả UC012) |
| Thành viên D | GĐ5 → GĐ8 |
| Thành viên E | Bắt đầu frontend khi GĐ2 xong; GĐ10 |

GĐ6 và GĐ7 dùng chung bảng `loans` và `loan_items`, nên hai người phụ trách cần thống nhất trước tên cột và hàm dùng chung.
