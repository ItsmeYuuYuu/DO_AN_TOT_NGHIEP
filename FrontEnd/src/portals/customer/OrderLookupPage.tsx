import React, { useState } from 'react';
import apiClient from '@/api/apiClient';
import { Search, Package, CheckCircle2, Clock, Truck, XCircle, ChevronDown, ChevronUp, ArrowLeft, Star, RotateCcw, MessageCircle } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Link, useSearchParams } from 'react-router-dom';

interface OrderLookup {
  orderid: number;
  orderdate?: string;
  orderstatus?: string;
  totalamount: number;
  discountamount?: number;
  finalamount: number;
  paymentmethod?: string;
  paymentstatus?: string;
  vouchercode?: string;
  itemCount: number;
  shipment?: {
    carrier: string;
    trackingcode: string;
    status: string;
    estimateddeliveryat?: string;
    deliveryattempts: number;
    histories: Array<{
      status: string;
      note?: string;
      createdat?: string;
    }>;
  };
  orderitems?: Array<{
    productname?: string;
    sku?: string;
    variantsku?: string;
    sellingprice: number;
    packagename?: string;
    warrantyprice?: number;
    variantid?: number;
    productid?: number;
    imageurl?: string;
  }>;
  shippingname?: string;
  shippingphone?: string;
  shippingemail?: string;
  shippingaddress?: string;
  customernote?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:   { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={13} /> },
  Processing:{ label: 'Đang xử lý',   color: 'bg-red-100 text-[#c4000b]',   icon: <CheckCircle2 size={13} /> },
  Shipped:   { label: 'Đang giao',    color: 'bg-purple-100 text-purple-700', icon: <Truck size={13} /> },
  Completed: { label: 'Đã giao',      color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={13} /> },
  Returned:  { label: 'Đã hoàn hàng', color: 'bg-slate-200 text-slate-700', icon: <Package size={13} /> },
  Cancelled: { label: 'Đã hủy',       color: 'bg-red-100 text-red-600',      icon: <XCircle size={13} /> },
};

const formatSkuToAttributes = (productName: string, sku?: string) => {
  if (!sku) return productName;
  const parts = sku.split('-');
  if (parts.length <= 1) return productName;
  const startIndex = parts[0].toLowerCase() === 'demo' || parts[0].toLowerCase() === productName.toLowerCase() ? 1 : 0;
  const attrs = parts.slice(startIndex).map(p => {
    if (p.toLowerCase() === 'newseal') return 'New Seal';
    if (p.toLowerCase() === 'chínhhãng') return 'Chính hãng';
    return p;
  });
  return `${productName} - ${attrs.join(' / ')}`;
};

const ProductThumbnail: React.FC<{ imageUrl?: string; productName: string }> = ({ imageUrl, productName }) => {
  const [imageFailed, setImageFailed] = useState(false);

  if (!imageUrl || imageFailed) {
    return (
      <div
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#f1d7d9] bg-[#fff1f2] text-[#c4000b]"
        aria-label={`Chưa có ảnh ${productName}`}
      >
        <Package size={23} strokeWidth={1.8} />
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={productName}
      onError={() => setImageFailed(true)}
      className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-white object-contain p-1"
    />
  );
};

const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  AwaitingPickup: 'Chờ đơn vị vận chuyển lấy hàng',
  PickedUp: 'Đơn vị vận chuyển đã lấy hàng',
  InTransit: 'Đang vận chuyển',
  OutForDelivery: 'Đang giao đến bạn',
  DeliveryFailed: 'Giao hàng chưa thành công',
  RedeliveryScheduled: 'Đã lên lịch giao lại',
  Returning: 'Đang hoàn về cửa hàng',
  ReturnedToWarehouse: 'Đã hoàn về kho',
  Delivered: 'Giao hàng thành công',
};

const OrderLookupPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [orderId, setOrderId] = useState('');
  const [results, setResults] = useState<OrderLookup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [searchParams] = useSearchParams();
  const isDetailMode = searchParams.get('mode') === 'detail';

  React.useEffect(() => {
    const qPhone = searchParams.get('phone');
    const qOrderId = searchParams.get('orderId') || searchParams.get('orderid');

    if (isDetailMode && qOrderId) {
      setOrderId(qOrderId);
      setLoading(true);
      setError(null);
      setResults(null);
      apiClient.get<OrderLookup>(`/Orders/${encodeURIComponent(qOrderId)}`)
        .then(res => {
          setResults([res.data]);
          setExpandedId(Number(qOrderId));
        })
        .catch(err => {
          const status = err?.response?.status;
          const message = status === 403
            ? 'Bạn không có quyền xem đơn hàng này.'
            : status === 404
              ? 'Đơn hàng không tồn tại.'
              : 'Không thể tải chi tiết đơn hàng.';
          setError(message);
        })
        .finally(() => setLoading(false));
      return;
    }

    if (qPhone) {
      setPhone(qPhone);
      if (qOrderId) {
        setOrderId(qOrderId);
      }

      setLoading(true);
      setError(null);
      setResults(null);

      const params: Record<string, string> = { phone: qPhone.trim() };
      if (qOrderId) params.orderid = qOrderId.trim();

      apiClient.get<OrderLookup[]>('/Orders/lookup', { params })
        .then(res => {
          setResults(res.data);
          if (qOrderId && res.data.length > 0) {
            setExpandedId(Number(qOrderId));
          }
        })
        .catch(err => {
          const msg = err?.response?.data?.message;
          setError(msg || 'Không thể tự động tra cứu vận đơn.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isDetailMode, searchParams]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) { setError('Vui lòng nhập số điện thoại.'); return; }
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const params: Record<string, string> = { phone: phone.trim() };
      if (orderId.trim()) params.orderid = orderId.trim();
      const res = await apiClient.get<OrderLookup[]>('/Orders/lookup', { params });
      setResults(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Không thể tra cứu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const fmtMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';
  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

  const getStatus = (status?: string) =>
    STATUS_CONFIG[status ?? ''] ?? { label: status ?? 'Không rõ', color: 'bg-slate-100 text-slate-600', icon: <Package size={13} /> };

  return (
    <div className="customer-shell min-h-screen">
      <Seo title="Tra cứu đơn hàng - Cuồng Điện Thoại" description="Tra cứu trạng thái đơn hàng và vận đơn tại Cuồng Điện Thoại." noIndex />
      {/* Header */}
      {isDetailMode ? (
        <div className="border-b customer-rule bg-white">
          <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
            <Link to="/profile" className="text-slate-500 hover:text-[#e30613] flex items-center gap-1.5 text-sm font-bold">
              <ArrowLeft size={16} /> Quay lại Lịch sử đơn
            </Link>
            <span className="text-slate-300">|</span>
            <h1 className="text-base font-black text-slate-800">Chi tiết đơn hàng #{orderId}</h1>
          </div>
        </div>
      ) : (
        <div className="border-b customer-rule bg-white">
          <div className="max-w-2xl mx-auto px-4 py-8 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-[#e30613]" size={24} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 mb-2">Tra cứu đơn hàng</h1>
            <p className="text-slate-400 text-sm">Nhập số điện thoại đặt hàng để kiểm tra tình trạng đơn</p>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Search Form */}
        {!isDetailMode && (
          <form onSubmit={handleSearch} className="customer-panel mb-6 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5" htmlFor="lookup-phone">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                id="lookup-phone"
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
                pattern="0[0-9]{9}"
                maxLength={10}
                placeholder="VD: 0901234567"
                className="w-full border border-slate-200 focus:border-[#e30613] rounded-2xl px-4 py-3 text-sm font-medium outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5" htmlFor="lookup-orderid">
                Mã đơn hàng <span className="text-slate-400 font-medium normal-case">(không bắt buộc)</span>
              </label>
              <input
                id="lookup-orderid"
                type="number"
                value={orderId}
                onChange={e => setOrderId(e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputMode="numeric"
                placeholder="VD: 12345"
                className="w-full border border-slate-200 focus:border-[#e30613] rounded-2xl px-4 py-3 text-sm font-medium outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-sm">
                <XCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              id="lookup-submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#e30613] text-white font-black rounded-2xl hover:bg-[#c4000b] disabled:opacity-60 transition-colors"
            >
              {loading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang tra cứu...</>
              ) : (
                <><Search size={16} />Tra cứu ngay</>
              )}
            </button>
          </div>
        </form>
        )}

        {/* Results */}
        {results !== null && (
          results.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="text-5xl mb-4">📭</div>
              <h2 className="text-lg font-bold text-slate-600 mb-2">Không tìm thấy đơn hàng</h2>
              <p className="text-slate-400 text-sm">Kiểm tra lại số điện thoại hoặc mã đơn hàng</p>
            </div>
          ) : (
            <div className="space-y-4">
              {!isDetailMode && (
                <p className="text-sm text-slate-500 font-medium">
                  Tìm thấy <span className="text-[#e30613] font-black">{results.length}</span> đơn hàng
                </p>
              )}
              {results.map(order => {
                const st = getStatus(order.orderstatus);
                const isExpanded = expandedId === order.orderid;
                return (
                  <div key={order.orderid}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div
                      className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : order.orderid)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                            <Package size={18} className="text-[#e30613]" />
                          </div>
                          <div>
                            <p className="font-black text-slate-800">Đơn #{order.orderid}</p>
                            <p className="text-xs text-slate-400">{fmtDate(order.orderdate)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${st.color}`}>
                            {st.icon} {st.label}
                          </span>
                          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 px-5 pb-5 pt-4 animate-in fade-in duration-200">
                        {isDetailMode && (
                          <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4">
                            <div className="grid grid-cols-5 gap-2">
                              {[
                                { label: 'Đã đặt', active: true, icon: Package },
                                { label: 'Đã thanh toán', active: ['paid', 'depositpaid'].includes((order.paymentstatus ?? '').toLowerCase()), icon: CheckCircle2 },
                                { label: 'Đã giao vận', active: ['shipped', 'completed'].includes((order.orderstatus ?? '').toLowerCase()), icon: Truck },
                                { label: 'Đã nhận hàng', active: (order.orderstatus ?? '').toLowerCase() === 'completed', icon: CheckCircle2 },
                                { label: 'Đánh giá', active: false, icon: Star },
                              ].map((step, index) => {
                                const Icon = step.icon;
                                return (
                                  <div key={step.label} className="relative text-center">
                                    {index > 0 && <span className={`absolute right-1/2 top-4 h-0.5 w-full ${step.active ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                                    <span className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full ${step.active ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}><Icon size={15} /></span>
                                    <p className="mt-2 text-[10px] font-bold text-slate-600 sm:text-xs">{step.label}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {/* 1. Grid Info: Shipping & Payment */}
                        <div className="grid gap-4 md:grid-cols-2 text-xs mb-4">
                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Thông tin nhận hàng</h4>
                            <div className="space-y-1.5 text-slate-700">
                              <p><span className="font-semibold text-slate-500">Người nhận:</span> {order.shippingname ?? '—'}</p>
                              <p><span className="font-semibold text-slate-500">Số điện thoại:</span> {order.shippingphone ?? '—'}</p>
                              {order.shippingemail && <p><span className="font-semibold text-slate-500">Email:</span> {order.shippingemail}</p>}
                              <p><span className="font-semibold text-slate-500">Địa chỉ:</span> {order.shippingaddress ?? '—'}</p>
                              {order.customernote && (
                                <p className="mt-2 bg-amber-50 text-amber-800 border border-amber-100 p-2 rounded-xl">
                                  <span className="font-bold">Ghi chú:</span> {order.customernote}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Thông tin Thanh toán</h4>
                            <div className="space-y-1.5 text-slate-700">
                              <p><span className="font-semibold text-slate-500">Hình thức:</span> {order.paymentmethod ?? '—'}</p>
                              {order.vouchercode && (
                                <p><span className="font-semibold text-slate-500">Mã giảm giá (Voucher):</span> <span className="text-[#e30613] font-bold">{order.vouchercode}</span></p>
                              )}
                              <div className="mt-3 pt-2 border-t border-slate-200 space-y-1 text-slate-600">
                                <div className="flex justify-between">
                                  <span>Giá trị hàng hóa:</span>
                                  <span className="font-semibold text-slate-800">{fmtMoney(order.totalamount)}</span>
                                </div>
                                {order.discountamount && order.discountamount > 0 ? (
                                  <div className="flex justify-between text-emerald-600">
                                    <span>Giảm giá (Voucher):</span>
                                    <span className="font-semibold">-{fmtMoney(order.discountamount)}</span>
                                  </div>
                                ) : null}
                                <div className="flex justify-between font-black text-sm text-[#c4000b] pt-1">
                                  <span>Tổng thanh toán:</span>
                                  <span>{fmtMoney(order.finalamount)}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Products list in details */}
                        {order.orderitems && order.orderitems.length > 0 && (
                          <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Danh sách sản phẩm</p>
                            <div className="divide-y divide-slate-200">
                              {order.orderitems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 text-xs">
                                  <div className="flex min-w-0 items-center gap-3">
                                    <ProductThumbnail
                                      imageUrl={item.imageurl}
                                      productName={item.productname ?? 'sản phẩm'}
                                    />
                                    <div className="min-w-0">
                                    <p className="font-bold text-slate-800">
                                      {formatSkuToAttributes(item.productname ?? 'Sản phẩm', item.sku ?? item.variantsku)}
                                    </p>
                                    {item.packagename && (
                                      <p className="text-[10px] font-semibold text-[#c4000b] mt-0.5">
                                        🛡️ Gói bảo hành: {item.packagename} (+{fmtMoney(item.warrantyprice ?? 0)})
                                      </p>
                                    )}
                                    </div>
                                  </div>
                                  <span className="font-black text-slate-700">{fmtMoney(item.sellingprice)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {order.shipment && (
                          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50/60 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p className="text-[10px] font-bold uppercase text-[#e30613]">Mã vận đơn</p>
                                <p className="font-black text-[#9f0008]">{order.shipment.trackingcode}</p>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#c4000b]">
                                {order.shipment.carrier}
                              </span>
                            </div>
                            {order.shipment.estimateddeliveryat && (
                              <p className="mt-2 text-xs text-slate-500">
                                Dự kiến giao: <strong>{fmtDate(order.shipment.estimateddeliveryat)}</strong>
                              </p>
                            )}
                            <div className="mt-4 space-y-3 border-l-2 border-red-200 pl-4">
                              {order.shipment.histories.map((history, index) => (
                                <div key={`${history.status}-${history.createdat ?? index}`} className="relative">
                                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-[#e30613] ring-2 ring-red-50" />
                                  <p className="text-sm font-bold text-slate-700">
                                    {SHIPMENT_STATUS_LABELS[history.status] ?? history.status}
                                  </p>
                                  <p className="text-xs text-slate-400">{fmtDate(history.createdat)}</p>
                                  {history.note && <p className="mt-0.5 text-xs text-slate-500">{history.note}</p>}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {isDetailMode && (
                          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                            <Link to="/chat" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"><MessageCircle size={14} /> Liên hệ tư vấn</Link>
                            {(order.orderstatus ?? '').toLowerCase() === 'completed' && (
                              <>
                                <Link to="/returns" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600"><RotateCcw size={14} /> Yêu cầu trả hàng/hoàn tiền</Link>
                                {order.orderitems?.find(item => item.productid && item.variantid) && (() => {
                                  const item = order.orderitems!.find(candidate => candidate.productid && candidate.variantid)!;
                                  return <Link to={`/products/${item.productid}?variantId=${item.variantid}&review=1`} className="inline-flex items-center gap-2 rounded-xl bg-[#e30613] px-4 py-2 text-xs font-black text-white"><Star size={14} /> Đánh giá</Link>;
                                })()}
                              </>
                            )}
                            <Link to="/products" className="inline-flex items-center gap-2 rounded-xl border border-[#e30613] px-4 py-2 text-xs font-black text-[#e30613]">Mua lại</Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default OrderLookupPage;
