import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import { Seo } from '@/components/Seo';
import { FALLBACK_PROVINCES, loadVietnamAdministrativeUnits, type ProvinceOption } from '@/data/vietnamAdministrativeUnits';
import { useAuth } from '@/features/auth/context/AuthContext';
import { warrantyPackagesApi, type WarrantyPackage } from '@/features/orders/api/warrantyPackagesApi';
import { useCart } from '@/features/orders/context/CartContext';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatCurrency } from '@/utils/formatters';
import { calculateShippingFee, getShippingZoneLabel } from '@/features/orders/shippingPolicy';

interface CheckoutForm {
  fullname: string;
  phone: string;
  email: string;
  address: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  note: string;
  paymentMethod: 'COD' | 'MOMO' | 'VNPAY' | 'BANK';
  paymentOption: 'Deposit30' | 'Full';
}

interface CreatedOrder {
  orderid: number;
  requiredpayment?: number;
  finalamount?: number;
  shippingfee?: number;
  paymentstatus?: string;
  checkouttype?: string;
  paymenttoken?: string;
  reservationexpiresat?: string;
}

interface AppliedVoucher {
  vouchercode: string;
  discountpercentage?: number;
  discountamount: number;
  eligiblesubtotal: number;
  minimumorderamount?: number;
  maximumdiscountamount?: number;
  applicableproductids: number[];
  message: string;
}

const phonePattern = /^0\d{9}$/;

