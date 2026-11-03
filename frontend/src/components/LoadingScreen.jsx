import { Spinner } from 'react-bootstrap';

export default function LoadingScreen({ text = 'Đang tải...' }) {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center gap-2 py-5 min-vh-100 text-secondary">
      <Spinner animation="border" variant="primary" />
      <span className="small">{text}</span>
    </div>
  );
}
