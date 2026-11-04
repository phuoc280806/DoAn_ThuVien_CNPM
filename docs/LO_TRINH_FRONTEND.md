# Lộ trình làm Frontend

Frontend ReactJS + Bootstrap cho hệ thống quản lý thư viện trường THPT. Tài liệu này dành cho các bạn làm **FE4, FE5, FE6**: mỗi trang cần làm gì, gọi API nào, dữ liệu trả về ra sao, xem màn hình mẫu nào và kiểm thử thế nào.

## Tiến độ và phân công

| Giai đoạn | Nội dung | Trang (đường dẫn) | Trạng thái |
|---|---|---|---|
| FE1 | Khung dự án, đăng nhập, menu theo vai trò, chặn quyền, tài khoản cá nhân | `/login`, `/profile` | Xong |
| FE2 | Thủ thư: lập phiếu mượn, trả sách, thu phạt, gia hạn | `/borrow`, `/return`, `/fines`, `/renew` | Xong |
| FE3 | Admin: tài khoản, quy định, nhật ký, quản lý mượn trả | `/accounts`, `/regulations`, `/audit-logs`, `/loans` | Xong |
| **FE4** | **Độc giả**: tra cứu sách, sách đang mượn, lịch sử, tiền phạt | `/search`, `/my-loans`, `/my-history`, `/my-fines` | Xong |
| **FE5** | **Thủ thư**: hồ sơ độc giả & thẻ, đầu sách, bản sách | `/readers`, `/books`, `/copies` | Xong |
| **FE6** | **Thủ thư/Admin**: báo cáo, nhắc hạn; số liệu trang Tổng quan cho cả 3 vai trò | `/reports`, `/reminders`, `/dashboard` | Xong |

FE4, FE5, FE6 **không phụ thuộc nhau**, ba người làm song song được. Backend đã có đủ API cho cả ba giai đoạn, **không cần sửa backend**.

Cả ba giai đoạn đã hoàn thành; các mục dưới đây giữ lại làm mô tả từng trang.

---

## 1. Chuẩn bị (làm một lần)

1. Cài đặt và chạy được hệ thống theo README, mục **Cài đặt và sử dụng** → **Chạy hệ thống mỗi lần làm việc**. Đăng nhập thử bằng `HS2026001`, `TT01`, `AD001` (mật khẩu `Thuvien@2026`).
2. Xin thư mục `figma/` (thiết kế giao diện, không có trên git) từ Phước, đặt vào thư mục gốc dự án `DoAn_ThuVien_CNPM/figma/`. Mở file `.html` bằng trình duyệt để xem.
3. Tạo nhánh riêng từ `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/fe4-doc-gia        # FE5: feature/fe5-sach-doc-gia, FE6: feature/fe6-bao-cao
   ```
4. Đọc mục 2 bên dưới (khoảng 10 phút) trước khi viết code.

---

## 2. Những gì đã có sẵn

### 2.1. Cách một trang được nối vào hệ thống

```
src/routes/pages.js        khai báo đường dẫn, vai trò được vào, menu  ──►  gán component
src/pages/<vai trò>/X.jsx   giao diện trang
src/api/x.js                hàm gọi API (đã viết sẵn cho FE4–FE6)
```

Làm xong component, mở `src/routes/pages.js`, import và gán vào `component` của trang. Ví dụ với trang tra cứu:

```js
import SearchPage from '../pages/reader/SearchPage';
...
{ path: '/search', label: 'Tra cứu sách', icon: 'search', roles: [ROLES.READER], uc: ['UC006'], phase: 'FE4', component: SearchPage },
```

Menu, đường dẫn và kiểm tra quyền tự hoạt động. Không sửa `App.jsx`, `Sidebar.jsx`.

### 2.2. Gọi API

Các file trong `src/api/` đã viết sẵn. Mỗi hàm trả về **body** của response: `{ success, data, message }`.

```js
import * as booksApi from '../../api/books';
import { errorMessage } from '../../api/client';

try {
  const body = await booksApi.createBook(form);
  toast.success(body.message);          // "Thêm đầu sách thành công"
} catch (err) {
  setError(errorMessage(err));          // câu lỗi của backend, vd "ISBN đã tồn tại trong hệ thống"
}
```

- Token đăng nhập tự gắn vào mọi request. Gặp `401` (hết phiên), hệ thống tự đưa về trang đăng nhập.
- **Luôn hiện đúng câu thông báo của backend** (`body.message`, `errorMessage(err)`). Không tự viết câu khác, vì câu chữ đã bám đặc tả N7.
- Lỗi kiểm tra dữ liệu (`400`) còn có `err.response.data.errors = [{ field, message }]`, dùng khi muốn báo lỗi ngay dưới từng ô nhập.

