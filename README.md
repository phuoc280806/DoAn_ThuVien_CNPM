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

Yêu cầu: Node.js 20 trở lên, MySQL 8 (đang chạy), Git.

```bash
git clone https://github.com/phuoc280806/DoAn_ThuVien_CNPM.git
cd DoAn_ThuVien_CNPM

# 1. Backend
cd backend
cp .env.example .env      # mở .env, điền DB_PASSWORD là mật khẩu MySQL của máy bạn
npm install

# 2. Tạo database thuvien_thpt và nạp dữ liệu mẫu
npm run db:reset

# 3. Chạy backend (http://localhost:5000)
npm run dev               # kiểm tra: mở http://localhost:5000/api/health

# 4. Frontend (http://localhost:5173) – chưa có
cd ../frontend
cp .env.example .env
npm install
npm run dev
```

`npm run db:reset` **xóa sạch** database `thuvien_thpt` rồi tạo lại từ `database/schema.sql` và `database/seed.sql`. Dùng lệnh này mỗi khi có người sửa schema, hoặc khi muốn đưa dữ liệu về trạng thái ban đầu. Cũng có thể mở hai file SQL này trong MySQL Workbench và chạy lần lượt.

### Tài khoản mẫu

Mật khẩu chung: `Thuvien@2026`

| Tài khoản | Vai trò | Tình huống thử |
|---|---|---|
| `AD001` | Admin | |
| `TT01`, `TT02` | Thủ thư | |
| `HS2026001` | Học sinh | Không mượn gì → TH1 mượn bình thường |
| `HS2026002` | Học sinh | Đang mượn 3/3 → TH2 mượn thêm bị từ chối |
| `HS2026003` | Học sinh | Còn 2 ngày đến hạn → TH3 trả đúng hạn, nhắc hạn |
| `HS2026004` | Học sinh | Quá hạn 5 ngày → TH4 phạt 5.000đ |
| `HS2026005` | Học sinh | Nợ phạt 3.000đ → TH5 bị chặn mượn |
| `HS2026006` | Học sinh | Quá hạn 45 ngày, phiếu theo quy định cũ 14 ngày → phạt tối đa 30.000đ, TH6 |
| `HS2026007` | Học sinh | Thẻ hết hạn |
| `HS2026008` | Học sinh | Đã gia hạn 1 lần |
| `HS2026009` | Học sinh | Thẻ bị khóa |
| `HS2026010` | Học sinh | Tài khoản bị khóa |
| `GV2026001` – `GV2026003` | Giáo viên | Đang mượn / có lịch sử nộp phạt / không mượn gì |

Độc giả `HS2026011` có hồ sơ và thẻ nhưng chưa có tài khoản (thử Admin cấp tài khoản ở UC002). Chi tiết từng tình huống ghi ở đầu file `database/seed.sql`.

File `database/test_borrow_return.sql` diễn tập bằng SQL cả luồng mượn → gia hạn → trả trễ → thu phạt → đổi quy định. Mở trong MySQL Workbench, chạy từng khối và so với dòng `Kỳ vọng` ghi bên dưới mỗi khối.

## Hướng dẫn sử dụng Git

Repo: https://github.com/phuoc280806/DoAn_ThuVien_CNPM

### Quy ước chung

- **Không commit thẳng lên `main`.** Mỗi việc làm trên một nhánh riêng, xong thì tạo Pull Request (PR) để gộp vào `main`.
- Đặt tên nhánh theo dạng `feature/<việc>` hoặc `fix/<lỗi>`, ví dụ `feature/loans`, `feature/frontend-login`, `fix/tinh-phat`.
- Commit message ngắn gọn, ghi rõ module và việc đã làm, ví dụ `loans: kiểm tra giới hạn số sách khi lập phiếu`.
- Không commit `.env`, `node_modules/`. Có biến cấu hình mới thì thêm vào `.env.example`.
- Sửa cấu trúc bảng thì cập nhật `database/schema.sql` và báo cả nhóm.
- Mỗi người làm một module khác nhau để hạn chế xung đột (conflict).

### Bước 1. Cài đặt (làm một lần)

1. Cài Git: https://git-scm.com/downloads
2. Khai báo tên và email, dùng đúng email tài khoản GitHub:
   ```bash
   git config --global user.name "Ten Cua Ban"
   git config --global user.email "email-github@example.com"
   ```
