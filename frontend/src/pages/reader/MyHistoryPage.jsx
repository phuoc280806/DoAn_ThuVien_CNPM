import { useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import * as meApi from '../../api/me';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import TicketDetailModal from '../../components/TicketDetailModal';
import { formatDate, formatMoney, todayVN } from '../../utils/format';
import useMyLoans from './useMyLoans';
import { LoanStatusBadge } from './loanStatus';

const EMPTY = { status: '', from: '', to: '' };

// UC012 – Lịch sử mượn/trả của chính độc giả, lọc theo trạng thái và khoảng ngày mượn
export default function MyHistoryPage() {
  const [form, setForm] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const { data, message, loading, error } = useMyLoans(filters);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <PageHeader title="Lịch sử mượn/trả" />

      <Card className="mb-4">
        <Card.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              setFilters(form);
            }}
          >
            <Row className="g-3 align-items-end">
              <Col sm={6} md={3}>
                <Form.Label htmlFor="hist-status" className="small fw-medium">Trạng thái</Form.Label>
                <Form.Select
                  id="hist-status"
                  value={form.status}
                  onChange={(e) => {
                    set('status')(e);
                    setFilters({ ...form, status: e.target.value });
                  }}
                >
                  <option value="">Tất cả</option>
                  <option value="BORROWING">Đang mượn</option>
                  <option value="OVERDUE">Quá hạn</option>
                  <option value="RETURNED">Đã trả</option>
                </Form.Select>
              </Col>
              <Col sm={6} md={3}>
                <Form.Label htmlFor="hist-from" className="small fw-medium">Mượn từ ngày</Form.Label>
                <Form.Control id="hist-from" type="date" max={todayVN()} value={form.from} onChange={set('from')} />
              </Col>
              <Col sm={6} md={3}>
                <Form.Label htmlFor="hist-to" className="small fw-medium">Đến ngày</Form.Label>
                <Form.Control id="hist-to" type="date" max={todayVN()} value={form.to} onChange={set('to')} />
              </Col>
              <Col sm={6} md={3} className="d-flex gap-2">
                <Button type="submit" className="flex-fill">
                  <i className="bi bi-funnel me-2" />
                  Lọc
                </Button>
                <Button
                  variant="outline-secondary"
                  aria-label="Xóa bộ lọc"
                  onClick={() => {
                    setForm(EMPTY);
                    setFilters(EMPTY);
                  }}
                >
                  <i className="bi bi-x-lg" />
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Card>
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
            <p className="text-secondary text-center py-5 mb-0">{message || 'Không có giao dịch phù hợp'}</p>
          ) : (
            data && (
              <Table hover responsive className="align-middle mb-0" style={{ opacity: loading ? 0.5 : 1 }}>
                <thead>
                  <tr>
                    <th>Phiếu</th>
                    <th>Sách</th>
                    <th>Ngày mượn</th>
                    <th>Hạn trả</th>
                    <th>Ngày trả</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Tiền phạt</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.borrowDetailId}>
                      <td>
                        <Button variant="link" className="p-0" onClick={() => setSelected(i.borrowId)}>
                          {i.ticketCode}
                        </Button>
                      </td>
                      <td>
                        <div className="fw-medium">{i.title}</div>
                        <div className="small text-secondary">{i.copyCode}</div>
                      </td>
                      <td>{formatDate(i.borrowDate)}</td>
                      <td>{formatDate(i.dueDate)}</td>
                      <td>{i.returnDate ? formatDate(i.returnDate) : '—'}</td>
                      <td>
                        <LoanStatusBadge item={i} />
                      </td>
                      <td className="text-end">
                        {i.fineAmount > 0 ? (
                          <>
                            <div>{formatMoney(i.fineAmount)}</div>
                            <StatusBadge type="fine" value={i.fineStatus} />
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          )}
        </Card.Body>
      </Card>

      <TicketDetailModal borrowId={selected} load={meApi.getMyTicket} onClose={() => setSelected(null)} />
    </>
  );
}
