import React from 'react';
import { PackageCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../api/productsApi';
import { getProductPath } from '../utils/productLinks';
import { formatCurrency, getDiscountPercent } from '@/utils/formatters';

interface ProductCardProps {
  product: Product;
  compact?: boolean;
}

const imageTones = [
  'bg-[#e8f1ef]',
  'bg-[#f4e4da]',
  'bg-[#e9e5f3]',
  'bg-[#e2ebf5]',
  'bg-[#f0ead5]',
];

const getVariantSummary = (product: Product) => {
  const variants = product.productvariants ?? [];
  const hasStockData = variants.some(variant => variant.stockquantity != null);
  const stock = variants.reduce((total, variant) => total + (variant.stockquantity ?? 0), 0);
  const displayVariant = variants.find(variant => (variant.stockquantity ?? 0) > 0) ?? variants[0];

  return {
    displayVariant,
    hasStockData,
    stock,
    availabilityLabel: hasStockData
      ? stock > 0 ? `Còn ${stock} máy` : 'Tạm hết'
      : `${variants.length} cấu hình`,
  };
};

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { displayVariant, hasStockData, stock, availabilityLabel } = getVariantSummary(product);
  const mainImage = displayVariant?.productimages?.find(image => image.ismain)?.imageurl
    ?? displayVariant?.productimages?.[0]?.imageurl;
  const discount = getDiscountPercent(displayVariant?.baseprice, displayVariant?.saleprice);
  const imageTone = imageTones[product.productid % imageTones.length];
  const price = displayVariant ? displayVariant.saleprice ?? displayVariant.baseprice : undefined;
  const isActive = product.isactive !== false;
  const isAvailable = isActive && (!hasStockData || stock > 0);
  const productPath = getProductPath(product);

  return (
    <article className="product-card group flex h-full flex-col">
      <Link
        to={productPath}
        className={`card-img-container relative m-2 mb-0 block aspect-[4/4.25] overflow-hidden rounded-xl sm:m-3 sm:mb-0 ${imageTone}`}
      >
        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-1 p-2 sm:p-3">
          <span className="max-w-[76%] truncate rounded-full border border-[#1f2937]/10 bg-white/90 px-2 py-1 text-[8px] font-black uppercase tracking-[0.14em] text-[#1f2937] backdrop-blur sm:px-2.5 sm:text-[9px]">
            {product.series?.name ?? product.brand?.name ?? 'Điện thoại'}
          </span>
          {discount ? (
            <span className="rounded-full bg-[#e30613] px-2 py-1 text-[9px] font-black text-white shadow-sm sm:px-2.5 sm:text-[10px]">
              -{discount}%
            </span>
          ) : null}
        </div>

        {mainImage ? (
          <img
            src={mainImage}
            alt={product.productname}
            width={800}
            height={800}
            className="h-full w-full object-contain p-5 transition duration-500 group-hover:scale-[1.06] sm:p-7"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="customer-display text-5xl font-bold text-[#1f2937]/15">
              {product.productname.charAt(0)}
            </span>
          </div>
        )}

      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="mb-2 flex items-center justify-between gap-2 sm:mb-3">
          <span className="customer-label truncate">
            {product.brand?.name ?? 'Chính hãng'}
          </span>
          <span className={`flex shrink-0 items-center gap-1 text-[10px] font-bold ${
            isAvailable ? 'text-emerald-700' : 'text-slate-400'
          }`}>
            <PackageCheck size={13} />
            {isActive ? availabilityLabel : 'Ngừng kinh doanh'}
          </span>
        </div>

        <Link to={productPath} className="block">
          <h3 className="min-h-10 line-clamp-2 text-sm font-black leading-[1.45] text-[#1f2937] transition group-hover:text-[#c4000b] sm:min-h-11 sm:text-[15px]">
            {product.productname}
          </h3>
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-[#e5e7eb] pt-3 sm:gap-3 sm:pt-4">
          {displayVariant && price != null ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Giá từ
              </p>
              <p className="mt-0.5 text-base font-black tracking-tight text-[#c4000b] sm:text-lg">
                {formatCurrency(price)}
              </p>
              {displayVariant.saleprice && displayVariant.saleprice < displayVariant.baseprice && (
                <p className="text-[11px] text-slate-400 line-through">
                  {formatCurrency(displayVariant.baseprice)}
                </p>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-400">Liên hệ</span>
          )}
        </div>
      </div>
    </article>
  );
};
