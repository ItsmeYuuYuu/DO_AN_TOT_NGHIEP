import React, { useState } from 'react';
import { Link, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Phone, 
  MapPin, 
  Newspaper, 
  ClipboardList,
  ShoppingBag,
  LogOut
} from 'lucide-react';
import { useCart } from '@/features/orders/context/CartContext';
import { useAuth } from '@/features/auth/context/AuthContext';

export const CustomerLayout: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const { user, isLoggedIn, logout } = useAuth();

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
          <div className="flex items-center gap-6 h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="shrink-0 group">
              <span className="text-2xl font-black text-blue-600 flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                  <ShoppingBag size={24} />
                </div>
                <span className="tracking-tighter">ECO<span className="text-slate-900">MMERCE</span></span>
              </span>
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
              <div className="absolute top-full left-0 z-[999] w-[520px] pt-2 opacity-0 pointer-events-none group-hover/phone:opacity-100 group-hover/phone:pointer-events-auto transition-all duration-200 translate-y-1 group-hover/phone:translate-y-0">
                <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">

                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-black text-sm tracking-wide">ĐIỆN THOẠI CHÍNH HÃNG</p>
                      <p className="text-blue-200 text-xs mt-0.5">Chọn thương hiệu yêu thích của bạn</p>
                    </div>
                    <NavLink to="/products?category=phones" className="text-xs text-white font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-colors">
                      Xem tất cả →
                    </NavLink>
                  </div>

                  {/* Brands grid */}
                  <div className="p-5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">HÃNG SẢN XUẤT</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-0">
                      {[
                        { name: 'Apple (iPhone)', icon: '🍎', to: '/products?brand=apple' },
                        { name: 'Samsung', icon: '🔵', to: '/products?brand=samsung' },
                        { name: 'Xiaomi', icon: '🟠', to: '/products?brand=xiaomi' },
                        { name: 'OPPO', icon: '🟢', to: '/products?brand=oppo' },
                        { name: 'vivo', icon: '🔷', to: '/products?brand=vivo' },
                        { name: 'Huawei', icon: '🔴', to: '/products?brand=huawei' },
                        { name: 'Honor', icon: '⚡', to: '/products?brand=honor' },
                        { name: 'Realme', icon: '🌟', to: '/products?brand=realme' },
                        { name: 'Sony Xperia', icon: '🎵', to: '/products?brand=sony' },
                        { name: 'Google Pixel', icon: '🌈', to: '/products?brand=google' },
                        { name: 'OnePlus', icon: '🔥', to: '/products?brand=oneplus' },
                        { name: 'Motorola', icon: '📱', to: '/products?brand=motorola' },
                      ].map(brand => (
                        <NavLink
                          key={brand.to}
                          to={brand.to}
                          className="flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm text-slate-600 font-semibold hover:bg-blue-50 hover:text-blue-600 transition-all group/brand"
                        >
                          <span className="text-base leading-none">{brand.icon}</span>
                          <span className="group-hover/brand:translate-x-0.5 transition-transform">{brand.name}</span>
                        </NavLink>
                      ))}
                    </div>
                  </div>

                  {/* Promo footer */}
                  <div className="border-t border-slate-100 px-5 py-3 bg-slate-50 flex items-center gap-3">
                    <span className="text-lg">🎁</span>
                    <p className="text-xs text-slate-500">
                      <span className="font-bold text-orange-500">Ưu đãi đặc biệt:</span> Giảm thêm 500K khi thanh toán qua VNPAY
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── PHỤ KIỆN ĐIỆN THOẠI — Dropdown ── */}
            <div className="relative h-full group/acc flex items-center">
              <button className="px-3 h-full flex items-center gap-1 text-[11px] font-black tracking-wider text-slate-600 group-hover/acc:text-blue-600 border-b-2 border-transparent group-hover/acc:border-blue-400 transition-all whitespace-nowrap">
                PHỤ KIỆN
                <svg className="w-3 h-3 transition-transform group-hover/acc:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <div className="absolute top-full left-0 z-[999] w-60 pt-2 opacity-0 pointer-events-none group-hover/acc:opacity-100 group-hover/acc:pointer-events-auto transition-all duration-200 translate-y-1 group-hover/acc:translate-y-0">
                <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-400 px-4 py-2.5">
                    <p className="text-white font-black text-xs tracking-wide">PHỤ KIỆN ĐIỆN THOẠI</p>
                    <p className="text-orange-100 text-[10px] mt-0.5">Chính hãng · Tương thích cao</p>
                  </div>
                  <div className="p-2">
                    {[
                      { name: '🛡️ Ốp lưng & Case',        to: '/products?category=cases' },
                      { name: '🔋 Sạc nhanh & Cáp',       to: '/products?category=chargers' },
                      { name: '🎧 Tai nghe & AirPods',     to: '/products?category=earphones' },
                      { name: '🔲 Kính cường lực',          to: '/products?category=screen-protector' },
                      { name: '⚡ Pin sạc dự phòng',        to: '/products?category=powerbank' },
                      { name: '📲 Giá đỡ & Kẹp điện thoại', to: '/products?category=holders' },
                      { name: '💾 Thẻ nhớ & OTG',           to: '/products?category=memory-cards' },
                      { name: '🔌 Hub & Bộ chuyển đổi',    to: '/products?category=adapters' },
                    ].map(item => (
                      <NavLink key={item.to} to={item.to}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-600 font-semibold hover:bg-orange-50 hover:text-orange-600 transition-all">
                        {item.name}
                      </NavLink>
                    ))}
                  </div>
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

      {/* Main Page Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Modern Retail Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-1">
            <span className="text-xl font-black text-blue-600">ECOMMERCE</span>
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
