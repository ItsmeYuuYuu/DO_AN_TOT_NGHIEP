import React from 'react';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency, generateOrderCode } from '@/utils/formatters';
import { Package, Clock, Truck } from 'lucide-react';
import { ordersApi } from '@/features/orders/api/ordersApi';

const statusConfig: Record<string, { label: string; cls: string }> = {
  Pending:    { label: 'Chờ xử lý', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  Processing: { label: 'Đang xử lý', cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
  Shipped:    { label: 'Đang giao',    cls: 'bg-purple-100 text-purple-700 border border-purple-200' },
  Completed:  { label: 'Hoàn thành',   cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  Cancelled:  { label: 'Đã hủy',       cls: 'bg-red-100 text-red-700 border border-red-200' },
};

const StaffOrders: React.FC = () => {
  const { orders, loading, error, refetch, updateStatus } = useOrders();
  const [updatingId, setUpdatingId] = React.useState<number | null>(null);
  const [actionError, setActionError] = React.useState('');
  const pendingOrders = orders.filter((o) => ['Pending', 'Processing'].includes(o.orderstatus ?? ''));

  const changeStatus = async (orderId: number, status: string) => {
    setUpdatingId(orderId);
    setActionError('');
    try {
      await updateStatus(orderId, status);
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Không thể cập nhật trạng thái đơn hàng.');
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmPayment = async (orderId: number) => {
    setUpdatingId(orderId);
    setActionError('');
    try {
      await ordersApi.confirmPayment(orderId);
      await refetch();
    } catch (err: any) {
      setActionError(err?.response?.data?.message ?? 'Không thể xác nhận thanh toán.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Vận hành</p>
        <h1 className="text-2xl font-black text-slate-800">Quản lý Đơn hàng</h1>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Chờ xử lý', value: orders.filter((o) => o.orderstatus === 'Pending').length,    icon: <Clock size={20} className="text-amber-500" />,   bg: 'bg-amber-50',   val: 'text-amber-600' },
          { label: 'Đang xử lý', value: orders.filter((o) => o.orderstatus === 'Processing').length, icon: <Package size={20} className="text-blue-500" />,   bg: 'bg-blue-50',    val: 'text-blue-600' },
          { label: 'Đang giao',    value: orders.filter((o) => o.orderstatus === 'Shipped').length,     icon: <Truck size={20} className="text-purple-500" />,  bg: 'bg-purple-50',  val: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-slate-100`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{s.label}</p>
              {s.icon}
            </div>
            <p className={`text-3xl font-black ${s.val}`}>{loading ? '—' : s.value}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}
      {actionError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{actionError}</p>}

      {/* Table */}
      {loading ? (
        <Skeleton variant="row" />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-slate-700">
                Tất cả đơn hàng · <span className="text-slate-400 font-normal">{orders.length} đơn</span>
              </span>
            </div>
            {pendingOrders.length > 0 && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                {pendingOrders.length} cần xử lý
              </span>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Mã đơn', 'Khách hàng', 'SĐT', 'Giá trị', 'Thanh toán', 'Trạng thái', 'Cập nhật'].map((col) => (
                  <th key={col} className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => (
                <tr key={order.orderid} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold text-blue-600">
                    {generateOrderCode(order.orderid)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                    {order.customer?.fullname ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {order.customer?.phone ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900">
                    {formatCurrency(order.finalamount ?? order.totalamount ?? 0)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-700">{order.paymentmethod ?? '—'}</p>
                      <p className={`text-[11px] font-semibold ${order.paymentstatus === 'Paid' ? 'text-emerald-600' : order.paymentstatus === 'DepositPaid' ? 'text-blue-600' : 'text-amber-600'}`}>
                        {order.paymentstatus ?? 'Chưa ghi nhận'}
                      </p>
                      {order.paymentmethod !== 'COD' &&
                        order.paymentstatus !== 'Paid' &&
                        order.orderstatus !== 'Cancelled' && (
                          <button
                            type="button"
                            disabled={updatingId === order.orderid}
                            onClick={() => confirmPayment(order.orderid)}
                            className="text-[11px] font-bold text-blue-600 hover:underline disabled:opacity-50"
                          >
                            Xác nhận thanh toán
                          </button>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${(statusConfig[order.orderstatus ?? ''] ?? statusConfig['Pending']).cls}`}>
                      {(statusConfig[order.orderstatus ?? ''] ?? { label: order.orderstatus }).label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-blue-400 hover:border-slate-300 transition-colors"
                      value={order.orderstatus ?? ''}
                      disabled={updatingId === order.orderid}
                      onChange={(e) => changeStatus(order.orderid, e.target.value)}
                    >
                      {['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'].map((s) => (
                        <option key={s} value={s}>{(statusConfig[s] ?? { label: s }).label}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-sm text-slate-400">
                    <Package size={32} className="mx-auto mb-3 text-slate-200" />
                    Chưa có đơn hàng nào.
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
