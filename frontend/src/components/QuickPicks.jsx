/**
 * Các nút "Thử nhanh" dùng khi demo, điền sẵn mã có trong database/seed.sql.
 *
 *   <QuickPicks items={[['HS2026001', 'đủ điều kiện'], ...]} onPick={find} />
 */
export default function QuickPicks({ items, onPick, disabled }) {
  return (
    <div className="d-flex flex-wrap align-items-center gap-2 mt-2 small d-print-none">
      <span className="text-secondary">Thử nhanh:</span>
      {items.map(([code, note]) => (
        <button
          key={code}
          type="button"
          className="btn btn-sm btn-light border rounded-pill py-0 px-2"
          disabled={disabled}
          onClick={() => onPick(code)}
        >
          {code} <span className="text-secondary">· {note}</span>
        </button>
      ))}
    </div>
  );
}
