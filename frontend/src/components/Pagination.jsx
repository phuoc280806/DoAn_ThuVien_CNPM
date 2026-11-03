import { Pagination as BsPagination } from 'react-bootstrap';

/**
 * Phân trang cho các API trả { items, page, pageSize, total }.
 *
 *   <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
 */
export default function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  // Tối đa 5 số trang quanh trang hiện tại
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const numbers = Array.from({ length: Math.min(5, pages) }, (_, i) => start + i);

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 small">
      <span className="text-secondary">
        Hiển thị {from}–{to} / {total}
      </span>
      {pages > 1 && (
        <BsPagination size="sm" className="mb-0">
          <BsPagination.Prev disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Trang trước" />
          {numbers.map((n) => (
            <BsPagination.Item key={n} active={n === page} onClick={() => onChange(n)}>
              {n}
            </BsPagination.Item>
          ))}
          <BsPagination.Next disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Trang sau" />
        </BsPagination>
      )}
    </div>
  );
}
