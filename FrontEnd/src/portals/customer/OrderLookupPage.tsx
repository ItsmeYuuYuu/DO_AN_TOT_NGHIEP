import React, { useState } from 'react';
import apiClient from '@/api/apiClient';
import { Search, Package, CheckCircle2, Clock, Truck, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Seo } from '@/components/Seo';

interface OrderLookup {
  orderid: number;
  orderdate?: string;
  orderstatus?: string;
  totalamount: number;
  discountamount?: number;
  finalamount: number;
  paymentmethod?: string;
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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:   { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={13} /> },
  Processing:{ label: 'Đang xử lý',   color: 'bg-red-100 text-[#c4000b]',   icon: <CheckCircle2 size={13} /> },
  Shipped:   { label: 'Đang giao',    color: 'bg-purple-100 text-purple-700', icon: <Truck size={13} /> },
  Completed: { label: 'Đã giao',      color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={13} /> },
  Returned:  { label: 'Đã hoàn hàng', color: 'bg-slate-200 text-slate-700', icon: <Package size={13} /> },
  Cancelled: { label: 'Đã hủy',       color: 'bg-red-100 text-red-600',      icon: <XCircle size={13} /> },
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
      <Seo title="Tra cuu don hang - Cuong Dien Thoai" description="Tra cuu trang thai don hang va van don tai Cuong Dien Thoai." noIndex />
      {/* Header */}
      <div className="border-b customer-rule bg-white">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-[#e30613]" size={24} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Tra cứu đơn hàng</h1>
          <p className="text-slate-400 text-sm">Nhập số điện thoại đặt hàng để kiểm tra tình trạng đơn</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Search Form */}
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
                onChange={e => setPhone(e.target.value)}
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
                onChange={e => setOrderId(e.target.value)}
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
              <p className="text-sm text-slate-500 font-medium">
                Tìm thấy <span className="text-[#e30613] font-black">{results.length}</span> đơn hàng
              </p>
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
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="bg-slate-50 rounded-2xl p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tổng tiền</p>
                            <p className="font-black text-slate-700">{fmtMoney(order.totalamount)}</p>
                          </div>
                          {(order.discountamount ?? 0) > 0 && (
                            <div className="bg-green-50 rounded-2xl p-3">
                              <p className="text-[10px] font-bold text-green-500 uppercase mb-1">Giảm giá</p>
                              <p className="font-black text-green-700">-{fmtMoney(order.discountamount ?? 0)}</p>
                            </div>
                          )}
                          <div className="bg-red-50 rounded-2xl p-3">
                            <p className="text-[10px] font-bold text-[#e30613] uppercase mb-1">Thanh toán</p>
                            <p className="font-black text-[#c4000b]">{fmtMoney(order.finalamount)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-2xl p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Số sản phẩm</p>
                            <p className="font-black text-slate-700">{order.itemCount} sản phẩm</p>
                          </div>
                        </div>
                        {order.paymentmethod && (
                          <p className="text-xs text-slate-400 mt-3">
                            Phương thức: <span className="text-slate-600 font-bold">{order.paymentmethod}</span>
                            {order.vouchercode && <> · Mã giảm: <span className="text-[#e30613] font-bold">{order.vouchercode}</span></>}
                          </p>
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
