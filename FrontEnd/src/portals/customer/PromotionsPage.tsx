import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '@/api/apiClient';
import {
  ArrowRight,
  BadgePercent,
  CalendarClock,
  Check,
  Clock3,
  Copy,
  DollarSign,
  Info,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { Modal } from '@/components/Modal';
import { Skeleton } from '@/components/Skeleton';
import { Seo } from '@/components/Seo';
import { formatDate as formatVietnamDate, parseApiDate } from '@/utils/formatters';

interface Voucher {
  vouchercode: string;
  discountamount?: number;
  discountpercentage?: number;
  minimumorderamount?: number;
  maximumdiscountamount?: number;
  applicableproductids: number[];
  validfrom?: string;
  validto?: string;
  isactive?: boolean;
}

interface VoucherProduct {
  productid: number;
  productname: string;
  slug?: string;
  brandname?: string;
  imageurl?: string;
  startingprice?: number;
}

interface VoucherDetails extends Voucher {
  applicableproducts: VoucherProduct[];
}

const formatMoney = (value?: number) => `${(value ?? 0).toLocaleString('vi-VN')}đ`;

const PromotionsPage: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<Voucher[]>('/Vouchers/active')
      .then(response => setVouchers(response.data))
      .catch(() => setVouchers([]))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard permission can be unavailable in embedded or insecure browser contexts.
    }
  };

  const openDetails = async (code: string) => {
    setDetailsLoading(true);
    setDetailsError(null);
    setSelectedVoucher(null);

    try {
      const response = await apiClient.get<VoucherDetails>(`/Vouchers/active/${encodeURIComponent(code)}/details`);
      setSelectedVoucher(response.data);
    } catch {
      setDetailsError('Không thể tải điều kiện áp dụng của mã này. Vui lòng thử lại sau.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedVoucher(null);
    setDetailsError(null);
  };

  const formatDate = (date?: string) => date ? formatVietnamDate(date) : 'Không giới hạn';

  const formatDiscount = (voucher: Voucher) => {
    if (voucher.discountpercentage) return `Giảm ${voucher.discountpercentage}%`;
    if (voucher.discountamount) return `Giảm ${formatMoney(voucher.discountamount)}`;
    return 'Ưu đãi đặc biệt';
  };

  const getExpiry = (voucher: Voucher) => {
    if (!voucher.validto) return 'Không giới hạn';
    const days = Math.ceil((parseApiDate(voucher.validto).getTime() - Date.now()) / 86_400_000);
    if (days === 0) return 'Hết hạn hôm nay';
    if (days <= 3) return `Còn ${days} ngày`;
    return `Đến ${formatDate(voucher.validto)}`;
  };

  const isExpiringSoon = (voucher: Voucher) => {
    if (!voucher.validto) return false;
    const diff = parseApiDate(voucher.validto).getTime() - Date.now();
    return diff > 0 && diff < 3 * 86_400_000;
  };

  const renderTerms = (voucher: Voucher) => (
    <div className="grid gap-2.5 border-y border-slate-100 py-4 text-xs font-semibold text-slate-600">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2"><ReceiptText size={15} className="text-[#e30613]" /> Giá trị đơn tối thiểu</span>
        <strong className="text-right text-[#1f2937]">
          {voucher.minimumorderamount ? `Từ ${formatMoney(voucher.minimumorderamount)}` : 'Không yêu cầu'}
        </strong>
      </div>
      {voucher.discountpercentage && (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2"><BadgePercent size={15} className="text-[#e30613]" /> Mức giảm tối đa</span>
          <strong className="text-right text-[#1f2937]">
            {voucher.maximumdiscountamount ? formatMoney(voucher.maximumdiscountamount) : 'Không giới hạn'}
          </strong>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2"><ShoppingBag size={15} className="text-[#e30613]" /> Phạm vi áp dụng</span>
        <strong className="text-right text-[#1f2937]">
          {voucher.applicableproductids?.length ? `${voucher.applicableproductids.length} sản phẩm` : 'Toàn bộ sản phẩm'}
        </strong>
      </div>
    </div>
  );

  return (
    <div className="customer-shell min-h-screen pb-16">
      <Seo
        title="Ưu đãi hiện tại - Cuồng Điện Thoại"
        description="Cập nhật voucher và các chương trình ưu đãi đang áp dụng tại Cuồng Điện Thoại."
        canonicalPath="/promotions"
      />

      <main className="customer-container px-4 py-8 md:py-11">
        <section aria-labelledby="voucher-list-title">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="customer-label">Danh sách voucher</p>
              <h2 id="voucher-list-title" className="customer-display mt-2 text-3xl font-bold text-[#1f2937]">Mã giảm giá của bạn</h2>
            </div>
            {!loading && vouchers.length > 0 && <span className="hidden text-sm font-semibold text-slate-500 sm:block">{vouchers.length} mã đang hoạt động</span>}
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="customer-panel p-5">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="mt-6 h-9 w-2/3" />
                  <Skeleton className="mt-6 h-24 w-full" />
                  <Skeleton className="mt-5 h-11 w-full" />
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
              {vouchers.map(voucher => {
                const percentageVoucher = Boolean(voucher.discountpercentage);
                const expiringSoon = isExpiringSoon(voucher);
                return (
                  <article key={voucher.vouchercode} className="customer-panel group overflow-hidden transition hover:-translate-y-1 hover:border-[#e30613]/30 hover:shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${percentageVoucher ? 'bg-[#fff1f2] text-[#e30613]' : 'bg-[#fff8df] text-[#c88900]'}`}>
                          {percentageVoucher ? <BadgePercent size={21} /> : <DollarSign size={21} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Mã ưu đãi</p>
                          <p className="mt-1 truncate text-xl font-black tracking-[0.12em] text-[#1f2937]">{voucher.vouchercode}</p>
                        </div>
                        {expiringSoon && <span className="rounded-full bg-red-50 px-2 py-1 text-[10px] font-black text-red-600">SẮP HẾT</span>}
                      </div>

                      <p className="customer-display mt-6 text-3xl font-bold text-[#c4000b]">{formatDiscount(voucher)}</p>
                      <p className="mt-1.5 text-xs font-medium text-slate-500">{voucher.discountpercentage ? 'Ưu đãi theo phần trăm' : 'Ưu đãi giảm trực tiếp'}</p>

                      <div className="mt-5">{renderTerms(voucher)}</div>

                      <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                        <Clock3 size={14} className={expiringSoon ? 'text-[#e30613]' : 'text-slate-400'} />
                        <span className={expiringSoon ? 'text-[#e30613]' : ''}>{getExpiry(voucher)}</span>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void openDetails(voucher.vouchercode)}
                          className="customer-button-outline cursor-pointer !px-3 !py-3 !text-[11px] !tracking-normal"
                        >
                          <Info size={15} /> Xem điều kiện
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyCode(voucher.vouchercode)}
                          className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-3 py-3 text-[11px] font-black transition ${
                            copied === voucher.vouchercode
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#e30613] text-white hover:bg-[#c4000b]'
                          }`}
                        >
                          {copied === voucher.vouchercode ? <><Check size={15} /> Đã sao chép</> : <><Copy size={15} /> Sao chép mã</>}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {!loading && vouchers.length > 0 && (
          <section className="customer-panel-soft mt-8 flex gap-4 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff1f2] text-[#e30613]"><PackageCheck size={20} /></div>
            <div>
              <p className="font-black text-[#1f2937]">Cách sử dụng mã giảm giá</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Sao chép mã, vào giỏ hàng hoặc trang thanh toán để áp dụng. Mỗi đơn hàng chỉ dùng một voucher; điều kiện được tính trên các sản phẩm đủ điều kiện.
              </p>
            </div>
          </section>
        )}
      </main>

      <Modal
        isOpen={detailsLoading || selectedVoucher !== null || detailsError !== null}
        onClose={closeDetails}
        title={selectedVoucher ? `Điều kiện mã ${selectedVoucher.vouchercode}` : 'Điều kiện voucher'}
        size="lg"
      >
        {detailsLoading ? (
          <div className="space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-28 w-full" /><Skeleton className="h-20 w-full" /></div>
        ) : detailsError ? (
          <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{detailsError}</div>
        ) : selectedVoucher && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#fff1f2] p-4"><p className="text-xs font-semibold text-slate-500">Mức ưu đãi</p><p className="customer-display mt-1 text-2xl font-bold text-[#c4000b]">{formatDiscount(selectedVoucher)}</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Đơn tối thiểu</p><p className="mt-1 text-lg font-black text-[#1f2937]">{selectedVoucher.minimumorderamount ? formatMoney(selectedVoucher.minimumorderamount) : 'Không yêu cầu'}</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-500">Hiệu lực đến</p><p className="mt-1 text-lg font-black text-[#1f2937]">{formatDate(selectedVoucher.validto)}</p></div>
            </div>

            {selectedVoucher.discountpercentage && (
              <div className="flex items-center gap-3 rounded-xl border border-[#ffd166]/60 bg-[#fff8df] px-4 py-3 text-sm text-[#56410a]">
                <BadgePercent size={19} className="shrink-0" />
                Mức giảm tối đa: <strong>{selectedVoucher.maximumdiscountamount ? formatMoney(selectedVoucher.maximumdiscountamount) : 'Không giới hạn'}</strong>.
              </div>
            )}

            {selectedVoucher.applicableproductids.length === 0 ? (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 text-sm leading-6 text-emerald-800">
                Mã này áp dụng cho toàn bộ sản phẩm đang kinh doanh. Giá trị đơn tối thiểu được tính trên tổng các sản phẩm trong giỏ.
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3"><div><p className="font-black text-[#1f2937]">Sản phẩm được áp dụng</p><p className="mt-1 text-xs text-slate-500">Giá trị tối thiểu chỉ tính trên những sản phẩm dưới đây.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{selectedVoucher.applicableproducts.length} sản phẩm</span></div>
                <div className="grid max-h-[360px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
                  {selectedVoucher.applicableproducts.map(product => (
                    <Link key={product.productid} to={product.slug ? `/products/${product.slug}` : `/products/${product.productid}`} onClick={closeDetails} className="group flex gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-[#e30613]/40 hover:bg-[#fffafa]">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 text-slate-300">
                        {product.imageurl ? <img src={product.imageurl} alt="" className="h-full w-full object-contain" /> : <ShoppingBag size={22} />}
                      </div>
                      <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-wide text-[#e30613]">{product.brandname || 'Sản phẩm'}</p><p className="mt-1 line-clamp-2 text-sm font-black text-[#1f2937]">{product.productname}</p><p className="mt-1 text-xs font-semibold text-slate-500">{product.startingprice ? `Từ ${formatMoney(product.startingprice)}` : 'Xem chi tiết'}</p></div>
                      <ArrowRight size={16} className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#e30613]" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500"><CalendarClock size={15} /> Hiệu lực từ {formatDate(selectedVoucher.validfrom)} đến {formatDate(selectedVoucher.validto)}.</div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PromotionsPage;
