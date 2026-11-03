import { useState } from 'react';
import { Alert, Button, Modal, Spinner } from 'react-bootstrap';
import * as finesApi from '../api/fines';
import { errorMessage } from '../api/client';
import { formatMoney } from '../utils/format';
import Field from './Field';

/**
 * Thu tiền phạt (UC011). Bấm "Đã thu" thì gọi API, xong trả kết quả qua onPaid(body)
 * với body.data = { receipt, remainingUnpaid } để hiện biên lai.
 *
 * fine: { fineId, amount, lateDays, reader: { fullName, readerCode }, title, copyCode, ticketCode }
 * fromReturn: mở ngay sau khi trả sách → nút hủy là "Để sau"
 * onExited: modal đã đóng hẳn — lúc này mới mở biên lai để hai modal không chồng lên nhau
 */
export default function PayFineModal({ fine: current, fromReturn = false, onPaid, onCancel, onExited }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // Giữ nội dung trong lúc modal đang mờ dần sau khi đóng
  const [fine, setFine] = useState(current);
  if (current && current !== fine) setFine(current);

  async function pay() {
    setBusy(true);
    setError('');
    try {
      const body = await finesApi.payFine(fine.fineId);
      onPaid(body);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setError('');
    onCancel();
  }

  return (
    <Modal show={!!current} onHide={busy ? undefined : close} onExited={onExited} centered>
      <Modal.Header closeButton={!busy}>
        <Modal.Title as="h2" className="h5">Thu tiền phạt</Modal.Title>
      </Modal.Header>
      {fine && (
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          <div className="row g-3 mb-4">
            <Field label="Độc giả">{fine.reader.fullName} ({fine.reader.readerCode})</Field>
            <Field label="Phiếu mượn">{fine.ticketCode}</Field>
            <Field label="Sách">{fine.title} ({fine.copyCode})</Field>
            <Field label="Số ngày trễ">{fine.lateDays} ngày</Field>
          </div>
          <div className="money-box">
            <div className="small text-secondary">Số tiền cần thu</div>
            <div className="fs-2 fw-semibold">{formatMoney(fine.amount)}</div>
          </div>
          <p className="small text-secondary mt-3 mb-0">
            Nhận đủ tiền mặt từ độc giả rồi bấm “Đã thu”. Hệ thống tạo biên lai điện tử và gỡ chặn mượn nếu độc giả hết nợ.
          </p>
        </Modal.Body>
      )}
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={close} disabled={busy}>
          {fromReturn ? 'Để sau' : 'Hủy'}
        </Button>
        <Button onClick={pay} disabled={busy}>
          {busy && <Spinner animation="border" size="sm" className="me-2" />}
          Đã thu
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
