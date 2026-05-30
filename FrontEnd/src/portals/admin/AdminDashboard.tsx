import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatters';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { AlertCircle, TrendingUp, TrendingDown, DollarSign, ShoppingBag, XOctagon, CreditCard } from 'lucide-react';

// ─── Stat Card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: string | number;
  delta?: number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, delta, icon, color }) => {
  const isPositive = (delta ?? 0) > 0;
  const isNeutral = (delta ?? 0) === 0;
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
        <p className="text-2xl font-black text-slate-800 mt-1 leading-none">{value}</p>
        {delta !== undefined && (
          <p className={`text-xs font-semibold mt-2 flex items-center gap-1 ${isNeutral ? 'text-slate-400' : isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {isNeutral ? '—' : isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />} 
            {Math.abs(delta)}% so với kỳ trước
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Status Config ────────────────────────────────────────────────────────────
const statusConfig: Record<string, { label: string; colorClass: string }> = {
  Completed:  { label: 'Hoàn thành', colorClass: 'bg-emerald-500' },
  Shipped:    { label: 'Đang giao',  colorClass: 'bg-blue-500' },
  Processing: { label: 'Đang xử lý', colorClass: 'bg-amber-500' },
  Pending:    { label: 'Chờ duyệt',  colorClass: 'bg-slate-400' },
  Cancelled:  { label: 'Đã hủy',     colorClass: 'bg-red-500' },
};

// ─── Dashboard Page ───────────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const [period, setPeriod] = useState('7d');
  const { kpi, topProducts, distribution, loading, error } = useDashboard(period);

  const calculateDelta = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const calculateDeltaPts = (current: number, previous: number) => {
    return Math.round((current - previous) * 100) / 100;
  };

  const totalDist = distribution.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-6">
      {/* Page header & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-0.5">Tổng quan vận hành và kinh doanh</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 border border-slate-200">
          <button 
            onClick={() => setPeriod('7d')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${period === '7d' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            7 Ngày
          </button>
          <button 
            onClick={() => setPeriod('30d')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${period === '30d' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            30 Ngày
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* SLA Alert */}
      {!loading && kpi && kpi.pendingOverSlaCount > 0 && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg">
              <AlertCircle size={20} />
            </div>
            <div>
              <h4 className="font-bold text-red-800">Cảnh báo SLA Chờ duyệt</h4>
              <p className="text-sm text-red-600 mt-0.5">Hiện có {kpi.pendingOverSlaCount} đơn hàng Pending quá 24 giờ chưa được xử lý.</p>
            </div>
          </div>
          <Link to="/admin/orders?status=Pending" className="shrink-0 px-4 py-2 bg-white text-red-600 border border-red-200 font-bold rounded-lg text-sm hover:bg-red-50">
            Xử lý ngay
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Tổng doanh thu"
          value={loading ? '...' : kpi ? formatCurrency(kpi.totalRevenueCurrent) : '0đ'}
          delta={loading || !kpi ? undefined : calculateDelta(kpi.totalRevenueCurrent, kpi.totalRevenuePrevious)}
          color="bg-blue-100 text-blue-600"
          icon={<DollarSign size={24} />}
        />
        <StatCard
          title="Đơn thành công"
          value={loading ? '...' : kpi ? kpi.completedOrdersCurrent : 0}
          delta={loading || !kpi ? undefined : calculateDelta(kpi.completedOrdersCurrent, kpi.completedOrdersPrevious)}
          color="bg-emerald-100 text-emerald-600"
          icon={<ShoppingBag size={24} />}
        />
        <StatCard
          title="Tỷ lệ hủy đơn"
          value={loading ? '...' : kpi ? `${kpi.cancelledRateCurrent}%` : '0%'}
          delta={loading || !kpi ? undefined : calculateDeltaPts(kpi.cancelledRateCurrent, kpi.cancelledRatePrevious)}
          color="bg-red-100 text-red-600"
          icon={<XOctagon size={24} />}
        />
        <StatCard
          title="Giá trị TB đơn (AOV)"
          value={loading ? '...' : kpi ? formatCurrency(kpi.aovCurrent) : '0đ'}
          delta={loading || !kpi ? undefined : calculateDelta(kpi.aovCurrent, kpi.aovPrevious)}
          color="bg-purple-100 text-purple-600"
          icon={<CreditCard size={24} />}
        />
      </div>

      {/* Two column: Top Products + Order status distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Top Products */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-slate-200 flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Top 5 Sản Phẩm Bán Chạy Nhất</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Sản phẩm', 'Số lượng bán', 'Doanh thu'].map(h => (
                    <th key={h} className={`px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${h !== 'Sản phẩm' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-5 py-4"><div className="skeleton h-4 w-3/4" /></td>
                      <td className="px-5 py-4"><div className="skeleton h-4 w-1/2 ml-auto" /></td>
                      <td className="px-5 py-4"><div className="skeleton h-4 w-1/2 ml-auto" /></td>
                    </tr>
                  ))
                ) : topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-400">Không có dữ liệu bán hàng trong kỳ này.</td>
                  </tr>
                ) : topProducts.map((product) => (
                  <tr key={product.productId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-slate-800">
                      {product.productName}
                    </td>
                    <td className="px-5 py-4 text-right text-slate-600 font-medium">
                      {product.unitsSold}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-blue-600">
                      {formatCurrency(product.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-6">Tỷ trọng trạng thái đơn</h3>
          {loading ? (
            <div className="space-y-4">
               {Array.from({length: 4}).map((_, i) => <div key={i} className="skeleton h-8 w-full rounded" />)}
            </div>
          ) : totalDist === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">Không có dữ liệu.</p>
          ) : (
            <div className="space-y-4">
              {distribution.map(d => {
                const cfg = statusConfig[d.status] || { label: d.status, colorClass: 'bg-slate-300' };
                const pct = Math.round((d.count / totalDist) * 100);
                return (
                  <div key={d.status}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-700">{cfg.label}</span>
                      <span className="text-sm font-bold text-slate-800">{d.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${cfg.colorClass} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
