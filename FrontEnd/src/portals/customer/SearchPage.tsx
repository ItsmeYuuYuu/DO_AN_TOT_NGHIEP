import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, SearchCheck, SearchX } from 'lucide-react';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { ProductCard } from '@/features/products/components/ProductCard';
import { Skeleton } from '@/components/Skeleton';
import { Seo } from '@/components/Seo';

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const query = searchParams.get('q')?.trim() ?? '';

  useEffect(() => {
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

    if (query.length >= 2) {
      void doSearch(query);
    } else {
      setResults([]);
      setSearched(false);
    }
  }, [query]);

  return (
    <div className="customer-shell min-h-screen pb-16">
      <Seo
        title={query ? `Tìm kiếm "${query}" - Cuồng Điện Thoại` : 'Tìm kiếm sản phẩm - Cuồng Điện Thoại'}
        description="Trang kết quả tìm kiếm sản phẩm nội bộ của Cuồng Điện Thoại."
        noIndex
      />
      <section className="border-b customer-rule bg-[#ffffff] px-4 py-8 md:py-10">
        <div className="customer-container">
          <div>
            <h1 className="customer-display mt-2 text-4xl font-bold leading-tight text-[#1f2937] md:text-5xl">
              Kết quả tìm kiếm
            </h1>
          </div>

          {query && !loading && (
            <p className="mt-6 text-sm font-medium text-slate-500">
              Tìm thấy <span className="font-black text-[#c4000b]">{results.length}</span> sản phẩm cho “{query}”.
            </p>
          )}
        </div>
      </section>

      <main className="customer-container px-4 py-8">
        {loading ? (
          <>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
              Đang lọc dữ liệu sản phẩm...
            </p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="customer-panel p-4">
                  <Skeleton className="mb-3 aspect-square w-full" />
                  <Skeleton className="mb-2 h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              ))}
            </div>
          </>
        ) : searched && results.length === 0 ? (
          <div className="customer-panel-soft px-6 py-20 text-center">
            <SearchX className="mx-auto mb-5 text-[#1f2937]/30" size={54} />
            <h2 className="customer-display text-3xl font-bold text-[#1f2937]">
              Không tìm thấy “{query}”
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Hãy sửa từ khóa ở ô tìm kiếm phía trên, thử tên hãng hoặc để AI tư vấn theo nhu cầu sử dụng.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/products" className="customer-button-dark">
                Xem tất cả sản phẩm <ArrowRight size={15} />
              </Link>
              <Link to="/chat" className="customer-button-outline">
                Hỏi AI tư vấn
              </Link>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {results.map(product => (
              <ProductCard key={product.productid} product={product} />
            ))}
          </div>
        ) : (
          <div className="customer-panel-soft px-6 py-20 text-center">
            <SearchCheck className="mx-auto mb-5 text-[#1f2937]/25" size={54} />
            <h2 className="customer-display text-3xl font-bold text-[#1f2937]">
              Sẵn sàng tìm máy
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
              Nhập tên sản phẩm, thương hiệu hoặc dòng máy ở ô tìm kiếm phía trên để bắt đầu.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default SearchPage;
