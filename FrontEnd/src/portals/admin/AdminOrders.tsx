import React, { useState, useMemo } from 'react';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { useOrders } from '@/features/orders/hooks/useOrders';
import type { Order } from '@/features/orders/api/ordersApi';
import { ordersApi } from '@/features/orders/api/ordersApi';
import { formatCurrency, formatDateTime } from '@/utils/formatters';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { getApiErrorMessage } from '@/utils/apiError';

const PAGE_SIZE = 10;

const statusConfig: Record<string, { label: string; classes: string }> = {
  Completed:  { label: 'Hoàn thành', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  Shipped:    { label: 'Đang giao',  classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  Returned:   { label: 'Hoàn về kho', classes: 'bg-purple-50 text-purple-700 border border-purple-200' },
  Processing: { label: 'Đang xử lý',classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  Pending:    { label: 'Chờ duyệt',  classes: 'bg-slate-100 text-slate-600 border border-slate-200' },
  Cancelled:  { label: 'Đã hủy',    classes: 'bg-red-50 text-red-600 border border-red-200' },
};

const statusOptions = ['Pending', 'Processing', 'Cancelled'];
const orderProgress = ['Pending', 'Processing', 'Shipped', 'Completed'];

import { useSearchParams } from 'react-router-dom';

const AdminOrders: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryStatus = searchParams.get('status');

  const { orders, loading, error, refetch, updateStatus, bulkUpdateStatus } = useOrders();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');

  React.useEffect(() => {
    if (queryStatus && statusOptions.includes(queryStatus)) {
      setFilterStatus(queryStatus);
      setPage(1);
    }
  }, [queryStatus]);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [paymentUpdating, setPaymentUpdating] = useState(false);

  const filtered = useMemo(() => orders.filter(o => {
    const matchStatus = filterStatus === 'all' || o.orderstatus === filterStatus;
    const matchSearch =
      search === '' ||
      String(o.orderid).includes(search) ||
      (o.customer?.fullname ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer?.phone ?? '').includes(search);
      
    let matchDate = true;
    if (o.orderdate) {
       const orderDate = new Date(o.orderdate);
       if (dateFrom && orderDate < new Date(dateFrom)) matchDate = false;
       if (dateTo && orderDate > new Date(dateTo + 'T23:59:59')) matchDate = false;
    }
    return matchStatus && matchSearch && matchDate;
  }), [orders, filterStatus, search, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try {
      await updateStatus(id, status);
    } catch (error) {
      alert(getApiErrorMessage(error, 'Không thể cập nhật trạng thái đơn hàng.'));
    }
    finally { setUpdatingId(null); }
  };

  const handleConfirmPayment = async () => {
    if (!viewOrder) return;
    setPaymentUpdating(true);
    try {
      await ordersApi.confirmPayment(viewOrder.orderid);
      const refreshed = await ordersApi.getById(viewOrder.orderid);
      setViewOrder(refreshed.data);
      await refetch();
    } catch (error) {
      alert(getApiErrorMessage(error, 'Không thể xác nhận thanh toán.'));
    } finally {
      setPaymentUpdating(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkStatus || selectedIds.size === 0) return;
    setUpdatingId(-1);
    try {
      const res = await bulkUpdateStatus(Array.from(selectedIds), bulkStatus);
      
      const newSelected = new Set(selectedIds);
      res.updatedOrderIds.forEach((id: number) => newSelected.delete(id));
      setSelectedIds(newSelected);
      
      if (res.failed && res.failed.length > 0) {
        const errorLines = res.failed.map((f: {orderId: number, reason: string}) => `Đơn #${f.orderId}: ${f.reason}`).join('\n');
        alert(`Cập nhật một phần.\n\nThành công: ${res.updatedOrderIds.length}\nThất bại: ${res.failed.length}\n\nLý do:\n${errorLines}`);
      } else {
        setBulkStatus('');
      }
    } catch {
      alert("Lỗi hệ thống khi cập nhật trạng thái");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportCSV = () => {
     const headers = ['Mã Đơn', 'Ngày Đặt', 'Khách Hàng', 'SĐT', 'Trạng Thái', 'Giá Trị', 'Thanh Toán'];
     const rows = filtered.map(o => [
        o.orderid,
        o.orderdate ? formatDateTime(o.orderdate) : '',
        `"${o.customer?.fullname ?? ''}"`,
        `"${o.customer?.phone ?? ''}"`,
        statusConfig[o.orderstatus ?? '']?.label ?? o.orderstatus,
        o.finalamount,
        o.paymentmethod
     ]);
     const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
         + headers.join(',') + '\n' 
         + rows.map(e => e.join(',')).join('\n');
     
     const encodedUri = encodeURI(csvContent);
     const link = document.createElement("a");
     link.setAttribute("href", encodedUri);
     link.setAttribute("download", `orders_export_${new Date().getTime()}.csv`);
     document.body.appendChild(link);
     link.click();
     link.remove();
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paged.length && paged.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paged.map(o => o.orderid)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const columns = [
    {
      key: 'checkbox',
      header: (
        <input 
          type="checkbox" 
          checked={paged.length > 0 && selectedIds.size === paged.length}
          onChange={toggleSelectAll}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      className: 'w-10 text-center',
      render: (o: Order) => (
        <input 
          type="checkbox" 
          checked={selectedIds.has(o.orderid)}
          onChange={() => toggleSelect(o.orderid)}
          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
      )
    },
    {
      key: 'orderid',
      header: 'Mã đơn',
      render: (o: Order) => (
        <button onClick={() => setViewOrder(o)} className="font-mono text-xs font-bold text-blue-600 hover:underline">
          #{String(o.orderid).padStart(5, '0')}
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (o: Order) => (
        <div>
          <p className="font-semibold text-slate-800 text-sm">{o.customer?.fullname ?? `KH #${o.customerid ?? '—'}`}</p>
          <p className="text-xs text-slate-400">{o.customer?.phone ?? ''}</p>
        </div>
      ),
    },
    {
      key: 'finalamount',
      header: 'Giá trị',
      render: (o: Order) => (
        <div>
          <p className="font-bold text-slate-800">{formatCurrency(o.finalamount ?? 0)}</p>
          {o.discountamount && o.discountamount > 0 && (
            <p className="text-xs text-emerald-600 font-medium">-{formatCurrency(o.discountamount)}</p>
          )}
        </div>
      ),
    },
    {
      key: 'paymentmethod',
      header: 'Thanh toán',
      render: (o: Order) => (
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
            {o.paymentmethod ?? '—'}
          </span>
          <p className={`text-[11px] font-bold ${o.paymentstatus === 'Paid' ? 'text-emerald-600' : o.paymentstatus === 'DepositPaid' ? 'text-blue-600' : 'text-amber-600'}`}>
            {o.paymentstatus ?? 'Chưa ghi nhận'}
          </p>
        </div>
      ),
    },
    {
      key: 'orderstatus',
      header: 'Trạng thái',
      render: (o: Order) => {
        const cfg = statusConfig[o.orderstatus ?? ''] ?? { label: o.orderstatus, classes: 'bg-slate-100 text-slate-600' };
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.classes}`}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'orderdate',
      header: 'Ngày đặt',
      render: (o: Order) => (
        <span className="text-xs text-slate-500">{o.orderdate ? formatDateTime(o.orderdate) : '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Cập nhật',
      className: 'w-44',
      render: (o: Order) => (
        <select
          className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-slate-700 outline-none focus:border-blue-500 disabled:opacity-60 cursor-pointer"
          value={o.orderstatus ?? ''}
          disabled={
            updatingId === o.orderid ||
            ['Shipped', 'Completed', 'Cancelled', 'Returned'].includes(o.orderstatus ?? '')
          }
          onChange={e => handleStatusChange(o.orderid, e.target.value)}
        >
          {!statusOptions.includes(o.orderstatus ?? '') && o.orderstatus && (
            <option value={o.orderstatus}>{statusConfig[o.orderstatus]?.label ?? o.orderstatus}</option>
          )}
          {statusOptions.map(s => (
            <option key={s} value={s}>{statusConfig[s]?.label ?? s}</option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Quản lý Đơn hàng</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Đang tải...' : `${filtered.length} đơn hàng`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
              <span className="text-sm font-semibold text-blue-800">{selectedIds.size} đơn đã chọn</span>
              <select className="text-sm border-slate-300 rounded-md py-1 px-2" value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}>
                <option value="">-- Đổi trạng thái --</option>
                <option value="Processing">Đang xử lý</option>
                <option value="Cancelled">Hủy</option>
              </select>
              <Button size="sm" onClick={handleBulkUpdate} isLoading={updatingId === -1} disabled={!bulkStatus}>Lưu</Button>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleExportCSV}>Export CSV</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        {/* Status tabs */}
        <div className="flex flex-wrap gap-2">
          {['all', ...statusOptions].map(s => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1); }}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                filterStatus === s
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              {s === 'all' ? 'Tất cả' : (statusConfig[s]?.label ?? s)}
              <span className="ml-1.5 opacity-70">
                ({s === 'all' ? orders.length : orders.filter(o => o.orderstatus === s).length})
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 placeholder:text-slate-400 transition-all"
              placeholder="Tìm mã đơn, tên KH, SĐT..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">Từ:</span>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"/>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-600">Đến:</span>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-blue-500"/>
          </div>
        </div>
      </div>

      <DataTable columns={columns} data={paged} keyField="orderid" loading={loading} />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemCount={filtered.length}
        pageSize={PAGE_SIZE}
      />
      
      {/* Order Details Modal with Timeline */}
      <Modal isOpen={!!viewOrder} onClose={() => setViewOrder(null)} title={`Chi tiết Đơn hàng #${viewOrder?.orderid}`}>
        {viewOrder && (
          <div className="space-y-6">
            {/* Timeline */}
            <div className="py-4 px-2">
              <div className="flex items-center justify-between relative">
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 z-0"></div>
                 {viewOrder.orderstatus === 'Cancelled' ? (
                   <div className="w-full text-center py-4 bg-red-50 text-red-600 font-bold border border-red-200 rounded-lg relative z-10">
                     ĐƠN HÀNG ĐÃ HỦY
                   </div>
                 ) : (
                   orderProgress.map((st, idx) => {
                     const currentIdx = orderProgress.indexOf(viewOrder.orderstatus ?? 'Pending');
                     const isPast = idx <= currentIdx;
                     const isCurrent = idx === currentIdx;
                     return (
                       <div key={st} className="relative z-10 flex flex-col items-center gap-2">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${isPast ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-300 text-slate-400'} ${isCurrent ? 'ring-4 ring-blue-100' : ''}`}>
                            {idx + 1}
                         </div>
                         <span className={`text-xs font-semibold ${isPast ? 'text-blue-700' : 'text-slate-400'}`}>
                           {statusConfig[st].label}
                         </span>
                       </div>
                     );
                   })
                 )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm mb-2">Thông tin Khách hàng</h4>
                  <p className="text-sm text-slate-600"><span className="font-semibold">Tên:</span> {viewOrder.customer?.fullname}</p>
                  <p className="text-sm text-slate-600"><span className="font-semibold">SĐT:</span> {viewOrder.customer?.phone}</p>
               </div>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-slate-800 text-sm mb-2">Thanh toán</h4>
                  <p className="text-sm text-slate-600"><span className="font-semibold">Hình thức:</span> {viewOrder.paymentmethod}</p>
                  <p className="text-sm text-slate-600"><span className="font-semibold">Tổng tiền:</span> {formatCurrency(viewOrder.finalamount ?? 0)}</p>
                  <p className="text-sm text-slate-600"><span className="font-semibold">Đã trả:</span> {formatCurrency(viewOrder.paidamount ?? 0)}</p>
                  <p className="text-sm text-slate-600"><span className="font-semibold">Còn lại:</span> {formatCurrency(Math.max(0, (viewOrder.finalamount ?? 0) - (viewOrder.paidamount ?? 0)))}</p>
                  <p className="text-sm text-slate-600"><span className="font-semibold">Trạng thái:</span> {viewOrder.paymentstatus ?? '—'}</p>
                  {viewOrder.paymentmethod !== 'COD' &&
                    viewOrder.paymentstatus !== 'Paid' &&
                    viewOrder.orderstatus !== 'Cancelled' && (
                      <Button
                        size="sm"
                        className="mt-3"
                        isLoading={paymentUpdating}
                        onClick={handleConfirmPayment}
                      >
                        Xác nhận khoản cần thanh toán
                      </Button>
                    )}
               </div>
            </div>
            {viewOrder.cancellationreason && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                <span className="font-bold">Lý do hủy:</span> {viewOrder.cancellationreason}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOrders;
