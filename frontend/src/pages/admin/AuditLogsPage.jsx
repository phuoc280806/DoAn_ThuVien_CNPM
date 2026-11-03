import { useState } from 'react';
import { Badge, Button, Card, Col, Form, Nav, Row, Table } from 'react-bootstrap';
import * as regulationsApi from '../../api/regulations';
import * as auditApi from '../../api/audit';
import usePagedList from '../../hooks/usePagedList';
import PageHeader from '../../components/PageHeader';
import ListCard from '../../components/ListCard';
import { formatDate, formatDateTime, todayVN } from '../../utils/format';
import { ROLE_LABELS } from '../../utils/roles';
import { READER_SCOPE_LABELS, formatParam, paramLabel } from '../../utils/regulation';

const CHANGE_TYPES = {
  CONFIG: ['Cấu hình quy định', 'info'],
  APPLY_ACTIVE_LOANS: ['Áp dụng phiếu đang mượn', 'warning'],
};

const ACTIONS = {
  CREATE_USER: 'Tạo tài khoản',
  LOCK_USER: 'Khóa tài khoản',
  UNLOCK_USER: 'Mở khóa tài khoản',
  RESET_PASSWORD: 'Đặt lại mật khẩu',
  CHANGE_ROLE: 'Đổi vai trò',
  CHANGE_OWN_PASSWORD: 'Tự đổi mật khẩu',
  UNAUTHORIZED_ACCESS: 'Truy cập trái phép',
};
const TARGETS = { USER: 'tài khoản', FINE: 'biên lai', BORROW_TICKET: 'phiếu mượn' };
const STATUS_LABELS = { ACTIVE: 'Hoạt động', LOCKED: 'Bị khóa' };

function Kind({ value }) {
  const [label, color] = CHANGE_TYPES[value] ?? [value, 'secondary'];
  return (
    <Badge pill bg={`${color}-subtle`} text={`${color}-emphasis`} className="fw-medium">
      {label}
    </Badge>
  );
}

// Ô lọc ngày dùng chung cho hai tab
function DateFilters({ form, setForm, prefix }) {
  return (
    <>
      <Col sm={6} md={2}>
        <Form.Label htmlFor={`${prefix}-from`} className="small fw-medium">Từ ngày</Form.Label>
        <Form.Control id={`${prefix}-from`} type="date" max={todayVN()} value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
      </Col>
      <Col sm={6} md={2}>
        <Form.Label htmlFor={`${prefix}-to`} className="small fw-medium">Đến ngày</Form.Label>
        <Form.Control id={`${prefix}-to`} type="date" max={todayVN()} value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
      </Col>
    </>
  );
}

function FilterButtons({ onReset }) {
  return (
    <Col md={2} className="d-flex gap-2">
      <Button type="submit" className="flex-fill">
        <i className="bi bi-funnel me-2" />
        Lọc
      </Button>
      <Button variant="outline-secondary" aria-label="Xóa bộ lọc" onClick={onReset}>
        <i className="bi bi-x-lg" />
      </Button>
    </Col>
  );
}

// UC014 – Nhật ký thay đổi quy định
const REG_EMPTY = { from: '', to: '', readerType: '', changedBy: '' };

