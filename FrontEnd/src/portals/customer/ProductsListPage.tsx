import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import apiClient from '@/api/apiClient';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';
import { Search, SlidersHorizontal, X } from 'lucide-react';

interface Category { categoryid: number; categoryname: string; }
interface Brand { brandid: number; brandname: string; }

const ProductsListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const categoryId = searchParams.get('categoryId') ? Number(searchParams.get('categoryId')) : undefined;
  const brandId = searchParams.get('brandId') ? Number(searchParams.get('brandId')) : undefined;

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
        if (categoryId) filtered = filtered.filter(p => p.category?.categoryid === categoryId);
        if (brandId) filtered = filtered.filter(p => p.brand?.brandid === brandId);
        setProducts(filtered);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [categoryId, brandId]);

  const setFilter = (key: string, value: string | undefined) => {
    setSearchParams(prev => {
      if (value) prev.set(key, value);
      else prev.delete(key);
      return prev;
    });
  };

  const clearFilters = () => setSearchParams({});
  const hasFilter = !!(categoryId || brandId);

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Tất cả sản phẩm</h1>
            <p className="text-xs text-slate-400">{loading ? '...' : `${products.length} sản phẩm`}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/search"
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm font-medium transition-colors"
            >
              <Search size={15} /> Tìm kiếm
            </Link>
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                showFilter || hasFilter ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <SlidersHorizontal size={15} /> Lọc
              {hasFilter && <span className="bg-white text-blue-600 text-[10px] font-black px-1.5 rounded-full">!</span>}
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilter && (
          <div className="max-w-7xl mx-auto px-4 pb-4 flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Danh mục:</span>
              <select
                value={categoryId ?? ''}
                onChange={e => setFilter('categoryId', e.target.value || undefined)}
                className="border border-slate-200 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400"
              >
                <option value="">Tất cả</option>
                {categories.map(c => (
                  <option key={c.categoryid} value={c.categoryid}>{c.categoryname}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase">Thương hiệu:</span>
              <select
                value={brandId ?? ''}
                onChange={e => setFilter('brandId', e.target.value || undefined)}
                className="border border-slate-200 rounded-lg text-sm px-3 py-1.5 bg-white focus:outline-none focus:border-blue-400"
              >
                <option value="">Tất cả</option>
                {brands.map(b => (
                  <option key={b.brandid} value={b.brandid}>{b.brandname}</option>
                ))}
              </select>
            </div>
            {hasFilter && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 font-bold hover:text-red-700">
                <X size={12} /> Xóa bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <Skeleton className="w-full aspect-square mb-3" />
                <Skeleton className="w-3/4 h-4 mb-2" />
                <Skeleton className="w-1/2 h-5" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-bold text-slate-600 mb-2">Không tìm thấy sản phẩm</h2>
            <p className="text-slate-400 text-sm mb-6">Hãy thử thay đổi bộ lọc hoặc xem tất cả sản phẩm</p>
            <button onClick={clearFilters} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
              Xem tất cả
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map(p => (
              <ProductCard key={p.productid} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductsListPage;
