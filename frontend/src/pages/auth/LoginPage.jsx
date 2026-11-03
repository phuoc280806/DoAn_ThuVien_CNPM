import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../api/client';
import { findPage } from '../../routes/pages';
import { canAccess } from '../../utils/roles';

// Tài khoản trong database/seed.sql, mật khẩu chung Thuvien@2026
const DEMO_PASSWORD = 'Thuvien@2026';
const DEMO_ACCOUNTS = [
  { username: 'HS2026001', label: 'Học sinh' },
  { username: 'GV2026001', label: 'Giáo viên' },
  { username: 'TT01', label: 'Thủ thư' },
  { username: 'AD001', label: 'Admin / Ban giám hiệu' },
  { username: 'HS2026010', label: 'Tài khoản bị khóa (thử lỗi)' },
];

const MISSING = 'Cần nhập đầy đủ tên đăng nhập và mật khẩu';

// UC001 – Đăng nhập
export default function LoginPage() {
  const { user, login, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  // Quay lại trang đang mở trước khi bị đưa về đăng nhập, nếu vai trò mới được phép vào
  function nextPathFor(role) {
    const from = location.state?.from?.pathname;
    const page = from && findPage(from);
    return page && canAccess(role, page.roles) ? from : '/dashboard';
  }

  async function submit(u, p) {
    setError('');
    clearNotice();
    if (!u.trim() || !p) {
      setError(MISSING);
      return;
    }
    setBusy(true);
    try {
      const loggedIn = await login(u.trim(), p);
      navigate(nextPathFor(loggedIn.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  function loginDemo(account) {
    setUsername(account.username);
    setPassword(DEMO_PASSWORD);
    submit(account.username, DEMO_PASSWORD);
  }

  return (
    <div className="container-fluid">
      <div className="row min-vh-100">
        <div className="col-lg-6 login-aside d-none d-lg-flex flex-column justify-content-between p-5">
          <div className="d-flex align-items-center gap-3">
            <div className="brand-icon">
              <i className="bi bi-book" />
            </div>
            <strong>Thư viện Trường THPT</strong>
          </div>
          <div>
            <h1 className="display-6 fw-semibold lh-sm">
              Hệ thống quản lý
              <br />
              thư viện trường học
            </h1>
            <p className="text-secondary mt-3 mb-0" style={{ maxWidth: 440 }}>
              Tra cứu sách, theo dõi mượn trả, tính phạt theo đúng quy định tại thời điểm lập phiếu.
            </p>
          </div>
          <p className="small text-secondary mb-0">Nhóm 07 · Nhập môn Công nghệ Phần mềm</p>
        </div>

        <div className="col-lg-6 d-flex align-items-center justify-content-center p-4">
          <div className="login-form w-100">
            <div className="d-flex d-lg-none align-items-center gap-3 mb-4">
              <div className="brand-icon">
                <i className="bi bi-book" />
              </div>
              <strong>Thư viện Trường THPT</strong>
            </div>

            <h2 className="h3 mb-1">Đăng nhập</h2>
            <p className="text-secondary small mb-4">Dùng tài khoản do Admin cấp. Độc giả đăng nhập bằng mã độc giả.</p>

            {notice && !error && <Alert variant="warning">{notice}</Alert>}
            {error && <Alert variant="danger">{error}</Alert>}

            <Form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                submit(username, password);
              }}
            >
              <Form.Group className="mb-3" controlId="login-username">
                <Form.Label className="small fw-medium">Tên đăng nhập</Form.Label>
                <Form.Control
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VD: HS2026001"
                  autoComplete="username"
                  autoFocus
                />
              </Form.Group>
              <Form.Group className="mb-4" controlId="login-password">
                <Form.Label className="small fw-medium">Mật khẩu</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </Form.Group>
              <Button type="submit" className="w-100" disabled={busy}>
                {busy && <Spinner animation="border" size="sm" className="me-2" />}
                Đăng nhập
              </Button>
            </Form>

            <div className="mt-5">
              <p className="small text-secondary mb-2">
                Tài khoản demo (mật khẩu <code>{DEMO_PASSWORD}</code>), bấm để đăng nhập nhanh:
              </p>
              <div className="d-grid gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <Button
                    key={a.username}
                    variant="outline-secondary"
                    className="d-flex justify-content-between text-start"
                    disabled={busy}
                    onClick={() => loginDemo(a)}
                  >
                    <span>{a.label}</span>
                    <span className="small text-secondary">{a.username}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
