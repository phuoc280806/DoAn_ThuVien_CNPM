import { useState } from 'react';
import { Alert, Button, Card, Table } from 'react-bootstrap';
import * as loansApi from '../../api/loans';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import ScanInput from '../../components/ScanInput';
import QuickPicks from '../../components/QuickPicks';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import { diffDays, formatDate } from '../../utils/format';

// Dữ liệu trong database/seed.sql
const PICKS = [
  ['HS2026003', 'gia hạn được'],
  ['GV2026001', 'giáo viên'],
  ['HS2026008', 'đã gia hạn 1 lần'],
  ['HS2026004', 'quá hạn'],
  ['BS000010', 'theo mã bản sách'],
];

// Mã bản sách dạng BS000001; còn lại coi là mã độc giả
const isCopyCode = (code) => /^BS\d+$/.test(code);

// UC008 – Gia hạn mượn (thủ thư gia hạn trực tiếp tại quầy)
export default function RenewPage() {
  const toast = useToast();
  const [code, setCode] = useState('');
  const [searched, setSearched] = useState('');
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [renewing, setRenewing] = useState(false);

  // keepList: tìm lại sau khi gia hạn, giữ bảng cũ trong lúc chờ để không bị nháy
  async function search(value, { keepList } = {}) {
    setCode(value);
    setBusy(true);
    setError('');
    if (!keepList) setItems(null);
    try {
      const params = isCopyCode(value) ? { copyCode: value } : { readerCode: value };
      const body = await loansApi.listActiveItems(params);
      setItems(body.data);
      setSearched(value);
    } catch (err) {
      setItems(null);
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function renew() {
    setRenewing(true);
    try {
      const body = await loansApi.renewItem(selected.borrowDetailId);
      toast.success(body.message);
      setSelected(null);
      await search(searched, { keepList: true });
    } catch (err) {
      toast.error(errorMessage(err));
      setSelected(null);
    } finally {
      setRenewing(false);
    }
  }

  const extraDays = (i) => diffDays(i.dueDate, i.newDueDate);

  return (
    <>
      <PageHeader title="Gia hạn" />

      <Card className="mb-4">
        <Card.Header className="fw-semibold">Tìm sách đang mượn</Card.Header>
        <Card.Body>
          <ScanInput
            id="renew-code"
            value={code}
            onChange={setCode}
            onSubmit={search}
            placeholder="Mã độc giả (VD: HS2026003) hoặc mã bản sách (VD: BS000010)"
            busy={busy}
            autoFocus
          />
          <QuickPicks items={PICKS} onPick={search} disabled={busy} />
          {error && (
            <Alert variant="danger" className="mt-3 mb-0">
              {error}
            </Alert>
          )}
        </Card.Body>
      </Card>

      {items && (
        <Card>
          <Card.Body className="p-0">
            <Table hover responsive className="align-middle mb-0">
              <thead>
                <tr>
                  <th>Sách</th>
                  <th>Phiếu</th>
                  <th>Độc giả</th>
                  <th>Ngày mượn</th>
                  <th>Hạn trả</th>
                  <th>Đã gia hạn</th>
                  <th className="text-end">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.borrowDetailId}>
                    <td>
                      <div className="fw-medium">{i.book.title}</div>
                      <div className="small text-secondary">{i.copyCode}</div>
                    </td>
                    <td>{i.ticketCode}</td>
                    <td>{i.readerCode ?? searched}</td>
                    <td>{formatDate(i.borrowDate)}</td>
                    <td>
                      {formatDate(i.dueDate)} {i.isOverdue && <StatusBadge type="due" value="OVERDUE" />}
                    </td>
                    <td>{i.renewCount} lần</td>
                    <td className="text-end">
                      {i.canRenew ? (
                        <Button size="sm" onClick={() => setSelected(i)}>
                          Gia hạn +{extraDays(i)} ngày
                        </Button>
                      ) : (
                        <span className="small text-danger">{i.renewBlockedReason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      <ConfirmModal
        show={!!selected}
        title="Gia hạn trực tiếp"
        confirmLabel="Xác nhận gia hạn"
        busy={renewing}
        onConfirm={renew}
        onCancel={() => setSelected(null)}
      >
        {selected && (
          <>
            Gia hạn “{selected.book.title}” ({selected.copyCode}): {formatDate(selected.dueDate)} →{' '}
            <strong>{formatDate(selected.newDueDate)}</strong> (+{extraDays(selected)} ngày theo quy định lưu trên phiếu)?
            <div className="small text-secondary mt-2">Mỗi cuốn chỉ được gia hạn 1 lần.</div>
          </>
        )}
      </ConfirmModal>
    </>
  );
}
