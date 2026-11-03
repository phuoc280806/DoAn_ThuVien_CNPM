import axios from 'axios';

/**
 * Axios dùng chung cho mọi lời gọi API.
 * - Tự gắn "Authorization: Bearer <token>".
 * - Trả về body của response: { success, data, message }.
 * - Gặp 401 (token hết hạn / không hợp lệ) thì báo cho AuthContext để đăng xuất.
 *
 *   const { data, message } = await client.get('/books', { params: { keyword } });
 *
 * Lỗi: dùng errorMessage(err) để lấy câu thông báo của backend.
 */
const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
});

const TOKEN_KEY = 'thuvien.token';
let unauthorizedHandler = null;

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Trình duyệt chặn localStorage: phiên chỉ còn đến khi tải lại trang
  }
}

export function onUnauthorized(handler) {
  unauthorizedHandler = handler;
}

client.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res.data,
  (err) => {
    // Sai mật khẩu khi đăng nhập cũng là 401 nhưng không phải hết phiên
    if (err.response?.status === 401 && err.config?.url !== '/auth/login' && getToken()) {
      unauthorizedHandler?.(err.response.data?.message);
    }
    return Promise.reject(err);
  },
);

/**
 * Tải file từ API cần đăng nhập (vd. xuất báo cáo Excel/PDF) rồi lưu về máy.
 *
 *   await downloadFile('/reports/loans/export', { from, to, format: 'xlsx' }, 'bao-cao-muon-tra.xlsx');
 *
 * Lỗi (vd. kỳ báo cáo không hợp lệ) ném ra như mọi lời gọi khác, dùng errorMessage(err) để hiện.
 */
export async function downloadFile(url, params, filename) {
  let blob;
  try {
    blob = await client.get(url, { params, responseType: 'blob' });
  } catch (err) {
    // Lỗi trả về dạng Blob: đọc lại thành JSON để lấy câu thông báo của backend
    const data = err.response?.data;
    if (data instanceof Blob) {
      try {
        err.response.data = JSON.parse(await data.text());
      } catch {
        // không phải JSON, giữ nguyên
      }
    }
    throw err;
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

/** Câu thông báo lỗi để hiện cho người dùng. */
export function errorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.response) return `Lỗi máy chủ (${err.response.status})`;
  if (err?.request) return 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.';
  return err?.message || 'Đã có lỗi xảy ra';
}

export default client;
