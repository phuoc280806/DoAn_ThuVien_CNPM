import { useState } from 'react';
import { Alert, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import * as finesApi from '../../api/fines';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import ReceiptModal from '../../components/ReceiptModal';
import { formatDate, formatMoney } from '../../utils/format';
import useMyLoans from './useMyLoans';

function SummaryCard({ icon, label, value, note }) {
  return (
    <Card className="h-100">
      <Card.Body className="d-flex align-items-center gap-3">
        <div className="icon-tile">
          <i className={`bi bi-${icon}`} />
        </div>
        <div>
          <div className="small text-secondary">{label}</div>
          <div className="fs-4 fw-semibold">{value}</div>
          {note && <div className="small text-secondary">{note}</div>}
        </div>
      </Card.Body>
    </Card>
  );
}

// UC012 – Các khoản phạt trả trễ của chính độc giả, xem / in biên lai khoản đã nộp
export default function MyFinesPage() {
  const toast = useToast();
  const { data, loading, error } = useMyLoans();
  const [receipt, setReceipt] = useState(null);
  const [opening, setOpening] = useState(null);

  const fines = (data?.items ?? []).filter((i) => i.fineAmount > 0);
  const paid = fines.filter((f) => f.fineStatus === 'PAID');
  const paidTotal = paid.reduce((sum, f) => sum + f.fineAmount, 0);

  async function showReceipt(fineId) {
    setOpening(fineId);
    try {
      const body = await finesApi.getReceipt(fineId);
      setReceipt(body.data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setOpening(null);
    }
  }

  return (
    <>
      <PageHeader title="Tiền phạt" />

      {error && <Alert variant="danger">{error}</Alert>}

      {data && (
        <>
          <Row xs={1} md={2} className="g-3 mb-4">
            <Col>
              <SummaryCard
                icon="exclamation-circle"
                label="Chưa nộp"
                value={formatMoney(data.unpaidTotal)}
                note={`${fines.length - paid.length} khoản`}
              />
            </Col>
            <Col>
              <SummaryCard icon="check2-circle" label="Đã nộp" value={formatMoney(paidTotal)} note={`${paid.length} khoản`} />
            </Col>
          </Row>
          <Alert variant={data.unpaidTotal > 0 ? 'warning' : 'info'} className="small">
            <i className="bi bi-info-circle me-2" />
            Tiền phạt nộp trực tiếp tại quầy thủ thư; hệ thống ghi nhận và cấp biên lai điện tử.
            {data.unpaidTotal > 0 && ' Bạn sẽ bị chặn mượn sách mới đến khi nộp đủ tiền phạt.'}
          </Alert>
        </>
      )}

      <Card>
        <Card.Body className="p-0">
          {loading && !data ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : fines.length === 0 ? (
            <p className="text-secondary text-center py-5 mb-0">Bạn không có khoản phạt nào.</p>
          ) : (
            <Table hover responsive className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Sách</th>
                  <th>Phiếu</th>
                  <th>Hạn trả</th>
                  <th>Ngày trả</th>
                  <th className="text-end">Trễ</th>
                  <th className="text-end">Số tiền</th>
                  <th>Trạng thái</th>
                  <th className="text-end">Biên lai</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.borrowDetailId}>
                    <td>
                      <div className="fw-medium">{f.title}</div>
                      <div className="small text-secondary">{f.copyCode}</div>
                    </td>
                    <td>{f.ticketCode}</td>
                    <td>{formatDate(f.dueDate)}</td>
                    <td>{formatDate(f.returnDate)}</td>
                    <td className="text-end">{f.lateDays} ngày</td>
                    <td className="text-end fw-medium">{formatMoney(f.fineAmount)}</td>
                    <td>
                      <StatusBadge type="fine" value={f.fineStatus} />
                    </td>
                    <td className="text-end">
                      {f.fineStatus === 'PAID' ? (
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          disabled={opening === f.fineId}
                          onClick={() => showReceipt(f.fineId)}
                        >
                          {f.receiptCode}
                        </Button>
                      ) : (
                        <span className="small text-secondary">Nộp tại quầy</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />
    </>
  );
}
