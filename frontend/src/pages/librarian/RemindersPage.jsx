import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Modal, Row, Spinner, Table } from 'react-bootstrap';
import * as remindersApi from '../../api/reminders';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import StatTile from '../../components/StatTile';
import StatusBadge from '../../components/StatusBadge';
import { formatDate, formatDateTime } from '../../utils/format';

// Lịch sử gửi nhắc của một cuốn
function LogsModal({ item, onClose }) {
  const [logs, setLogs] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!item) return;
    let cancelled = false;
    setLogs(null);
    setError('');
    remindersApi
      .listReminderLogs({ borrowDetailId: item.borrowDetailId })
      .then((body) => !cancelled && setLogs(body.data))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [item]);

  return (
    <Modal show={!!item} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="h5">Lịch sử nhắc · {item?.copyCode}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {!logs && !error ? (
          <div className="text-center py-3">
            <Spinner animation="border" variant="primary" size="sm" />
          </div>
        ) : logs?.length === 0 ? (
          <p className="text-secondary mb-0">Chưa gửi nhắc lần nào.</p>
        ) : (
          logs && (
            <Table size="sm" className="small mb-0">
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Người gửi</th>
                  <th>Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.reminderId}>
                    <td>{formatDateTime(l.sentAt)}</td>
                    <td>{l.sentBy.fullName}</td>
                    <td>
                      {l.success ? <span className="text-success">Đã gửi</span> : <span className="text-danger">Lỗi</span>}
                      {l.errorMessage && <div className="text-secondary">{l.errorMessage}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  );
}

// UC017 – Nhắc hạn trả qua email (sách còn ≤ 3 ngày đến hạn hoặc đã quá hạn)
export default function RemindersPage() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [data, setData] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);
  const [logsOf, setLogsOf] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const body = await remindersApi.listReminders(status ? { status } : {});
      setData(body.data);
      setMessage(body.message ?? '');
      setSelected([]);
    } catch (err) {
      setData(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  // Chỉ chọn được cuốn của độc giả có email (backend từ chối cả lần gửi nếu có độc giả thiếu email)
  const sendable = (data?.items ?? []).filter((i) => i.canSendEmail);
  const allChecked = sendable.length > 0 && sendable.every((i) => selected.includes(i.borrowDetailId));

  const toggle = (id) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const toggleAll = () => setSelected(allChecked ? [] : sendable.map((i) => i.borrowDetailId));

  async function send() {
    setSending(true);
    try {
      const body = await remindersApi.sendReminders(selected);
      if (body.data.simulated) toast.warning(body.message);
      else toast.success(body.message);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
      await load();
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader title="Nhắc hạn trả">
        <Button onClick={send} disabled={selected.length === 0 || sending}>
          {sending ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-envelope me-2" />}
          Gửi email nhắc ({selected.length})
        </Button>
      </PageHeader>

      {data && (
        <Row xs={1} sm={3} className="g-3 mb-4">
          <Col><StatTile icon="list-check" label="Cần nhắc" value={data.totalItems} /></Col>
          <Col><StatTile icon="alarm" tone="warning" label="Sắp đến hạn" value={data.dueSoonCount} /></Col>
          <Col><StatTile icon="exclamation-octagon" tone="danger" label="Quá hạn" value={data.overdueCount} /></Col>
        </Row>
      )}

      <Card>
        <Card.Header className="bg-white d-flex flex-wrap align-items-center gap-2">
          <Form.Label htmlFor="remind-status" className="small fw-medium mb-0 me-1">Lọc</Form.Label>
          <Form.Select id="remind-status" size="sm" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="DUE_SOON">Sắp đến hạn</option>
            <option value="OVERDUE">Quá hạn</option>
          </Form.Select>
          <span className="small text-secondary ms-auto">Độc giả chưa có email không chọn được, cần nhắc trực tiếp.</span>
        </Card.Header>
        <Card.Body className="p-0">
          {error && (
            <Alert variant="danger" className="m-3">
              {error}
            </Alert>
          )}
          {loading && !data ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : data && data.items.length === 0 ? (
            <p className="text-secondary text-center py-5 mb-0">{message || 'Không có phiếu cần nhắc'}</p>
          ) : (
            data && (
              <Table hover responsive className="align-middle mb-0" style={{ opacity: loading ? 0.5 : 1 }}>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <Form.Check aria-label="Chọn tất cả" checked={allChecked} disabled={sendable.length === 0} onChange={toggleAll} />
                    </th>
                    <th>Độc giả</th>
                    <th>Sách</th>
                    <th>Hạn trả</th>
                    <th>Email</th>
                    <th className="text-center">Đã nhắc</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.borrowDetailId}>
                      <td>
                        <Form.Check
                          aria-label={`Chọn ${i.copyCode}`}
                          checked={selected.includes(i.borrowDetailId)}
                          disabled={!i.canSendEmail}
                          onChange={() => toggle(i.borrowDetailId)}
                        />
                      </td>
                      <td>
                        <div className="fw-medium">{i.readerName}</div>
                        <div className="small text-secondary">
                          {i.readerCode}
                          {(i.className || i.department) && ` · ${i.className || i.department}`}
                        </div>
                      </td>
                      <td>
                        <div>{i.title}</div>
                        <div className="small text-secondary">
                          {i.copyCode} · {i.ticketCode}
                        </div>
                      </td>
                      <td>
                        {formatDate(i.dueDate)}
                        <div>
                          {i.status === 'OVERDUE' ? (
                            <StatusBadge type="due" value="OVERDUE" />
                          ) : (
                            <span className="small text-warning-emphasis">{i.daysLeft === 0 ? 'Hạn hôm nay' : `Còn ${i.daysLeft} ngày`}</span>
                          )}
                          {i.status === 'OVERDUE' && <span className="small text-danger ms-1">{i.daysOverdue} ngày</span>}
                        </div>
                      </td>
                      <td className="small">
                        {i.email ?? <span className="text-danger">{i.missingEmailReason}</span>}
                      </td>
                      <td className="text-center">
                        <Button variant="link" size="sm" className="p-0" onClick={() => setLogsOf(i)}>
                          {i.sentCount} lần
                        </Button>
                        {i.lastAttemptAt && <div className="small text-secondary">{formatDateTime(i.lastAttemptAt)}</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          )}
        </Card.Body>
      </Card>

      <LogsModal item={logsOf} onClose={() => setLogsOf(null)} />
    </>
  );
}
