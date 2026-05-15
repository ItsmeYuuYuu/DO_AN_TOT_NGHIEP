import React from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { useProducts } from '@/features/products/hooks/useProducts';
import { useOrders } from '@/features/orders/hooks/useOrders';

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  delta?: string;
  deltaPositive?: boolean;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, delta, deltaPositive = true, icon, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} shrink-0`}>
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-black text-slate-800 mt-1 leading-none">{value}</p>
      {delta && (
        <p className={`text-xs font-semibold mt-1 ${deltaPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {deltaPositive ? '↑' : '↓'} {delta} so với tháng trước
        </p>
      )}
    </div>
  </div>
);

// ─── Order Status Badge ───────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; classes: string }> = {
  Completed:  { label: 'Hoàn thành', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  Shipped:    { label: 'Đang giao',  classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  Processing: { label: 'Đang xử lý',classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  Pending:    { label: 'Chờ duyệt',  classes: 'bg-slate-100 text-slate-600 border border-slate-200' },
  Cancelled:  { label: 'Đã hủy',    classes: 'bg-red-50 text-red-600 border border-red-200' },
};

const StatusBadge: React.FC<{ status?: string }> = ({ status }) => {
  const cfg = statusConfig[status ?? ''] ?? { label: status ?? '—', classes: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const { products, loading: pLoading } = useProducts();
  const { orders, loading: oLoading } = useOrders();

  const totalRevenue = orders.filter(o => o.orderstatus === 'Completed').reduce((s, o) => s + (o.finalamount ?? 0), 0);
  const pendingCount = orders.filter(o => o.orderstatus === 'Pending').length;
  const recentOrders = [...orders].sort((a, b) => new Date(b.orderdate ?? 0).getTime() - new Date(a.orderdate ?? 0).getTime()).slice(0, 7);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-black text-slate-800">Dashboard</h2>
        <p className="text-sm text-slate-500 mt-0.5">Tổng quan toàn hệ thống</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Tổng doanh thu"
          value={oLoading ? '...' : formatCurrency(totalRevenue)}
          delta="18.5%"
          deltaPositive
          color="bg-blue-100"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Tổng đơn hàng"
          value={oLoading ? '...' : orders.length}
          delta="12.3%"
          deltaPositive
          color="bg-purple-100"
          icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
        />
        <StatCard
          title="Sản phẩm đang bán"
          value={pLoading ? '...' : products.length}
          color="bg-emerald-100"
          icon={<svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
        />
        <StatCard
          title="Đơn chờ xử lý"
          value={oLoading ? '...' : pendingCount}
          delta={pendingCount > 0 ? `${pendingCount} đơn cần duyệt` : undefined}
          deltaPositive={false}
          color="bg-amber-100"
          icon={<svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Two column: Recent Orders + Order status donut */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent orders table */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Đơn hàng gần đây</h3>
            <Link to="/admin/orders" className="text-xs text-blue-600 font-semibold hover:underline">Xem tất cả →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Mã đơn', 'Khách hàng', 'Giá trị', 'Trạng thái', 'Ngày đặt'].map(h => (
                    <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {oLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-5 py-3"><div className="skeleton h-4 w-3/4" /></td>
                      ))}
                    </tr>
                  ))
                ) : recentOrders.map(order => (
                  <tr key={order.orderid} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-blue-600">
                      #{String(order.orderid).padStart(5, '0')}
                    </td>
                    <td className="px-5 py-3 text-slate-700">
                      {order.customer?.fullname ?? `KH #${order.customerid ?? '—'}`}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800">
                      {formatCurrency(order.finalamount ?? 0)}
                    </td>
                    <td className="px-5 py-3"><StatusBadge status={order.orderstatus} /></td>
                    <td className="px-5 py-3 text-slate-500 text-xs">
                      {order.orderdate ? formatDate(order.orderdate) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Phân tích trạng thái đơn</h3>
          <div className="space-y-3">
            {Object.entries(statusConfig).map(([key, cfg]) => {
              const count = orders.filter(o => o.orderstatus === key).length;
              const pct = orders.length ? Math.round((count / orders.length) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-slate-600">{cfg.label}</span>
                    <span className="text-xs font-bold text-slate-800">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
