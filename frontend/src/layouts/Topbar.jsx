import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmModal from '../components/ConfirmModal';
import { formatLongDate, initialsOf, todayVN } from '../utils/format';
import { roleLabelOf } from '../utils/roles';

export default function Topbar({ onOpenMenu }) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    await logout();
    setBusy(false);
    setConfirming(false);
    toast.success('Đã đăng xuất');
    navigate('/login', { replace: true });
  }

  return (
    <header className="app-topbar d-flex align-items-center gap-3 px-3 px-lg-4 d-print-none">
      <Button variant="link" className="d-lg-none p-1 text-body" aria-label="Mở menu" onClick={onOpenMenu}>
        <i className="bi bi-list fs-4" />
      </Button>

      <div className="d-none d-md-block small text-secondary">
        <i className="bi bi-calendar3 me-2" />
        {formatLongDate(todayVN())}
      </div>

      <div className="ms-auto d-flex align-items-center gap-3">
        <div className="d-flex align-items-center gap-2">
          <div className="avatar" aria-hidden="true">{initialsOf(user.fullName)}</div>
          <div className="d-none d-sm-block lh-sm">
            <div className="small fw-medium">{user.fullName}</div>
            <div className="text-secondary" style={{ fontSize: '0.75rem' }}>{roleLabelOf(user)}</div>
          </div>
        </div>
        <Button variant="outline-secondary" size="sm" onClick={() => setConfirming(true)}>
          <i className="bi bi-box-arrow-right" />
          <span className="d-none d-sm-inline ms-2">Đăng xuất</span>
        </Button>
      </div>

      <ConfirmModal
        show={confirming}
        title="Đăng xuất"
        confirmLabel="Đăng xuất"
        busy={busy}
        onConfirm={handleLogout}
        onCancel={() => setConfirming(false)}
      >
        Bạn có chắc muốn đăng xuất khỏi hệ thống?
      </ConfirmModal>
    </header>
  );
}
