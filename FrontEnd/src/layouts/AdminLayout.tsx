import React, { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, Users, Layers, Tag, Users2, LogOut, Activity, Truck } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';

const navGroups: { group: string; items: { label: string; to: string; icon: React.ReactNode; end?: boolean }[] }[] = [
  {
    group: 'Tổng quan',
    items: [
      { label: 'Dashboard', to: '/admin', end: true, icon: <LayoutDashboard size={18} /> },
    ],
  },
  {
    group: 'Kinh doanh',
    items: [
      { label: 'Đơn hàng', to: '/admin/orders', icon: <ShoppingCart size={18} /> },
      { label: 'Khách hàng', to: '/admin/customers', icon: <Users2 size={18} /> },
    ],
  },
  {
    group: 'Danh mục',
    items: [
      { label: 'Sản phẩm', to: '/admin/products', icon: <Package size={18} /> },
      { label: 'Danh mục', to: '/admin/categories', icon: <Layers size={18} /> },
      { label: 'Thương hiệu', to: '/admin/brands', icon: <Tag size={18} /> },
      { label: 'Thuộc tính', to: '/admin/attributes', icon: <Tag size={18} /> },
      { label: 'Nhà cung cấp', to: '/admin/suppliers', icon: <Truck size={18} /> },
    ],
  },
  {
    group: 'Nội dung',
    items: [
      { label: 'Tin tức', to: '/admin/news', icon: <Tag size={18} /> },
      { label: 'Banners', to: '/admin/banners', icon: <Tag size={18} /> },
      { label: 'Sliders', to: '/admin/sliders', icon: <Tag size={18} /> },
    ],
  },
  {
    group: 'Hệ thống',
    items: [
      { label: 'Tài khoản', to: '/admin/users', icon: <Users size={18} /> },
      { label: 'Nhật ký hệ thống', to: '/admin/auditlogs', icon: <Activity size={18} /> },
      { label: 'Voucher', to: '/admin/vouchers', icon: <Tag size={18} /> },
      { label: 'Gói bảo hành', to: '/admin/warranty-packages', icon: <Tag size={18} /> },
    ],
  },
];

export const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside
        className={`flex flex-col bg-white border-r border-slate-200 shrink-0 transition-all duration-300 ${
          collapsed ? 'w-[60px]' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-100">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0">
            EC
          </div>
          {!collapsed && (
            <span className="font-bold text-slate-800 text-sm">Admin Panel</span>
          )}
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
          {navGroups.map((group) => (
            <div key={group.group}>
              {!collapsed && (
                <p className="px-2 mb-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {group.group}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                       ${isActive
                         ? 'bg-blue-50 text-blue-700'
                         : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                       }`
                    }
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse toggle & back to site */}
        <div className="border-t border-slate-100 p-3 space-y-1">
          {!collapsed && (
            <Link
              to="/"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              Về trang chủ
            </Link>
          )}
          {!collapsed && (
            <div className="px-3 py-2 rounded-lg bg-slate-50 flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[10px] font-black shrink-0">
                {user?.fullname?.charAt(0).toUpperCase() ?? 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.fullname ?? 'Admin'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email ?? ''}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            title="Đăng xuất"
            className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors gap-2 text-xs font-semibold"
          >
            <LogOut size={14} />
            {!collapsed && 'Đăng xuất'}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full px-3 py-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            title={collapsed ? 'Mở rộng' : 'Thu gọn'}
          >
            <svg className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ─── Main Area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shrink-0">
          <div>
            <h1 className="text-sm font-semibold text-slate-800">Hệ thống quản trị</h1>
            <p className="text-xs text-slate-400">ECommerce Admin — {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Status badge */}
            <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Hệ thống hoạt động
            </div>
            {/* Admin avatar */}
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer">
              AD
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