| File | Dùng cho | Hàm |
|---|---|---|
| `api/books.js` | FE4, FE5 | `listCategories`, `listBooks`, `getBook`, `createBook`, `updateBook`, `deleteBook`, `setBookHidden`, `listBookCopies`, `addCopies` |
| `api/copies.js` | FE5 | `getCopyByCode`, `changeCopyStatus` |
| `api/readers.js` | FE5 | `listReaders`, `getReader`, `createReader`, `updateReader`, `issueCard`, `renewCard`, `setCardStatus` |
| `api/me.js` | FE4 | `getMyLoans`, `getMyTicket` |
| `api/fines.js` | FE4, FE6 | `getReceipt` (độc giả chỉ xem được biên lai của mình), `listFines` |
| `api/reports.js` | FE6 | `getReport`, `exportReport` |
| `api/reminders.js` | FE6 | `listReminders`, `sendReminders`, `listReminderLogs` |
| `api/loans.js` | FE6 | `listLoans` (đếm phiếu đang mượn / quá hạn cho trang Tổng quan) |

### 2.3. Component và tiện ích dùng lại

| Tên | Ở đâu | Dùng khi | Trang mẫu đang dùng |
|---|---|---|---|
| `PageHeader` | `components/` | Tiêu đề trang + nút bên phải | mọi trang |
| `ListCard` + `usePagedList` | `components/`, `hooks/` | Bảng có lọc, đang tải, danh sách trống, phân trang | `pages/admin/LoansPage.jsx` (ngắn, nên đọc trước) |
| `FormModal` | `components/` | Form thêm / sửa trong modal | `pages/admin/AccountsPage.jsx` |
| `ConfirmModal` | `components/` | Hỏi xác nhận trước thao tác quan trọng (xóa, khóa…) | `pages/admin/AccountsPage.jsx` |
| `StatusBadge` | `components/` | Nhãn trạng thái đúng tên đặc tả: `copy`, `fine`, `ticket`, `card`, `account`, `condition`, `due`, `role` | `pages/librarian/FinesPage.jsx` |
| `ScanInput` | `components/` | Ô nhập mã độc giả / mã bản sách, Enter để gửi | `pages/librarian/ReturnPage.jsx` |
| `QuickPicks` | `components/` | Nút "Thử nhanh" điền sẵn mã có trong seed để demo | `pages/librarian/BorrowPage.jsx` |
| `Field` | `components/` | Cặp nhãn – giá trị trong lưới thông tin | `components/TicketDetailModal.jsx` |
| `TicketDetailModal` | `components/` | Chi tiết một phiếu mượn + snapshot quy định | `pages/admin/LoansPage.jsx` |
| `ReceiptModal` | `components/` | Biên lai thu phạt, in được | `pages/librarian/FinesPage.jsx` |
| `useToast()` | `context/ToastContext` | Thông báo nhanh `toast.success(...)`, `toast.error(...)` | mọi trang |
| `useAuth()` | `context/AuthContext` | Người đang đăng nhập: `user.role`, `user.reader.readerCode` | `pages/common/ProfilePage.jsx` |
| `formatDate`, `formatDateTime`, `formatMoney`, `todayVN`, `addDays`, `diffDays` | `utils/format.js` | Ngày `dd/mm/yyyy`, tiền `1.000đ` | mọi trang |
| `READER_TYPE_LABELS`, `ROLE_LABELS` | `utils/roles.js` | "Học sinh", "Giáo viên", "Thủ thư"… | |
| `snapshotText`, `REG_PARAMS` | `utils/regulation.js` | Hiện quy định lưu trên phiếu | `components/TicketDetailModal.jsx` |

Khung một trang danh sách (chép rồi sửa):

```jsx
import { useState } from 'react';
import { Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import * as readersApi from '../../api/readers';
import usePagedList from '../../hooks/usePagedList';
import PageHeader from '../../components/PageHeader';
import ListCard from '../../components/ListCard';

export default function ReadersPage() {
  const [form, setForm] = useState({ keyword: '', readerType: '' });
  const [filters, setFilters] = useState(form);                // đổi filters thì tự tải lại, về trang 1
  const list = usePagedList(readersApi.listReaders, filters);  // list.data = { items, page, pageSize, total }

  return (
    <>
      <PageHeader title="Độc giả & thẻ" subtitle="UC003 · ..." />
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={(e) => { e.preventDefault(); setFilters(form); }}>
            {/* các ô lọc */}
          </Form>
        </Card.Body>
      </Card>
      <ListCard list={list} empty="Không tìm thấy độc giả.">
        <Table hover responsive className="align-middle mb-0">
          {/* list.data.items.map(...) */}
        </Table>
      </ListCard>
    </>
  );
}
```

