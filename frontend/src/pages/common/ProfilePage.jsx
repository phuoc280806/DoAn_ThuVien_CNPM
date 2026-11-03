import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import * as authApi from '../../api/auth';
import { errorMessage } from '../../api/client';
import PageHeader from '../../components/PageHeader';
import { formatDateTime } from '../../utils/format';
import { READER_TYPE_LABELS, ROLE_LABELS } from '../../utils/roles';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

function validate(f) {
  const errors = {};
  if (!f.currentPassword) errors.currentPassword = 'Cần nhập mật khẩu hiện tại';
  if (!f.newPassword) errors.newPassword = 'Cần nhập mật khẩu mới';
  else if (f.newPassword.length < 8) errors.newPassword = 'Mật khẩu tối thiểu 8 ký tự';
  else if (f.newPassword === f.currentPassword) errors.newPassword = 'Mật khẩu mới phải khác mật khẩu hiện tại';
  if (f.confirmPassword !== f.newPassword) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  return errors;
}

function InfoRow({ label, children }) {
  return (
    <Row className="py-2 border-bottom small">
      <Col xs={5} className="text-secondary">{label}</Col>
      <Col xs={7} className="fw-medium">{children || '—'}</Col>
    </Row>
  );
}

// Thông tin tài khoản + tự đổi mật khẩu
export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refreshUser().catch(() => {});
  }, [refreshUser]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setServerError('');
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setBusy(true);
    try {
      const body = await authApi.changePassword(form.currentPassword, form.newPassword);
      toast.success(body.message);
      setForm(EMPTY);
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Tài khoản cá nhân" subtitle="Thông tin đăng nhập và đổi mật khẩu" />

      <Row className="g-4">
        <Col lg={6}>
          <Card>
            <Card.Header className="fw-semibold">Thông tin tài khoản</Card.Header>
            <Card.Body className="pt-1">
              <InfoRow label="Họ và tên">{user.fullName}</InfoRow>
              <InfoRow label="Tên đăng nhập">{user.username}</InfoRow>
              <InfoRow label="Vai trò">{ROLE_LABELS[user.role]}</InfoRow>
              {user.reader && (
                <>
                  <InfoRow label="Mã độc giả">{user.reader.readerCode}</InfoRow>
                  <InfoRow label="Loại độc giả">{READER_TYPE_LABELS[user.reader.readerType]}</InfoRow>
                </>
              )}
              <InfoRow label="Email">{user.email}</InfoRow>
              <InfoRow label="Số điện thoại">{user.phone}</InfoRow>
              <InfoRow label="Ngày tạo tài khoản">{formatDateTime(user.createdAt)}</InfoRow>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card>
            <Card.Header className="fw-semibold">Đổi mật khẩu</Card.Header>
            <Card.Body>
              {serverError && <Alert variant="danger">{serverError}</Alert>}
              <Form noValidate onSubmit={submit}>
                <Form.Group className="mb-3" controlId="pw-current">
                  <Form.Label className="small fw-medium">Mật khẩu hiện tại</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="current-password"
                    value={form.currentPassword}
                    onChange={set('currentPassword')}
                    isInvalid={!!errors.currentPassword}
                  />
                  <Form.Control.Feedback type="invalid">{errors.currentPassword}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3" controlId="pw-new">
                  <Form.Label className="small fw-medium">Mật khẩu mới</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="new-password"
                    value={form.newPassword}
                    onChange={set('newPassword')}
                    isInvalid={!!errors.newPassword}
                  />
                  <Form.Control.Feedback type="invalid">{errors.newPassword}</Form.Control.Feedback>
                  <Form.Text>Tối thiểu 8 ký tự.</Form.Text>
                </Form.Group>
                <Form.Group className="mb-4" controlId="pw-confirm">
                  <Form.Label className="small fw-medium">Nhập lại mật khẩu mới</Form.Label>
                  <Form.Control
                    type="password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    isInvalid={!!errors.confirmPassword}
                  />
                  <Form.Control.Feedback type="invalid">{errors.confirmPassword}</Form.Control.Feedback>
                </Form.Group>
                <Button type="submit" disabled={busy}>
                  {busy && <Spinner animation="border" size="sm" className="me-2" />}
                  Đổi mật khẩu
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
