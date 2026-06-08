import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '@/features/products/hooks/useProducts';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';
import { promotionsApi, type PromotionalContent } from '@/features/content/api/promotionsApi';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    if (sliders.length > 1 && !isSliderPaused) {
      const interval = setInterval(() => {
        setActiveSlide(prev => (prev + 1) % sliders.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [sliders, isSliderPaused]);

  const showPreviousSlide = () => {
    setActiveSlide(current => (current - 1 + sliders.length) % sliders.length);
  };

  const showNextSlide = () => {
    setActiveSlide(current => (current + 1) % sliders.length);
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* ── Big Banner Section ── */}
      <section className="bg-white px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main Slider Placeholder / Dynamic */}
            <div
              className="group lg:col-span-3 aspect-[16/7] bg-slate-100 rounded-xl relative overflow-hidden shadow-md"
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
                  {sliders.map((s, idx) => (
                    <div 
                      key={s.contentid} 
                      className={`absolute inset-0 transition-opacity duration-700 ${idx === activeSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    >
                      <img src={s.imageurl} alt={s.title} className="w-full h-full object-cover" />
                      {s.linkurl && (
                        <Link to={s.linkurl} className="absolute inset-0 z-20" aria-label={s.title} />
                      )}
                    </div>
                  ))}
                  {sliders.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={showPreviousSlide}
                        aria-label="Xem banner trước"
                        className="absolute left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/45 text-white opacity-0 shadow-lg backdrop-blur-sm transition hover:bg-slate-950/65 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white group-hover:opacity-100"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <button
                        type="button"
                        onClick={showNextSlide}
                        aria-label="Xem banner tiếp theo"
                        className="absolute right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-slate-950/45 text-white opacity-0 shadow-lg backdrop-blur-sm transition hover:bg-slate-950/65 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-white group-hover:opacity-100"
                      >
                        <ChevronRight size={24} />
                      </button>
                    </>
                  )}
                  {/* Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-30">
                    {sliders.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveSlide(idx)}
                        aria-label={`Xem banner ${idx + 1}`}
                        aria-current={idx === activeSlide ? 'true' : undefined}
                        className={`h-2 rounded-full transition-all ${idx === activeSlide ? 'w-6 bg-blue-600' : 'w-2 bg-white/60 hover:bg-white'}`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                  <span>Slider</span>
                </div>
              )}
            </div>

            {/* Side Banners */}
            <div className="hidden lg:flex flex-col gap-4">
              {banners.slice(0, 2).map((b) => (
                <div key={b.contentid} className="flex-1 rounded-xl relative overflow-hidden shadow-sm bg-slate-100">
                  <img src={b.imageurl} alt="banner" className="w-full h-full object-cover" />
                  {b.linkurl && (
                    <Link to={b.linkurl} className="absolute inset-0" aria-label="banner link" />
                  )}
                </div>
              ))}
              {banners.length === 0 && (
                <>
                  <div className="flex-1 bg-slate-200 rounded-xl" />
                  <div className="flex-1 bg-slate-200 rounded-xl" />
                </>
              )}
              {banners.length === 1 && (
                <div className="flex-1 bg-slate-200 rounded-xl" />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Feature Services ── */}
      <section className="max-w-7xl mx-auto px-4 py-10">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-wrap justify-around gap-6">
          {[
            { icon: '🛡️', title: 'Chính hãng', desc: 'Cam kết 100%' },
            { icon: '🚚', title: 'Miễn phí vận chuyển', desc: 'Đơn từ 500K' },
            { icon: '⚡', title: 'Bảo hành siêu tốc', desc: 'Tại hơn 100 điểm' },
            { icon: '💳', title: 'Trả góp 0%', desc: 'Thẻ tín dụng, PayLater' },
          ].map((s) => (
            <div key={s.title} className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <h5 className="text-xs font-bold text-slate-800 uppercase">{s.title}</h5>
                <p className="text-[10px] text-slate-400 font-medium">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Flash Sale / Hot Products Grid ── */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-6 bg-blue-600 rounded-full" />
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Sản phẩm nổi bật</h2>
            </div>
            <p className="text-slate-400 text-xs font-medium ml-4">Những thiết bị công nghệ mới nhất hiện nay</p>
          </div>
          <Link to="/products" className="text-blue-600 font-bold text-xs hover:underline uppercase tracking-widest">
            Xem tất cả →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-4 shadow-sm border border-slate-100 h-80">
                <Skeleton className="w-full aspect-square mb-4" />
                <Skeleton className="w-3/4 h-4 mb-2" />
                <Skeleton className="w-1/2 h-6" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.slice(0, 10).map((product) => (
              <ProductCard key={product.productid} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* ── Category Quick Links ── */}
      <section className="max-w-7xl mx-auto px-4 py-12">
        <h3 className="text-lg font-bold text-slate-800 mb-6 uppercase tracking-wider text-center">Danh mục quan tâm</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {[
            { name: 'iPhone', icon: '📱' },
            { name: 'Samsung', icon: '📲' },
            { name: 'iPad', icon: '平板' },
            { name: 'AirPods', icon: '🎧' },
            { name: 'Watch', icon: '⌚' },
            { name: 'Cáp, sạc', icon: '🔌' },
          ].map((cat) => (
            <Link key={cat.name} to="/products" className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col items-center hover:shadow-md hover:border-blue-200 transition-all group">
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{cat.icon}</span>
              <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 uppercase">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default CustomerHome;
