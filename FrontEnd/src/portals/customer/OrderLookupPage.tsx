import React, { useState } from 'react';
import apiClient from '@/api/apiClient';
import { Search, Package, CheckCircle2, Clock, Truck, XCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:   { label: 'Chờ xác nhận', color: 'bg-yellow-100 text-yellow-700', icon: <Clock size={13} /> },
  Confirmed: { label: 'Đã xác nhận',  color: 'bg-blue-100 text-blue-700',   icon: <CheckCircle2 size={13} /> },
  Shipping:  { label: 'Đang giao',    color: 'bg-purple-100 text-purple-700', icon: <Truck size={13} /> },
  Delivered: { label: 'Đã giao',      color: 'bg-green-100 text-green-700',  icon: <CheckCircle2 size={13} /> },
  Cancelled: { label: 'Đã hủy',       color: 'bg-red-100 text-red-600',      icon: <XCircle size={13} /> },
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
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-8 text-center">
          <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="text-blue-600" size={24} />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Tra cứu đơn hàng</h1>
          <p className="text-slate-400 text-sm">Nhập số điện thoại đặt hàng để kiểm tra tình trạng đơn</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-6">
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
                className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
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
                className="w-full border-2 border-slate-200 focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-medium outline-none transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm">
                <XCircle size={15} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              id="lookup-submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors"
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
                Tìm thấy <span className="text-blue-600 font-black">{results.length}</span> đơn hàng
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
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Package size={18} className="text-blue-600" />
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
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tổng tiền</p>
                            <p className="font-black text-slate-700">{fmtMoney(order.totalamount)}</p>
                          </div>
                          {(order.discountamount ?? 0) > 0 && (
                            <div className="bg-green-50 rounded-xl p-3">
                              <p className="text-[10px] font-bold text-green-500 uppercase mb-1">Giảm giá</p>
                              <p className="font-black text-green-700">-{fmtMoney(order.discountamount ?? 0)}</p>
                            </div>
                          )}
                          <div className="bg-blue-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-blue-500 uppercase mb-1">Thanh toán</p>
                            <p className="font-black text-blue-700">{fmtMoney(order.finalamount)}</p>
                          </div>
                          <div className="bg-slate-50 rounded-xl p-3">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Số sản phẩm</p>
                            <p className="font-black text-slate-700">{order.itemCount} sản phẩm</p>
                          </div>
                        </div>
                        {order.paymentmethod && (
                          <p className="text-xs text-slate-400 mt-3">
                            Phương thức: <span className="text-slate-600 font-bold">{order.paymentmethod}</span>
                            {order.vouchercode && <> · Mã giảm: <span className="text-blue-600 font-bold">{order.vouchercode}</span></>}
                          </p>
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
