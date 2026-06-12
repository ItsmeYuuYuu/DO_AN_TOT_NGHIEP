import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, MapPin, Phone, ShieldCheck, ShoppingBag, User } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { useCart } from '@/features/orders/context/CartContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { formatCurrency } from '@/utils/formatters';
import { warrantyPackagesApi } from '@/features/orders/api/warrantyPackagesApi';
import type { WarrantyPackage } from '@/features/orders/api/warrantyPackagesApi';
import { getApiErrorMessage } from '@/utils/apiError';

interface CheckoutForm {
  fullname: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  note: string;
  paymentMethod: 'COD' | 'MOMO' | 'VNPAY' | 'BANK';
  paymentOption: 'Deposit30' | 'Full';
}

interface CreatedOrder {
  orderid: number;
  requiredpayment?: number;
  finalamount?: number;
  paymentstatus?: string;
  checkouttype?: string;
  paymenttoken?: string;
  reservationexpiresat?: string;
}

const CheckoutPage: React.FC = () => {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const { user, isLoggedIn } = useAuth();

  const [form, setForm] = useState<CheckoutForm>({
    fullname: user?.fullname ?? '',
    phone: '',
    email: user?.email ?? '',
    address: '',
    city: '',
    note: '',
    paymentMethod: isLoggedIn ? 'COD' : 'MOMO',
    paymentOption: 'Deposit30',
  });
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [error, setError] = useState('');
  const [packages, setPackages] = useState<WarrantyPackage[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Record<number, number>>({});

  useEffect(() => {
    warrantyPackagesApi.getAll().then(setPackages).catch(console.error);
  }, []);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      fullname: prev.fullname || user?.fullname || '',
      email: prev.email || user?.email || '',
      paymentMethod: !isLoggedIn && prev.paymentMethod === 'COD' ? 'MOMO' : prev.paymentMethod,
    }));
  }, [isLoggedIn, user]);

  const shipping = totalPrice >= 2_000_000 ? 0 : 30_000;

  const totalWarrantyPrice = useMemo(() => items.reduce((sum, item) => {
    const pkgId = selectedPackages[item.variantId];
    if (!pkgId) return sum;
    const pkg = packages.find(p => p.packageid === pkgId);
    return sum + (pkg?.price || 0) * item.quantity;
  }, 0), [items, packages, selectedPackages]);

  const grandTotal = totalPrice + shipping + totalWarrantyPrice;
  const requiredPayment = form.paymentMethod === 'COD'
    ? 0
    : form.paymentOption === 'Deposit30'
      ? Math.round(grandTotal * 0.3)
      : grandTotal;

  if (items.length === 0 && !createdOrder) {
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

  if (createdOrder) {
    const isGuestOrder = createdOrder.checkouttype === 'Guest';
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Đặt hàng thành công!</h2>
        <p className="text-slate-500 mb-3">Mã đơn hàng của bạn là <span className="font-black text-blue-700">#{createdOrder.orderid}</span>.</p>
        {createdOrder.requiredpayment && createdOrder.requiredpayment > 0 && (
          <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-2xl p-4 mb-6 text-sm">
            Cần thanh toán trước: <span className="font-black">{formatCurrency(createdOrder.requiredpayment)}</span>.
            Hàng được giữ trong 15 phút trong lúc bạn hoàn tất thanh toán.
          </div>
        )}
        <div className="flex gap-3 justify-center">
          {createdOrder.paymenttoken && (
            <Link
              to={`/payment/${createdOrder.orderid}?token=${createdOrder.paymenttoken}`}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
            >
              Thanh toán ngay
            </Link>
          )}
          <Link
            to={isGuestOrder ? '/order-lookup' : '/profile'}
            className="px-6 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
          >
            Xem đơn hàng
          </Link>
          <Link to="/" className="px-6 py-3 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullname.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ nhận hàng.');
      return;
    }
    if (!isLoggedIn && form.paymentMethod === 'COD') {
      setError('Khách vãng lai không thể chọn COD. Vui lòng chọn đặt cọc hoặc thanh toán trước.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const shippingAddress = [form.address, form.city].filter(Boolean).join(', ');
      const response = await apiClient.post<CreatedOrder>('/Orders', {
        userid: user ? parseInt(user.userid) : null,
        customername: form.fullname,
        customerphone: form.phone,
        customeremail: form.email || null,
        shippingaddress: shippingAddress,
        paymentmethod: form.paymentMethod,
        paymentoption: form.paymentMethod === 'COD' ? null : form.paymentOption,
        note: form.note,
        items: items.map(i => ({
          variantid: i.variantId,
          quantity: i.quantity,
          packageid: selectedPackages[i.variantId] || null,
        })),
      });
      await clearCart();
      setCreatedOrder(response.data);
    } catch (error: unknown) {
      setError(getApiErrorMessage(error, 'Đặt hàng thất bại. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:border-blue-500 transition-all';
  const labelClass = 'block text-sm font-bold text-slate-700 mb-1.5';
  const paymentMethods = [
    ...(isLoggedIn ? [{ value: 'COD', label: 'Thanh toán khi nhận hàng (COD)', desc: 'Chỉ dành cho tài khoản đã đăng nhập' }] : []),
    { value: 'MOMO', label: 'Momo', desc: 'Đặt cọc hoặc thanh toán trước qua ví Momo' },
    { value: 'VNPAY', label: 'VNPay', desc: 'Quét mã QR hoặc thanh toán qua cổng VNPay' },
    { value: 'BANK', label: 'Chuyển khoản ngân hàng', desc: 'Nhân viên đối soát và xác nhận thanh toán' },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-slate-900">Thanh toán</h1>
        <p className="text-slate-500 text-sm mt-1">
          {totalItems} sản phẩm · {formatCurrency(grandTotal)}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {!isLoggedIn && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800 flex gap-3">
                <ShieldCheck size={20} className="shrink-0" />
                <div>
                  <p className="font-black">Bạn đang mua với tư cách khách vãng lai.</p>
                  <p>COD bị tắt để chống bom hàng. Bạn cần đặt cọc 30% hoặc thanh toán trước 100%.</p>
                </div>
              </div>
            )}

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
                  <label className={labelClass}>Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" className={inputClass} />
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

            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h2 className="font-black text-slate-900 mb-5 flex items-center gap-2">
                <CreditCard size={18} className="text-blue-500" /> Phương thức thanh toán
              </h2>
              <div className="space-y-3">
                {paymentMethods.map(method => (
                  <label
                    key={method.value}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      form.paymentMethod === method.value ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.value}
                      checked={form.paymentMethod === method.value}
                      onChange={handleChange}
                      className="accent-blue-600"
                    />
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{method.label}</p>
                      <p className="text-xs text-slate-400">{method.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {form.paymentMethod !== 'COD' && (
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { value: 'Deposit30', label: 'Đặt cọc 30%', desc: formatCurrency(Math.round(grandTotal * 0.3)) },
                    { value: 'Full', label: 'Thanh toán 100%', desc: formatCurrency(grandTotal) },
                  ].map(option => (
                    <label
                      key={option.value}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        form.paymentOption === option.value ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentOption"
                        value={option.value}
                        checked={form.paymentOption === option.value}
                        onChange={handleChange}
                        className="accent-orange-600 mr-2"
                      />
                      <span className="font-black text-slate-900 text-sm">{option.label}</span>
                      <p className="text-xs text-slate-500 mt-1">Cần thanh toán: {option.desc}</p>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                {error}
              </div>
            )}
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm sticky top-24">
              <h2 className="font-black text-slate-900 text-lg mb-4">Đơn hàng</h2>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {items.map(item => (
                  <div key={item.variantId} className="flex flex-col gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.imageUrl}
                        alt={item.productName}
                        className="w-10 h-10 object-contain rounded-lg bg-white border border-slate-100 p-0.5"
                        onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/40x40'; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{item.productName}</p>
                        <p className="text-xs text-slate-400">x{item.quantity}</p>
                      </div>
                      <span className="text-xs font-bold text-slate-700">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                    {packages.length > 0 && (
                      <select
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500 text-slate-600"
                        value={selectedPackages[item.variantId] || ''}
                        onChange={e => {
                          const value = e.target.value;
                          setSelectedPackages(prev => {
                            const next = { ...prev };
                            if (!value) delete next[item.variantId];
                            else next[item.variantId] = parseInt(value);
                            return next;
                          });
                        }}
                      >
                        <option value="">Không mua bảo hành mở rộng</option>
                        {packages.map(pkg => (
                          <option key={pkg.packageid} value={pkg.packageid}>
                            {pkg.packagename} (+{formatCurrency(pkg.price)}/sp)
                          </option>
                        ))}
                      </select>
                    )}
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
                {totalWarrantyPrice > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Gói bảo hành</span>
                    <span className="text-blue-600 font-semibold">{formatCurrency(totalWarrantyPrice)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-slate-900 text-base pt-2 border-t border-slate-100">
                  <span>Tổng cộng</span>
                  <span className="text-orange-500">{formatCurrency(grandTotal)}</span>
                </div>
                {requiredPayment > 0 && (
                  <div className="flex justify-between text-blue-700 font-black bg-blue-50 rounded-xl px-3 py-2">
                    <span>Cần thanh toán trước</span>
                    <span>{formatCurrency(requiredPayment)}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-5 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 hover:-translate-y-0.5 disabled:translate-y-0"
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận đặt hàng'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CheckoutPage;
