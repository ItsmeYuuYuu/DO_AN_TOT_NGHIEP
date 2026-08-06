import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, LayoutGrid, Save, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { homepageSectionsApi, type HomepageProductSection } from '@/features/homepage/api/homepageSectionsApi';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { formatCurrency } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';
import { notifyError, notifySuccess } from '@/utils/notifications';

const MAX_SECTION_PRODUCTS = 8;
const NEW_ARRIVALS_SECTION_KEY = 'new-arrivals';

const isNewArrivalsSectionKey = (sectionKey?: string) =>
  sectionKey?.trim().toLowerCase() === NEW_ARRIVALS_SECTION_KEY;

const getProductImage = (product: Product) => {
  const firstVariant = product.productvariants?.[0];
  return firstVariant?.productimages?.find(image => image.ismain)?.imageurl
    ?? firstVariant?.productimages?.[0]?.imageurl;
};

interface ProductPricing {
  basePrice: number;
  salePrice: number;
  discountAmount: number;
  discountPercent: number;
}

type ProductSortMode =
  | 'default'
  | 'discount-percent'
  | 'discount-amount'
  | 'sold'
  | 'price-asc'
  | 'price-desc';

const getProductPricing = (product: Product): ProductPricing | undefined => {
  const prices = (product.productvariants ?? [])
    .filter(variant => variant.baseprice > 0)
    .map(variant => {
      const salePrice = variant.saleprice != null && variant.saleprice > 0
        ? variant.saleprice
        : variant.baseprice;
      const discountAmount = Math.max(0, variant.baseprice - salePrice);
      return {
        basePrice: variant.baseprice,
        salePrice,
        discountAmount,
        discountPercent: variant.baseprice > 0
          ? Math.round((discountAmount / variant.baseprice) * 100)
          : 0,
      };
    });

  if (prices.length === 0) return undefined;
  const discounted = prices.filter(price => price.discountAmount > 0);
  if (discounted.length > 0) {
    return [...discounted].sort((a, b) =>
      b.discountPercent - a.discountPercent ||
      b.discountAmount - a.discountAmount ||
      a.salePrice - b.salePrice,
    )[0];
  }
  return [...prices].sort((a, b) => a.salePrice - b.salePrice)[0];
};

