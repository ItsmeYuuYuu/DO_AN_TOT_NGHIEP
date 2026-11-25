import React from 'react';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { Skeleton } from '@/components/Skeleton';
import { formatCurrency, generateOrderCode } from '@/utils/formatters';
import { Package, Clock, Truck, MapPin } from 'lucide-react';
import { ordersApi } from '@/features/orders/api/ordersApi';
import type { Order } from '@/features/orders/api/ordersApi';
import { getApiErrorMessage } from '@/utils/apiError';
import { Modal } from '@/components/Modal';

const statusConfig: Record<string, { label: string; cls: string }> = {
  Pending:    { label: 'Chờ xử lý', cls: 'bg-amber-100 text-amber-700 border border-amber-200' },
  Processing: { label: 'Đang xử lý', cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
  Shipped:    { label: 'Đang giao',    cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
  Completed:  { label: 'Hoàn thành',   cls: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  Cancelled:  { label: 'Đã hủy',       cls: 'bg-red-100 text-red-700 border border-red-200' },
};

const StaffOrders: React.FC = () => {
  const { orders, loading, error, refetch, updateStatus } = useOrders();
  const [updatingId, setUpdatingId] = React.useState<number | null>(null);
  const [actionError, setActionError] = React.useState('');
  const [selectedOrder, setSelectedOrder] = React.useState<Order | null>(null);
  const pendingOrders = orders.filter((o) => ['Pending', 'Processing'].includes(o.orderstatus ?? ''));

  const changeStatus = async (orderId: number, status: string) => {
    setUpdatingId(orderId);
    setActionError('');
    try {
      await updateStatus(orderId, status);
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Không thể cập nhật trạng thái đơn hàng.'));
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
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Không thể xác nhận thanh toán.'));
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ops-hero p-6">
        <h1 className="ops-hero-title">Quản lý đơn hàng</h1>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Chờ xử lý', value: orders.filter((o) => o.orderstatus === 'Pending').length, icon: <Clock size={20} /> },
          { label: 'Đang xử lý', value: orders.filter((o) => o.orderstatus === 'Processing').length, icon: <Package size={20} /> },
          { label: 'Đang giao', value: orders.filter((o) => o.orderstatus === 'Shipped').length, icon: <Truck size={20} /> },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between mb-1">
              <p className="text-2xl font-black text-slate-900">{loading ? '...' : s.value}</p>
              <div className="text-[#c4000b]">{s.icon}</div>
            </div>
            <p className="text-xs font-bold text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{error}</p>}
      {actionError && <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{actionError}</p>}

      {/* Table */}
      {loading ? (
        <Skeleton variant="row" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
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

          <table className="w-full min-w-[760px]">
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
                <tr key={order.orderid} className="hover:bg-red-50/40 transition-colors">
                  <td className="px-4 py-3 text-sm font-bold">
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="text-[#e30613] hover:underline"
                    >
                      {generateOrderCode(order.orderid)}
                    </button>
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
                      <p className={`text-[11px] font-semibold ${order.paymentstatus === 'Paid' ? 'text-emerald-600' : order.paymentstatus === 'DepositPaid' ? 'text-[#e30613]' : 'text-amber-600'}`}>
                        {order.paymentstatus ?? 'Chưa ghi nhận'}
                      </p>
                      {order.paymentmethod !== 'COD' &&
                        order.paymentstatus !== 'Paid' &&
                        order.orderstatus !== 'Cancelled' && (
                          <button
                            type="button"
                            disabled={updatingId === order.orderid}
                            onClick={() => confirmPayment(order.orderid)}
                            className="text-[11px] font-bold text-[#e30613] hover:underline disabled:opacity-50"
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
                      className="bg-white border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-2xl focus:outline-none focus:border-[#e30613] hover:border-slate-300 transition-colors"
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

      <Modal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        title={`Chi tiết đơn hàng ${selectedOrder ? generateOrderCode(selectedOrder.orderid) : ''}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-4 items-start justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Trạng thái hiện tại</p>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${(statusConfig[selectedOrder.orderstatus ?? ''] ?? statusConfig['Pending']).cls}`}>
                  {(statusConfig[selectedOrder.orderstatus ?? ''] ?? { label: selectedOrder.orderstatus }).label}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-slate-500 mb-1">Tổng thanh toán</p>
                <p className="text-lg font-black text-[#e30613]">{formatCurrency(selectedOrder.finalamount ?? selectedOrder.totalamount ?? 0)}</p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-[#c4000b]" /> Thông tin giao hàng
              </h3>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm space-y-2">
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-bold text-slate-500">Khách hàng:</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.shippingname || selectedOrder.customer?.fullname || '—'}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-bold text-slate-500">Số điện thoại:</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.shippingphone || selectedOrder.customer?.phone || '—'}</span>
                </div>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <span className="font-bold text-slate-500">Địa chỉ:</span>
                  <span className="font-semibold text-slate-900">{selectedOrder.shippingaddress || '—'}</span>
                </div>
                {selectedOrder.customernote && (
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="font-bold text-slate-500">Ghi chú:</span>
                    <span className="font-semibold text-slate-900">{selectedOrder.customernote}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <Package size={16} className="text-[#c4000b]" /> Danh sách sản phẩm
              </h3>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-bold">Sản phẩm</th>
                      <th className="px-4 py-2 font-bold text-right">Đơn giá</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedOrder.orderitems?.map((item) => (
                      <tr key={item.orderitemid} className="bg-white">
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-800">{item.productname}</p>
                          <p className="text-xs text-slate-500 mt-0.5">Phân loại: {item.variantsku ?? '—'}</p>
                          {item.imei && <p className="text-xs font-semibold text-blue-600 mt-0.5">IMEI: {item.imei}</p>}
                          {item.packagename && <p className="text-[11px] text-slate-400 mt-0.5">+ {item.packagename}</p>}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          <p>{formatCurrency(item.sellingprice)}</p>
                          {!!item.warrantyprice && <p className="text-[11px] font-normal text-slate-400">+{formatCurrency(item.warrantyprice)}</p>}
                        </td>
                      </tr>
                    ))}
                    {(!selectedOrder.orderitems || selectedOrder.orderitems.length === 0) && (
                      <tr>
                        <td colSpan={2} className="px-4 py-6 text-center text-slate-400">Không có sản phẩm nào.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffOrders;
