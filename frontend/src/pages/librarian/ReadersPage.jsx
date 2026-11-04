import { useRef, useState } from 'react';
import { Button, Card, Col, Form, Row, Table } from 'react-bootstrap';
import * as readersApi from '../../api/readers';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import usePagedList from '../../hooks/usePagedList';
import PageHeader from '../../components/PageHeader';
import ListCard from '../../components/ListCard';
import StatusBadge from '../../components/StatusBadge';
import FormModal from '../../components/FormModal';
import ConfirmModal from '../../components/ConfirmModal';
import { addDays, formatDate, todayVN } from '../../utils/format';
import { READER_TYPE_LABELS } from '../../utils/roles';

const EMPTY_PROFILE = {
  readerCode: '',
  fullName: '',
  readerType: 'STUDENT',
  className: '',
  department: '',
  email: '',
  dateOfBirth: '',
};

function validateProfile(v, isNew) {
  const e = {};
  if (isNew) {
    if (!v.readerCode.trim()) e.readerCode = 'Cần nhập mã độc giả';
    else if (!/^[A-Za-z0-9]{3,20}$/.test(v.readerCode.trim())) e.readerCode = 'Mã độc giả gồm 3–20 chữ cái không dấu hoặc chữ số';
  }
  if (!v.fullName.trim()) e.fullName = 'Cần nhập họ và tên';
  if (v.email.trim() && !/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Email không đúng định dạng';
  if (v.dateOfBirth && v.dateOfBirth >= todayVN()) e.dateOfBirth = 'Ngày sinh phải trước ngày hôm nay';
  return e;
}

function Input({ id, label, error, hint, ...props }) {
  return (
    <Form.Group className="mb-3" controlId={id}>
      <Form.Label className="small fw-medium">{label}</Form.Label>
      <Form.Control isInvalid={!!error} {...props} />
      <Form.Control.Feedback type="invalid">{error}</Form.Control.Feedback>
      {hint && <Form.Text>{hint}</Form.Text>}
    </Form.Group>
  );
}

// UC003 – Quản lý hồ sơ độc giả & thẻ thư viện
export default function ReadersPage() {
  const toast = useToast();
  const [form, setForm] = useState({ keyword: '', readerType: '' });
  const [filters, setFilters] = useState(form);
  const list = usePagedList(readersApi.listReaders, filters);

  // Modal: { type: 'create' | 'edit' | 'issue' | 'renew' | 'lock', reader, open }
  const [modal, setModal] = useState(null);
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  // Thêm hồ sơ xong thì mở tiếp hộp cấp thẻ (UC003: lập hồ sơ → cấp thẻ)
  const nextModal = useRef(null);

  function open(type, reader = null) {
    setModal({ type, reader, open: true });
    setErrors({});
    setServerError('');
    if (type === 'create') setValues(EMPTY_PROFILE);
    if (type === 'edit') {
      setValues({
        ...EMPTY_PROFILE,
        ...Object.fromEntries(Object.entries(reader).map(([k, v]) => [k, v ?? ''])),
        dateOfBirth: reader.dateOfBirth ? String(reader.dateOfBirth).slice(0, 10) : '',
      });
    }
    if (type === 'issue') setValues({ issuedDate: todayVN(), expiryDate: addDays(todayVN(), 365) });
    if (type === 'renew') {
      const base = reader.card.expiryDate > todayVN() ? reader.card.expiryDate : todayVN();
      setValues({ expiryDate: addDays(base, 365) });
    }
  }
  const close = () => setModal((m) => m && { ...m, open: false });
  const isOpen = (type) => modal?.open === true && modal.type === type;
  const set = (field) => (e) => setValues({ ...values, [field]: e.target.value });

  function afterClosed() {
    if (!nextModal.current) return;
    const { type, reader } = nextModal.current;
    nextModal.current = null;
    open(type, reader);
  }

  async function run(action, found = {}, then) {
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setServerError('');
    try {
      const body = await action();
      toast.success(body.message);
      if (then) then(body);
      close();
      list.reload();
    } catch (err) {
      if (modal.type === 'lock') {
        toast.error(errorMessage(err));
        close();
      } else {
        setServerError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  }

  function profileBody() {
    const v = values;
    return {
      fullName: v.fullName.trim(),
      readerType: v.readerType,
      className: v.readerType === 'STUDENT' ? v.className.trim() : '',
      department: v.readerType === 'TEACHER' ? v.department.trim() : '',
      email: v.email.trim(),
      dateOfBirth: v.dateOfBirth,
    };
  }

  function submitProfile() {
    const isNew = modal.type === 'create';
    const found = validateProfile(values, isNew);
    if (isNew) {
      run(
        () => readersApi.createReader({ readerCode: values.readerCode.trim().toUpperCase(), ...profileBody() }),
        found,
        (body) => {
          nextModal.current = { type: 'issue', reader: body.data };
        },
      );
    } else {
      run(() => readersApi.updateReader(modal.reader.readerId, profileBody()), found);
    }
  }

  function submitIssue() {
    const found = {};
    if (!values.issuedDate) found.issuedDate = 'Cần chọn ngày cấp';
    if (!values.expiryDate) found.expiryDate = 'Cần chọn ngày hết hạn';
    else if (values.expiryDate <= values.issuedDate) found.expiryDate = 'Ngày hết hạn thẻ phải sau ngày cấp';
    run(() => readersApi.issueCard(modal.reader.readerId, values.expiryDate, values.issuedDate), found);
  }

  function submitRenew() {
    const found = {};
    if (!values.expiryDate) found.expiryDate = 'Cần chọn ngày hết hạn mới';
    else if (values.expiryDate <= todayVN()) found.expiryDate = 'Ngày hết hạn mới phải sau ngày hôm nay';
    run(() => readersApi.renewCard(modal.reader.readerId, values.expiryDate), found);
  }

  const locking = modal?.type === 'lock' && modal.reader.card?.status !== 'LOCKED';
  const isNewProfile = modal?.type === 'create';

  return (
    <>
      <PageHeader title="Độc giả & thẻ" subtitle="UC003 · Lập hồ sơ độc giả, cấp / gia hạn / khóa thẻ thư viện">
        <Button onClick={() => open('create')}>
          <i className="bi bi-person-plus me-2" />
          Thêm độc giả
        </Button>
      </PageHeader>

      <Card className="mb-4">
        <Card.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              setFilters({ ...form, keyword: form.keyword.trim() });
            }}
          >
            <Row className="g-3 align-items-end">
              <Col md={6}>
                <Form.Label htmlFor="readers-keyword" className="small fw-medium">Tìm kiếm</Form.Label>
                <Form.Control
                  id="readers-keyword"
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                  placeholder="Mã độc giả, họ tên, lớp, tổ bộ môn"
                />
              </Col>
              <Col sm={7} md={4}>
                <Form.Label htmlFor="readers-type" className="small fw-medium">Loại độc giả</Form.Label>
                <Form.Select
                  id="readers-type"
                  value={form.readerType}
                  onChange={(e) => {
                    const next = { ...form, readerType: e.target.value };
                    setForm(next);
                    setFilters({ ...next, keyword: next.keyword.trim() });
                  }}
                >
                  <option value="">Tất cả</option>
                  <option value="STUDENT">Học sinh</option>
                  <option value="TEACHER">Giáo viên</option>
                </Form.Select>
              </Col>
              <Col sm={5} md={2}>
                <Button type="submit" className="w-100">
                  <i className="bi bi-search me-2" />
                  Tìm
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <ListCard list={list} empty="Không tìm thấy độc giả.">
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr>
              <th>Mã độc giả</th>
              <th>Họ và tên</th>
              <th>Loại · Lớp / Tổ</th>
              <th>Thẻ thư viện</th>
              <th>Tài khoản</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((r) => (
              <tr key={r.readerId}>
                <td className="fw-medium">{r.readerCode}</td>
                <td>
                  <div>{r.fullName}</div>
                  <div className="small text-secondary">{r.email || 'Chưa có email'}</div>
                </td>
                <td>
                  {READER_TYPE_LABELS[r.readerType]}
                  {(r.className || r.department) && <div className="small text-secondary">{r.className || r.department}</div>}
                </td>
                <td>
                  <StatusBadge type="card" value={r.card?.status ?? null} />
                  {r.card && <div className="small text-secondary">Hết hạn {formatDate(r.card.expiryDate)}</div>}
                </td>
                <td>
                  {r.account ? (
                    <StatusBadge type="account" value={r.account.status} />
                  ) : (
                    <span className="small text-secondary">Chưa cấp</span>
                  )}
                </td>
                <td className="text-end text-nowrap">
                  <Button size="sm" variant="link" title="Sửa hồ sơ" aria-label={`Sửa hồ sơ ${r.readerCode}`} onClick={() => open('edit', r)}>
                    <i className="bi bi-pencil-square" />
                  </Button>
                  {!r.card ? (
                    <Button size="sm" variant="outline-primary" onClick={() => open('issue', r)}>
                      Cấp thẻ
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" variant="outline-primary" onClick={() => open('renew', r)}>
                        Gia hạn thẻ
                      </Button>
                      <Button
                        size="sm"
                        variant={r.card.status === 'LOCKED' ? 'outline-success' : 'outline-danger'}
                        className="ms-1"
                        onClick={() => open('lock', r)}
                      >
                        {r.card.status === 'LOCKED' ? 'Mở khóa' : 'Khóa thẻ'}
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ListCard>

      <FormModal
        show={isOpen('create') || isOpen('edit')}
        title={isNewProfile ? 'Thêm hồ sơ độc giả' : `Sửa hồ sơ · ${modal?.reader?.readerCode ?? ''}`}
        submitLabel="Lưu hồ sơ"
        busy={busy}
        error={serverError}
        onSubmit={submitProfile}
        onHide={close}
        onExited={afterClosed}
      >
        <Row>
          <Col sm={6}>
            <Input
              id="reader-code"
              label="Mã độc giả"
              value={values.readerCode ?? ''}
              onChange={set('readerCode')}
              error={errors.readerCode}
              placeholder="VD: HS2026099"
              disabled={!isNewProfile}
              hint={isNewProfile ? 'Mã độc giả cũng là tên đăng nhập; không sửa được sau khi lưu.' : 'Mã độc giả không sửa được.'}
            />
          </Col>
          <Col sm={6}>
            <Input id="reader-name" label="Họ và tên" value={values.fullName ?? ''} onChange={set('fullName')} error={errors.fullName} />
          </Col>
          <Col sm={6}>
            <Form.Group className="mb-3" controlId="reader-type">
              <Form.Label className="small fw-medium">Loại độc giả</Form.Label>
              <Form.Select value={values.readerType ?? 'STUDENT'} onChange={set('readerType')}>
                <option value="STUDENT">Học sinh</option>
                <option value="TEACHER">Giáo viên</option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col sm={6}>
            {values.readerType === 'TEACHER' ? (
              <Input id="reader-department" label="Tổ bộ môn" value={values.department ?? ''} onChange={set('department')} placeholder="VD: Tổ Toán" />
            ) : (
              <Input id="reader-class" label="Lớp" value={values.className ?? ''} onChange={set('className')} placeholder="VD: 10A1" />
            )}
          </Col>
          <Col sm={6}>
            <Input
              id="reader-email"
              label="Email (nhận nhắc hạn trả)"
              type="email"
              value={values.email ?? ''}
              onChange={set('email')}
              error={errors.email}
            />
          </Col>
          <Col sm={6}>
            <Input
              id="reader-dob"
              label="Ngày sinh"
              type="date"
              max={todayVN()}
              value={values.dateOfBirth ?? ''}
              onChange={set('dateOfBirth')}
              error={errors.dateOfBirth}
            />
          </Col>
        </Row>
        {isNewProfile && <p className="small text-secondary mb-0">Lưu xong sẽ chuyển sang bước cấp thẻ thư viện.</p>}
      </FormModal>

      <FormModal
        show={isOpen('issue')}
        title={`Cấp thẻ thư viện · ${modal?.reader?.readerCode ?? ''}`}
        submitLabel="Cấp thẻ"
        busy={busy}
        error={serverError}
        onSubmit={submitIssue}
        onHide={close}
      >
        <p className="small text-secondary">Độc giả: {modal?.reader?.fullName}</p>
        <Row>
          <Col sm={6}>
            <Input id="card-issued" label="Ngày cấp" type="date" value={values.issuedDate ?? ''} onChange={set('issuedDate')} error={errors.issuedDate} />
          </Col>
          <Col sm={6}>
            <Input id="card-expiry" label="Ngày hết hạn" type="date" value={values.expiryDate ?? ''} onChange={set('expiryDate')} error={errors.expiryDate} />
          </Col>
        </Row>
      </FormModal>

      <FormModal
        show={isOpen('renew')}
        title={`Gia hạn thẻ · ${modal?.reader?.readerCode ?? ''}`}
        submitLabel="Gia hạn"
        busy={busy}
        error={serverError}
        onSubmit={submitRenew}
        onHide={close}
      >
        <p className="small text-secondary">
          {modal?.reader?.fullName} · hạn hiện tại {formatDate(modal?.reader?.card?.expiryDate)}
        </p>
        <Input
          id="card-new-expiry"
          label="Ngày hết hạn mới"
          type="date"
          min={addDays(todayVN(), 1)}
          value={values.expiryDate ?? ''}
          onChange={set('expiryDate')}
          error={errors.expiryDate}
        />
      </FormModal>

      <ConfirmModal
        show={isOpen('lock')}
        title={locking ? 'Khóa thẻ thư viện' : 'Mở khóa thẻ thư viện'}
        confirmLabel={locking ? 'Khóa thẻ' : 'Mở khóa'}
        variant={locking ? 'danger' : 'primary'}
        busy={busy}
        onConfirm={() => run(() => readersApi.setCardStatus(modal.reader.readerId, locking ? 'LOCKED' : 'ACTIVE'))}
        onCancel={close}
      >
        {modal?.reader && (
          <>
            {locking ? 'Thẻ bị khóa thì độc giả không mượn được sách.' : 'Thẻ sẽ dùng để mượn sách trở lại.'} Xác nhận với{' '}
            <strong>{modal.reader.fullName}</strong> ({modal.reader.readerCode})?
          </>
        )}
      </ConfirmModal>
    </>
  );
}
