import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, PackageX, ShoppingCart } from 'lucide-react';
import { useCart } from '@/features/orders/context/CartContext';
import { formatCurrency } from '@/utils/formatters';
import { chatSessionsApi } from '../api/chatSessionsApi';
import type { ChatRecommendation } from '../api/chatSessionsApi';
import { notifyError } from '@/utils/notifications';
import { getProductPath } from '@/features/products/utils/productLinks';


interface ChatRecommendationCardsProps {
  sessionId: number;
  recommendations: ChatRecommendation[];
  allowAddToCart?: boolean;
}

export const ChatRecommendationCards = ({
  sessionId,
  recommendations,
  allowAddToCart = false,
}: ChatRecommendationCardsProps) => {
  const { addToCart, isInCart } = useCart();
  const [addingId, setAddingId] = useState<number | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(
    () => new Set(
      recommendations
        .filter(item => item.addedtocartat)
        .map(item => item.recommendationid),
    ),
  );

  const addRecommendation = async (recommendation: ChatRecommendation) => {
    if (recommendation.stock <= 0 || addingId !== null) return;

    setAddingId(recommendation.recommendationid);
    try {
      const addedToCart = await addToCart({
        variantId: recommendation.variantid,
        productId: recommendation.productid,
        productName: recommendation.productname,
        variantName: recommendation.variantname,
        sku: recommendation.sku,
        imageUrl: recommendation.imageurl ||
          `https://placehold.co/300x300?text=${encodeURIComponent(recommendation.productname)}`,
        price: recommendation.price,
      });
      if (!addedToCart) {
        notifyError('Không thể thêm sản phẩm vào giỏ hàng. Vui lòng thử lại.');
        return;
      }
      await chatSessionsApi.markRecommendationAddedToCart(
        sessionId,
        recommendation.recommendationid,
      );
      setAddedIds(previous => new Set(previous).add(recommendation.recommendationid));
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="mt-3 grid gap-3">
      {recommendations.map(recommendation => {
        const added = addedIds.has(recommendation.recommendationid) ||
          isInCart(recommendation.variantid);
        const outOfStock = recommendation.stock <= 0;
        const productPath = getProductPath({
          productid: recommendation.productid,
          slug: recommendation.productslug,
        });

        return (
          <div
            key={recommendation.recommendationid}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-700"
          >
            <div className="flex gap-3 p-3">
              <Link
                to={productPath}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-slate-50"
              >
                <img
                  src={recommendation.imageurl ||
                    `https://placehold.co/300x300?text=${encodeURIComponent(recommendation.productname)}`}
                  alt={recommendation.productname}
                  className="h-full w-full object-contain"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to={productPath}
                  className="line-clamp-2 text-sm font-black text-slate-800 hover:text-[#e30613]"
                >
                  {recommendation.productname}
                </Link>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {recommendation.variantname}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-red-600">
                    {formatCurrency(recommendation.price)}
                  </span>
                  {recommendation.price < recommendation.baseprice && (
                    <span className="text-[11px] text-slate-400 line-through">
                      {formatCurrency(recommendation.baseprice)}
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-[11px] font-bold ${
                  outOfStock ? 'text-red-500' : 'text-emerald-600'
                }`}>
                  {outOfStock ? 'Tạm hết hàng' : `Còn ${recommendation.stock} máy`}
                </p>
              </div>
            </div>

            {allowAddToCart && (
              <button
                type="button"
                disabled={outOfStock || addingId !== null || added}
                onClick={() => addRecommendation(recommendation)}
                className={`flex w-full items-center justify-center gap-2 border-t px-3 py-2 text-xs font-black transition ${
                  added
                    ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                    : outOfStock
                      ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
                      : 'border-red-100 bg-red-50 text-[#c4000b] hover:bg-red-100'
                }`}
              >
                {added ? <Check size={15} /> : outOfStock ? <PackageX size={15} /> : <ShoppingCart size={15} />}
                {added ? 'Đã có trong giỏ' : outOfStock ? 'Tạm hết hàng' : addingId === recommendation.recommendationid ? 'Đang thêm...' : 'Thêm vào giỏ'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
