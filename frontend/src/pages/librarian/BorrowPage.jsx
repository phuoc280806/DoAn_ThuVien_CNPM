import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import * as loansApi from '../../api/loans';
import * as copiesApi from '../../api/copies';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import ScanInput from '../../components/ScanInput';
import QuickPicks from '../../components/QuickPicks';
import StatusBadge from '../../components/StatusBadge';
import Field from '../../components/Field';
import { addDays, formatDate, formatMoney, initialsOf, todayVN } from '../../utils/format';
import { READER_TYPE_LABELS } from '../../utils/roles';
import { snapshotText } from '../../utils/regulation';

// Dữ liệu trong database/seed.sql
const READER_PICKS = [
  ['HS2026001', 'đủ điều kiện'],
  ['GV2026003', 'giáo viên'],
  ['HS2026002', 'đã mượn 3/3'],
  ['HS2026004', 'quá hạn'],
  ['HS2026005', 'nợ phạt'],
  ['HS2026007', 'thẻ hết hạn'],
];
const COPY_PICKS = [
  ['BS000005', 'khả dụng'],
  ['BS000040', 'khả dụng'],
  ['BS000046', 'khả dụng'],
  ['BS000001', 'đang mượn'],
  ['BS000037', 'hư hỏng'],
];

// Giống câu báo lỗi của backend khi lập phiếu (UC007 8b)
const UNAVAILABLE = { BORROWED: 'đang được mượn', DAMAGED: 'bị hư hỏng', LOST: 'đã mất' };

