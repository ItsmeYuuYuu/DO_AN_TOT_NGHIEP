import React from 'react';
import { Link } from 'react-router-dom';
import { useProducts } from '@/features/products/hooks/useProducts';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';
import { Button } from '@/components/Button';

const CustomerHome: React.FC = () => {
  const { products, loading } = useProducts();

  return (
    <div className="bg-slate-50 min-h-screen pb-12">
      {/* ── Big Banner Section ── */}
      <section className="bg-white px-4 py-6 md:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Main Slider Placeholder */}
            <div className="lg:col-span-3 aspect-[16/7] bg-blue-600 rounded-xl relative overflow-hidden group shadow-md">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 to-transparent z-10" />
              <div className="absolute inset-0 flex items-center p-8 md:p-12 z-20">
                <div className="max-w-md">
                  <span className="inline-block bg-yellow-400 text-blue-950 text-[10px] font-bold px-2 py-1 rounded mb-4 uppercase tracking-wider">
                    Sự kiện mới nhất
                  </span>
                  <h2 className="text-3xl md:text-5xl font-black text-white leading-tight mb-4">
                    IPHONE 15 PRO <br />
                    TITAN TỰ NHIÊN
                  </h2>
                  <p className="text-white/80 text-sm mb-6 hidden md:block leading-relaxed">
                    Đẳng cấp công nghệ mới với khung viền Titan siêu bền, chip A17 Pro mạnh mẽ nhất.
                  </p>
                  <Button size="lg" className="bg-white text-blue-600 hover:bg-slate-100 border-none shadow-lg">
                    MUA NGAY CHỈ TỪ 24.990K
                  </Button>
                </div>
              </div>
              {/* Decorative graphic element */}
              <div className="absolute right-[-10%] top-1/2 -translate-y-1/2 w-3/5 aspect-square bg-blue-400/20 rounded-full blur-3xl" />
            </div>

            {/* Side Banners */}
            <div className="hidden lg:flex flex-col gap-4">
              <div className="flex-1 bg-red-500 rounded-xl p-6 relative overflow-hidden shadow-sm group cursor-pointer">
                <h4 className="text-white font-bold text-lg mb-1 relative z-10">Laptop Gaming</h4>
                <p className="text-white/80 text-xs relative z-10">Giảm đến 5 triệu đồng</p>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              </div>
              <div className="flex-1 bg-slate-900 rounded-xl p-6 relative overflow-hidden shadow-sm group cursor-pointer">
                <h4 className="text-white font-bold text-lg mb-1 relative z-10">Phụ kiện Apple</h4>
                <p className="text-white/80 text-xs relative z-10">Ưu đãi 20% khi mua kèm</p>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500/10 rounded-full group-hover:scale-150 transition-transform duration-500" />
              </div>
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
            { name: 'Macbook', icon: '💻' },
            { name: 'iPad', icon: '📠' },
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
