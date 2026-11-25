import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Eye,
  Filter,
  LoaderCircle,
  MessageSquare,
  Search,
  Star,
  ThumbsUp,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import { DataTable } from '@/components/DataTable';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import { reviewsApi } from '@/features/products/api/reviewsApi';
import type { Review, ReviewSummary } from '@/features/products/api/reviewsApi';
import { formatDateTime } from '@/utils/formatters';
import { confirmAction, notifyError, notifySuccess } from '@/utils/notifications';

const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({
    total: 0,
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    lowStar: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchSummary = async () => {
    try {
      const data = await reviewsApi.getSummary();
      setSummary(data);
    } catch {
      // Ignored non-critical stats
    }
  };

  useEffect(() => {
    void fetchSummary();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await reviewsApi.getAdminReviews({
          query: search.trim() || undefined,
          rating: ratingFilter !== 'all' ? Number(ratingFilter) : undefined,
          page,
          pageSize,
        });
        setReviews(data.items);
        setTotalCount(data.totalCount);
        setTotalPages(Math.max(1, data.totalPages));
      } catch {
        setError('Không thể tải danh sách đánh giá.');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
    };
  }, [page, pageSize, search, ratingFilter]);

  const handleDeleteReview = async (review: Review) => {
    const confirmed = await confirmAction(
      `Bạn có chắc chắn muốn xóa đánh giá của "${review.customerName ?? 'Khách hàng'}" cho sản phẩm "${review.productName ?? review.variantSku ?? 'này'}"? Hành động này không thể hoàn tác.`,
      {
        title: 'Xóa đánh giá vi phạm',
        confirmLabel: 'Xóa vĩnh viễn',
        danger: true,
      },
    );

    if (!confirmed) return;

    try {
      setDeletingId(review.reviewid);
      await reviewsApi.delete(review.reviewid);
      setReviews(prev => prev.filter(r => r.reviewid !== review.reviewid));
      setTotalCount(prev => Math.max(0, prev - 1));
      if (selectedReview?.reviewid === review.reviewid) {
        setSelectedReview(null);
      }
      void fetchSummary();
      notifySuccess('Đã xóa đánh giá thành công.');
    } catch {
      notifyError('Không thể xóa đánh giá này.');
    } finally {
      setDeletingId(null);
    }
  };

  const renderStars = (rating: number = 5) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            size={14}
            className={
              index < rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-slate-200 text-slate-200'
            }
          />
        ))}
        <span className="ml-1 text-xs font-black text-slate-700">{rating}.0</span>
      </div>
    );
  };

  const columns = [
    {
      key: 'stt',
      header: 'STT',
      render: (_r: Review, rowIndex: number) => (
        <span className="text-xs font-semibold text-slate-400">{(page - 1) * pageSize + rowIndex + 1}</span>
      ),
      className: 'w-12',
    },
    {
      key: 'customer',
      header: 'Khách hàng',
      render: (r: Review) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black text-xs text-slate-700">
            {(r.customerName ?? 'K').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">{r.customerName ?? 'Khách hàng ẩn danh'}</p>
            <p className="text-xs text-slate-400">{r.customerEmail ?? r.customerPhone ?? '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Sản phẩm & Biến thể',
      render: (r: Review) => (
        <div className="max-w-[220px]">
          <p className="line-clamp-1 text-sm font-bold text-slate-800" title={r.productName ?? ''}>
            {r.productName ?? 'Sản phẩm'}
          </p>
          <span className="inline-block mt-0.5 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            SKU: {r.variantSku ?? '—'}
          </span>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Đánh giá',
      render: (r: Review) => renderStars(r.rating ?? 5),
    },
    {
      key: 'comment',
      header: 'Nội dung bình luận',
      render: (r: Review) => (
        <div className="max-w-xs">
          <p className="line-clamp-2 text-sm text-slate-600" title={r.comment ?? ''}>
            {r.comment || <em className="text-slate-400 font-normal">Không có nội dung nhận xét</em>}
          </p>
        </div>
      ),
    },
    {
      key: 'createdat',
      header: 'Ngày đăng',
      render: (r: Review) => (
        <span className="text-xs font-medium text-slate-500">
          {r.createdat ? formatDateTime(r.createdat) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-44 text-right',
      render: (r: Review) => (
        <div className="inline-flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setSelectedReview(r)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Eye size={14} />
            Xem
          </button>
          <button
            type="button"
            onClick={() => handleDeleteReview(r)}
            disabled={deletingId === r.reviewid}
            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          >
            {deletingId === r.reviewid ? (
              <LoaderCircle size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Xóa
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* HERO HEADER */}
      <div className="ops-hero flex items-center justify-between gap-4 p-6">
        <div>
          <h2 className="ops-hero-title">Quản lý đánh giá sản phẩm</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kiểm duyệt nội dung nhận xét của người mua, phát hiện từ ngữ thô tục và loại bỏ đánh giá tiêu cực vi phạm.
          </p>
        </div>
        <span className="rounded-full border border-red-100 bg-white px-4 py-2 text-sm font-black text-[#c4000b] shadow-sm">
          {totalCount} đánh giá
        </span>
      </div>

      {/* STAT CARDS - Flat UI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="ops-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="ops-label">Tổng đánh giá</p>
              <h3 className="mt-2 text-2xl font-black text-slate-800">{summary.total}</h3>
            </div>
            <MessageSquare className="text-[#e30613]" size={24} />
          </div>
        </div>

        <div className="ops-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="ops-label">Điểm trung bình</p>
              <h3 className="mt-2 text-2xl font-black text-amber-500">
                {summary.averageRating} / 5.0 ⭐
              </h3>
            </div>
            <Star className="text-amber-400 fill-amber-400" size={24} />
          </div>
        </div>

        <div className="ops-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="ops-label">Đánh giá 5 sao (Tốt)</p>
              <h3 className="mt-2 text-2xl font-black text-emerald-600">{summary.fiveStar}</h3>
            </div>
            <ThumbsUp className="text-emerald-500" size={24} />
          </div>
        </div>

        <div className="ops-card p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="ops-label">Cần xử lý (1-2 sao)</p>
              <h3 className="mt-2 text-2xl font-black text-red-600">{summary.lowStar}</h3>
            </div>
            <AlertTriangle className="text-red-500" size={24} />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* TOOLBAR */}
      <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 md:max-w-md">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-medium outline-none transition focus:border-[#e30613] focus:bg-white"
              placeholder="Tìm theo tên khách, sản phẩm, SKU, nội dung..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Filter size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={ratingFilter}
                onChange={e => {
                  setRatingFilter(e.target.value);
                  setPage(1);
                }}
                className="h-11 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-8 text-sm font-bold text-slate-700 outline-none transition focus:border-[#e30613] focus:bg-white"
              >
                <option value="all">Tất cả số sao</option>
                <option value="5">⭐⭐⭐⭐⭐ (5 sao)</option>
                <option value="4">⭐⭐⭐⭐ (4 sao)</option>
                <option value="3">⭐⭐⭐ (3 sao)</option>
                <option value="2">⭐⭐ (2 sao)</option>
                <option value="1">⭐ (1 sao)</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#e30613] focus:bg-white"
              >
                <option value={10}>10 / trang</option>
                <option value={25}>25 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Đang hiển thị <span className="font-bold text-slate-700">{reviews.length}/{totalCount}</span> đánh giá.
        </p>
      </div>

      {/* TABLE */}
      <DataTable columns={columns} data={reviews} keyField="reviewid" loading={loading} />
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} itemCount={totalCount} pageSize={pageSize} />

      {/* DETAIL MODAL */}
      <Modal
        isOpen={selectedReview !== null}
        onClose={() => setSelectedReview(null)}
        title="Chi tiết nhận xét của khách hàng"
        size="lg"
      >
        {selectedReview && (
          <div className="space-y-5">
            <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 font-black">
                <UserRound size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-800">{selectedReview.customerName ?? 'Khách hàng ẩn danh'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedReview.customerEmail ?? selectedReview.customerPhone ?? 'Không có thông tin liên hệ'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Đăng lúc {selectedReview.createdat ? formatDateTime(selectedReview.createdat) : '—'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-400">Sản phẩm đánh giá:</span>
                <p className="font-bold text-slate-800 text-sm mt-0.5">{selectedReview.productName ?? '—'}</p>
                <span className="inline-block mt-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  SKU: {selectedReview.variantSku ?? '—'}
                </span>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400">Mức độ hài lòng:</span>
                <div className="mt-1">{renderStars(selectedReview.rating ?? 5)}</div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400">Nội dung nhận xét:</span>
                <div className="mt-1.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedReview.comment || 'Khách hàng không để lại nhận xét chi tiết.'}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleDeleteReview(selectedReview)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 flex items-center gap-1.5"
              >
                <Trash2 size={16} />
                Xóa đánh giá này
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminReviews;
