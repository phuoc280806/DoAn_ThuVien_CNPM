import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import * as finesApi from '../../api/fines';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import ScanInput from '../../components/ScanInput';
import StatusBadge from '../../components/StatusBadge';
import Pagination from '../../components/Pagination';
import PayFineModal from '../../components/PayFineModal';
import ReceiptModal from '../../components/ReceiptModal';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';

const PAGE_SIZE = 20;

// UC011 – Thu tiền phạt (kể cả khoản nợ cũ, luồng 1a: tìm theo mã độc giả)
export default function FinesPage() {
  const toast = useToast();
  const [readerInput, setReaderInput] = useState('');
  const [filters, setFilters] = useState({ readerCode: '', status: 'UNPAID' });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [payFine, setPayFine] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [openingReceipt, setOpeningReceipt] = useState(null);
  const pendingReceipt = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const body = await finesApi.listFines({
        readerCode: filters.readerCode || undefined,
        status: filters.status || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setData(body.data);
    } catch (err) {
      setData(null);
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    load();
  }, [load]);

  function applyFilters(next) {
    setFilters((f) => ({ ...f, ...next }));
    setPage(1);
  }

  function handlePaid(body) {
    toast.success(body.message);
    // Mở biên lai sau khi modal thu phạt đóng hẳn
    pendingReceipt.current = { data: body.data.receipt, message: body.message };
    setPayFine(null);
    load();
  }

  function afterPayClosed() {
    if (!pendingReceipt.current) return;
    setReceipt(pendingReceipt.current);
    pendingReceipt.current = null;
  }

  async function showReceipt(fineId) {
    setOpeningReceipt(fineId);
    try {
      const body = await finesApi.getReceipt(fineId);
      setReceipt({ data: body.data });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setOpeningReceipt(null);
    }
  }

  return (
    <>
      <PageHeader title="Thu tiền phạt" />

      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={7} lg={6}>
              <ScanInput
                id="fines-reader"
                label="Mã độc giả"
                value={readerInput}
                onChange={setReaderInput}
                onSubmit={(code) => applyFilters({ readerCode: code })}
                placeholder="VD: HS2026005"
                buttonLabel="Lọc"
                icon="funnel"
              />
            </Col>
            <Col sm={6} md={3}>
              <Form.Label htmlFor="fines-status" className="small fw-medium">Trạng thái</Form.Label>
              <Form.Select
                id="fines-status"
                value={filters.status}
                onChange={(e) => applyFilters({ status: e.target.value })}
              >
                <option value="">Tất cả</option>
                <option value="UNPAID">Chưa thu</option>
                <option value="PAID">Đã thu</option>
              </Form.Select>
            </Col>
            {filters.readerCode && (
              <Col xs="auto">
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setReaderInput('');
                    applyFilters({ readerCode: '' });
                  }}
                >
                  <i className="bi bi-x-lg me-2" />
                  Bỏ lọc {filters.readerCode}
                </Button>
              </Col>
            )}
          </Row>

          {filters.readerCode && data?.unpaidTotal !== undefined && (
            <Alert variant={data.unpaidTotal > 0 ? 'warning' : 'success'} className="mt-3 mb-0">
              {data.unpaidTotal > 0
                ? `Độc giả ${filters.readerCode} còn nợ ${formatMoney(data.unpaidTotal)}, đang bị chặn mượn mới.`
                : `Độc giả ${filters.readerCode} không còn khoản phạt chưa thu.`}
            </Alert>
          )}
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
            <p className="text-secondary text-center py-5 mb-0">Không có khoản phạt nào.</p>
          ) : (
            data && (
              <Table hover responsive className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Độc giả</th>
                    <th>Sách</th>
                    <th>Phiếu</th>
                    <th>Hạn trả</th>
                    <th>Ngày trả</th>
                    <th className="text-end">Trễ</th>
                    <th className="text-end">Số tiền</th>
                    <th>Trạng thái</th>
                    <th className="text-end">Thao tác</th>
                  </tr>
                </thead>
                <tbody style={{ opacity: loading ? 0.5 : 1 }}>
                  {data.items.map((f) => (
                    <tr key={f.fineId}>
                      <td>
                        <div className="fw-medium">{f.reader.fullName}</div>
                        <div className="small text-secondary">{f.reader.readerCode}</div>
                      </td>
                      <td>
                        <div>{f.title}</div>
                        <div className="small text-secondary">{f.copyCode}</div>
                      </td>
                      <td>{f.ticketCode}</td>
                      <td>{formatDate(f.dueDate)}</td>
                      <td>{formatDate(f.returnDate)}</td>
                      <td className="text-end">{f.lateDays} ngày</td>
                      <td className="text-end fw-medium">{formatMoney(f.amount)}</td>
                      <td>
                        <StatusBadge type="fine" value={f.status} />
                        {f.paidAt && <div className="small text-secondary">{formatDateTime(f.paidAt)}</div>}
                      </td>
                      <td className="text-end text-nowrap">
                        {f.status === 'UNPAID' ? (
                          <Button size="sm" onClick={() => setPayFine(f)}>
                            Thu phạt
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={openingReceipt === f.fineId}
                            onClick={() => showReceipt(f.fineId)}
                          >
                            {f.receiptCode}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )
          )}
        </Card.Body>
        {data && data.total > 0 && (
          <Card.Footer className="bg-white">
            <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
          </Card.Footer>
        )}
      </Card>

      <PayFineModal fine={payFine} onPaid={handlePaid} onCancel={() => setPayFine(null)} onExited={afterPayClosed} />
      <ReceiptModal receipt={receipt?.data} message={receipt?.message} onClose={() => setReceipt(null)} />
    </>
  );
}
