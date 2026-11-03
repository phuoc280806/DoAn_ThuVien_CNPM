import { Badge } from 'react-bootstrap';

// Nhãn và màu cho các giá trị trạng thái của backend, theo tên gọi trong đặc tả N7
export const STATUS = {
  copy: {
    AVAILABLE: ['Khả dụng', 'success'],
    BORROWED: ['Đang mượn', 'info'],
    DAMAGED: ['Hư hỏng', 'warning'],
    LOST: ['Mất', 'danger'],
  },
  fine: {
    UNPAID: ['Chưa thu', 'warning'],
    PAID: ['Đã thu', 'success'],
  },
  ticket: {
    BORROWING: ['Đang mượn', 'info'],
    COMPLETED: ['Hoàn tất', 'secondary'],
  },
  card: {
    ACTIVE: ['Thẻ còn hạn', 'success'],
    EXPIRED: ['Thẻ hết hạn', 'danger'],
    LOCKED: ['Thẻ bị khóa', 'danger'],
    null: ['Chưa có thẻ', 'secondary'],
  },
  account: {
    ACTIVE: ['Hoạt động', 'success'],
    LOCKED: ['Bị khóa', 'danger'],
  },
  condition: {
    GOOD: ['Tốt', 'success'],
    DAMAGED: ['Hư hỏng', 'warning'],
    LOST: ['Mất', 'danger'],
  },
  due: {
    OVERDUE: ['Quá hạn', 'danger'],
    ON_TIME: ['Trong hạn', 'success'],
  },
};

export const statusLabel = (type, value) => STATUS[type]?.[value]?.[0] ?? value;

/**
 *   <StatusBadge type="copy" value="BORROWED" />   → "Đang mượn"
 *   <StatusBadge type="fine" value={fine.status} />
 */
export default function StatusBadge({ type, value }) {
  const [label, color] = STATUS[type]?.[value] ?? [value, 'secondary'];
  return (
    <Badge pill bg={`${color}-subtle`} text={`${color}-emphasis`} className="fw-medium">
      {label}
    </Badge>
  );
}
