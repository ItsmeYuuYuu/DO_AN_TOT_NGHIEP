import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CreditCard,
  MapPin,
  PackageCheck,
  Phone,
  ShieldCheck,
  ShoppingBag,
  User,
} from 'lucide-react';
import apiClient from '@/api/apiClient';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useCart } from '@/features/orders/context/CartContext';
import { warrantyPackagesApi } from '@/features/orders/api/warrantyPackagesApi';
import type { WarrantyPackage } from '@/features/orders/api/warrantyPackagesApi';
import { formatCurrency } from '@/utils/formatters';
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
    const packageId = selectedPackages[item.variantId];
    if (!packageId) return sum;
    const warrantyPackage = packages.find(pkg => pkg.packageid === packageId);
    return sum + (warrantyPackage?.price || 0) * item.quantity;
  }, 0), [items, packages, selectedPackages]);

  const grandTotal = totalPrice + shipping + totalWarrantyPrice;
  const requiredPayment = form.paymentMethod === 'COD'
    ? 0
    : form.paymentOption === 'Deposit30'
      ? Math.round(grandTotal * 0.3)
      : grandTotal;

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="customer-shell min-h-screen px-4 py-16">
        <div className="customer-panel-soft mx-auto max-w-2xl px-6 py-20 text-center">
          <ShoppingBag className="mx-auto mb-5 text-[#1f2937]/25" size={58} />
          <h2 className="customer-display text-4xl font-bold text-[#1f2937]">Giỏ hàng trống</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
            Bạn cần thêm sản phẩm vào giỏ trước khi thanh toán.
          </p>
          <Link to="/products" className="customer-button-dark mt-7">
            <ArrowLeft size={15} /> Về danh sách sản phẩm
          </Link>
        </div>
      </div>
    );
  }

  if (createdOrder) {
    const isGuestOrder = createdOrder.checkouttype === 'Guest';
    return (
      <div className="customer-shell min-h-screen px-4 py-16">
        <div className="customer-panel-soft mx-auto max-w-2xl px-6 py-16 text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center bg-emerald-100 text-emerald-700">
            <CheckCircle size={50} />
          </div>
          <p className="customer-label">Order created</p>
          <h2 className="customer-display mt-2 text-4xl font-bold text-[#1f2937]">
            Đặt hàng thành công
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Mã đơn hàng của bạn là <span className="font-black text-[#c4000b]">#{createdOrder.orderid}</span>.
          </p>
          {createdOrder.requiredpayment && createdOrder.requiredpayment > 0 && (
            <div className="mx-auto mt-6 max-w-md border border-[#e5e7eb] bg-white p-4 text-sm text-[#1f2937]">
              Cần thanh toán trước <span className="font-black text-[#c4000b]">{formatCurrency(createdOrder.requiredpayment)}</span>.
              Hàng được giữ trong 15 phút trong lúc bạn hoàn tất thanh toán.
            </div>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {createdOrder.paymenttoken && (
              <Link to={`/payment/${createdOrder.orderid}?token=${createdOrder.paymenttoken}`} className="customer-button-dark">
                Thanh toán ngay <ArrowRight size={15} />
              </Link>
            )}
            <Link to={isGuestOrder ? '/order-lookup' : '/profile'} className="customer-button-outline">
              Xem đơn hàng
            </Link>
            <Link to="/products" className="customer-button-outline">
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
        items: items.map(item => ({
          variantid: item.variantId,
          quantity: item.quantity,
          packageid: selectedPackages[item.variantId] || null,
        })),
      });
      await clearCart();
      setCreatedOrder(response.data);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Đặt hàng thất bại. Vui lòng thử lại.'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'customer-input';
  const labelClass = 'mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500';
  const paymentMethods = [
    ...(isLoggedIn ? [{ value: 'COD', label: 'Thanh toán khi nhận hàng (COD)', desc: 'Dành cho tài khoản đã đăng nhập' }] : []),
    { value: 'MOMO', label: 'Momo', desc: 'Đặt cọc hoặc thanh toán trước qua ví Momo' },
    { value: 'VNPAY', label: 'VNPay', desc: 'Quét mã QR hoặc thanh toán qua cổng VNPay' },
    { value: 'BANK', label: 'Chuyển khoản ngân hàng', desc: 'Nhân viên đối soát và xác nhận thanh toán' },
  ] as const;

  return (
    <div className="customer-shell min-h-screen pb-16">
      <section className="border-b customer-rule bg-[#ffffff] px-3 py-6 sm:px-4 sm:py-8">
        <div className="customer-container">
          <p className="customer-label">Checkout desk</p>
          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="customer-display text-3xl font-bold text-[#1f2937] sm:text-4xl md:text-5xl">Thanh toán</h1>
              <p className="mt-3 text-sm text-slate-500">
                {totalItems} sản phẩm · Tổng tạm tính {formatCurrency(grandTotal)}
              </p>
            </div>
            <div className="grid grid-cols-3 border border-[#e5e7eb] bg-white text-center text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 sm:text-[10px] sm:tracking-[0.14em]">
              {['Nhận hàng', 'Thanh toán', 'Xác nhận'].map(step => (
                <span key={step} className="border-r border-[#e5e7eb] px-3 py-2 last:border-r-0">{step}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="customer-container grid gap-6 px-3 py-6 sm:px-4 sm:py-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5 sm:space-y-6">
          {!isLoggedIn && (
            <div className="flex gap-3 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldCheck size={21} className="shrink-0" />
              <div>
                <p className="font-black">Bạn đang mua với tư cách khách vãng lai.</p>
                <p className="mt-1 leading-6">COD bị tắt để chống bom hàng. Bạn cần đặt cọc 30% hoặc thanh toán trước 100%.</p>
              </div>
            </div>
          )}

          <section className="customer-panel p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f2937] text-white">
                <MapPin size={20} />
              </div>
              <div>
                <p className="customer-label">Step 1</p>
                <h2 className="text-xl font-black text-[#1f2937]">Thông tin nhận hàng</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label>
                <span className={labelClass}><User size={12} className="mr-1 inline" />Họ và tên *</span>
                <input name="fullname" value={form.fullname} onChange={handleChange} placeholder="Nguyễn Văn A" className={inputClass} required />
              </label>
              <label>
                <span className={labelClass}><Phone size={12} className="mr-1 inline" />Số điện thoại *</span>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="0901234567" className={inputClass} required />
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>Email</span>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" className={inputClass} />
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>Địa chỉ *</span>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Số nhà, tên đường, phường/xã" className={inputClass} required />
              </label>
              <label>
                <span className={labelClass}>Thành phố / Tỉnh</span>
                <input name="city" value={form.city} onChange={handleChange} placeholder="Hồ Chí Minh" className={inputClass} />
              </label>
              <label>
                <span className={labelClass}>Ghi chú</span>
                <input name="note" value={form.note} onChange={handleChange} placeholder="Giao giờ hành chính..." className={inputClass} />
              </label>
            </div>
          </section>

          <section className="customer-panel p-4 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f2937] text-white">
                <CreditCard size={20} />
              </div>
              <div>
                <p className="customer-label">Step 2</p>
                <h2 className="text-xl font-black text-[#1f2937]">Phương thức thanh toán</h2>
              </div>
            </div>
            <div className="grid gap-3">
              {paymentMethods.map(method => (
                <label
                  key={method.value}
                  className={`flex cursor-pointer items-start gap-4 rounded-2xl border p-4 transition ${
                    form.paymentMethod === method.value
                    ? 'border-[#e30613] bg-[#e30613] text-white shadow-[0_12px_28px_rgba(227,6,19,0.18)]'
                      : 'border-[#e5e7eb] bg-white text-[#1f2937] hover:border-[#1f2937]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.value}
                    checked={form.paymentMethod === method.value}
                    onChange={handleChange}
                    className="mt-1 accent-[#e30613]"
                  />
                  <span>
                    <span className="block text-sm font-black">{method.label}</span>
                    <span className={`mt-1 block text-xs leading-5 ${form.paymentMethod === method.value ? 'text-white/65' : 'text-slate-500'}`}>
                      {method.desc}
                    </span>
                  </span>
                </label>
              ))}
            </div>

            {form.paymentMethod !== 'COD' && (
              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                {[
                  { value: 'Deposit30', label: 'Đặt cọc 30%', desc: formatCurrency(Math.round(grandTotal * 0.3)) },
                  { value: 'Full', label: 'Thanh toán 100%', desc: formatCurrency(grandTotal) },
                ].map(option => (
                  <label
                    key={option.value}
                    className={`cursor-pointer rounded-2xl border p-4 transition ${
                      form.paymentOption === option.value
                        ? 'border-[#e30613] bg-[#e30613]/10'
                        : 'border-[#e5e7eb] bg-white hover:border-[#e30613]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentOption"
                      value={option.value}
                      checked={form.paymentOption === option.value}
                      onChange={handleChange}
                      className="mr-2 accent-[#e30613]"
                    />
                    <span className="text-sm font-black text-[#1f2937]">{option.label}</span>
                    <p className="mt-1 text-xs text-slate-500">Cần thanh toán: {option.desc}</p>
                  </label>
                ))}
              </div>
            )}
          </section>

          {error && (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {error}
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="customer-panel p-4 sm:p-6">
            <p className="customer-label">Order summary</p>
            <h2 className="customer-display mt-2 text-3xl font-bold text-[#1f2937]">Đơn hàng</h2>

            <div className="mt-5 max-h-72 space-y-3 overflow-y-auto pr-1">
              {items.map(item => (
                <div key={item.variantId} className="border border-[#e5e7eb] bg-[#ffffff] p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-12 w-12 border border-[#e5e7eb] bg-white object-contain p-1"
                      onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-[#1f2937]">{item.productName}</p>
                      <p className="text-xs text-slate-400">x{item.quantity}</p>
                    </div>
                    <span className="text-xs font-black text-[#c4000b]">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                  {packages.length > 0 && (
                    <label className="mt-3 block">
                      <span className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                        <PackageCheck size={12} /> Bảo hành mở rộng
                      </span>
                      <select
                        className="customer-input py-2 text-xs"
                        value={selectedPackages[item.variantId] || ''}
                        onChange={event => {
                          const value = event.target.value;
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
                    </label>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2 border-t border-[#e5e7eb] pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span><span>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vận chuyển</span>
                <span className={shipping === 0 ? 'font-bold text-emerald-700' : ''}>
                  {shipping === 0 ? 'Miễn phí' : formatCurrency(shipping)}
                </span>
              </div>
              {totalWarrantyPrice > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Gói bảo hành</span>
                  <span className="font-bold text-[#1f2937]">{formatCurrency(totalWarrantyPrice)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#e5e7eb] pt-3 text-base font-black text-[#1f2937]">
                <span>Tổng cộng</span>
                <span className="text-2xl text-[#c4000b]">{formatCurrency(grandTotal)}</span>
              </div>
              {requiredPayment > 0 && (
                <div className="flex justify-between bg-[#ffd166]/25 px-3 py-2 font-black text-[#1f2937]">
                  <span>Cần thanh toán trước</span>
                  <span>{formatCurrency(requiredPayment)}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="customer-button-dark mt-6 w-full disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? 'Đang xử lý...' : 'Xác nhận đặt hàng'} <ArrowRight size={15} />
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default CheckoutPage;
