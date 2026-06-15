import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';
import { ArrowRight, SearchX } from 'lucide-react';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const query = searchParams.get('q')?.trim() ?? '';

  useEffect(() => {
    if (query.length >= 2) {
      doSearch(query);
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [query]);

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

  return (
    <div className="min-h-screen bg-[#f4f0e8]">
      <div className="border-b border-[#d9d2c5] bg-[#fffdf8]">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <p className="customer-label">Danh mục sản phẩm</p>
          <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <h1 className="customer-display text-3xl font-bold text-[#10233f]">
              Kết quả tìm kiếm
            </h1>
            {query && !loading && (
              <p className="text-sm font-medium text-slate-500">
                <span className="font-black text-[#db3d1c]">{results.length}</span> sản phẩm cho “{query}”
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8">
        {loading ? (
          <>
            <p className="mb-4 text-sm font-medium text-slate-500">Đang tìm kiếm...</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="border border-[#d9d2c5] bg-[#fffdf8] p-4">
                  <Skeleton className="mb-3 aspect-square w-full" />
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ))}
            </div>
          </>
        ) : searched && results.length === 0 ? (
          <div className="border border-[#d9d2c5] bg-[#fffdf8] py-20 text-center">
            <SearchX className="mx-auto mb-5 text-[#10233f]/30" size={52} />
            <h2 className="customer-display mb-2 text-2xl font-bold text-[#10233f]">
              Không tìm thấy “{query}”
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              Hãy sửa từ khóa ở ô tìm kiếm phía trên hoặc xem toàn bộ sản phẩm.
            </p>
            <Link to="/products"
              className="inline-flex items-center gap-2 bg-[#10233f] px-6 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-[#db3d1c]">
              Xem tất cả sản phẩm <ArrowRight size={16} />
            </Link>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
            {results.map(p => (
              <ProductCard key={p.productid} product={p} />
            ))}
          </div>
        ) : (
          <div className="border border-[#d9d2c5] bg-[#fffdf8] py-20 text-center">
            <p className="font-medium text-slate-500">
              Nhập tên sản phẩm, thương hiệu hoặc dòng máy ở ô tìm kiếm phía trên.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
