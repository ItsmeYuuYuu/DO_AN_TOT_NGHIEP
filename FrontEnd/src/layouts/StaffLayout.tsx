import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  Box,
  ClipboardList,
  Gift,
  Headphones,
  Home,
  Image,
  LogOut,
  Newspaper,
  Package,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { roleLabels } from '@/features/users/api/usersApi';
import Logo from '@/assets/Logo.png';

interface StaffNavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const navigationByRole: Record<string, StaffNavItem[]> = {
  Staff: [
    { label: 'Đơn hàng', to: '/staff/orders', icon: <ClipboardList size={18} /> },
    { label: 'Kho hàng', to: '/staff/inventory', icon: <Box size={18} /> },
    { label: 'Bảo hành', to: '/staff/warranties', icon: <ShieldCheck size={18} /> },
  ],
  Manager: [
    { label: 'Tổng quan', to: '/staff/dashboard', icon: <BarChart3 size={18} /> },
    { label: 'Sản phẩm', to: '/staff/products', icon: <Package size={18} /> },
    { label: 'Đơn hàng', to: '/staff/orders', icon: <ClipboardList size={18} /> },
    { label: 'Hàng đợi Sales', to: '/staff/sales-orders', icon: <UserCheck size={18} /> },
    { label: 'Hàng đợi kho', to: '/staff/warehouse-orders', icon: <Truck size={18} /> },
    { label: 'Kho hàng', to: '/staff/inventory', icon: <Box size={18} /> },
    { label: 'Khách hàng', to: '/staff/customers', icon: <Users size={18} /> },
    { label: 'Voucher', to: '/staff/vouchers', icon: <Gift size={18} /> },
    { label: 'Tư vấn AI', to: '/staff/consultations', icon: <Headphones size={18} /> },
  ],
  Sales: [
    { label: 'Đơn cần xác nhận', to: '/staff/sales-orders', icon: <ClipboardList size={18} /> },
    { label: 'Khách hàng', to: '/staff/customers', icon: <Users size={18} /> },
    { label: 'Voucher', to: '/staff/vouchers', icon: <Gift size={18} /> },
  ],
  Warehouse: [
    { label: 'Đơn cần xuất kho', to: '/staff/warehouse-orders', icon: <Truck size={18} /> },
    { label: 'Sản phẩm', to: '/staff/products', icon: <Package size={18} /> },
    { label: 'Kho & IMEI', to: '/staff/inventory', icon: <Box size={18} /> },
  ],
  Warranty: [
    { label: 'Bảo hành', to: '/staff/warranties', icon: <ShieldCheck size={18} /> },
    { label: 'Khách hàng', to: '/staff/customers', icon: <Users size={18} /> },
  ],
  Content: [
    { label: 'Sản phẩm', to: '/staff/products', icon: <Package size={18} /> },
    { label: 'Tin tức', to: '/staff/news', icon: <Newspaper size={18} /> },
    { label: 'Banner & slider', to: '/staff/promotional-contents', icon: <Image size={18} /> },
  ],
  Consultant: [
    { label: 'Tư vấn AI', to: '/staff/consultations', icon: <Headphones size={18} /> },
    { label: 'Khách hàng', to: '/staff/customers', icon: <Users size={18} /> },
  ],
};

export const StaffLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const staffNav = navigationByRole[user?.rolename ?? ''] ?? navigationByRole.Staff;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-20 items-center border-b border-slate-100 px-5">
          <div className="flex items-center gap-2">
            <img src={Logo} alt="Operations Portal" className="h-14 w-auto shrink-0 object-contain" />
            <span className="text-sm font-bold tracking-tight text-slate-800">Operations Portal</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-2 py-4">
          {staffNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-slate-100 p-4">
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white">
                {user.fullname?.charAt(0).toUpperCase() ?? 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">{user.fullname}</p>
                <p className="truncate text-[10px] text-slate-400">
                  {roleLabels[user.rolename] ?? user.rolename}
                </p>
              </div>
            </div>
          )}
          <NavLink
            to="/"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            <Home size={14} /> Về trang chủ
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Trung tâm vận hành
          </span>
          <span className="text-xs text-slate-400">{new Date().toLocaleString('vi-VN')}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
