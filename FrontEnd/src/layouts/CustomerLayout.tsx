import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  ChevronDown,
  ClipboardList,
  Headphones,
  LogOut,
  MapPin,
  Menu,
  Newspaper,
  Phone,
  Search,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import { useCart } from '@/features/orders/context/CartContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { brandsApi, type Brand } from '@/features/brands/api/brandsApi';
import { categoriesApi, type Category } from '@/features/categories/api/categoriesApi';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { productSeriesApi, type ProductSeries } from '@/features/productSeries/api/productSeriesApi';
import Logo from '@/assets/Logo.png';

const normalizeMenuText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const CustomerLayout: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [menuBrands, setMenuBrands] = useState<Brand[]>([]);
  const [menuCategories, setMenuCategories] = useState<Category[]>([]);
  const [menuProducts, setMenuProducts] = useState<Product[]>([]);
  const [menuSeries, setMenuSeries] = useState<ProductSeries[]>([]);
  const [activePhoneBrandId, setActivePhoneBrandId] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { totalItems } = useCart();
  const { user, isLoggedIn, logout } = useAuth();

  useEffect(() => {
    brandsApi.getAll()
      .then(response => setMenuBrands(response.data))
      .catch(() => setMenuBrands([]));
    categoriesApi.getAll()
      .then(response => setMenuCategories(response.data))
      .catch(() => setMenuCategories([]));
    productsApi.getAll()
      .then(response => setMenuProducts(response.data))
      .catch(() => setMenuProducts([]));
    productSeriesApi.getAll({ activeOnly: true })
      .then(response => setMenuSeries(response.data))
      .catch(() => setMenuSeries([]));
  }, []);

  useEffect(() => {
    if (location.pathname !== '/search') return;
    setSearchQuery(new URLSearchParams(location.search).get('q') ?? '');
  }, [location.pathname, location.search]);

  const phoneCategory = useMemo(
    () => menuCategories.find(category => {
      const name = normalizeMenuText(category.categoryname);
      return name.includes('dien thoai') || name.includes('smartphone');
    }),
    [menuCategories],
  );

  const phoneMenuBrands = useMemo(
    () => menuBrands.map(brand => ({
      ...brand,
      phoneSeries: menuSeries
        .filter(series => series.brandid === brand.brandid)
        .sort((a, b) => a.displayorder - b.displayorder || a.seriesname.localeCompare(b.seriesname)),
      phoneProducts: menuProducts.filter(product =>
        (!phoneCategory || product.category?.id === phoneCategory.categoryid) &&
        product.brand?.id === brand.brandid
      ),
    })),
    [menuBrands, menuProducts, menuSeries, phoneCategory],
  );

  useEffect(() => {
    if (!phoneMenuBrands.some(brand => brand.brandid === activePhoneBrandId)) {
      setActivePhoneBrandId(phoneMenuBrands[0]?.brandid ?? null);
    }
  }, [activePhoneBrandId, phoneMenuBrands]);

  const activePhoneBrand =
    phoneMenuBrands.find(brand => brand.brandid === activePhoneBrandId) ??
    phoneMenuBrands[0];

  const buildPhoneBrandUrl = (brandId?: number, seriesId?: number) => {
    const params = new URLSearchParams();
    if (phoneCategory) params.set('categoryId', String(phoneCategory.categoryid));
    if (brandId) params.set('brandId', String(brandId));
    if (seriesId) params.set('seriesId', String(seriesId));
    const query = params.toString();
    return query ? `/products?${query}` : '/products';
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setMobileMenuOpen(false);
  };

  return (
    <div className="customer-shell flex min-h-screen flex-col">
      <div className="hidden border-b border-white/10 bg-[#1f2937] px-4 py-2 text-white/70 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em]">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-2"><Phone size={12} /> Hotline 1800 0000</span>
            <span className="flex items-center gap-2"><MapPin size={12} /> Hệ thống cửa hàng</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/order-lookup" className="flex items-center gap-2 hover:text-[#ffd166]">
              <ClipboardList size={12} /> Tra cứu đơn
            </Link>
            <Link to="/news" className="flex items-center gap-2 hover:text-[#ffd166]">
              <Newspaper size={12} /> Tin công nghệ
            </Link>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b customer-rule bg-white/95 shadow-sm backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-20 items-center gap-4 md:h-24 md:gap-7">
            <Link to="/" className="flex h-full shrink-0 items-center py-3">
              <img src={Logo} alt="Cường Điện Thoại" className="h-full w-auto object-contain" />
            </Link>

            <form onSubmit={handleSearch} className="hidden max-w-2xl flex-1 md:block">
              <div className="flex h-12 overflow-hidden rounded-full border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] focus-within:border-[#e30613] focus-within:ring-4 focus-within:ring-[#e30613]/10">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#1f2937]/45"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={event => setSearchQuery(event.target.value)}
                    placeholder="Tìm Pixel, iPhone, máy chơi game..."
                    className="h-full w-full bg-transparent pl-11 pr-4 text-sm font-medium text-[#1f2937] outline-none placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-full bg-[#e30613] px-7 text-[11px] font-black uppercase tracking-[0.15em] text-white hover:bg-[#c4000b]"
                >
                  Tìm máy
                </button>
              </div>
            </form>

            <div className="ml-auto flex items-center">
              <Link
                to="/chat"
                className="hidden items-center gap-3 border-r customer-rule px-4 py-2 text-[#1f2937] transition hover:bg-[#ffd166]/30 lg:flex"
              >
                <Headphones size={20} />
                <span>
                  <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#c4000b]">Trợ lý mua sắm</span>
                  <span className="block text-xs font-black">Hỏi AI</span>
                </span>
              </Link>

              {isLoggedIn ? (
                <Link
                  to="/profile"
                  className="hidden items-center gap-3 border-r customer-rule px-4 py-2 text-[#1f2937] hover:bg-[#f3f4f6] sm:flex"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f2937] text-xs font-black text-white">
                    {user?.fullname?.charAt(0).toUpperCase() ?? 'U'}
                  </span>
                  <span className="hidden lg:block">
                    <span className="block text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Tài khoản</span>
                    <span className="block max-w-28 truncate text-xs font-black">{user?.fullname}</span>
                  </span>
                </Link>
              ) : (
                <Link
                  to="/auth/login"
                  className="hidden items-center gap-2 border-r customer-rule px-4 py-3 text-xs font-black text-[#1f2937] hover:bg-[#f3f4f6] sm:flex"
                >
                  <User size={19} /> Đăng nhập
                </Link>
              )}

              <Link
                to="/cart"
                className="relative flex h-12 items-center gap-2 px-4 text-xs font-black text-[#1f2937] hover:bg-[#f3f4f6]"
              >
                <ShoppingCart size={21} />
                <span className="hidden lg:inline">Giỏ hàng</span>
                {totalItems > 0 && (
                  <span className="absolute right-1 top-0 flex min-w-5 items-center justify-center rounded-full bg-[#e30613] px-1 text-[9px] font-black text-white">
                    {totalItems > 99 ? '99+' : totalItems}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(open => !open)}
                aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
                className="flex h-12 w-11 items-center justify-center border-l customer-rule text-[#1f2937] md:hidden"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="pb-3 md:hidden">
            <div className="flex h-11 overflow-hidden rounded-full border border-slate-200 bg-white shadow-sm">
              <input
                type="text"
                value={searchQuery}
                onChange={event => setSearchQuery(event.target.value)}
                placeholder="Bạn đang tìm máy nào?"
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none"
              />
              <button type="submit" className="flex w-12 items-center justify-center rounded-full bg-[#e30613] text-white">
                <Search size={18} />
              </button>
            </div>
          </form>

          <nav className="relative hidden h-12 items-stretch border-t customer-rule md:flex">
            <NavLink
              to="/products?sort=newest"
              className="flex items-center rounded-t-2xl border-r customer-rule px-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#1f2937] hover:bg-[#1f2937] hover:text-white"
            >
              Máy mới
              <span className="ml-2 rounded-full bg-[#e30613] px-1.5 py-0.5 text-[8px] text-white">NEW</span>
            </NavLink>

            <div className="group/phone relative flex">
              <button className="flex items-center gap-2 rounded-t-2xl border-r customer-rule px-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#1f2937] group-hover/phone:bg-[#1f2937] group-hover/phone:text-white">
                Điện thoại <ChevronDown size={14} />
              </button>

              <div className="pointer-events-none absolute left-0 top-full z-[999] w-[780px] max-w-[calc(100vw-2rem)] translate-y-2 pt-2 opacity-0 transition duration-200 group-hover/phone:pointer-events-auto group-hover/phone:translate-y-0 group-hover/phone:opacity-100">
                <div className="grid min-h-80 grid-cols-[230px_1fr] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                  <div className="bg-[#1f2937] p-4 text-white">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#ffd166]">Hãng sản xuất</p>
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                      {phoneMenuBrands.map(brand => (
                        <NavLink
                          key={brand.brandid}
                          to={buildPhoneBrandUrl(brand.brandid)}
                          onMouseEnter={() => setActivePhoneBrandId(brand.brandid)}
                          onFocus={() => setActivePhoneBrandId(brand.brandid)}
                          className={`flex items-center justify-between px-3 py-2.5 text-sm font-bold ${
                            activePhoneBrand?.brandid === brand.brandid
                              ? 'rounded-2xl bg-[#e30613] text-white'
                              : 'rounded-2xl text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <span>{brand.brandname}</span>
                          <span className="text-[10px]">{brand.phoneProducts.length} máy</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="mb-5 flex items-end justify-between border-b customer-rule pb-4">
                      <div>
                        <p className="customer-label">Dòng máy</p>
                        <h3 className="customer-display mt-1 text-3xl font-bold text-[#1f2937]">
                          {activePhoneBrand?.brandname}
                        </h3>
                      </div>
                      {activePhoneBrand && (
                        <NavLink
                          to={buildPhoneBrandUrl(activePhoneBrand.brandid)}
                          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-[#c4000b]"
                        >
                          Xem tất cả <ArrowRight size={14} />
                        </NavLink>
                      )}
                    </div>

                    {activePhoneBrand?.phoneSeries.length ? (
                      <div className="grid grid-cols-2 border-l border-t customer-rule">
                        {activePhoneBrand.phoneSeries.map(series => (
                          <NavLink
                            key={series.seriesid}
                            to={buildPhoneBrandUrl(activePhoneBrand.brandid, series.seriesid)}
                            className="flex items-center justify-between border-b border-r customer-rule px-4 py-3 text-sm font-bold text-[#1f2937] hover:bg-[#ffd166]/30"
                          >
                            <span>{series.seriesname}</span>
                            <span className="text-[10px] text-slate-400">{series.productcount}</span>
                          </NavLink>
                        ))}
                      </div>
                    ) : (
                      <div className="border border-dashed customer-rule px-5 py-10 text-center text-sm text-slate-400">
                        Chưa có dòng máy thuộc thương hiệu này.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <NavLink
              to="/promotions"
              className="flex items-center rounded-t-2xl border-r customer-rule px-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#c4000b] hover:bg-[#e30613] hover:text-white"
            >
              Ưu đãi
            </NavLink>
            <NavLink
              to="/chat"
              className="flex items-center gap-2 rounded-t-2xl border-r customer-rule px-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#1f2937] hover:bg-[#ffd166]"
            >
              So sánh bằng AI
            </NavLink>
          </nav>

          {mobileMenuOpen && (
            <div className="border-t customer-rule py-4 md:hidden">
              <div className="grid grid-cols-2 gap-px bg-[#e5e7eb]">
                <Link
                  to="/products?sort=newest"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl bg-white p-4 text-xs font-black uppercase tracking-wider text-[#1f2937]"
                >
                  Máy mới
                </Link>
                <Link
                  to="/promotions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl bg-white p-4 text-xs font-black uppercase tracking-wider text-[#c4000b]"
                >
                  Ưu đãi
                </Link>
                <Link
                  to="/chat"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl bg-[#ffd166] p-4 text-xs font-black uppercase tracking-wider text-[#1f2937]"
                >
                  Hỏi AI
                </Link>
                <Link
                  to="/order-lookup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl bg-white p-4 text-xs font-black uppercase tracking-wider text-[#1f2937]"
                >
                  Tra cứu đơn
                </Link>
              </div>

              <p className="customer-label mt-5">Hãng điện thoại</p>
              <div className="mt-2 grid grid-cols-2 border-l border-t customer-rule">
                {phoneMenuBrands.map(brand => (
                  <Link
                    key={brand.brandid}
                    to={buildPhoneBrandUrl(brand.brandid)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="border-b border-r customer-rule bg-white px-3 py-3 text-sm font-bold text-[#1f2937]"
                  >
                    {brand.brandname}
                  </Link>
                ))}
              </div>

              {isLoggedIn && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="mt-4 flex w-full items-center gap-2 rounded-full bg-[#1f2937] px-4 py-3 text-xs font-black uppercase tracking-wider text-white"
                >
                  <LogOut size={15} /> Đăng xuất
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="relative flex-1">
        <Outlet />
        <Link
          to="/chat"
          className="group fixed bottom-20 right-4 z-[9999] flex items-center gap-3 rounded-full bg-[#e30613] px-3 py-3 text-white shadow-[0_18px_40px_rgba(227,6,19,0.32)] transition hover:-translate-y-1 hover:bg-[#c4000b] sm:bottom-5 sm:right-5 sm:px-4"
        >
          <Headphones size={20} className="text-[#ffd166]" />
          <span className="hidden text-xs font-black uppercase tracking-[0.12em] md:inline">Hỏi AI chọn máy</span>
        </Link>
      </main>

      <footer className="border-t-4 border-[#e30613] bg-[#1f2937] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
          <div>
            <img src={Logo} alt="Cường Điện Thoại" className="h-16 w-auto object-contain" />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/55">
              Cửa hàng thiết bị công nghệ tập trung vào dữ liệu sản phẩm rõ ràng, tư vấn đúng nhu cầu và quy trình hậu mãi có thể theo dõi.
            </p>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd166]">Hỗ trợ</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/60">
              <li><Link to="/order-lookup" className="hover:text-white">Tra cứu đơn hàng</Link></li>
              <li><Link to="/policy" className="hover:text-white">Chính sách bảo hành</Link></li>
              <li><Link to="/shipping" className="hover:text-white">Chính sách vận chuyển</Link></li>
              <li><Link to="/return" className="hover:text-white">Đổi trả và hoàn tiền</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd166]">Khám phá</h4>
            <ul className="mt-5 space-y-3 text-sm text-white/60">
              <li><Link to="/products" className="hover:text-white">Toàn bộ sản phẩm</Link></li>
              <li><Link to="/products?sort=newest" className="hover:text-white">Máy mới lên kệ</Link></li>
              <li><Link to="/promotions" className="hover:text-white">Ưu đãi hiện tại</Link></li>
              <li><Link to="/chat" className="hover:text-white">Trợ lý mua sắm AI</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ffd166]">Nhận tin mới</h4>
            <p className="mt-5 text-sm leading-6 text-white/55">
              Sản phẩm mới, cập nhật giá và nội dung công nghệ đáng chú ý.
            </p>
            <div className="mt-5 flex overflow-hidden rounded-full border border-white/25 bg-white/10">
              <input
                type="email"
                placeholder="Email của bạn"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/35"
              />
              <button
                type="button"
                className="rounded-full bg-[#e30613] px-4 text-[10px] font-black uppercase tracking-wider text-white hover:bg-[#c4000b]"
              >
                Gửi
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-5">
          <div className="mx-auto flex max-w-7xl justify-center text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">
            <span>© 2026 Cuồng Điện Thoại</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
