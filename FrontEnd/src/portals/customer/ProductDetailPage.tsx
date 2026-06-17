import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck,
  ChevronRight,
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
        <p key={`text-${cursor}`} className="whitespace-pre-line text-[15px] leading-8 text-slate-700">
          {text}
        </p>,
      );
    }

    blocks.push(
      <figure key={`image-${match.index}`} className="my-7 overflow-hidden border border-[#d9d2c5] bg-[#f4f0e8]">
        <img src={match[2]} alt={match[1] || 'Hình ảnh sản phẩm'} className="mx-auto max-h-[680px] w-full object-contain" />
        {match[1] && match[1] !== 'Hình ảnh' && (
          <figcaption className="border-t border-[#d9d2c5] px-4 py-2 text-center text-xs text-slate-500">
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
      <p key={`text-${cursor}`} className="whitespace-pre-line text-[15px] leading-8 text-slate-700">
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

  if (loading) {
    return (
      <div className="customer-shell min-h-screen px-4 py-10">
        <div className="customer-container animate-pulse">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="h-[520px] bg-[#fffdf8] lg:col-span-5" />
            <div className="space-y-4 lg:col-span-4">
              <div className="h-10 w-3/4 bg-[#fffdf8]" />
              <div className="h-28 bg-[#fffdf8]" />
              <div className="h-72 bg-[#fffdf8]" />
            </div>
            <div className="h-[430px] bg-[#fffdf8] lg:col-span-3" />
          </div>
        </div>
      </div>
    );
  }

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
    <div className="customer-shell pb-20">
      <div className="customer-container px-4 py-6 md:py-8">
        <nav className="mb-5 flex items-center gap-2 overflow-hidden text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          <Link to="/" className="shrink-0 hover:text-[#db3d1c]">Trang chủ</Link>
          <ChevronRight size={13} />
          {product.category && (
            <>
              <Link to={`/products?categoryId=${product.category.id}`} className="shrink-0 hover:text-[#db3d1c]">
                {product.category.name}
              </Link>
              <ChevronRight size={13} />
            </>
          )}
          <span className="truncate text-[#10233f]">{product.productname}</span>
        </nav>

        <section className="customer-panel overflow-hidden">
          <div className="border-b border-[#d9d2c5] bg-[#fffdf8] px-5 py-5 md:px-7">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {product.brand && (
                    <span className="border border-[#d9d2c5] bg-[#f4f0e8] px-3 py-1 text-xs font-black text-[#10233f]">
                      {product.brand.name}
                    </span>
                  )}
                  {product.series && (
                    <span className="border border-[#ff5b35]/25 bg-[#ff5b35]/10 px-3 py-1 text-xs font-black text-[#db3d1c]">
                      {product.series.name}
                    </span>
                  )}
                  <span className={`px-3 py-1 text-xs font-black ${
                    stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}
                  </span>
                </div>
                <h1 className="customer-display max-w-3xl text-3xl font-bold leading-tight text-[#10233f] md:text-5xl">
                  {product.productname}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="flex shrink-0 items-center gap-2 border border-[#d9d2c5] bg-white px-4 py-3 text-sm font-bold text-[#10233f] hover:border-[#10233f]"
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

          <div className="grid grid-cols-1 lg:grid-cols-12">
            <div className="border-b border-[#d9d2c5] bg-white p-5 md:p-7 lg:col-span-5 lg:border-b-0 lg:border-r">
              <ProductGallery productName={product.productname} images={variantImages} />
            </div>

            <div id="purchase-options" className="border-b border-[#d9d2c5] bg-[#fffdf8] p-5 md:p-7 lg:col-span-4 lg:border-b-0 lg:border-r">
              <ProductPurchasePanel
                productId={product.productid}
                productName={product.productname}
                variants={product.productvariants || []}
                selectedVariant={selectedVariant}
                onSelectVariant={setSelectedVariant}
              />
            </div>

            <aside className="space-y-5 bg-white p-5 md:p-7 lg:col-span-3">
              <div>
                <p className="customer-label">Cam kết mua hàng</p>
                <div className="mt-5 space-y-4">
                  {[
                    { icon: ShieldCheck, title: 'Bảo hành rõ ràng', text: 'Áp dụng theo chính sách của từng sản phẩm.' },
                    { icon: RefreshCcw, title: 'Hỗ trợ đổi trả', text: 'Tiếp nhận và kiểm tra theo lịch sử đơn hàng, IMEI.' },
                    { icon: Truck, title: 'Theo dõi giao hàng', text: 'Cập nhật trạng thái vận chuyển ngay trong hệ thống.' },
                    { icon: Headphones, title: 'Tư vấn trực tiếp', text: 'Có thể chuyển từ AI sang nhân viên khi cần.' },
                  ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-[#10233f] text-[#75d7dc]">
                        <Icon size={19} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#10233f]">{title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#10233f] p-5 text-white shadow-[6px_6px_0_rgba(255,91,53,0.45)]">
                <MessageCircleMore size={26} className="mb-3 text-[#75d7dc]" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#75d7dc]">Trợ lý mua sắm AI</p>
                <h3 className="customer-display mt-2 text-2xl font-bold leading-tight">
                  Chưa chắc máy này phù hợp?
                </h3>
                <p className="mt-3 text-xs leading-5 text-white/65">
                  Hỏi AI để phân tích cấu hình, nhu cầu sử dụng hoặc so sánh với sản phẩm khác.
                </p>
                <button
                  type="button"
                  onClick={askAi}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#10233f] hover:bg-[#75d7dc]"
                >
                  <MessageCircleMore size={16} /> Hỏi AI về sản phẩm
                </button>
              </div>

              <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 p-4">
                <BadgeCheck className="mt-0.5 shrink-0 text-emerald-700" size={20} />
                <div>
                  <p className="text-sm font-black text-emerald-900">Giá theo đúng phiên bản</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-700">
                    Phiên bản đang chọn có giá {formatCurrency(currentPrice)}.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="customer-panel mt-8 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-[#d9d2c5] bg-[#fffdf8] px-3 md:px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 border-b-4 px-5 py-4 text-sm font-black transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#ff5b35] bg-white text-[#10233f]'
                    : 'border-transparent text-slate-500 hover:text-[#10233f]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white p-5 md:p-8">
            {activeTab === 'description' && (
              <div className="mx-auto max-w-4xl">
                <p className="customer-label">Product story</p>
                <h2 className="customer-display mt-2 mb-6 text-3xl font-bold text-[#10233f]">
                  {product.productname}
                </h2>
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

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-[#d9d2c5] bg-[#fffdf8] p-3 shadow-[0_-8px_30px_rgba(16,35,63,0.12)] lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-slate-500">{product.productname}</p>
          <p className="font-black text-[#db3d1c]">{formatCurrency(currentPrice)}</p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById('purchase-options')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-[#10233f] px-5 py-3 text-sm font-black text-white"
        >
          Chọn mua
        </button>
      </div>
    </div>
  );
};

export default ProductDetailPage;
