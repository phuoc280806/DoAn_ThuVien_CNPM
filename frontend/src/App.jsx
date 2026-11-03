import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from './routes/RequireAuth';
import { PAGES } from './routes/pages';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/auth/LoginPage';
import NotFoundPage from './pages/common/NotFoundPage';
import ComingSoon from './components/ComingSoon';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        {PAGES.map((page) => {
          const Page = page.component;
          return (
            <Route
              key={page.path}
              path={page.path}
              element={<RequireAuth roles={page.roles}>{Page ? <Page /> : <ComingSoon page={page} />}</RequireAuth>}
            />
          );
        })}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
