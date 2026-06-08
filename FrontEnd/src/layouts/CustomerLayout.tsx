import React, { useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Phone, 
  MapPin, 
  Newspaper, 
  ClipboardList,
  LogOut
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
  const navigate = useNavigate();
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

  const phoneCategory = useMemo(
    () => menuCategories.find(category => {
      const name = normalizeMenuText(category.categoryname);
      return name.includes('dien thoai') || name.includes('smartphone');
    }),
    [menuCategories],
  );

  const phoneMenuBrands = useMemo(() => {
    return menuBrands
      .map(brand => ({
        ...brand,
        phoneSeries: menuSeries
          .filter(series => series.brandid === brand.brandid)
          .sort((a, b) => a.displayorder - b.displayorder || a.seriesname.localeCompare(b.seriesname)),
        phoneProducts: menuProducts.filter(product =>
          (!phoneCategory || product.category?.id === phoneCategory.categoryid) &&
          product.brand?.id === brand.brandid
        ),
      }));
  }, [menuBrands, menuProducts, menuSeries, phoneCategory]);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Utility Bar */}
      <div className="bg-slate-900 text-slate-300 py-1.5 px-4 hidden md:block">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[11px] font-medium tracking-wide">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><Phone size={12} /> Hotline: 1800 0000</span>
            <span className="flex items-center gap-1"><MapPin size={12} /> Tìm cửa hàng</span>
          </div>
          <div className="flex gap-4">
            <Link to="/order-lookup" className="flex items-center gap-1 hover:text-white transition-colors"><ClipboardList size={12} /> Tra cứu đơn hàng</Link>
            <Link to="/news" className="flex items-center gap-1 hover:text-white transition-colors"><Newspaper size={12} /> Tin công nghệ</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm overflow-visible">
        <div className="max-w-7xl mx-auto px-4 overflow-visible">
          <div className="flex items-center gap-6 h-20 md:h-24">
            <Link to="/" className="shrink-0 group flex items-center h-full py-2">
              <img src={Logo} alt="ECOMMERCE" className="h-full w-auto object-contain group-hover:scale-105 transition-transform" />
            </Link>

            {/* Large Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:block">
              <div className="relative flex items-stretch h-12">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Search size={20} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Hôm nay bạn muốn tìm gì?"
                    className="w-full h-full pl-11 pr-4 bg-slate-50 border border-slate-200 border-r-0 rounded-l-xl outline-none focus:bg-white focus:border-blue-500 transition-all text-sm"
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-8 rounded-r-xl transition-colors shrink-0"
                >
                  TÌM KIẾM
                </button>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-4 ml-auto">
              {isLoggedIn ? (
                <>
                  {/* Tài khoản */}
                  <Link to="/profile" className="hidden lg:flex flex-col items-center gap-1 group">
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-[11px] font-black group-hover:bg-blue-700 transition-colors shrink-0">
                      {user?.fullname?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-600 uppercase tracking-tight leading-none">Tài khoản</span>
                  </Link>

                  {/* Đăng xuất */}
                  <button onClick={logout} className="hidden lg:flex flex-col items-center gap-1 group">
                    <div className="h-6 flex items-center justify-center">
                      <LogOut size={20} className="text-slate-400 group-hover:text-red-500 transition-colors" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-red-500 uppercase tracking-tight leading-none">Đăng xuất</span>
                  </button>
                </>
              ) : (
                <Link to="/auth/login" className="hidden lg:flex flex-col items-center gap-1 group">
                  <div className="h-6 flex items-center justify-center">
                    <User size={20} className="text-slate-600 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-600 uppercase tracking-tight leading-none">Đăng nhập</span>
                </Link>
              )}

              {/* Giỏ hàng */}
              <Link to="/cart" className="flex flex-col items-center gap-1 group relative">
                <div className="h-6 flex items-center justify-center relative">
                  <ShoppingCart size={20} className="text-slate-600 group-hover:text-blue-600 transition-colors" />
                  {totalItems > 0 && (
                    <span className="absolute -top-2 -right-2.5 bg-red-500 text-white text-[10px] font-black min-w-[17px] h-[17px] flex items-center justify-center rounded-full border-2 border-white px-0.5 leading-none">
                      {totalItems > 99 ? '99+' : totalItems}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-600 uppercase tracking-tight leading-none">Giỏ hàng</span>
              </Link>
            </div>
          </div>

          {/* ── Bottom Nav with Mega Menu ── */}
          <nav className="relative flex items-center gap-1 h-11 overflow-visible">

            {/* ── Simple link helper ── */}
            {[{ label: 'SẢN PHẨM MỚI', to: '/products?sort=newest', hot: true }].map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) =>
                  `relative px-3 h-full flex items-center text-[11px] font-black tracking-wider border-b-2 transition-all whitespace-nowrap
                   ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-blue-600 hover:border-blue-400'}`
                }
              >
                {item.label}
                {item.hot && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-black rounded uppercase leading-none">HOT</span>
                )}
              </NavLink>
            ))}

            {/* ── ĐIỆN THOẠI — Mega Menu ── */}
            <div className="relative h-full group/phone flex items-center">
              <button className="px-3 h-full flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-600 group-hover/phone:text-blue-600 border-b-2 border-transparent group-hover/phone:border-blue-400 transition-all whitespace-nowrap">
                ĐIỆN THOẠI
                <svg className="w-3 h-3 transition-transform group-hover/phone:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown panel */}
              <div className="absolute top-full left-0 z-[999] w-[760px] max-w-[calc(100vw-2rem)] pt-2 opacity-0 pointer-events-none group-hover/phone:opacity-100 group-hover/phone:pointer-events-auto transition-all duration-200 translate-y-1 group-hover/phone:translate-y-0">
                <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">

                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-black text-sm tracking-wide">ĐIỆN THOẠI CHÍNH HÃNG</p>
                      <p className="text-blue-200 text-xs mt-0.5">Chọn thương hiệu yêu thích của bạn</p>
                    </div>
                    <NavLink
                      to={phoneCategory ? `/products?categoryId=${phoneCategory.categoryid}` : '/products'}
                      className="text-xs text-white font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Xem tất cả →
                    </NavLink>
                  </div>

                  {phoneMenuBrands.length > 0 ? (
                    <div className="grid min-h-64 grid-cols-[220px_1fr]">
                      <div className="border-r border-slate-100 bg-slate-50 p-3">
                        <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          HÃNG SẢN XUẤT
                        </p>
                        <div className="max-h-80 space-y-1 overflow-y-auto">
                          {phoneMenuBrands.map(brand => (
                            <NavLink
                              key={brand.brandid}
                              to={buildPhoneBrandUrl(brand.brandid)}
                              onMouseEnter={() => setActivePhoneBrandId(brand.brandid)}
                              onFocus={() => setActivePhoneBrandId(brand.brandid)}
                              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-bold transition-colors ${
                                activePhoneBrand?.brandid === brand.brandid
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                            >
                              <span>{brand.brandname}</span>
                              <span aria-hidden="true">›</span>
                            </NavLink>
                          ))}
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              DÒNG MÁY
                            </p>
                            <h3 className="mt-1 text-base font-black text-slate-900">
                              {activePhoneBrand?.brandname}
                            </h3>
                          </div>
                          {activePhoneBrand && (
                            <NavLink
                              to={buildPhoneBrandUrl(activePhoneBrand.brandid)}
                              className="text-xs font-bold text-blue-600 hover:underline"
                            >
                              Xem tất cả
                            </NavLink>
                          )}
                        </div>

                        {activePhoneBrand?.phoneSeries.length ? (
                          <div className="grid grid-cols-2 gap-2">
                            {activePhoneBrand.phoneSeries.map(series => (
                              <NavLink
                                key={series.seriesid}
                                to={buildPhoneBrandUrl(activePhoneBrand.brandid, series.seriesid)}
                                className="rounded-lg border border-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600"
                              >
                                <span>{series.seriesname}</span>
                                <span className="ml-2 text-[11px] font-medium text-slate-400">{series.productcount} sp</span>
                              </NavLink>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
                            Chưa có dòng máy nào thuộc thương hiệu này.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center text-sm text-slate-400">
                      Chưa có thương hiệu nào được tạo trong hệ thống.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── KHUYẾN MÃI ── */}
            <NavLink to="/promotions"
              className={({ isActive }) =>
                `px-3 h-full flex items-center gap-1.5 text-[11px] font-black tracking-wider border-b-2 transition-all whitespace-nowrap
                 ${isActive ? 'border-red-500 text-red-500' : 'border-transparent text-red-500 hover:border-red-400'}`
              }
            >
              🔥 KHUYẾN MÃI
            </NavLink>

          </nav>

        </div>
      </header>

      <main className="flex-1 relative">
        <Outlet />
        {/* Floating Chat Button */}
        <Link 
          to="/chat" 
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 z-[9999] group"
        >
          <span className="absolute right-full mr-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-lg pointer-events-none">
            Chat với Trợ lý ảo
          </span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </Link>
      </main>

      {/* Modern Retail Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <img src={Logo} alt="ECOMMERCE" className="h-16 w-auto object-contain mb-4" />
            <p className="mt-4 text-sm text-slate-500 leading-relaxed">
              Hệ thống bán lẻ thiết bị công nghệ chính hãng hàng đầu Việt Nam. Cam kết chất lượng và dịch vụ tốt nhất.
            </p>
            <div className="mt-6 flex gap-3">
              {/* Social icons placeholder */}
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer">f</div>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer">y</div>
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center hover:bg-blue-100 transition-colors cursor-pointer">i</div>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-widest">Hỗ trợ khách hàng</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/policy" className="hover:text-blue-600">Chính sách bảo hành</Link></li>
              <li><Link to="/shipping" className="hover:text-blue-600">Chính sách vận chuyển</Link></li>
              <li><Link to="/return" className="hover:text-blue-600">Chính sách đổi trả</Link></li>
              <li><Link to="/faq" className="hover:text-blue-600">Câu hỏi thường gặp</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-widest">Về chúng tôi</h4>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link to="/about" className="hover:text-blue-600">Giới thiệu hệ thống</Link></li>
              <li><Link to="/contact" className="hover:text-blue-600">Thông tin liên hệ</Link></li>
              <li><Link to="/careers" className="hover:text-blue-600">Tuyển dụng</Link></li>
              <li><Link to="/terms" className="hover:text-blue-600">Điều khoản sử dụng</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-widest">Đăng ký nhận tin</h4>
            <p className="text-sm text-slate-500 mb-4">Nhận ưu đãi mới nhất từ chúng tôi</p>
            <div className="flex">
              <input type="email" placeholder="Email của bạn" className="bg-slate-50 border border-slate-200 rounded-l-lg px-3 py-2 text-sm w-full outline-none focus:border-blue-500" />
              <button type="button" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-r-lg transition-colors shrink-0">GỬI</button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 border-t border-slate-200 py-6 text-center">
          <p className="text-xs text-slate-400">
            © 2026 ECommerce Platform. All rights reserved. GPKD số 0123456789.
          </p>
        </div>
      </footer>
    </div>
  );
};
