import React, { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Filter,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  Unlock,
  UserCheck,
  UserRound,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import apiClient from '@/api/apiClient';
import { ordersApi } from '@/features/orders/api/ordersApi';
import type { Order } from '@/features/orders/api/ordersApi';
import { formatCurrency, formatDate, formatDateTime, generateOrderCode } from '@/utils/formatters';
import { confirmAction, notifyError, notifySuccess } from '@/utils/notifications';

interface Customer {
  customerid: string;
  fullname: string;
  email?: string;
  phone?: string;
  address?: string;
  createdat?: string;
  userid?: number | null;
  accountisactive?: boolean | null;
}

interface CustomerPage {
  items: Customer[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface CustomerSummary {
  total: number;
  activeAccounts: number;
  disabledAccounts: number;
  guestProfiles: number;
}

const statusLabels: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Chờ xác nhận', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Processing: { label: 'Đang xử lý', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  Shipped: { label: 'Đang giao', className: 'bg-blue-50 text-blue-700 border-blue-200' },
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
  const [summary, setSummary] = useState<CustomerSummary>({
    total: 0,
    activeAccounts: 0,
    disabledAccounts: 0,
    guestProfiles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [accountType, setAccountType] = useState('all');
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [accountUpdatingId, setAccountUpdatingId] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      const response = await apiClient.get<CustomerSummary>('/Customers/summary');
      setSummary(response.data);
    } catch {
      // Ignored non-critical stats
    }
  };

  useEffect(() => {
    void fetchSummary();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<CustomerPage>('/Customers', {
          params: {
            query: search.trim() || undefined,
            accountType: accountType !== 'all' ? accountType : undefined,
            page,
            pageSize,
          },
          signal: controller.signal,
        });
        setCustomers(response.data.items);
        setTotalCount(response.data.totalCount);
        setTotalPages(Math.max(1, response.data.totalPages));
      } catch {
        if (!controller.signal.aborted) setError('Không thể tải danh sách khách hàng.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, pageSize, search, accountType]);

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
      setCustomers(prev => prev.map(item => (item.customerid === updated.customerid ? updated : item)));
      setSelectedCustomer(prev => (prev?.customerid === updated.customerid ? updated : prev));
      void fetchSummary();
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
      header: 'STT',
      render: (_c: Customer, rowIndex: number) => (
        <span className="text-xs font-semibold text-slate-400">{(page - 1) * pageSize + rowIndex + 1}</span>
      ),
      className: 'w-12',
    },
    {
      key: 'fullname',
      header: 'Khách hàng',
      render: (c: Customer) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 font-black text-xs text-emerald-700">
            {c.fullname.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{c.fullname}</p>
            <p className="text-xs text-slate-400">{c.email ?? 'Chưa có email'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Số điện thoại',
      render: (c: Customer) => <span className="text-sm font-medium text-slate-600">{c.phone ?? '—'}</span>,
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      render: (c: Customer) => <span className="line-clamp-1 text-sm text-slate-500">{c.address ?? '—'}</span>,
    },
    {
      key: 'createdat',
      header: 'Ngày đăng ký',
      render: (c: Customer) => (
        <span className="text-xs font-medium text-slate-500">{c.createdat ? formatDate(c.createdat) : '—'}</span>
      ),
    },
    {
      key: 'account',
      header: 'Tài khoản',
      render: (c: Customer) => {
        if (!c.userid) {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              <ShoppingBag size={13} className="text-slate-400" />
              Hồ sơ mua hàng
            </span>
          );
        }

        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              c.accountisactive === true
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
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
            className="inline-flex items-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-[#c4000b] transition-colors hover:bg-red-100"
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
        <div>
          <h2 className="ops-hero-title">Quản lý khách hàng</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi hồ sơ người mua, lịch sử giao dịch và phân quyền trạng thái đăng nhập.
          </p>
        </div>
        <span className="rounded-full border border-red-100 bg-white px-4 py-2 text-sm font-black text-[#c4000b] shadow-sm">
          {totalCount} khách hàng
        </span>
      </div>

      {/* STAT CARDS - Flat UI standardized */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="ops-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="ops-label">Tổng khách hàng</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800">{summary.total}</h3>
            </div>
            <Users className="text-[#e30613]" size={24} />
          </div>
        </div>

        <div className="ops-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="ops-label">Có tài khoản</p>
              <h3 className="mt-2 text-2xl font-black text-emerald-600">{summary.activeAccounts}</h3>
            </div>
            <UserCheck className="text-emerald-500" size={24} />
          </div>
        </div>

        <div className="ops-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="ops-label">Đã vô hiệu hóa</p>
              <h3 className="mt-2 text-2xl font-black text-red-600">{summary.disabledAccounts}</h3>
            </div>
            <UserX className="text-red-500" size={24} />
          </div>
        </div>

        <div className="ops-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="ops-label">Hồ sơ mua hàng (Vãng lai)</p>
              <h3 className="mt-2 text-2xl font-black text-blue-600">{summary.guestProfiles}</h3>
            </div>
            <ShoppingBag className="text-blue-500" size={24} />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* CONTROLS TOOLBAR */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-md">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-medium outline-none transition focus:border-[#e30613] focus:bg-white"
              placeholder="Tìm theo tên khách hàng, số điện thoại, email..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Filter size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={accountType}
                onChange={e => {
                  setAccountType(e.target.value);
                  setPage(1);
                }}
                className="h-11 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-8 text-sm font-bold text-slate-700 outline-none transition focus:border-[#e30613] focus:bg-white"
              >
                <option value="all">Tất cả loại tài khoản</option>
                <option value="active">Đang hoạt động</option>
                <option value="disabled">Đã vô hiệu hóa</option>
                <option value="guest">Hồ sơ mua hàng (Khách vãng lai)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#e30613] focus:bg-white"
              >
                <option value={10}>10 / trang</option>
                <option value={25}>25 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Đang hiển thị <span className="font-bold text-slate-700">{customers.length}/{totalCount}</span> khách hàng khớp với bộ lọc.
        </p>
      </div>

      <DataTable columns={columns} data={customers} keyField="customerid" loading={loading} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} itemCount={totalCount} pageSize={pageSize} />

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
                      <p className="text-xs text-slate-400">
                        Mã khách hàng {selectedCustomer.customerid.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                    <p className="text-xs text-slate-500">
                      Tham gia {selectedCustomer.createdat ? formatDate(selectedCustomer.createdat) : '—'}
                    </p>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <span className="flex items-center gap-2">
                      <Phone size={15} />
                      {selectedCustomer.phone ?? 'Chưa có số điện thoại'}
                    </span>
                    <span className="flex items-center gap-2">
                      <Mail size={15} />
                      {selectedCustomer.email ?? 'Chưa có email'}
                    </span>
                    <span className="flex items-start gap-2 sm:col-span-2">
                      <MapPin size={15} className="mt-0.5 shrink-0" />
                      {selectedCustomer.address ?? 'Chưa có địa chỉ'}
                    </span>
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
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {ordersError}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                    <p className="text-xs font-semibold text-slate-400">Tổng đơn hàng</p>
                    <p className="mt-1 text-lg font-black text-slate-800">{orderSummary.total}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                    <p className="text-xs font-semibold text-slate-400">Đơn thành công</p>
                    <p className="mt-1 text-lg font-black text-emerald-600">{orderSummary.completed}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                    <p className="text-xs font-semibold text-slate-400">Tổng chi tiêu</p>
                    <p className="mt-1 text-lg font-black text-[#e30613]">{formatCurrency(orderSummary.spent)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-bold text-slate-700">Lịch sử đơn hàng gần đây</h4>
                  {customerOrders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-400">
                      Khách hàng chưa có đơn hàng nào.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {customerOrders.map(order => (
                        <div
                          key={order.orderid}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3 shadow-sm hover:border-slate-300"
                        >
                          <div>
                            <span className="font-bold text-slate-800 text-sm">
                              {generateOrderCode(order.orderid)}
                            </span>
                            <span className="ml-2 text-xs text-slate-400">
                              {order.orderdate ? formatDateTime(order.orderdate) : '—'}
                            </span>
                            <div className="mt-1 flex gap-2">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                                  statusLabels[order.orderstatus ?? '']?.className ?? 'bg-slate-50 text-slate-600'
                                }`}
                              >
                                {statusLabels[order.orderstatus ?? '']?.label ?? order.orderstatus}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                {paymentLabels[order.paymentmethod ?? ''] ?? order.paymentmethod}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-[#e30613] text-sm">
                              {formatCurrency(order.finalamount ?? 0)}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {order.orderitems?.length ?? 0} sản phẩm
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminCustomers;
