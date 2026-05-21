import React, { useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';
import { Tag, Clock, Copy, Check, Percent, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';

interface Voucher {
  vouchercode: string;
  discountamount?: number;
  discountpercentage?: number;
  validfrom?: string;
  validto?: string;
  isactive?: boolean;
}

const PromotionsPage: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<Voucher[]>('/Vouchers/active')
      .then(res => setVouchers(res.data))
      .catch(() => setVouchers([]))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

  const formatDiscount = (v: Voucher) => {
    if (v.discountpercentage) return `Giảm ${v.discountpercentage}%`;
    if (v.discountamount) return `Giảm ${v.discountamount.toLocaleString('vi-VN')}đ`;
    return 'Ưu đãi đặc biệt';
  };

  const getExpiry = (v: Voucher) => {
    if (!v.validto) return 'Không giới hạn';
    const diff = new Date(v.validto).getTime() - Date.now();
    const days = Math.ceil(diff / 86_400_000);
    if (days < 0) return 'Đã hết hạn';
    if (days === 0) return 'Hết hạn hôm nay!';
    if (days <= 3) return `Còn ${days} ngày!`;
    return `Đến ${formatDate(v.validto)}`;
  };

  const isExpiringSoon = (v: Voucher) => {
    if (!v.validto) return false;
    const diff = new Date(v.validto).getTime() - Date.now();
    return diff > 0 && diff < 3 * 86_400_000;
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-1.5 rounded-full text-sm font-bold mb-4">
            <Tag size={14} /> Ưu đãi đặc biệt
          </div>
          <h1 className="text-3xl font-black mb-2">Mã giảm giá Hot 🔥</h1>
          <p className="text-white/80 text-sm">Sao chép mã và áp dụng khi thanh toán để nhận ưu đãi</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <Skeleton className="w-1/2 h-8 mb-3" />
                <Skeleton className="w-3/4 h-5 mb-2" />
                <Skeleton className="w-1/2 h-4" />
              </div>
            ))}
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🎁</div>
            <h2 className="text-xl font-bold text-slate-600 mb-2">Chưa có mã ưu đãi nào</h2>
            <p className="text-slate-400 text-sm">Hãy quay lại sau để xem các ưu đãi mới nhất!</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vouchers.map(v => (
              <div key={v.vouchercode}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow relative"
              >
                {/* Top accent */}
                <div className={`h-1.5 w-full ${v.discountpercentage ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-blue-600'}`} />

                {isExpiringSoon(v) && (
                  <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
                    SẮP HẾT!
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    {v.discountpercentage
                      ? <div className="w-9 h-9 bg-orange-100 rounded-full flex items-center justify-center"><Percent size={16} className="text-orange-600" /></div>
                      : <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center"><DollarSign size={16} className="text-blue-600" /></div>
                    }
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mã voucher</p>
                      <p className="text-lg font-black text-slate-800 tracking-widest">{v.vouchercode}</p>
                    </div>
                  </div>

                  <p className="text-xl font-black text-slate-700 mb-1">{formatDiscount(v)}</p>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-5">
                    <Clock size={12} />
                    <span className={isExpiringSoon(v) ? 'text-red-500 font-bold' : ''}>{getExpiry(v)}</span>
                    {v.validfrom && (
                      <span className="text-slate-300">• Từ {formatDate(v.validfrom)}</span>
                    )}
                  </div>

                  <button
                    id={`copy-${v.vouchercode}`}
                    onClick={() => copyCode(v.vouchercode)}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all duration-200 ${
                      copied === v.vouchercode
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-900 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copied === v.vouchercode
                      ? <><Check size={15} /> Đã sao chép!</>
                      : <><Copy size={15} /> Sao chép mã</>
                    }
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Usage tip */}
        {!loading && vouchers.length > 0 && (
          <div className="mt-8 bg-blue-50 border border-blue-100 rounded-2xl p-5 flex gap-4">
            <span className="text-2xl shrink-0">💡</span>
            <div>
              <p className="font-bold text-blue-800 text-sm mb-1">Cách sử dụng mã giảm giá</p>
              <p className="text-blue-600 text-xs leading-relaxed">
                Sao chép mã voucher → vào trang thanh toán → nhập mã vào ô "Mã giảm giá" và nhấn áp dụng.
                Mỗi đơn hàng chỉ áp dụng được 1 mã.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotionsPage;
