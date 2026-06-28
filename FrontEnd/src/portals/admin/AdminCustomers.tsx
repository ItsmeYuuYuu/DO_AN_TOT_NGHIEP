import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  PackageOpen,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Unlock,
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
import { confirmAction, notifyError, notifySuccess } from '@/utils/notifications';

const PAGE_SIZE = 10;

interface Customer {
  customerid: number;
  fullname: string;
  email?: string;
  phone?: string;
  address?: string;
  createdat?: string;
  userid?: number | null;
  accountisactive?: boolean | null;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Chờ xác nhận', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Processing: { label: 'Đang xử lý', className: 'bg-indigo-50 text-[#4338ca] border-indigo-200' },
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
  const [accountUpdatingId, setAccountUpdatingId] = useState<number | null>(null);

  const loadCustomers = () => {
    setLoading(true);
    apiClient.get<Customer[]>('/Customers')
      .then(res => setCustomers(res.data))
      .catch(() => setError('Không thể tải danh sách khách hàng.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCustomers();
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

  const toggleCustomerAccount = async (customer: Customer) => {
    if (!customer.userid) {
      notifyError('Khách hàng này chưa có tài khoản đăng nhập để khóa hoặc mở khóa.');
      return;
    }

    const nextActive = customer.accountisactive !== true;
    const confirmed = await confirmAction(
      nextActive
        ? `Mở khóa tài khoản đăng nhập của ${customer.fullname}?`
        : `Vô hiệu hóa tài khoản đăng nhập của ${customer.fullname}? Khách vẫn giữ hồ sơ và lịch sử đơn hàng.`,
      {
        title: nextActive ? 'Mở khóa tài khoản khách' : 'Vô hiệu hóa tài khoản khách',
        confirmLabel: nextActive ? 'Mở khóa' : 'Vô hiệu hóa',
        danger: !nextActive,
      },
    );

    if (!confirmed) return;

    try {
      setAccountUpdatingId(customer.customerid);
      const response = await apiClient.patch<Customer>(`/Customers/${customer.customerid}/account-status`, {
        isactive: nextActive,
      });
      const updated = response.data;
      setCustomers(prev => prev.map(item => item.customerid === updated.customerid ? updated : item));
      setSelectedCustomer(prev => prev?.customerid === updated.customerid ? updated : prev);
      notifySuccess(nextActive ? 'Đã mở khóa tài khoản khách hàng.' : 'Đã vô hiệu hóa tài khoản khách hàng.');
    } catch {
      notifyError('Không thể cập nhật trạng thái tài khoản khách hàng.');
    } finally {
      setAccountUpdatingId(null);
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
      key: 'account',
      header: 'Tài khoản',
      render: (c: Customer) => {
        if (!c.userid) {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              Hồ sơ mua hàng
            </span>
          );
        }

        return (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            c.accountisactive === true
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-red-50 text-red-700'
          }`}>
            <ShieldCheck size={13} />
            {c.accountisactive === true ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      className: 'w-56 text-right',
      render: (c: Customer) => (
        <div className="inline-flex items-center justify-end gap-2">
          {c.userid && (
            <button
              type="button"
              onClick={() => toggleCustomerAccount(c)}
              disabled={accountUpdatingId === c.customerid}
              className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                c.accountisactive === true
                  ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {accountUpdatingId === c.customerid ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : c.accountisactive === true ? (
                <Lock size={14} />
              ) : (
                <Unlock size={14} />
              )}
              {c.accountisactive === true ? 'Khóa' : 'Mở'}
            </button>
          )}
        <button
          type="button"
          onClick={() => openCustomerDetail(c)}
          className="inline-flex items-center gap-1.5 rounded-2xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-[#4338ca] transition-colors hover:bg-indigo-100"
        >
          <Eye size={15} />
          Chi tiết
        </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="ops-hero flex items-center justify-between gap-4 p-6">
        <h2 className="ops-hero-title">Quản lý khách hàng</h2>
        <span className="rounded-full border border-red-100 bg-white px-4 py-2 text-sm font-black text-[#c4000b] shadow-sm">
          {filtered.length} khách hàng
        </span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="max-w-sm">
          <input
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 text-sm text-slate-700 outline-none focus:border-[#4f46e5] placeholder:text-slate-400"
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
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{ordersError}</div>
            ) : (
              <>
                <section className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                    <ShoppingBag size={20} className="mb-2 text-[#4f46e5]" />
                    <p className="text-xs font-semibold uppercase text-[#4f46e5]">Tổng đơn hàng</p>
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
