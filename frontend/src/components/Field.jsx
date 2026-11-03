/**
 * Một cặp nhãn – giá trị, dùng trong lưới thông tin.
 *
 *   <div className="row g-3">
 *     <Field label="Độc giả">Lê Minh An (HS2026001)</Field>
 *   </div>
 */
export default function Field({ label, children, className = 'col-sm-6' }) {
  return (
    <div className={className}>
      <div className="small text-secondary">{label}</div>
      <div className="fw-medium">{children ?? '—'}</div>
    </div>
  );
}
