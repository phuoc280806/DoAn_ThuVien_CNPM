import { useState } from 'react';
import { Alert, Button, Card, Spinner, Table } from 'react-bootstrap';
import * as meApi from '../../api/me';
import PageHeader from '../../components/PageHeader';
import TicketDetailModal from '../../components/TicketDetailModal';
import { formatDate, formatMoney } from '../../utils/format';
import useMyLoans from './useMyLoans';
import { DUE_SOON_DAYS, DueNote, LoanStatusBadge, isDueSoon, isOpen } from './loanStatus';

// UC012 – Sách đang mượn của chính độc giả, kèm cảnh báo sắp đến hạn / quá hạn
export default function MyLoansPage() {
  const { data, loading, error } = useMyLoans();
  const [selected, setSelected] = useState(null);

  const items = (data?.items ?? []).filter(isOpen).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  const overdue = items.filter((i) => i.status === 'OVERDUE');
  const dueSoon = items.filter(isDueSoon);

  return (
    <>
      <PageHeader title="Sách đang mượn" subtitle="UC012 · Theo dõi hạn trả của các cuốn bạn đang giữ" />

      {error && <Alert variant="danger">{error}</Alert>}

      {overdue.length > 0 && (
        <Alert variant="danger">
          <i className="bi bi-exclamation-octagon me-2" />
          Bạn có <strong>{overdue.length}</strong> cuốn sách quá hạn. Hãy trả sách và nộp phạt (nếu có) tại quầy để được
          mượn sách mới.
        </Alert>
      )}
      {data?.unpaidTotal > 0 && (
        <Alert variant="warning">
          <i className="bi bi-cash-coin me-2" />
          Bạn còn nợ phạt <strong>{formatMoney(data.unpaidTotal)}</strong> chưa nộp, sẽ bị chặn mượn sách mới đến khi nộp
          phạt tại quầy.
        </Alert>
      )}
      {dueSoon.length > 0 && (
        <Alert variant="warning">
          <i className="bi bi-alarm me-2" />
          Có <strong>{dueSoon.length}</strong> cuốn sắp đến hạn trả (còn không quá {DUE_SOON_DAYS} ngày).
        </Alert>
      )}

      <Card>
        <Card.Body className="p-0">
          {loading && !data ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-secondary text-center py-5 mb-0">Bạn không có cuốn sách nào đang mượn.</p>
          ) : (
            <Table hover responsive className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Sách</th>
                  <th>Phiếu</th>
                  <th>Ngày mượn</th>
                  <th>Hạn trả</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.borrowDetailId}>
                    <td>
                      <div className="fw-medium">{i.title}</div>
                      <div className="small text-secondary">{i.copyCode}</div>
                    </td>
                    <td>
                      <Button variant="link" className="p-0" onClick={() => setSelected(i.borrowId)}>
                        {i.ticketCode}
                      </Button>
                    </td>
                    <td>{formatDate(i.borrowDate)}</td>
                    <td>
                      {formatDate(i.dueDate)}
                      {i.renewCount > 0 && <div className="small text-secondary">Đã gia hạn {i.renewCount} lần</div>}
                      <div>
                        <DueNote item={i} />
                      </div>
                    </td>
                    <td>
                      <LoanStatusBadge item={i} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <p className="small text-secondary mt-3 mb-0">
        <i className="bi bi-info-circle me-1" />
        Muốn gia hạn, hãy mang sách đến quầy thư viện: mỗi cuốn được gia hạn 1 lần khi chưa quá hạn. Tiền phạt trả trễ do
        thủ thư tính khi nhận sách.
      </p>

      <TicketDetailModal borrowId={selected} load={meApi.getMyTicket} onClose={() => setSelected(null)} />
    </>
  );
}
