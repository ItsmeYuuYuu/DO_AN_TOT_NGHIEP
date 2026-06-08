import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BadgeCheck,
  Headphones,
  MessageCircleMore,
  RefreshCcw,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import { productsApi } from '@/features/products/api/productsApi';
import type { FullProductDetail, FullProductVariant } from '@/features/products/api/productsApi';
import { ProductGallery } from '@/features/products/components/ProductGallery';
import { ProductPurchasePanel } from '@/features/products/components/ProductPurchasePanel';
import { ProductSpecsTable } from '@/features/products/components/ProductSpecsTable';
import { ProductReviewSummary } from '@/features/products/components/ProductReviewSummary';
import { RelatedProducts } from '@/features/products/components/RelatedProducts';
import { formatCurrency } from '@/utils/formatters';

type DetailTab = 'description' | 'specs' | 'reviews';

const renderDescription = (description: string) => {
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const blocks: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = imagePattern.exec(description)) !== null) {
    const text = description.slice(cursor, match.index).trim();
    if (text) {
      blocks.push(
        <p key={`text-${cursor}`} className="whitespace-pre-line leading-8 text-slate-700">
          {text}
        </p>,
      );
    }

    blocks.push(
      <figure key={`image-${match.index}`} className="my-7 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <img src={match[2]} alt={match[1] || 'Hình ảnh sản phẩm'} className="mx-auto max-h-[680px] w-full object-contain" />
        {match[1] && match[1] !== 'Hình ảnh' && (
          <figcaption className="border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-500">
            {match[1]}
          </figcaption>
        )}
      </figure>,
    );
    cursor = imagePattern.lastIndex;
  }

  const remainingText = description.slice(cursor).trim();
  if (remainingText) {
    blocks.push(
      <p key={`text-${cursor}`} className="whitespace-pre-line leading-8 text-slate-700">
        {remainingText}
      </p>,
    );
  }

  return blocks;
};

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<FullProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<FullProductVariant | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('description');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productsApi.getFullDetail(Number(id))
      .then(res => {
        setProduct(res.data);
        if (res.data.productvariants && res.data.productvariants.length > 0) {
          setSelectedVariant(
            res.data.productvariants.find(variant => (variant.stockquantity ?? 0) > 0)
              ?? res.data.productvariants[0],
          );
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-12">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-[500px] rounded-2xl bg-slate-200 lg:col-span-5" />
        <div className="space-y-4 lg:col-span-4">
          <div className="h-8 w-3/4 rounded bg-slate-200" />
          <div className="h-24 rounded bg-slate-200" />
          <div className="h-64 rounded bg-slate-200" />
        </div>
        <div className="h-[420px] rounded-2xl bg-slate-200 lg:col-span-3" />
      </div>
    </div>
  );

  if (!product) return null;

  const variantImages = selectedVariant?.productimages?.length
    ? selectedVariant.productimages
    : [];
  const rating = product.reviewSummary?.avgRating ?? 0;
  const stock = selectedVariant?.stockquantity ?? 0;
  const currentPrice = selectedVariant?.saleprice ?? selectedVariant?.baseprice ?? 0;

  const askAi = () => {
    const variantDetails = selectedVariant?.attributes
      ?.map(attribute => `${attribute.attributename} ${attribute.valuename}`)
      .join(', ');
    const question = `Tư vấn giúp tôi sản phẩm ${product.productname}${variantDetails ? ` phiên bản ${variantDetails}` : ''}. Sản phẩm này phù hợp với nhu cầu nào và có lựa chọn nào đáng cân nhắc?`;
    navigate(`/chat?q=${encodeURIComponent(question)}`);
  };

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'description', label: 'Mô tả sản phẩm' },
    { id: 'specs', label: 'Thông số kỹ thuật' },
    { id: 'reviews', label: `Đánh giá (${product.reviewSummary?.totalReviews ?? 0})` },
  ];

  return (
    <div className="bg-slate-50 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-8">
        <nav className="mb-5 flex items-center gap-2 overflow-hidden text-sm text-slate-500">
          <Link to="/" className="shrink-0 hover:text-blue-600">Trang chủ</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link to={`/search?categoryId=${product.category.id}`} className="shrink-0 hover:text-blue-600">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="truncate font-semibold text-slate-800">{product.productname}</span>
        </nav>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 md:px-7">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {product.brand && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                      {product.brand.name}
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}
                  </span>
                </div>
                <h1 className="text-2xl font-black leading-tight text-slate-900 md:text-3xl">
                  {product.productname}
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="flex shrink-0 items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
              >
                <span className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map(value => (
                    <Star key={value} size={16} className={value <= Math.round(rating) ? 'fill-current' : 'text-slate-300'} />
                  ))}
                </span>
                {rating.toFixed(1)} · {product.reviewSummary?.totalReviews ?? 0} đánh giá
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-0 lg:grid-cols-12">
            <div className="border-b border-slate-200 p-5 md:p-7 lg:col-span-5 lg:border-b-0 lg:border-r">
              <ProductGallery productName={product.productname} images={variantImages} />
            </div>

            <div id="purchase-options" className="border-b border-slate-200 p-5 md:p-7 lg:col-span-4 lg:border-b-0 lg:border-r">
              <ProductPurchasePanel
                productId={product.productid}
                productName={product.productname}
                variants={product.productvariants || []}
                selectedVariant={selectedVariant}
                onSelectVariant={setSelectedVariant}
              />
            </div>

            <aside className="space-y-5 p-5 md:p-7 lg:col-span-3">
              <div>
                <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-slate-900">
                  Quyền lợi mua hàng
                </h2>
                <div className="space-y-4">
                  {[
                    { icon: ShieldCheck, title: 'Bảo hành rõ ràng', text: 'Áp dụng theo chính sách của từng sản phẩm.' },
                    { icon: RefreshCcw, title: 'Hỗ trợ đổi trả', text: 'Nhân viên tiếp nhận và kiểm tra theo chính sách cửa hàng.' },
                    { icon: Truck, title: 'Giao hàng toàn quốc', text: 'Theo dõi trạng thái đơn hàng ngay trên tài khoản.' },
                    { icon: Headphones, title: 'Tư vấn trực tiếp', text: 'Có thể chuyển từ AI sang nhân viên khi cần.' },
                  ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-blue-700 to-slate-900 p-5 text-white">
                <MessageCircleMore size={26} className="mb-3 text-blue-200" />
                <p className="text-xs font-bold uppercase tracking-wider text-blue-200">Trợ lý mua sắm AI</p>
                <h3 className="mt-1 text-lg font-black">Chưa chắc sản phẩm này phù hợp?</h3>
                <p className="mt-2 text-xs leading-5 text-blue-100">
                  Hỏi AI để phân tích cấu hình, nhu cầu sử dụng hoặc so sánh với sản phẩm khác.
                </p>
                <button
                  type="button"
                  onClick={askAi}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-black text-blue-700 hover:bg-blue-50"
                >
                  <MessageCircleMore size={17} /> Hỏi AI về sản phẩm
                </button>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <BadgeCheck className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                <div>
                  <p className="text-sm font-bold text-emerald-800">Giá theo đúng phiên bản</p>
                  <p className="mt-1 text-xs text-emerald-700">
                    Phiên bản đang chọn có giá {formatCurrency(currentPrice)}.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 md:px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 border-b-2 px-5 py-4 text-sm font-bold transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 bg-white text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-5 md:p-8">
            {activeTab === 'description' && (
              <div className="mx-auto max-w-4xl">
                <h2 className="mb-6 text-2xl font-black text-slate-900">{product.productname}</h2>
                {product.description
                  ? <div className="space-y-5">{renderDescription(product.description)}</div>
                  : <p className="italic text-slate-400">Đang cập nhật mô tả sản phẩm...</p>}
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="mx-auto max-w-4xl">
                <ProductSpecsTable attributes={selectedVariant?.attributes} />
              </div>
            )}

            {activeTab === 'reviews' && (
              <ProductReviewSummary
                productId={product.productid}
                summary={product.reviewSummary}
                variantId={selectedVariant?.variantid}
              />
            )}
          </div>
        </section>

        <RelatedProducts products={product.relatedProducts} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-slate-500">{product.productname}</p>
          <p className="font-black text-red-600">{formatCurrency(currentPrice)}</p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById('purchase-options')?.scrollIntoView({ behavior: 'smooth' })}
          className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white"
        >
          Chọn mua
        </button>
      </div>
    </div>
  );
};

export default ProductDetailPage;
