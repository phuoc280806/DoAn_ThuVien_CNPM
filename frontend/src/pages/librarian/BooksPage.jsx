import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Form, InputGroup, Modal, Row, Spinner, Table } from 'react-bootstrap';
import * as booksApi from '../../api/books';
import { errorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import usePagedList from '../../hooks/usePagedList';
import PageHeader from '../../components/PageHeader';
import ListCard from '../../components/ListCard';
import StatusBadge from '../../components/StatusBadge';
import FormModal from '../../components/FormModal';
import ConfirmModal from '../../components/ConfirmModal';
import { todayVN } from '../../utils/format';

const EMPTY_BOOK = {
  isbn: '',
  title: '',
  author: '',
  publisher: '',
  publishYear: '',
  categoryId: '',
  description: '',
  copies: '1',
  location: '',
};

function validateBook(v, isNew) {
  const e = {};
  if (!v.isbn.trim()) e.isbn = 'Cần nhập ISBN';
  if (!v.title.trim()) e.title = 'Cần nhập tên sách';
  if (!v.author.trim()) e.author = 'Cần nhập tác giả';
  if (!v.publisher.trim()) e.publisher = 'Cần nhập nhà xuất bản';
  const year = Number(v.publishYear);
  if (!Number.isInteger(year) || year < 1000) e.publishYear = 'Năm xuất bản phải là số nguyên dương';
  else if (year > Number(todayVN().slice(0, 4))) e.publishYear = 'Năm xuất bản không được vượt quá năm hiện tại';
  if (!v.categoryId) e.categoryId = 'Cần chọn thể loại';
  if (isNew) {
    const n = Number(v.copies);
    if (!Number.isInteger(n) || n < 0 || n > 100) e.copies = 'Số bản sách từ 0 đến 100';
  }
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

function BookStatus({ book }) {
  if (book.isHidden) {
    return (
      <Badge pill bg="secondary-subtle" text="secondary-emphasis" className="fw-medium">
        Đã ẩn
      </Badge>
    );
  }
  return book.availableCopies > 0 ? (
    <Badge pill bg="success-subtle" text="success-emphasis" className="fw-medium">Còn sách</Badge>
  ) : (
    <Badge pill bg="danger-subtle" text="danger-emphasis" className="fw-medium">Hết sách</Badge>
  );
}

// Các bản sách của một đầu sách + nhập thêm bản (quyết định 1: mã tự sinh BS000001…)
function CopiesModal({ book, onClose, onChanged }) {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!book) return;
    let cancelled = false;
    setData(null);
    setError('');
    booksApi
      .listBookCopies(book.bookId)
      .then((body) => !cancelled && setData(body.data))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [book]);

  async function addCopies(e) {
    e.preventDefault();
    const n = Number(quantity);
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      setError('Số bản sách từ 1 đến 100');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const body = await booksApi.addCopies(book.bookId, n, location.trim() || undefined);
      toast.success(body.message);
      setData(body.data);
      setQuantity('1');
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal show={!!book} onHide={onClose} size="lg" centered scrollable>
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="h5">Bản sách · {book?.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        <Form onSubmit={addCopies} className="mb-3">
          <Row className="g-2 align-items-end">
            <Col sm={3}>
              <Form.Label htmlFor="add-quantity" className="small fw-medium">Nhập thêm</Form.Label>
              <InputGroup>
                <Form.Control id="add-quantity" type="number" min={1} max={100} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                <InputGroup.Text>bản</InputGroup.Text>
              </InputGroup>
            </Col>
            <Col sm={5}>
              <Form.Label htmlFor="add-location" className="small fw-medium">Vị trí kệ (không bắt buộc)</Form.Label>
              <Form.Control id="add-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="VD: Kệ B2" />
            </Col>
            <Col sm={4}>
              <Button type="submit" className="w-100" disabled={busy}>
                {busy ? <Spinner animation="border" size="sm" className="me-2" /> : <i className="bi bi-plus-lg me-2" />}
                Nhập thêm bản
              </Button>
            </Col>
          </Row>
        </Form>
        {!data && !error ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        ) : (
          data && (
            <Table size="sm" responsive className="small align-middle mb-0">
              <thead>
                <tr>
                  <th>Mã bản sách</th>
                  <th>Trạng thái</th>
                  <th>Vị trí</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {data.copies.map((c) => (
                  <tr key={c.copyId}>
                    <td>
                      <Link to={`/copies?code=${c.copyCode}`} title="Đổi trạng thái bản sách">
                        {c.copyCode}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge type="copy" value={c.status} />
                    </td>
                    <td>{c.location || '—'}</td>
                    <td>{c.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )
        )}
      </Modal.Body>
      <Modal.Footer>
        <span className="small text-secondary me-auto">Bấm mã bản sách để đổi trạng thái (UC005).</span>
        <Button onClick={onClose}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  );
}

// UC004 – Quản lý đầu sách (kèm tra cứu UC006 phía thủ thư)
export default function BooksPage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ keyword: '', categoryId: '' });
  const [filters, setFilters] = useState(form);
  const list = usePagedList(booksApi.listBooks, filters);

  // Modal: { type: 'create' | 'edit' | 'delete', book, open }
  const [modal, setModal] = useState(null);
  const [values, setValues] = useState(EMPTY_BOOK);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiesOf, setCopiesOf] = useState(null);

  useEffect(() => {
    booksApi.listCategories().then((body) => setCategories(body.data)).catch(() => {});
  }, []);

  function open(type, book = null) {
    setModal({ type, book, open: true });
    setErrors({});
    setServerError('');
    if (type === 'create') setValues(EMPTY_BOOK);
    if (type === 'edit') {
      setValues({
        ...EMPTY_BOOK,
        isbn: book.isbn,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        publishYear: String(book.publishYear),
        categoryId: String(book.category.categoryId),
        description: book.description ?? '',
      });
    }
  }
  const close = () => setModal((m) => m && { ...m, open: false });
  const isOpen = (type) => modal?.open === true && modal.type === type;
  const set = (field) => (e) => setValues({ ...values, [field]: e.target.value });
  const isNew = modal?.type === 'create';

  async function save() {
    const found = validateBook(values, isNew);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const body = {
      isbn: values.isbn.trim(),
      title: values.title.trim(),
      author: values.author.trim(),
      publisher: values.publisher.trim(),
      publishYear: Number(values.publishYear),
      categoryId: Number(values.categoryId),
      description: values.description.trim() || null,
    };
    if (isNew) {
      body.copies = Number(values.copies);
      if (values.location.trim()) body.location = values.location.trim();
    }
    setBusy(true);
    setServerError('');
    try {
      const res = isNew ? await booksApi.createBook(body) : await booksApi.updateBook(modal.book.bookId, body);
      toast.success(res.message);
      close();
      list.reload();
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await booksApi.deleteBook(modal.book.bookId);
      if (res.data.deleted) toast.success(res.message);
      else toast.warning(res.message);   // đã có lịch sử mượn → chỉ ẩn
      list.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      close();
    }
  }

  async function toggleHidden(book) {
    try {
      const res = await booksApi.setBookHidden(book.bookId, !book.isHidden);
      toast.success(res.message);
      list.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <>
      <PageHeader title="Đầu sách" subtitle="UC004 · Thêm, sửa, ẩn / xóa đầu sách; nhập thêm bản sách">
        <Button onClick={() => open('create')}>
          <i className="bi bi-plus-lg me-2" />
          Thêm đầu sách
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
                <Form.Label htmlFor="books-keyword" className="small fw-medium">Tìm kiếm</Form.Label>
                <Form.Control
                  id="books-keyword"
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                  placeholder="Tên sách, tác giả, ISBN"
                />
              </Col>
              <Col sm={7} md={4}>
                <Form.Label htmlFor="books-category" className="small fw-medium">Thể loại</Form.Label>
                <Form.Select
                  id="books-category"
                  value={form.categoryId}
                  onChange={(e) => {
                    const next = { ...form, categoryId: e.target.value };
                    setForm(next);
                    setFilters({ ...next, keyword: next.keyword.trim() });
                  }}
                >
                  <option value="">Tất cả thể loại</option>
                  {categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                  ))}
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

      <ListCard list={list} empty="Không tìm thấy đầu sách phù hợp với thông tin tìm kiếm.">
        <Table hover responsive className="align-middle mb-0">
          <thead>
            <tr>
              <th>ISBN</th>
              <th>Tên sách</th>
              <th>Thể loại</th>
              <th>NXB · Năm</th>
              <th className="text-center">Còn / tổng</th>
              <th>Trạng thái</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {list.data?.items.map((b) => (
              <tr key={b.bookId} className={b.isHidden ? 'text-secondary' : ''}>
                <td className="small">{b.isbn}</td>
                <td>
                  <div className="fw-medium">{b.title}</div>
                  <div className="small text-secondary">{b.author}</div>
                </td>
                <td>{b.category.name}</td>
                <td className="small">
                  {b.publisher}
                  <div className="text-secondary">{b.publishYear}</div>
                </td>
                <td className="text-center">
                  {b.availableCopies}/{b.totalCopies}
                </td>
                <td>
                  <BookStatus book={b} />
                </td>
                <td className="text-end text-nowrap">
                  <Button size="sm" variant="outline-secondary" onClick={() => setCopiesOf(b)}>
                    Bản sách
                  </Button>
                  <Button size="sm" variant="link" title="Sửa" aria-label={`Sửa ${b.title}`} onClick={() => open('edit', b)}>
                    <i className="bi bi-pencil-square" />
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    title={b.isHidden ? 'Hiện lại' : 'Ẩn với độc giả'}
                    aria-label={`${b.isHidden ? 'Hiện lại' : 'Ẩn'} ${b.title}`}
                    onClick={() => toggleHidden(b)}
                  >
                    <i className={`bi ${b.isHidden ? 'bi-eye' : 'bi-eye-slash'}`} />
                  </Button>
                  <Button
                    size="sm"
                    variant="link"
                    className="text-danger"
                    title="Xóa"
                    aria-label={`Xóa ${b.title}`}
                    onClick={() => open('delete', b)}
                  >
                    <i className="bi bi-trash" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </ListCard>

      <FormModal
        show={isOpen('create') || isOpen('edit')}
        title={isNew ? 'Thêm đầu sách' : 'Sửa đầu sách'}
        submitLabel="Lưu"
        size="lg"
        busy={busy}
        error={serverError}
        onSubmit={save}
        onHide={close}
      >
        <Row>
          <Col sm={6}>
            <Input id="book-isbn" label="ISBN-13" value={values.isbn} onChange={set('isbn')} error={errors.isbn} placeholder="VD: 978-604-300-742-8" />
          </Col>
          <Col sm={6}>
            <Form.Group className="mb-3" controlId="book-category">
              <Form.Label className="small fw-medium">Thể loại</Form.Label>
              <Form.Select value={values.categoryId} onChange={set('categoryId')} isInvalid={!!errors.categoryId}>
                <option value="">-- Chọn thể loại --</option>
                {categories.map((c) => (
                  <option key={c.categoryId} value={c.categoryId}>{c.name}</option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{errors.categoryId}</Form.Control.Feedback>
            </Form.Group>
          </Col>
          <Col sm={12}>
            <Input id="book-title" label="Tên sách" value={values.title} onChange={set('title')} error={errors.title} />
          </Col>
          <Col sm={6}>
            <Input id="book-author" label="Tác giả" value={values.author} onChange={set('author')} error={errors.author} />
          </Col>
          <Col sm={6}>
            <Input id="book-publisher" label="Nhà xuất bản" value={values.publisher} onChange={set('publisher')} error={errors.publisher} />
          </Col>
          <Col sm={4}>
            <Input id="book-year" label="Năm xuất bản" type="number" value={values.publishYear} onChange={set('publishYear')} error={errors.publishYear} />
          </Col>
          {isNew && (
            <>
              <Col sm={4}>
                <Input id="book-copies" label="Số bản sách nhập" type="number" min={0} max={100} value={values.copies} onChange={set('copies')} error={errors.copies} />
              </Col>
              <Col sm={4}>
                <Input id="book-location" label="Vị trí kệ" value={values.location} onChange={set('location')} placeholder="VD: Kệ A2" />
              </Col>
            </>
          )}
          <Col sm={12}>
            <Input id="book-description" label="Mô tả" as="textarea" rows={2} value={values.description} onChange={set('description')} />
          </Col>
        </Row>
        {isNew && <p className="small text-secondary mb-0">Mã bản sách (BS…) được hệ thống tự sinh.</p>}
      </FormModal>

      <ConfirmModal
        show={isOpen('delete')}
        title="Xóa đầu sách"
        confirmLabel="Xóa"
        variant="danger"
        busy={busy}
        onConfirm={remove}
        onCancel={close}
      >
        {modal?.book && (
          <>
            Xóa “<strong>{modal.book.title}</strong>”? Nếu đầu sách đã từng được mượn, hệ thống sẽ <strong>ẩn</strong> thay vì
            xóa để giữ lịch sử.
          </>
        )}
      </ConfirmModal>

      <CopiesModal book={copiesOf} onClose={() => setCopiesOf(null)} onChanged={list.reload} />
    </>
  );
}
