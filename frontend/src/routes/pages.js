import { ROLES } from '../utils/roles';
import DashboardPage from '../pages/common/DashboardPage';
import ProfilePage from '../pages/common/ProfilePage';
import BorrowPage from '../pages/librarian/BorrowPage';
import ReturnPage from '../pages/librarian/ReturnPage';
import FinesPage from '../pages/librarian/FinesPage';
import RenewPage from '../pages/librarian/RenewPage';
import AccountsPage from '../pages/admin/AccountsPage';
import RegulationsPage from '../pages/admin/RegulationsPage';
import AuditLogsPage from '../pages/admin/AuditLogsPage';
import LoansPage from '../pages/admin/LoansPage';
import ReportsPage from '../pages/librarian/ReportsPage';


/**
 * DANH SÁCH TRANG — nơi duy nhất khai báo đường dẫn, quyền và menu.
 *
 * Mỗi trang:
 *   path       đường dẫn
 *   label      tên hiện trên menu và tiêu đề
 *   icon       tên icon Bootstrap Icons (https://icons.getbootstrap.com), bỏ tiền tố "bi-"
 *   roles      vai trò được vào; [LIBRARIAN] thì Admin cũng vào được (Admin kế thừa Thủ thư)
 *   uc         use case tương ứng trong đặc tả
 *   phase      giai đoạn frontend làm trang này (FE1 … FE6)
 *   component  component của trang; CHƯA có thì hiện trang "Đang xây dựng"
 *
 * Làm trang mới: tạo component trong src/pages/<vai trò>/, import vào đây
 * rồi gán vào `component` của trang tương ứng. Không cần sửa router hay menu.
 */
const ALL = [ROLES.READER, ROLES.LIBRARIAN, ROLES.ADMIN];
const STAFF = [ROLES.LIBRARIAN];
const ADMIN = [ROLES.ADMIN];

export const PAGES = [
  // Chung
  { path: '/dashboard', label: 'Tổng quan', icon: 'house-door', roles: ALL, uc: [], phase: 'FE6', component: DashboardPage },
  { path: '/profile', label: 'Tài khoản cá nhân', icon: 'person-circle', roles: ALL, uc: ['UC001'], phase: 'FE1', component: ProfilePage },

  // Độc giả (FE4)
  { path: '/search', label: 'Tra cứu sách', icon: 'search', roles: [ROLES.READER], uc: ['UC006'], phase: 'FE4' },
  { path: '/my-loans', label: 'Sách đang mượn', icon: 'journal-bookmark', roles: [ROLES.READER], uc: ['UC012'], phase: 'FE4' },
  { path: '/my-history', label: 'Lịch sử mượn/trả', icon: 'clock-history', roles: [ROLES.READER], uc: ['UC012'], phase: 'FE4' },
  { path: '/my-fines', label: 'Tiền phạt', icon: 'cash-coin', roles: [ROLES.READER], uc: ['UC012'], phase: 'FE4' },

  // Thủ thư — nghiệp vụ mượn trả (FE2)
  { path: '/borrow', label: 'Lập phiếu mượn', icon: 'box-arrow-right', roles: STAFF, uc: ['UC007'], phase: 'FE2', component: BorrowPage },
  { path: '/return', label: 'Trả sách', icon: 'box-arrow-in-left', roles: STAFF, uc: ['UC009', 'UC010'], phase: 'FE2', component: ReturnPage },
  { path: '/fines', label: 'Thu tiền phạt', icon: 'cash-coin', roles: STAFF, uc: ['UC011'], phase: 'FE2', component: FinesPage },
  { path: '/renew', label: 'Gia hạn', icon: 'arrow-repeat', roles: STAFF, uc: ['UC008'], phase: 'FE2', component: RenewPage },

  // Thủ thư — độc giả & sách (FE5)
  { path: '/readers', label: 'Độc giả & thẻ', icon: 'people', roles: STAFF, uc: ['UC003'], phase: 'FE5' },
  { path: '/books', label: 'Đầu sách', icon: 'book', roles: STAFF, uc: ['UC004', 'UC006'], phase: 'FE5' },
  { path: '/copies', label: 'Bản sách', icon: 'upc-scan', roles: STAFF, uc: ['UC005'], phase: 'FE5' },

  // Thủ thư — báo cáo, nhắc hạn (FE6)
  { path: '/reminders', label: 'Nhắc hạn trả', icon: 'envelope', roles: STAFF, uc: ['UC017'], phase: 'FE6', component: RemindersPage },
  { path: '/reports', label: 'Báo cáo thống kê', icon: 'bar-chart-line', roles: STAFF, uc: ['UC016'], phase: 'FE6', component: ReportsPage },

  // Admin (FE3)
  { path: '/accounts', label: 'Tài khoản & phân quyền', icon: 'shield-lock', roles: ADMIN, uc: ['UC002'], phase: 'FE3', component: AccountsPage },
  { path: '/regulations', label: 'Cấu hình quy định', icon: 'sliders', roles: ADMIN, uc: ['UC013', 'UC015'], phase: 'FE3', component: RegulationsPage },
  { path: '/audit-logs', label: 'Nhật ký thay đổi', icon: 'journal-text', roles: ADMIN, uc: ['UC014'], phase: 'FE3', component: AuditLogsPage },
  { path: '/loans', label: 'Quản lý mượn trả', icon: 'clipboard-data', roles: ADMIN, uc: ['UC007', 'UC009'], phase: 'FE3', component: LoansPage },
];

/** Menu bên trái theo vai trò: các nhóm, mỗi nhóm liệt kê đường dẫn trong PAGES. */
export const MENU = {
  [ROLES.READER]: [
    { title: 'Tổng quan', paths: ['/dashboard', '/search'] },
    { title: 'Cá nhân', paths: ['/my-loans', '/my-history', '/my-fines', '/profile'] },
  ],
  [ROLES.LIBRARIAN]: [
    { title: 'Tổng quan', paths: ['/dashboard'] },
    { title: 'Nghiệp vụ mượn trả', paths: ['/borrow', '/return', '/fines', '/renew', '/reminders'] },
    { title: 'Độc giả & sách', paths: ['/readers', '/books', '/copies'] },
    { title: 'Báo cáo & tài khoản', paths: ['/reports', '/profile'] },
  ],
  [ROLES.ADMIN]: [
    { title: 'Tổng quan', paths: ['/dashboard'] },
    { title: 'Quản trị hệ thống · chỉ Admin', paths: ['/accounts', '/regulations', '/audit-logs', '/loans'] },
    { title: 'Nghiệp vụ · kế thừa Thủ thư', paths: ['/borrow', '/return', '/fines', '/renew', '/reminders'] },
    { title: 'Độc giả & sách', paths: ['/readers', '/books', '/copies'] },
    { title: 'Báo cáo & tài khoản', paths: ['/reports', '/profile'] },
  ],
};

const byPath = new Map(PAGES.map((p) => [p.path, p]));

export const findPage = (path) => byPath.get(path);

/** Các nhóm menu của một vai trò, đã đổi đường dẫn thành thông tin trang. */
export function menuFor(role) {
  return (MENU[role] || []).map((group) => ({
    title: group.title,
    pages: group.paths.map((path) => byPath.get(path)),
  }));
}
