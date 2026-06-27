import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BatteryCharging,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Gamepad2,
  Headphones,
  RefreshCcw,
  Search,
  Sparkles,
  Truck,
} from 'lucide-react';
import { Seo } from '@/components/Seo';
import { Skeleton } from '@/components/Skeleton';
import { homepageSectionsApi, type HomepageProductSection } from '@/features/homepage/api/homepageSectionsApi';
import { promotionsApi, type PromotionalContent } from '@/features/content/api/promotionsApi';
import { ProductCard } from '@/features/products/components/ProductCard';
import { useProducts } from '@/features/products/hooks/useProducts';

const SERVICE_ITEMS = [
  { icon: Truck, title: 'Giao nhanh toàn quốc', description: 'Theo dõi hành trình đơn hàng rõ ràng' },
  { icon: RefreshCcw, title: 'Đổi trả minh bạch', description: 'Kiểm theo IMEI và lịch sử xử lý' },
  { icon: CreditCard, title: 'Thanh toán linh hoạt', description: 'COD, ví điện tử, chuyển khoản hoặc đặt cọc' },
  { icon: Headphones, title: 'Tư vấn đúng nhu cầu', description: 'AI lọc máy trước, nhân viên hỗ trợ sau' },
];

const NEED_CARDS = [
  {
    icon: Camera,
    title: 'Chụp ảnh đẹp',
    description: 'Ưu tiên camera, chống rung, xử lý màu và công nghệ Leica, ZEISS, Hasselblad.',
    prompt: 'Tôi cần điện thoại chụp ảnh đẹp. Hãy hỏi ngân sách nếu chưa đủ thông tin và gợi ý theo camera, chống rung, công nghệ màu và hiệu năng xử lý ảnh.',
    tone: 'bg-[#fff1f2]',
  },
  {
    icon: Gamepad2,
    title: 'Chơi game mượt',
    description: 'Lọc theo chipset, tản nhiệt, pin và màn hình tần số quét cao.',
    prompt: 'Tôi cần điện thoại chơi game mượt. Hãy hỏi ngân sách nếu chưa rõ và ưu tiên chipset mạnh, tản nhiệt, pin, màn hình tần số quét cao.',
    tone: 'bg-[#eef2ff]',
  },
  {
    icon: BatteryCharging,
    title: 'Pin dùng lâu',
    description: 'Chọn máy có pin tốt, sạc nhanh và cấu hình ổn để dùng cả ngày.',
    prompt: 'Tôi cần điện thoại pin dùng lâu, sạc nhanh, dùng cả ngày. Hãy hỏi ngân sách nếu chưa rõ và gợi ý các lựa chọn phù hợp.',
    tone: 'bg-[#ecfdf5]',
  },
  {
    icon: Search,
    title: 'Tầm giá của bạn',
    description: 'Đưa ngân sách, AI sẽ lọc máy đáng mua nhất theo dữ liệu đang có.',
    prompt: 'Hãy tư vấn điện thoại theo ngân sách của tôi. Nếu tôi chưa nói ngân sách, hãy hỏi lại trước khi gợi ý.',
    tone: 'bg-[#fff7ed]',
  },
];

