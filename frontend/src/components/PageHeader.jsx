/**
 * Tiêu đề trang: tên, mô tả ngắn và các nút thao tác bên phải.
 *
 *   <PageHeader title="Lập phiếu mượn" subtitle="UC007">
 *     <Button>...</Button>
 *   </PageHeader>
 */
export default function PageHeader({ title, subtitle, children }) {
  return (
    <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
      <div>
        <h1 className="h4 mb-1">{title}</h1>
        {subtitle && <p className="text-secondary small mb-0">{subtitle}</p>}
      </div>
      {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
