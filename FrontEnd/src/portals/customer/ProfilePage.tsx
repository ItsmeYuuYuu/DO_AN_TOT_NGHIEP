import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ClipboardList,
  Clock,
  Edit3,
  LayoutDashboard,
  LogOut,
  Package,
  RotateCcw,
  Save,
  Star,
  User,
  X,
} from 'lucide-react';
import apiClient from '@/api/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import { updateStoredUser } from '@/features/auth/utils/authUtils';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';
import { notifyError, notifySuccess } from '@/utils/notifications';
import { MyReviews } from './MyReviews';
import { Seo } from '@/components/Seo';
import { returnRequestsApi } from '@/features/returns/api/returnRequestsApi';

const digitsOnly = (value: string, maxLength = 10) =>
  value.replace(/\D/g, '').slice(0, maxLength);


interface Order {
  orderid: number;
  orderdate: string;
  orderstatus: string;
  totalamount: number;
  discountamount?: number;
  finalamount?: number;
  paymentmethod?: string;
  paymentstatus?: string;
  shippingname?: string;
  shippingphone?: string;
  shippingemail?: string;
  shippingaddress: string;
  customernote?: string;
  orderitems?: {
    orderitemid: number;
    imei?: string;
    sellingprice: number;
    warrantyprice?: number;
    packagename?: string;
    productname?: string;
    variantsku?: string;
  }[];
}

interface ProfileInfo {
  userid: number;
  username: string;
  fullname: string;
  email?: string;
  phone?: string;
  rolename?: string;
}

type OrderFilter = 'all' | 'payment' | 'processing' | 'shipping' | 'completed' | 'cancelled' | 'returns';

const statusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-amber-100 text-amber-800';
    case 'confirmed':
    case 'processing': return 'bg-red-100 text-red-800';
    case 'shipping':
    case 'shipped': return 'bg-sky-100 text-sky-800';
    case 'delivered':
    case 'completed': return 'bg-emerald-100 text-emerald-800';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-600';
  }
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'Chờ xác nhận',
    confirmed: 'Đã xác nhận',
    processing: 'Đang xử lý',
    shipping: 'Đang giao',
    shipped: 'Đang giao',
    delivered: 'Đã nhận',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
  };
  return map[status?.toLowerCase()] ?? status;
};

