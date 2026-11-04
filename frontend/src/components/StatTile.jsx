import { Link } from 'react-router-dom';
import { Card } from 'react-bootstrap';

const TONES = {
  primary: { background: 'var(--tv-accent-soft)', color: 'var(--tv-accent-dark)' },
  success: { background: 'var(--bs-success-bg-subtle)', color: 'var(--bs-success-text-emphasis)' },
  warning: { background: 'var(--bs-warning-bg-subtle)', color: 'var(--bs-warning-text-emphasis)' },
  danger: { background: 'var(--bs-danger-bg-subtle)', color: 'var(--bs-danger-text-emphasis)' },
};

/**
 * Ô số liệu: icon, nhãn, con số lớn, dòng ghi chú. Có `to` thì bấm vào được.
 *
 *   <StatTile icon="cash-coin" tone="warning" label="Chưa thu" value={formatMoney(x)} note="3 khoản" to="/fines" />
 */
export default function StatTile({ icon, label, value, note, tone = 'primary', to }) {
  const body = (
    <Card.Body className="d-flex align-items-center gap-3">
      <div className="icon-tile" style={TONES[tone]}>
        <i className={`bi bi-${icon}`} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="small text-secondary">{label}</div>
        <div className="fs-4 fw-semibold lh-sm">{value}</div>
        {note && <div className="small text-secondary">{note}</div>}
      </div>
    </Card.Body>
  );
  return to ? (
    <Card as={Link} to={to} className="quick-link h-100">
      {body}
    </Card>
  ) : (
    <Card className="h-100">{body}</Card>
  );
}
