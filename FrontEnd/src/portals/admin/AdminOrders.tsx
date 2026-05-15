import React, { useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { useOrders } from '@/features/orders/hooks/useOrders';
import type { Order } from '@/features/orders/api/ordersApi';
import { formatCurrency, formatDateTime } from '@/utils/formatters';

const PAGE_SIZE = 10;

const statusConfig: Record<string, { label: string; classes: string }> = {
  Completed:  { label: 'Hoàn thành', classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  Shipped:    { label: 'Đang giao',  classes: 'bg-blue-50 text-blue-700 border border-blue-200' },
  Processing: { label: 'Đang xử lý',classes: 'bg-amber-50 text-amber-700 border border-amber-200' },
  Pending:    { label: 'Chờ duyệt',  classes: 'bg-slate-100 text-slate-600 border border-slate-200' },
  Cancelled:  { label: 'Đã hủy',    classes: 'bg-red-50 text-red-600 border border-red-200' },
};

const statusOptions = ['Pending', 'Processing', 'Shipped', 'Completed', 'Cancelled'];

const AdminOrders: React.FC = () => {
  const { orders, loading, error, updateStatus } = useOrders();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const filtered = orders.filter(o => {
    const matchStatus = filterStatus === 'all' || o.orderstatus === filterStatus;
    const matchSearch =
      search === '' ||
      String(o.orderid).includes(search) ||
      (o.customer?.fullname ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (o.customer?.phone ?? '').includes(search);
    return matchStatus && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange = async (id: number, status: string) => {
    setUpdatingId(id);
    try { await updateStatus(id, status); }
    finally { setUpdatingId(null); }
  };

  const columns = [
    {
      key: 'orderid',
      header: 'Mã đơn',
      render: (o: Order) => (
        <span className="font-mono text-xs font-bold text-blue-600">
          #{String(o.orderid).padStart(5, '0')}
        </span>
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
        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
          {o.paymentmethod ?? '—'}
        </span>
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
          disabled={updatingId === o.orderid}
          onChange={e => handleStatusChange(o.orderid, e.target.value)}
        >
          {statusOptions.map(s => (
            <option key={s} value={s}>{statusConfig[s]?.label ?? s}</option>
          ))}
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-800">Quản lý Đơn hàng</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {loading ? 'Đang tải...' : `${filtered.length} đơn hàng`}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* Quick status filter tabs + search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
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

        {/* Search */}
        <div className="max-w-sm">
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 placeholder:text-slate-400 transition-all"
            placeholder="Tìm mã đơn, tên KH, số điện thoại..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
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
    </div>
  );
};

export default AdminOrders;
