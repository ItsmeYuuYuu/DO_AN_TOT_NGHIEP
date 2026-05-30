import React from 'react';
import { Star } from 'lucide-react';
import type { ReviewSummary } from '../api/productsApi';
import { ProductReviews } from '@/portals/customer/ProductReviews';

interface Props {
  productId?: number;
  summary?: ReviewSummary;
  variantId?: number;
}

export const ProductReviewSummary: React.FC<Props> = ({ productId, summary, variantId }) => {
  if (!summary) return null;

  const total = summary.totalReviews || 1; // Prevent division by zero

  const renderBar = (stars: number, count: number) => {
    const percent = Math.round((count / total) * 100) || 0;
    return (
      <div key={stars} className="flex items-center gap-2 text-sm">
        <span className="w-12 text-slate-600 font-medium">{stars} sao</span>
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percent}%` }} />
        </div>
        <span className="w-12 text-right text-slate-500 text-xs">{count}</span>
      </div>
    );
  };

  return (
    <div className="mt-12 pt-8 border-t border-slate-200">
      <h2 className="text-xl font-black text-slate-800 mb-6 uppercase tracking-wide">Đánh giá sản phẩm</h2>
      
      <div className="flex flex-col md:flex-row gap-8 items-center bg-white border border-slate-200 rounded-2xl p-6 md:p-8 mb-8 shadow-sm">
        <div className="flex flex-col items-center justify-center shrink-0 w-32">
          <span className="text-5xl font-black text-slate-800">{summary.avgRating.toFixed(1)}</span>
          <div className="flex text-amber-400 mt-2 mb-1">
             {[1,2,3,4,5].map(s => <Star key={s} size={16} className={s <= Math.round(summary.avgRating) ? 'fill-amber-400' : 'text-slate-300'} />)}
          </div>
          <span className="text-xs text-slate-500">{summary.totalReviews} đánh giá</span>
        </div>
        
        <div className="flex-1 w-full space-y-2 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-8">
          {renderBar(5, summary.star5)}
          {renderBar(4, summary.star4)}
          {renderBar(3, summary.star3)}
          {renderBar(2, summary.star2)}
          {renderBar(1, summary.star1)}
        </div>
      </div>

      {/* Actual reviews and form */}
      <ProductReviews productId={productId} variantId={variantId} />
    </div>
  );
};
