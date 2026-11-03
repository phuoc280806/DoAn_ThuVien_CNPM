import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/auth';
import { getToken, onUnauthorized, setToken } from '../api/client';

/**
 * Trạng thái đăng nhập dùng chung.
 *
 *   const { user, login, logout } = useAuth();
 *   user = { userId, username, fullName, role, reader: { readerId, readerCode, readerType } | null, ... }
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'checking': đang kiểm tra token đã lưu khi mở trang; 'ready': đã biết đăng nhập hay chưa
  const [status, setStatus] = useState(getToken() ? 'checking' : 'ready');
  // Lý do bị đưa về trang đăng nhập (vd. hết phiên), trang đăng nhập hiển thị rồi xóa
  const [notice, setNotice] = useState('');

  const clear = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    onUnauthorized((message) => {
      clear();
      setNotice(message || 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
    });
    return () => onUnauthorized(null);
  }, [clear]);

  // Mở lại trang khi đã có token: lấy thông tin tài khoản mới nhất
  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((body) => setUser(body.data))
      .catch(() => clear())
      .finally(() => setStatus('ready'));
  }, [clear]);

  const login = useCallback(async (username, password) => {
    const body = await authApi.login(username, password);
    setToken(body.data.token);
    setUser(body.data.user);
    setNotice('');
    return body.data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // JWT không lưu phía server, lỗi mạng ở đây không ảnh hưởng việc đăng xuất
    }
    clear();
  }, [clear]);

  const refreshUser = useCallback(async () => {
    const body = await authApi.me();
    setUser(body.data);
    return body.data;
  }, []);

  const value = useMemo(
    () => ({ user, status, notice, clearNotice: () => setNotice(''), login, logout, refreshUser }),
    [user, status, notice, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải dùng bên trong <AuthProvider>');
  return ctx;
}
