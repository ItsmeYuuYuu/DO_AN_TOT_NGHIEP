import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  LoaderCircle,
  Mail,
  MapPin,
  PackageOpen,
  Phone,
  ShoppingBag,
  UserRound,
  Wallet,
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import apiClient from '@/api/apiClient';
import { ordersApi } from '@/features/orders/api/ordersApi';
import type { Order } from '@/features/orders/api/ordersApi';
import { formatCurrency, formatDate, formatDateTime, generateOrderCode } from '@/utils/formatters';

const PAGE_SIZE = 10;

interface Customer {
  customerid: number;
  fullname: string;
  email?: string;
  phone?: string;
  address?: string;
  createdat?: string;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Chờ xác nhận', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Processing: { label: 'Đang xử lý', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  Shipped: { label: 'Đang giao', className: 'bg-violet-50 text-violet-700 border-violet-200' },
  Completed: { label: 'Hoàn thành', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-red-700 border-red-200' },
};

const paymentLabels: Record<string, string> = {
  COD: 'Thanh toán khi nhận hàng',
  Cash: 'Tiền mặt',
  BankTransfer: 'Chuyển khoản',
  VNPay: 'VNPay',
  Momo: 'MoMo',
};

const AdminCustomers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiClient.get<Customer[]>('/Customers')
      .then(res => setCustomers(res.data))
      .catch(() => setError('Không thể tải danh sách khách hàng.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = customers.filter(c =>
    c.fullname.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search) ||
    (c.email ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const orderSummary = useMemo(() => {
    const completedOrders = customerOrders.filter(order => order.orderstatus === 'Completed');
    return {
      total: customerOrders.length,
      completed: completedOrders.length,
      spent: completedOrders.reduce((sum, order) => sum + (order.finalamount ?? 0), 0),
    };
  }, [customerOrders]);

  const openCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setOrdersError(null);
    setOrdersLoading(true);

    try {
      const response = await ordersApi.getByCustomer(customer.customerid);
      setCustomerOrders(response.data);
    } catch {
      setOrdersError('Không thể tải lịch sử đơn hàng của khách hàng này.');
    } finally {
      setOrdersLoading(false);
    }
  };

  const columns = [
    {
      key: 'customerid',
      header: '#',
      render: (c: Customer) => <span className="font-mono text-xs text-slate-400">#{c.customerid}</span>,
      className: 'w-12',
    },
    {
      key: 'fullname',
      header: 'Khách hàng',
      render: (c: Customer) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0">
            {c.fullname.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">{c.fullname}</p>
            <p className="text-xs text-slate-400">{c.email ?? 'Chưa có email'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Số điện thoại',
      render: (c: Customer) => <span className="text-sm text-slate-600 font-mono">{c.phone ?? '—'}</span>,
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      render: (c: Customer) => <span className="text-sm text-slate-500 line-clamp-1">{c.address ?? '—'}</span>,
    },
    {
      key: 'createdat',
      header: 'Ngày đăng ký',
      render: (c: Customer) => <span className="text-xs text-slate-500">{c.createdat ? formatDate(c.createdat) : '—'}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-32 text-right',
      render: (c: Customer) => (
        <button
          type="button"
          onClick={() => openCustomerDetail(c)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
        >
          <Eye size={15} />
          Chi tiết
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-800">Quản lý khách hàng</h2>
        <p className="text-sm text-slate-500">{filtered.length} khách hàng đã đăng ký</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="max-w-sm">
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 placeholder:text-slate-400"
            placeholder="Tìm tên, số điện thoại, email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <DataTable columns={columns} data={paged} keyField="customerid" loading={loading} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} itemCount={filtered.length} pageSize={PAGE_SIZE} />

      <Modal
        isOpen={selectedCustomer !== null}
        onClose={() => setSelectedCustomer(null)}
        title="Chi tiết khách hàng"
        size="xl"
      >
        {selectedCustomer && (
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <UserRound size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-800">{selectedCustomer.fullname}</h3>
                      <p className="text-xs text-slate-400">Mã khách hàng #{selectedCustomer.customerid}</p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Tham gia {selectedCustomer.createdat ? formatDate(selectedCustomer.createdat) : '—'}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <span className="flex items-center gap-2"><Phone size={15} />{selectedCustomer.phone ?? 'Chưa có số điện thoại'}</span>
                    <span className="flex items-center gap-2"><Mail size={15} />{selectedCustomer.email ?? 'Chưa có email'}</span>
                    <span className="flex items-start gap-2 sm:col-span-2"><MapPin size={15} className="mt-0.5 shrink-0" />{selectedCustomer.address ?? 'Chưa có địa chỉ'}</span>
                  </div>
                </div>
              </div>
            </section>

            {ordersLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
                <LoaderCircle size={20} className="animate-spin" />
                Đang tải lịch sử đơn hàng...
              </div>
            ) : ordersError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ordersError}</div>
            ) : (
              <>
                <section className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <ShoppingBag size={20} className="mb-2 text-blue-600" />
                    <p className="text-xs font-semibold uppercase text-blue-600">Tổng đơn hàng</p>
                    <p className="mt-1 text-xl font-black text-slate-800">{orderSummary.total}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                    <CheckCircle2 size={20} className="mb-2 text-emerald-600" />
                    <p className="text-xs font-semibold uppercase text-emerald-600">Đã hoàn thành</p>
                    <p className="mt-1 text-xl font-black text-slate-800">{orderSummary.completed}</p>
                  </div>
                  <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                    <Wallet size={20} className="mb-2 text-violet-600" />
                    <p className="text-xs font-semibold uppercase text-violet-600">Tổng chi tiêu</p>
                    <p className="mt-1 text-lg font-black text-slate-800">{formatCurrency(orderSummary.spent)}</p>
                  </div>
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-bold text-slate-800">Lịch sử đơn hàng</h3>
                  {customerOrders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 py-12 text-center">
                      <PackageOpen size={32} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-medium text-slate-500">Khách hàng chưa có đơn hàng nào.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customerOrders.map(order => {
                        const status = statusLabels[order.orderstatus ?? ''] ?? {
                          label: order.orderstatus ?? 'Chưa xác định',
                          className: 'bg-slate-50 text-slate-600 border-slate-200',
                        };

                        return (
                          <article key={order.orderid} className="overflow-hidden rounded-xl border border-slate-200">
                            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3">
                              <div>
                                <p className="font-bold text-slate-800">{generateOrderCode(order.orderid)}</p>
                                <p className="text-xs text-slate-500">
                                  {order.orderdate ? formatDateTime(order.orderdate) : 'Chưa có ngày đặt'}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                                  {status.label}
                                </span>
                                <span className="font-bold text-red-600">{formatCurrency(order.finalamount ?? 0)}</span>
                              </div>
                            </div>

                            <div className="divide-y divide-slate-100 px-4">
                              {(order.orderitems ?? []).map(item => (
                                <div key={item.orderitemid} className="flex flex-wrap items-start justify-between gap-3 py-3 text-sm">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-700">{item.productname ?? 'Sản phẩm theo IMEI'}</p>
                                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                                      {item.variantsku && <span>SKU: {item.variantsku}</span>}
                                      {item.imei && <span>IMEI: {item.imei}</span>}
                                      {item.packagename && <span>Gói: {item.packagename}</span>}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold text-slate-700">{formatCurrency(item.sellingprice)}</p>
                                    {!!item.warrantyprice && item.warrantyprice > 0 && (
                                      <p className="text-xs text-slate-500">Bảo hành: {formatCurrency(item.warrantyprice)}</p>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
                              <span>{order.orderitems?.length ?? 0} sản phẩm</span>
                              <span>Thanh toán: {paymentLabels[order.paymentmethod ?? ''] ?? order.paymentmethod ?? 'Chưa xác định'}</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminCustomers;
