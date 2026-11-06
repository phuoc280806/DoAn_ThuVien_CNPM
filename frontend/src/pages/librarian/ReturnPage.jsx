import { useRef, useState } from 'react';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import * as returnsApi from '../../api/returns';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import ScanInput from '../../components/ScanInput';
import QuickPicks from '../../components/QuickPicks';
import Field from '../../components/Field';
import ConfirmModal from '../../components/ConfirmModal';
import PayFineModal from '../../components/PayFineModal';
import ReceiptModal from '../../components/ReceiptModal';
import { statusLabel } from '../../components/StatusBadge';
import { formatDate, formatMoney, todayVN } from '../../utils/format';

// Dữ liệu trong database/seed.sql
const COPY_PICKS = [
  ['BS000010', 'đúng hạn'],
  ['BS000013', 'trễ 5 ngày'],
  ['BS000016', 'trễ 45 ngày'],
  ['BS000022', 'giáo viên'],
  ['BS000005', 'không đang mượn'],
];

const CONDITIONS = ['GOOD', 'DAMAGED', 'LOST'];
const NOTE_REQUIRED = 'Cần nhập ghi chú khi sách bị hư hỏng hoặc mất';

// Dòng giải thích cách tính phạt theo snapshot của phiếu (UC010)
function FineExplain({ item }) {
  if (item.onTime) {
    return (
      <Alert variant="success" className="mb-0">
        <i className="bi bi-check-circle me-2" />
        Trả đúng hạn, không phát sinh tiền phạt.
      </Alert>
    );
  }
  const { finePerDay, maxFinePerBook } = item.snapshot;
  const capped = item.lateDays * finePerDay > maxFinePerBook;
  return (
    <Alert variant="warning" className="mb-0">
      <i className="bi bi-exclamation-triangle me-2" />
      Trả trễ <strong>{item.lateDays} ngày</strong>. Tiền phạt = min({item.lateDays} × {formatMoney(finePerDay)},{' '}
      {formatMoney(maxFinePerBook)}) = <strong>{formatMoney(item.fineAmount)}</strong>
      {capped && ' (đã áp mức tối đa)'}.
    </Alert>
  );
}

