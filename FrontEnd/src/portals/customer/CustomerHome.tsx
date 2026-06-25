import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Headphones,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useProducts } from '@/features/products/hooks/useProducts';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';
import { Seo } from '@/components/Seo';
import { promotionsApi, type PromotionalContent } from '@/features/content/api/promotionsApi';
import { homepageSectionsApi, type HomepageProductSection } from '@/features/homepage/api/homepageSectionsApi';

const CustomerHome: React.FC = () => {
  const { products, loading } = useProducts();
  const [banners, setBanners] = useState<PromotionalContent[]>([]);
  const [sliders, setSliders] = useState<PromotionalContent[]>([]);
  const [homeSections, setHomeSections] = useState<HomepageProductSection[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);

  useEffect(() => {
    promotionsApi.getActive('Banner').then(setBanners).catch(() => {});
    promotionsApi.getActive('Slider').then(setSliders).catch(() => {});
    homepageSectionsApi.getActive().then(setHomeSections).catch(() => {});
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
      title: 'SẢN PHẨM ĐANG CÓ',
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
              <div key={banner.contentid} className="relative min-h-36 overflow-hidden rounded-xl bg-[#e8f1ef] shadow-[0_16px_38px_rgba(15,23,42,0.1)] sm:min-h-52 sm:rounded-2xl">
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

      <section className="mx-auto max-w-7xl space-y-8 px-3 py-10 sm:px-4 md:space-y-10 md:py-20">
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
                  className={`overflow-hidden rounded-2xl p-3 shadow-[0_22px_55px_rgba(15,23,42,0.12)] sm:p-4 md:p-6 ${
                    isRed
                      ? 'bg-gradient-to-br from-[#e30613] via-[#c4000b] to-[#7f0007]'
                      : 'bg-gradient-to-br from-[#eaf4ff] via-[#f4f9ff] to-[#dcecff]'
                  }`}
                >
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:mb-5 md:flex-row md:items-end">
                    <div>
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

                  <div className="md:hidden">
                    <div className="customer-home-product-carousel -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {section.products.map(product => (
                        <div key={`${section.sectionkey}-mobile-${product.productid}`} className="w-[calc((100%_-_12px)/2)] shrink-0 snap-start">
                          <ProductCard product={product} compact />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="hidden gap-3 sm:gap-4 md:grid md:grid-cols-3 xl:grid-cols-5">
                    {section.products.map(product => (
                      <ProductCard key={`${section.sectionkey}-${product.productid}`} product={product} compact />
                    ))}
                  </div>
                </div>
              );
            })
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-4 pt-8 md:pb-10">
        <div className="rounded-2xl border border-[#e5e7eb] bg-white px-5 py-8 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:-skew-x-3 md:px-10 md:py-10">
          <div className="grid gap-7 text-center sm:grid-cols-2 md:skew-x-3 md:grid-cols-4 md:gap-8">
            {[
              { icon: Truck, title: 'Giao hàng toàn quốc', description: 'Giao hàng trước, trả tiền sau COD' },
              { icon: RefreshCcw, title: 'Đổi trả dễ dàng', description: 'Đổi mới trong 30 ngày đầu' },
              { icon: ShieldCheck, title: 'Thanh toán tiện lợi', description: 'COD, chuyển khoản, ví điện tử' },
              { icon: Headphones, title: 'Hỗ trợ nhiệt tình', description: 'AI và tư vấn viên đồng hành 24/7' },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex flex-col items-center">
                <Icon className="mb-4 text-[#ff4b33]" size={34} strokeWidth={1.8} />
                <h3 className="text-sm font-black uppercase tracking-wide text-[#111827]">{title}</h3>
                <p className="mt-2 text-sm font-medium text-[#111827]/80">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CustomerHome;
