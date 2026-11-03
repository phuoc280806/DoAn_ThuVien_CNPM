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

/** Câu thông báo lỗi để hiện cho người dùng. */
export function errorMessage(err) {
  if (err?.response?.data?.message) return err.response.data.message;
  if (err?.response) return `Lỗi máy chủ (${err.response.status})`;
  if (err?.request) return 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.';
  return err?.message || 'Đã có lỗi xảy ra';
}

export default client;
