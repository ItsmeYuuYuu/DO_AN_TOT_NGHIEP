import React, { useEffect, useState } from 'react';
import apiClient from '@/api/apiClient';
import { Check, Clock, Copy, DollarSign, Percent, Tag } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { Seo } from '@/components/Seo';
import { formatDate as formatVietnamDate, parseApiDate } from '@/utils/formatters';

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
      .then(response => setVouchers(response.data))
      .catch(() => setVouchers([]))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(code);
      window.setTimeout(() => setCopied(null), 2000);
    });
  };

  const formatDate = (date?: string) =>
    date ? formatVietnamDate(date) : '';

  const formatDiscount = (voucher: Voucher) => {
    if (voucher.discountpercentage) return `Giảm ${voucher.discountpercentage}%`;
    if (voucher.discountamount) return `Giảm ${voucher.discountamount.toLocaleString('vi-VN')}đ`;
    return 'Ưu đãi đặc biệt';
  };

  const getExpiry = (voucher: Voucher) => {
    if (!voucher.validto) return 'Không giới hạn';
    const diff = parseApiDate(voucher.validto).getTime() - Date.now();
    const days = Math.ceil(diff / 86_400_000);
    if (days < 0) return 'Đã hết hạn';
    if (days === 0) return 'Hết hạn hôm nay';
    if (days <= 3) return `Còn ${days} ngày`;
    return `Đến ${formatDate(voucher.validto)}`;
  };

  const isExpiringSoon = (voucher: Voucher) => {
    if (!voucher.validto) return false;
    const diff = parseApiDate(voucher.validto).getTime() - Date.now();
    return diff > 0 && diff < 3 * 86_400_000;
  };

  return (
    <div className="customer-shell min-h-screen pb-16">
      <Seo
        title="Ưu đãi hiện tại - Cuồng Điện Thoại"
        description="Cập nhật voucher và các chương trình ưu đãi đang áp dụng tại Cuồng Điện Thoại."
        canonicalPath="/promotions"
      />
      <main className="customer-container px-4 py-8">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="customer-panel p-5">
                <Skeleton className="mb-3 h-8 w-1/2" />
                <Skeleton className="mb-2 h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : vouchers.length === 0 ? (
          <div className="customer-panel-soft px-6 py-20 text-center">
            <Tag className="mx-auto mb-5 text-[#1f2937]/25" size={54} />
            <h2 className="customer-display text-3xl font-bold text-[#1f2937]">Chưa có mã ưu đãi nào</h2>
            <p className="mt-3 text-sm text-slate-500">Hãy quay lại sau để xem các ưu đãi mới nhất.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {vouchers.map(voucher => (
              <article key={voucher.vouchercode} className="customer-panel relative overflow-hidden">
                <div className={`h-2 w-full ${voucher.discountpercentage ? 'bg-[#e30613]' : 'bg-[#ffd166]'}`} />

                {isExpiringSoon(voucher) && (
                  <div className="absolute right-4 top-5 bg-red-600 px-2 py-0.5 text-[10px] font-black text-white">
                    SẮP HẾT
                  </div>
                )}

                <div className="p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center bg-[#1f2937] text-white">
                      {voucher.discountpercentage ? <Percent size={18} /> : <DollarSign size={18} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Mã voucher</p>
                      <p className="text-xl font-black tracking-[0.16em] text-[#1f2937]">{voucher.vouchercode}</p>
                    </div>
                  </div>

                  <p className="customer-display text-3xl font-bold text-[#c4000b]">{formatDiscount(voucher)}</p>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={12} />
                    <span className={isExpiringSoon(voucher) ? 'font-black text-red-600' : ''}>{getExpiry(voucher)}</span>
                    {voucher.validfrom && (
                      <span className="text-slate-300">· Từ {formatDate(voucher.validfrom)}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    id={`copy-${voucher.vouchercode}`}
                    onClick={() => copyCode(voucher.vouchercode)}
                    className={`mt-6 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm font-black transition ${
                      copied === voucher.vouchercode
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#1f2937] text-white hover:bg-[#c4000b]'
                    }`}
                  >
                    {copied === voucher.vouchercode
                      ? <><Check size={15} /> Đã sao chép</>
                      : <><Copy size={15} /> Sao chép mã</>
                    }
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {!loading && vouchers.length > 0 && (
          <div className="customer-panel-soft mt-8 flex gap-4 p-5">
            <Tag className="shrink-0 text-[#c4000b]" size={24} />
            <div>
              <p className="font-black text-[#1f2937]">Cách sử dụng mã giảm giá</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Sao chép mã voucher, vào trang thanh toán, nhập mã vào ô mã giảm giá và nhấn áp dụng. Mỗi đơn hàng chỉ áp dụng được một mã.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default PromotionsPage;
