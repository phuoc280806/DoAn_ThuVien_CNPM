import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap';

/**
 * Modal chứa một form (thêm / sửa). Enter trong ô nhập cũng gửi form.
 *
 *   <FormModal show={open} title="Tạo tài khoản" submitLabel="Tạo" busy={busy} error={serverError}
 *              onSubmit={save} onHide={() => setOpen(false)}>
 *     <Form.Group>...</Form.Group>
 *   </FormModal>
 *
 * error: câu lỗi từ backend, hiện ở đầu form.
 */
export default function FormModal({
  show,
  title,
  submitLabel = 'Lưu',
  submitVariant = 'primary',
  busy = false,
  error,
  size,
  onSubmit,
  onHide,
  onExited,
  children,
}) {
  return (
    <Modal show={show} onHide={busy ? undefined : onHide} onExited={onExited} size={size} centered>
      <Form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h2" className="h5">{title}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {children}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" variant={submitVariant} disabled={busy}>
            {busy && <Spinner animation="border" size="sm" className="me-2" />}
            {submitLabel}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
