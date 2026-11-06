import { Fragment, useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, ButtonGroup, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import * as regulationsApi from '../../api/regulations';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';
import { addDays, formatDate, formatMoney, todayVN } from '../../utils/format';
import { READER_TYPE_LABELS } from '../../utils/roles';
import { REG_PARAMS, READER_SCOPE_LABELS, formatParam, paramLabel } from '../../utils/regulation';

// Giới hạn giống backend (Bảng 2.39)
const LIMITS = {
  maxBooks: [1, 50],
  borrowDays: [1, 365],
  finePerDay: [0, 1000000],
  maxFinePerBook: [0, 10000000],
  renewDays: [0, 365],
};
const INPUT_LABELS = {
  maxBooks: 'Số sách tối đa (cuốn)',
  borrowDays: 'Số ngày mượn',
  finePerDay: 'Phạt mỗi ngày (đ)',
  maxFinePerBook: 'Phạt tối đa mỗi cuốn (đ)',
  renewDays: 'Số ngày gia hạn',
};

function validateVersion(v) {
  const e = {};
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    const n = Number(v[key]);
    if (v[key] === '' || !Number.isInteger(n) || n < min || n > max) {
      e[key] = `Số nguyên từ ${min} đến ${max.toLocaleString('vi-VN')}`;
    }
  }
  if (!e.maxFinePerBook && !e.finePerDay && Number(v.maxFinePerBook) < Number(v.finePerDay)) {
    e.maxFinePerBook = 'Phải lớn hơn hoặc bằng tiền phạt mỗi ngày';
  }
  if (!v.effectiveFrom) e.effectiveFrom = 'Cần chọn ngày hiệu lực';
  else if (v.effectiveFrom < todayVN()) e.effectiveFrom = 'Ngày hiệu lực không được ở quá khứ';
  return e;
}

const valuesOf = (reg) => ({
  ...Object.fromEntries(REG_PARAMS.map((p) => [p.key, String(reg?.[p.key] ?? '')])),
  effectiveFrom: addDays(todayVN(), 1),
});

// ---------------------------------------------------------------------
// UC015 – Áp dụng quy định mới cho phiếu đang mượn
// ---------------------------------------------------------------------
const APPLY_PARAMS = [
  ['borrowDays', 'Số ngày mượn (tính lại hạn trả)'],
  ['finePerDay', 'Phạt mỗi ngày'],
  ['maxFinePerBook', 'Phạt tối đa mỗi cuốn'],
  ['renewDays', 'Số ngày gia hạn'],
];