function RegulationLogs() {
  const [form, setForm] = useState(REG_EMPTY);
  const [filters, setFilters] = useState(REG_EMPTY);
  const list = usePagedList(regulationsApi.listRegulationLogs, filters);

  return (
    <>
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={(e) => { e.preventDefault(); setFilters({ ...form, changedBy: form.changedBy.trim() }); }}>
            <Row className="g-3 align-items-end">
              <DateFilters form={form} setForm={setForm} prefix="reglog" />
              <Col sm={6} md={3}>
                <Form.Label htmlFor="reglog-type" className="small fw-medium">Loại độc giả</Form.Label>
                <Form.Select id="reglog-type" value={form.readerType} onChange={(e) => setForm({ ...form, readerType: e.target.value })}>
                  <option value="">Tất cả</option>
                  <option value="STUDENT">Học sinh</option>
                  <option value="TEACHER">Giáo viên</option>
                </Form.Select>
              </Col>
              <Col sm={6} md={3}>
                <Form.Label htmlFor="reglog-by" className="small fw-medium">Người thay đổi</Form.Label>
                <Form.Control id="reglog-by" value={form.changedBy} onChange={(e) => setForm({ ...form, changedBy: e.target.value })} placeholder="VD: AD001" />
              </Col>
              <FilterButtons onReset={() => { setForm(REG_EMPTY); setFilters(REG_EMPTY); }} />
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <ListCard list={list} empty="Không có thay đổi nào trong khoảng đã chọn.">
        <Table hover responsive className="align-middle small mb-0">
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Người thay đổi</th>
              <th>Loại</th>
              <th>Áp dụng cho</th>
              <th>Giá trị cũ → mới</th>
              <th>Hiệu lực từ</th>
              <th>Lý do</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((l) => (
              <tr key={l.logId}>
                <td className="text-nowrap">{formatDateTime(l.changedAt)}</td>
                <td>
                  {l.changedBy.fullName}
                  <div className="text-secondary">{l.changedBy.username}</div>
                </td>
                <td><Kind value={l.changeType} /></td>
                <td>{READER_SCOPE_LABELS[l.readerType ?? 'ALL']}</td>
                <td>
                  {Object.keys(l.newValues).map((k) => (
                    <div key={k} className="text-nowrap">
                      {paramLabel(k)}:{' '}
                      {l.oldValues && k in l.oldValues && <span className="text-secondary">{formatParam(k, l.oldValues[k])} → </span>}
                      <strong>{formatParam(k, l.newValues[k])}</strong>
                    </div>
                  ))}
                </td>
                <td>{formatDate(l.effectiveFrom)}</td>
                <td>
                  {l.reason ?? '—'}
                  {l.affectedTickets != null && <div className="text-secondary">{l.affectedTickets} phiếu bị ảnh hưởng</div>}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ListCard>
    </>
  );
}

// Nhật ký hệ thống: thao tác quản trị tài khoản, tự đổi mật khẩu, truy cập trái phép
function describe(log) {
  const d = log.detail ?? {};
  switch (log.action) {
    case 'CHANGE_ROLE':
      return `${ROLE_LABELS[d.oldRole]} → ${ROLE_LABELS[d.newRole]}`;
    case 'LOCK_USER':
    case 'UNLOCK_USER':
      return `${STATUS_LABELS[d.oldStatus] ?? d.oldStatus} → ${STATUS_LABELS[d.newStatus] ?? d.newStatus}`;
    case 'CREATE_USER':
      return `Vai trò ${ROLE_LABELS[d.role] ?? d.role}`;
    case 'UNAUTHORIZED_ACCESS':
      return `Cố xem ${TARGETS[log.targetType] ?? log.targetType} #${log.targetId} của người khác`;
    default:
      return '—';
  }
}

const SYS_EMPTY = { action: '', keyword: '', from: '', to: '' };

function SystemLogs() {
  const [form, setForm] = useState(SYS_EMPTY);
  const [filters, setFilters] = useState(SYS_EMPTY);
  const list = usePagedList(auditApi.listAuditLogs, filters);

  return (
    <>
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={(e) => { e.preventDefault(); setFilters({ ...form, keyword: form.keyword.trim() }); }}>
            <Row className="g-3 align-items-end">
              <DateFilters form={form} setForm={setForm} prefix="sys" />
              <Col sm={6} md={3}>
                <Form.Label htmlFor="sys-action" className="small fw-medium">Hành động</Form.Label>
                <Form.Select id="sys-action" value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}>
                  <option value="">Tất cả</option>
                  {Object.entries(ACTIONS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col sm={6} md={3}>
                <Form.Label htmlFor="sys-keyword" className="small fw-medium">Người thực hiện</Form.Label>
                <Form.Control id="sys-keyword" value={form.keyword} onChange={(e) => setForm({ ...form, keyword: e.target.value })} placeholder="Tên đăng nhập hoặc họ tên" />
              </Col>
              <FilterButtons onReset={() => { setForm(SYS_EMPTY); setFilters(SYS_EMPTY); }} />
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <ListCard list={list} empty="Chưa có thao tác nào được ghi nhận.">
        <Table hover responsive className="align-middle small mb-0">
          <thead>
            <tr>
              <th>Thời điểm</th>
              <th>Người thực hiện</th>
              <th>Hành động</th>
              <th>Đối tượng</th>
              <th>Chi tiết</th>
              <th>IP</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((l) => (
              <tr key={l.logId}>
                <td className="text-nowrap">{formatDateTime(l.createdAt)}</td>
                <td>
                  {l.user ? (
                    <>
                      {l.user.fullName}
                      <div className="text-secondary">{l.user.username}</div>
                    </>
                  ) : (
                    '—'
                  )}
                </td>
                <td>
                  <span className={l.action === 'UNAUTHORIZED_ACCESS' ? 'text-danger fw-medium' : ''}>
                    {ACTIONS[l.action] ?? l.action}
                  </span>
                </td>
                <td>{l.detail?.username ?? (l.targetType ? `${TARGETS[l.targetType] ?? l.targetType} #${l.targetId}` : '—')}</td>
                <td>{describe(l)}</td>
                <td className="text-secondary">{l.ipAddress ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ListCard>
    </>
  );
}

// UC014 + nhật ký hệ thống (NFR logging/audit)
export default function AuditLogsPage() {
  const [tab, setTab] = useState('regulations');
  return (
    <>
      <PageHeader title="Nhật ký thay đổi" subtitle="UC014 · Chỉ đọc, không sửa hoặc xóa được; mới nhất ở trên" />
      <Nav variant="tabs" activeKey={tab} onSelect={setTab} className="mb-4">
        <Nav.Item>
          <Nav.Link eventKey="regulations">Thay đổi quy định</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="system">Nhật ký hệ thống</Nav.Link>
        </Nav.Item>
      </Nav>
      {tab === 'regulations' ? <RegulationLogs /> : <SystemLogs />}
    </>
  );
}
