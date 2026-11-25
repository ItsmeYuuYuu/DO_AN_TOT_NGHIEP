import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock3, Download, PackageCheck, Search, ShoppingCart, WalletCards, XCircle } from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { useOrders } from '@/features/orders/hooks/useOrders';
import type { Order } from '@/features/orders/api/ordersApi';
import { ordersApi } from '@/features/orders/api/ordersApi';
import { formatCurrency, formatDateInput, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { getApiErrorMessage } from '@/utils/apiError';
import { notifyError, notifyWarning } from '@/utils/notifications';


const PAGE_SIZE = 10;

const statusConfig: Record<string, { label: string; classes: string }> = {
  Completed: { label: 'Hoàn thành', classes: 'bg-[#ecfdf3] text-[#027a48]' },
  Shipped: { label: 'Đang giao', classes: 'bg-[#eff8ff] text-[#175cd3]' },
  Returned: { label: 'Hoàn về kho', classes: 'bg-[#f2f4f7] text-[#344054]' },
  Processing: { label: 'Đang xử lý', classes: 'bg-[#fffaeb] text-[#b54708]' },
  Pending: { label: 'Chờ duyệt', classes: 'bg-[#f2f4f7] text-[#475467]' },
  Cancelled: { label: 'Đã hủy', classes: 'bg-[#fef3f2] text-[#b42318]' },
};

const statusOptions = ['Pending', 'Processing', 'Cancelled'];
const statusTabs = ['all', 'Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled', 'Returned'];
const orderProgress = ['Pending', 'Processing', 'Shipped', 'Completed'];

const AdminOrders: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryStatus = searchParams.get('status');
  const { orders, loading, error, refetch, updateStatus, bulkUpdateStatus } = useOrders();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [paymentUpdating, setPaymentUpdating] = useState(false);

  useEffect(() => {
    if (queryStatus && statusTabs.includes(queryStatus)) {
      setFilterStatus(queryStatus);
      setPage(1);
    }
  }, [queryStatus]);

  const filtered = useMemo(() => orders.filter(order => {
    const keyword = search.trim().toLowerCase();
    const matchStatus = filterStatus === 'all' || order.orderstatus === filterStatus;
    const matchSearch =
      !keyword ||
      String(order.orderid).includes(keyword) ||
      (order.customer?.fullname ?? order.shippingname ?? '').toLowerCase().includes(keyword) ||
      (order.customer?.phone ?? order.shippingphone ?? '').includes(keyword);

    let matchDate = true;
    if (order.orderdate) {
      const orderDate = formatDateInput(order.orderdate);
      if (dateFrom && orderDate < dateFrom) matchDate = false;
      if (dateTo && orderDate > dateTo) matchDate = false;
    }

    return matchStatus && matchSearch && matchDate;
  }), [dateFrom, dateTo, filterStatus, orders, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);
  const totalRevenue = filtered.reduce((sum, order) => sum + (order.finalamount ?? 0), 0);
  const pendingCount = orders.filter(order => order.orderstatus === 'Pending').length;
  const processingCount = orders.filter(order => order.orderstatus === 'Processing').length;
  const paidCount = orders.filter(order => order.paymentstatus === 'Paid' || order.paymentstatus === 'DepositPaid').length;

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await updateStatus(id, status);
    } catch (requestError) {
      notifyError(getApiErrorMessage(requestError, 'Không thể cập nhật trạng thái đơn hàng.'));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!viewOrder) return;
    setPaymentUpdating(true);
    try {
      await ordersApi.confirmPayment(viewOrder.orderid);
      const refreshed = await ordersApi.getById(viewOrder.orderid);
      setViewOrder(refreshed.data);
      await refetch();
    } catch (requestError) {
      notifyError(getApiErrorMessage(requestError, 'Không thể xác nhận thanh toán.'));
    } finally {
      setPaymentUpdating(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setUpdatingId(-1);
    try {
      const response = await bulkUpdateStatus(Array.from(selectedIds), bulkStatus);
      const newSelected = new Set(selectedIds);
      response.updatedOrderIds.forEach((id: number) => newSelected.delete(id));
      setSelectedIds(newSelected);

      if (response.failed && response.failed.length > 0) {
        const errorLines = response.failed.map((failed: { orderId: number; reason: string }) =>
          `Đơn #${failed.orderId}: ${failed.reason}`,
        ).join('\n');
        notifyWarning(`Cập nhật một phần.\n\nThành công: ${response.updatedOrderIds.length}\nThất bại: ${response.failed.length}\n\nLý do:\n${errorLines}`);
      } else {
        setBulkStatus('');
      }
    } catch {
      notifyError('Lỗi hệ thống khi cập nhật trạng thái.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Mã đơn', 'Ngày đặt', 'Khách hàng', 'SĐT', 'Trạng thái', 'Giá trị', 'Thanh toán'];
    const rows = filtered.map(order => [
      order.orderid,
      order.orderdate ? formatDateTime(order.orderdate) : '',
      `"${order.customer?.fullname ?? order.shippingname ?? ''}"`,
      `"${order.customer?.phone ?? order.shippingphone ?? ''}"`,
      statusConfig[order.orderstatus ?? '']?.label ?? order.orderstatus,
      order.finalamount,
      order.paymentmethod,
    ]);
    const csvContent = `data:text/csv;charset=utf-8,\uFEFF${headers.join(',')}\n${rows.map(row => row.join(',')).join('\n')}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length && paged.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map(order => order.orderid)));
    }
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const columns = [
    {
      key: 'checkbox',
      header: (
        <input
          type="checkbox"
          checked={paged.length > 0 && selectedIds.size === paged.length}
          onChange={toggleSelectAll}
          className="accent-[#e30613]"
        />
      ),
      className: 'w-10 text-center',
      render: (order: Order) => (
        <input
          type="checkbox"
          checked={selectedIds.has(order.orderid)}
          onChange={() => toggleSelect(order.orderid)}
          className="accent-[#e30613]"
        />
      ),
    },
    {
      key: 'orderid',
      header: 'Mã đơn',
      render: (order: Order) => (
        <button onClick={() => setViewOrder(order)} className="text-xs font-black text-[#c4000b] hover:underline">
          #{String(order.orderid).padStart(5, '0')}
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (order: Order) => (
        <div>
          <p className="text-sm font-black text-[#172033]">
            {order.customer?.fullname ?? order.shippingname ?? `KH #${order.customerid ?? '—'}`}
          </p>
          <p className="text-xs font-semibold text-slate-400">{order.customer?.phone ?? order.shippingphone ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'finalamount',
      header: 'Giá trị',
      render: (order: Order) => (
        <div>
          <p className="font-black text-[#172033]">{formatCurrency(order.finalamount ?? 0)}</p>
          {(order.discountamount ?? 0) > 0 && (
            <p className="text-xs font-bold text-emerald-600">-{formatCurrency(order.discountamount!)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'paymentmethod',
      header: 'Thanh toán',
      render: (order: Order) => (
        <div className="space-y-1">
          <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">
            {order.paymentmethod ?? '—'}
          </span>
          <p className={`text-[11px] font-black ${
            order.paymentstatus === 'Paid' ? 'text-emerald-600' :
              order.paymentstatus === 'DepositPaid' ? 'text-[#c4000b]' : 'text-amber-600'
          }`}>
            {order.paymentstatus ?? 'Chưa ghi nhận'}
          </p>
        </div>
      ),
    },
    {
      key: 'orderstatus',
      header: 'Trạng thái',
      render: (order: Order) => {
        const config = statusConfig[order.orderstatus ?? ''] ?? { label: order.orderstatus, classes: 'bg-slate-100 text-slate-600' };
        return (
          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${config.classes}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'orderdate',
      header: 'Ngày đặt',
      render: (order: Order) => (
        <span className="text-xs font-semibold text-slate-500">{order.orderdate ? formatDateTime(order.orderdate) : '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Cập nhật',
      className: 'w-44',
      render: (order: Order) => (
        <select
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-[#172033] outline-none transition focus:border-[#e30613] focus:ring-2 focus:ring-red-50 disabled:bg-slate-50 disabled:text-slate-400"
          value={order.orderstatus ?? ''}
          disabled={
            updatingId === order.orderid ||
            ['Shipped', 'Completed', 'Cancelled', 'Returned'].includes(order.orderstatus ?? '')
          }
          onChange={event => handleStatusChange(order.orderid, event.target.value)}
        >
          {!statusOptions.includes(order.orderstatus ?? '') && order.orderstatus && (
            <option value={order.orderstatus}>{statusConfig[order.orderstatus]?.label ?? order.orderstatus}</option>
          )}
          {statusOptions.map(status => (
            <option key={status} value={status}>{statusConfig[status]?.label ?? status}</option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="ops-hero p-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="ops-hero-title">Quản lý đơn hàng</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-xl border-red-100 bg-white text-[#c4000b] hover:bg-red-50">
            <Download size={16} /> Xuất CSV
          </Button>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Tổng đơn lọc được', value: filtered.length, icon: <ShoppingCart size={19} /> },
          { label: 'Chờ duyệt', value: pendingCount, icon: <Clock3 size={19} /> },
          { label: 'Đang xử lý', value: processingCount, icon: <PackageCheck size={19} /> },
          { label: 'Đã có thanh toán', value: paidCount, icon: <WalletCards size={19} /> },
        ].map(item => (
          <div key={item.label} className="ops-card p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-2xl font-black text-[#172033]">{loading ? '...' : item.value}</p>
              <div className="text-[#c4000b]">{item.icon}</div>
            </div>
            <p className="text-xs font-bold text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
      )}

      <section className="ops-card p-4">
        <div className="mb-4 flex flex-wrap gap-2">
          {statusTabs.map(status => (
            <button
              key={status}
              onClick={() => { setFilterStatus(status); setPage(1); }}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                filterStatus === status
                  ? 'bg-[#e30613] text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 hover:bg-red-50 hover:text-[#c4000b]'
              }`}
            >
              {status === 'all' ? 'Tất cả' : (statusConfig[status]?.label ?? status)}
              <span className="ml-1.5 opacity-70">
                ({status === 'all' ? orders.length : orders.filter(order => order.orderstatus === status).length})
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-[#e30613] focus:bg-white focus:ring-2 focus:ring-red-50"
              placeholder="Tìm mã đơn, tên khách, SĐT..."
              value={search}
              onChange={event => { setSearch(event.target.value); setPage(1); }}
            />
          </div>
          <label className="text-xs font-bold text-slate-500">
            Từ ngày
            <input type="date" value={dateFrom} onChange={event => { setDateFrom(event.target.value); setPage(1); }} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#172033] outline-none focus:border-[#e30613]" />
          </label>
          <label className="text-xs font-bold text-slate-500">
            Đến ngày
            <input type="date" value={dateTo} onChange={event => { setDateTo(event.target.value); setPage(1); }} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-[#172033] outline-none focus:border-[#e30613]" />
          </label>
        </div>

        {selectedIds.size > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2">
            <span className="text-sm font-black text-[#c4000b]">{selectedIds.size} đơn đã chọn</span>
            <select className="rounded-lg border border-red-100 bg-white px-2 py-1.5 text-sm font-bold outline-none focus:border-[#e30613]" value={bulkStatus} onChange={event => setBulkStatus(event.target.value)}>
              <option value="">Đổi trạng thái</option>
              <option value="Processing">Đang xử lý</option>
              <option value="Cancelled">Hủy</option>
            </select>
            <Button size="sm" onClick={handleBulkUpdate} isLoading={updatingId === -1} disabled={!bulkStatus} className="bg-[#e30613] hover:bg-[#c4000b]">Lưu</Button>
          </div>
        )}
      </section>

      <DataTable columns={columns} data={paged} keyField="orderid" loading={loading} emptyMessage="Chưa có đơn hàng phù hợp." />

      <div className="flex flex-col justify-between gap-3 text-sm font-bold text-slate-500 md:flex-row md:items-center">
        <span>Tổng giá trị theo bộ lọc: <strong className="text-[#c4000b]">{formatCurrency(totalRevenue)}</strong></span>
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          itemCount={filtered.length}
          pageSize={PAGE_SIZE}
        />
      </div>

      <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Chi tiết đơn hàng #${viewOrder?.orderid}`}>
        {viewOrder && (
          <div className="space-y-6">
            <div className="py-4">
              {viewOrder.orderstatus === 'Cancelled' ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-4 text-sm font-black text-red-600">
                  <XCircle size={18} /> Đơn hàng đã hủy
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {orderProgress.map((status, index) => {
                    const currentIndex = orderProgress.indexOf(viewOrder.orderstatus ?? 'Pending');
                    const isPast = index <= currentIndex;
                    return (
                      <div key={status} className={`rounded-xl p-3 text-center ${isPast ? 'bg-red-50' : 'bg-slate-50'}`}>
                        <div className={`mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black ${isPast ? 'bg-[#e30613] text-white' : 'bg-white text-slate-400'}`}>
                          {isPast ? <CheckCircle2 size={16} /> : index + 1}
                        </div>
                        <p className={`text-xs font-black ${isPast ? 'text-[#c4000b]' : 'text-slate-400'}`}>
                          {statusConfig[status].label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-2 text-sm font-black text-[#172033]">Thông tin khách hàng</h4>
                <p className="text-sm text-slate-600"><span className="font-bold">Tên:</span> {viewOrder.customer?.fullname ?? viewOrder.shippingname ?? '—'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold">SĐT:</span> {viewOrder.customer?.phone ?? viewOrder.shippingphone ?? '—'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold">Địa chỉ:</span> {viewOrder.shippingaddress ?? '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h4 className="mb-2 text-sm font-black text-[#172033]">Thanh toán</h4>
                <p className="text-sm text-slate-600"><span className="font-bold">Hình thức:</span> {viewOrder.paymentmethod ?? '—'}</p>
                <p className="text-sm text-slate-600"><span className="font-bold">Tổng tiền:</span> {formatCurrency(viewOrder.finalamount ?? 0)}</p>
                <p className="text-sm text-slate-600"><span className="font-bold">Đã trả:</span> {formatCurrency(viewOrder.paidamount ?? 0)}</p>
                <p className="text-sm text-slate-600"><span className="font-bold">Còn lại:</span> {formatCurrency(Math.max(0, (viewOrder.finalamount ?? 0) - (viewOrder.paidamount ?? 0)))}</p>
                <p className="text-sm text-slate-600"><span className="font-bold">Trạng thái:</span> {viewOrder.paymentstatus ?? '—'}</p>
                {viewOrder.paymentmethod !== 'COD' &&
                  viewOrder.paymentstatus !== 'Paid' &&
                  viewOrder.orderstatus !== 'Cancelled' && (
                    <Button size="sm" className="mt-3 bg-[#e30613] hover:bg-[#c4000b]" isLoading={paymentUpdating} onClick={handleConfirmPayment}>
                      Xác nhận khoản cần thanh toán
                    </Button>
                  )}
              </div>
            </div>

            {viewOrder.cancellationreason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <span className="font-black">Lý do hủy:</span> {viewOrder.cancellationreason}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOrders;
