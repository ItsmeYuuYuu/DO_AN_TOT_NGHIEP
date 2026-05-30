import React, { useEffect, useState } from 'react';
import { Star, Trash2, Pen } from 'lucide-react';
import { reviewsApi } from '@/features/products/api/reviewsApi';
import type { Review } from '@/features/products/api/reviewsApi';
import { useAuth } from '@/features/auth/context/AuthContext';
import { Button } from '@/components/Button';

interface Props {
  productId?: number;
  variantId?: number;
}

export const ProductReviews: React.FC<Props> = ({ productId, variantId }) => {
  const { isLoggedIn, user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myReviewIds, setMyReviewIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'variant'>('all');

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    fetchReviews();
    if (isLoggedIn) {
      fetchMyReviews();
    }
  }, [productId, variantId, filterType, isLoggedIn]);

  const fetchMyReviews = async () => {
    try {
      const data = await reviewsApi.getMyReviews();
      setMyReviewIds(data.map(r => r.reviewid));
    } catch {
      // ignore
    }
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      if (filterType === 'all' && productId) {
        const data = await reviewsApi.getByProduct(productId);
        setReviews(data);
      } else if (filterType === 'variant' && variantId) {
        const data = await reviewsApi.getByVariant(variantId);
        setReviews(data);
      } else {
        setReviews([]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!variantId) return;

    setSubmitting(true);
    setError('');
    try {
      if (editingId) {
        await reviewsApi.update(editingId, { rating, comment });
        setEditingId(null);
      } else {
        await reviewsApi.create({ variantid: variantId, rating, comment });
      }
      setRating(5);
      setComment('');
      fetchReviews();
      fetchMyReviews();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.Message || 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
    try {
      await reviewsApi.delete(id);
      fetchReviews();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Không thể xóa đánh giá.');
    }
  };

  const startEdit = (rev: Review) => {
    setEditingId(rev.reviewid);
    setRating(rev.rating ?? 5);
    setComment(rev.comment ?? '');
    window.scrollTo({ top: document.getElementById('review-form')?.offsetTop, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRating(5);
    setComment('');
    setError('');
  };

  return (
    <div className="mt-4">
      {/* Review Form */}
      <div id="review-form" className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
        {!isLoggedIn ? (
          <p className="text-slate-500 text-sm">Vui lòng <a href="/auth/login" className="text-blue-600 font-bold hover:underline">đăng nhập</a> để viết đánh giá.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
              {editingId ? 'Sửa đánh giá' : 'Viết đánh giá của bạn'}
            </h3>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">Đánh giá:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star size={24} className={star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                  </button>
                ))}
              </div>
            </div>

            <textarea
              className="w-full border border-slate-200 rounded-xl p-4 text-sm focus:outline-none focus:border-blue-500 min-h-[100px]"
              placeholder="Chia sẻ cảm nhận của bạn về sản phẩm này..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              maxLength={1000}
            />
            
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" isLoading={submitting} disabled={!variantId}>
                {editingId ? 'Cập nhật' : 'Gửi đánh giá'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={cancelEdit}>Hủy</Button>
              )}
            </div>
          </form>
        )}
      </div>

      {/* Reviews Filter */}
      <div className="flex items-center gap-4 mb-6 border-b border-slate-200 pb-2">
        <button 
          className={`pb-2 text-sm font-bold border-b-2 transition-colors ${filterType === 'all' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setFilterType('all')}
        >
          Tất cả đánh giá
        </button>
        <button 
          className={`pb-2 text-sm font-bold border-b-2 transition-colors ${filterType === 'variant' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          onClick={() => setFilterType('variant')}
        >
          Phiên bản đang chọn
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-slate-400 text-sm animate-pulse">Đang tải đánh giá...</p>
        ) : reviews.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8 bg-slate-50 rounded-xl border border-slate-100">
            Chưa có đánh giá nào.
          </p>
        ) : (
          reviews.map(rev => {
            const canManage = user?.rolename === 'Admin' || user?.rolename === 'Staff' || myReviewIds.includes(rev.reviewid);

            return (
              <div key={rev.reviewid} className="bg-white border border-slate-100 rounded-2xl p-5 hover:border-slate-200 transition-colors shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-800">{rev.customerName || 'Khách hàng'}</p>
                      {rev.variantSku && (
                         <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                           {rev.variantSku}
                         </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{rev.createdat ? new Date(rev.createdat).toLocaleDateString('vi-VN') : ''}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={14} className={s <= (rev.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                    {canManage && (
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(rev)} className="text-slate-400 hover:text-blue-600 transition-colors p-1" title="Sửa">
                          <Pen size={14} />
                        </button>
                        <button onClick={() => handleDelete(rev.reviewid)} className="text-slate-400 hover:text-red-600 transition-colors p-1" title="Xóa">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {rev.comment && <p className="text-sm text-slate-600 leading-relaxed">{rev.comment}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
