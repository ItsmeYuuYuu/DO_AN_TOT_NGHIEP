import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  ChevronDown,
  ClipboardList,
  Headphones,
  LogOut,
  MapPin,
  Menu,
  Newspaper,
  Phone,
  Search,
  Send,
  ShoppingCart,
  User,
  X,
} from 'lucide-react';
import { useCart } from '@/features/orders/context/CartContext';
import { useAuth } from '@/features/auth/context/AuthContext';
import { chatSessionsApi } from '@/features/chat/api/chatSessionsApi';
import type { ChatMessage, ChatSession } from '@/features/chat/api/chatSessionsApi';
import { ChatComparisonTable } from '@/features/chat/components/ChatComparisonTable';
import { ChatAssistantSegments } from '@/features/chat/components/ChatAssistantSegments';
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
  const [aiWidgetOpen, setAiWidgetOpen] = useState(false);
  const [aiWidgetMessage, setAiWidgetMessage] = useState('');
  const [aiWidgetSession, setAiWidgetSession] = useState<ChatSession | null>(null);
  const [aiWidgetMessages, setAiWidgetMessages] = useState<ChatMessage[]>([]);
  const [aiWidgetLoading, setAiWidgetLoading] = useState(false);
  const [aiWidgetConsultantTyping, setAiWidgetConsultantTyping] = useState(false);
  const [aiWidgetError, setAiWidgetError] = useState<string | null>(null);
  const aiWidgetMessagesRef = useRef<HTMLDivElement>(null);
  const aiWidgetTypingSentRef = useRef(0);
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

  useEffect(() => {
    if (!aiWidgetOpen) return;
    window.setTimeout(() => {
      const pane = aiWidgetMessagesRef.current;
      if (pane) pane.scrollTo({ top: pane.scrollHeight, behavior: 'smooth' });
    }, 60);
  }, [aiWidgetMessages, aiWidgetLoading, aiWidgetOpen]);

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

  const buildPhoneBrandUrl = (brandId?: number, seriesName?: string) => {
    const params = new URLSearchParams();
    if (phoneCategory) params.set('categoryId', String(phoneCategory.categoryid));
    if (brandId) params.set('brandId', String(brandId));
    if (seriesName) params.set('seriesName', seriesName);
    const query = params.toString();
    return query ? `/products?${query}` : '/products';
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    setMobileMenuOpen(false);
  };

  const renderMiniChatText = (content: string) =>
    content.split(/(\[[^\]]+\]\(\/products\/[A-Za-z0-9-]+\)|\/products\/[A-Za-z0-9-]+)/g).map((part, index) => {
      const markdownLink = part.match(/^\[([^\]]+)\]\((\/products\/[A-Za-z0-9-]+)\)$/);
      const rawProductLink = part.match(/^\/products\/[A-Za-z0-9-]+$/);
      if (!markdownLink && !rawProductLink) return part;

      const to = markdownLink?.[2] ?? part;
      const label = markdownLink?.[1] ?? part;
      return (
        <Link
          key={`${part}-${index}`}
          to={to}
          className="font-black text-[#c4000b] underline underline-offset-2"
        >
          {label}
        </Link>
      );
    });

  const ensureAiWidgetSession = async () => {
    if (aiWidgetSession) return aiWidgetSession;

    const session = await chatSessionsApi.createSession('Cuộc hội thoại mới');
    setAiWidgetSession(session);
    setAiWidgetMessages([]);
    return session;
  };

  const startAiChat = async (question?: string) => {
    const message = (question ?? aiWidgetMessage).trim();
    if (!message || aiWidgetLoading) return;
    const tempMessageId = Date.now();

    setAiWidgetError(null);
    setAiWidgetMessage('');
    setAiWidgetLoading(true);

    try {
      const session = await ensureAiWidgetSession();
      const tempMessage: ChatMessage = {
        messageid: tempMessageId,
        sessionid: session.sessionid,
        sendertype: 'user',
        messagecontent: message,
        sentat: new Date().toISOString(),
      };
      setAiWidgetMessages(current => [...current, tempMessage]);

      const response = await chatSessionsApi.postMessage(session.sessionid, message);
      if (response.sendertype === 'user') {
        setAiWidgetMessages(await chatSessionsApi.getMessages(session.sessionid));
      } else {
        setAiWidgetMessages(current => [...current, response]);
      }
    } catch {
      setAiWidgetError('Không thể gửi tin nhắn lúc này. Bạn thử lại sau nhé.');
      setAiWidgetMessages(current => current.filter(messageItem => messageItem.messageid !== tempMessageId));
    } finally {
      setAiWidgetLoading(false);
    }
  };

  useEffect(() => {
    if (!aiWidgetSession?.sessionid || aiWidgetSession.handoffstatus !== 'InProgress') return;

    const timer = window.setInterval(async () => {
      try {
        const [session, latestMessages, typing] = await Promise.all([
          chatSessionsApi.getSession(aiWidgetSession.sessionid),
          chatSessionsApi.getMessages(aiWidgetSession.sessionid),
          chatSessionsApi.getTypingStatus(aiWidgetSession.sessionid),
        ]);
        setAiWidgetSession(session);
        setAiWidgetMessages(latestMessages);
        setAiWidgetConsultantTyping(typing.consultantTyping);
      } catch {
        // Keep the current widget state during transient polling errors.
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [aiWidgetSession?.handoffstatus, aiWidgetSession?.sessionid]);

  const handleAiWidgetSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void startAiChat();
  };

  const handleAiWidgetInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAiWidgetMessage(event.target.value);
    if (!aiWidgetSession || !event.target.value.trim()) return;

    const now = Date.now();
    if (now - aiWidgetTypingSentRef.current < 2500) return;
    aiWidgetTypingSentRef.current = now;
    void chatSessionsApi.setTyping(aiWidgetSession.sessionid).catch(() => undefined);
  };

  const requestAiWidgetConsultant = async () => {
    if (aiWidgetLoading) return;
    setAiWidgetError(null);
    setAiWidgetLoading(true);

    try {
      const session = await ensureAiWidgetSession();
      if (aiWidgetMessages.length === 0) {
        const message = 'Mình muốn gặp nhân viên tư vấn để được hỗ trợ rõ hơn.';
        setAiWidgetMessages([{
          messageid: Date.now(),
          sessionid: session.sessionid,
          sendertype: 'user',
          messagecontent: message,
          sentat: new Date().toISOString(),
        }]);
        await chatSessionsApi.postMessage(session.sessionid, message);
      }
      const updated = await chatSessionsApi.requestHandoff(session.sessionid);
      setAiWidgetSession(updated);
      setAiWidgetMessages(await chatSessionsApi.getMessages(session.sessionid));
    } catch {
      setAiWidgetError('Chưa thể chuyển nhân viên tư vấn. Bạn thử lại sau nhé.');
    } finally {
      setAiWidgetLoading(false);
    }
  };

  const openAiHistory = () => {
    setAiWidgetOpen(false);
    navigate('/chat');
  };

  const showAiWidget = !location.pathname.startsWith('/chat');
  const aiWidgetHandoffActive =
    aiWidgetSession?.handoffstatus === 'Waiting' || aiWidgetSession?.handoffstatus === 'InProgress';

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

              <div className="pointer-events-none absolute left-0 top-full z-[999] w-[900px] max-w-[calc(100vw-2rem)] translate-y-2 pt-2 opacity-0 transition duration-200 group-hover/phone:pointer-events-auto group-hover/phone:translate-y-0 group-hover/phone:opacity-100">
                <div className="grid min-h-80 grid-cols-[250px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
                  <div className="bg-[#1f2937] p-4 text-white">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-[#ffd166]">Hãng sản xuất</p>
                    <div className="space-y-1">
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
                            to={buildPhoneBrandUrl(activePhoneBrand.brandid, series.seriesname)}
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
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {phoneMenuBrands.map(brand => (
                  <Link
                    key={brand.brandid}
                    to={buildPhoneBrandUrl(brand.brandid)}
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-2xl border border-[#e5e7eb] bg-white px-3 py-3 text-sm font-black text-[#1f2937] shadow-sm"
                  >
                    <span className="block truncate">{brand.brandname}</span>
                    <span className="mt-1 block text-[10px] font-bold text-slate-400">
                      {brand.phoneProducts.length} máy
                    </span>
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
        {showAiWidget && (
          <div className="fixed bottom-20 right-4 z-[9999] sm:bottom-5 sm:right-5">
            {aiWidgetOpen ? (
              <section className="flex h-[min(680px,calc(100dvh-6.5rem))] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_22px_60px_rgba(15,23,42,0.22)]">
                <div className="flex items-center justify-between bg-[#e30613] px-4 py-3 text-white">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#e30613]">
                      <Bot size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black">AI tư vấn chọn máy</p>
                      <p className="truncate text-[11px] font-medium text-white/80">
                        {aiWidgetHandoffActive ? 'Đã chuyển cho tư vấn viên' : 'Chat nhanh ngay tại trang này'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={openAiHistory}
                      className="rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white/85 hover:bg-white/15 hover:text-white"
                    >
                      Lịch sử
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiWidgetOpen(false)}
                      aria-label="Đóng khung chat AI"
                      className="rounded-full p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div
                  ref={aiWidgetMessagesRef}
                  className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f8fafc] p-3"
                >
                  {aiWidgetMessages.length === 0 && !aiWidgetLoading && (
                    <>
                      <div className="rounded-2xl bg-white p-3 text-sm leading-6 text-[#1f2937] shadow-sm">
                        Em là trợ lý AI của Cuồng Điện Thoại. Anh/chị đang muốn tìm máy theo nhu cầu, ngân sách hay cần so sánh vài mẫu đang phân vân?
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Máy chụp ảnh đẹp',
                          'Máy chơi game mượt',
                          'So sánh sản phẩm',
                        ].map(prompt => (
                          <button
                            key={prompt}
                            type="button"
                            disabled={aiWidgetLoading}
                            onClick={() => void startAiChat(prompt)}
                            className="rounded-full border border-[#e5e7eb] bg-white px-3 py-2 text-[11px] font-bold text-[#1f2937] hover:border-[#e30613] hover:text-[#c4000b] disabled:opacity-60"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {aiWidgetMessages.map((message, index) => {
                    const isUserMessage = message.sendertype === 'user';
                    const isAssistantMessage = message.sendertype === 'assistant';
                    if (message.sendertype === 'system') {
                      return (
                        <div key={message.messageid || index} className="text-center text-[11px] font-bold text-slate-400">
                          {message.messagecontent}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={message.messageid || index}
                        className={`flex gap-2 ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          isUserMessage ? 'bg-[#e30613] text-white' : 'bg-[#1f2937] text-[#ffd166]'
                        }`}>
                          {isUserMessage ? <User size={14} /> : message.sendertype === 'consultant' ? <Headphones size={14} /> : <Bot size={14} />}
                        </div>
                        <div className={`min-w-0 max-w-[82%] ${
                          isUserMessage
                            ? 'rounded-2xl border border-[#e30613] bg-[#e30613] p-3 text-sm leading-6 text-white'
                            : isAssistantMessage
                              ? 'space-y-2'
                              : 'rounded-2xl border border-[#e5e7eb] bg-white p-3 text-sm leading-6 text-slate-700 shadow-sm'
                        }`}>
                          {isAssistantMessage ? (
                            <ChatAssistantSegments
                              content={message.messagecontent}
                              compact
                              progressive={
                                index === aiWidgetMessages.length - 1 &&
                                !aiWidgetLoading &&
                                Boolean(message.sentat) &&
                                Date.now() - new Date(message.sentat).getTime() < 20_000
                              }
                            />
                          ) : (
                            <div className="whitespace-pre-wrap">
                              {renderMiniChatText(message.messagecontent)}
                            </div>
                          )}

                          {message.responsetype === 'comparison' && message.recommendations && (
                            <div className="-mx-1">
                              <ChatComparisonTable recommendations={message.recommendations} />
                            </div>
                          )}



                          {!isUserMessage &&
                            index === aiWidgetMessages.length - 1 &&
                            message.quickreplies &&
                            message.quickreplies.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {message.quickreplies.map(reply => (
                                  <button
                                    key={reply}
                                    type="button"
                                    disabled={aiWidgetLoading}
                                    onClick={() => void startAiChat(reply)}
                                    className="rounded-full border border-[#ffd166] bg-[#ffd166]/20 px-3 py-1.5 text-[11px] font-black text-[#1f2937] hover:bg-[#ffd166] disabled:opacity-50"
                                  >
                                    {reply}
                                  </button>
                                ))}
                              </div>
                            )}

                          <span className={`mt-2 block text-[10px] ${isUserMessage ? 'text-white/60' : 'text-slate-400'}`}>
                            {message.sentat ? new Date(message.sentat).toLocaleTimeString() : 'Đang gửi...'}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {aiWidgetLoading && (
                    <div className="flex gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f2937] text-[#ffd166]">
                        <Bot size={14} />
                      </div>
                      <div className="flex items-center gap-1 rounded-2xl border border-[#e5e7eb] bg-white p-3 shadow-sm">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#1f2937]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#1f2937] [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-[#1f2937] [animation-delay:300ms]" />
                      </div>
                    </div>
                  )}

                  {aiWidgetConsultantTyping && aiWidgetSession?.handoffstatus === 'InProgress' && (
                    <div className="flex gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f2937] text-[#ffd166]">
                        <Headphones size={14} />
                      </div>
                      <div className="rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
                        Nhân viên đang nhập...
                      </div>
                    </div>
                  )}

                  {aiWidgetError && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
                      {aiWidgetError}
                    </div>
                  )}
                </div>

                <div className="space-y-2 border-t border-[#e5e7eb] bg-white p-3">
                  <form onSubmit={handleAiWidgetSubmit} className="flex gap-2">
                    <input
                      value={aiWidgetMessage}
                      onChange={handleAiWidgetInputChange}
                      placeholder="Nhập nhu cầu của bạn..."
                      maxLength={500}
                      className="min-w-0 flex-1 rounded-full border border-[#e5e7eb] px-4 py-3 text-sm outline-none focus:border-[#e30613] focus:ring-4 focus:ring-[#e30613]/10"
                      disabled={aiWidgetLoading}
                    />
                    <button
                      type="submit"
                      disabled={aiWidgetLoading || !aiWidgetMessage.trim()}
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e30613] text-white hover:bg-[#c4000b] disabled:cursor-not-allowed disabled:bg-slate-300"
                      aria-label="Gửi tin nhắn cho AI"
                    >
                      <Send size={17} />
                    </button>
                  </form>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => void requestAiWidgetConsultant()}
                      disabled={aiWidgetLoading || aiWidgetHandoffActive}
                      className="flex items-center justify-center gap-2 rounded-full border border-[#1f2937] px-3 py-2.5 text-[11px] font-black text-[#1f2937] hover:bg-[#1f2937] hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      <Headphones size={14} /> {aiWidgetHandoffActive ? 'Đã chuyển' : 'Gặp tư vấn'}
                    </button>
                    <button
                      type="button"
                      onClick={openAiHistory}
                      className="rounded-full border border-[#e5e7eb] px-3 py-2.5 text-[11px] font-black text-[#1f2937] hover:border-[#e30613] hover:text-[#c4000b]"
                    >
                      Mở lịch sử
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <button
                type="button"
                onClick={() => setAiWidgetOpen(true)}
                className="group flex items-center gap-3 rounded-full bg-[#e30613] px-3 py-3 text-white shadow-[0_18px_40px_rgba(227,6,19,0.32)] transition hover:-translate-y-1 hover:bg-[#c4000b] sm:px-4"
              >
                <Bot size={20} className="text-[#ffd166]" />
                <span className="hidden text-xs font-black uppercase tracking-[0.12em] md:inline">Hỏi AI chọn máy</span>
              </button>
            )}
          </div>
        )}
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
