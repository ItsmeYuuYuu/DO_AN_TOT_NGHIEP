import React from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../api/productsApi';
import { formatCurrency, getDiscountPercent } from '@/utils/formatters';
import { Button } from '@/components/Button';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const firstVariant = product.productvariants?.[0];
  const mainImage = firstVariant?.productimages?.find((img) => img.ismain)?.imageurl
    ?? firstVariant?.productimages?.[0]?.imageurl;

  const discount = getDiscountPercent(firstVariant?.baseprice, firstVariant?.saleprice);

  return (
    <div className="product-card flex flex-col h-full group bg-white">
      {/* Image with scaling effect */}
      <Link to={`/products/${product.productid}`} className="card-img-container relative aspect-square overflow-hidden bg-slate-50">
        {mainImage ? (
          <img
            src={mainImage}
            alt={product.productname}
            className="w-full h-full object-contain p-4 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Discount Badge */}
        {discount && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
            -{discount}%
          </div>
        )}
      </Link>

      {/* Info Section */}
      <div className="p-4 flex flex-col flex-1">
        <div className="mb-1">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
            {product.brand?.name || 'CHÍNH HÃNG'}
          </span>
        </div>

        <Link to={`/products/${product.productid}`} className="mb-2">
          <h3 className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors h-10">
            {product.productname}
          </h3>
        </Link>

        {/* Pricing */}
        <div className="mt-auto pt-2">
          {firstVariant ? (
            <div className="flex flex-col">
              {firstVariant.saleprice && firstVariant.saleprice < firstVariant.baseprice ? (
                <>
                  <span className="text-lg font-bold text-red-500">
                    {formatCurrency(firstVariant.saleprice)}
                  </span>
                  <span className="text-xs text-slate-400 line-through">
                    {formatCurrency(firstVariant.baseprice)}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(firstVariant.baseprice)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">Liên hệ</span>
          )}
        </div>

        {/* Action Button - appears on hover for desktop, or visible on mobile */}
        <div className="mt-4 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <Button variant="primary" size="sm" className="w-full">
            THÊM VÀO GIỎ
          </Button>
        </div>
      </div>
    </div>
  );
};
