import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ClipboardList,
  Clock,
  LayoutDashboard,
  LogOut,
  Package,
  RotateCcw,
  ShieldCheck,
  Star,
  User,
} from 'lucide-react';
import apiClient from '@/api/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { MyReviews } from './MyReviews';

interface Order {
  orderid: number;
  orderdate: string;
  orderstatus: string;
  totalamount: number;
  shippingaddress: string;
  orderitems?: {
    orderitemid: number;
    imei?: string;
    sellingprice: number;
    warrantyprice?: number;
    packagename?: string;
  }[];
}

const statusColor = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'pending': return 'bg-amber-100 text-amber-800';
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'shipping': return 'bg-purple-100 text-purple-800';
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
    shipping: 'Đang giao',
    delivered: 'Đã nhận',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy',
  };
  return map[status?.toLowerCase()] ?? status;
};

const ProfilePage: React.FC = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/auth/login');
      return;
    }
    setLoadingOrders(true);
    apiClient.get<Order[]>(`/Orders/user/${user?.userid}`)
      .then(response => setOrders(response.data))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [isLoggedIn, user, navigate]);

  if (!user) return null;

  const avatarLetter = user.fullname?.charAt(0).toUpperCase() ?? 'U';
  const completedOrders = orders.filter(order => ['completed', 'delivered'].includes(order.orderstatus?.toLowerCase())).length;
  const pendingOrders = orders.filter(order => ['pending', 'confirmed', 'shipping'].includes(order.orderstatus?.toLowerCase())).length;

  return (
    <div className="customer-shell min-h-screen pb-16">
      <section className="border-b customer-rule bg-[#fffdf8] px-4 py-8">
        <div className="customer-container">
          <p className="customer-label">Member account</p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="customer-display text-4xl font-bold text-[#10233f] md:text-5xl">
                Tài khoản của tôi
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                Theo dõi đơn hàng, đổi trả, bảo hành và đánh giá sau mua.
              </p>
            </div>
            <Link to="/products" className="customer-button-outline">
              Tiếp tục mua sắm <ChevronRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <main className="customer-container grid gap-8 px-4 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-5">
          <div className="customer-panel p-6 text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center bg-[#10233f] text-4xl font-black text-white shadow-[6px_6px_0_rgba(255,91,53,0.45)]">
              {avatarLetter}
            </div>
            <h2 className="text-xl font-black text-[#10233f]">{user.fullname}</h2>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            <span className="mt-3 inline-flex bg-[#75d7dc]/25 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#10233f]">
              {user.rolename}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="customer-panel p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Đơn hàng</p>
              <p className="mt-1 text-2xl font-black text-[#10233f]">{orders.length}</p>
            </div>
            <div className="customer-panel p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Đang xử lý</p>
              <p className="mt-1 text-2xl font-black text-[#db3d1c]">{pendingOrders}</p>
            </div>
          </div>

          <div className="customer-panel p-2">
            <Link to="/returns" className="flex items-center justify-between gap-3 p-3 text-sm font-black text-[#10233f] hover:bg-[#f4f0e8]">
              <span className="flex items-center gap-2"><RotateCcw size={16} /> Đổi trả & hoàn tiền</span>
              <ChevronRight size={14} />
            </Link>
            <Link to="/order-lookup" className="flex items-center justify-between gap-3 p-3 text-sm font-black text-[#10233f] hover:bg-[#f4f0e8]">
              <span className="flex items-center gap-2"><ClipboardList size={16} /> Tra cứu đơn</span>
              <ChevronRight size={14} />
            </Link>
            <button className="flex w-full items-center justify-between gap-3 p-3 text-sm font-black text-[#10233f] hover:bg-[#f4f0e8]">
              <span className="flex items-center gap-2"><Star size={16} /> Đánh giá của tôi</span>
              <ChevronRight size={14} />
            </button>

            {user.rolename === 'Admin' && (
              <Link to="/admin" className="flex items-center justify-between gap-3 p-3 text-sm font-black text-purple-700 hover:bg-purple-50">
                <span className="flex items-center gap-2"><LayoutDashboard size={16} /> Vào trang quản trị</span>
                <ChevronRight size={14} />
              </Link>
            )}
            {user.rolename !== 'Admin' && user.rolename !== 'Customer' && (
              <Link to="/staff" className="flex items-center justify-between gap-3 p-3 text-sm font-black text-emerald-700 hover:bg-emerald-50">
                <span className="flex items-center gap-2"><ClipboardList size={16} /> Vào trang vận hành</span>
                <ChevronRight size={14} />
              </Link>
            )}

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-2 p-3 text-sm font-black text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="customer-panel p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="customer-label">Profile</p>
                <h2 className="mt-1 text-xl font-black text-[#10233f]">Thông tin cá nhân</h2>
              </div>
              <User className="text-[#db3d1c]" size={22} />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: 'Họ và tên', value: user.fullname },
                { label: 'Email', value: user.email },
                { label: 'Tên đăng nhập', value: user.username },
                { label: 'Vai trò', value: user.rolename },
              ].map(field => (
                <div key={field.label} className="border border-[#d9d2c5] bg-[#fffdf8] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{field.label}</p>
                  <p className="mt-1 text-sm font-black text-[#10233f]">{field.value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="customer-panel p-6">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="customer-label">Orders</p>
                <h2 className="mt-1 text-xl font-black text-[#10233f]">Lịch sử đơn hàng</h2>
              </div>
              <div className="hidden gap-3 text-xs font-black text-slate-500 sm:flex">
                <span>{completedOrders} hoàn tất</span>
                <span>{pendingOrders} đang xử lý</span>
              </div>
            </div>

            {loadingOrders ? (
              <div className="space-y-3">
                {[1, 2, 3].map(item => <div key={item} className="h-20 animate-pulse bg-[#f4f0e8]" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="border border-dashed border-[#d9d2c5] px-6 py-14 text-center">
                <Package size={44} className="mx-auto mb-3 text-slate-300" />
                <p className="font-black text-[#10233f]">Bạn chưa có đơn hàng nào.</p>
                <Link to="/products" className="mt-4 inline-flex text-sm font-black text-[#db3d1c] hover:underline">
                  Mua sắm ngay <ChevronRight size={15} />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <article key={order.orderid} className="border border-[#d9d2c5] bg-[#fffdf8]">
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 p-4 text-left"
                      onClick={() => setExpandedId(expandedId === order.orderid ? null : order.orderid)}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center bg-white text-[#10233f]">
                        <Package size={19} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-[#10233f]">Đơn #{order.orderid}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-400">
                          <Clock size={11} /> {new Date(order.orderdate).toLocaleDateString('vi-VN')}
                          {order.shippingaddress && ` · ${order.shippingaddress}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`px-2.5 py-1 text-xs font-black ${statusColor(order.orderstatus)}`}>
                          {statusLabel(order.orderstatus)}
                        </span>
                        <p className="mt-1 text-sm font-black text-[#db3d1c]">{formatCurrency(order.totalamount)}</p>
                      </div>
                      <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedId === order.orderid ? 'rotate-90' : ''}`} />
                    </button>

                    {expandedId === order.orderid && order.orderitems && (
                      <div className="space-y-2 border-t border-[#d9d2c5] bg-white px-4 py-3">
                        {order.orderitems.map(item => (
                          <div key={item.orderitemid} className="flex items-center justify-between gap-4 py-1 text-sm">
                            <div>
                              <p className="font-bold text-[#10233f]">IMEI: {item.imei || 'Đang chờ'}</p>
                              {(item.warrantyprice ?? 0) > 0 && (
                                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#db3d1c]">
                                  <ShieldCheck size={12} /> {item.packagename} (+{formatCurrency(item.warrantyprice!)})
                                </p>
                              )}
                            </div>
                            <span className="font-black text-[#10233f]">{formatCurrency(item.sellingprice)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>

          <MyReviews />
        </section>
      </main>
    </div>
  );
};

export default ProfilePage;