const CustomerHome: React.FC = () => {
  const { products, loading } = useProducts();
  const [banners, setBanners] = useState<PromotionalContent[]>([]);
  const [sliders, setSliders] = useState<PromotionalContent[]>([]);
  const [homeSections, setHomeSections] = useState<HomepageProductSection[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    promotionsApi.getActive('Banner').then(setBanners).catch(() => {});
    promotionsApi.getActive('Slider').then(setSliders).catch(() => {});
    homepageSectionsApi.getActive().then(setHomeSections).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sliders.length <= 1 || isSliderPaused) return;
    const interval = window.setInterval(() => {
      setActiveSlide(current => (current + 1) % sliders.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [sliders, isSliderPaused]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (window.matchMedia('(min-width: 768px)').matches) return;

      document.querySelectorAll<HTMLDivElement>('.customer-home-product-carousel').forEach(carousel => {
        if (carousel.scrollWidth <= carousel.clientWidth) return;

        const step = carousel.clientWidth;
        const currentPage = Math.round(carousel.scrollLeft / step);
        const lastPage = Math.ceil((carousel.scrollWidth - carousel.clientWidth) / step);
        const nextPage = currentPage >= lastPage ? 0 : currentPage + 1;

        carousel.scrollTo({ left: nextPage * step, behavior: 'smooth' });
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [homeSections.length, products.length]);

  const featuredProducts = products.slice(0, 10);
  const fallbackSections: HomepageProductSection[] = featuredProducts.length > 0 ? [
    {
      sectionid: 0,
      sectionkey: 'fallback',
      title: 'Sản phẩm đang có',
      subtitle: 'Các mẫu máy nổi bật hiện có trong cửa hàng.',
      theme: 'LightBlue',
      items: featuredProducts.slice(0, 5).map((product, index) => ({
        itemid: product.productid,
        sectionid: 0,
        productid: product.productid,
        displayorder: index,
        isactive: true,
        product,
      })),
    },
  ] : [];

  const hasConfiguredProducts = homeSections.some(section =>
    section.items.some(item => item.isactive !== false && item.product));
  const displaySections = hasConfiguredProducts ? homeSections : fallbackSections;
  const sideBanners = banners.slice(0, 2);

  const saleEnd = new Date(now);
  saleEnd.setHours(23, 59, 59, 999);
  const saleRemainingSeconds = Math.max(0, Math.floor((saleEnd.getTime() - now.getTime()) / 1000));
  const countdown = {
    hours: String(Math.floor(saleRemainingSeconds / 3600)).padStart(2, '0'),
    minutes: String(Math.floor((saleRemainingSeconds % 3600) / 60)).padStart(2, '0'),
    seconds: String(saleRemainingSeconds % 60).padStart(2, '0'),
  };

  const showPreviousSlide = () => {
    setActiveSlide(current => (current - 1 + sliders.length) % sliders.length);
  };

  const showNextSlide = () => {
    setActiveSlide(current => (current + 1) % sliders.length);
  };

  return (
    <div className="customer-shell min-h-screen pb-20">
      <Seo
        title="Cuong Dien Thoai - Tu van smartphone bang AI"
        description="Mua smartphone chinh hang, xem khuyen mai, so sanh san pham va nhan tu van AI theo nhu cau tai Cuong Dien Thoai."
        canonicalPath="/"
      />

      <section className="border-b customer-rule bg-white px-3 py-3 sm:px-4 md:py-6">
        <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-12">
          <div
            className="group relative min-h-[240px] overflow-hidden rounded-2xl bg-[#1f2937] shadow-[0_24px_60px_rgba(15,23,42,0.18)] sm:min-h-[330px] lg:col-span-8 lg:min-h-[440px]"
            onMouseEnter={() => setIsSliderPaused(true)}
            onMouseLeave={() => setIsSliderPaused(false)}
            onFocusCapture={() => setIsSliderPaused(true)}
            onBlurCapture={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsSliderPaused(false);
              }
            }}
          >
            {sliders.length > 0 ? (
              <>
                {sliders.map((slider, index) => (
                  <div
                    key={slider.contentid}
                    className={`absolute inset-0 transition-opacity duration-700 ${
                      index === activeSlide ? 'z-10 opacity-100' : 'z-0 opacity-0'
                    }`}
                  >
                    <img
                      src={slider.imageurl}
                      alt={slider.title || 'Chương trình nổi bật'}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1f2937]/65 via-transparent to-transparent" />
                    {slider.title && (
                      <p className="customer-display absolute bottom-6 left-5 right-20 z-10 text-2xl font-bold text-white sm:bottom-8 sm:left-7 sm:right-24 md:text-4xl">
                        {slider.title}
                      </p>
                    )}
                    {slider.linkurl && (
                      <Link
                        to={slider.linkurl}
                        className="absolute inset-0 z-20"
                        aria-label={slider.title || 'Xem chương trình'}
                      />
                    )}
                  </div>
                ))}

                {sliders.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={showPreviousSlide}
                      aria-label="Xem banner trước"
                      className="absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/55 text-[#1f2937] shadow-[0_10px_28px_rgba(15,23,42,0.2)] backdrop-blur transition hover:bg-white sm:left-4 sm:h-11 sm:w-11"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={showNextSlide}
                      aria-label="Xem banner tiếp theo"
                      className="absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/50 bg-white/55 text-[#1f2937] shadow-[0_10px_28px_rgba(15,23,42,0.2)] backdrop-blur transition hover:bg-white sm:right-4 sm:h-11 sm:w-11"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </>
            ) : (
              <div className="customer-grid-pattern relative flex h-full min-h-[330px] flex-col justify-between rounded-2xl p-7 text-white md:p-10 lg:min-h-[440px]">
                <div className="flex items-center justify-between">
                  <span className="border border-[#ffd166] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#ffd166]">
                    Tech selection 2026
                  </span>
                  <Sparkles className="text-[#e30613]" size={26} />
                </div>
                <div className="max-w-xl">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#ffd166]">
                    Chọn đúng máy, dùng đúng nhu cầu
                  </p>
                  <h1 className="customer-display text-4xl font-bold leading-[1.05] md:text-6xl">
                    Công nghệ tốt không cần phải chọn trong mơ hồ.
                  </h1>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      to="/chat"
                      className="inline-flex items-center gap-2 rounded-full bg-[#e30613] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-[#c4000b]"
                    >
                      Nhờ AI tư vấn <ArrowRight size={16} />
                    </Link>
                    <Link
                      to="/products"
                      className="inline-flex items-center gap-2 rounded-full border border-white/50 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-white hover:text-[#1f2937]"
                    >
                      Xem toàn bộ máy
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            {sideBanners.map(banner => (
              <div
                key={banner.contentid}
                className="relative min-h-36 overflow-hidden rounded-xl bg-[#e8f1ef] shadow-[0_16px_38px_rgba(15,23,42,0.1)] sm:min-h-52 sm:rounded-2xl"
              >
                <img
                  src={banner.imageurl}
                  alt={banner.title || 'Ưu đãi nổi bật'}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
                {banner.linkurl && (
                  <Link to={banner.linkurl} className="absolute inset-0" aria-label={banner.title || 'Xem ưu đãi'} />
                )}
              </div>
            ))}

            {Array.from({ length: Math.max(0, 2 - sideBanners.length) }).map((_, index) => (
              <div
                key={`banner-placeholder-${index}`}
                className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-[#d7dce3] bg-white/70 p-4 text-center text-sm font-bold text-slate-400 shadow-[0_16px_38px_rgba(15,23,42,0.06)] sm:min-h-52 sm:rounded-2xl sm:p-6"
              >
                Chưa cấu hình banner phụ {sideBanners.length + index + 1}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 pt-5 sm:px-4 md:pt-8">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white px-4 py-5 shadow-[0_16px_38px_rgba(15,23,42,0.08)] md:px-7 md:py-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICE_ITEMS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#fff1f2] text-[#e30613]">
                  <Icon size={22} strokeWidth={1.9} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide text-[#111827]">{title}</h3>
                  <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-3 pt-5 sm:px-4 md:pt-8">
        <div className="relative overflow-hidden rounded-[26px] border border-[#eef1f5] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] md:p-6">
          <span className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#e30613]/8 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-[#ffd166]/25 blur-2xl" />

          <div className="relative grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-[24px] border border-[#ffe1e4] bg-[linear-gradient(135deg,#fff7f7_0%,#ffffff_52%,#fff5df_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] md:p-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#e30613] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-[0_10px_22px_rgba(227,6,19,0.22)]">
                <Sparkles size={13} /> Tư vấn thông minh
              </div>
              <h2 className="customer-display mt-4 max-w-md text-3xl font-bold leading-tight text-[#172033] md:text-4xl">
                Chọn máy theo đúng cách bạn dùng.
              </h2>
              <p className="mt-3 max-w-md text-sm font-medium leading-7 text-slate-600">
                Chọn nhanh nhu cầu, AI sẽ hỏi thêm ngân sách rồi lọc máy theo dữ liệu sản phẩm thật của cửa hàng.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">Camera</span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">Gaming</span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">Pin lâu</span>
                <span className="rounded-full bg-white px-3 py-2 shadow-sm">Theo ngân sách</span>
              </div>
              <Link
                to="/chat"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#172033] px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white shadow-[0_14px_30px_rgba(23,32,51,0.18)] transition hover:bg-[#e30613]"
              >
                Mở trợ lý AI <ArrowRight size={15} />
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {NEED_CARDS.map(({ icon: Icon, title, description, prompt, tone }) => (
                <Link
                  key={title}
                  to={`/chat?q=${encodeURIComponent(prompt)}`}
                  className={`group relative overflow-hidden rounded-[24px] border border-white ${tone} p-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 transition hover:-translate-y-1 hover:shadow-[0_22px_52px_rgba(227,6,19,0.14)]`}
                >
                  <span className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/60" />
                  <span className="absolute bottom-0 left-0 h-1 w-0 bg-[#e30613] transition-all duration-300 group-hover:w-full" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white text-[#e30613] shadow-[0_10px_24px_rgba(15,23,42,0.1)]">
                      <Icon size={22} strokeWidth={2.1} />
                    </div>
                    <span className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#e30613] opacity-0 transition group-hover:opacity-100">
                      <ArrowRight size={15} />
                    </span>
                  </div>
                  <h3 className="relative mt-5 text-[21px] font-black leading-tight text-[#172033]">{title}</h3>
                  <p className="relative mt-2 min-h-12 text-sm font-medium leading-6 text-slate-600">{description}</p>
                  <span className="relative mt-5 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#c4000b]">
                    Bắt đầu tư vấn <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl space-y-8 px-3 py-8 sm:px-4 md:space-y-10 md:py-14">
        {loading && displaySections.length === 0 ? (
          <div className="rounded-2xl bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-[#e5e7eb] bg-white p-4">
                  <Skeleton className="mb-4 aspect-[4/4.4] w-full rounded-2xl" />
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-6 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          displaySections
            .map(section => ({
              ...section,
              products: section.items
                .filter(item => item.isactive !== false && item.product)
                .sort((a, b) => (a.displayorder ?? 0) - (b.displayorder ?? 0))
                .slice(0, 5)
                .map(item => item.product!),
            }))
            .filter(section => section.products.length > 0)
            .map(section => {
              const isRed = section.theme === 'Red';
              return (
                <div
                  key={section.sectionid || section.sectionkey}
                  className={`relative overflow-hidden rounded-2xl p-3 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:p-4 md:p-6 ${
                    isRed
                      ? 'bg-[radial-gradient(circle_at_top_right,rgba(255,209,102,0.32),transparent_22rem),linear-gradient(135deg,#f20615_0%,#c4000b_48%,#780006_100%)] ring-1 ring-red-900/10'
                      : 'bg-gradient-to-br from-[#eaf4ff] via-[#f4f9ff] to-[#dcecff]'
                  }`}
                >
                  {isRed && (
                    <>
                      <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
                      <span className="pointer-events-none absolute -bottom-20 left-8 h-56 w-56 rounded-full bg-black/10" />
                    </>
                  )}
                  <div className="relative mb-4 flex flex-col justify-between gap-3 sm:mb-5 md:flex-row md:items-end">
                    <div>
                      {isRed && (
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white ring-1 ring-white/20">
                          <Sparkles size={13} className="text-[#ffd166]" /> Giá tốt hôm nay
                        </div>
                      )}
                      <h2 className={`customer-display mt-2 text-2xl font-bold sm:text-3xl md:text-5xl ${
                        isRed ? 'text-white' : 'text-[#1f2937]'
                      }`}>
                        {section.title}
                      </h2>
                      {section.subtitle && (
                        <p className={`mt-2 max-w-2xl text-sm font-medium ${
                          isRed ? 'text-white/75' : 'text-slate-500'
                        }`}>
                          {section.subtitle}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      {isRed && (
                        <div className="flex w-fit items-center gap-2 rounded-full bg-white px-3 py-2 text-[#c4000b] shadow-[0_12px_26px_rgba(0,0,0,0.16)]">
                          <Clock3 size={15} />
                          <span className="text-[10px] font-black uppercase tracking-[0.14em]">Kết thúc sau</span>
                          <span className="rounded-full bg-[#1f2937] px-2 py-1 text-xs font-black text-white">
                            {countdown.hours}:{countdown.minutes}:{countdown.seconds}
                          </span>
                        </div>
                      )}
                      <Link
                        to="/products"
                        className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${
                          isRed
                            ? 'bg-white text-[#c4000b] hover:bg-[#ffd166]'
                            : 'bg-[#1f2937] text-white hover:bg-[#e30613]'
                        }`}
                      >
                        Xem tất cả <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>

                  <div className="relative md:hidden">
                    <div className="customer-home-product-carousel -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {section.products.map(product => (
                        <div key={`${section.sectionkey}-mobile-${product.productid}`} className="w-[calc((100%_-_12px)/2)] shrink-0 snap-start">
                          <ProductCard product={product} compact />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="relative hidden gap-3 sm:gap-4 md:grid md:grid-cols-3 xl:grid-cols-5">
                    {section.products.map(product => (
                      <ProductCard key={`${section.sectionkey}-${product.productid}`} product={product} compact />
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </section>
    </div>
  );
};

export default CustomerHome;
