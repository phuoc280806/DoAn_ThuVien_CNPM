import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { canAccess } from '../utils/roles';
import LoadingScreen from '../components/LoadingScreen';
import ForbiddenPage from '../pages/common/ForbiddenPage';

/**
 * Chặn trang theo đăng nhập và vai trò.
 * Chưa đăng nhập → về /login (nhớ trang đang mở để quay lại); sai vai trò → trang "Không có quyền".
 */
export default function RequireAuth({ roles, children }) {
  const { user, status } = useAuth();
  const location = useLocation();

  if (status === 'checking') return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (!canAccess(user.role, roles)) return <ForbiddenPage />;

  return children ?? <Outlet />;
}
