import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Box,
  ChevronDown,
  ClipboardList,
  Gift,
  Headphones,
  Home,
  Image,
  LayoutGrid,
  LogOut,
  Menu,
  Newspaper,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import { roleLabels } from '@/features/users/utils/authorizationLabels';
import Logo from '@/assets/Logo.webp';
import { Seo } from '@/components/Seo';

interface StaffNavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
  permission: string;
}

interface StaffNavGroup {
  label: string;
  icon: React.ReactNode;
  to?: string;
  end?: boolean;
  permission?: string;
  items?: StaffNavItem[];
}

const staffNavigation: StaffNavGroup[] = [
  { label: 'Tổng quan', to: '/staff/manager', end: true, icon: <BarChart3 size={17} />, permission: 'dashboard.view' },
  {
    label: 'Đơn hàng', icon: <ClipboardList size={17} />, items: [
      { label: 'Danh sách đơn hàng', to: '/staff/orders', icon: <ClipboardList size={16} />, permission: 'orders.view' },
      { label: 'Hàng đợi Sales', to: '/staff/sales-orders', icon: <UserCheck size={16} />, permission: 'orders.manage' },
      { label: 'Hàng đợi kho', to: '/staff/warehouse-orders', icon: <Truck size={16} />, permission: 'inventory.manage' },
      { label: 'Vận chuyển', to: '/staff/shipments', icon: <Truck size={16} />, permission: 'shipments.view' },
      { label: 'Đổi trả & hoàn tiền', to: '/staff/returns', icon: <RotateCcw size={16} />, permission: 'returns.view' },
    ],
  },
  {
    label: 'Hàng hóa', icon: <Package size={17} />, items: [
      { label: 'Sản phẩm', to: '/staff/products', icon: <Package size={16} />, permission: 'products.manage' },
      { label: 'Kho & IMEI', to: '/staff/inventory', icon: <Box size={16} />, permission: 'inventory.view' },
    ],
  },
  { label: 'Bảo hành', to: '/staff/warranties', icon: <ShieldCheck size={17} />, permission: 'warranties.view' },
  { label: 'Khách hàng', to: '/staff/customers', icon: <Users size={17} />, permission: 'customers.view' },
  { label: 'Voucher', to: '/staff/vouchers', icon: <Gift size={17} />, permission: 'vouchers.manage' },
  {
    label: 'Nội dung', icon: <Newspaper size={17} />, items: [
      { label: 'Không gian nội dung', to: '/staff/content', icon: <BarChart3 size={16} />, permission: 'content.manage' },
      { label: 'Tin tức', to: '/staff/news', icon: <Newspaper size={16} />, permission: 'content.manage' },
      { label: 'Banner & slider', to: '/staff/promotional-contents', icon: <Image size={16} />, permission: 'content.manage' },
      { label: 'Sản phẩm trang chủ', to: '/staff/homepage-sections', icon: <LayoutGrid size={16} />, permission: 'content.manage' },
    ],
  },
  { label: 'Tư vấn trực tiếp', to: '/staff/consultations', icon: <Headphones size={17} />, permission: 'consultations.manage' },
];

const isPathActive = (pathname: string, item: StaffNavGroup) => {
  if (item.end) return pathname === item.to;
  if (item.to) return pathname.startsWith(item.to);
  return item.items?.some(child => pathname.startsWith(child.to)) ?? false;
};

