import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import * as copiesApi from '../../api/copies';
import * as booksApi from '../../api/books';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import ScanInput from '../../components/ScanInput';
import QuickPicks from '../../components/QuickPicks';
import StatusBadge, { statusLabel } from '../../components/StatusBadge';
import Field from '../../components/Field';

// Dữ liệu trong database/seed.sql
const PICKS = [
  ['BS000005', 'khả dụng'],
  ['BS000001', 'đang mượn'],
  ['BS000037', 'hư hỏng'],
  ['BS000039', 'mất'],
];

// Đổi trạng thái bằng tay được phép (quyết định 6). Đang mượn chỉ đổi qua lập phiếu / trả sách.
const ALLOWED = {
  AVAILABLE: ['DAMAGED', 'LOST'],
  DAMAGED: ['AVAILABLE', 'LOST'],
  LOST: ['AVAILABLE'],
  BORROWED: [],
};
const NEEDS_REASON = ['DAMAGED', 'LOST'];

// UC005 – Quản lý trạng thái bản sách
export default function CopiesPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [code, setCode] = useState(searchParams.get('code') ?? '');
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState('');
  const [copy, setCopy] = useState(null);
  const [siblings, setSiblings] = useState(null);

  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [saving, setSaving] = useState(false);

  const find = useCallback(async (value) => {
    setCode(value);
    setFinding(true);
    setFindError('');
    setCopy(null);
    setSiblings(null);
    setStatus('');
    setReason('');
    setReasonError('');
    try {
      const { data } = await copiesApi.getCopyByCode(value);
      setCopy(data);
      setStatus(ALLOWED[data.status][0] ?? '');
      setSearchParams({ code: data.copyCode }, { replace: true });
      const res = await booksApi.listBookCopies(data.book.bookId);
      setSiblings(res.data.copies);
    } catch (err) {
      setFindError(errorMessage(err));
    } finally {
      setFinding(false);
    }
  }, [setSearchParams]);

  // Mở từ trang Đầu sách với ?code=BS000001 thì tra luôn
  useEffect(() => {
    const initial = searchParams.get('code');
    if (initial) find(initial.toUpperCase());
  }, []); // chỉ chạy lần đầu mở trang

  async function save(e) {
    e.preventDefault();
    if (NEEDS_REASON.includes(status) && !reason.trim()) {
      setReasonError('Cần nhập lý do khi bản sách bị hư hỏng hoặc mất');
      return;
    }
    setSaving(true);
    try {
      const body = await copiesApi.changeCopyStatus(copy.copyId, status, reason.trim() || undefined);
      toast.success(body.message);
      await find(copy.copyCode);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const options = copy ? ALLOWED[copy.status] : [];

  return (
    <>
      <PageHeader title="Bản sách" />

      <Card className="mb-4">
        <Card.Body>
          <ScanInput
            id="copy-code"
            value={code}
            onChange={setCode}
            onSubmit={find}
            placeholder="Quét hoặc nhập mã bản sách, VD: BS000005"
            busy={finding}
            autoFocus
          />
          <QuickPicks items={PICKS} onPick={find} disabled={finding} />
          {findError && (
            <Alert variant="danger" className="mt-3 mb-0">
              {findError}
            </Alert>
          )}
        </Card.Body>
      </Card>

      {copy && (
        <Row className="g-4">
          <Col xl={7}>
            <Card className="h-100">
              <Card.Header className="fw-semibold">Bản sách {copy.copyCode}</Card.Header>
              <Card.Body>
                <div className="row g-3 mb-4">
                  <Field label="Đầu sách">{copy.book.title}</Field>
                  <Field label="ISBN">{copy.book.isbn}</Field>
                  <Field label="Trạng thái hiện tại">
                    <StatusBadge type="copy" value={copy.status} />
                  </Field>
                  <Field label="Vị trí">{copy.location}</Field>
                  {copy.note && (
                    <Field label="Ghi chú" className="col-12">
                      {copy.note}
                    </Field>
                  )}
                </div>

                {options.length === 0 ? (
                  <Alert variant="info" className="mb-0">
                    Bản sách đang được mượn, trạng thái chỉ thay đổi khi lập phiếu mượn hoặc trả sách.
                  </Alert>
                ) : (
                  <Form onSubmit={save} noValidate>
                    <fieldset className="mb-3">
                      <legend className="small fw-medium mb-2" style={{ fontSize: '0.875rem' }}>Chuyển sang</legend>
                      {options.map((s) => (
                        <Form.Check
                          key={s}
                          inline
                          type="radio"
                          id={`status-${s}`}
                          name="new-status"
                          label={statusLabel('copy', s)}
                          checked={status === s}
                          onChange={() => {
                            setStatus(s);
                            setReasonError('');
                          }}
                        />
                      ))}
                    </fieldset>
                    <Form.Group className="mb-3" controlId="copy-reason">
                      <Form.Label className="small fw-medium">
                        Lý do {NEEDS_REASON.includes(status) ? '(bắt buộc)' : '(không bắt buộc)'}
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        maxLength={255}
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          setReasonError('');
                        }}
                        placeholder={status === 'AVAILABLE' ? 'VD: Đã sửa bìa, đưa lại lên kệ' : 'VD: Rách bìa, mất trang 20–24'}
                        isInvalid={!!reasonError}
                      />
                      <Form.Control.Feedback type="invalid">{reasonError}</Form.Control.Feedback>
                    </Form.Group>
                    <Button type="submit" disabled={saving}>
                      {saving && <Spinner animation="border" size="sm" className="me-2" />}
                      Cập nhật trạng thái
                    </Button>
                  </Form>
                )}
              </Card.Body>
            </Card>
          </Col>

          <Col xl={5}>
            <Card className="h-100">
              <Card.Header className="fw-semibold">Các bản cùng đầu sách</Card.Header>
              <Card.Body className="p-0">
                {!siblings ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                  </div>
                ) : (
                  <Table hover size="sm" className="small align-middle mb-0">
                    <tbody>
                      {siblings.map((c) => (
                        <tr key={c.copyId} className={c.copyId === copy.copyId ? 'table-active' : ''}>
                          <td className="ps-3">
                            <Button variant="link" size="sm" className="p-0" onClick={() => find(c.copyCode)}>
                              {c.copyCode}
                            </Button>
                          </td>
                          <td>
                            <StatusBadge type="copy" value={c.status} />
                          </td>
                          <td className="text-secondary">{c.location || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </>
  );
}
