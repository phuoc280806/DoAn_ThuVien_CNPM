import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Nav, Row, Table } from 'react-bootstrap';
import * as usersApi from '../../api/users';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import usePagedList from '../../hooks/usePagedList';
import PageHeader from '../../components/PageHeader';
import ListCard from '../../components/ListCard';
import StatusBadge from '../../components/StatusBadge';
import FormModal from '../../components/FormModal';
import ConfirmModal from '../../components/ConfirmModal';
import { formatDate } from '../../utils/format';
import { READER_TYPE_LABELS, ROLE_LABELS } from '../../utils/roles';

// Ma trận phân quyền theo đặc tả (Admin kế thừa mọi quyền của Thủ thư)
const R = 'READER';
const L = 'LIBRARIAN';
const A = 'ADMIN';
const PERMISSIONS = [
  ['UC001', 'Đăng nhập / đăng xuất', [R, L, A]],
  ['UC002', 'Quản lý tài khoản & phân quyền', [A]],
  ['UC003', 'Quản lý hồ sơ độc giả & thẻ thư viện', [L, A]],
  ['UC004', 'Quản lý đầu sách', [L, A]],
  ['UC005', 'Quản lý trạng thái bản sách', [L, A]],
  ['UC006', 'Tra cứu sách & xem số bản khả dụng', [R, L, A]],
  ['UC007', 'Lập phiếu mượn', [L, A]],
  ['UC008', 'Gia hạn mượn', [L, A]],
  ['UC009', 'Trả sách', [L, A]],
  ['UC010', 'Tính tiền phạt', [L, A]],
  ['UC011', 'Thu tiền phạt', [L, A]],
  ['UC012', 'Xem lịch sử mượn/trả & khoản phạt của mình', [R]],
  ['UC013', 'Cấu hình quy định', [A]],
  ['UC014', 'Xem nhật ký thay đổi quy định', [A]],
  ['UC015', 'Áp dụng quy định mới cho phiếu đang mượn', [A]],
  ['UC016', 'Báo cáo thống kê', [L, A]],
  ['UC017', 'Nhắc hạn trả', [L, A]],
];

const NEW_ACCOUNT = { role: 'LIBRARIAN', username: '', password: '', confirm: '', fullName: '', email: '', phone: '' };

function validateAccount(f) {
  const e = {};
  if (!f.username.trim()) e.username = f.role === 'READER' ? 'Cần nhập mã độc giả' : 'Cần nhập tên đăng nhập';
  else if (!/^[A-Za-z0-9._-]+$/.test(f.username.trim())) e.username = 'Tên đăng nhập chỉ gồm chữ không dấu, số và . _ -';
  if (f.role !== 'READER' && !f.fullName.trim()) e.fullName = 'Cần nhập họ và tên';
  if (f.password.length < 8) e.password = 'Mật khẩu tối thiểu 8 ký tự';
  if (f.confirm !== f.password) e.confirm = 'Mật khẩu nhập lại không khớp';
  return e;
}

function Input({ id, label, error, hint, ...props }) {
  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label className="small fw-medium">{label}</Form.Label>
      <Form.Control isInvalid={!!error} {...props} />
      <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
      {hint && <Form.Text>{hint}</Form.Text>}
    </Form.Group>
  );
}

