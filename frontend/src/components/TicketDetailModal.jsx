import { useEffect, useState } from 'react';
import { Alert, Button, Modal, Spinner, Table } from 'react-bootstrap';
import * as loansApi from '../api/loans';
import { errorMessage } from '../api/client';
import { formatDate, formatDateTime, formatMoney } from '../utils/format';
import { READER_TYPE_LABELS } from '../utils/roles';
import { snapshotText } from '../utils/regulation';
import Field from './Field';
import StatusBadge from './StatusBadge';

/**
 * Chi tiết một phiếu mượn kèm snapshot quy định lưu lúc lập phiếu (GET /loans/:id, Thủ thư / Admin).
 *
 *   <TicketDetailModal borrowId={selectedId} onClose={() => setSelectedId(null)} />
 */
export default function TicketDetailModal({ borrowId, onClose }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!borrowId) return;
    let cancelled = false;
    setTicket(null);
    setError('');
    loansApi
      .getLoan(borrowId)
      .then((body) => !cancelled && setTicket(body.data))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [borrowId]);

  return (
    <Modal show={!!borrowId} onHide={onClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="h5">
          Chi tiết phiếu {ticket?.ticketCode ?? ''}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {!ticket && !error && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        )}
        {ticket && (
          <>
            <div className="row g-3 mb-3">
              <Field label="Độc giả">
                {ticket.reader.fullName} ({ticket.reader.readerCode}) · {READER_TYPE_LABELS[ticket.reader.readerType]}
              </Field>
              <Field label="Thủ thư lập phiếu">{ticket.librarian.fullName}</Field>
              <Field label="Ngày lập">{formatDate(ticket.borrowDate)}</Field>
              <Field label="Trạng thái">
                <StatusBadge type="ticket" value={ticket.status} />
                {ticket.completedAt && <span className="small text-secondary ms-2">{formatDateTime(ticket.completedAt)}</span>}
              </Field>
            </div>
            <div className="money-box text-start small mb-3">
              <strong>Snapshot quy định lưu trên phiếu</strong> (phiên bản #{ticket.snapshot.regulationId}):{' '}
              {snapshotText(ticket.snapshot)}. Quy định đổi sau này không làm thay đổi phiếu này.
            </div>
            <Table size="sm" responsive className="small align-middle mb-0">
              <thead>
                <tr>
                  <th>Mã bản</th>
                  <th>Tên sách</th>
                  <th>Hạn trả</th>
                  <th>Ngày trả</th>
                  <th>Tình trạng</th>
                  <th className="text-end">Trễ</th>
                  <th className="text-end">Tiền phạt</th>
                </tr>
              </thead>
              <tbody>
                {ticket.items.map((i) => (
                  <tr key={i.borrowDetailId}>
                    <td>{i.copyCode}</td>
                    <td>{i.book.title}</td>
                    <td>
                      {formatDate(i.dueDate)}
                      {i.renewCount > 0 && <span className="text-secondary"> (đã gia hạn)</span>}{' '}
                      {!i.returnDate && i.isOverdue && <StatusBadge type="due" value="OVERDUE" />}
                    </td>
                    <td>{i.returnDate ? formatDate(i.returnDate) : <span className="text-secondary">Chưa trả</span>}</td>
                    <td>{i.returnCondition ? <StatusBadge type="condition" value={i.returnCondition} /> : '—'}</td>
                    <td className="text-end">{i.returnDate ? `${i.lateDays} ngày` : '—'}</td>
                    <td className="text-end">{i.returnDate ? formatMoney(i.fineAmount) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  );
}
