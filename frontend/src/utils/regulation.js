import { formatDate, formatMoney } from './format';

// Tham số quy định (QĐ01–QĐ06), tên khóa giống API backend
export const REG_PARAMS = [
  { key: 'maxBooks', label: 'Số sách mượn tối đa', format: (v) => `${v} cuốn` },
  { key: 'borrowDays', label: 'Số ngày mượn', format: (v) => `${v} ngày` },
  { key: 'finePerDay', label: 'Phạt trả trễ', format: (v) => `${formatMoney(v)}/ngày/cuốn` },
  { key: 'maxFinePerBook', label: 'Phạt tối đa', format: (v) => `${formatMoney(v)}/cuốn` },
  { key: 'renewDays', label: 'Gia hạn (1 lần)', format: (v) => `+${v} ngày` },
];

const BY_KEY = Object.fromEntries(REG_PARAMS.map((p) => [p.key, p]));

export const paramLabel = (key) => BY_KEY[key]?.label ?? (key === 'fixedDueDate' ? 'Ngày thu hồi cố định' : key);

// Giá trị một tham số; giá trị là mảng khi các phiếu có giá trị cũ khác nhau (nhật ký UC015)
export function formatParam(key, value) {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.map((v) => formatParam(key, v)).join(' / ');
  if (key === 'fixedDueDate') return formatDate(value);
  return BY_KEY[key] ? BY_KEY[key].format(value) : String(value);
}

// Snapshot quy định trên phiếu: "7 ngày · phạt 1.000đ/ngày · tối đa 30.000đ/cuốn · gia hạn +7 ngày"
export const snapshotText = (s) =>
  `${s.borrowDays} ngày · phạt ${formatMoney(s.finePerDay)}/ngày · tối đa ${formatMoney(s.maxFinePerBook)}/cuốn · gia hạn +${s.renewDays} ngày`;

export const READER_SCOPE_LABELS = { ALL: 'Tất cả độc giả', STUDENT: 'Học sinh', TEACHER: 'Giáo viên' };
