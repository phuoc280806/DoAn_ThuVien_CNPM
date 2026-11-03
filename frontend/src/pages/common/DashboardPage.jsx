import { Link } from 'react-router-dom';
import { Badge, Card, Col, Row } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/PageHeader';
import { menuFor } from '../../routes/pages';
import { roleLabelOf } from '../../utils/roles';

// Tạm thời: lời chào + lối tắt tới các chức năng của vai trò.
// Số liệu tổng quan (đang mượn, quá hạn, nợ phạt...) bổ sung ở FE6.
export default function DashboardPage() {
  const { user } = useAuth();
  const shortcuts = menuFor(user.role)
    .flatMap((g) => g.pages)
    .filter((p) => p.path !== '/dashboard' && p.path !== '/profile');

  return (
    <>
      <PageHeader title={`Xin chào, ${user.fullName}`} subtitle={roleLabelOf(user)} />

      <Row xs={1} sm={2} xl={3} className="g-3">
        {shortcuts.map((page) => (
          <Col key={page.path}>
            <Card as={Link} to={page.path} className="quick-link h-100">
              <Card.Body className="d-flex align-items-center gap-3">
                <div className="icon-tile">
                  <i className={`bi bi-${page.icon}`} />
                </div>
                <div className="flex-grow-1">
                  <div className="fw-medium">{page.label}</div>
                  <div className="small text-secondary">{page.uc.join(', ')}</div>
                </div>
                {!page.component && (
                  <Badge bg="secondary-subtle" text="secondary-emphasis" pill>
                    Sắp có
                  </Badge>
                )}
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </>
  );
}
