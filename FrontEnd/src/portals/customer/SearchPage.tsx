import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';
import { Search, X, ArrowRight } from 'lucide-react';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setQuery(q);
    if (q.trim().length >= 2) {
      doSearch(q.trim());
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [searchParams]);

  const doSearch = async (q: string) => {
    setLoading(true);
    setSearched(true);
    try {
      const res = await productsApi.search({ q });
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = window.setTimeout(() => {
      setSearchParams(value.trim() ? { q: value.trim() } : {});
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) setSearchParams({ q: query.trim() });
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setSearchParams({});
    inputRef.current?.focus();
  };

  const suggestions = ['iPhone 15', 'Samsung', 'iPad', 'AirPods', 'Apple Watch'];

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Search Bar Hero */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <h1 className="text-2xl font-black text-slate-800 text-center mb-6">Tìm kiếm sản phẩm</h1>
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              ref={inputRef}
              type="text"
              id="search-input"
              value={query}
              onChange={e => handleInputChange(e.target.value)}
              placeholder="Nhập tên sản phẩm, thương hiệu..."
              className="w-full pl-12 pr-12 py-4 border-2 border-slate-200 focus:border-blue-500 rounded-2xl text-base font-medium outline-none transition-colors bg-slate-50 focus:bg-white"
            />
            {query && (
              <button type="button" onClick={clearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            )}
          </form>

          {/* Suggestions */}
          {!query && (
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              <span className="text-xs text-slate-400 font-medium mr-1 self-center">Gợi ý:</span>
              {suggestions.map(s => (
                <button key={s}
                  onClick={() => { setQuery(s); setSearchParams({ q: s }); }}
                  className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-full hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  {s} <ArrowRight size={11} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <>
            <p className="text-sm text-slate-400 font-medium mb-4">Đang tìm kiếm...</p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <Skeleton className="w-full aspect-square mb-3" />
                  <Skeleton className="w-3/4 h-4 mb-2" />
                  <Skeleton className="w-1/2 h-5" />
                </div>
              ))}
            </div>
          </>
        ) : searched && results.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-slate-600 mb-2">Không tìm thấy "{query}"</h2>
            <p className="text-slate-400 text-sm mb-6">Hãy thử từ khóa khác hoặc xem tất cả sản phẩm</p>
            <Link to="/products"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
              Xem tất cả sản phẩm <ArrowRight size={16} />
            </Link>
          </div>
        ) : results.length > 0 ? (
          <>
            <p className="text-sm text-slate-500 font-medium mb-5">
              Tìm thấy <span className="text-blue-600 font-black">{results.length}</span> sản phẩm cho "{query}"
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {results.map(p => (
                <ProductCard key={p.productid} product={p} />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🛍️</div>
            <p className="text-slate-400 font-medium">Nhập từ khóa để tìm kiếm sản phẩm</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
