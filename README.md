# Hệ thống quản lý thư viện trường THPT

Tiểu luận học phần **Nhập môn Công nghệ Phần mềm**, Khoa Công nghệ Thông tin, Trường Đại học Sư phạm TP. Hồ Chí Minh.

| | |
|---|---|
| Nhóm | 07 |
| Mã lớp học phần | 2611COMP104406 |
| Giảng viên hướng dẫn | ThS. Lê Thanh Thoại |
| Tài liệu đặc tả | [docs/N7.pdf](docs/N7.pdf) |

## Thành viên

| STT | Họ và tên | MSSV | Phụ trách |
|---|---|---|---|
| 1 | Nguyễn Phúc Mai Nguyên | 50.01.103.053 | |
| 2 | Hồ Quỳnh Như | 50.01.103.055 | |
| 3 | Trần Nguyễn Hữu Phước | 50.01.103.060 | |
| 4 | Lê Ngọc Anh Thư | 50.01.103.074 | |
| 5 | Nguyễn Khắc Trung | 50.01.103.082 | |

## Giới thiệu

Website tin học hóa nghiệp vụ thư viện trường THPT: quản lý đầu sách và bản sách, độc giả và thẻ thư viện, lập phiếu mượn – trả, gia hạn, tính tiền phạt trả trễ tự động, thu phạt và báo cáo thống kê. Admin cấu hình quy định theo vai trò độc giả, có ngày hiệu lực và nhật ký thay đổi.

Mỗi phiếu mượn lưu **snapshot quy định** tại thời điểm lập phiếu (số ngày mượn, hạn trả, phạt/ngày, mức phạt tối đa, số ngày gia hạn). Khi quy định thay đổi, phiếu cũ vẫn tính theo thông số cũ.

### Vai trò

| Vai trò | Quyền chính |
|---|---|
| Độc giả (Học sinh, Giáo viên) | Tra cứu sách, xem lịch sử mượn/trả và khoản phạt của mình |
| Thủ thư | Quản lý độc giả, thẻ, đầu sách, bản sách; lập phiếu mượn, gia hạn, nhận trả, thu phạt, báo cáo, nhắc hạn |
| Admin (Ban giám hiệu) | Quản lý tài khoản, phân quyền, cấu hình quy định, nhật ký thay đổi; có mọi quyền của Thủ thư |

### Use case

| Mã | Tên | Module backend |
|---|---|---|
| UC001 | Đăng nhập / đăng xuất | `auth` |
| UC002 | Quản lý tài khoản & phân quyền | `users` |
| UC003 | Quản lý hồ sơ độc giả & thẻ thư viện | `readers` |
| UC004 | Quản lý đầu sách | `titles` |
| UC005 | Quản lý trạng thái bản sách | `copies` |
| UC006 | Tra cứu sách & xem số bản khả dụng | `titles` |
| UC007 | Lập phiếu mượn | `loans` |
| UC008 | Gia hạn mượn | `loans` |
| UC009 | Trả sách | `returns` |
| UC010 | Tính tiền phạt | `returns` |
| UC011 | Thu tiền phạt | `fines` |
| UC012 | Xem lịch sử mượn/trả & khoản phạt | `readers` |
| UC013 | Cấu hình quy định | `regulations` |
| UC014 | Xem nhật ký thay đổi quy định | `regulations` |
| UC015 | Áp dụng quy định mới cho phiếu đang mượn | `regulations` |
| UC016 | Báo cáo thống kê | `reports` |
| UC017 | Nhắc hạn trả (COULD) | `reminders` |

### Quy định nghiệp vụ

