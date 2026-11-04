import { Badge } from 'react-bootstrap';
import { diffDays, todayVN } from '../../utils/format';

// Số ngày cảnh báo sắp đến hạn (giống UC017 nhắc hạn: còn ≤ 3 ngày)
export const DUE_SOON_DAYS = 3;

export const isOpen = (item) => item.status === 'BORROWING' || item.status === 'OVERDUE';

// Số ngày còn lại đến hạn trả (âm = đã quá hạn)
export const daysLeft = (item) => diffDays(todayVN(), item.dueDate);

export const isDueSoon = (item) => item.status === 'BORROWING' && daysLeft(item) <= DUE_SOON_DAYS;

/** Nhãn trạng thái một cuốn trong lịch sử của độc giả: Đang mượn / Sắp đến hạn / Quá hạn / Đã trả */
export function LoanStatusBadge({ item }) {
  let label = 'Đang mượn';
  let color = 'info';
  if (item.status === 'RETURNED') {
    label = 'Đã trả';
    color = 'secondary';
  } else if (item.status === 'OVERDUE') {
    label = 'Quá hạn';
    color = 'danger';
  } else if (isDueSoon(item)) {
    label = 'Sắp đến hạn';
    color = 'warning';
  }
  return (
    <Badge pill bg={`${color}-subtle`} text={`${color}-emphasis`} className="fw-medium">
      {label}
    </Badge>
  );
}

/** Dòng chữ "Còn 2 ngày" / "Hạn trả hôm nay" / "Quá hạn 5 ngày" cho cuốn chưa trả */
export function DueNote({ item }) {
  if (!isOpen(item)) return null;
  const left = daysLeft(item);
  if (left < 0) return <span className="text-danger small">Quá hạn {-left} ngày</span>;
  if (left === 0) return <span className="text-warning-emphasis small">Hạn trả hôm nay</span>;
  return <span className={`small ${left <= DUE_SOON_DAYS ? 'text-warning-emphasis' : 'text-secondary'}`}>Còn {left} ngày</span>;
}