function ReaderPanel({ elig }) {
  const { reader } = elig;
  const group = reader.className || reader.department;
  return (
    <>
      <div className="d-flex flex-wrap align-items-center gap-3 p-3 rounded border bg-body-tertiary mb-3">
        <div className="avatar" style={{ width: 44, height: 44 }}>{initialsOf(reader.fullName)}</div>
        <div className="flex-grow-1">
          <div className="fw-semibold">{reader.fullName}</div>
          <div className="small text-secondary">
            {reader.readerCode} · {READER_TYPE_LABELS[reader.readerType]}
            {group ? ` · ${group}` : ''}
          </div>
        </div>
        <StatusBadge type="card" value={reader.cardStatus} />
        <div className="text-end small">
          <div>
            Đang mượn <strong>{elig.holding}/{elig.maxBooks ?? '?'}</strong>
          </div>
          <div className="text-secondary">Nợ phạt {formatMoney(elig.unpaidTotal)}</div>
        </div>
      </div>

      {elig.eligible ? (
        <Alert variant="success" className="mb-0">
          <i className="bi bi-check-circle me-2" />
          Đủ điều kiện mượn. {elig.summary}.
        </Alert>
      ) : (
        <Alert variant="danger" className="mb-0">
          <div className="fw-semibold mb-1">
            <i className="bi bi-x-circle me-2" />
            Không thể lập phiếu mượn
          </div>
          <ul className="mb-0 ps-4">
            {elig.problems.map((p) => (
              <li key={p.code}>{p.message}</li>
            ))}
          </ul>
        </Alert>
      )}

      {elig.borrowing.length > 0 && (
        <div className="mt-3">
          <div className="small fw-medium mb-2">Sách đang mượn</div>
          <Table size="sm" responsive className="small mb-0">
            <thead>
              <tr>
                <th>Mã bản</th>
                <th>Tên sách</th>
                <th>Phiếu</th>
                <th>Hạn trả</th>
              </tr>
            </thead>
            <tbody>
              {elig.borrowing.map((i) => (
                <tr key={i.borrowDetailId}>
                  <td>{i.copyCode}</td>
                  <td>{i.book.title}</td>
                  <td>{i.ticketCode}</td>
                  <td>
                    {formatDate(i.dueDate)} {i.isOverdue && <StatusBadge type="due" value="OVERDUE" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}

// Phiếu vừa lập, in được
function TicketResult({ ticket, onNew }) {
  return (
    <>
      <div className="d-print-none">
        <PageHeader title={`Phiếu mượn ${ticket.ticketCode}`} subtitle="Lập phiếu thành công" />
      </div>
      <Card style={{ maxWidth: 720 }}>
        <Card.Body className="p-4">
          <Alert variant="success" className="d-print-none">
            Đã lập phiếu. Các bản sách đã chuyển sang “Đang mượn”.
          </Alert>
          <div className="text-center mb-4">
            <div className="small text-secondary">THƯ VIỆN TRƯỜNG THPT</div>
            <div className="h5 mb-0 mt-1">PHIẾU MƯỢN SÁCH</div>
            <div className="small text-secondary">Số: {ticket.ticketCode}</div>
          </div>
          <div className="row g-3 mb-4">
            <Field label="Độc giả">
              {ticket.reader.fullName} ({ticket.reader.readerCode})
            </Field>
            <Field label="Thủ thư lập phiếu">{ticket.librarian.fullName}</Field>
            <Field label="Ngày lập">{formatDate(ticket.borrowDate)}</Field>
            <Field label="Hạn trả">
              <span className="text-primary">{formatDate(ticket.items[0]?.dueDate)}</span>
            </Field>
            <Field label="Quy định áp dụng (lưu trên phiếu)" className="col-12">
              {snapshotText(ticket.snapshot)}
            </Field>
          </div>
          <Table size="sm" bordered className="small mb-0">
            <thead>
              <tr>
                <th style={{ width: 48 }}>STT</th>
                <th>Mã bản sách</th>
                <th>Tên sách</th>
                <th>Hạn trả</th>
              </tr>
            </thead>
            <tbody>
              {ticket.items.map((i, idx) => (
                <tr key={i.borrowDetailId}>
                  <td>{idx + 1}</td>
                  <td>{i.copyCode}</td>
                  <td>{i.book.title}</td>
                  <td>{formatDate(i.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="d-flex gap-2 mt-4 d-print-none">
            <Button variant="outline-secondary" onClick={() => window.print()}>
              <i className="bi bi-printer me-2" />
              In phiếu
            </Button>
            <Button onClick={onNew}>
              <i className="bi bi-plus-lg me-2" />
              Lập phiếu mới
            </Button>
          </div>
        </Card.Body>
      </Card>
    </>
  );
}

// UC007 – Lập phiếu mượn
export default function BorrowPage() {
  const toast = useToast();
  const copyInputRef = useRef(null);

  const [readerCode, setReaderCode] = useState('');
  const [elig, setElig] = useState(null);
  const [checking, setChecking] = useState(false);
  const [readerError, setReaderError] = useState('');

  const [copyCode, setCopyCode] = useState('');
  const [items, setItems] = useState([]);
  const [adding, setAdding] = useState(false);
  const [copyError, setCopyError] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (elig?.eligible) copyInputRef.current?.focus();
  }, [elig]);

  function reset() {
    setReaderCode('');
    setElig(null);
    setReaderError('');
    setCopyCode('');
    setItems([]);
    setCopyError('');
    setSubmitError('');
    setDone(null);
  }

  async function findReader(code) {
    setReaderCode(code);
    setChecking(true);
    setReaderError('');
    setElig(null);
    setItems([]);
    setCopyError('');
    setSubmitError('');
    try {
      const body = await loansApi.checkEligibility(code);
      setElig(body.data);
    } catch (err) {
      setReaderError(errorMessage(err));
    } finally {
      setChecking(false);
    }
  }

  async function addCopy(code) {
    setCopyCode(code);
    setCopyError('');
    if (items.some((i) => i.copyCode === code)) {
      setCopyError(`Bản sách ${code} bị chọn trùng`);
      return;
    }
    if (items.length >= elig.remaining) {
      setCopyError(`Chỉ còn được mượn ${elig.remaining} cuốn`);
      return;
    }
    setAdding(true);
    try {
      const { data: copy } = await copiesApi.getCopyByCode(code);
      if (copy.status !== 'AVAILABLE') {
        setCopyError(`Bản sách ${copy.copyCode} (${copy.book.title}) ${UNAVAILABLE[copy.status]}, không thể cho mượn`);
        return;
      }
      setItems((list) => [...list, { copyCode: copy.copyCode, title: copy.book.title, status: copy.status }]);
      setCopyCode('');
    } catch (err) {
      setCopyError(err.response?.status === 404 ? `Không tìm thấy bản sách ${code}` : errorMessage(err));
    } finally {
      setAdding(false);
      copyInputRef.current?.focus();
    }
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const body = await loansApi.createLoan(
        elig.reader.readerCode,
        items.map((i) => i.copyCode),
      );
      toast.success(body.message);
      setDone(body.data);
    } catch (err) {
      setSubmitError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (done) return <TicketResult ticket={done} onNew={reset} />;

  const regulation = elig?.regulation;
  const today = todayVN();
  const step = !elig?.eligible ? 1 : items.length === 0 ? 2 : 3;

  return (
    <>
      <PageHeader title="Lập phiếu mượn" />

      <div className="steps mb-4">
        {['Chọn độc giả', 'Chọn bản sách', 'Xác nhận phiếu'].map((label, i) => (
          <div key={label} className={`step ${step >= i + 1 ? 'on' : ''}`}>
            <b>{i + 1}</b>
            {label}
          </div>
        ))}
      </div>

      <Row className="g-4">
        <Col xl={8} className="d-flex flex-column gap-4">
          <Card>
            <Card.Header className="fw-semibold">1. Độc giả</Card.Header>
            <Card.Body>
              <ScanInput
                id="borrow-reader"
                value={readerCode}
                onChange={setReaderCode}
                onSubmit={findReader}
                placeholder="Quét hoặc nhập mã độc giả, VD: HS2026001"
                busy={checking}
                autoFocus
              />
              <QuickPicks items={READER_PICKS} onPick={findReader} disabled={checking} />
              {readerError && (
                <Alert variant="danger" className="mt-3 mb-0">
                  {readerError}
                </Alert>
              )}
              {elig && (
                <div className="mt-3">
                  <ReaderPanel elig={elig} />
                </div>
              )}
            </Card.Body>
          </Card>

          {elig?.eligible && (
            <Card>
              <Card.Header className="fw-semibold">2. Bản sách</Card.Header>
              <Card.Body>
                <ScanInput
                  id="borrow-copy"
                  inputRef={copyInputRef}
                  value={copyCode}
                  onChange={setCopyCode}
                  onSubmit={addCopy}
                  placeholder="Quét hoặc nhập mã bản sách, VD: BS000005"
                  buttonLabel="Thêm"
                  icon="plus-lg"
                  busy={adding}
                />
                <QuickPicks items={COPY_PICKS} onPick={addCopy} disabled={adding} />
                {copyError && (
                  <Alert variant="danger" className="mt-3 mb-0">
                    {copyError}
                  </Alert>
                )}
                <div className="mt-3">
                  {items.length === 0 ? (
                    <p className="text-secondary small text-center py-3 mb-0">
                      Chưa chọn bản sách nào. Quét hoặc nhập mã bản sách để thêm vào phiếu.
                    </p>
                  ) : (
                    <Table responsive className="align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Mã bản</th>
                          <th>Tên sách</th>
                          <th>Tình trạng</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((i) => (
                          <tr key={i.copyCode}>
                            <td>{i.copyCode}</td>
                            <td>{i.title}</td>
                            <td>
                              <StatusBadge type="copy" value={i.status} />
                            </td>
                            <td className="text-end">
                              <Button
                                variant="link"
                                size="sm"
                                className="text-danger"
                                aria-label={`Bỏ ${i.copyCode} khỏi phiếu`}
                                onClick={() => setItems((list) => list.filter((x) => x.copyCode !== i.copyCode))}
                              >
                                <i className="bi bi-x-lg" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>

        <Col xl={4}>
          <Card className="position-sticky" style={{ top: 88 }}>
            <Card.Header className="fw-semibold">3. Phiếu mượn tạm</Card.Header>
            <Card.Body>
              {!elig?.eligible ? (
                <p className="text-secondary small mb-0">Chọn độc giả đủ điều kiện để lập phiếu.</p>
              ) : (
                <>
                  <dl className="row small mb-0">
                    <dt className="col-5 fw-normal text-secondary">Độc giả</dt>
                    <dd className="col-7 text-end">{elig.reader.fullName}</dd>
                    <dt className="col-5 fw-normal text-secondary">Số cuốn</dt>
                    <dd className="col-7 text-end">
                      {items.length} / còn được mượn {elig.remaining}
                    </dd>
                    <dt className="col-5 fw-normal text-secondary">Ngày lập</dt>
                    <dd className="col-7 text-end">{formatDate(today)}</dd>
                    <dt className="col-5 fw-normal text-secondary">Hạn trả</dt>
                    <dd className="col-7 text-end fw-semibold">{formatDate(addDays(today, regulation.borrowDays))}</dd>
                  </dl>
                  <div className="money-box text-start small mt-3">
                    Quy định sẽ lưu trên phiếu (snapshot): {snapshotText(regulation)}.
                  </div>
                  {submitError && (
                    <Alert variant="danger" className="mt-3 mb-0 small">
                      {submitError}
                    </Alert>
                  )}
                  <div className="d-flex gap-2 mt-3">
                    <Button variant="outline-secondary" className="flex-fill" onClick={reset} disabled={submitting}>
                      Hủy
                    </Button>
                    <Button className="flex-fill" onClick={submit} disabled={submitting || items.length === 0}>
                      {submitting ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-check-lg me-2" />}
                      Lập phiếu
                    </Button>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  );
}
