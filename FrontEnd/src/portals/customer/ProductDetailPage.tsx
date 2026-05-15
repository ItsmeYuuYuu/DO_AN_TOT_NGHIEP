import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, Star, Shield, Truck, RotateCcw, Plus, Minus, Check } from 'lucide-react';
import apiClient from '@/api/apiClient';
import { useCart } from '@/features/orders/context/CartContext';
import { formatCurrency } from '@/utils/formatters';

interface ProductVariant {
  variantid: number;
  variantname: string;
  sku: string;
  baseprice: number;
  saleprice: number;
  stock: number;
}

interface ProductDetail {
  productid: number;
  productname: string;
  description: string;
  categoryid: number;
  brandid: number;
  brand?: { brandname: string };
  category?: { categoryname: string };
  productvariants: ProductVariant[];
  productimages?: { imageurl: string; isprimary: boolean }[];
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart, isInCart } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient.get<ProductDetail>(`/Products/${id}`)
      .then(res => {
        setProduct(res.data);
        if (res.data.productvariants?.length > 0)
          setSelectedVariant(res.data.productvariants[0]);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleAddToCart = () => {
    if (!product || !selectedVariant) return;
    const images = product.productimages ?? [];
    const primary = images.find(i => i.isprimary) ?? images[0];
    addToCart({
      variantId: selectedVariant.variantid,
      productId: product.productid,
      productName: product.productname,
      variantName: selectedVariant.variantname ?? '',
      sku: selectedVariant.sku ?? '',
      imageUrl: primary?.imageurl ?? `https://placehold.co/400x400?text=${encodeURIComponent(product.productname)}`,
      price: selectedVariant.saleprice ?? selectedVariant.baseprice,
    }, quantity);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div className="bg-slate-200 rounded-2xl h-[500px]" />
        <div className="space-y-4">
          <div className="h-8 bg-slate-200 rounded w-3/4" />
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-24 bg-slate-200 rounded" />
          <div className="h-12 bg-slate-200 rounded" />
        </div>
      </div>
    </div>
  );

  if (!product) return null;

  const images = product.productimages ?? [];
  const imgSrc = (i: number) =>
    images[i]?.imageurl ?? `https://placehold.co/600x600?text=${encodeURIComponent(product.productname)}`;
  const discount = selectedVariant && selectedVariant.baseprice > selectedVariant.saleprice
    ? Math.round((1 - selectedVariant.saleprice / selectedVariant.baseprice) * 100)
    : 0;
  const inCart = selectedVariant ? isInCart(selectedVariant.variantid) : false;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-400 mb-8">
        <Link to="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link>
        <span>/</span>
        <span className="text-slate-600 font-medium">{product.productname}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
        {/* ── LEFT: Images ── */}
        <div className="space-y-3">
          {/* Main image */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden aspect-square flex items-center justify-center p-8 shadow-sm">
            <img
              src={imgSrc(activeImg)}
              alt={product.productname}
              className="object-contain w-full h-full transition-all duration-300"
              onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/600x600?text=${encodeURIComponent(product.productname)}`; }}
            />
          </div>
          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {images.slice(0, 6).map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl border-2 overflow-hidden transition-all ${activeImg === i ? 'border-blue-500' : 'border-slate-200 hover:border-slate-300'}`}
                >
                  <img src={img.imageurl} alt="" className="w-full h-full object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Info ── */}
        <div className="space-y-6">
          {/* Brand & Category */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.brand && (
              <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wide">
                {product.brand.brandname}
              </span>
            )}
            {product.category && (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full">
                {product.category.categoryname}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">
            {product.productname}
          </h1>

          {/* Rating (placeholder) */}
          <div className="flex items-center gap-2">
            <div className="flex">
              {[1,2,3,4,5].map(s => (
                <Star key={s} size={16} className={s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'} />
              ))}
            </div>
            <span className="text-sm text-slate-500">4.0 · 128 đánh giá</span>
          </div>

          {/* Price */}
          {selectedVariant && (
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-orange-500">
                {formatCurrency(selectedVariant.saleprice ?? selectedVariant.baseprice)}
              </span>
              {discount > 0 && (
                <>
                  <span className="text-lg text-slate-400 line-through font-medium">
                    {formatCurrency(selectedVariant.baseprice)}
                  </span>
                  <span className="px-2 py-0.5 bg-red-500 text-white text-sm font-bold rounded-lg">
                    -{discount}%
                  </span>
                </>
              )}
            </div>
          )}

          {/* Variants */}
          {product.productvariants.length > 1 && (
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2">Phiên bản:</p>
              <div className="flex flex-wrap gap-2">
                {product.productvariants.map(v => (
                  <button
                    key={v.variantid}
                    onClick={() => { setSelectedVariant(v); setQuantity(1); }}
                    className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                      selectedVariant?.variantid === v.variantid
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {v.variantname}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">Số lượng:</p>
            <div className="flex items-center gap-3">
              <div className="flex items-center border-2 border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Minus size={16} />
                </button>
                <span className="px-5 py-2.5 font-bold text-slate-900 border-x-2 border-slate-200">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
              {selectedVariant && (
                <span className="text-sm text-slate-400">Còn {selectedVariant.stock ?? '∞'} sản phẩm</span>
              )}
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleAddToCart}
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-base transition-all shadow-lg ${
                addedToCart
                  ? 'bg-emerald-500 text-white shadow-emerald-200'
                  : inCart
                  ? 'bg-blue-50 border-2 border-blue-500 text-blue-600 shadow-none'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 hover:shadow-blue-300 hover:-translate-y-0.5'
              }`}
            >
              {addedToCart ? <Check size={20} /> : <ShoppingCart size={20} />}
              {addedToCart ? 'Đã thêm vào giỏ!' : inCart ? 'Trong giỏ hàng' : 'Thêm vào giỏ hàng'}
            </button>
            <button
              onClick={() => { handleAddToCart(); navigate('/cart'); }}
              className="flex-1 py-4 rounded-2xl font-bold text-base bg-orange-500 hover:bg-orange-600 text-white transition-all shadow-lg shadow-orange-200 hover:shadow-orange-300 hover:-translate-y-0.5"
            >
              Mua ngay
            </button>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            {[
              { icon: <Shield size={18} className="text-blue-500" />, text: 'Chính hãng 100%' },
              { icon: <Truck size={18} className="text-emerald-500" />, text: 'Giao hàng nhanh' },
              { icon: <RotateCcw size={18} className="text-orange-500" />, text: 'Đổi trả 30 ngày' },
            ].map((b, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 text-center p-3 bg-slate-50 rounded-xl">
                {b.icon}
                <span className="text-xs font-semibold text-slate-600">{b.text}</span>
              </div>
            ))}
          </div>

          {/* Description */}
          {product.description && (
            <div className="prose prose-sm text-slate-600 border-t border-slate-100 pt-4">
              <h3 className="font-bold text-slate-800 mb-2 text-sm uppercase tracking-wide">Mô tả sản phẩm</h3>
              <p className="leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
