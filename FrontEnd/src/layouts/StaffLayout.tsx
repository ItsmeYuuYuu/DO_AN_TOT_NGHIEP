import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ClipboardList, Box, ShieldCheck, Home, LogOut } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import Logo from '@/assets/Logo.png';

const staffNav = [
  { label: 'Đơn hàng', to: '/staff', icon: <ClipboardList size={18} />, end: true },
  { label: 'Kho hàng', to: '/staff/inventory', icon: <Box size={18} /> },
  { label: 'Bảo hành', to: '/staff/warranties', icon: <ShieldCheck size={18} /> },
];

export const StaffLayout: React.FC = () => {
  const { user, logout } = useAuth();
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-white border-r border-slate-200 shrink-0">
        <div className="px-6 h-20 flex items-center border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <img src={Logo} alt="Staff Portal" className="h-14 w-auto object-contain shrink-0" />
            <span className="font-bold text-slate-800 text-sm tracking-tight">Staff Portal</span>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1">
          {staffNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all
                 ${isActive 
                   ? 'bg-emerald-50 text-emerald-700' 
                   : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-2">
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0">
                {user.fullname?.charAt(0).toUpperCase() ?? 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{user.fullname}</p>
                <p className="text-[10px] text-slate-400">{user.rolename}</p>
              </div>
            </div>
          )}
          <NavLink to="/" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition-colors px-2 py-1.5 rounded-lg hover:bg-slate-50">
            <Home size={14} /> Về trang chủ
          </NavLink>
          <button onClick={logout} className="flex items-center gap-2 text-xs text-red-500 hover:text-red-600 font-semibold transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-red-50">
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between shrink-0">
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-600">
            Operations Center
          </span>
          <span className="font-mono text-xs text-zinc-700">
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
