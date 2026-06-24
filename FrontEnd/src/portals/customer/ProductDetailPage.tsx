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
      <figure key={`image-${match.index}`} className="my-7 overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-[#f3f4f6]">
        <img src={match[2]} alt={match[1] || 'Hình ảnh sản phẩm'} className="mx-auto max-h-[680px] w-full object-contain" />
        {match[1] && match[1] !== 'Hình ảnh' && (
          <figcaption className="border-t border-[#e5e7eb] px-4 py-2 text-center text-xs text-slate-500">
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
    productsApi.getFullDetail(id)
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
            <div className="h-[520px] rounded-[28px] bg-white lg:col-span-5" />
            <div className="space-y-4 lg:col-span-4">
              <div className="h-10 w-3/4 rounded-full bg-white" />
              <div className="h-28 rounded-[24px] bg-white" />
              <div className="h-72 rounded-[24px] bg-white" />
            </div>
            <div className="h-[430px] rounded-[28px] bg-white lg:col-span-3" />
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
    <div className="customer-shell pb-28 lg:pb-20">
      <div className="customer-container px-3 py-5 sm:px-4 md:py-8">
        <nav className="mb-5 flex items-center gap-2 overflow-hidden text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          <Link to="/" className="shrink-0 hover:text-[#c4000b]">Trang chủ</Link>
          <ChevronRight size={13} />
          {product.category && (
            <>
              <Link to={`/products?categoryId=${product.category.id}`} className="shrink-0 hover:text-[#c4000b]">
                {product.category.name}
              </Link>
              <ChevronRight size={13} />
            </>
          )}
          <span className="truncate text-[#1f2937]">{product.productname}</span>
        </nav>

        <section className="customer-panel overflow-hidden">
          <div className="border-b border-[#e5e7eb] bg-white px-5 py-5 md:px-7">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {product.brand && (
                    <span className="rounded-full border border-[#e5e7eb] bg-[#f3f4f6] px-3 py-1 text-xs font-black text-[#1f2937]">
                      {product.brand.name}
                    </span>
                  )}
                  {product.series && (
                    <span className="rounded-full border border-[#e30613]/25 bg-[#e30613]/10 px-3 py-1 text-xs font-black text-[#c4000b]">
                      {product.series.name}
                    </span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${
                    stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {stock > 0 ? 'Còn hàng' : 'Tạm hết hàng'}
                  </span>
                </div>
                <h1 className="customer-display max-w-3xl text-2xl font-bold leading-tight text-[#1f2937] sm:text-3xl md:text-5xl">
                  {product.productname}
                </h1>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="flex w-fit shrink-0 items-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-3 py-2 text-xs font-bold text-[#1f2937] shadow-sm hover:border-[#e30613] sm:px-4 sm:py-3 sm:text-sm"
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
            <div className="border-b border-[#e5e7eb] bg-white p-4 sm:p-5 md:p-7 lg:col-span-5 lg:border-b-0 lg:border-r">
              <ProductGallery productName={product.productname} images={variantImages} />
            </div>

            <div id="purchase-options" className="border-b border-[#e5e7eb] bg-[#f9fafb] p-4 sm:p-5 md:p-7 lg:col-span-4 lg:border-b-0 lg:border-r">
              <ProductPurchasePanel
                productId={product.productid}
                productName={product.productname}
                variants={product.productvariants || []}
                selectedVariant={selectedVariant}
                onSelectVariant={setSelectedVariant}
              />
            </div>

            <aside className="space-y-5 bg-white p-4 sm:p-5 md:p-7 lg:col-span-3">
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
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1f2937] text-[#ffd166]">
                        <Icon size={19} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1f2937]">{title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] bg-[#1f2937] p-5 text-white shadow-[0_18px_45px_rgba(15,23,42,0.2)]">
                <MessageCircleMore size={26} className="mb-3 text-[#ffd166]" />
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd166]">Trợ lý mua sắm AI</p>
                <h3 className="customer-display mt-2 text-2xl font-bold leading-tight">
                  Chưa chắc máy này phù hợp?
                </h3>
                <p className="mt-3 text-xs leading-5 text-white/65">
                  Hỏi AI để phân tích cấu hình, nhu cầu sử dụng hoặc so sánh với sản phẩm khác.
                </p>
                <button
                  type="button"
                  onClick={askAi}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#1f2937] hover:bg-[#ffd166]"
                >
                  <MessageCircleMore size={16} /> Hỏi AI về sản phẩm
                </button>
              </div>

              <div className="flex items-start gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
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
          <div className="flex gap-2 overflow-x-auto border-b border-[#e5e7eb] bg-white px-3 py-3 md:px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-full px-5 py-3 text-sm font-black transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#e30613] text-white shadow-[0_10px_24px_rgba(227,6,19,0.18)]'
                    : 'bg-[#f3f4f6] text-slate-500 hover:text-[#1f2937]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-white p-4 sm:p-5 md:p-8">
            {activeTab === 'description' && (
              <div className="mx-auto max-w-4xl">
                <p className="customer-label">Product story</p>
                <h2 className="customer-display mt-2 mb-6 text-3xl font-bold text-[#1f2937]">
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

      <div className="fixed inset-x-3 bottom-3 z-30 flex items-center gap-3 rounded-[24px] border border-[#e5e7eb] bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.16)] lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-slate-500">{product.productname}</p>
          <p className="font-black text-[#c4000b]">{formatCurrency(currentPrice)}</p>
        </div>
        <button
          type="button"
          onClick={() => document.getElementById('purchase-options')?.scrollIntoView({ behavior: 'smooth' })}
          className="rounded-full bg-[#e30613] px-5 py-3 text-sm font-black text-white"
        >
          Chọn mua
        </button>
      </div>
    </div>
  );
};

export default ProductDetailPage;
