import { Link } from 'react-router-dom';
import { Button } from 'react-bootstrap';

export default function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <div className="icon-tile mx-auto mb-3">
        <i className="bi bi-signpost-split" />
      </div>
      <h1 className="h4">Không tìm thấy trang</h1>
      <p className="text-secondary">Đường dẫn không tồn tại hoặc đã bị thay đổi.</p>
      <Button as={Link} to="/dashboard" variant="outline-primary">
        Về trang tổng quan
      </Button>
    </div>
  );
}
