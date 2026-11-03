import { useState } from 'react';
import { Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import * as loansApi from '../../api/loans';
import usePagedList from '../../hooks/usePagedList';
import PageHeader from '../../components/PageHeader';
import ListCard from '../../components/ListCard';
import StatusBadge from '../../components/StatusBadge';
import TicketDetailModal from '../../components/TicketDetailModal';
import { formatDate, formatMoney } from '../../utils/format';

const EMPTY = { keyword: '', status: '', from: '', to: '' };

// Admin – Quản lý mượn trả: mọi phiếu mượn, kèm quy định lưu trên từng phiếu để so sánh
export default function LoansPage() {
  const [form, setForm] = useState(EMPTY);
  const [filters, setFilters] = useState(EMPTY);
  const [selected, setSelected] = useState(null);
  const list = usePagedList(loansApi.listLoans, filters);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <PageHeader title="Quản lý mượn trả" subtitle="Toàn bộ phiếu mượn và quy định đã lưu trên từng phiếu (snapshot)" />

      <Card className="mb-4">
        <Card.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              setFilters({ ...form, keyword: form.keyword.trim() });
            }}
          >
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label htmlFor="loans-keyword" className="small fw-medium">Tìm kiếm</Form.Label>
                <Form.Control
                  id="loans-keyword"
                  value={form.keyword}
                  onChange={set('keyword')}
                  placeholder="Mã phiếu, mã hoặc tên độc giả"
                />
              </Col>
              <Col sm={4} md={2}>
                <Form.Label htmlFor="loans-status" className="small fw-medium">Trạng thái</Form.Label>
                <Form.Select
                  id="loans-status"
                  value={form.status}
                  onChange={(e) => {
                    set('status')(e);
                    setFilters({ ...form, status: e.target.value });
                  }}
                >
                  <option value="">Tất cả</option>
                  <option value="BORROWING">Đang mượn</option>
                  <option value="OVERDUE">Có sách quá hạn</option>
                  <option value="COMPLETED">Hoàn tất</option>
                </Form.Select>
              </Col>
              <Col sm={4} md={2}>
                <Form.Label htmlFor="loans-from" className="small fw-medium">Lập từ ngày</Form.Label>
                <Form.Control id="loans-from" type="date" value={form.from} onChange={set('from')} />
              </Col>
              <Col sm={4} md={2}>
                <Form.Label htmlFor="loans-to" className="small fw-medium">Đến ngày</Form.Label>
                <Form.Control id="loans-to" type="date" value={form.to} onChange={set('to')} />
              </Col>
              <Col md={2} className="d-flex gap-2">
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

      <ListCard list={list} empty="Không có phiếu mượn nào phù hợp.">
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Độc giả</th>
              <th>Ngày lập</th>
              <th className="text-center">Đã trả</th>
              <th>Hạn trả gần nhất</th>
              <th>Trạng thái</th>
              <th>Quy định trên phiếu</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((t) => (
              <tr key={t.borrowId}>
                <td className="fw-medium">{t.ticketCode}</td>
                <td>
                  <div>{t.reader.fullName}</div>
                  <div className="small text-secondary">{t.reader.readerCode}</div>
                </td>
                <td>{formatDate(t.borrowDate)}</td>
                <td className="text-center">
                  {t.returnedBooks}/{t.totalBooks}
                </td>
                <td>{t.nextDueDate ? formatDate(t.nextDueDate) : '—'}</td>
                <td>
                  <StatusBadge type="ticket" value={t.status} />{' '}
                  {t.overdueBooks > 0 && <StatusBadge type="due" value="OVERDUE" />}
                </td>
                <td className="small">
                  <div>
                    {t.snapshot.borrowDays} ngày · {formatMoney(t.snapshot.finePerDay)}/ngày
                  </div>
                  <div className="text-secondary">Phiên bản #{t.snapshot.regulationId}</div>
                </td>
                <td className="text-end">
                  <Button size="sm" variant="outline-secondary" onClick={() => setSelected(t.borrowId)}>
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ListCard>

      <TicketDetailModal borrowId={selected} onClose={() => setSelected(null)} />
    </>
  );
}