export const StaffLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const permissionSet = new Set(user?.permissions ?? []);
  const can = (permission: string) => permissionSet.has('*') || permissionSet.has(permission);
  const staffNav = staffNavigation
    .map(item => item.items ? ({ ...item, items: item.items.filter(child => can(child.permission)) }) : item)
    .filter(item => item.items ? item.items.length > 0 : !!item.permission && can(item.permission));
  const roleName = (user?.rolenames?.length ? user.rolenames : [user?.rolename ?? ''])
    .filter(Boolean).map(role => roleLabels[role] ?? role).join(' · ') || 'Nhân viên';

  useEffect(() => {
    setOpenGroup(null);
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="ops-shell design-system-shell min-h-screen">
      <Seo title="Staff Portal - Cuồng Điện Thoại" description="Khu vực nhân viên nội bộ của Cuồng Điện Thoại." noIndex />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
          <Link to={staffNav[0]?.to ?? '/'} className="flex min-w-0 items-center gap-3">
            <img src={Logo} alt="Cuồng Điện Thoại" width={400} height={188} className="h-12 w-auto shrink-0 object-contain" />
            <div className="hidden min-w-0 sm:block">
              <p className="text-sm font-black leading-tight text-[#172033]">Trung tâm vận hành</p>
              <p className="truncate text-[11px] text-slate-400">{roleName}</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Hệ thống hoạt động
            </div>

            <div className="hidden items-center gap-2 border-l border-slate-200 pl-3 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#172033] text-xs font-black text-white">
                {user?.fullname?.charAt(0).toUpperCase() ?? 'S'}
              </div>
              <div className="hidden max-w-40 lg:block">
                <p className="truncate text-xs font-bold text-[#172033]">{user?.fullname ?? 'Nhân viên'}</p>
                <p className="truncate text-[10px] text-slate-400">{roleName}</p>
              </div>
            </div>

            <Link to="/" title="Về trang chủ" className="p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#172033]">
              <Home size={17} />
            </Link>
            <button type="button" onClick={logout} title="Đăng xuất" className="p-2 text-red-500 transition hover:bg-red-50">
              <LogOut size={17} />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(value => !value)}
              className="p-2 text-slate-600 transition hover:bg-slate-100 min-[960px]:hidden"
              aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <nav className="hidden h-12 items-stretch gap-1 border-t border-slate-100 px-4 min-[960px]:flex lg:px-6">
          {staffNav.map(item => {
            const active = isPathActive(location.pathname, item);

            if (item.items) {
              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => setOpenGroup(item.label)}
                  onMouseLeave={() => setOpenGroup(null)}
                >
                  <button
                    type="button"
                    onClick={() => setOpenGroup(openGroup === item.label ? null : item.label)}
                    className={`my-1 flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-slate-100 text-[#172033]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-[#172033]'
                    }`}
                  >
                    {item.label}
                    <ChevronDown size={14} className={`transition-transform ${openGroup === item.label ? 'rotate-180' : ''}`} />
                  </button>

                  {openGroup === item.label && (
                    <div className="absolute left-0 top-full min-w-64 pt-2">
                      <div className="ops-card p-2 shadow-xl shadow-slate-900/10">
                        {item.items.map(child => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-3 py-2.5 text-sm font-bold transition-colors ${
                                isActive
                                  ? 'rounded-xl bg-[#e30613] text-white'
                                  : 'rounded-xl text-slate-600 hover:bg-slate-50 hover:text-[#172033]'
                              }`
                            }
                          >
                            <span className="text-slate-400">{child.icon}</span>
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <NavLink
                key={item.label}
                to={item.to!}
                end={item.end}
                className={() =>
                  `my-1 flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-slate-100 text-[#172033]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#172033]'
                  }`
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {mobileOpen && (
          <nav className="mobile-nav-panel max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 px-4 py-3 min-[960px]:hidden">
            <div className="grid gap-1">
              {staffNav.map(item => {
                const active = isPathActive(location.pathname, item);

                if (item.items) {
                  const expanded = openGroup === item.label;
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => setOpenGroup(expanded ? null : item.label)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${
                          active ? 'bg-[#e30613] text-white' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-3">{item.icon}{item.label}</span>
                        <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>

                      {expanded && (
                        <div className="ml-5 space-y-1 border-l border-slate-200 py-1 pl-3">
                          {item.items.map(child => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              className={({ isActive }) =>
                                `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium ${
                                  isActive ? 'bg-[#e30613] text-white' : 'text-slate-600 hover:bg-slate-50'
                                }`
                              }
                            >
                              {child.icon}
                              {child.label}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.label}
                    to={item.to!}
                    end={item.end}
                    className={() =>
                      `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${
                        active ? 'bg-[#e30613] text-white' : 'text-slate-700 hover:bg-slate-50'
                      }`
                    }
                  >
                    {item.icon}
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      <main className="p-4 lg:p-6">
        <Outlet />
      </main>
    </div>
  );
};
