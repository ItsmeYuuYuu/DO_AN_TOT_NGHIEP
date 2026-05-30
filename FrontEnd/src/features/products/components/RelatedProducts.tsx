import React from 'react';
import type { Product } from '../api/productsApi';
import { ProductCard } from './ProductCard';

interface RelatedProductsProps {
  products?: Product[];
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({ products }) => {
  if (!products || products.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t border-slate-200">
      <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-wide">Sản phẩm tương tự</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {products.map(p => (
          <ProductCard key={p.productid} product={p} />
        ))}
      </div>
    </div>
  );
};