function ApplyToActiveLoans({ onApplied }) {
  const toast = useToast();
  const [scope, setScope] = useState('ALL');
  const [params, setParams] = useState(['borrowDays']);
  const [fixedDueDate, setFixedDueDate] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);

  // Đổi lựa chọn thì phải xem trước lại
  function change(fn) {
    fn();
    setPreview(null);
    setError('');
  }

  const request = () => ({ readerType: scope, params, ...(fixedDueDate ? { fixedDueDate } : {}) });

  async function runPreview() {
    if (params.length === 0) {
      setError('Cần chọn ít nhất một tham số áp dụng');
      return;
    }
    setPreviewing(true);
    setError('');
    setPreview(null);
    try {
      const body = await regulationsApi.previewApply(request());
      setPreview(body.data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPreviewing(false);
    }
  }

  function askApply() {
    if (!reason.trim()) {
      setReasonError('Cần nhập lý do áp dụng');
      return;
    }
    setReasonError('');
    setConfirming(true);
  }

  async function apply() {
    setApplying(true);
    try {
      const body = await regulationsApi.applyActiveLoans({ ...request(), reason: reason.trim() });
      toast.success(body.message);
      setConfirming(false);
      setPreview(null);
      setReason('');
      onApplied();
    } catch (err) {
      setConfirming(false);
      setError(errorMessage(err));
    } finally {
      setApplying(false);
    }
  }

  return (
    <Card>
      <Card.Header className="fw-semibold">Áp dụng quy định hiện hành cho phiếu đang mượn (trường hợp đặc biệt)</Card.Header>
      <Card.Body>
        <Alert variant="warning" className="small">
          Mặc định quy định mới <strong>không hồi tố</strong>: phiếu đã lập giữ snapshot cũ. Chỉ dùng khi cần, ví dụ thu hồi
          sách cuối năm học. Bắt buộc nhập lý do; hệ thống ghi nhật ký và lưu giá trị cũ → mới của từng phiếu.
        </Alert>
        <Row className="g-3 align-items-end">
          <Col sm={6} lg={3}>
            <Form.Label htmlFor="apply-scope" className="small fw-medium">Phạm vi</Form.Label>
            <Form.Select id="apply-scope" value={scope} onChange={(e) => change(() => setScope(e.target.value))}>
              {Object.entries(READER_SCOPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </Form.Select>
          </Col>
          <Col sm={6} lg={3}>
            <Form.Label htmlFor="apply-date" className="small fw-medium">Ngày thu hồi cố định (không bắt buộc)</Form.Label>
            <Form.Control
              id="apply-date"
              type="date"
              min={todayVN()}
              value={fixedDueDate}
              onChange={(e) => change(() => setFixedDueDate(e.target.value))}
            />
          </Col>
          <Col lg={6}>
            <fieldset>
              <legend className="small fw-medium mb-2" style={{ fontSize: '0.875rem' }}>Tham số áp dụng</legend>
              {APPLY_PARAMS.map(([key, label]) => (
                <Form.Check
                  key={key}
                  inline
                  id={`apply-${key}`}
                  label={label}
                  checked={params.includes(key)}
                  onChange={(e) =>
                    change(() => setParams((list) => (e.target.checked ? [...list, key] : list.filter((p) => p !== key))))
                  }
                />
              ))}
            </fieldset>
          </Col>
        </Row>
        <Button variant="outline-primary" className="mt-3" onClick={runPreview} disabled={previewing}>
          {previewing ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-eye me-2" />}
          Xem trước phiếu bị ảnh hưởng
        </Button>

        {error && (
          <Alert variant="danger" className="mt-3 mb-0">
            {error}
          </Alert>
        )}

        {preview && (
          <div className="mt-4">
            <Alert variant={preview.overdueWarningCount > 0 ? 'warning' : 'info'} className="small">
              <strong>{preview.totalAffected}</strong> phiếu đang mượn sẽ thay đổi
              {preview.overdueWarningCount > 0 && (
                <>
                  , trong đó <strong>{preview.overdueWarningCount}</strong> phiếu sẽ chuyển sang quá hạn
                </>
              )}
              .
            </Alert>
            <Table responsive size="sm" className="small align-middle">
              <thead>
                <tr>
                  <th>Phiếu</th>
                  <th>Độc giả</th>
                  <th>Tham số: cũ → mới</th>
                  <th>Hạn trả: cũ → mới</th>
                  <th>Cảnh báo</th>
                </tr>
              </thead>
              <tbody>
                {preview.tickets.map((t) => (
                  <tr key={t.borrowId}>
                    <td className="fw-medium">{t.ticketCode}</td>
                    <td>
                      {t.reader.fullName}
                      <div className="text-secondary">
                        {t.reader.readerCode} · {READER_TYPE_LABELS[t.reader.readerType]}
                      </div>
                    </td>
                    <td>
                      {Object.keys(t.newValues).map((k) => (
                        <div key={k}>
                          {paramLabel(k)}: {formatParam(k, t.oldValues[k])} → <strong>{formatParam(k, t.newValues[k])}</strong>
                        </div>
                      ))}
                    </td>
                    <td>
                      {t.dueDates.map((d) => (
                        <div key={d.borrowDetailId}>
                          {d.copyCode}: {formatDate(d.oldDueDate)} → <strong>{formatDate(d.newDueDate)}</strong>
                        </div>
                      ))}
                    </td>
                    <td>
                      {t.warning ? (
                        <Badge bg="danger-subtle" text="danger-emphasis" pill>{t.warning}</Badge>
                      ) : t.wasOverdue ? (
                        <span className="text-secondary">Đang quá hạn</span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Form.Group controlId="apply-reason" style={{ maxWidth: 600 }}>
              <Form.Label className="small fw-medium">Lý do áp dụng (bắt buộc)</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                maxLength={255}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonError('');
                }}
                placeholder="VD: Thu hồi sách cuối năm học"
                isInvalid={!!reasonError}
              />
              <Form.Control.Feedback type="invalid">{reasonError}</Form.Control.Feedback>
            </Form.Group>
            <Button variant="danger" className="mt-3" onClick={askApply}>
              Áp dụng cho {preview.totalAffected} phiếu
            </Button>
          </div>
        )}
      </Card.Body>

      <ConfirmModal
        show={confirming}
        title="Áp dụng cho phiếu đang mượn"
        confirmLabel="Áp dụng"
        variant="danger"
        busy={applying}
        onConfirm={apply}
        onCancel={() => setConfirming(false)}
      >
        Cập nhật quy định trên <strong>{preview?.totalAffected}</strong> phiếu đang mượn ({READER_SCOPE_LABELS[scope].toLowerCase()})
        theo quy định hiện hành? Thao tác được ghi vào nhật ký với lý do: “{reason.trim()}”.
      </ConfirmModal>
    </Card>
  );
}

// ---------------------------------------------------------------------
// UC013 – Cấu hình quy định
// ---------------------------------------------------------------------
export default function RegulationsPage() {
  const toast = useToast();
  const [groups, setGroups] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [readerType, setReaderType] = useState('STUDENT');
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const body = await regulationsApi.getRegulations();
      setGroups(body.data);
      setLoadError('');
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const group = groups?.find((g) => g.readerType === readerType);
  const current = group?.current;

  // Form tạo phiên bản mới lấy sẵn giá trị đang hiệu lực
  useEffect(() => {
    if (group) setValues(valuesOf(group.current));
    setErrors({});
    setServerError('');
  }, [group]);

  const set = (field) => (e) => setValues({ ...values, [field]: e.target.value });
  const changes = values && current ? REG_PARAMS.filter((p) => String(current[p.key]) !== values[p.key]) : [];

  function askSave() {
    setServerError('');
    const found = validateVersion(values);
    setErrors(found);
    if (Object.keys(found).length === 0) setConfirming(true);
  }

  async function save() {
    setSaving(true);
    try {
      const body = await regulationsApi.createRegulation({
        readerType,
        ...Object.fromEntries(REG_PARAMS.map((p) => [p.key, Number(values[p.key])])),
        effectiveFrom: values.effectiveFrom,
      });
      toast.success(body.message);
      setConfirming(false);
      await load();
    } catch (err) {
      setConfirming(false);
      setServerError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Alert variant="danger">{loadError}</Alert>;
  if (!groups || !values) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Cấu hình quy định" />

      <ButtonGroup className="mb-4">
        {['STUDENT', 'TEACHER'].map((t) => (
          <Button key={t} variant={readerType === t ? 'primary' : 'outline-primary'} onClick={() => setReaderType(t)}>
            {READER_TYPE_LABELS[t]}
          </Button>
        ))}
      </ButtonGroup>

      <Row className="g-4 mb-4">
        <Col xl={4}>
          <Card className="h-100">
            <Card.Header className="fw-semibold">Đang hiệu lực · {READER_TYPE_LABELS[readerType]}</Card.Header>
            <Card.Body>
              {!current ? (
                <p className="text-secondary mb-0">Chưa cấu hình quy định.</p>
              ) : (
                <dl className="row small mb-0">
                  {REG_PARAMS.map((p) => (
                    <Fragment key={p.key}>
                      <dt className="col-6 fw-normal text-secondary">{p.label}</dt>
                      <dd className="col-6 text-end fw-medium">{p.format(current[p.key])}</dd>
                    </Fragment>
                  ))}
                  <dt className="col-6 fw-normal text-secondary">Hiệu lực từ</dt>
                  <dd className="col-6 text-end fw-medium mb-0">{formatDate(current.effectiveFrom)}</dd>
                </dl>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xl={8}>
          <Card className="h-100">
            <Card.Header className="fw-semibold">Tạo phiên bản quy định mới</Card.Header>
            <Card.Body>
              {serverError && <Alert variant="danger">{serverError}</Alert>}
              <Form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  askSave();
                }}
              >
                <Row className="g-3">
                  {REG_PARAMS.map((p) => (
                    <Col sm={6} md={4} key={p.key}>
                      <Form.Group controlId={`reg-${p.key}`}>
                        <Form.Label className="small fw-medium">{INPUT_LABELS[p.key]}</Form.Label>
                        <Form.Control
                          type="number"
                          min={LIMITS[p.key][0]}
                          max={LIMITS[p.key][1]}
                          value={values[p.key]}
                          onChange={set(p.key)}
                          isInvalid={!!errors[p.key]}
                        />
                        <Form.Control.Feedback type="invalid">{errors[p.key]}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  ))}
                  <Col sm={6} md={4}>
                    <Form.Group controlId="reg-effectiveFrom">
                      <Form.Label className="small fw-medium">Ngày hiệu lực</Form.Label>
                      <Form.Control
                        type="date"
                        min={todayVN()}
                        value={values.effectiveFrom}
                        onChange={set('effectiveFrom')}
                        isInvalid={!!errors.effectiveFrom}
                      />
                      <Form.Control.Feedback type="invalid">{errors.effectiveFrom}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                </Row>
                <Alert variant="info" className="small mt-3 mb-0">
                  Quy định mới chỉ áp dụng cho phiếu lập từ ngày hiệu lực trở đi. Phiếu đã lập giữ nguyên quy định lưu trên phiếu.
                </Alert>
                <div className="d-flex justify-content-end gap-2 mt-3">
                  <Button variant="outline-secondary" onClick={() => { setValues(valuesOf(current)); setErrors({}); }}>
                    Đặt lại
                  </Button>
                  <Button type="submit">Lưu phiên bản</Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card className="mb-4">
        <Card.Header className="fw-semibold">Các phiên bản quy định · {READER_TYPE_LABELS[readerType]}</Card.Header>
        <Card.Body className="p-0">
          <Table responsive className="align-middle mb-0">
            <thead>
              <tr>
                <th>Phiên bản</th>
                <th>Hiệu lực từ</th>
                <th className="text-end">Sách tối đa</th>
                <th className="text-end">Số ngày mượn</th>
                <th className="text-end">Phạt / ngày</th>
                <th className="text-end">Phạt tối đa</th>
                <th className="text-end">Gia hạn</th>
                <th>Người tạo</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {group.versions.map((v) => (
                <tr key={v.regulationId}>
                  <td>#{v.regulationId}</td>
                  <td>{formatDate(v.effectiveFrom)}</td>
                  <td className="text-end">{v.maxBooks}</td>
                  <td className="text-end">{v.borrowDays}</td>
                  <td className="text-end">{formatMoney(v.finePerDay)}</td>
                  <td className="text-end">{formatMoney(v.maxFinePerBook)}</td>
                  <td className="text-end">+{v.renewDays} ngày</td>
                  <td>{v.createdBy.fullName}</td>
                  <td>
                    <StatusBadge type="regulation" value={v.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <ApplyToActiveLoans onApplied={load} />

      <ConfirmModal
        show={confirming}
        title="Lưu phiên bản quy định mới"
        confirmLabel="Lưu phiên bản"
        busy={saving}
        onConfirm={save}
        onCancel={() => setConfirming(false)}
      >
        <p>
          Quy định cho <strong>{READER_TYPE_LABELS[readerType].toLowerCase()}</strong>, hiệu lực từ{' '}
          <strong>{formatDate(values.effectiveFrom)}</strong>:
        </p>
        {changes.length === 0 ? (
          <p className="text-secondary mb-0">Không có tham số nào khác quy định đang hiệu lực.</p>
        ) : (
          <ul className="mb-0">
            {changes.map((p) => (
              <li key={p.key}>
                {p.label}: {p.format(current[p.key])} → <strong>{p.format(Number(values[p.key]))}</strong>
              </li>
            ))}
          </ul>
        )}
      </ConfirmModal>
    </>
  );
}
