import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Boxes,
  ChevronDown,
  FileText,
  Gift,
  Headphones,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  Package,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Tags,
  Truck,
  UserCheck,
  Users,
  Users2,
  X,
} from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import Logo from '@/assets/Logo.png';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  end?: boolean;
}

interface NavGroup {
  label: string;
  icon: React.ReactNode;
  to?: string;
  end?: boolean;
  items?: NavItem[];
}

const adminNav: NavGroup[] = [
  {
    label: 'Đổi trả',
    to: '/admin/returns',
    icon: <RotateCcw size={17} />,
  },
  {
    label: 'Tổng quan',
    to: '/admin',
    end: true,
    icon: <LayoutDashboard size={17} />,
  },
  {
    label: 'Hàng hóa',
    icon: <Package size={17} />,
    items: [
      { label: 'Sản phẩm', to: '/admin/products', icon: <Package size={16} /> },
      { label: 'Danh mục & thương hiệu', to: '/admin/categories', icon: <Tags size={16} /> },
      { label: 'Tồn kho', to: '/admin/inventory', icon: <Boxes size={16} /> },
    ],
  },
  {
    label: 'Đơn hàng',
    icon: <ShoppingCart size={17} />,
    items: [
      { label: 'Danh sách đơn hàng', to: '/admin/orders', icon: <ShoppingCart size={16} /> },
      { label: 'Hàng đợi Sales', to: '/admin/sales-orders', icon: <UserCheck size={16} /> },
      { label: 'Hàng đợi kho', to: '/admin/warehouse-orders', icon: <Truck size={16} /> },
      { label: 'Quản lý bảo hành', to: '/admin/warranties', icon: <ShieldCheck size={16} /> },
    ],
  },
  {
    label: 'Khách hàng',
    icon: <Users2 size={17} />,
    items: [
      { label: 'Danh sách khách hàng', to: '/admin/customers', icon: <Users2 size={16} /> },
      { label: 'Tư vấn AI', to: '/admin/consultations', icon: <Headphones size={16} /> },
    ],
  },
  {
    label: 'Nhân viên',
    to: '/admin/users',
    icon: <Users size={17} />,
  },
  {
    label: 'Khuyến mãi',
    icon: <Gift size={17} />,
    items: [
      { label: 'Voucher', to: '/admin/vouchers', icon: <Gift size={16} /> },
      { label: 'Gói bảo hành', to: '/admin/warranty-packages', icon: <ShieldCheck size={16} /> },
    ],
  },
  {
    label: 'Nội dung',
    icon: <Newspaper size={17} />,
    items: [
      { label: 'Tin tức', to: '/admin/news', icon: <FileText size={16} /> },
      { label: 'Banner & slider', to: '/admin/promotional-contents', icon: <Newspaper size={16} /> },
    ],
  },
  {
    label: 'Nhật ký',
    to: '/admin/auditlogs',
    icon: <Activity size={17} />,
  },
  {
    label: 'Phân tích',
    to: '/admin#phan-tich',
    icon: <BarChart3 size={17} />,
  },
];

const isPathActive = (pathname: string, hash: string, item: NavGroup) => {
  if (item.to === '/admin#phan-tich') {
    return pathname === '/admin' && hash === '#phan-tich';
  }
  if (item.end) return pathname === item.to && hash !== '#phan-tich';
  if (item.to && item.to !== '/admin#phan-tich') return pathname.startsWith(item.to);
  return item.items?.some((child) => pathname.startsWith(child.to)) ?? false;
};

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setOpenGroup(null);
    setMobileOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!location.hash) return;

    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="h-16 px-4 lg:px-6 flex items-center justify-between gap-4">
          <Link to="/admin" className="flex items-center gap-3 min-w-0">
            <img src={Logo} alt="Admin Logo" className="h-12 w-auto object-contain shrink-0" />
            <div className="hidden sm:block min-w-0">
              <p className="font-black text-slate-800 text-sm leading-tight">ECommerce Admin</p>
              <p className="text-[11px] text-slate-400 truncate">Hệ thống quản trị bán hàng</p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Hệ thống hoạt động
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-black">
                {user?.fullname?.charAt(0).toUpperCase() ?? 'A'}
              </div>
              <div className="hidden lg:block max-w-36">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.fullname ?? 'Admin'}</p>
                <p className="text-[10px] text-slate-400 truncate">{user?.email ?? ''}</p>
              </div>
            </div>

            <Link
              to="/"
              title="Về trang chủ"
              className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <Home size={17} />
            </Link>
            <button
              type="button"
              onClick={logout}
              title="Đăng xuất"
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
            >
              <LogOut size={17} />
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              className="min-[960px]:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        <nav className="hidden min-[960px]:flex h-12 px-4 lg:px-6 items-stretch gap-1 border-t border-slate-100">
          {adminNav.map((item) => {
            const active = isPathActive(location.pathname, location.hash, item);

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
                    className={`h-full px-2.5 flex items-center gap-1.5 text-sm font-bold border-b-2 transition-colors ${
                      active
                        ? 'text-blue-600 border-blue-600'
                        : 'text-slate-700 border-transparent hover:text-blue-600 hover:border-blue-200'
                    }`}
                  >
                    {item.label}
                    <ChevronDown
                      size={14}
                      className={`transition-transform ${openGroup === item.label ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {openGroup === item.label && (
                    <div className="absolute top-full left-0 pt-2 min-w-60">
                      <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-2">
                        {item.items.map((child) => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                                isActive
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
                  `h-full px-2.5 flex items-center gap-1.5 text-sm font-bold border-b-2 transition-colors ${
                    active
                      ? 'text-blue-600 border-blue-600'
                      : 'text-slate-700 border-transparent hover:text-blue-600 hover:border-blue-200'
                  }`
                }
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {mobileOpen && (
          <nav className="min-[960px]:hidden border-t border-slate-200 px-4 py-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="grid gap-1">
              {adminNav.map((item) => {
                const active = isPathActive(location.pathname, location.hash, item);

                if (item.items) {
                  const expanded = openGroup === item.label;
                  return (
                    <div key={item.label}>
                      <button
                        type="button"
                        onClick={() => setOpenGroup(expanded ? null : item.label)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-bold ${
                          active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          {item.icon}
                          {item.label}
                        </span>
                        <ChevronDown size={15} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>

                      {expanded && (
                        <div className="ml-5 pl-3 border-l border-slate-200 py-1 space-y-1">
                          {item.items.map((child) => (
                            <NavLink
                              key={child.to}
                              to={child.to}
                              className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                                  isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
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
                      `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold ${
                        active ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50'
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
