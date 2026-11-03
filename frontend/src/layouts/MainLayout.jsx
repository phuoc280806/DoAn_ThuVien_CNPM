import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/** Khung chung sau khi đăng nhập: menu trái, thanh trên, nội dung trang ở giữa. */
export default function MainLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Sidebar show={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="app-main">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="app-content p-3 p-sm-4 p-lg-5">
          <Outlet />
        </main>
      </div>
    </>
  );
}
