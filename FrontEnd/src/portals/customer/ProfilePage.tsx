import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, LogOut, ChevronRight, Clock, LayoutDashboard, ClipboardList, Star } from 'lucide-react';
import { useAuth } from '@/features/auth/context/AuthContext';
import apiClient from '@/api/apiClient';
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

const statusColor = (s: string) => {
  switch (s?.toLowerCase()) {
    case 'pending':    return 'bg-amber-100 text-amber-700';
    case 'confirmed':  return 'bg-blue-100 text-blue-700';
    case 'shipping':   return 'bg-purple-100 text-purple-700';
    case 'delivered':  return 'bg-emerald-100 text-emerald-700';
    case 'cancelled':  return 'bg-red-100 text-red-700';
    default:           return 'bg-slate-100 text-slate-600';
  }
};
const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận',
    shipping: 'Đang giao', delivered: 'Đã nhận', cancelled: 'Đã hủy',
  };
  return map[s?.toLowerCase()] ?? s;
};

const ProfilePage: React.FC = () => {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isLoggedIn) { navigate('/auth/login'); return; }
    setLoadingOrders(true);
    apiClient.get<Order[]>(`/Orders/user/${user?.userid}`)
      .then(r => setOrders(r.data))
      .catch(() => setOrders([]))
      .finally(() => setLoadingOrders(false));
  }, [isLoggedIn, user, navigate]);

  if (!user) return null;

  const avatarLetter = user.fullname?.charAt(0).toUpperCase() ?? 'U';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-black text-slate-900 mb-8">Tài khoản của tôi</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-4">
          {/* Avatar card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-3xl font-black mx-auto mb-4 shadow-lg shadow-blue-200">
              {avatarLetter}
            </div>
            <h2 className="font-black text-slate-900 text-lg">{user.fullname}</h2>
            <p className="text-slate-400 text-sm mt-1">{user.email}</p>
            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
              user.rolename === 'Admin' ? 'bg-purple-100 text-purple-700' :
              user.rolename === 'Staff' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-100 text-slate-600'
            }`}>
              {user.rolename}
            </span>
          </div>

          {/* Nav */}
          <div className="bg-white rounded-2xl border border-slate-100 p-2 shadow-sm">
            {[
              { icon: <User size={16} />, label: 'Thông tin cá nhân', active: true },
              { icon: <Package size={16} />, label: 'Đơn hàng của tôi', active: false },
              { icon: <Star size={16} />, label: 'Đánh giá của tôi', active: false },
            ].map((item, i) => (
              <button key={i} className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${item.active ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                <span className="flex items-center gap-2">{item.icon}{item.label}</span>
                <ChevronRight size={14} />
              </button>
            ))}

            {/* Portal shortcut for Admin/Staff */}
            {user.rolename === 'Admin' && (
              <Link
                to="/admin"
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors mt-1"
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard size={16} />
                  Vào trang Quản trị
                </span>
                <ChevronRight size={14} />
              </Link>
            )}
            {user.rolename !== 'Admin' && user.rolename !== 'Customer' && (
              <Link
                to="/staff"
                className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors mt-1"
              >
                <span className="flex items-center gap-2">
                  <ClipboardList size={16} />
                  Vào trang vận hành
                </span>
                <ChevronRight size={14} />
              </Link>
            )}

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors mt-1"
            >
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="md:col-span-2 space-y-6">
          {/* Account info */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2"><User size={18} className="text-blue-500" /> Thông tin cá nhân</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Họ và tên', value: user.fullname },
                { label: 'Email', value: user.email },
                { label: 'Tên đăng nhập', value: user.username },
                { label: 'Vai trò', value: user.rolename },
              ].map((f, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{f.label}</p>
                  <p className="text-sm font-semibold text-slate-900 bg-slate-50 px-3 py-2 rounded-lg">{f.value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Order history */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
            <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2"><Package size={18} className="text-orange-500" /> Lịch sử đơn hàng</h3>
            {loadingOrders ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-10">
                <Package size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">Bạn chưa có đơn hàng nào.</p>
                <Link to="/" className="mt-3 inline-block text-sm text-blue-600 font-semibold hover:underline">Mua sắm ngay →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div key={order.orderid} className="border border-slate-100 rounded-xl hover:border-slate-200 transition-colors bg-white">
                    <div 
                      className="flex items-center gap-4 p-4 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === order.orderid ? null : order.orderid)}
                    >
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                        <Package size={18} className="text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm">Đơn #{order.orderid}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock size={10} /> {new Date(order.orderdate).toLocaleDateString('vi-VN')}
                          {order.shippingaddress && ` · ${order.shippingaddress}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-4">
                        <div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor(order.orderstatus)}`}>
                            {statusLabel(order.orderstatus)}
                          </span>
                          <p className="text-sm font-black text-slate-900 mt-1">{formatCurrency(order.totalamount)}</p>
                        </div>
                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedId === order.orderid ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                    {expandedId === order.orderid && order.orderitems && (
                      <div className="px-4 pb-4 border-t border-slate-50 pt-3 space-y-2 bg-slate-50 rounded-b-xl">
                        {order.orderitems.map(item => (
                          <div key={item.orderitemid} className="flex justify-between items-center text-sm py-1">
                            <div>
                              <p className="font-semibold text-slate-700">IMEI: {item.imei || 'Đang chờ'}</p>
                              {(item.warrantyprice ?? 0) > 0 && (
                                <p className="text-xs text-orange-600 font-medium">Kèm bảo hành: {item.packagename} (+{formatCurrency(item.warrantyprice!)})</p>
                              )}
                            </div>
                            <span className="font-bold text-slate-900">{formatCurrency(item.sellingprice)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* My Reviews */}
          <MyReviews />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