| Mã | Quy định | Giá trị mặc định |
|---|---|---|
| QĐ01 | Số sách mượn cùng lúc | Học sinh 3, Giáo viên 5 |
| QĐ02 | Số ngày mượn | **7 ngày** (nhóm chốt) |
| QĐ03 | Phạt trả trễ | 1.000đ/ngày/cuốn |
| QĐ04 | Gia hạn | 1 lần (HS +7 ngày, GV +14 ngày); không gia hạn khi đã quá hạn |
| QĐ05 | Chặn mượn | Còn sách quá hạn hoặc còn nợ phạt thì không được mượn mới |
| QĐ06 | Mức phạt tối đa | 30.000đ/cuốn |

- Hạn trả = ngày lập phiếu + số ngày mượn.
- Tiền phạt = min(số ngày trễ × phạt/ngày × số cuốn trễ ; mức tối đa × số cuốn trễ).
- Các giá trị trên là dữ liệu mặc định trong bảng quy định, không viết cứng trong code.

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend | ReactJS (Vite), Bootstrap, Axios, React Router |
| Backend | Node.js, Express, mysql2, JWT |
| Database | MySQL 8 |

## Cấu trúc thư mục

```
DoAn_ThuVien_CNPM/
├── docs/                  # tài liệu đặc tả, sơ đồ
├── database/
│   ├── schema.sql         # tạo bảng
│   └── seed.sql           # dữ liệu mẫu
├── backend/
│   ├── server.js
│   └── src/
│       ├── app.js
│       ├── routes.js
│       ├── config/        # kết nối MySQL
│       ├── middlewares/   # xác thực JWT, phân quyền, xử lý lỗi
│       ├── utils/         # tính hạn trả, tính phạt, định dạng response
│       └── modules/       # mỗi module: *.routes.js, *.controller.js, *.service.js, *.repository.js
│           ├── auth/  users/  readers/  titles/  copies/
│           ├── loans/  returns/  fines/
│           └── regulations/  reports/  reminders/
└── frontend/
    └── src/
        ├── api/           # gọi API backend
        ├── context/       # AuthContext
        ├── routes/        # định tuyến, chặn theo vai trò
        ├── layouts/
        ├── components/    # component dùng chung
        ├── pages/         # auth/  reader/  librarian/  admin/
        ├── hooks/
        └── utils/
```

Trong mỗi module backend: `routes` khai báo endpoint → `controller` nhận request/trả response → `service` xử lý nghiệp vụ → `repository` chứa câu SQL.

## Cài đặt và chạy

> Phần này sẽ cập nhật khi có mã nguồn.

Yêu cầu: Node.js 20 trở lên, MySQL 8, Git.

```bash
git clone <url-repo>
cd DoAn_ThuVien_CNPM

# 1. Database: tạo CSDL và import dữ liệu
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql

# 2. Backend (http://localhost:5000)
cd backend
cp .env.example .env      # sửa thông tin MySQL trong .env
npm install
npm run dev

# 3. Frontend (http://localhost:5173)
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

## Quy ước làm việc nhóm

- Không commit thẳng lên `main`. Mỗi chức năng làm trên một nhánh riêng:
  `feature/<module>`, ví dụ `feature/loans`, `feature/frontend-login`.
- Xong việc thì push nhánh và tạo Pull Request vào `main`, có ít nhất 1 thành viên khác xem trước khi merge.
- Trước khi bắt đầu làm: `git checkout main && git pull`, rồi tạo nhánh mới từ `main`.
- Commit message ngắn gọn, mô tả việc đã làm, ví dụ: `loans: kiểm tra giới hạn số sách khi lập phiếu`.
- Không commit file `.env`, `node_modules/`. Thông tin cấu hình mới thì thêm vào `.env.example`.
- Thay đổi cấu trúc bảng thì cập nhật `database/schema.sql` và báo cả nhóm.

## Tiến độ

- [x] Khảo sát bài toán, đặc tả use case (chương 1–2)
- [ ] Phân tích: lớp phân tích, biểu đồ trình tự, ERD
- [ ] Thiết kế cơ sở dữ liệu
- [ ] Backend
- [ ] Frontend
- [ ] Kiểm thử
- [ ] Hướng dẫn cài đặt và sử dụng
