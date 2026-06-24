import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, LayoutGrid, Save, Search, X } from 'lucide-react';
import { Button } from '@/components/Button';
import { homepageSectionsApi, type HomepageProductSection } from '@/features/homepage/api/homepageSectionsApi';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { formatCurrency } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';
import { notifyError, notifySuccess } from '@/utils/notifications';

const getProductImage = (product: Product) => {
  const firstVariant = product.productvariants?.[0];
  return firstVariant?.productimages?.find(image => image.ismain)?.imageurl
    ?? firstVariant?.productimages?.[0]?.imageurl;
};

const getProductPrice = (product: Product) => {
  const firstVariant = product.productvariants?.[0];
  return firstVariant ? firstVariant.saleprice ?? firstVariant.baseprice : undefined;
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const activeSection = sections.find(section => section.sectionid === activeSectionId);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sectionData, productResponse] = await Promise.all([
        homepageSectionsApi.getAll(),
        productsApi.getAll(),
      ]);
      setSections(sectionData);
      setProducts(productResponse.data);
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
        .slice(0, 5)
        .map(item => item.productid),
    );
  }, [activeSection]);

  const productsById = useMemo(
    () => new Map(products.map(product => [product.productid, product])),
    [products],
  );

  const selectedProducts = selectedProductIds
    .map(productId => productsById.get(productId))
    .filter((product): product is Product => Boolean(product));

  const filteredProducts = products.filter(product => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return true;
    return [
      product.productname,
      product.brand?.name,
      product.series?.name,
      product.category?.name,
    ].some(value => value?.toLowerCase().includes(keyword));
  });

  const toggleProduct = (productId: number) => {
    setSelectedProductIds(current => {
      if (current.includes(productId)) {
        return current.filter(id => id !== productId);
      }
      if (current.length >= 5) {
        notifyError('Mỗi vùng trang chủ chỉ nên chọn tối đa 5 sản phẩm.');
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
        items: selectedProductIds.map((productid, index) => ({
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
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="ops-label">Homepage merchandising</p>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Sản phẩm hiển thị trang chủ</h1>
          <p className="mt-1 text-sm text-slate-500">
            Chọn sản phẩm cho các vùng Khuyến mãi shock, Bán chạy và Flagship trên trang khách hàng.
          </p>
        </div>
        <Button onClick={handleSave} disabled={!activeSection || saving}>
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
                      ? 'border-[#4f46e5] bg-indigo-50 text-[#172033]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:bg-indigo-50/50'
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
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Mô tả ngắn</span>
                    <input
                      value={subtitle}
                      onChange={event => setSubtitle(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">Màu nền</span>
                    <select
                      value={theme}
                      onChange={event => setTheme(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-indigo-100"
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
                      className="h-4 w-4 rounded border-slate-300 text-[#4f46e5] focus:ring-[#4f46e5]"
                    />
                    Hiển thị
                  </label>
                </div>
              </section>

              <section className="ops-card p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Sản phẩm đã chọn ({selectedProductIds.length}/5)</h2>
                    <p className="text-xs text-slate-400">Thứ tự ở đây chính là thứ tự hiển thị ngoài trang chủ.</p>
                  </div>
                </div>

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
                          <div className="mt-2 flex items-center gap-1.5">
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

              <section className="ops-card p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-lg font-black text-slate-900">Danh sách sản phẩm</h2>
                    <p className="text-xs text-slate-400">Bấm vào sản phẩm để thêm hoặc bỏ khỏi vùng đang chọn.</p>
                  </div>
                  <label className="relative w-full md:w-80">
                    <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={event => setSearchTerm(event.target.value)}
                      placeholder="Tìm sản phẩm, hãng, dòng máy..."
                      className="w-full rounded-2xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-indigo-100"
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {filteredProducts.map(product => {
                    const selected = selectedProductIds.includes(product.productid);
                    const price = getProductPrice(product);
                    return (
                      <button
                        key={product.productid}
                        type="button"
                        onClick={() => toggleProduct(product.productid)}
                        className={`flex gap-3 rounded-2xl border p-3 text-left transition ${
                          selected
                            ? 'border-[#4f46e5] bg-indigo-50'
                            : 'border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40'
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
                            {selected && <Check size={16} className="shrink-0 text-[#4f46e5]" />}
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{product.brand?.name ?? 'Chưa có hãng'}</p>
                          <p className="mt-2 text-sm font-black text-[#dc2626]">
                            {price != null ? formatCurrency(price) : 'Liên hệ'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminHomepageSections;
