import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import * as meApi from '../../api/me';
import * as loansApi from '../../api/loans';
import * as finesApi from '../../api/fines';
import * as remindersApi from '../../api/reminders';
import * as regulationsApi from '../../api/regulations';
import { errorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import StatTile from '../../components/StatTile';
import { menuFor } from '../../routes/pages';
import { diffDays, formatDate, formatDateTime, formatMoney, todayVN } from '../../utils/format';
import { ROLES, roleLabelOf } from '../../utils/roles';
import { READER_SCOPE_LABELS, formatParam, paramLabel } from '../../utils/regulation';

const DUE_SOON_DAYS = 3;

// ---------------------------------------------------------------------
// Số liệu theo vai trò, lấy từ các API có sẵn (không có API tổng hợp riêng)
// ---------------------------------------------------------------------
async function loadReaderStats() {
  const { data } = await meApi.getMyLoans();
  const open = data.items.filter((i) => i.status === 'BORROWING' || i.status === 'OVERDUE');
  const today = todayVN();
  return {
    open: open.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
    overdue: open.filter((i) => i.status === 'OVERDUE').length,
    dueSoon: open.filter((i) => i.status === 'BORROWING' && diffDays(today, i.dueDate) <= DUE_SOON_DAYS).length,
    unpaidTotal: data.unpaidTotal,
  };
}

async function loadStaffStats(isAdmin) {
  const total = (body) => body.data.total;
  const [borrowing, overdue, unpaid, reminders, regLogs] = await Promise.all([
    loansApi.listLoans({ status: 'BORROWING', pageSize: 1 }).then(total),
    loansApi.listLoans({ status: 'OVERDUE', pageSize: 1 }).then(total),
    finesApi.listFines({ status: 'UNPAID', pageSize: 1 }).then(total),
    remindersApi.listReminders().then((body) => body.data),
    isAdmin ? regulationsApi.listRegulationLogs({ pageSize: 5 }).then((body) => body.data.items) : null,
  ]);
  return { borrowing, overdue, unpaid, dueSoon: reminders.dueSoonCount, toRemind: reminders.totalItems, regLogs };
}

function ReaderDashboard({ stats }) {
  return (
    <>
      <Row xs={2} xl={4} className="g-3 mb-4">
        <Col><StatTile icon="journal-bookmark" label="Đang mượn" value={stats.open.length} note="cuốn" to="/my-loans" /></Col>
        <Col><StatTile icon="alarm" tone="warning" label="Sắp đến hạn" value={stats.dueSoon} note={`Trong ${DUE_SOON_DAYS} ngày`} to="/my-loans" /></Col>
        <Col><StatTile icon="exclamation-octagon" tone="danger" label="Quá hạn" value={stats.overdue} note={stats.overdue ? 'Cần trả sớm' : 'Không có'} to="/my-loans" /></Col>
        <Col><StatTile icon="cash-coin" tone="warning" label="Tiền phạt chưa nộp" value={formatMoney(stats.unpaidTotal)} note="Nộp tại quầy" to="/my-fines" /></Col>
      </Row>
      {(stats.overdue > 0 || stats.unpaidTotal > 0) && (
        <Alert variant="danger">
          <i className="bi bi-exclamation-octagon me-2" />
          Bạn đang có sách quá hạn hoặc còn nợ phạt nên chưa mượn thêm được. Hãy trả sách và nộp phạt tại quầy thư viện.
        </Alert>
      )}
      <Card className="mb-4">
        <Card.Header className="fw-semibold d-flex justify-content-between">
          Sách đang mượn
          <Link to="/my-loans" className="small fw-normal">Xem tất cả</Link>
        </Card.Header>
        <Card.Body className="p-0">
          {stats.open.length === 0 ? (
            <p className="text-secondary text-center py-4 mb-0">Bạn không có cuốn sách nào đang mượn.</p>
          ) : (
            <Table responsive className="align-middle small mb-0">
              <tbody>
                {stats.open.slice(0, 5).map((i) => {
                  const left = diffDays(todayVN(), i.dueDate);
                  return (
                    <tr key={i.borrowDetailId}>
                      <td className="ps-3">
                        <div className="fw-medium">{i.title}</div>
                        <div className="text-secondary">{i.copyCode}</div>
                      </td>
                      <td>Hạn trả {formatDate(i.dueDate)}</td>
                      <td className="text-end pe-3">
                        {left < 0 ? (
                          <span className="text-danger">Quá hạn {-left} ngày</span>
                        ) : (
                          <span className={left <= DUE_SOON_DAYS ? 'text-warning-emphasis' : 'text-secondary'}>Còn {left} ngày</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </>
  );
}

function StaffDashboard({ stats, isAdmin }) {
  return (
    <>
      <Row xs={2} xl={4} className="g-3 mb-4">
        <Col><StatTile icon="clipboard-data" label="Phiếu đang mượn" value={stats.borrowing} to={isAdmin ? '/loans' : '/reports'} /></Col>
        <Col><StatTile icon="exclamation-octagon" tone="danger" label="Phiếu có sách quá hạn" value={stats.overdue} to="/reminders" /></Col>
        <Col><StatTile icon="cash-coin" tone="warning" label="Khoản phạt chưa thu" value={stats.unpaid} to="/fines" /></Col>
        <Col><StatTile icon="alarm" tone="warning" label="Cần nhắc hạn" value={stats.toRemind} note={`${stats.dueSoon} cuốn sắp đến hạn`} to="/reminders" /></Col>
      </Row>
      {isAdmin && stats.regLogs && (
        <Card className="mb-4">
          <Card.Header className="fw-semibold d-flex justify-content-between">
            Thay đổi quy định gần đây
            <Link to="/audit-logs" className="small fw-normal">Xem nhật ký</Link>
          </Card.Header>
          <Card.Body className="p-0">
            {stats.regLogs.length === 0 ? (
              <p className="text-secondary text-center py-4 mb-0">Chưa có thay đổi nào.</p>
            ) : (
              <Table responsive className="align-middle small mb-0">
                <tbody>
                  {stats.regLogs.map((l) => (
                    <tr key={l.logId}>
                      <td className="ps-3 text-nowrap">{formatDateTime(l.changedAt)}</td>
                      <td>
                        <Badge pill bg={l.changeType === 'CONFIG' ? 'info-subtle' : 'warning-subtle'} text={l.changeType === 'CONFIG' ? 'info-emphasis' : 'warning-emphasis'}>
                          {l.changeType === 'CONFIG' ? 'Cấu hình' : 'Áp dụng phiếu đang mượn'}
                        </Badge>{' '}
                        {READER_SCOPE_LABELS[l.readerType ?? 'ALL']}
                      </td>
                      <td>
                        {Object.keys(l.newValues).map((k) => (
                          <span key={k} className="me-2">
                            {paramLabel(k)}: <strong>{formatParam(k, l.newValues[k])}</strong>
                          </span>
                        ))}
                      </td>
                      <td className="pe-3 text-secondary">{l.changedBy.fullName}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </>
  );
}

// Trang Tổng quan: số liệu theo vai trò + lối tắt tới các chức năng
export default function DashboardPage() {
  const { user } = useAuth();
  const isReader = user.role === ROLES.READER;
  const isAdmin = user.role === ROLES.ADMIN;
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (isReader ? loadReaderStats() : loadStaffStats(isAdmin))
      .then((s) => !cancelled && setStats(s))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [isReader, isAdmin]);

  const shortcuts = menuFor(user.role)
    .flatMap((g) => g.pages)
    .filter((p) => p.path !== '/dashboard' && p.path !== '/profile');

  return (
    <>
      <PageHeader title={`Xin chào, ${user.fullName}`} subtitle={roleLabelOf(user)} />

      {error && <Alert variant="warning">Không tải được số liệu tổng quan: {error}</Alert>}
      {!stats && !error && (
        <div className="text-center py-4">
          <Spinner animation="border" variant="primary" />
        </div>
      )}
      {stats && (isReader ? <ReaderDashboard stats={stats} /> : <StaffDashboard stats={stats} isAdmin={isAdmin} />)}

      <h2 className="h6 text-secondary mb-3">Chức năng</h2>
      <Row xs={1} sm={2} xl={3} className="g-3">
        {shortcuts.map((page) => (
          <Col key={page.path}>
            <Card as={Link} to={page.path} className="quick-link h-100">
              <Card.Body className="d-flex align-items-center gap-3">
                <div className="icon-tile">
                  <i className={`bi bi-${page.icon}`} />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-medium">{page.label}</div>
                  <div className="small text-secondary">{page.uc.join(', ')}</div>
                </div>
                {!page.component && (
                  <Badge bg="secondary-subtle" text="secondary-emphasis" pill>
                    Sắp có
                  </Badge>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