const ProfilePage: React.FC = () => {
  const { user, isLoggedIn, logout, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const profileRef = useRef<HTMLDivElement>(null);
  const ordersRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [returnOrderIds, setReturnOrderIds] = useState<Set<number>>(new Set());
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [profileForm, setProfileForm] = useState({ fullname: '', email: '', phone: '' });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth/login');
      return;
    }

    apiClient.get<ProfileInfo>('/Profile/me')
      .then(response => {
        setProfile(response.data);
        setProfileForm({
          fullname: response.data.fullname ?? '',
          email: response.data.email ?? '',
          phone: response.data.phone ?? '',
        });
      })
      .catch(() => {
        setProfileForm({
          fullname: user?.fullname ?? '',
          email: user?.email ?? '',
          phone: user?.phone ?? '',
        });
      });

    setLoadingOrders(true);
    apiClient.get<Order[]>(`/Orders/user/${user?.userid}`)
      .then(response => setOrders(response.data))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
    if (user?.rolename === 'Customer') {
      returnRequestsApi.getMine()
        .then(response => setReturnOrderIds(new Set(response.data.map(request => request.orderid))))
        .catch(() => setReturnOrderIds(new Set()));
    }
  }, [isLoggedIn, user?.userid, user?.fullname, user?.email, user?.phone, user?.rolename, navigate]);

  const handleSaveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!profileForm.fullname.trim()) {
      notifyError('Vui lòng nhập họ và tên.');
      return;
    }

    setSavingProfile(true);
    try {
      const response = await apiClient.put<ProfileInfo>('/Profile/me', {
        fullname: profileForm.fullname.trim(),
        email: profileForm.email.trim() || null,
        phone: profileForm.phone.trim() || null,
      });

      const updated = response.data;
      setProfile(updated);
      setProfileForm({
        fullname: updated.fullname ?? '',
        email: updated.email ?? '',
        phone: updated.phone ?? '',
      });
      updateStoredUser({
        userid: String(updated.userid),
        username: updated.username,
        fullname: updated.fullname,
        email: updated.email ?? updated.username,
        phone: updated.phone,
        rolename: updated.rolename ?? user?.rolename,
      });
      refreshAuth();
      setEditingProfile(false);
      notifySuccess('Đã cập nhật thông tin tài khoản.');
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Không thể cập nhật thông tin tài khoản.'));
    } finally {
      setSavingProfile(false);
    }
  };

  if (!user) return null;

  const currentProfile = profile ?? {
    userid: Number(user.userid),
    username: user.username,
    fullname: user.fullname,
    email: user.email,
    phone: user.phone,
    rolename: user.rolename,
  };
  const avatarLetter = currentProfile.fullname?.charAt(0).toUpperCase() ?? 'U';
  const completedOrders = orders.filter(order => ['completed', 'delivered'].includes(order.orderstatus?.toLowerCase())).length;
  const pendingOrders = orders.filter(order => ['pending', 'confirmed', 'processing', 'shipping', 'shipped'].includes(order.orderstatus?.toLowerCase())).length;
  const returnsPath = user.rolename === 'Customer'
    ? '/returns'
    : user.rolename === 'Admin'
      ? '/admin/returns'
      : ['Manager', 'Sales', 'Warehouse'].includes(user.rolename)
        ? '/staff/returns'
        : null;
  const filteredOrders = orders.filter(order => {
    const status = order.orderstatus?.toLowerCase();
    const payment = order.paymentstatus?.toLowerCase();
    if (orderFilter === 'all') return true;
    if (orderFilter === 'payment') return status === 'pending' && !['paid', 'depositpaid'].includes(payment ?? '');
    if (orderFilter === 'processing') return ['pending', 'confirmed', 'processing'].includes(status ?? '') && ['paid', 'depositpaid'].includes(payment ?? '');
    if (orderFilter === 'shipping') return ['shipping', 'shipped'].includes(status);
    if (orderFilter === 'completed') return ['completed', 'delivered'].includes(status) && !returnOrderIds.has(order.orderid);
    if (orderFilter === 'cancelled') return status === 'cancelled';
    return returnOrderIds.has(order.orderid) || ['returned', 'refunded'].includes(status);
  });
  const orderTabs: Array<{ key: OrderFilter; label: string }> = [
    { key: 'all', label: 'Tất cả' },
    { key: 'payment', label: 'Chờ thanh toán' },
    { key: 'processing', label: 'Đang xử lý' },
    { key: 'shipping', label: 'Vận chuyển' },
    { key: 'completed', label: 'Hoàn thành' },
    { key: 'cancelled', label: 'Đã hủy' },
    { key: 'returns', label: 'Trả hàng/Hoàn tiền' },
  ];

  return (
    <div className="customer-shell min-h-screen pb-16">
      <Seo title="Tài khoản của tôi - Cuồng Điện Thoại" description="Trang tài khoản và lịch sử đơn hàng của khách hàng Cuồng Điện Thoại." noIndex />
      <section className="border-b customer-rule bg-[#ffffff] px-3 py-6 sm:px-4 sm:py-8">
        <div className="customer-container">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold text-[#241516] sm:text-4xl">
                Tài khoản của tôi
              </h1>
              <p className="mt-2 text-sm text-[#795f61]">
                Theo dõi đơn hàng, đổi trả, bảo hành và đánh giá sau mua.
              </p>
            </div>
            <Link to="/products" className="customer-button-outline">
              Tiếp tục mua sắm <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <main className="customer-container grid gap-6 px-3 py-6 sm:px-4 sm:py-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <div className="customer-panel p-5 text-center sm:p-6">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl border border-[#f3c8cb] bg-[#fff1f2] text-3xl font-bold text-[#c4000b]">
              {avatarLetter}
            </div>
            <h2 className="text-lg font-bold text-[#241516]">{currentProfile.fullname}</h2>
            <p className="mt-1 text-sm text-[#795f61]">{currentProfile.email}</p>
            <span className="mt-3 inline-flex rounded-md bg-[#fff1f2] px-3 py-1 text-xs font-semibold text-[#c4000b]">
              {user.rolename}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="customer-panel p-4">
              <p className="text-xs font-medium text-[#795f61]">Đơn hàng</p>
              <p className="mt-1 text-2xl font-bold text-[#241516]">{orders.length}</p>
            </div>
            <div className="customer-panel p-4">
              <p className="text-xs font-medium text-[#795f61]">Đang xử lý</p>
              <p className="mt-1 text-2xl font-bold text-[#c4000b]">{pendingOrders}</p>
            </div>
          </div>

          <div className="customer-panel p-2">
            <button
              type="button"
              onClick={() => scrollToSection(profileRef)}
              className="flex w-full items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold text-[#3a282a] hover:bg-[#fff1f2] hover:text-[#c4000b]"
            >
              <span className="flex items-center gap-2"><User size={16} /> Thông tin cá nhân</span>
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => scrollToSection(ordersRef)}
              className="flex w-full items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold text-[#3a282a] hover:bg-[#fff1f2] hover:text-[#c4000b]"
            >
              <span className="flex items-center gap-2"><Package size={16} /> Lịch sử đơn hàng</span>
              <ChevronRight size={14} />
            </button>
            {returnsPath && (
              <Link to={returnsPath} className="flex items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold text-[#3a282a] hover:bg-[#fff1f2] hover:text-[#c4000b]">
                <span className="flex items-center gap-2">
                  <RotateCcw size={16} />
                  {user.rolename === 'Customer' ? 'Đổi trả & hoàn tiền' : 'Quản lý đổi trả'}
                </span>
                <ChevronRight size={14} />
              </Link>
            )}
            <Link to="/order-lookup" className="flex items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold text-[#3a282a] hover:bg-[#fff1f2] hover:text-[#c4000b]">
              <span className="flex items-center gap-2"><ClipboardList size={16} /> Tra cứu đơn</span>
              <ChevronRight size={14} />
            </Link>
            <button
              type="button"
              onClick={() => scrollToSection(reviewsRef)}
              className="flex w-full items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold text-[#3a282a] hover:bg-[#fff1f2] hover:text-[#c4000b]"
            >
              <span className="flex items-center gap-2"><Star size={16} /> Đánh giá của tôi</span>
              <ChevronRight size={14} />
            </button>

            {user.rolename === 'Admin' && (
              <Link to="/admin" className="flex items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold text-[#c4000b] hover:bg-[#fff1f2]">
                <span className="flex items-center gap-2"><LayoutDashboard size={16} /> Vào trang quản trị</span>
                <ChevronRight size={14} />
              </Link>
            )}
            {user.rolename !== 'Admin' && user.rolename !== 'Customer' && (
              <Link to="/staff" className="flex items-center justify-between gap-3 rounded-lg p-3 text-sm font-semibold text-[#c4000b] hover:bg-[#fff1f2]">
                <span className="flex items-center gap-2"><ClipboardList size={16} /> Vào trang vận hành</span>
                <ChevronRight size={14} />
              </Link>
            )}

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 rounded-lg p-3 text-sm font-semibold text-[#c4000b] hover:bg-[#fff1f2]"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </aside>

        <section className="space-y-6">
          <div ref={profileRef} className="scroll-mt-28 customer-panel p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[#241516]">Thông tin cá nhân</h2>
              {!editingProfile ? (
                <button
                  type="button"
                  onClick={() => setEditingProfile(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#eadbdd] px-4 py-2 text-xs font-semibold text-[#3a282a] hover:border-[#e30613] hover:bg-[#fff1f2] hover:text-[#c4000b]"
                >
                  <Edit3 size={15} /> Chỉnh sửa
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingProfile(false);
                    setProfileForm({
                      fullname: currentProfile.fullname ?? '',
                      email: currentProfile.email ?? '',
                      phone: currentProfile.phone ?? '',
                    });
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#eadbdd] px-4 py-2 text-xs font-semibold text-[#795f61] hover:border-[#d9b8bb]"
                >
                  <X size={15} /> Hủy
                </button>
              )}
            </div>

            {editingProfile ? (
              <form onSubmit={handleSaveProfile} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-[#795f61]">Họ và tên</span>
                  <input
                    value={profileForm.fullname}
                    onChange={event => setProfileForm(prev => ({ ...prev, fullname: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-sm font-bold outline-none focus:border-[#e30613]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#795f61]">Email</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={event => setProfileForm(prev => ({ ...prev, email: event.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-sm font-bold outline-none focus:border-[#e30613]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-[#795f61]">Số điện thoại</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="0[0-9]{9}"
                    maxLength={10}
                    value={profileForm.phone}
                    onChange={event => setProfileForm(prev => ({ ...prev, phone: digitsOnly(event.target.value) }))}
                    className="mt-2 w-full rounded-2xl border border-[#e5e7eb] px-4 py-3 text-sm font-bold outline-none focus:border-[#e30613]"
                  />
                </label>
                <div className="rounded-lg border border-[#eadbdd] bg-[#fff9f9] p-4">
                  <p className="text-xs font-semibold text-[#795f61]">Tên đăng nhập</p>
                  <p className="mt-1 text-sm font-semibold text-[#241516]">{currentProfile.username}</p>
                  <p className="mt-1 text-xs text-[#9b7d80]">Tên đăng nhập không đổi tại đây.</p>
                </div>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-[#e30613] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c4000b] disabled:bg-slate-300"
                >
                  <Save size={16} /> {savingProfile ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { label: 'Họ và tên', value: currentProfile.fullname },
                  { label: 'Email', value: currentProfile.email },
                  { label: 'Số điện thoại', value: currentProfile.phone },
                  { label: 'Tên đăng nhập', value: currentProfile.username },
                  { label: 'Vai trò', value: currentProfile.rolename },
                ].map(field => (
                  <div key={field.label} className="rounded-lg border border-[#eadbdd] bg-[#fffdfd] p-4">
                    <p className="text-xs font-semibold text-[#9b7d80]">{field.label}</p>
                    <p className="mt-1.5 text-sm font-semibold text-[#241516]">{field.value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div ref={ordersRef} className="scroll-mt-28 customer-panel p-4 sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-[#241516]">Lịch sử đơn hàng</h2>
              <div className="hidden gap-3 text-xs font-semibold text-[#795f61] sm:flex">
                <span>{completedOrders} hoàn tất</span>
                <span>{pendingOrders} đang xử lý</span>
              </div>
            </div>

            <div className="mb-5 overflow-x-auto border-b border-slate-200">
              <div className="flex min-w-max">
                {orderTabs.map(tab => {
                  const count = orders.filter(order => {
                    if (tab.key === 'all') return true;
                    const status = order.orderstatus?.toLowerCase();
                    const payment = order.paymentstatus?.toLowerCase();
                    if (tab.key === 'payment') return status === 'pending' && !['paid', 'depositpaid'].includes(payment ?? '');
                    if (tab.key === 'processing') return ['pending', 'confirmed', 'processing'].includes(status ?? '') && ['paid', 'depositpaid'].includes(payment ?? '');
                    if (tab.key === 'shipping') return ['shipping', 'shipped'].includes(status);
                    if (tab.key === 'completed') return ['completed', 'delivered'].includes(status) && !returnOrderIds.has(order.orderid);
                    if (tab.key === 'cancelled') return status === 'cancelled';
                    return returnOrderIds.has(order.orderid) || ['returned', 'refunded'].includes(status);
                  }).length;
                  return (
                    <button key={tab.key} type="button" onClick={() => setOrderFilter(tab.key)}
                      className={`border-b-2 px-4 py-3 text-sm font-bold transition ${orderFilter === tab.key ? 'border-[#e30613] text-[#e30613]' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                      {tab.label}{count > 0 && tab.key !== 'all' ? ` (${count})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>

            {loadingOrders ? (
              <div className="space-y-3">
                {[1, 2, 3].map(item => <div key={item} className="h-20 animate-pulse rounded-lg bg-[#fff1f2]" />)}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="border border-dashed border-[#e5e7eb] px-6 py-14 text-center">
                <Package size={44} className="mx-auto mb-3 text-slate-300" />
                <p className="font-semibold text-[#241516]">Không có đơn hàng ở trạng thái này.</p>
                <Link to="/products" className="mt-4 inline-flex text-sm font-semibold text-[#c4000b] hover:underline">
                  Mua sắm ngay <ChevronRight size={15} />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => (
                  <article key={order.orderid} className="overflow-hidden rounded-lg border border-[#eadbdd] bg-[#ffffff]">
                    <Link
                      to={`/order-lookup?orderId=${order.orderid}&mode=detail`}
                      className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-[#fff9f9] sm:flex-row sm:items-center sm:gap-4"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fff1f2] text-[#c4000b]">
                        <Package size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#241516]">Đơn #{order.orderid}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-[#9b7d80]">
                          <Clock size={11} /> {formatDate(order.orderdate)}
                          {order.shippingaddress && ` · ${order.shippingaddress}`}
                        </p>
                      </div>
                      <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:block sm:w-auto sm:text-right">
                        <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${statusColor(order.orderstatus)}`}>
                          {statusLabel(order.orderstatus)}
                        </span>
                        <p className="mt-0 text-sm font-bold text-[#c4000b] sm:mt-1">{formatCurrency(order.totalamount)}</p>
                      </div>
                      <ChevronRight size={16} className="text-[#b79a9c]" />
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div ref={reviewsRef} className="scroll-mt-28">
            <MyReviews />
          </div>
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
