import React, { useState } from 'react';
import { Link, Outlet, useNavigate, NavLink } from 'react-router-dom';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';

export const CustomerLayout: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
            <span>📞 Hotline: 1800 0000</span>
            <span>📍 Tìm cửa hàng</span>
          </div>
          <div className="flex gap-4">
            <Link to="/order-lookup" className="hover:text-white transition-colors">Tra cứu đơn hàng</Link>
            <Link to="/news" className="hover:text-white transition-colors">Tin công nghệ</Link>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-6 h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="shrink-0">
              <span className="text-2xl font-black text-blue-600 flex items-center gap-1">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
                ECO<span className="text-slate-900">MMERCE</span>
              </span>
            </Link>

            {/* Large Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:block">
              <div className="relative flex">
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hôm nay bạn muốn tìm gì?"
                  className="rounded-r-none border-r-0 focus:ring-0"
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                />
                <Button variant="primary" className="rounded-l-none px-8">
                  TÌM KIẾM
                </Button>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-4 ml-auto">
              <Link to="/auth/login" className="hidden lg:flex flex-col items-center group">
                <svg className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5 group-hover:text-blue-600 uppercase">Tài khoản</span>
              </Link>

              <Link to="/cart" className="flex flex-col items-center group relative">
                <div className="relative">
                  <svg className="w-6 h-6 text-slate-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                    0
                  </span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 mt-0.5 group-hover:text-blue-600 uppercase">Giỏ hàng</span>
              </Link>
            </div>
          </div>

          {/* Bottom Nav / Categories */}
          <nav className="flex items-center gap-8 h-10 overflow-x-auto no-scrollbar">
            {[
              { label: 'Sản phẩm mới', to: '/products?sort=newest' },
              { label: 'Điện thoại', to: '/products?category=phones' },
              { label: 'Laptop', to: '/products?category=laptops' },
              { label: 'Phụ kiện', to: '/products?category=accessories' },
              { label: 'Khuyến mãi', to: '/promotions' },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-[11px] font-bold uppercase tracking-wider h-full flex items-center border-b-2 transition-all whitespace-nowrap
                   ${isActive ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-blue-600'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
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
              <Button size="sm" className="rounded-l-none">GỬI</Button>
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
