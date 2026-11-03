import { Card } from 'react-bootstrap';
import PageHeader from './PageHeader';

/** Trang chưa làm: hiện tên, use case và giai đoạn phụ trách. */
export default function ComingSoon({ page }) {
  return (
    <>
      <PageHeader title={page.label} subtitle={page.uc.join(', ')} />
      <Card body className="text-center py-5">
        <div className="icon-tile mx-auto mb-3">
          <i className={`bi bi-${page.icon}`} />
        </div>
        <h2 className="h5">Trang đang được xây dựng</h2>
        <p className="text-secondary mb-0">
          Chức năng này thuộc giai đoạn <strong>{page.phase}</strong> của frontend.
        </p>
      </Card>
    </>
  );
}
