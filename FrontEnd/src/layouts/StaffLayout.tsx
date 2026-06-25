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
  LayoutGrid,
  LogOut,
  Newspaper,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { roleLabels } from '@/features/users/api/usersApi';
import Logo from '@/assets/Logo.png';
import { Seo } from '@/components/Seo';

interface StaffNavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

const navigationByRole: Record<string, StaffNavItem[]> = {
  Manager: [
    { label: 'Trung tâm điều phối', to: '/staff/manager', icon: <BarChart3 size={18} /> },
    { label: 'Đơn hàng', to: '/staff/orders', icon: <ClipboardList size={18} /> },
    { label: 'Hàng đợi Sales', to: '/staff/sales-orders', icon: <UserCheck size={18} /> },
    { label: 'Hàng đợi kho', to: '/staff/warehouse-orders', icon: <Truck size={18} /> },
    { label: 'Vận chuyển', to: '/staff/shipments', icon: <Truck size={18} /> },
    { label: 'Đổi trả & hoàn tiền', to: '/staff/returns', icon: <RotateCcw size={18} /> },
    { label: 'Sản phẩm', to: '/staff/products', icon: <Package size={18} /> },
    { label: 'Kho hàng', to: '/staff/inventory', icon: <Box size={18} /> },
    { label: 'Khách hàng', to: '/staff/customers', icon: <Users size={18} /> },
    { label: 'Voucher', to: '/staff/vouchers', icon: <Gift size={18} /> },
    { label: 'Sản phẩm trang chủ', to: '/staff/homepage-sections', icon: <LayoutGrid size={18} /> },
    { label: 'Tư vấn AI', to: '/staff/consultations', icon: <Headphones size={18} /> },
  ],
  Sales: [
    { label: 'Đơn cần xác nhận', to: '/staff/sales-orders', icon: <ClipboardList size={18} /> },
    { label: 'Theo dõi vận chuyển', to: '/staff/shipments', icon: <Truck size={18} /> },
    { label: 'Đổi trả & hoàn tiền', to: '/staff/returns', icon: <RotateCcw size={18} /> },
    { label: 'Khách hàng', to: '/staff/customers', icon: <Users size={18} /> },
    { label: 'Voucher', to: '/staff/vouchers', icon: <Gift size={18} /> },
  ],
  Warehouse: [
    { label: 'Đơn cần xuất kho', to: '/staff/warehouse-orders', icon: <Truck size={18} /> },
    { label: 'Kho & IMEI', to: '/staff/inventory', icon: <Box size={18} /> },
    { label: 'Vận chuyển & hàng hoàn', to: '/staff/shipments', icon: <Truck size={18} /> },
    { label: 'Hàng hoàn / đổi máy', to: '/staff/returns', icon: <RotateCcw size={18} /> },
    { label: 'Sản phẩm', to: '/staff/products', icon: <Package size={18} /> },
  ],
  Warranty: [
    { label: 'Bảo hành', to: '/staff/warranties', icon: <ShieldCheck size={18} /> },
    { label: 'Khách hàng', to: '/staff/customers', icon: <Users size={18} /> },
  ],
  Content: [
    { label: 'Tổng quan nội dung', to: '/staff/content', icon: <BarChart3 size={18} /> },
    { label: 'Sản phẩm', to: '/staff/products', icon: <Package size={18} /> },
    { label: 'Tin tức', to: '/staff/news', icon: <Newspaper size={18} /> },
    { label: 'Banner & slider', to: '/staff/promotional-contents', icon: <Image size={18} /> },
    { label: 'Sản phẩm trang chủ', to: '/staff/homepage-sections', icon: <LayoutGrid size={18} /> },
  ],
  Consultant: [
    { label: 'Tư vấn AI', to: '/staff/consultations', icon: <Headphones size={18} /> },
    { label: 'Khách hàng', to: '/staff/customers', icon: <Users size={18} /> },
  ],
};

export const StaffLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const staffNav = navigationByRole[user?.rolename ?? ''] ?? [];
  const roleName = roleLabels[user?.rolename ?? ''] ?? user?.rolename ?? 'Nhân viên';

  return (
    <div className="ops-shell flex h-screen overflow-hidden">
      <Seo title="Staff Portal - Cuong Dien Thoai" description="Khu vuc nhan vien noi bo cua Cuong Dien Thoai." noIndex />
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-[#172033] text-white">
        <div className="flex h-20 items-center border-b border-white/10 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <img src={Logo} alt="Operations Portal" className="h-14 w-auto shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="text-sm font-black leading-tight">Operations Portal</p>
              <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[#ffd166]">{roleName}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {staffNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-all ${
                  isActive
                    ? 'rounded-2xl bg-[#4f46e5] text-white shadow-[0_12px_30px_rgba(79,70,229,0.26)]'
                    : 'rounded-2xl text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-3 border-t border-white/10 p-4">
          {user && (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffd166] text-sm font-black text-[#172033]">
                {user.fullname?.charAt(0).toUpperCase() ?? 'S'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-white">{user.fullname}</p>
                <p className="truncate text-[10px] text-white/45">{roleName}</p>
              </div>
            </div>
          )}
          <NavLink
            to="/"
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-bold text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          >
            <Home size={14} /> Về trang chủ
          </NavLink>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/15 hover:text-white"
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p className="ops-label">Trung tâm vận hành</p>
            <h1 className="mt-1 text-xl font-black text-[#172033]">{roleName}</h1>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
            {new Date().toLocaleString('vi-VN')}
          </span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
