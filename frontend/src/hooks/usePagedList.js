import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '../api/client';

/**
 * Tải danh sách có phân trang từ API trả { items, page, pageSize, total }.
 * Đổi bộ lọc thì tự về trang 1; ô lọc để trống thì không gửi lên.
 *
 *   const list = usePagedList(usersApi.listUsers, { keyword, role });
 *   list.data?.items, list.loading, list.error, list.setPage(2), list.reload()
 *
 * fetcher phải là hàm cố định (khai báo trong src/api/), không tạo mới mỗi lần render.
 */
export default function usePagedList(fetcher, filters, pageSize = 20) {
  const key = JSON.stringify(filters);
  const [lastKey, setLastKey] = useState(key);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  if (key !== lastKey) {
    setLastKey(key);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    const params = Object.fromEntries(Object.entries(JSON.parse(key)).filter(([, v]) => v !== '' && v != null));
    setLoading(true);
    setError('');
    fetcher({ ...params, page, pageSize })
      .then((body) => !cancelled && setData(body.data))
      .catch((err) => {
        if (cancelled) return;
        setData(null);
        setError(errorMessage(err));
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetcher, key, page, pageSize, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data, loading, error, page, setPage, reload };
}
