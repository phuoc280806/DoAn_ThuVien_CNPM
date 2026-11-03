import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';

export default function ForbiddenPage() {
  return (
    <div className="text-center py-5">
      <div className="icon-tile mx-auto mb-3 bg-danger-subtle text-danger">
        <i className="bi bi-shield-lock" />
      </div>
      <h1 className="h4">Không có quyền truy cập</h1>
      <p className="text-secondary">Tài khoản của bạn không được phép dùng chức năng này.</p>
      <Button as={Link} to="/dashboard" variant="outline-primary">
        Về trang tổng quan
      </Button>
    </div>
  );
}
