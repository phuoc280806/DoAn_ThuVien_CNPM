# Ánh xạ thực thể (ERD) ↔ bảng trong database

ERD trong báo cáo ([ERD_TiengViet.png](ERD_TiengViet.png)) dùng tên tiếng Việt theo `thực thể.docx`, được vẽ từ [erd_tieng_viet.sql](erd_tieng_viet.sql).
Database thật và code backend dùng tên tiếng Anh trong [database/schema.sql](../database/schema.sql), ERD tương ứng là [ERD.png](ERD.png).
Hai file có cùng cấu trúc (17 bảng, cùng khóa chính/khóa ngoại), chỉ khác tên. **Sửa `schema.sql` thì phải sửa `erd_tieng_viet.sql` theo.**

## Tổng quan 17 thực thể

| STT | Thực thể (ERD) | Bảng (database) | Ghi chú |
|---|---|---|---|
| 1 | TaiKhoan | `users` | |
| 2 | VaiTro | `roles` | Bổ sung so với docx |
| 3 | DocGia | `readers` | |
| 4 | TheThuVien | `library_cards` | |
| 5 | TheLoai | `categories` | Bổ sung so với docx |
| 6 | DauSach | `books` | |
| 7 | BanSach | `book_copies` | |
| 8 | LichSuTrangThaiBanSach | `copy_status_logs` | Bổ sung so với docx (UC005) |
| 9 | QuyDinh | `regulations` | |
| 10 | NhatKyQuyDinh | `regulation_logs` | |
| 11 | PhieuMuon | `borrow_tickets` | |
| 12 | ChiTietPhieuMuon | `borrow_details` | |
| 13 | LichSuGiaHan | `renewal_logs` | |
| 14 | ThayDoiSnapshotPhieu | `ticket_snapshot_changes` | Bổ sung so với docx (UC015) |
| 15 | KhoanPhat | `fines` | Gộp luôn KhoanThu của docx |
| 16 | NhatKyHeThong | `audit_logs` | Bổ sung so với docx (UC002, UC012) |
| 17 | NhatKyNhacHan | `reminder_logs` | Bổ sung so với docx (UC017) |

## Khác biệt so với `thực thể.docx`

1. **Thêm 6 thực thể**: VaiTro, TheLoai, LichSuTrangThaiBanSach, ThayDoiSnapshotPhieu, NhatKyHeThong, NhatKyNhacHan.
2. **KhoanThu gộp vào KhoanPhat**: mỗi khoản phạt chỉ thu một lần, nên phần thu nằm ngay trên KhoanPhat (`thoiDiemThu`, `nguoiThu`). Mã biên lai = `BL` + `maKhoanPhat`, ví dụ `BL000002`.
3. **`vaiTro` của TaiKhoan và `theLoai` của DauSach** thành khóa ngoại `maVaiTro`, `maTheLoai` tới bảng VaiTro, TheLoai.
4. **`lopToBoMon` của DocGia** tách thành `lop` (học sinh) và `toBoMon` (giáo viên).
5. **`soBanKhaDung` của DauSach** không lưu, tính bằng cách đếm BanSach có `trangThai = AVAILABLE`.
6. **`hanTraBanDau` của PhieuMuon** không lưu. Hạn trả nằm ở từng cuốn (`ChiTietPhieuMuon.hanTra` = `ngayLap` + `soNgayMuon`) vì mỗi cuốn gia hạn riêng.
7. **`lyDoCapNhat` của BanSach** chuyển sang LichSuTrangThaiBanSach để giữ được toàn bộ lịch sử đổi trạng thái.
8. ChiTietPhieuMuon có thêm `soNgayTre`, `tienPhat`, `nguoiNhan` (thủ thư nhận sách trả).

## Ánh xạ cột

Cột không liệt kê thì trùng tên, ví dụ `email`, `isbn`.

**TaiKhoan → `users`**: maTaiKhoan = `user_id`, tenDangNhap = `username`, matKhau = `password_hash`, hoTen = `full_name`, soDienThoai = `phone`, maVaiTro = `role_id`, trangThai = `status`, ngayTao = `created_at`, ngayCapNhat = `updated_at`

**VaiTro → `roles`**: maVaiTro = `role_id`, tenVaiTro = `role_name`

**DocGia → `readers`**: maDocGia = `reader_id`, maTaiKhoan = `user_id`, maSoDocGia = `reader_code`, hoTen = `full_name`, vaiTroDocGia = `reader_type`, lop = `class_name`, toBoMon = `department`, ngaySinh = `date_of_birth`, ngayTao = `created_at`, ngayCapNhat = `updated_at`

**TheThuVien → `library_cards`**: maThe = `card_id`, maDocGia = `reader_id`, ngayCap = `issued_date`, ngayHetHan = `expiry_date`, trangThaiThe = `status`, ngayTao = `created_at`, ngayCapNhat = `updated_at`

**TheLoai → `categories`**: maTheLoai = `category_id`, tenTheLoai = `category_name`, moTa = `description`

**DauSach → `books`**: maDauSach = `book_id`, tenSach = `title`, tacGia = `author`, nhaXuatBan = `publisher`, namXuatBan = `publish_year`, maTheLoai = `category_id`, moTa = `description`, trangThaiAn = `is_hidden`, ngayTao = `created_at`, ngayCapNhat = `updated_at`

