import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BatteryCharging,
  Camera,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Headphones,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
} from 'lucide-react';
import { useProducts } from '@/features/products/hooks/useProducts';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';
import { promotionsApi, type PromotionalContent } from '@/features/content/api/promotionsApi';

const CustomerHome: React.FC = () => {
  const { products, loading } = useProducts();
  const [banners, setBanners] = useState<PromotionalContent[]>([]);
  const [sliders, setSliders] = useState<PromotionalContent[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);

  useEffect(() => {
    promotionsApi.getActive('Banner').then(setBanners).catch(() => {});
    promotionsApi.getActive('Slider').then(setSliders).catch(() => {});
  }, []);

  useEffect(() => {
    if (sliders.length <= 1 || isSliderPaused) return;
    const interval = window.setInterval(() => {
      setActiveSlide(current => (current + 1) % sliders.length);
    }, 5000);
    return () => window.clearInterval(interval);
  }, [sliders, isSliderPaused]);

  const featuredProducts = products.slice(0, 10);
  const popularBrands = useMemo(
    () => Array.from(
      new Map(
        products
          .filter(product => product.brand)
          .map(product => [product.brand!.id, product.brand!]),
      ).values(),
    ).slice(0, 9),
    [products],
  );

  const showPreviousSlide = () => {
    setActiveSlide(current => (current - 1 + sliders.length) % sliders.length);
  };

  const showNextSlide = () => {
    setActiveSlide(current => (current + 1) % sliders.length);
  };

  return (
    <div className="customer-shell min-h-screen pb-20">
      <section className="border-b customer-rule bg-[#fffdf8] px-4 py-4 md:py-6">
        <div className="mx-auto grid max-w-7xl gap-3 lg:grid-cols-12">
          <div
            className="group relative min-h-[330px] overflow-hidden bg-[#10233f] lg:col-span-8 lg:min-h-[440px]"
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
                    <div className="absolute inset-0 bg-gradient-to-t from-[#10233f]/65 via-transparent to-transparent" />
                    {slider.title && (
                      <p className="customer-display absolute bottom-8 left-7 right-24 z-10 text-2xl font-bold text-white md:text-4xl">
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
                  <div className="absolute bottom-6 right-6 z-30 flex border border-white/30 bg-[#10233f]/75 text-white backdrop-blur">
                    <button
                      type="button"
                      onClick={showPreviousSlide}
                      aria-label="Xem banner trước"
                      className="flex h-11 w-11 items-center justify-center border-r border-white/20 hover:bg-white hover:text-[#10233f]"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      onClick={showNextSlide}
                      aria-label="Xem banner tiếp theo"
                      className="flex h-11 w-11 items-center justify-center hover:bg-white hover:text-[#10233f]"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="customer-grid-pattern relative flex h-full min-h-[330px] flex-col justify-between p-7 text-white md:p-10 lg:min-h-[440px]">
                <div className="flex items-center justify-between">
                  <span className="border border-[#75d7dc] px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-[#75d7dc]">
                    Tech selection 2026
                  </span>
                  <Sparkles className="text-[#ff5b35]" size={26} />
                </div>
                <div className="max-w-xl">
                  <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-[#75d7dc]">
                    Chọn đúng máy, dùng đúng nhu cầu
                  </p>
                  <h1 className="customer-display text-4xl font-bold leading-[1.05] md:text-6xl">
                    Công nghệ tốt không cần phải chọn trong mơ hồ.
                  </h1>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      to="/chat"
                      className="inline-flex items-center gap-2 bg-[#ff5b35] px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-[#db3d1c]"
                    >
                      Nhờ AI tư vấn <ArrowRight size={16} />
                    </Link>
                    <Link
                      to="/products"
                      className="inline-flex items-center gap-2 border border-white/50 px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-white hover:bg-white hover:text-[#10233f]"
                    >
                      Xem toàn bộ máy
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
            {banners.slice(0, 2).map(banner => (
              <div key={banner.contentid} className="relative min-h-52 overflow-hidden bg-[#e8f1ef]">
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

            {banners.length === 0 && (
              <>
                <Link
                  to="/chat?q=Tư vấn điện thoại phù hợp với nhu cầu của tôi"
                  className="group flex min-h-52 flex-col justify-between bg-[#75d7dc] p-6 text-[#10233f]"
                >
                  <Headphones size={28} />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em]">Tư vấn có ngữ cảnh</p>
                    <h2 className="customer-display mt-2 text-3xl font-bold leading-none">
                      Nói nhu cầu, AI lọc máy.
                    </h2>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                      Bắt đầu hỏi <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
                <Link
                  to="/products?sort=newest"
                  className="group flex min-h-52 flex-col justify-between bg-[#ff5b35] p-6 text-white"
                >
                  <Sparkles size={28} />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">Vừa lên kệ</p>
                    <h2 className="customer-display mt-2 text-3xl font-bold leading-none">
                      Những lựa chọn mới nhất.
                    </h2>
                    <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                      Khám phá ngay <ArrowRight size={15} className="transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              </>
            )}

            {banners.length === 1 && (
              <Link
                to="/chat"
                className="group flex min-h-52 flex-col justify-between bg-[#75d7dc] p-6 text-[#10233f]"
              >
                <Headphones size={28} />
                <div>
                  <p className="customer-display text-3xl font-bold leading-none">Hỏi AI trước khi chọn máy.</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider">
                    Bắt đầu tư vấn <ArrowRight size={15} />
                  </span>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#10233f] px-4 text-white">
        <div className="mx-auto grid max-w-7xl divide-y divide-white/15 md:grid-cols-4 md:divide-x md:divide-y-0">
          {[
            { icon: ShieldCheck, title: 'Máy chính hãng', description: 'Nguồn gốc và tình trạng rõ ràng' },
            { icon: Truck, title: 'Theo dõi giao hàng', description: 'Biết đơn đang ở đâu, bất cứ lúc nào' },
            { icon: RefreshCcw, title: 'Đổi trả minh bạch', description: 'Theo đúng IMEI và lịch sử xử lý' },
            { icon: Headphones, title: 'AI + tư vấn viên', description: 'Chuyển người thật khi cần chuyên sâu' },
          ].map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-4 px-5 py-6 md:px-6">
              <Icon className="mt-0.5 shrink-0 text-[#75d7dc]" size={22} strokeWidth={1.8} />
              <div>
                <h3 className="text-sm font-black">{title}</h3>
                <p className="mt-1 text-xs leading-5 text-white/55">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 md:py-20">
        <div className="mb-8 flex items-end justify-between gap-5 border-b customer-rule pb-5">
          <div>
            <p className="customer-label">Curated devices</p>
            <h2 className="customer-display mt-2 text-4xl font-bold text-[#10233f] md:text-5xl">
              Máy đáng chú ý
            </h2>
          </div>
          <Link
            to="/products"
            className="hidden items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#10233f] sm:inline-flex"
          >
            Xem toàn bộ <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="border customer-rule bg-[#fffdf8] p-4">
                <Skeleton className="mb-4 aspect-[4/4.4] w-full" />
                <Skeleton className="mb-2 h-4 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {featuredProducts.map(product => (
              <ProductCard key={product.productid} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="border-y customer-rule bg-[#fffdf8] px-4 py-14 md:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_2fr]">
            <div>
              <p className="customer-label">Chọn theo cách bạn dùng</p>
              <h2 className="customer-display mt-3 text-4xl font-bold leading-[1.05] text-[#10233f]">
                Không cần thuộc thông số để chọn đúng máy.
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-500">
                Bắt đầu từ việc bạn thực sự muốn làm. Chatbot sẽ đối chiếu nhu cầu với dữ liệu sản phẩm đang có.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  icon: Camera,
                  title: 'Chụp ảnh đẹp',
                  description: 'Ưu tiên camera chính, chân dung, chống rung và khả năng zoom.',
                  to: '/chat?q=Tôi cần điện thoại chụp ảnh đẹp',
                  color: 'bg-[#f4e4da]',
                },
                {
                  icon: Gamepad2,
                  title: 'Chơi game mượt',
                  description: 'So chip, RAM, màn hình tần số cao, pin và khả năng sạc nhanh.',
                  to: '/chat?q=Tôi cần điện thoại chơi game mượt',
                  color: 'bg-[#e9e5f3]',
                },
                {
                  icon: BatteryCharging,
                  title: 'Pin dùng lâu',
                  description: 'Lọc dung lượng pin, công nghệ sạc và cấu hình phù hợp cả ngày.',
                  to: '/chat?q=Tôi cần điện thoại pin lâu sạc nhanh',
                  color: 'bg-[#e8f1ef]',
                },
              ].map(({ icon: Icon, title, description, to, color }) => (
                <Link
                  key={title}
                  to={to}
                  className={`group flex min-h-72 flex-col justify-between p-6 ${color}`}
                >
                  <Icon size={30} strokeWidth={1.6} className="text-[#10233f]" />
                  <div>
                    <h3 className="customer-display text-3xl font-bold text-[#10233f]">{title}</h3>
                    <p className="mt-3 text-xs leading-5 text-[#10233f]/65">{description}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#db3d1c]">
                      Tư vấn ngay <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="customer-label">Browse by brand</p>
            <h2 className="customer-display mt-2 text-3xl font-bold text-[#10233f]">
              Đi thẳng tới hãng bạn quan tâm
            </h2>
          </div>
          <div className="grid flex-1 grid-cols-2 border-l border-t customer-rule sm:grid-cols-3 lg:max-w-3xl lg:grid-cols-5">
            {popularBrands.map(brand => (
              <Link
                key={brand.id}
                to={`/products?brandId=${brand.id}`}
                className="group flex min-h-20 items-center justify-between border-b border-r customer-rule bg-[#fffdf8] px-4 text-sm font-black text-[#10233f] hover:bg-[#10233f] hover:text-white"
              >
                <span>{brand.name}</span>
                <ArrowRight size={14} className="text-[#ff5b35] transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CustomerHome;
