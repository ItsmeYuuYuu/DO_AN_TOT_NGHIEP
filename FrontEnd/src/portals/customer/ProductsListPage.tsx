import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';
import { Seo } from '@/components/Seo';

interface Category { categoryid: number; categoryname: string; }
interface Brand { brandid: number; brandname: string; }

type SortOption = 'default' | 'newest' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';

const getProductPrice = (product: Product) => {
  const variant = product.productvariants?.[0];
  return variant ? variant.saleprice ?? variant.baseprice : Number.POSITIVE_INFINITY;
};

const parseNumberParam = (value: string | null) => {
  if (!value) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : undefined;
};

const getCreatedTime = (product: Product) => {
  if (!product.createdat) return 0;
  const time = new Date(product.createdat).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const ProductsListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const categoryId = parseNumberParam(searchParams.get('categoryId'));
  const brandId = parseNumberParam(searchParams.get('brandId'));
  const seriesId = parseNumberParam(searchParams.get('seriesId'));
  const minPrice = parseNumberParam(searchParams.get('minPrice'));
  const maxPrice = parseNumberParam(searchParams.get('maxPrice'));
  const sortBy = (searchParams.get('sort') as SortOption | null) ?? 'default';

  useEffect(() => {
    const fetchFilters = async () => {
      const [catRes, brandRes] = await Promise.all([
        apiClient.get<Category[]>('/Categories'),
        apiClient.get<Brand[]>('/Brands'),
      ]);
      setCategories(catRes.data);
      setBrands(brandRes.data);
    };
    fetchFilters().catch(console.error);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await productsApi.getAll();
        setAllProducts(res.data);
      } catch {
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    let result = [...allProducts];

    if (categoryId) result = result.filter(product => product.category?.id === categoryId);
    if (brandId) result = result.filter(product => product.brand?.id === brandId);
    if (seriesId) result = result.filter(product => product.series?.id === seriesId);
    if (minPrice != null) result = result.filter(product => getProductPrice(product) >= minPrice);
    if (maxPrice != null) result = result.filter(product => getProductPrice(product) <= maxPrice);
    if (sortBy === 'newest') {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      result = result.filter(product => getCreatedTime(product) >= twoMonthsAgo.getTime());
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return getCreatedTime(b) - getCreatedTime(a);
        case 'price-asc':
          return getProductPrice(a) - getProductPrice(b);
        case 'price-desc':
          return getProductPrice(b) - getProductPrice(a);
        case 'name-asc':
          return a.productname.localeCompare(b.productname, 'vi');
        case 'name-desc':
          return b.productname.localeCompare(a.productname, 'vi');
        default:
          return a.productid - b.productid;
      }
    });

    return result;
  }, [allProducts, brandId, categoryId, maxPrice, minPrice, seriesId, sortBy]);

  const activeCategory = useMemo(
    () => categories.find(category => category.categoryid === categoryId),
    [categories, categoryId],
  );
  const activeBrand = useMemo(
    () => brands.find(brand => brand.brandid === brandId),
    [brands, brandId],
  );

  const setFilter = (key: string, value: string | undefined) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const clearFilters = () => setSearchParams({});
  const hasFilter = !!(categoryId || brandId || seriesId || minPrice != null || maxPrice != null || sortBy !== 'default');

  return (
    <div className="customer-shell min-h-screen pb-16">
      <Seo
        title="Tất cả sản phẩm - Cuồng Điện Thoại"
        description="Danh sách smartphone tại Cuồng Điện Thoại, lọc theo danh mục, thương hiệu, dòng máy, giá bán và sắp xếp theo nhu cầu."
        canonicalPath="/products"
      />
      <section className="border-b customer-rule bg-white px-3 py-3 sm:px-4 sm:py-4">
        <div className="customer-container">
          {hasFilter && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="text-slate-500">Bộ lọc:</span>
              {activeCategory && (
                <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[#1f2937]">
                  {activeCategory.categoryname}
                </span>
              )}
              {activeBrand && (
                <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[#1f2937]">
                  {activeBrand.brandname}
                </span>
              )}
              {seriesId && (
                <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[#1f2937]">
                  Dòng #{seriesId}
                </span>
              )}
              {minPrice != null && (
                <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[#1f2937]">
                  Từ {minPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
              {maxPrice != null && (
                <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[#1f2937]">
                  Đến {maxPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
              {sortBy !== 'default' && (
                <span className="rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[#1f2937]">
                  Đã sắp xếp
                </span>
              )}
              <button type="button" onClick={clearFilters} className="ml-1 inline-flex items-center gap-1 text-[#c4000b]">
                <X size={13} /> Xóa lọc
              </button>
            </div>
          )}

          {!hasFilter && (
            <div className="flex items-center justify-between gap-3 text-sm font-bold text-slate-500">
              <span>{loading ? 'Đang tải sản phẩm...' : `${filteredProducts.length} sản phẩm đang hiển thị`}</span>
              <button
                type="button"
                onClick={() => setShowFilter(prev => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#1f2937] transition hover:border-[#e30613] hover:text-[#c4000b] lg:hidden"
              >
                <SlidersHorizontal size={15} /> Bộ lọc
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="customer-container grid gap-5 px-3 py-5 sm:px-4 sm:py-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <button
            type="button"
            onClick={() => setShowFilter(prev => !prev)}
            className="customer-button-outline mb-3 w-full lg:hidden"
          >
            <SlidersHorizontal size={15} /> Bộ lọc
          </button>

          <div className={`${showFilter ? 'block' : 'hidden'} customer-panel p-4 sm:p-5 lg:block`}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#1f2937]">Tinh chỉnh kết quả</h2>
                </div>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Danh mục
                  </span>
                  <select
                    value={categoryId ?? ''}
                    onChange={event => setFilter('categoryId', event.target.value || undefined)}
                    className="customer-input"
                  >
                    <option value="">Tất cả danh mục</option>
                    {categories.map(category => (
                      <option key={category.categoryid} value={category.categoryid}>
                        {category.categoryname}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Thương hiệu
                  </span>
                  <select
                    value={brandId ?? ''}
                    onChange={event => setFilter('brandId', event.target.value || undefined)}
                    className="customer-input"
                  >
                    <option value="">Tất cả thương hiệu</option>
                    {brands.map(brand => (
                      <option key={brand.brandid} value={brand.brandid}>
                        {brand.brandname}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Sắp xếp
                  </span>
                  <select
                    value={sortBy}
                    onChange={event => setFilter('sort', event.target.value === 'default' ? undefined : event.target.value)}
                    className="customer-input"
                  >
                    <option value="default">Mặc định</option>
                    <option value="newest">Máy mới lên kệ</option>
                    <option value="price-asc">Giá thấp đến cao</option>
                    <option value="price-desc">Giá cao đến thấp</option>
                    <option value="name-asc">Tên A-Z</option>
                    <option value="name-desc">Tên Z-A</option>
                  </select>
                </label>

                <div>
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Khoảng giá
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={0}
                      value={minPrice ?? ''}
                      onChange={event => setFilter('minPrice', event.target.value || undefined)}
                      placeholder="Từ"
                      className="customer-input"
                    />
                    <input
                      type="number"
                      min={0}
                      value={maxPrice ?? ''}
                      onChange={event => setFilter('maxPrice', event.target.value || undefined)}
                      placeholder="Đến"
                      className="customer-input"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { label: 'Dưới 10tr', max: '10000000' },
                      { label: '10-20tr', min: '10000000', max: '20000000' },
                      { label: '20-30tr', min: '20000000', max: '30000000' },
                      { label: 'Trên 30tr', min: '30000000' },
                    ].map(range => (
                      <button
                        key={range.label}
                        type="button"
                        onClick={() => {
                          setSearchParams(prev => {
                            const next = new URLSearchParams(prev);
                            if (range.min) next.set('minPrice', range.min);
                            else next.delete('minPrice');
                            if (range.max) next.set('maxPrice', range.max);
                            else next.delete('maxPrice');
                            return next;
                          });
                        }}
                        className="rounded-full border border-[#e5e7eb] bg-white px-3 py-2 text-[11px] font-black text-[#1f2937] transition hover:border-[#e30613] hover:text-[#c4000b]"
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                </div>

                {hasFilter && (
                  <button type="button" onClick={clearFilters} className="customer-button-outline w-full">
                    <X size={14} /> Xóa tất cả bộ lọc
                  </button>
                )}
              </div>
          </div>
        </aside>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="customer-panel p-4">
                  <Skeleton className="mb-3 aspect-square w-full" />
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="customer-panel-soft px-5 py-14 text-center sm:px-6 sm:py-20">
              <Search className="mx-auto mb-5 text-[#1f2937]/25" size={54} />
              <h2 className="customer-display text-3xl font-bold text-[#1f2937]">
                Chưa có sản phẩm phù hợp
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                Hãy thử bỏ bớt bộ lọc hoặc quay về toàn bộ danh mục để xem thêm lựa chọn.
              </p>
              <button type="button" onClick={clearFilters} className="customer-button-dark mt-6">
                Xem tất cả <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map(product => (
                <ProductCard key={product.productid} product={product} compact />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductsListPage;
