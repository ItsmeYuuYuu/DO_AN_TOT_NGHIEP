import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const staffNav = [
  { label: 'Đơn hàng', to: '/staff', icon: '◉', end: true },
  { label: 'Kho hàng', to: '/staff/inventory', icon: '▣' },
  { label: 'Nhập hàng', to: '/staff/purchase-orders', icon: '◈' },
  { label: 'Bảo hành', to: '/staff/warranties', icon: '◆' },
];

export const StaffLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-white border-r border-slate-200 shrink-0">
        <div className="px-6 h-16 flex items-center border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-600 rounded flex items-center justify-center text-white font-bold text-xs">S</div>
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

        <div className="p-4 border-t border-slate-100">
          <NavLink to="/" className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition-colors">
            ← Về trang chủ
          </NavLink>
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