function PermissionMatrix() {
  const cell = (roles, r) =>
    roles.includes(r) ? <i className="bi bi-check-lg text-success" aria-label="Có quyền" /> : <span className="text-body-tertiary">—</span>;
  return (
    <Card>
      <Card.Body>
        <Alert variant="info" className="small">
          Admin kế thừa mọi quyền của Thủ thư. Sau khi đăng nhập, mỗi người chỉ thấy chức năng thuộc vai trò của mình;
          gọi trực tiếp API không đúng quyền sẽ bị từ chối.
        </Alert>
        <Table responsive className="align-middle mb-0">
          <thead>
            <tr>
              <th>Mã</th>
              <th>Chức năng</th>
              <th className="text-center">Độc giả</th>
              <th className="text-center">Thủ thư</th>
              <th className="text-center">Admin</th>
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map(([code, name, roles]) => (
              <tr key={code}>
                <td>{code}</td>
                <td>{name}</td>
                <td className="text-center">{cell(roles, R)}</td>
                <td className="text-center">{cell(roles, L)}</td>
                <td className="text-center">{cell(roles, A)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card.Body>
    </Card>
  );
}

// UC002 – Quản lý tài khoản & phân quyền
export default function AccountsPage() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('list');
  const [form, setForm] = useState({ keyword: '', role: '', status: '' });
  const [filters, setFilters] = useState(form);
  const list = usePagedList(usersApi.listUsers, filters);

  // Modal: { type: 'create' | 'password' | 'role' | 'lock', user, open }. Đóng thì chỉ tắt open để nội dung còn trong lúc mờ dần
  const [modal, setModal] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  function open(type, user = null) {
    setModal({ type, user, open: true });
    setErrors({});
    setServerError('');
    if (type === 'create') setValues(NEW_ACCOUNT);
    if (type === 'password') setValues({ password: '', confirm: '' });
    if (type === 'role') setValues({ role: user.role === 'ADMIN' ? 'LIBRARIAN' : 'ADMIN' });
  }
  const close = () => setModal((m) => m && { ...m, open: false });
  const set = (field) => (e) => setValues({ ...values, [field]: e.target.value });

  async function run(action, found = {}) {
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setServerError('');
    try {
      const body = await action();
      toast.success(body.message);
      close();
      list.reload();
    } catch (err) {
      if (modal.type === 'lock') {
        toast.error(errorMessage(err));
        close();
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  function submitCreate() {
    const v = values;
    const body = { role: v.role, username: v.username.trim(), password: v.password };
    if (v.role !== 'READER') {
      body.fullName = v.fullName.trim();
      if (v.email.trim()) body.email = v.email.trim();
      if (v.phone.trim()) body.phone = v.phone.trim();
    }
    run(() => usersApi.createUser(body), validateAccount(v));
  }

  function submitPassword() {
    const found = {};
    if (values.password.length < 8) found.password = 'Mật khẩu tối thiểu 8 ký tự';
    if (values.confirm !== values.password) found.confirm = 'Mật khẩu nhập lại không khớp';
    run(() => usersApi.resetPassword(modal.user.userId, values.password), found);
  }

  const locking = modal?.type === 'lock' && modal.user.status === 'ACTIVE';
  const isOpen = (type) => modal?.open === true && modal.type === type;

  return (
    <>
      <PageHeader title="Tài khoản & phân quyền" subtitle="UC002 · Tạo tài khoản, khóa / mở khóa, đặt lại mật khẩu, đổi vai trò">
        {tab === 'list' && (
          <Button onClick={() => open('create')}>
            <i className="bi bi-person-plus me-2" />
            Tạo tài khoản
          </Button>
        )}
      </PageHeader>

      <Nav variant="tabs" activeKey={tab} onSelect={setTab} className="mb-4">
        <Nav.Item>
          <Nav.Link eventKey="list">Danh sách tài khoản</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="perm">Phân quyền</Nav.Link>
        </Nav.Item>
      </Nav>

      {tab === 'perm' ? (
        <PermissionMatrix />
      ) : (
        <>
          <Card className="mb-4">
            <Card.Body>
              <Form
                onSubmit={(e) => {
                  e.preventDefault();
                  setFilters({ ...form, keyword: form.keyword.trim() });
                }}
              >
                <Row className="g-3 align-items-end">
                  <Col md={5}>
                    <Form.Label htmlFor="acc-keyword" className="small fw-medium">Tìm kiếm</Form.Label>
                    <Form.Control
                      id="acc-keyword"
                      value={form.keyword}
                      onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                      placeholder="Tên đăng nhập, họ tên, mã độc giả"
                    />
                  </Col>
                  <Col sm={6} md={3}>
                    <Form.Label htmlFor="acc-role" className="small fw-medium">Vai trò</Form.Label>
                    <Form.Select
                      id="acc-role"
                      value={form.role}
                      onChange={(e) => {
                        const next = { ...form, role: e.target.value };
                        setForm(next);
                        setFilters(next);
                      }}
                    >
                      <option value="">Tất cả</option>
                      <option value="READER">Độc giả</option>
                      <option value="LIBRARIAN">Thủ thư</option>
                      <option value="ADMIN">Admin</option>
                    </Form.Select>
                  </Col>
                  <Col sm={6} md={2}>
                    <Form.Label htmlFor="acc-status" className="small fw-medium">Trạng thái</Form.Label>
                    <Form.Select
                      id="acc-status"
                      value={form.status}
                      onChange={(e) => {
                        const next = { ...form, status: e.target.value };
                        setForm(next);
                        setFilters(next);
                      }}
                    >
                      <option value="">Tất cả</option>
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="LOCKED">Bị khóa</option>
                    </Form.Select>
                  </Col>
                  <Col md={2}>
                    <Button type="submit" className="w-100">
                      <i className="bi bi-search me-2" />
                      Tìm
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>

          <ListCard list={list} empty="Không tìm thấy tài khoản.">
            <Table hover responsive className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Tên đăng nhập</th>
                  <th>Họ và tên</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {list.data?.items.map((u) => {
                  const isMe = u.userId === me.userId;
                  return (
                    <tr key={u.userId}>
                      <td className="fw-medium">
                        {u.username}
                        {isMe && <span className="small text-secondary ms-1">(bạn)</span>}
                      </td>
                      <td>
                        <div>{u.fullName}</div>
                        {u.email && <div className="small text-secondary">{u.email}</div>}
                      </td>
                      <td>
                        <StatusBadge type="role" value={u.role} />
                        {u.reader && (
                          <span className="small text-secondary ms-1">{READER_TYPE_LABELS[u.reader.readerType]}</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge type="account" value={u.status} />
                      </td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td className="text-end text-nowrap">
                        {u.role !== 'READER' && (
                          <Button
                            size="sm"
                            variant="link"
                            title="Đổi vai trò"
                            aria-label={`Đổi vai trò ${u.username}`}
                            disabled={isMe}
                            onClick={() => open('role', u)}
                          >
                            <i className="bi bi-shield-lock" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="link"
                          title="Đặt lại mật khẩu"
                          aria-label={`Đặt lại mật khẩu ${u.username}`}
                          onClick={() => open('password', u)}
                        >
                          <i className="bi bi-key" />
                        </Button>
                        <Button
                          size="sm"
                          variant={u.status === 'ACTIVE' ? 'outline-danger' : 'outline-success'}
                          className="ms-1"
                          disabled={isMe}
                          onClick={() => open('lock', u)}
                        >
                          {u.status === 'ACTIVE' ? 'Khóa' : 'Mở khóa'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </ListCard>
        </>
      )}

      <FormModal
        show={isOpen('create')}
        title="Tạo tài khoản"
        submitLabel="Tạo tài khoản"
        busy={busy}
        error={serverError}
        onSubmit={submitCreate}
        onHide={close}
      >
        <Form.Group className="mb-3" controlId="new-role">
          <Form.Label className="small fw-medium">Vai trò</Form.Label>
          <Form.Select value={values.role} onChange={set('role')}>
            <option value="LIBRARIAN">Thủ thư</option>
            <option value="ADMIN">Admin / Ban giám hiệu</option>
            <option value="READER">Độc giả (học sinh / giáo viên)</option>
          </Form.Select>
        </Form.Group>
        {values.role === 'READER' ? (
          <Input
            id="new-username"
            label="Mã độc giả"
            value={values.username}
            onChange={set('username')}
            error={errors.username}
            placeholder="VD: HS2026011"
            hint="Độc giả phải có hồ sơ do Thủ thư lập trước. Tên đăng nhập là mã độc giả; họ tên, email lấy từ hồ sơ."
          />
        ) : (
          <>
            <Input id="new-username" label="Tên đăng nhập" value={values.username} onChange={set('username')} error={errors.username} placeholder="VD: TT03" />
            <Input id="new-fullname" label="Họ và tên" value={values.fullName} onChange={set('fullName')} error={errors.fullName} />
            <Row>
              <Col sm={6}>
                <Input id="new-email" label="Email (không bắt buộc)" type="email" value={values.email} onChange={set('email')} />
              </Col>
              <Col sm={6}>
                <Input id="new-phone" label="Số điện thoại (không bắt buộc)" value={values.phone} onChange={set('phone')} />
              </Col>
            </Row>
          </>
        )}
        <Row>
          <Col sm={6}>
            <Input id="new-password" label="Mật khẩu" type="password" autoComplete="new-password" value={values.password ?? ''} onChange={set('password')} error={errors.password} hint="Tối thiểu 8 ký tự." />
          </Col>
          <Col sm={6}>
            <Input id="new-confirm" label="Nhập lại mật khẩu" type="password" autoComplete="new-password" value={values.confirm ?? ''} onChange={set('confirm')} error={errors.confirm} />
          </Col>
        </Row>
      </FormModal>

      <FormModal
        show={isOpen('password')}
        title={`Đặt lại mật khẩu · ${modal?.user?.username ?? ''}`}
        submitLabel="Đặt lại mật khẩu"
        busy={busy}
        error={serverError}
        onSubmit={submitPassword}
        onHide={close}
      >
        <Input id="reset-password" label="Mật khẩu mới" type="password" autoComplete="new-password" value={values.password ?? ''} onChange={set('password')} error={errors.password} hint="Tối thiểu 8 ký tự. Báo mật khẩu mới cho người dùng và nhắc họ tự đổi ở trang Tài khoản cá nhân." />
        <Input id="reset-confirm" label="Nhập lại mật khẩu mới" type="password" autoComplete="new-password" value={values.confirm ?? ''} onChange={set('confirm')} error={errors.confirm} />
      </FormModal>

      <FormModal
        show={isOpen('role')}
        title={`Đổi vai trò · ${modal?.user?.username ?? ''}`}
        busy={busy}
        error={serverError}
        onSubmit={() => run(() => usersApi.changeRole(modal.user.userId, values.role))}
        onHide={close}
      >
        <p className="small text-secondary">
          Vai trò hiện tại: <strong>{ROLE_LABELS[modal?.user?.role]}</strong>. Chỉ đổi được giữa Thủ thư và Admin; tài khoản
          độc giả gắn với hồ sơ độc giả.
        </p>
        <Form.Group controlId="role-new">
          <Form.Label className="small fw-medium">Vai trò mới</Form.Label>
          <Form.Select value={values.role ?? ''} onChange={set('role')}>
            <option value="LIBRARIAN">Thủ thư</option>
            <option value="ADMIN">Admin / Ban giám hiệu</option>
          </Form.Select>
        </Form.Group>
      </FormModal>

      <ConfirmModal
        show={isOpen('lock')}
        title={locking ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        confirmLabel={locking ? 'Khóa' : 'Mở khóa'}
        variant={locking ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={() => run(() => usersApi.setUserStatus(modal.user.userId, locking ? 'LOCKED' : 'ACTIVE'))}
        onCancel={close}
      >
        {modal?.user && (
          <>
            {locking ? 'Tài khoản bị khóa sẽ không đăng nhập được.' : 'Tài khoản sẽ hoạt động trở lại.'} Xác nhận với{' '}
            <strong>{modal.user.fullName}</strong> ({modal.user.username})?
          </>
        )}
      </ConfirmModal>
    </>
  );
}
