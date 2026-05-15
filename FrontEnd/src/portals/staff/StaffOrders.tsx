import React from 'react';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency, generateOrderCode } from '@/utils/formatters';

const statusColors: Record<string, string> = {
  Pending: 'border-yellow-500 text-yellow-400',
  Processing: 'border-cyan-500 text-cyan-400',
  Shipped: 'border-blue-500 text-blue-400',
  Completed: 'border-emerald-500 text-emerald-400',
  Cancelled: 'border-red-500 text-red-400',
};

const StaffOrders: React.FC = () => {
  const { orders, loading, error, updateStatus } = useOrders();

  const pendingOrders = orders.filter((o) => ['Pending', 'Processing'].includes(o.orderstatus ?? ''));

  return (
    <div>
      <div className="mb-8">
        <p className="font-mono text-xs text-zinc-600 uppercase tracking-[0.4em] mb-1">Vận hành</p>
        <h1 className="text-4xl font-black tracking-tight text-zinc-50">XFLASH ORDERS</h1>
        <div className="w-12 h-0.5 bg-cyan-400 mt-2" />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'CHỜ XỬ LÝ', value: orders.filter((o) => o.orderstatus === 'Pending').length, color: 'text-yellow-400' },
          { label: 'ĐANG XỬ LÝ', value: orders.filter((o) => o.orderstatus === 'Processing').length, color: 'text-cyan-400' },
          { label: 'ĐANG GIAO', value: orders.filter((o) => o.orderstatus === 'Shipped').length, color: 'text-blue-400' },
        ].map((s) => (
          <div key={s.label} className="bento-card p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 mb-1">{s.label}</p>
            <p className={`font-mono text-3xl font-bold ${s.color}`}>
              {loading ? '—' : s.value}
            </p>
          </div>
        ))}
      </div>

      {error && <p className="font-mono text-sm text-red-400 mb-4">{error}</p>}

      {loading ? (
        <Skeleton variant="row" />
      ) : (
        <div className="bento-card overflow-hidden">
          <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">
              Đơn hàng cần xử lý ({pendingOrders.length})
            </span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                {['MÃ ĐƠN', 'KHÁCH HÀNG', 'SDT', 'GIÁ TRỊ', 'TRẠNG THÁI', 'CẬP NHẬT'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderid} className="border-b border-zinc-800/40 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-cyan-400">
                    {generateOrderCode(order.orderid)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-300">
                    {order.customer?.fullname ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {order.customer?.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-100">
                    {formatCurrency(order.finalamount ?? order.totalamount ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColors[order.orderstatus ?? ''] ?? 'border-zinc-600 text-zinc-400'}`}>
                      {order.orderstatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-xs px-2 py-1 focus:outline-none focus:border-cyan-400 rounded-none"
                      value={order.orderstatus ?? ''}
                      onChange={(e) => updateStatus(order.orderid, e.target.value)}
                    >
                      {['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center font-mono text-xs text-zinc-600">
                    — Không có đơn hàng —
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StaffOrders;