// UC009 – Trả sách, UC010 – Tính tiền phạt; có phạt thì chuyển sang UC011 – Thu tiền phạt
export default function ReturnPage() {
  const toast = useToast();
  const inputRef = useRef(null);
  const afterConfirm = useRef(null);
  const pendingReceipt = useRef(null);

  const [code, setCode] = useState('');
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState('');
  const [item, setItem] = useState(null);

  const [condition, setCondition] = useState('GOOD');
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [payFine, setPayFine] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [recent, setRecent] = useState([]);

  function clearItem() {
    setItem(null);
    setCondition('GOOD');
    setNote('');
    setNoteError('');
    setSubmitError('');
  }

  async function find(copyCode) {
    setCode(copyCode);
    setFinding(true);
    setFindError('');
    clearItem();
    try {
      const body = await returnsApi.lookupReturn(copyCode);
      setItem(body.data);
    } catch (err) {
      setFindError(errorMessage(err));
    } finally {
      setFinding(false);
    }
  }

  function askConfirm() {
    if (condition !== 'GOOD' && !note.trim()) {
      setNoteError(NOTE_REQUIRED);
      return;
    }
    setNoteError('');
    setConfirming(true);
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const body = await returnsApi.returnCopy({ copyCode: item.copyCode, condition, note: note.trim() || undefined });
      const r = body.data;
      toast.success(body.message);
      setRecent((list) => [{ ...r, paid: false }, ...list]);
      // Có phạt thì mở modal thu phạt sau khi hộp xác nhận đóng hẳn (afterConfirmClosed)
      afterConfirm.current = {
        fine: r.fine && {
          fineId: r.fine.fineId,
          amount: r.fine.amount,
          lateDays: r.fine.lateDays,
          reader: r.reader,
          title: r.book.title,
          copyCode: r.copyCode,
          ticketCode: r.ticketCode,
        },
      };
      setConfirming(false);
    } catch (err) {
      setConfirming(false);
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  // Hộp xác nhận đã đóng hẳn: nếu vừa trả xong thì dọn form, mở thu phạt (nếu có)
  function afterConfirmClosed() {
    const done = afterConfirm.current;
    afterConfirm.current = null;
    if (!done) return;
    clearItem();
    setCode('');
    if (done.fine) setPayFine(done.fine);
    else inputRef.current?.focus();
  }

  function handlePaid(body) {
    toast.success(body.message);
    setRecent((list) => list.map((x) => (x.fine?.fineId === payFine.fineId ? { ...x, paid: true } : x)));
    pendingReceipt.current = { data: body.data.receipt, message: body.message };
    setPayFine(null);
  }

  function skipPay() {
    setPayFine(null);
    toast.warning('Khoản phạt giữ trạng thái “Chưa thu”, độc giả bị chặn mượn mới đến khi nộp phạt');
  }

  // Modal thu phạt đã đóng hẳn: mở biên lai nếu vừa thu, không thì quay lại ô quét mã
  function afterPayClosed() {
    if (pendingReceipt.current) {
      setReceipt(pendingReceipt.current);
      pendingReceipt.current = null;
    } else {
      inputRef.current?.focus();
    }
  }

  return (
    <>
      <PageHeader title="Trả sách" />

      <Row className="g-4">
        <Col xl={8} className="d-flex flex-column gap-4">
          <Card>
            <Card.Header className="fw-semibold">Mã bản sách</Card.Header>
            <Card.Body>
              <ScanInput
                id="return-copy"
                inputRef={inputRef}
                value={code}
                onChange={setCode}
                onSubmit={find}
                placeholder="Quét hoặc nhập mã bản sách, VD: BS000013"
                buttonLabel="Tìm phiếu"
                busy={finding}
                autoFocus
              />
              <QuickPicks items={COPY_PICKS} onPick={find} disabled={finding} />
              {findError && (
                <Alert variant="danger" className="mt-3 mb-0">
                  {findError}
                </Alert>
              )}
            </Card.Body>
          </Card>

          {item && (
            <Card>
              <Card.Header className="fw-semibold">Thông tin phiếu mượn</Card.Header>
              <Card.Body>
                <div className="row g-3 mb-3">
                  <Field label="Độc giả">
                    {item.reader.fullName} ({item.reader.readerCode})
                  </Field>
                  <Field label="Sách">
                    {item.book.title} ({item.copyCode})
                  </Field>
                  <Field label="Phiếu mượn">{item.ticketCode}</Field>
                  <Field label="Ngày mượn">{formatDate(item.borrowDate)}</Field>
                  <Field label="Hạn trả (theo phiếu)">{formatDate(item.dueDate)}</Field>
                  <Field label="Ngày trả (hôm nay)">{formatDate(todayVN())}</Field>
                </div>

                <FineExplain item={item} />

                <fieldset className="mt-4">
                  <legend className="small fw-medium mb-2" style={{ fontSize: '0.875rem' }}>
                    Tình trạng sách khi trả
                  </legend>
                  {CONDITIONS.map((c) => (
                    <Form.Check
                      key={c}
                      inline
                      type="radio"
                      id={`cond-${c}`}
                      name="condition"
                      label={statusLabel('condition', c)}
                      checked={condition === c}
                      onChange={() => {
                        setCondition(c);
                        setNoteError('');
                      }}
                    />
                  ))}
                </fieldset>

                {condition !== 'GOOD' && (
                  <Form.Group className="mt-3" controlId="return-note">
                    <Form.Label className="small fw-medium">Ghi chú mô tả (bắt buộc)</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      maxLength={255}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      isInvalid={!!noteError}
                    />
                    <Form.Control.Feedback type="invalid">{noteError}</Form.Control.Feedback>
                    <Form.Text>Hệ thống chỉ ghi nhận tình trạng; việc bồi thường xử lý ngoài hệ thống.</Form.Text>
                  </Form.Group>
                )}

                {submitError && (
                  <Alert variant="danger" className="mt-3 mb-0">
                    {submitError}
                  </Alert>
                )}

                <div className="d-flex justify-content-end gap-2 mt-4">
                  <Button
                    variant="outline-secondary"
                    onClick={() => {
                      clearItem();
                      setCode('');
                      inputRef.current?.focus();
                    }}
                  >
                    Hủy
                  </Button>
                  <Button onClick={askConfirm}>
                    <i className="bi bi-check-lg me-2" />
                    Xác nhận trả
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col xl={4}>
          <Card>
            <Card.Header className="fw-semibold">Đã xử lý trong phiên</Card.Header>
            <Card.Body className="py-2">
              {recent.length === 0 ? (
                <p className="text-secondary small text-center py-3 mb-0">Sách đã trả sẽ hiện ở đây.</p>
              ) : (
                recent.slice(0, 8).map((r) => (
                  <div key={r.borrowDetailId} className="py-2 border-bottom small">
                    <div className="fw-medium">
                      {r.book.title} <span className="text-secondary">({r.copyCode})</span>
                    </div>
                    <div className="text-secondary">
                      {r.reader.fullName} · {statusLabel('condition', r.condition)} ·{' '}
                      {r.fine ? (
                        <span className={r.paid ? 'text-success' : 'text-warning-emphasis'}>
                          Phạt {formatMoney(r.fineAmount)} – {r.paid ? 'đã thu' : 'chưa thu'}
                        </span>
                      ) : (
                        'Đúng hạn'
                      )}
                      {r.ticketCompleted && ` · ${r.ticketCode} đã hoàn tất`}
                    </div>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <ConfirmModal
        show={confirming}
        title="Xác nhận trả sách"
        confirmLabel="Xác nhận trả"
        busy={submitting}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
        onExited={afterConfirmClosed}
      >
        {item && (
          <>
            Ghi nhận trả “{item.book.title}” ({item.copyCode}), tình trạng{' '}
            <strong>{statusLabel('condition', condition)}</strong>. Tiền phạt:{' '}
            <strong>{formatMoney(item.fineAmount)}</strong>.
          </>
        )}
      </ConfirmModal>

      <PayFineModal fine={payFine} fromReturn onPaid={handlePaid} onCancel={skipPay} onExited={afterPayClosed} />
      <ReceiptModal receipt={receipt?.data} message={receipt?.message} onClose={() => setReceipt(null)} />
    </>
  );
}
