import { Button, Modal, Spinner } from 'react-bootstrap';

/**
 * Hộp xác nhận trước thao tác quan trọng (đăng xuất, khóa tài khoản, trả sách...).
 *
 *   <ConfirmModal show={open} title="Đăng xuất" confirmLabel="Đăng xuất"
 *                 onConfirm={doLogout} onCancel={() => setOpen(false)}>
 *     Bạn có chắc muốn đăng xuất?
 *   </ConfirmModal>
 */
export default function ConfirmModal({
  show,
  title,
  children,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'primary',
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal show={show} onHide={busy ? undefined : onCancel} centered>
      <Modal.Header closeButton={!busy}>
        <Modal.Title as="h2" className="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button variant={variant} onClick={onConfirm} disabled={busy}>
          {busy && <Spinner animation="border" size="sm" className="me-2" />}
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
