import React, { useEffect, useState } from 'react';
import { Star, Trash2, Pen } from 'lucide-react';
import { reviewsApi } from '@/features/products/api/reviewsApi';
import type { Review } from '@/features/products/api/reviewsApi';

export const MyReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const data = await reviewsApi.getMyReviews();
      setReviews(data);
    } catch {
      // handle error silently or show a toast
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (rev: Review) => {
    setEditingId(rev.reviewid);
    setRating(rev.rating ?? 5);
    setComment(rev.comment ?? '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRating(5);
    setComment('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    
    setSubmitting(true);
    try {
      await reviewsApi.update(editingId, { rating, comment });
      setEditingId(null);
      fetchReviews();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Có lỗi xảy ra khi cập nhật đánh giá.');
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

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2">
        <Star size={18} className="text-amber-500 fill-amber-500" /> Đánh giá của tôi
      </h3>

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10">
          <Star size={40} className="text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Bạn chưa viết đánh giá nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(rev => (
            <div key={rev.reviewid} className="border border-slate-100 rounded-xl p-4">
              {editingId === rev.reviewid ? (
                <form onSubmit={handleUpdate} className="space-y-3">
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map(s => (
                      <button type="button" key={s} onClick={() => setRating(s)} className="p-1 hover:scale-110 transition-transform">
                        <Star size={20} className={s <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:border-blue-500 min-h-[80px]"
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    maxLength={1000}
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold">Lưu thay đổi</button>
                    <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold">Hủy</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800">SKU: {rev.variantSku || 'Sản phẩm'}</p>
                      <p className="text-xs text-slate-400">{rev.createdat ? new Date(rev.createdat).toLocaleDateString('vi-VN') : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={14} className={s <= (rev.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                        ))}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(rev)} className="text-slate-400 hover:text-blue-600 p-1"><Pen size={14} /></button>
                        <button onClick={() => handleDelete(rev.reviewid)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </div>
                  {rev.comment && <p className="text-sm text-slate-600">{rev.comment}</p>}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
