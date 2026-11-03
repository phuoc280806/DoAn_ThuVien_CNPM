# Frontend — Hệ thống Quản lý Thư viện Trường THPT

React + Vite + Tailwind CSS + React Router + Axios.

Giao diện bám mockup (sidebar theo vai trò, màu #1A365D / #2B6CB0, form mượn-trả, dashboard…).

## Chạy local

```bash
cd frontend
cp .env.example .env   # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev
```

Mở http://localhost:5173

## Tài khoản demo (mock, không cần backend)

Mật khẩu: `Thuvien@2026`

| Tài khoản   | Vai trò   |
|-------------|-----------|
| HS2026001   | Học sinh  |
| TT01        | Thủ thư   |
| AD001       | Admin     |

Nếu backend chạy tại `:5000`, login sẽ ưu tiên gọi API thật; khi API lỗi sẽ fallback mock.

## Cấu trúc

```
src/
  api/           # Axios client + modules (auth, books, loans, ...)
  context/       # AuthContext (JWT + mock)
  layouts/       # AppLayout (sidebar theo role)
  pages/
    auth/        # Login
    reader/      # Dashboard, tra cứu, đang mượn, lịch sử, phạt, profile
    librarian/   # Dashboard, độc giả, sách, mượn, trả, phạt, báo cáo, nhắc hạn
    admin/       # Dashboard, tài khoản, quy định (+ kế thừa thủ thư)
  routes/        # ProtectedRoute theo role
  utils/         # mockData, format
```

## Kết nối Backend

- Proxy Vite: `/api` → `http://localhost:5000`
- Token lưu `localStorage`, gắn header `Authorization: Bearer ...`
- Khi backend sẵn sàng, các trang có thể thay mock bằng gọi API tương ứng trong `src/api/`

## Build production

```bash
npm run build
npm run preview
```
