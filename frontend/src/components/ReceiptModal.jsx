import { useState } from 'react';
import { Alert, Button, Modal } from 'react-bootstrap';
import { formatDateTime, formatMoney } from '../utils/format';

/**
 * Biên lai thu tiền phạt (UC011 bước 6), in bằng trình duyệt.
 * receipt: dữ liệu từ POST /fines/:id/pay (data.receipt) hoặc GET /fines/:id/receipt (data).
 * message: câu thông báo kèm theo (vd. độc giả còn nợ), không in ra.
 */
export default function ReceiptModal({ receipt: current, message, onClose }) {
  // Giữ nội dung trong lúc modal đang mờ dần sau khi đóng
  const [receipt, setReceipt] = useState(current);
  if (current && current !== receipt) setReceipt(current);

  return (
    <Modal show={!!current} onHide={onClose} centered className="print-modal">
      <Modal.Header closeButton className="d-print-none">
        <Modal.Title as="h2" className="h5">Biên lai điện tử</Modal.Title>
      </Modal.Header>
      {receipt && (
        <Modal.Body>
          {message && (
            <Alert variant="info" className="d-print-none small">
              {message}
            </Alert>
          )}
          <div className="text-center mb-4">
            <div className="small text-secondary">THƯ VIỆN TRƯỜNG THPT</div>
            <div className="h5 mb-0 mt-1">BIÊN LAI THU TIỀN PHẠT</div>
            <div className="small text-secondary">Số: {receipt.receiptCode}</div>
          </div>
          <table className="table table-sm small mb-4">
            <tbody>
              <tr><th className="fw-normal text-secondary w-50">Độc giả</th><td>{receipt.reader.fullName} ({receipt.reader.readerCode})</td></tr>
              <tr><th className="fw-normal text-secondary">Phiếu mượn</th><td>{receipt.ticketCode}</td></tr>
              <tr><th className="fw-normal text-secondary">Sách</th><td>{receipt.title} ({receipt.copyCode})</td></tr>
              <tr><th className="fw-normal text-secondary">Số ngày trễ</th><td>{receipt.lateDays} ngày</td></tr>
              <tr><th className="fw-normal text-secondary">Thời điểm thu</th><td>{formatDateTime(receipt.paidAt)}</td></tr>
              <tr><th className="fw-normal text-secondary">Người thu</th><td>{receipt.collectedBy.fullName} ({receipt.collectedBy.username})</td></tr>
            </tbody>
          </table>
          <div className="money-box">
            <div className="small text-secondary">Số tiền đã thu</div>
            <div className="fs-3 fw-semibold">{formatMoney(receipt.amount)}</div>
          </div>
        </Modal.Body>
      )}
      <Modal.Footer className="d-print-none">
        <Button variant="outline-secondary" onClick={() => window.print()}>
          <i className="bi bi-printer me-2" />
          In biên lai
        </Button>
        <Button onClick={onClose}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  );
}