Sau khi thêm / sửa / xóa thành công, gọi `list.reload()` để tải lại bảng.

### 2.4. Quy ước giao diện (nhóm đã chốt)

- Dùng component của `react-bootstrap` (`Table`, `Form`, `Card`, `Modal`, `Button`…), không thêm thư viện giao diện khác. Icon: [Bootstrap Icons](https://icons.getbootstrap.com), viết `<i className="bi bi-search" />`.
- Ngày hiển thị `dd/mm/yyyy`, tiền `1.000đ`, toàn bộ tiếng Việt. **Gửi lên API thì ngày phải dạng `YYYY-MM-DD`** (giá trị của `<input type="date">` đã đúng dạng này).
- Nhãn trạng thái dùng `StatusBadge`, đúng tên đặc tả: "Khả dụng", "Đang mượn", "Hư hỏng", "Mất", "Chưa thu", "Đã thu"… Không dùng chữ của prototype như "Đã thanh toán".
- Ưu tiên máy tính; thu nhỏ cửa sổ còn khoảng 390px vẫn phải dùng được, nhất là các trang của độc giả (FE4).
- Mọi thao tác thay đổi dữ liệu: nút có trạng thái đang xử lý (`disabled` + `Spinner`), thành công thì `toast.success(body.message)`, lỗi thì hiện câu lỗi của backend.

### 2.5. Chức năng có trong prototype nhưng **không làm**

Nhóm đã chốt bỏ, ghi vào phạm vi Out-of-scope:

- Thông báo (màn hình `man-hinh-08`, `-23`, `-29`).
- Độc giả gửi yêu cầu gia hạn (`man-hinh-07`, `-19`, `-35`). Theo UC008, chỉ thủ thư gia hạn tại quầy.
- Phân loại sách (`man-hinh-15`). Thể loại có sẵn trong database, chỉ đọc.

---

## 3. FE4 – Trang của Độc giả

Đăng nhập thử bằng `HS2026002` (đang mượn 3 cuốn), `HS2026006` (quá hạn 45 ngày), `HS2026005` (còn nợ phạt), `GV2026002` (có lịch sử nộp phạt), `HS2026001` (chưa mượn gì).

Đặt file ở `src/pages/reader/`.

### 3.1. Tra cứu sách – `/search` (UC006)

Màn hình mẫu: `figma/man-hinh-02.html` (danh sách), `figma/man-hinh-03.html` (chi tiết sách).

**API**
- `listCategories()` → `data = [{ categoryId, name }]` để làm ô lọc thể loại.
- `listBooks({ keyword, categoryId, page, pageSize })` → `data = { items, page, pageSize, total }`. Mỗi `item`:
  ```js
  { bookId, isbn, title, author, publisher, publishYear,
    category: { categoryId, name }, description, isHidden, totalCopies, availableCopies }
  ```
  - `keyword` tìm theo tên sách, tác giả, ISBN, **không phân biệt dấu**: "de men" ra "Dế Mèn phiêu lưu ký".
  - Độc giả **không thấy** đầu sách đã ẩn (backend tự lọc).
  - Không có kết quả: `items` rỗng, `body.message = "Không tìm thấy đầu sách phù hợp với thông tin tìm kiếm"`.
- `getBook(bookId)` → một đầu sách như trên. Sách đã ẩn: `404 "Không tìm thấy đầu sách"`.

**Cần làm**
1. Ô tìm kiếm + ô chọn thể loại, dùng `usePagedList(booksApi.listBooks, filters)`.
2. Hiện danh sách (bảng hoặc thẻ như prototype): tên sách, tác giả, thể loại, NXB, năm, **số bản có sẵn / tổng số bản**.
3. `availableCopies = 0` thì ghi rõ "Hết sách" (UC006 luồng 8a), có thể dùng `Badge` màu đỏ.
4. Bấm vào một sách thì mở **modal chi tiết** (gọi `getBook`): thêm ISBN, mô tả. Dùng modal thay vì tạo đường dẫn mới, để khỏi phải sửa `pages.js`.
5. Độc giả không tự mượn trên web. Trong chi tiết sách ghi: "Mang mã độc giả đến quầy thư viện để mượn".

**Dữ liệu thử:** `de men` (1 kết quả, còn 2/3 bản), lọc thể loại "Khoa học" (4 sách), `Không gia đình` (0 bản khả dụng), `vat li` (chỉ thấy "Vật lí 11", không thấy bản cũ đã ẩn).

### 3.2. Sách đang mượn – `/my-loans` (UC012)

Màn hình mẫu: `figma/man-hinh-04.html`.

**API:** `getMyLoans()` → `data = { unpaidTotal, items }`, `body.message` có thể là "Bạn chưa có giao dịch mượn nào". Mỗi `item` là **một cuốn**:
```js
{ borrowDetailId, borrowId, ticketCode, title, copyCode, borrowDate, dueDate, returnDate,
  status,        // BORROWING | OVERDUE | RETURNED
  renewCount, lateDays, fineAmount,
  fineStatus,    // UNPAID | PAID | null
  fineId, receiptCode }
```
Mã độc giả lấy từ phiên đăng nhập; frontend **không** gửi mã độc giả.

**Cần làm**
1. Lọc các cuốn có `status` là `BORROWING` hoặc `OVERDUE`.
2. Hiện: tên sách, mã bản, mã phiếu, ngày mượn, hạn trả, đã gia hạn mấy lần, trạng thái (`<StatusBadge type="due" value="OVERDUE" />` cho quá hạn).
3. **Cảnh báo sắp đến hạn** (yêu cầu G7-FR12 của GV): cuốn còn ≤ 3 ngày (`diffDays(todayVN(), dueDate) <= 3`) thì tô màu hoặc gắn nhãn "Sắp đến hạn". Quá hạn thì hiện số ngày trễ và tiền phạt dự kiến. Có thể ghi chú: tiền phạt chính xác do thủ thư tính khi trả.
4. Ghi chú: "Muốn gia hạn, mang sách đến quầy thư viện (mỗi cuốn 1 lần, khi chưa quá hạn)".
5. Bấm mã phiếu thì mở chi tiết phiếu: `<TicketDetailModal borrowId={id} load={meApi.getMyTicket} onClose={...} />` (đã hỗ trợ sẵn tham số `load`).

**Dữ liệu thử:** `HS2026002` 3 cuốn; `HS2026003` 1 cuốn còn 2 ngày (phải có cảnh báo); `HS2026006` quá hạn 45 ngày; `HS2026001` không có cuốn nào.

### 3.3. Lịch sử mượn/trả – `/my-history` (UC012)

Màn hình mẫu: `figma/man-hinh-05.html`.

**API:** `getMyLoans({ status, from, to })`. Các lỗi backend báo:
- `from > to` → `400 "Khoảng thời gian không hợp lệ"`.
- `to` ở tương lai → `400 "Đến ngày không được lớn hơn ngày hiện tại"`.
- Lọc mà không có kết quả: `message = "Không có giao dịch phù hợp"`.

**Cần làm**
1. Bộ lọc: trạng thái (Tất cả / Đang mượn / Quá hạn / Đã trả), từ ngày, đến ngày.
2. Bảng: phiếu, sách, ngày mượn, hạn trả, ngày trả, trễ, tiền phạt, trạng thái phạt (`<StatusBadge type="fine" value={fineStatus} />`), biên lai.
3. Chi tiết phiếu: dùng lại `TicketDetailModal` như mục 3.2.
4. Chỉ hiện dữ liệu của chính mình (backend đã đảm bảo). Thử sửa tay để xem phiếu người khác thì nhận `403 "Bạn không có quyền xem dữ liệu này"`, cứ hiện câu lỗi này.

**Dữ liệu thử:** `GV2026002` (1 cuốn trả đúng hạn, 1 cuốn trả trễ 4 ngày đã nộp 4.000đ, biên lai `BL000002`).

### 3.4. Tiền phạt – `/my-fines` (UC012)

Màn hình mẫu: `figma/man-hinh-06.html`.

**API:** `getMyLoans()` (lấy các cuốn có `fineAmount > 0`) và `getReceipt(fineId)` cho biên lai.

**Cần làm**
1. Ô tổng: **còn nợ** `formatMoney(unpaidTotal)`. Nếu còn nợ thì ghi rõ "Bạn sẽ bị chặn mượn sách mới đến khi nộp phạt tại quầy" (quy định QĐ05).
2. Bảng các khoản phạt: sách, phiếu, số ngày trễ, số tiền, trạng thái "Chưa thu" / "Đã thu".
3. Khoản "Đã thu": nút **Biên lai** → `getReceipt(fineId)` → hiện bằng `<ReceiptModal receipt={body.data} onClose={...} />`. Độc giả in được biên lai của mình.
4. Không có nút thu tiền: độc giả nộp tại quầy, thủ thư thu ở trang `/fines`.

**Dữ liệu thử:** `HS2026005` (nợ 3.000đ, chưa thu); `GV2026002` (đã thu 4.000đ, có biên lai).

### 3.5. Kiểm thử FE4

Ghi kết quả vào `docs/BANG_TEST_CASE_CHUONG_6.md` mục 6.5, dùng mã **GUI-23 → GUI-29** (để không trùng với người khác), theo mẫu các dòng GUI đã có. Gợi ý:

| Mã | Kiểm tra |
|---|---|
| GUI-23 | Tra cứu không dấu `de men`, lọc thể loại, sách hết bản hiện "Hết sách" |
| GUI-24 | Độc giả không thấy đầu sách đã ẩn (`vat li`) |
| GUI-25 | `HS2026003` thấy cảnh báo sắp đến hạn; `HS2026006` thấy quá hạn |
| GUI-26 | Lịch sử lọc theo trạng thái và ngày; khoảng ngày sai báo lỗi |
| GUI-27 | `HS2026005` thấy nợ 3.000đ và cảnh báo bị chặn mượn |
| GUI-28 | `GV2026002` xem và in biên lai `BL000002` |
| GUI-29 | Trang độc giả dùng được ở màn hình 390px |

Sau đó thêm mã GUI vào cột Test case của **G7-FR05** và **G7-FR09** trong `docs/RTM.md`.

---

## 4. FE5 – Quản lý độc giả & sách (Thủ thư)

Đăng nhập bằng `TT01`. Đặt file ở `src/pages/librarian/`.

### 4.1. Độc giả & thẻ – `/readers` (UC003)

Màn hình mẫu: `figma/man-hinh-11.html` (hồ sơ), `figma/man-hinh-12.html` (thẻ), `figma/modal-01.html` (form thêm độc giả).

**API**
- `listReaders({ keyword, readerType, page, pageSize })`: `keyword` tìm theo mã, họ tên, lớp, tổ bộ môn (không dấu). Mỗi `item`:
  ```js
  { readerId, readerCode, fullName, readerType, className, department, email, dateOfBirth, createdAt,
    account: { userId, username, status } | null,      // null: Admin chưa cấp tài khoản
    card: { cardId, issuedDate, expiryDate, status } | null }   // status: ACTIVE | EXPIRED | LOCKED
  ```
- `createReader({ readerCode, fullName, readerType, className, department, email, dateOfBirth })` → "Thêm hồ sơ độc giả thành công".
  - `readerCode` gồm 3–20 chữ / số, không trùng (`409 "Mã độc giả đã tồn tại"`).
  - Học sinh nhập **lớp** (`className`), giáo viên nhập **tổ bộ môn** (`department`); trường không đúng loại sẽ bị bỏ.
- `updateReader(id, {...})`: giống thêm nhưng **không sửa được mã độc giả**.
- `issueCard(id, expiryDate)` → "Cấp thẻ thư viện thành công".
  - Ngày hết hạn phải sau ngày cấp (`400 "Ngày hết hạn thẻ phải sau ngày cấp"`).
  - Đã có thẻ thì báo `409 "Độc giả đã có thẻ thư viện. Dùng chức năng gia hạn hoặc khóa thẻ"`.
- `renewCard(id, expiryDate)`: ngày mới phải sau hôm nay.
- `setCardStatus(id, 'LOCKED' | 'ACTIVE')` → "Đã khóa thẻ" / "Đã mở khóa thẻ".

**Cần làm**
1. Bảng độc giả có lọc (khung ở mục 2.3): mã, họ tên, loại + lớp/tổ, thẻ (`<StatusBadge type="card" value={card?.status ?? null} />` kèm ngày hết hạn), tài khoản ("Chưa cấp" nếu `account = null`).
2. Nút **Thêm độc giả** và **Sửa** dùng `FormModal`. Ô lớp / tổ bộ môn đổi theo loại độc giả đã chọn.
3. Thao tác thẻ: **Cấp thẻ** (khi chưa có), **Gia hạn thẻ** (chọn ngày mới), **Khóa / Mở khóa thẻ** (dùng `ConfirmModal`).
4. Việc cấp tài khoản đăng nhập cho độc giả là của Admin (trang `/accounts`). Ở đây chỉ hiện trạng thái tài khoản.

**Dữ liệu thử:** `HS2026007` (thẻ hết hạn), `HS2026009` (thẻ bị khóa), `HS2026011` (chưa có tài khoản), thêm mới `HS2026099`.

### 4.2. Đầu sách – `/books` (UC004, UC006)

Màn hình mẫu: `figma/man-hinh-13.html`, `figma/modal-02.html` (form thêm đầu sách).

**API**
- `listBooks(...)`: thủ thư thấy cả sách đã ẩn (`isHidden = true`).
- `createBook({ isbn, title, author, publisher, publishYear, categoryId, description, copies, location })`:
  - `copies` là số bản sách tạo kèm (0–100); mã bản sách tự sinh dạng `BS000091`.
  - `isbn` nhập có dấu gạch cũng được (backend tự chuẩn hóa), phải đúng ISBN-13.
  - Lỗi có thể gặp: `"ISBN không đúng định dạng ISBN-13"`, `"ISBN đã tồn tại trong hệ thống"`, `"Năm xuất bản không được vượt quá năm hiện tại"`.
- `updateBook(id, {...})`: như trên, không kèm `copies`.
- `deleteBook(id)`, ba kết quả có thể xảy ra:
  - Còn bản đang mượn → `409 "Đầu sách còn bản sách đang được mượn, không thể xóa"`.
  - Đã có lịch sử mượn → `data.deleted = false`, sách bị **ẩn**, message "Đầu sách đã có lịch sử mượn nên được ẩn thay vì xóa".
  - Chưa từng mượn → `data.deleted = true`, "Đã xóa đầu sách".
- `setBookHidden(id, true | false)`: ẩn / hiện lại.
- `addCopies(id, quantity, location)` → "Đã nhập thêm N bản sách", trả `{ book, copies }`.

**Cần làm**
1. Bảng đầu sách có lọc từ khóa + thể loại: ISBN, tên, tác giả, thể loại, năm, số bản khả dụng / tổng, nhãn "Đã ẩn".
2. Form thêm / sửa (`FormModal`); thể loại chọn từ `listCategories()`. Khi thêm có ô "Số bản sách" và "Vị trí kệ".
3. Nút **Xóa** dùng `ConfirmModal` (variant `danger`), sau đó hiện đúng message trả về (xóa hẳn hay chỉ ẩn).
4. Nút **Ẩn / Hiện lại**, **Nhập thêm bản**.
5. Nút **Xem bản sách** chuyển sang trang Bản sách của đầu sách đó, hoặc mở modal liệt kê `listBookCopies(id)`.

**Dữ liệu thử:** thêm "Hóa học 12" ISBN `978-604-300-742-8`; xóa sách 4 (còn bản đang mượn), sách 10 (đã có lịch sử, bị ẩn), sách 13 (xóa hẳn được).

### 4.3. Bản sách – `/copies` (UC005)

Màn hình mẫu: `figma/man-hinh-14.html`.

**API**
- `getCopyByCode(code)` → `{ copyId, copyCode, status, location, note, book: { bookId, title, isbn } }`.
- `listBookCopies(bookId)` → `{ book, copies: [...] }`.
- `changeCopyStatus(copyId, status, reason)` → "Cập nhật trạng thái bản sách thành công".

**Quy tắc đổi trạng thái bằng tay** (backend kiểm tra, frontend nên chỉ hiện lựa chọn hợp lệ):

| Đang ở | Được đổi sang |
|---|---|
| Khả dụng (`AVAILABLE`) | Hư hỏng, Mất |
| Hư hỏng (`DAMAGED`) | Khả dụng, Mất |
| Mất (`LOST`) | Khả dụng |
| Đang mượn (`BORROWED`) | Không đổi được; chỉ thay đổi khi lập phiếu / trả sách |

Chuyển sang Hư hỏng / Mất **bắt buộc nhập lý do** ("Cần nhập lý do khi bản sách bị hư hỏng hoặc mất").

**Cần làm**
1. `ScanInput` nhập / quét mã bản sách → hiện thông tin bản sách và trạng thái (`<StatusBadge type="copy" ... />`).
2. Chọn trạng thái mới (chỉ các lựa chọn hợp lệ) + lý do → lưu → hiện lại trạng thái mới.
3. Tùy chọn: ô chọn đầu sách để xem toàn bộ bản sách của đầu sách đó.

**Dữ liệu thử:** `BS000005` (khả dụng), `BS000001` (đang mượn, không đổi được), `BS000037` (hư hỏng), `BS000039` (mất).

### 4.4. Kiểm thử FE5

Dùng mã **GUI-30 → GUI-39**. Gợi ý: thêm / sửa độc giả và báo trùng mã; cấp / gia hạn / khóa thẻ; thêm đầu sách kèm bản sách và các lỗi ISBN; xóa đầu sách (3 trường hợp); ẩn / hiện; đổi trạng thái bản sách (hợp lệ, không hợp lệ, thiếu lý do). Thêm mã GUI vào **G7-FR02, FR03, FR04** trong `docs/RTM.md`.

---

## 5. FE6 – Báo cáo, nhắc hạn, trang Tổng quan

Đặt `ReportsPage`, `RemindersPage` ở `src/pages/librarian/`. Trang Tổng quan sửa trực tiếp `src/pages/common/DashboardPage.jsx`.

### 5.1. Báo cáo thống kê – `/reports` (UC016)

Màn hình mẫu: `figma/man-hinh-22.html`, `figma/man-hinh-36.html`.

**API:** `getReport(type, from, to)` với `type` là:

| `type` | Báo cáo | `data` trả về |
|---|---|---|
| `loans` | Thống kê mượn / trả theo kỳ | `{ period, summary: { totalTickets, totalBorrowedBooks, totalReturnedBooks, returnedInPeriod, borrowingBooks, overdueBooks, studentTickets, teacherTickets }, items: [phiếu] }` |
| `overdue` | Sách trả trễ & đang quá hạn | `{ period, summary: { overdueCount, lateReturnedCount, totalFineAmount, ... }, overdueItems, lateReturnedItems, items }` |
| `fines` | Tiền phạt đã thu / chưa thu, độc giả còn nợ | `{ period, summary: { totalFines, totalAmount, paidAmount, unpaidAmount, debtorCount, ... }, items, debtors }` |

- `from`, `to` **bắt buộc**. `from > to` hoặc `to` ở tương lai → `400 "Kỳ báo cáo không hợp lệ"`. Kỳ trống → `message = "Không có dữ liệu trong kỳ đã chọn"`.
- Xuất file: `exportReport(type, from, to, 'xlsx' | 'pdf')` tự tải file về máy. Lỗi bắt bằng `try/catch` + `errorMessage(err)` như mọi API khác.

Mẹo: in `console.log(body.data)` một lần để xem đủ các trường trước khi làm bảng.

**Cần làm**
1. Chọn loại báo cáo, từ ngày, đến ngày (mặc định từ đầu tháng đến hôm nay) → **Xem báo cáo**.
2. Hiện các ô tổng (`summary`) dạng thẻ số liệu, rồi bảng chi tiết. Báo cáo tiền phạt có thêm bảng **độc giả còn nợ** (`debtors`).
3. Nút **Xuất Excel**, **Xuất PDF**.

**Dữ liệu thử:** kỳ từ 120 ngày trước đến hôm nay sẽ có đủ 8 phiếu mẫu; kỳ một ngày trong tương lai báo lỗi.

### 5.2. Nhắc hạn trả – `/reminders` (UC017)

Màn hình mẫu: `figma/man-hinh-21.html`.

**API**
- `listReminders({ status })` với `status` là `DUE_SOON` hoặc `OVERDUE`, bỏ trống là cả hai. Trả `data = { today, thresholdDays: 3, totalItems, dueSoonCount, overdueCount, items }`. Mỗi `item`:
  ```js
  { borrowDetailId, ticketCode, dueDate, status /* DUE_SOON | OVERDUE */, daysLeft, daysOverdue,
    readerCode, readerName, readerType, className, department, email,
    canSendEmail, missingEmailReason, copyCode, title, sentCount, lastAttemptAt }
  ```
  Danh sách trống: `message = "Không có phiếu cần nhắc"`.
- `sendReminders([borrowDetailId, ...])`:
  - Thành công: `"Gửi email nhắc hạn trả thành công"`, hoặc khi chưa cấu hình SMTP: `"Chưa cấu hình SMTP nên email chỉ được giả lập, độc giả không nhận được"`. Hiện đúng câu này để người dùng biết.
  - Có cuốn của độc giả **không có email** → `409 "Độc giả chưa có email, hãy nhắc trực tiếp"` và **không gửi cuốn nào**. Vì vậy đừng cho chọn các dòng có `canSendEmail = false`.
  - Lỗi máy chủ mail → `502`, lịch sử đã ghi thất bại, cho phép bấm gửi lại.
- `listReminderLogs({ borrowDetailId })`: lịch sử gửi của một cuốn.

**Cần làm**
1. Ô thống kê: sắp đến hạn / quá hạn; lọc theo loại.
2. Bảng có ô chọn (checkbox) từng dòng + chọn tất cả: độc giả, sách, hạn trả, còn / quá bao nhiêu ngày, email (thiếu thì hiện `missingEmailReason`, không cho chọn), số lần đã nhắc.
3. Nút **Gửi email nhắc** cho các dòng đã chọn, xong tải lại danh sách để cập nhật số lần đã nhắc.

**Dữ liệu thử:** seed có 1 cuốn sắp đến hạn (`HS2026003`) và 2 cuốn quá hạn (`HS2026004`, `HS2026006`); `HS2026006` không có email.

### 5.3. Trang Tổng quan – `/dashboard` (cả 3 vai trò)

Màn hình mẫu: `figma/man-hinh-01.html` (độc giả), `-10` (thủ thư), `-25` (Admin).

Hiện tại `DashboardPage.jsx` có lời chào và các ô lối tắt; **giữ phần lối tắt**, thêm hàng số liệu ở trên theo vai trò (`const { user } = useAuth(); user.role`).

Không có API tổng hợp riêng: dùng các API có sẵn, gọi song song bằng `Promise.all`, mỗi lời gọi lấy `pageSize: 1` vì chỉ cần `total`:

| Vai trò | Số liệu | Lấy từ |
|---|---|---|
| Độc giả | Đang mượn, quá hạn, sắp đến hạn, còn nợ | `meApi.getMyLoans()` → đếm theo `status`, `dueDate`; `data.unpaidTotal` |
| Thủ thư | Phiếu đang mượn | `loansApi.listLoans({ status: 'BORROWING', pageSize: 1 })` → `data.total` |
| | Phiếu có sách quá hạn | `loansApi.listLoans({ status: 'OVERDUE', pageSize: 1 })` → `data.total` |
| | Khoản phạt chưa thu | `finesApi.listFines({ status: 'UNPAID', pageSize: 1 })` → `data.total` |
| | Sắp đến hạn / quá hạn cần nhắc | `remindersApi.listReminders()` → `dueSoonCount`, `overdueCount` |
| Admin | Như Thủ thư, thêm 5 thay đổi gần nhất | `auditApi.listAuditLogs({ pageSize: 5 })`, `regulationsApi.listRegulationLogs({ pageSize: 5 })` |

Mỗi số liệu là một thẻ (`Card` + `icon-tile` có sẵn trong CSS), bấm vào dẫn tới trang tương ứng (ví dụ thẻ "Khoản phạt chưa thu" mở `/fines`).

### 5.4. Kiểm thử FE6

Dùng mã **GUI-40 → GUI-49**. Gợi ý: xem đủ 3 loại báo cáo; kỳ không hợp lệ; kỳ trống; xuất Excel và PDF mở được, tiếng Việt đúng; nhắc hạn lọc theo loại; dòng thiếu email không chọn được; gửi nhắc báo giả lập; Tổng quan của 3 vai trò hiện số khớp với dữ liệu seed. Thêm mã GUI vào **G7-FR11, FR12, FR13** trong `docs/RTM.md`.

---

## 6. Làm xong một trang: kiểm tra trước khi tạo Pull Request

- [ ] Gắn component vào `src/routes/pages.js`; menu mở đúng trang, vai trò khác vào thì thấy "Không có quyền truy cập".
- [ ] Có trạng thái **đang tải**, **danh sách trống** và **lỗi** (tắt backend thử xem có báo "Không kết nối được máy chủ").
- [ ] Mọi câu thông báo lấy từ backend; ngày `dd/mm/yyyy`, tiền `1.000đ`; nhãn trạng thái đúng đặc tả.
- [ ] Thu nhỏ cửa sổ còn khoảng 390px vẫn dùng được (bảng cuộn ngang được, không vỡ khung).
- [ ] Mở DevTools (F12) → Console: không có lỗi đỏ, trừ các lỗi 4xx do cố ý thử sai.
- [ ] `cd frontend && npm run build` chạy thành công.
- [ ] Chạy `npm run db:reset` rồi thử lại toàn bộ các bước với dữ liệu seed.
- [ ] Ghi các ca GUI vào `docs/BANG_TEST_CASE_CHUONG_6.md` mục 6.5 và cập nhật `docs/RTM.md`.
- [ ] Cập nhật bảng phân công trong `README.md` (cột Phụ trách, đánh dấu "xong").
- [ ] Commit theo dạng `fe4: trang tra cứu sách`, push nhánh, tạo Pull Request vào `main`, nhờ một người review.

## 7. Câu hỏi thường gặp

**Admin có thấy các trang của Thủ thư không?** Có. Trang khai báo `roles: STAFF` (Thủ thư) thì Admin vào được, không cần làm gì thêm.

**Ô chọn ngày hiện `mm/dd/yyyy`?** Đó là ô ngày có sẵn của trình duyệt, định dạng theo ngôn ngữ của trình duyệt (Chrome tiếng Việt sẽ là `dd/mm/yyyy`). Giá trị gửi lên API vẫn là `YYYY-MM-DD`, không cần xử lý thêm.

**Muốn API trả thêm trường / thêm API mới?** Hỏi Phước trước. Sửa backend phải chạy lại `npm test` (94 test) và cập nhật tài liệu.

**Dữ liệu demo bị thay đổi sau khi thử?** Chạy `npm run db:reset` trong `backend`.

**Code mẫu để học theo?** Đọc theo thứ tự: `pages/admin/LoansPage.jsx` (bảng + lọc), `pages/admin/AccountsPage.jsx` (bảng + các modal form), `pages/librarian/ReturnPage.jsx` (quét mã + xác nhận).