export const AdminHomepageSections: React.FC = () => {
  const [sections, setSections] = useState<HomepageProductSection[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [theme, setTheme] = useState('LightBlue');
  const [isactive, setIsactive] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSort, setProductSort] = useState<ProductSortMode>('default');
  const [onlyRelevantProducts, setOnlyRelevantProducts] = useState(true);
  const [soldQuantityByProduct, setSoldQuantityByProduct] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeSection = sections.find(section => section.sectionid === activeSectionId);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sectionData, productResponse, productMetrics] = await Promise.all([
        homepageSectionsApi.getAll(),
        productsApi.getAll(),
        homepageSectionsApi.getProductMetrics().catch(() => []),
      ]);
      setSections(sectionData);
      setProducts(productResponse.data);
      setSoldQuantityByProduct(new Map(productMetrics.map(metric => [metric.productid, metric.soldquantity])));
      setActiveSectionId(current => current ?? sectionData[0]?.sectionid ?? null);
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Không thể tải cấu hình sản phẩm trang chủ.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    if (!activeSection) return;
    setTitle(activeSection.title);
    setSubtitle(activeSection.subtitle ?? '');
    setTheme(activeSection.theme || 'LightBlue');
    setIsactive(activeSection.isactive !== false);
    setSelectedProductIds(
      [...activeSection.items]
        .sort((a, b) => (a.displayorder ?? 0) - (b.displayorder ?? 0))
        .filter(item => item.isactive !== false)
        .slice(0, MAX_SECTION_PRODUCTS)
        .map(item => item.productid),
    );
    const titleText = `${activeSection.sectionkey} ${activeSection.title}`.toLowerCase();
    if (titleText.includes('khuyến mãi') || titleText.includes('promotion') || titleText.includes('sale')) {
      setProductSort('discount-percent');
      setOnlyRelevantProducts(true);
    } else if (titleText.includes('bán chạy') || titleText.includes('best')) {
      setProductSort('sold');
      setOnlyRelevantProducts(true);
    } else {
      setProductSort('default');
      setOnlyRelevantProducts(false);
    }
  }, [activeSection]);

  const productsById = useMemo(
    () => new Map(products.map(product => [product.productid, product])),
    [products],
  );

  const selectedProducts = selectedProductIds
    .map(productId => productsById.get(productId))
    .filter((product): product is Product => Boolean(product));

  const activeSectionText = `${activeSection?.sectionkey ?? ''} ${activeSection?.title ?? ''}`.toLowerCase();
  const isPromotionSection = activeSectionText.includes('khuyến mãi')
    || activeSectionText.includes('promotion')
    || activeSectionText.includes('sale');
  const isBestSellerSection = activeSectionText.includes('bán chạy')
    || activeSectionText.includes('best');

  const isNewArrivalsSection = isNewArrivalsSectionKey(activeSection?.sectionkey);

  const filteredProducts = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    const result = products.filter(product => {
      const matchesKeyword = !keyword || [
        product.productname,
        product.brand?.name,
        product.series?.name,
        product.category?.name,
      ].some(value => value?.toLowerCase().includes(keyword));
      if (!matchesKeyword) return false;

      if (onlyRelevantProducts && isPromotionSection) {
        return (getProductPricing(product)?.discountAmount ?? 0) > 0;
      }
      if (onlyRelevantProducts && isBestSellerSection) {
        return (soldQuantityByProduct.get(product.productid) ?? 0) > 0;
      }
      return true;
    });

    return [...result].sort((a, b) => {
      const aPricing = getProductPricing(a);
      const bPricing = getProductPricing(b);
      if (productSort === 'discount-percent') {
        return (bPricing?.discountPercent ?? 0) - (aPricing?.discountPercent ?? 0);
      }
      if (productSort === 'discount-amount') {
        return (bPricing?.discountAmount ?? 0) - (aPricing?.discountAmount ?? 0);
      }
      if (productSort === 'sold') {
        return (soldQuantityByProduct.get(b.productid) ?? 0) - (soldQuantityByProduct.get(a.productid) ?? 0);
      }
      if (productSort === 'price-asc') {
        return (aPricing?.salePrice ?? Number.MAX_SAFE_INTEGER) - (bPricing?.salePrice ?? Number.MAX_SAFE_INTEGER);
      }
      if (productSort === 'price-desc') {
        return (bPricing?.salePrice ?? 0) - (aPricing?.salePrice ?? 0);
      }
      return a.productid - b.productid;
    });
  }, [
    products,
    searchTerm,
    onlyRelevantProducts,
    isPromotionSection,
    isBestSellerSection,
    productSort,
    soldQuantityByProduct,
  ]);

  const toggleProduct = (productId: number) => {
    setSelectedProductIds(current => {
      if (current.includes(productId)) {
        return current.filter(id => id !== productId);
      }
      if (current.length >= MAX_SECTION_PRODUCTS) {
        notifyError(`Mỗi vùng trang chủ chỉ được chọn tối đa ${MAX_SECTION_PRODUCTS} sản phẩm.`);
        return current;
      }
      return [...current, productId];
    });
  };

  const moveProduct = (productId: number, direction: -1 | 1) => {
    setSelectedProductIds(current => {
      const index = current.indexOf(productId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const selectTopProducts = () => {
    const productIds = filteredProducts.slice(0, MAX_SECTION_PRODUCTS).map(product => product.productid);
    if (productIds.length === 0) {
      notifyError('Không có sản phẩm phù hợp với bộ lọc hiện tại.');
      return;
    }
    setSelectedProductIds(productIds);
    notifySuccess(`Đã chọn ${productIds.length} sản phẩm đầu danh sách.`);
  };

  const handleSave = async () => {
    if (!activeSection) return;
    if (!title.trim()) {
      notifyError('Vui lòng nhập tiêu đề vùng hiển thị.');
      return;
    }
    setSaving(true);
    try {
      await homepageSectionsApi.update(activeSection.sectionid, {
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        theme,
        displayorder: activeSection.displayorder ?? 0,
        isactive,
        items: isNewArrivalsSection
          ? []
          : selectedProductIds.map((productid, index) => ({
              productid,
              displayorder: index,
              isactive: true,
            })),
      });
      notifySuccess('Đã lưu cấu hình sản phẩm trang chủ.');
      await loadData();
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Không thể lưu cấu hình sản phẩm trang chủ.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="ops-hero flex flex-col justify-between gap-4 p-6 lg:flex-row lg:items-end">
        <div>
          <h1 className="ops-hero-title">Sản phẩm hiển thị trang chủ</h1>
        </div>
        <Button onClick={handleSave} disabled={!activeSection || saving} className="bg-[#e30613] hover:bg-[#c4000b]">
          <Save size={16} />
          {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
        </Button>
      </div>

      {loading ? (
        <div className="ops-card p-10 text-center text-sm font-bold text-slate-400">Đang tải dữ liệu...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
          <aside className="ops-card h-fit p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-slate-700">
              <LayoutGrid size={16} /> Vùng hiển thị
            </h2>
            <div className="space-y-2">
              {sections.map(section => (
                <button
                  key={section.sectionid}
                  type="button"
                  onClick={() => setActiveSectionId(section.sectionid)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    activeSectionId === section.sectionid
                      ? 'border-[#e30613] bg-red-50 text-[#172033]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-black">{section.title}</span>
                    {section.isactive === false ? <EyeOff size={15} /> : <Eye size={15} />}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{section.items.length} sản phẩm đã chọn</p>
                </button>
              ))}
            </div>
          </aside>

          {activeSection && (
            <div className="space-y-6">
              <section className="ops-card p-5">
                <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr_180px_140px]">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Tiêu đề</span>
                    <input
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-[#e30613] focus:ring-2 focus:ring-red-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Mô tả ngắn</span>
                    <input
                      value={subtitle}
                      onChange={event => setSubtitle(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#e30613] focus:ring-2 focus:ring-red-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Màu nền</span>
                    <select
                      value={theme}
                      onChange={event => setTheme(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-[#e30613] focus:ring-2 focus:ring-red-100"
                    >
                      <option value="Red">Đỏ khuyến mãi</option>
                      <option value="LightBlue">Xanh nhạt</option>
                    </select>
                  </label>
                  <label className="flex items-end gap-2 pb-2 text-sm font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isactive}
                      onChange={event => setIsactive(event.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#e30613] focus:ring-[#e30613]"
                    />
                    Hiển thị
                  </label>
                </div>
              </section>

              <section className="ops-card p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      {isNewArrivalsSection
                        ? `Sản phẩm mới nhất (${selectedProductIds.length}/${MAX_SECTION_PRODUCTS})`
                        : `Sản phẩm đã chọn (${selectedProductIds.length}/${MAX_SECTION_PRODUCTS})`}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {isNewArrivalsSection
                        ? 'Danh sách được cập nhật tự động khi có sản phẩm mới được thêm vào cửa hàng.'
                        : 'Thứ tự ở đây chính là thứ tự hiển thị ngoài trang chủ.'}
                    </p>
                  </div>
                </div>

                {isNewArrivalsSection && (
                  <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                    <p className="font-bold">Danh sách tự động theo ngày thêm vào cửa hàng</p>
                    <p className="mt-1 text-xs text-sky-700">
                      Hệ thống luôn lấy tối đa 8 sản phẩm đang kinh doanh có ngày thêm mới nhất. Không cần chọn hoặc sắp xếp thủ công.
                    </p>
                  </div>
                )}

                {selectedProducts.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
                    Chưa chọn sản phẩm nào cho vùng này.
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {selectedProducts.map((product, index) => (
                      <div key={product.productid} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                          {getProductImage(product) ? (
                            <img src={getProductImage(product)} alt={product.productname} className="h-full w-full object-contain p-2" />
                          ) : (
                            <span className="text-xl font-black text-slate-300">{product.productname.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-black text-slate-800">{product.productname}</p>
                          <p className="mt-1 text-xs text-slate-400">{product.brand?.name ?? 'Chưa có hãng'}</p>
                          {(() => {
                            const pricing = getProductPricing(product);
                            const soldQuantity = soldQuantityByProduct.get(product.productid) ?? 0;
                            return (
                              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                                {pricing && (
                                  <>
                                    <span className="font-bold text-[#dc2626]">{formatCurrency(pricing.salePrice)}</span>
                                    {pricing.discountPercent > 0 && (
                                      <span className="rounded-md bg-red-50 px-1.5 py-0.5 font-bold text-[#c4000b]">
                                        -{pricing.discountPercent}%
                                      </span>
                                    )}
                                  </>
                                )}
                                <span className="font-semibold text-emerald-700">Đã bán {soldQuantity}</span>
                              </div>
                            );
                          })()}
                          <div className={`mt-2 flex items-center gap-1.5 ${isNewArrivalsSection ? 'hidden' : ''}`}>
                            <button type="button" onClick={() => moveProduct(product.productid, -1)} disabled={index === 0} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                              <ArrowUp size={14} />
                            </button>
                            <button type="button" onClick={() => moveProduct(product.productid, 1)} disabled={index === selectedProducts.length - 1} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30">
                              <ArrowDown size={14} />
                            </button>
                            <button type="button" onClick={() => toggleProduct(product.productid)} className="ml-auto rounded-lg p-1 text-red-500 hover:bg-red-50">
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className={isNewArrivalsSection ? 'hidden' : 'ops-card p-5'}>
                <div className="mb-4 flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Danh sách sản phẩm</h2>
                    <p className="text-xs text-slate-400">
                      {isPromotionSection
                        ? 'So sánh giá gốc, giá giảm và mức giảm trước khi chọn.'
                        : isBestSellerSection
                          ? 'Số lượng bán được tính từ các đơn đã giao hoàn tất.'
                          : 'Bấm vào sản phẩm để thêm hoặc bỏ khỏi vùng đang chọn.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <label className="relative w-full md:w-72">
                      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={searchTerm}
                        onChange={event => setSearchTerm(event.target.value)}
                        placeholder="Tìm sản phẩm, hãng, dòng máy..."
                        className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#e30613] focus:ring-2 focus:ring-red-100"
                      />
                    </label>
                    <label className="relative">
                      <SlidersHorizontal size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={productSort}
                        onChange={event => setProductSort(event.target.value as ProductSortMode)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-8 text-sm font-semibold text-slate-700 outline-none focus:border-[#e30613] md:w-52"
                      >
                        <option value="default">Mặc định</option>
                        {isPromotionSection && <option value="discount-percent">Giảm % cao nhất</option>}
                        {isPromotionSection && <option value="discount-amount">Số tiền giảm nhiều nhất</option>}
                        {isBestSellerSection && <option value="sold">Bán nhiều nhất</option>}
                        <option value="price-asc">Giá thấp đến cao</option>
                        <option value="price-desc">Giá cao đến thấp</option>
                      </select>
                    </label>
                    {(isPromotionSection || isBestSellerSection) && (
                      <label className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={onlyRelevantProducts}
                          onChange={event => setOnlyRelevantProducts(event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-[#e30613] focus:ring-[#e30613]"
                        />
                        {isPromotionSection ? 'Chỉ đang giảm giá' : 'Chỉ sản phẩm đã bán'}
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={selectTopProducts}
                      className="min-h-10 whitespace-nowrap rounded-xl bg-[#e30613] px-4 text-xs font-bold text-white transition hover:bg-[#c4000b]"
                    >
                      Chọn {MAX_SECTION_PRODUCTS} sản phẩm đầu
                    </button>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map(product => {
                    const selected = selectedProductIds.includes(product.productid);
                    const pricing = getProductPricing(product);
                    const soldQuantity = soldQuantityByProduct.get(product.productid) ?? 0;
                    return (
                      <button
                        key={product.productid}
                        type="button"
                        onClick={() => toggleProduct(product.productid)}
                        className={`flex gap-3 rounded-2xl border p-3 text-left transition ${
                          selected
                            ? 'border-[#e30613] bg-red-50'
                            : 'border-slate-200 bg-white hover:border-red-200 hover:bg-red-50/40'
                        }`}
                      >
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                          {getProductImage(product) ? (
                            <img src={getProductImage(product)} alt={product.productname} className="h-full w-full object-contain p-2" />
                          ) : (
                            <span className="text-xl font-black text-slate-300">{product.productname.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-black text-slate-800">{product.productname}</p>
                            {selected && <Check size={16} className="shrink-0 text-[#e30613]" />}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{product.brand?.name ?? 'Chưa có hãng'}</p>
                          {pricing ? (
                            <div className="mt-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-[#dc2626]">{formatCurrency(pricing.salePrice)}</span>
                                {pricing.discountPercent > 0 && (
                                  <>
                                    <span className="text-xs text-slate-400 line-through">{formatCurrency(pricing.basePrice)}</span>
                                    <span className="rounded-md bg-red-100 px-1.5 py-0.5 text-[11px] font-black text-[#c4000b]">
                                      -{pricing.discountPercent}%
                                    </span>
                                  </>
                                )}
                              </div>
                              {pricing.discountAmount > 0 && (
                                <p className="mt-1 text-[11px] font-semibold text-[#c4000b]">
                                  Tiết kiệm {formatCurrency(pricing.discountAmount)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="mt-2 text-sm font-bold text-slate-500">Liên hệ</p>
                          )}
                          <p className="mt-1.5 text-xs font-bold text-emerald-700">
                            Đã bán: {soldQuantity} máy
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {filteredProducts.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm font-semibold text-slate-400">
                    Không có sản phẩm phù hợp với bộ lọc hiện tại.
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminHomepageSections;
