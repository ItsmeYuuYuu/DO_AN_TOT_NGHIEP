import React from 'react';
import { ArrowUpRight, PackageCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../api/productsApi';
import { formatCurrency, getDiscountPercent } from '@/utils/formatters';

interface ProductCardProps {
  product: Product;
}

const imageTones = [
  'bg-[#e8f1ef]',
  'bg-[#f4e4da]',
  'bg-[#e9e5f3]',
  'bg-[#e2ebf5]',
  'bg-[#f0ead5]',
];

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const firstVariant = product.productvariants?.[0];
  const mainImage = firstVariant?.productimages?.find(image => image.ismain)?.imageurl
    ?? firstVariant?.productimages?.[0]?.imageurl;
  const discount = getDiscountPercent(firstVariant?.baseprice, firstVariant?.saleprice);
  const variants = product.productvariants ?? [];
  const hasStockData = variants.some(variant => variant.stockquantity != null);
  const stock = variants.reduce(
    (total, variant) => total + (variant.stockquantity ?? 0),
    0,
  );
  const availabilityLabel = hasStockData
    ? stock > 0 ? `${stock} máy` : 'Tạm hết'
    : `${variants.length} cấu hình`;
  const imageTone = imageTones[product.productid % imageTones.length];

  return (
    <article className="product-card group flex h-full flex-col">
      <Link
        to={`/products/${product.productid}`}
        className={`card-img-container relative block aspect-[4/4.4] overflow-hidden ${imageTone}`}
      >
        <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between p-3">
          <span className="border border-[#10233f]/15 bg-[#fffdf8]/90 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#10233f] backdrop-blur">
            {product.series?.name ?? product.brand?.name ?? 'Điện thoại'}
          </span>
          {discount ? (
            <span className="bg-[#ff5b35] px-2 py-1 text-[10px] font-black text-white">
              -{discount}%
            </span>
          ) : (
            <span className="h-2 w-2 bg-[#75d7dc]" aria-hidden="true" />
          )}
        </div>

        {mainImage ? (
          <img
            src={mainImage}
            alt={product.productname}
            className="h-full w-full object-contain p-7 transition duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="customer-display text-5xl font-bold text-[#10233f]/15">
              {product.productname.charAt(0)}
            </span>
          </div>
        )}

        <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center border border-[#10233f] bg-[#fffdf8] text-[#10233f] transition group-hover:bg-[#10233f] group-hover:text-white">
          <ArrowUpRight size={17} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="customer-label truncate">
            {product.brand?.name ?? 'Chính hãng'}
          </span>
          <span className={`flex shrink-0 items-center gap-1 text-[10px] font-bold ${
            !hasStockData || stock > 0 ? 'text-emerald-700' : 'text-slate-400'
          }`}>
            <PackageCheck size={13} />
            {availabilityLabel}
          </span>
        </div>

        <Link to={`/products/${product.productid}`} className="block">
          <h3 className="min-h-11 line-clamp-2 text-[15px] font-black leading-[1.45] text-[#10233f] transition group-hover:text-[#db3d1c]">
            {product.productname}
          </h3>
        </Link>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[#d9d2c5] pt-4">
          {firstVariant ? (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Giá từ
              </p>
              <p className="mt-0.5 text-lg font-black tracking-tight text-[#db3d1c]">
                {formatCurrency(firstVariant.saleprice ?? firstVariant.baseprice)}
              </p>
              {firstVariant.saleprice && firstVariant.saleprice < firstVariant.baseprice && (
                <p className="text-[11px] text-slate-400 line-through">
                  {formatCurrency(firstVariant.baseprice)}
                </p>
              )}
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-400">Liên hệ</span>
          )}
          <Link
            to={`/products/${product.productid}`}
            className="mb-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#10233f] underline decoration-[#ff5b35] decoration-2 underline-offset-4"
          >
            Xem máy
          </Link>
        </div>
      </div>
    </article>
  );
};
