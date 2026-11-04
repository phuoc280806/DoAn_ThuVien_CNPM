import { useEffect, useState } from 'react';
import * as meApi from '../../api/me';
import { errorMessage } from '../../api/client';

/**
 * Lịch sử mượn/trả của độc giả đang đăng nhập (GET /me/loans).
 * Trả { data: { unpaidTotal, items }, message, loading, error }.
 * Đổi params (lọc trạng thái, khoảng ngày) thì tự tải lại.
 */
export default function useMyLoans(params = {}) {
  const key = JSON.stringify(params);
  const [state, setState] = useState({ data: null, message: '', loading: true, error: '' });

  useEffect(() => {
    let cancelled = false;
    const query = Object.fromEntries(Object.entries(JSON.parse(key)).filter(([, v]) => v !== '' && v != null));
    setState((s) => ({ ...s, loading: true, error: '' }));
    meApi
      .getMyLoans(query)
      .then((body) => !cancelled && setState({ data: body.data, message: body.message ?? '', loading: false, error: '' }))
      .catch((err) => !cancelled && setState({ data: null, message: '', loading: false, error: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [key]);

  return state;
}