**BanSach → `book_copies`**: maBanSach = `copy_id`, maDauSach = `book_id`, maSoBanSach = `copy_code`, trangThai = `status`, viTri = `location`, ghiChu = `note`, ngayTao = `created_at`, ngayCapNhat = `updated_at`

**LichSuTrangThaiBanSach → `copy_status_logs`**: maLichSu = `log_id`, maBanSach = `copy_id`, trangThaiCu = `old_status`, trangThaiMoi = `new_status`, lyDo = `reason`, nguoiDoi = `changed_by`, thoiDiem = `changed_at`

**QuyDinh → `regulations`**: maPhienBan = `regulation_id`, vaiTroApDung = `reader_type`, soSachToiDa = `max_books`, soNgayMuon = `borrow_days`, phatNgay = `fine_per_day`, phatToiDa = `max_fine_per_book`, soNgayGiaHan = `renew_days`, ngayHieuLuc = `effective_from`, nguoiTao = `created_by`, ngayTao = `created_at`

**NhatKyQuyDinh → `regulation_logs`**: maNhatKy = `log_id`, loaiThayDoi = `change_type`, vaiTroApDung = `reader_type`, maPhienBan = `regulation_id`, giaTriCu = `old_values`, giaTriMoi = `new_values`, ngayHieuLuc = `effective_from`, lyDo = `reason`, soPhieuAnhHuong = `affected_tickets`, nguoiDoi = `changed_by`, thoiDiem = `changed_at`

**PhieuMuon → `borrow_tickets`**: maPhieu = `borrow_id`, maDocGia = `reader_id`, maThuThuLap = `librarian_id`, maPhienBan = `regulation_id`, ngayLap = `borrow_date`, soNgayMuon = `snap_borrow_days`, phatNgay = `snap_fine_per_day`, phatToiDa = `snap_max_fine_per_book`, soNgayGiaHan = `snap_renew_days`, trangThaiPhieu = `status`, thoiDiemHoanTat = `completed_at`, ngayTao = `created_at`

**ChiTietPhieuMuon → `borrow_details`**: maChiTiet = `borrow_detail_id`, maPhieu = `borrow_id`, maBanSach = `copy_id`, hanTra = `due_date`, soLanGiaHan = `renew_count`, ngayTra = `return_date`, tinhTrangSach = `return_condition`, ghiChu = `return_note`, soNgayTre = `late_days`, tienPhat = `fine_amount`, nguoiNhan = `received_by`

**LichSuGiaHan → `renewal_logs`**: maGiaHan = `renewal_id`, maChiTiet = `borrow_detail_id`, hanTraCu = `old_due_date`, hanTraMoi = `new_due_date`, maThuThu = `renewed_by`, thoiDiemGiaHan = `renewed_at`

**ThayDoiSnapshotPhieu → `ticket_snapshot_changes`**: maThayDoi = `change_id`, maNhatKy = `log_id`, maPhieu = `borrow_id`, giaTriCu = `old_values`, giaTriMoi = `new_values`

**KhoanPhat → `fines`**: maKhoanPhat = `fine_id`, maChiTiet = `borrow_detail_id`, maDocGia = `reader_id`, soNgayTre = `late_days`, soTienPhat = `amount`, lyDo = `reason`, trangThai = `status`, ngayTao = `created_at`, thoiDiemThu = `paid_at`, nguoiThu = `collected_by`

**NhatKyHeThong → `audit_logs`**: maNhatKy = `log_id`, maTaiKhoan = `user_id`, hanhDong = `action`, loaiDoiTuong = `target_type`, maDoiTuong = `target_id`, chiTiet = `detail`, diaChiIP = `ip_address`, thoiDiem = `created_at`

**NhatKyNhacHan → `reminder_logs`**: maNhacHan = `reminder_id`, maChiTiet = `borrow_detail_id`, nguoiGui = `sent_by`, thoiDiemGui = `sent_at`, thanhCong = `success`, noiDungLoi = `error_message`

## Giá trị trạng thái

Giá trị ENUM giữ nguyên tiếng Anh như database:

| Giá trị | Nghĩa |
|---|---|
| `ACTIVE` / `LOCKED` | Hoạt động / Bị khóa (tài khoản, thẻ) |
| `STUDENT` / `TEACHER` | Học sinh / Giáo viên |
| `AVAILABLE` / `BORROWED` / `DAMAGED` / `LOST` | Có sẵn / Đang mượn / Hư hỏng / Mất (bản sách) |
| `BORROWING` / `COMPLETED` | Đang mượn / Đã hoàn tất (phiếu) |
| `GOOD` / `DAMAGED` / `LOST` | Tốt / Hư hỏng / Mất (tình trạng khi trả) |
| `UNPAID` / `PAID` | Chưa thu / Đã thu (khoản phạt) |
| `CONFIG` / `APPLY_ACTIVE_LOANS` | Cấu hình quy định mới / Áp dụng cho phiếu đang mượn |

## Lược bỏ trên ERD

- Cột kỹ thuật `borrow_details.active_copy_id`: cột sinh tự động, dùng để chặn một bản sách nằm trong hai phiếu đang mượn cùng lúc.
- Các ràng buộc `CHECK` và các index chỉ phục vụ tìm kiếm.
