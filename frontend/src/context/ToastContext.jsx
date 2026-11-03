import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';

/**
 * Thông báo nhanh góc trên bên phải, tự ẩn sau vài giây.
 *
 *   const toast = useToast();
 *   toast.success('Lập phiếu thành công');
 *   toast.error(errorMessage(err));
 */
const ToastContext = createContext(null);

const VARIANTS = {
  success: { icon: 'bi-check-circle-fill', color: 'text-success' },
  error: { icon: 'bi-x-circle-fill', color: 'text-danger' },
  warning: { icon: 'bi-exclamation-triangle-fill', color: 'text-warning' },
  info: { icon: 'bi-info-circle-fill', color: 'text-primary' },
};

let nextId = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((type, message) => {
    setToasts((list) => [...list, { id: nextId++, type, message }]);
  }, []);

  const api = useMemo(
    () => ({
      success: (m) => show('success', m),
      error: (m) => show('error', m),
      warning: (m) => show('warning', m),
      info: (m) => show('info', m),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer position="top-end" className="p-3 position-fixed" style={{ zIndex: 1090 }}>
        {toasts.map((t) => (
          <Toast key={t.id} onClose={() => remove(t.id)} delay={t.type === 'error' ? 6000 : 4000} autohide>
            <Toast.Body className="d-flex align-items-start gap-2">
              <i className={`bi ${VARIANTS[t.type].icon} ${VARIANTS[t.type].color} mt-1`} />
              <span className="flex-grow-1">{t.message}</span>
              <button type="button" className="btn-close btn-sm" aria-label="Đóng" onClick={() => remove(t.id)} />
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast phải dùng bên trong <ToastProvider>');
  return ctx;
}