const CheckoutPage: React.FC = () => {
  const { items, totalPrice, totalItems, clearCart } = useCart();
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<CheckoutForm>({
    fullname: user?.fullname ?? '',
    phone: '',
    email: user?.email ?? '',
    address: '',
    provinceCode: '',
    provinceName: '',
    wardCode: '',
    wardName: '',
    note: '',
    paymentMethod: isLoggedIn ? 'COD' : 'BANK',
    paymentOption: 'Deposit30',
  });
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [error, setError] = useState('');
  const [packages, setPackages] = useState<WarrantyPackage[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Record<number, number>>({});
  const [provinces, setProvinces] = useState<ProvinceOption[]>(FALLBACK_PROVINCES);
  const [loadingAddressData, setLoadingAddressData] = useState(true);

  // Voucher state
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  useEffect(() => {
    warrantyPackagesApi.getAll().then(setPackages).catch(console.error);
  }, []);

  const defaultWarrantyPackage = useMemo(() => {
    if (packages.length === 0) return undefined;

    return packages.find(pkg =>
      pkg.packagename
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim() === 'mac dinh')
      ?? packages.find(pkg => pkg.price === 0)
      ?? packages[0];
  }, [packages]);

  useEffect(() => {
    if (!defaultWarrantyPackage || items.length === 0) return;

    setSelectedPackages(previous => {
      const next = { ...previous };
      let changed = false;

      items.forEach(item => {
        if (!next[item.variantId]) {
          next[item.variantId] = defaultWarrantyPackage.packageid;
          changed = true;
        }
      });

      return changed ? next : previous;
    });
  }, [defaultWarrantyPackage, items]);

  useEffect(() => {
    let active = true;
    loadVietnamAdministrativeUnits()
      .then(data => {
        if (active) setProvinces(data);
      })
      .finally(() => {
        if (active) setLoadingAddressData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      fullname: prev.fullname || user?.fullname || '',
      email: prev.email || user?.email || '',
      paymentMethod: !isLoggedIn && prev.paymentMethod === 'COD' ? 'BANK' : prev.paymentMethod,
    }));
  }, [isLoggedIn, user]);

  const selectedProvince = useMemo(
    () => provinces.find(item => item.code === form.provinceCode),
    [form.provinceCode, provinces],
  );
  const wards = selectedProvince?.wards ?? [];
  const isHoChiMinhCity = useMemo(() => {
    const normalized = form.provinceName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return normalized.includes('ho chi minh');
  }, [form.provinceName]);
  const guestCodAllowed = !isLoggedIn && isHoChiMinhCity;

  useEffect(() => {
    if (!isLoggedIn && form.paymentMethod === 'COD' && !isHoChiMinhCity) {
      setForm(prev => ({ ...prev, paymentMethod: 'BANK' }));
    }
  }, [form.paymentMethod, isHoChiMinhCity, isLoggedIn]);

  const totalWarrantyPrice = useMemo(() => items.reduce((sum, item) => {
    const packageId = selectedPackages[item.variantId];
    if (!packageId) return sum;
    const warrantyPackage = packages.find(pkg => pkg.packageid === packageId);
    return sum + (warrantyPackage?.price || 0) * item.quantity;
  }, 0), [items, packages, selectedPackages]);

  const merchandiseGross = totalPrice + totalWarrantyPrice;
  const discountAmount = appliedVoucher?.discountamount ?? 0;

  const merchandiseAmount = Math.max(0, merchandiseGross - discountAmount);
  const shippingQuote = calculateShippingFee(merchandiseAmount, form.provinceName, form.wardName);
  const shipping = shippingQuote.fee;
  const grandTotal = merchandiseAmount + shipping;
  const requiredPayment = form.paymentMethod === 'COD'
    ? 0
    : form.paymentOption === 'Deposit30'
      ? Math.round(merchandiseAmount * 0.3)
      : grandTotal;

  const handleApplyVoucher = async () => {
    if (!voucherCodeInput.trim()) return;
    setValidatingVoucher(true);
    setVoucherError('');
    try {
      const res = await apiClient.post<AppliedVoucher>('/Vouchers/validate', {
        vouchercode: voucherCodeInput.trim().toUpperCase(),
        items: items.map(item => ({ variantid: item.variantId, quantity: item.quantity })),
      });
      setAppliedVoucher(res.data);
      setVoucherCodeInput('');
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, 'Mã giảm giá không hợp lệ hoặc đã hết hạn.');
      setVoucherError(msg);
      setAppliedVoucher(null);
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError('');
  };

  if (items.length === 0 && !createdOrder) {
    return (
      <div className="customer-shell min-h-screen px-4 py-16">
        <Seo title="Thanh toán - Cuồng Điện Thoại" description="Hoàn tất thông tin đặt hàng tại Cuồng Điện Thoại." noIndex />
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
        <Seo title="Đặt hàng thành công - Cuồng Điện Thoại" description="Đặt hàng thành công tại Cuồng Điện Thoại." noIndex />
        <div className="customer-panel mx-auto max-w-xl overflow-hidden shadow-md">
          {/* Banner chúc mừng màu xanh lá chuyên nghiệp */}
          <div className="bg-emerald-600 p-8 text-center text-white">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-white">
              <CheckCircle size={36} />
            </div>
            <h2 className="text-2xl font-black">Đặt hàng thành công</h2>
            <p className="mt-2 text-sm text-white/80">
              Cảm ơn bạn đã tin tưởng mua sắm tại Cuồng Điện Thoại!
            </p>
          </div>

          <div className="space-y-6 p-7 bg-white">
            <p className="text-center text-sm text-slate-500 leading-6">
              Đơn hàng của quý khách đã được ghi nhận và chuyển cho bộ phận vận hành xử lý. Nhân viên sẽ liên hệ xác nhận trong thời gian sớm nhất.
            </p>

            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 space-y-3.5 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-semibold">Mã đơn hàng</span>
                <span className="font-black text-[#c4000b]">#{createdOrder.orderid}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2">
                <span className="text-slate-500 font-semibold">Hình thức thanh toán</span>
                <span className="font-bold text-slate-800">Thanh toán khi nhận hàng (COD)</span>
              </div>
              {createdOrder.finalamount && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold">Số tiền cần trả khi nhận hàng</span>
                  <span className="font-black text-[#c4000b] text-base">{formatCurrency(createdOrder.finalamount)}</span>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to={isGuestOrder ? `/order-lookup` : '/profile'}
                className="w-full sm:w-auto text-center rounded-2xl bg-[#e30613] px-6 py-3 font-black text-white transition hover:bg-[#c4000b]"
              >
                Theo dõi đơn hàng
              </Link>
              <Link
                to="/products"
                className="w-full sm:w-auto text-center rounded-2xl border border-slate-200 px-6 py-3 font-bold text-slate-600 hover:bg-slate-50"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const updateFormValue = (name: keyof CheckoutForm, value: string) => {
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;

    if (name === 'phone') {
      updateFormValue('phone', value.replace(/\D/g, '').slice(0, 10));
      return;
    }

    if (name === 'provinceCode') {
      const province = provinces.find(item => item.code === value);
      setForm(prev => ({
        ...prev,
        provinceCode: value,
        provinceName: province?.name ?? '',
        wardCode: '',
        wardName: '',
      }));
      return;
    }

    if (name === 'wardCode') {
      const ward = wards.find(item => item.code === value);
      setForm(prev => ({
        ...prev,
        wardCode: value,
        wardName: ward?.name ?? '',
      }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.fullname.trim() || !form.phone.trim() || !form.address.trim() || !form.provinceCode) {
      setError('Vui lòng điền đầy đủ họ tên, số điện thoại, địa chỉ và tỉnh/thành phố nhận hàng.');
      return;
    }

    if (!phonePattern.test(form.phone)) {
      setError('Số điện thoại nhận hàng phải gồm 10 chữ số và bắt đầu bằng 0.');
      return;
    }

    if (wards.length > 0 && !form.wardCode) {
      setError('Vui lòng chọn phường/xã nhận hàng.');
      return;
    }

    if (!isLoggedIn && !isHoChiMinhCity) {
      setError('Khách vãng lai hiện chỉ đặt giao nội thành TP.HCM. Vui lòng đăng nhập để giao qua đơn vị vận chuyển.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const shippingAddress = [form.address.trim(), form.wardName, form.provinceName].filter(Boolean).join(', ');
      const response = await apiClient.post<CreatedOrder>('/Orders', {
        userid: user ? parseInt(user.userid) : null,
        customername: form.fullname,
        customerphone: form.phone,
        customeremail: form.email || null,
        shippingaddress: shippingAddress,
        shippingprovince: form.provinceName,
        shippingward: form.wardName,
        paymentmethod: form.paymentMethod,
        paymentoption: form.paymentMethod === 'COD' ? null : form.paymentOption,
        vouchercode: appliedVoucher?.vouchercode || null,
        note: form.note,
        items: items.map(item => ({
          variantid: item.variantId,
          quantity: item.quantity,
          packageid: selectedPackages[item.variantId] || null,
        })),
      });

      await clearCart();

      if (response.data.paymenttoken) {
        navigate(`/payment/${response.data.orderid}?token=${response.data.paymenttoken}`, { replace: true });
        return;
      }

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
    ...(isLoggedIn || guestCodAllowed ? [{
      value: 'COD',
      label: 'Thanh toán khi nhận hàng (COD)',
      desc: isLoggedIn ? 'Dành cho tài khoản đã đăng nhập' : 'Nhân viên cửa hàng giao nội thành TP.HCM',
    }] : []),
    { value: 'BANK', label: 'Chuyển khoản ngân hàng', desc: 'Chuyển khoản qua VietQR, hệ thống xác nhận tự động tức thì (Real-time)' },
  ] as const;

  return (
    <div className="customer-shell min-h-screen pb-16">
      <Seo title="Thanh toán - Cuồng Điện Thoại" description="Hoàn tất thông tin đặt hàng tại Cuồng Điện Thoại." noIndex />
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
                <p className="mt-1 leading-6">Khách vãng lai được COD hoặc chuyển khoản khi giao nội thành TP.HCM bởi nhân viên cửa hàng. Đơn ngoài TP.HCM cần đăng nhập để dùng đơn vị vận chuyển.</p>
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
                <input
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  pattern="0[0-9]{9}"
                  maxLength={10}
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="0901234567"
                  className={inputClass}
                  required
                />
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>Email</span>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" className={inputClass} />
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>Địa chỉ cụ thể *</span>
                <input name="address" value={form.address} onChange={handleChange} placeholder="Số nhà, tên đường, tòa nhà..." className={inputClass} required />
              </label>
              <label>
                <span className={labelClass}>Tỉnh / Thành phố *</span>
                <select name="provinceCode" value={form.provinceCode} onChange={handleChange} className={inputClass} required>
                  <option value="">{loadingAddressData ? 'Đang tải dữ liệu...' : 'Chọn tỉnh/thành phố'}</option>
                  {provinces.map(province => (
                    <option key={province.code} value={province.code}>{province.name}</option>
                  ))}
                </select>
              </label>
              <label>
                <span className={labelClass}>Phường / Xã {wards.length > 0 ? '*' : ''}</span>
                <select
                  name="wardCode"
                  value={form.wardCode}
                  onChange={handleChange}
                  className={inputClass}
                  disabled={!form.provinceCode || wards.length === 0}
                  required={wards.length > 0}
                >
                  <option value="">
                    {!form.provinceCode
                      ? 'Chọn tỉnh/thành phố trước'
                      : wards.length > 0
                        ? 'Chọn phường/xã'
                        : 'Chưa có dữ liệu phường/xã'}
                  </option>
                  {wards.map(ward => (
                    <option key={ward.code} value={ward.code}>{ward.name}</option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2">
                <span className={labelClass}>Ghi chú</span>
                <input name="note" value={form.note} onChange={handleChange} placeholder="Giao giờ hành chính..." className={inputClass} />
              </label>
            </div>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Dữ liệu tỉnh/phường được lấy theo danh mục hành chính mới; nếu mất mạng hệ thống sẽ dùng dữ liệu dự phòng để vẫn đặt hàng được.
            </p>
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
                  { value: 'Deposit30', label: 'Đặt cọc 30% hàng hóa', desc: formatCurrency(Math.round(merchandiseAmount * 0.3)) },
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
                    <p className="mt-1 text-xs text-slate-500">
                      Cần thanh toán: {option.desc}
                      {option.value === 'Deposit30' && ' · Phí giao hàng thu cùng số tiền còn lại'}
                    </p>
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
                        value={selectedPackages[item.variantId] ?? defaultWarrantyPackage?.packageid ?? ''}
                        onChange={event => {
                          setSelectedPackages(prev => ({
                            ...prev,
                            [item.variantId]: Number(event.target.value),
                          }));
                        }}
                      >
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

            {/* Voucher Input */}
            <div className="mt-5 border-t border-[#e5e7eb] pt-4">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Mã giảm giá (Voucher)</span>
              {appliedVoucher ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        {appliedVoucher.vouchercode}
                      </span>
                      <span className="font-semibold">Giảm {formatCurrency(appliedVoucher.discountamount)}</span>
                    </div>
                    <button type="button" onClick={handleRemoveVoucher} className="font-bold text-red-500 hover:text-red-700">Gỡ</button>
                  </div>
                  <p className="mt-2 text-[11px] text-emerald-700">
                    Áp dụng trên {formatCurrency(appliedVoucher.eligiblesubtotal)} sản phẩm đủ điều kiện
                    {appliedVoucher.discountpercentage ? ` · Giảm ${appliedVoucher.discountpercentage}%` : ''}
                    {appliedVoucher.maximumdiscountamount ? `, tối đa ${formatCurrency(appliedVoucher.maximumdiscountamount)}` : ''}.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nhập mã giảm giá..."
                      value={voucherCodeInput}
                      onChange={e => setVoucherCodeInput(e.target.value.toUpperCase())}
                      className="flex-1 border border-slate-200 focus:border-[#e30613] rounded-2xl px-3 py-2 text-xs outline-none transition-colors font-bold uppercase"
                    />
                    <button
                      type="button"
                      disabled={validatingVoucher || !voucherCodeInput.trim()}
                      onClick={handleApplyVoucher}
                      className="bg-[#1f2937] hover:bg-[#c4000b] text-white px-4 py-2 text-xs font-black rounded-2xl disabled:opacity-50 transition-colors"
                    >
                      {validatingVoucher ? 'Đang kiểm tra...' : 'Áp dụng'}
                    </button>
                  </div>
                  {voucherError && <p className="text-[11px] font-semibold text-red-600">{voucherError}</p>}
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2 border-t border-[#e5e7eb] pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Tạm tính</span><span>{formatCurrency(totalPrice)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vận chuyển · {getShippingZoneLabel(shippingQuote.zone)}</span>
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
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Giảm giá (Voucher)</span>
                  <span className="font-bold">-{formatCurrency(discountAmount)}</span>
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
              {form.paymentMethod !== 'COD' && form.paymentOption === 'Deposit30' && (
                <div className="flex justify-between px-3 text-xs font-semibold text-slate-500">
                  <span>Còn lại khi nhận hàng (đã gồm phí giao hàng)</span>
                  <span>{formatCurrency(grandTotal - requiredPayment)}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="customer-button-dark mt-6 w-full disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading
                ? 'Đang xử lý...'
                : form.paymentMethod === 'COD'
                  ? 'Xác nhận đặt hàng'
                  : 'Xác nhận và nhận mã QR'} <ArrowRight size={15} />
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default CheckoutPage;
