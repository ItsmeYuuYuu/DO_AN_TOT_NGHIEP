import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemCount: number;
  pageSize: number;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  onPageChange,
  itemCount,
  pageSize,
}) => {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, itemCount);

  // Build page buttons: show max 5 around current
  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    const start2 = Math.max(2, page - 1);
    const end2 = Math.min(totalPages - 1, page + 1);
    for (let i = start2; i <= end2; i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <p className="text-xs text-slate-500">
        Hiển thị <span className="font-semibold text-slate-700">{start}–{end}</span> trong tổng{' '}
        <span className="font-semibold text-slate-700">{itemCount}</span> bản ghi
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs transition-colors hover:bg-red-50 hover:text-[#c4000b] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ← Trước
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dot-${i}`} className="px-2 text-slate-400 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                p === page
                  ? 'border-[#e30613] bg-[#e30613] font-semibold text-white'
                  : 'border-slate-200 text-slate-600 hover:bg-red-50 hover:text-[#c4000b]'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs transition-colors hover:bg-red-50 hover:text-[#c4000b] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Sau →
        </button>
      </div>
    </div>
  );
};
