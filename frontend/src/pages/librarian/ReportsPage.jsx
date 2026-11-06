import { useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import * as reportsApi from '../../api/reports';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import StatTile from '../../components/StatTile';
import StatusBadge from '../../components/StatusBadge';
import { formatDate, formatDateTime, formatMoney, todayVN } from '../../utils/format';
import { READER_TYPE_LABELS } from '../../utils/roles';

const TYPES = {
  loans: 'Thống kê mượn / trả',
  overdue: 'Sách trả trễ & đang quá hạn',
  fines: 'Tiền phạt đã thu / chưa thu',
};

function Reader({ reader }) {
  return (
    <>
      {reader.fullName}
      <div className="small text-secondary">
        {reader.readerCode} · {READER_TYPE_LABELS[reader.readerType]}
      </div>
    </>
  );
}

// (1) Thống kê mượn / trả
function LoansReport({ data }) {
  const s = data.summary;
  return (
    <>
      <Row xs={2} lg={4} className="g-3 mb-4">
        <Col><StatTile icon="clipboard-data" label="Số phiếu lập" value={s.totalTickets} note={`HS ${s.studentTickets} · GV ${s.teacherTickets}`} /></Col>
        <Col><StatTile icon="journal-arrow-up" label="Sách cho mượn" value={s.totalBorrowedBooks} note={`Đã trả ${s.totalReturnedBooks}`} /></Col>
        <Col><StatTile icon="journal-bookmark" label="Đang mượn" value={s.borrowingBooks} tone="warning" /></Col>
        <Col><StatTile icon="exclamation-octagon" label="Đang quá hạn" value={s.overdueBooks} tone="danger" note={`Trả trong kỳ: ${s.returnedInPeriod}`} /></Col>
      </Row>
      <Card>
        <Card.Body className="p-0">
          <Table hover responsive className="align-middle small mb-0">
            <thead>
              <tr>
                <th>Phiếu</th>
                <th>Ngày lập</th>
                <th>Độc giả</th>
                <th>Thủ thư</th>
                <th className="text-center">Số cuốn</th>
                <th className="text-center">Đã trả</th>
                <th className="text-center">Quá hạn</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.borrowId}>
                  <td className="fw-medium">{t.ticketCode}</td>
                  <td>{formatDate(t.borrowDate)}</td>
                  <td><Reader reader={t.reader} /></td>
                  <td>{t.librarian.fullName}</td>
                  <td className="text-center">{t.totalBooks}</td>
                  <td className="text-center">{t.returnedBooks}</td>
                  <td className="text-center">{t.overdueBooks > 0 ? <span className="text-danger fw-medium">{t.overdueBooks}</span> : 0}</td>
                  <td><StatusBadge type="ticket" value={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
}

// (2) Sách trả trễ & đang quá hạn
function OverdueReport({ data }) {
  const s = data.summary;
  return (
    <>
      <Row xs={1} sm={3} className="g-3 mb-4">
        <Col><StatTile icon="exclamation-octagon" tone="danger" label="Đang quá hạn" value={s.overdueCount} note={`Phạt dự kiến ${formatMoney(s.overdueFineAmount)}`} /></Col>
        <Col><StatTile icon="clock-history" tone="warning" label="Đã trả trễ" value={s.lateReturnedCount} note={`Tiền phạt ${formatMoney(s.lateReturnedFineAmount)}`} /></Col>
        <Col><StatTile icon="cash-coin" label="Tổng tiền phạt" value={formatMoney(s.totalFineAmount)} /></Col>
      </Row>
      <Card>
        <Card.Body className="p-0">
          <Table hover responsive className="align-middle small mb-0">
            <thead>
              <tr>
                <th>Tình trạng</th>
                <th>Phiếu</th>
                <th>Độc giả</th>
                <th>Sách</th>
                <th>Hạn trả</th>
                <th>Ngày trả</th>
                <th className="text-end">Trễ</th>
                <th className="text-end">Tiền phạt</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.borrowDetailId}>
                  <td>
                    {i.status === 'OVERDUE' ? (
                      <StatusBadge type="due" value="OVERDUE" />
                    ) : (
                      <Badge pill bg="warning-subtle" text="warning-emphasis" className="fw-medium">Trả trễ</Badge>
                    )}
                  </td>
                  <td>{i.ticketCode}</td>
                  <td><Reader reader={i.reader} /></td>
                  <td>
                    {i.title}
                    <div className="text-secondary">{i.copyCode}</div>
                  </td>
                  <td>{formatDate(i.dueDate)}</td>
                  <td>{i.returnDate ? formatDate(i.returnDate) : 'Chưa trả'}</td>
                  <td className="text-end">{i.lateDays} ngày</td>
                  <td className="text-end">
                    {formatMoney(i.fineAmount)}
                    {i.status === 'OVERDUE' && <div className="text-secondary">(tính đến hôm nay)</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
}

// (3) Tiền phạt đã thu / chưa thu và độc giả còn nợ
function FinesReport({ data }) {
  const s = data.summary;
  return (
    <>
      <Row xs={2} lg={4} className="g-3 mb-4">
        <Col><StatTile icon="receipt" label="Tổng tiền phạt" value={formatMoney(s.totalAmount)} note={`${s.totalFines} khoản`} /></Col>
        <Col><StatTile icon="check2-circle" tone="success" label="Đã thu" value={formatMoney(s.paidAmount)} note={`${s.paidCount} khoản`} /></Col>
        <Col><StatTile icon="hourglass-split" tone="warning" label="Chưa thu" value={formatMoney(s.unpaidAmount)} note={`${s.unpaidCount} khoản`} /></Col>
        <Col><StatTile icon="people" tone="danger" label="Độc giả còn nợ" value={s.debtorCount} /></Col>
      </Row>
      {data.debtors.length > 0 && (
        <Card className="mb-4">
          <Card.Header className="fw-semibold">Độc giả còn nợ phạt</Card.Header>
          <Card.Body className="p-0">
            <Table responsive className="align-middle small mb-0">
              <thead>
                <tr>
                  <th>Độc giả</th>
                  <th className="text-center">Số khoản</th>
                  <th className="text-end">Còn nợ</th>
                </tr>
              </thead>
              <tbody>
                {data.debtors.map((d) => (
                  <tr key={d.readerId}>
                    <td><Reader reader={d} /></td>
                    <td className="text-center">{d.unpaidCount}</td>
                    <td className="text-end fw-medium text-danger">{formatMoney(d.unpaidTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}
      <Card>
        <Card.Header className="fw-semibold">Các khoản phạt trong kỳ</Card.Header>
        <Card.Body className="p-0">
          <Table hover responsive className="align-middle small mb-0">
            <thead>
              <tr>
                <th>Phiếu</th>
                <th>Độc giả</th>
                <th>Sách</th>
                <th className="text-end">Trễ</th>
                <th className="text-end">Số tiền</th>
                <th>Trạng thái</th>
                <th>Thu lúc / người thu</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((f) => (
                <tr key={f.fineId}>
                  <td>{f.ticketCode}</td>
                  <td><Reader reader={f.reader} /></td>
                  <td>
                    {f.title}
                    <div className="text-secondary">{f.copyCode}</div>
                  </td>
                  <td className="text-end">{f.lateDays} ngày</td>
                  <td className="text-end fw-medium">{formatMoney(f.amount)}</td>
                  <td>
                    <StatusBadge type="fine" value={f.status} />
                    {f.receiptCode && <div className="text-secondary">{f.receiptCode}</div>}
                  </td>
                  <td>
                    {f.paidAt ? (
                      <>
                        {formatDateTime(f.paidAt)}
                        <div className="text-secondary">{f.collectedBy?.fullName}</div>
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </>
  );
}

const REPORTS = { loans: LoansReport, overdue: OverdueReport, fines: FinesReport };

// UC016 – Báo cáo thống kê
export default function ReportsPage() {
  const toast = useToast();
  const [form, setForm] = useState({ type: 'loans', from: `${todayVN().slice(0, 8)}01`, to: todayVN() });
  const [result, setResult] = useState(null);   // { type, data, message }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  function checkPeriod() {
    if (!form.from || !form.to) return 'Cần nhập đủ Từ ngày và Đến ngày';
    return '';
  }

  async function view(e) {
    e.preventDefault();
    const problem = checkPeriod();
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body = await reportsApi.getReport(form.type, form.from, form.to);
      setResult({ type: form.type, data: body.data, message: body.message, from: form.from, to: form.to });
    } catch (err) {
      setResult(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function exportFile(format) {
    const problem = checkPeriod();
    if (problem) {
      setError(problem);
      return;
    }
    setExporting(format);
    setError('');
    try {
      await reportsApi.exportReport(form.type, form.from, form.to, format);
      toast.success(`Đã xuất báo cáo ra file ${format === 'xlsx' ? 'Excel' : 'PDF'}`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setExporting('');
    }
  }

  const Report = result && REPORTS[result.type];

  return (
    <>
      <PageHeader title="Báo cáo thống kê" />

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={view} noValidate>
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label htmlFor="report-type" className="small fw-medium">Loại báo cáo</Form.Label>
                <Form.Select id="report-type" value={form.type} onChange={set('type')}>
                  {Object.entries(TYPES).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </Form.Select>
              </Col>
              <Col sm={6} md={2}>
                <Form.Label htmlFor="report-from" className="small fw-medium">Từ ngày</Form.Label>
                <Form.Control id="report-from" type="date" max={todayVN()} value={form.from} onChange={set('from')} />
              </Col>
              <Col sm={6} md={2}>
                <Form.Label htmlFor="report-to" className="small fw-medium">Đến ngày</Form.Label>
                <Form.Control id="report-to" type="date" max={todayVN()} value={form.to} onChange={set('to')} />
              </Col>
              <Col md={4} className="d-flex flex-wrap gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-bar-chart-line me-2" />}
                  Xem báo cáo
                </Button>
                <Button variant="outline-success" disabled={!!exporting} onClick={() => exportFile('xlsx')}>
                  {exporting === 'xlsx' ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-file-earmark-excel me-2" />}
                  Excel
                </Button>
                <Button variant="outline-danger" disabled={!!exporting} onClick={() => exportFile('pdf')}>
                  {exporting === 'pdf' ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-file-earmark-pdf me-2" />}
                  PDF
                </Button>
              </Col>
            </Row>
          </Form>
          {error && (
            <Alert variant="danger" className="mt-3 mb-0">
              {error}
            </Alert>
          )}
        </Card.Body>
      </Card>

      {result && (
        <>
          <h2 className="h6 text-secondary mb-3">
            {TYPES[result.type]} · từ {formatDate(result.from)} đến {formatDate(result.to)}
          </h2>
          {result.message ? <Alert variant="info">{result.message}</Alert> : <Report data={result.data} />}
        </>
      )}
    </>
  );
}
