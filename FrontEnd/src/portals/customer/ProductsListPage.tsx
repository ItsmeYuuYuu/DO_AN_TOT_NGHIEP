import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';

interface Category { categoryid: number; categoryname: string; }
interface Brand { brandid: number; brandname: string; }

const ProductsListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(true);

  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined;
  const brandId = searchParams.get('brandId') ? Number(searchParams.get('brandId')) : undefined;
  const seriesId = searchParams.get('seriesId') ? Number(searchParams.get('seriesId')) : undefined;

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
        let filtered = res.data;
        if (categoryId) filtered = filtered.filter(p => p.category?.id === categoryId);
        if (brandId) filtered = filtered.filter(p => p.brand?.id === brandId);
        if (seriesId) filtered = filtered.filter(p => p.series?.id === seriesId);
        setProducts(filtered);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [categoryId, brandId, seriesId]);

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
  const hasFilter = !!(categoryId || brandId || seriesId);

  return (
    <div className="customer-shell min-h-screen pb-16">
      <section className="border-b customer-rule bg-[#fffdf8] px-4 py-8 md:py-10">
        <div className="customer-container">
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.8fr] lg:items-end">
            <div>
              <p className="customer-label">Catalog</p>
              <h1 className="customer-display mt-2 text-4xl font-bold leading-tight text-[#10233f] md:text-5xl">
                Tất cả sản phẩm
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Lọc theo danh mục, thương hiệu hoặc dòng máy để tìm nhanh thiết bị phù hợp với nhu cầu.
              </p>
            </div>

            <div className="customer-panel-soft p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#db3d1c]">
                    Đang hiển thị
                  </p>
                  <p className="customer-display mt-1 text-3xl font-bold text-[#10233f]">
                    {loading ? '...' : products.length}
                    <span className="ml-2 text-base font-black">sản phẩm</span>
                  </p>
                </div>
                <Link to="/search" className="customer-button-dark">
                  <Search size={15} /> Tìm máy
                </Link>
              </div>
            </div>
          </div>

          {(activeCategory || activeBrand || seriesId) && (
            <div className="mt-6 flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="text-slate-500">Bộ lọc:</span>
              {activeCategory && (
                <span className="border border-[#d9d2c5] bg-white px-3 py-1.5 text-[#10233f]">
                  {activeCategory.categoryname}
                </span>
              )}
              {activeBrand && (
                <span className="border border-[#d9d2c5] bg-white px-3 py-1.5 text-[#10233f]">
                  {activeBrand.brandname}
                </span>
              )}
              {seriesId && (
                <span className="border border-[#d9d2c5] bg-white px-3 py-1.5 text-[#10233f]">
                  Dòng #{seriesId}
                </span>
              )}
              <button type="button" onClick={clearFilters} className="ml-1 inline-flex items-center gap-1 text-[#db3d1c]">
                <X size={13} /> Xóa lọc
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="customer-container grid gap-6 px-4 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <button
            type="button"
            onClick={() => setShowFilter(prev => !prev)}
            className="customer-button-outline mb-3 w-full lg:hidden"
          >
            <SlidersHorizontal size={15} /> Bộ lọc
          </button>

          {showFilter && (
            <div className="customer-panel p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="customer-label">Filter</p>
                  <h2 className="mt-1 text-lg font-black text-[#10233f]">Tinh chỉnh kết quả</h2>
                </div>
                <Filter className="text-[#db3d1c]" size={20} />
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    Danh mục
                  </span>
                  <select
                    value={categoryId ?? ''}
                    onChange={e => setFilter('categoryId', e.target.value || undefined)}
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
                    onChange={e => setFilter('brandId', e.target.value || undefined)}
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

                {hasFilter && (
                  <button type="button" onClick={clearFilters} className="customer-button-outline w-full">
                    <X size={14} /> Xóa tất cả bộ lọc
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="customer-panel p-4">
                  <Skeleton className="mb-3 aspect-square w-full" />
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="customer-panel-soft px-6 py-20 text-center">
              <Search className="mx-auto mb-5 text-[#10233f]/25" size={54} />
              <h2 className="customer-display text-3xl font-bold text-[#10233f]">
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
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {products.map(product => (
                <ProductCard key={product.productid} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProductsListPage;
