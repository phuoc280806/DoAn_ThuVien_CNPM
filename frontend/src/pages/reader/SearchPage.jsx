import { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Modal, Row, Spinner } from 'react-bootstrap';
import * as booksApi from '../../api/books';
import { errorMessage } from '../../api/client';
import usePagedList from '../../hooks/usePagedList';
import PageHeader from '../../components/PageHeader';
import ListCard from '../../components/ListCard';
import Field from '../../components/Field';

const PAGE_SIZE = 12;

// Còn bao nhiêu bản; hết bản thì báo "Hết sách" (UC006 luồng 8a)
function Availability({ book }) {
  return book.availableCopies > 0 ? (
    <Badge pill bg="success-subtle" text="success-emphasis" className="fw-medium">
      Còn {book.availableCopies}/{book.totalCopies} bản
    </Badge>
  ) : (
    <Badge pill bg="danger-subtle" text="danger-emphasis" className="fw-medium">
      Hết sách
    </Badge>
  );
}

// Chi tiết một đầu sách
function BookDetailModal({ bookId, onClose }) {
  const [book, setBook] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    setBook(null);
    setError('');
    booksApi
      .getBook(bookId)
      .then((body) => !cancelled && setBook(body.data))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  return (
    <Modal show={!!bookId} onHide={onClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title as="h2" className="h5">{book?.title ?? 'Thông tin sách'}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {!book && !error && (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" />
          </div>
        )}
        {book && (
          <>
            <div className="row g-3 mb-3">
              <Field label="Tác giả">{book.author}</Field>
              <Field label="Thể loại">{book.category.name}</Field>
              <Field label="Nhà xuất bản">{book.publisher}</Field>
              <Field label="Năm xuất bản">{book.publishYear}</Field>
              <Field label="ISBN">{book.isbn}</Field>
              <Field label="Tình trạng">
                <Availability book={book} />
              </Field>
              {book.description && (
                <Field label="Mô tả" className="col-12">
                  {book.description}
                </Field>
              )}
            </div>
            <Alert variant="info" className="small mb-0">
              <i className="bi bi-info-circle me-2" />
              Để mượn sách, hãy mang mã độc giả đến quầy thủ thư. Độc giả không tự lập phiếu mượn trên hệ thống.
            </Alert>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button onClick={onClose}>Đóng</Button>
      </Modal.Footer>
    </Modal>
  );
}

// UC006 – Tra cứu sách & xem số bản khả dụng
export default function SearchPage() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ keyword: '', categoryId: '' });
  const [filters, setFilters] = useState(form);
  const [selected, setSelected] = useState(null);
  const list = usePagedList(booksApi.listBooks, filters, PAGE_SIZE);

  useEffect(() => {
    booksApi.listCategories().then((body) => setCategories(body.data)).catch(() => {});
  }, []);

  return (
    <>
      <PageHeader title="Tra cứu sách" />

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
                <Form.Label htmlFor="search-keyword" className="small fw-medium">Từ khóa</Form.Label>
                <Form.Control
                  id="search-keyword"
                  value={form.keyword}
                  onChange={(e) => setForm({ ...form, keyword: e.target.value })}
                  placeholder="VD: de men, Nguyễn Du, 9786043004779"
                />
              </Col>
              <Col sm={7} md={4}>
                <Form.Label htmlFor="search-category" className="small fw-medium">Thể loại</Form.Label>
                <Form.Select
                  id="search-category"
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
        <Row xs={1} sm={2} xl={3} className="g-3 p-3">
          {list.data?.items.map((b) => (
            <Col key={b.bookId}>
              <Card
                as="button"
                type="button"
                className="quick-link h-100 w-100 text-start"
                onClick={() => setSelected(b.bookId)}
              >
                <Card.Body className="d-flex gap-3">
                  <div className="icon-tile">
                    <i className="bi bi-book" />
                  </div>
                  <div className="flex-grow-1" style={{ minWidth: 0 }}>
                    <div className="fw-semibold">{b.title}</div>
                    <div className="small text-secondary">{b.author}</div>
                    <div className="small text-secondary">
                      {b.category.name} · {b.publisher}, {b.publishYear}
                    </div>
                    <div className="mt-2">
                      <Availability book={b} />
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </ListCard>

      <BookDetailModal bookId={selected} onClose={() => setSelected(null)} />
    </>
  );
}
