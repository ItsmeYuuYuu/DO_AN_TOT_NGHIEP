import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, User, CheckCircle, ShoppingBag, ArrowLeft } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { useCart } from '@/features/orders/context/CartContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { formatCurrency } from '@/utils/formatters';

interface CheckoutForm {
  fullname: string;
  phone: string;
  address: string;
  city: string;
  note: string;
  paymentMethod: 'COD' | 'VNPAY' | 'BANK';
}

const CheckoutPage: React.FC = () => {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const { user } = useAuth();

  const [form, setForm] = useState<CheckoutForm>({
    fullname: user?.fullname ?? '',
    phone: '',
    address: '',
    city: '',
    note: '',
    paymentMethod: 'COD',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (items.length === 0 && !success) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <ShoppingBag size={48} className="text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-black text-slate-800 mb-4">Giỏ hàng trống</h2>
        <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700">
          <ArrowLeft size={16} /> Về trang chủ
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Đặt hàng thành công!</h2>
        <p className="text-slate-500 mb-8">Cảm ơn bạn đã mua sắm. Chúng tôi sẽ liên hệ xác nhận đơn hàng sớm nhất.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/profile" className="px-6 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
            Xem đơn hàng
          </Link>
          <Link to="/" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  const shipping = totalPrice >= 2_000_000 ? 0 : 30_000;
  const grandTotal = totalPrice + shipping;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullname.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const shippingAddress = `${form.address}, ${form.city}`;
      await apiClient.post('/Orders', {
        userid: user ? parseInt(user.userid) : null,
        orderstatus: 'Pending',
        shippingaddress: shippingAddress,
        paymentmethod: form.paymentMethod,
        note: form.note,
        orderdate: new Date().toISOString(),
        totalamount: grandTotal,
        items: items.map(i => ({ variantid: i.variantId, quantity: i.quantity })),
      });
      clearCart();
      setSuccess(true);
    } catch {
      setError('Đặt hàng thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all";
  const labelClass = "block text-sm font-bold text-slate-700 mb-1.5";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Thanh toán</h1>
        <p className="text-slate-500 text-sm mt-1">{totalItems} sản phẩm · {formatCurrency(grandTotal)}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping info */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="font-black text-slate-900 mb-5 flex items-center gap-2">
                <MapPin size={18} className="text-blue-500" /> Thông tin nhận hàng
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}><User size={12} className="inline mr-1" />Họ và tên *</label>
                  <input name="fullname" value={form.fullname} onChange={handleChange} placeholder="Nguyễn Văn A" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}><Phone size={12} className="inline mr-1" />Số điện thoại *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} placeholder="0901234567" className={inputClass} required />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Địa chỉ *</label>
                  <input name="address" value={form.address} onChange={handleChange} placeholder="Số nhà, tên đường, phường/xã" className={inputClass} required />
                </div>
                <div>
                  <label className={labelClass}>Thành phố / Tỉnh</label>
                  <input name="city" value={form.city} onChange={handleChange} placeholder="Hồ Chí Minh" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Ghi chú</label>
                  <input name="note" value={form.note} onChange={handleChange} placeholder="Giao giờ hành chính..." className={inputClass} />
                </div>
              </div>
            </div>

            {/* Payment method */}
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="font-black text-slate-900 mb-5">Phương thức thanh toán</h2>
              <div className="space-y-3">
                {([
                  { value: 'COD', label: 'Thanh toán khi nhận hàng (COD)', desc: 'Trả tiền mặt khi nhận hàng' },
                  { value: 'VNPAY', label: 'VNPAY QR', desc: 'Quét mã QR để thanh toán' },
                  { value: 'BANK', label: 'Chuyển khoản ngân hàng', desc: 'Thông tin TK sẽ gửi qua email' },
                ] as const).map(m => (
                  <label
                    key={m.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.paymentMethod === m.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" name="paymentMethod" value={m.value}
                      checked={form.paymentMethod === m.value} onChange={handleChange} className="accent-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{m.label}</p>
                      <p className="text-xs text-slate-400">{m.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm sticky top-24">
              <h2 className="font-black text-slate-900 text-lg mb-4">Đơn hàng</h2>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map(item => (
                  <div key={item.variantId} className="flex items-center gap-3">
                    <img src={item.imageUrl} alt={item.productName} className="w-10 h-10 object-contain rounded-lg bg-slate-50 border border-slate-100 p-0.5"
                      onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/40x40'; }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{item.productName}</p>
                      <p className="text-xs text-slate-400">x{item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính</span><span>{formatCurrency(totalPrice)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Vận chuyển</span>
                  <span className={shipping === 0 ? 'text-emerald-600 font-semibold' : ''}>
                    {shipping === 0 ? 'Miễn phí' : formatCurrency(shipping)}
                  </span>
                </div>
                <div className="flex justify-between font-black text-slate-900 text-base pt-2 border-t border-slate-100">
                  <span>Tổng cộng</span>
                  <span className="text-orange-500">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-5 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5 disabled:translate-y-0"
              >
                {loading ? 'Đang xử lý...' : '✓ Xác nhận đặt hàng'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