3. Chấp nhận lời mời làm Collaborator của repo, gửi qua email hoặc xem tại https://github.com/notifications.

### Bước 2. Lấy repo về máy (làm một lần)

```bash
cd D:/                      # thư mục muốn lưu dự án
git clone https://github.com/phuoc280806/DoAn_ThuVien_CNPM.git
cd DoAn_ThuVien_CNPM
```

Lần đầu push, Git sẽ mở cửa sổ đăng nhập GitHub. Chọn **Sign in with your browser** để đăng nhập.

### Bước 3. Mỗi lần bắt đầu làm việc mới

Luôn cập nhật `main` mới nhất rồi tạo nhánh mới từ đó:

```bash
git checkout main
git pull origin main
git checkout -b feature/loans       # đổi tên cho đúng việc của bạn
```

Đang làm dở trên một nhánh có sẵn thì chỉ cần chuyển sang nhánh đó:

```bash
git checkout feature/loans
```

### Bước 4. Lưu thay đổi (commit)

```bash
git status                          # xem file nào đã thay đổi
git add .                           # đưa tất cả thay đổi vào commit
                                    # hoặc: git add backend/src/modules/loans
git commit -m "loans: thêm API lập phiếu mượn"
```

Nên commit thường xuyên, mỗi commit là một phần việc hoàn chỉnh nhỏ.

### Bước 5. Đẩy lên GitHub (push)

Trước khi push, lấy các thay đổi mới trên `main` về nhánh của mình để giảm xung đột:

```bash
git pull origin main                # gộp main mới nhất vào nhánh hiện tại
git push -u origin feature/loans    # lần đầu push nhánh này
git push                            # các lần sau chỉ cần lệnh này
```

### Bước 6. Tạo Pull Request

1. Mở trang repo trên GitHub, bấm **Compare & pull request** ở thanh thông báo màu vàng, hoặc vào tab **Pull requests** → **New pull request**.
2. Chọn `base: main` ← `compare: feature/loans`.
3. Ghi tiêu đề và mô tả việc đã làm, ở mục **Reviewers** chọn một thành viên khác.
4. Người review xem code, góp ý hoặc **Approve**, sau đó bấm **Merge pull request**.
5. Sau khi merge, xóa nhánh trên GitHub (nút **Delete branch**), rồi trên máy:
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/loans
   ```

### Xử lý xung đột (conflict)

Khi `git pull` báo `CONFLICT`, Git đánh dấu đoạn bị xung đột trong file:

```
<<<<<<< HEAD
code của bạn
=======
code của người khác
>>>>>>> main
```

1. Mở file, giữ lại phần đúng (hoặc kết hợp cả hai), xóa các dòng `<<<<<<<`, `=======`, `>>>>>>>`. VS Code có sẵn nút **Accept Current / Accept Incoming / Accept Both**.
2. Lưu file rồi chạy:
   ```bash
   git add .
   git commit -m "Gộp main, xử lý xung đột"
   git push
   ```

Không chắc nên giữ phần nào thì hỏi người viết đoạn code kia trước khi sửa.

### Lệnh hay dùng

| Lệnh | Tác dụng |
|---|---|
| `git status` | Xem trạng thái các file |
| `git log --oneline` | Xem lịch sử commit |
| `git branch` | Xem các nhánh trên máy, nhánh hiện tại có dấu `*` |
| `git diff` | Xem thay đổi chưa `add` |
| `git restore <file>` | Bỏ thay đổi chưa `add` của một file |
| `git restore --staged <file>` | Bỏ `add` một file (giữ nguyên nội dung đã sửa) |
| `git stash` / `git stash pop` | Cất tạm thay đổi để chuyển nhánh / lấy lại |

**Không dùng** `git push --force` lên `main`, vì lệnh này ghi đè và làm mất code của người khác.

## Tiến độ

Lộ trình chi tiết của backend và các quyết định bổ sung cho đặc tả: [docs/LO_TRINH_BACKEND.md](docs/LO_TRINH_BACKEND.md).

- [x] Khảo sát bài toán, đặc tả use case (chương 1–2)
- [ ] Phân tích: lớp phân tích, biểu đồ trình tự, ERD
- [ ] Thiết kế cơ sở dữ liệu
- [ ] Backend
- [ ] Frontend
- [ ] Kiểm thử
- [ ] Hướng dẫn cài đặt và sử dụng
