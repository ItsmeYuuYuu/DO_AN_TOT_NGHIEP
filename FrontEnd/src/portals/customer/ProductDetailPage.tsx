import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { productsApi } from '@/features/products/api/productsApi';
import type { FullProductDetail, FullProductVariant } from '@/features/products/api/productsApi';
import { ProductGallery } from '@/features/products/components/ProductGallery';
import { ProductPurchasePanel } from '@/features/products/components/ProductPurchasePanel';
import { ProductSpecsTable } from '@/features/products/components/ProductSpecsTable';
import { ProductReviewSummary } from '@/features/products/components/ProductReviewSummary';
import { RelatedProducts } from '@/features/products/components/RelatedProducts';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<FullProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<FullProductVariant | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    productsApi.getFullDetail(Number(id))
      .then(res => {
        setProduct(res.data);
        if (res.data.productvariants && res.data.productvariants.length > 0) {
          setSelectedVariant(res.data.productvariants[0]);
        }
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-slate-200 rounded-2xl h-[500px]" />
        <div className="lg:col-span-4 space-y-4">
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-24 bg-slate-200 rounded" />
          <div className="h-12 bg-slate-200 rounded" />
        </div>
        <div className="lg:col-span-3 bg-slate-200 rounded-2xl h-[400px]" />
      </div>
    </div>
  );

  if (!product) return null;

  // Compile images from variant if available, otherwise from product
  const variantImages = selectedVariant?.productimages && selectedVariant.productimages.length > 0 
    ? selectedVariant.productimages 
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link to="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link>
        <span>/</span>
        {product.category && (
           <>
             <Link to={`/search?categoryId=${product.category.categoryid}`} className="hover:text-blue-600 transition-colors">{product.category.categoryname}</Link>
             <span>/</span>
           </>
        )}
        <span className="text-slate-800 font-semibold">{product.productname}</span>
      </nav>

      {/* Title & Ratings */}
      <div className="mb-6 border-b border-slate-200 pb-4">
        <div className="flex items-baseline gap-4">
          <h1 className="text-3xl font-bold text-slate-800">{product.productname}</h1>
          <a href="#reviews" className="text-sm font-semibold text-orange-500 hover:underline">
            {product.reviewSummary?.totalReviews || 0} Đánh giá
          </a>
        </div>
        {selectedVariant?.sku && (
          <div className="text-sm text-slate-500 mt-2">
            Mã: <span className="font-semibold text-slate-700">{selectedVariant.sku}</span>
          </div>
        )}
      </div>

      {/* Top Section: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12">
        {/* Left: Gallery (5 cols) */}
        <div className="lg:col-span-5">
          <ProductGallery 
            productName={product.productname} 
            images={variantImages} 
          />
        </div>

        {/* Right: Purchase Panel (7 cols) */}
        <div className="lg:col-span-7">
          <ProductPurchasePanel
            productId={product.productid}
            productName={product.productname}
            variants={product.productvariants || []}
            selectedVariant={selectedVariant}
            onSelectVariant={setSelectedVariant}
          />
        </div>
      </div>

      {/* Middle Section: Details & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-6 uppercase tracking-wide">Mô tả sản phẩm</h2>
            {product.description ? (
              <div className="prose prose-slate prose-sm sm:prose-base max-w-none whitespace-pre-line text-slate-600 leading-relaxed">
                {product.description}
              </div>
            ) : (
              <p className="text-slate-400 italic">Đang cập nhật mô tả...</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-1">
          <ProductSpecsTable attributes={selectedVariant?.attributes} />
        </div>
      </div>

      {/* Bottom Section: Reviews */}
      <ProductReviewSummary 
        productId={product.productid}
        summary={product.reviewSummary} 
        variantId={selectedVariant?.variantid} 
      />

      {/* Bottom Section: Related Products */}
      <RelatedProducts products={product.relatedProducts} />
    </div>
  );
};

export default ProductDetailPage;
