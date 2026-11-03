import { NavLink } from 'react-router-dom';
import { CloseButton, Offcanvas } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { menuFor } from '../routes/pages';
import { ROLE_LABELS } from '../utils/roles';

/** Menu bên trái. Từ màn hình lg trở lên luôn hiện; nhỏ hơn thì trượt ra khi bấm nút menu. */
export default function Sidebar({ show, onClose }) {
  const { user } = useAuth();

  return (
    <Offcanvas show={show} onHide={onClose} responsive="lg" className="app-sidebar d-print-none" aria-label="Menu chính">
      <Offcanvas.Body>
        <div className="sidebar-brand d-flex align-items-center gap-3 px-3">
          <div className="brand-icon">
            <i className="bi bi-book" />
          </div>
          <div className="lh-sm flex-grow-1">
            <div className="fw-semibold small">Thư viện Trường THPT</div>
            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>Hệ thống quản lý</div>
          </div>
          <CloseButton className="d-lg-none" aria-label="Đóng menu" onClick={onClose} />
        </div>

        <nav className="flex-grow-1 overflow-auto px-2 py-3">
          {menuFor(user.role).map((group) => (
            <div key={group.title} className="mb-4">
              <div className="sidebar-group-title">{group.title}</div>
              {group.pages.map((page) => (
                <NavLink key={page.path} to={page.path} className="sidebar-link" onClick={onClose}>
                  <i className={`bi bi-${page.icon}`} />
                  <span>{page.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-top px-3 py-3 small text-secondary">
          <i className="bi bi-shield-check me-2" />
          Vai trò: <strong className="text-body">{ROLE_LABELS[user.role]}</strong>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  );
}
