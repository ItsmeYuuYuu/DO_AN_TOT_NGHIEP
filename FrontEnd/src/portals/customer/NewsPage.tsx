import React, { useEffect, useState } from 'react';
import { Calendar, ChevronRight, Newspaper, User, X } from 'lucide-react';
import { newsApi } from '@/features/content/api/newsApi';
import type { News as NewsItem } from '@/features/content/api/newsApi';
import { Skeleton } from '@/components/Skeleton';

const NewsPage: React.FC = () => {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<NewsItem | null>(null);

  useEffect(() => {
    newsApi.getActive()
      .then(response => setNewsList(response))
      .catch(() => setNewsList([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (date?: string) =>
    date ? new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

  const featured = newsList[0];
  const secondary = newsList.slice(1);

  return (
    <div className="customer-shell min-h-screen pb-16">
      <section className="border-b customer-rule bg-[#fffdf8] px-4 py-10">
        <div className="customer-container grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="customer-label">Tech journal</p>
            <h1 className="customer-display mt-2 text-4xl font-bold text-[#10233f] md:text-5xl">
              Tin tức & công nghệ
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Cập nhật sản phẩm, xu hướng smartphone và các nội dung giúp bạn chọn máy tỉnh táo hơn.
            </p>
          </div>
          <div className="customer-panel-soft p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center bg-[#10233f] text-[#75d7dc]">
                <Newspaper size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#db3d1c]">Đang có</p>
                <p className="customer-display text-3xl font-bold text-[#10233f]">{newsList.length} bài viết</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="customer-container px-4 py-10">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="customer-panel p-4">
                <Skeleton className="mb-4 aspect-video w-full" />
                <Skeleton className="mb-3 h-5 w-3/4" />
                <Skeleton className="mb-2 h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        ) : newsList.length === 0 ? (
          <div className="customer-panel-soft px-6 py-20 text-center">
            <Newspaper className="mx-auto mb-5 text-[#10233f]/25" size={54} />
            <h2 className="customer-display text-3xl font-bold text-[#10233f]">Chưa có bài viết nào</h2>
            <p className="mt-3 text-sm text-slate-500">Hãy quay lại sau để đọc thêm nội dung mới.</p>
          </div>
        ) : (
          <>
            {featured && (
              <article
                className="customer-panel mb-8 grid cursor-pointer overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl md:grid-cols-[1fr_1fr]"
                onClick={() => setSelectedPost(featured)}
              >
                {featured.thumbnail ? (
                  <img
                    src={featured.thumbnail}
                    alt={featured.title}
                    className="aspect-video h-full w-full object-cover md:aspect-auto"
                    onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="customer-grid-pattern flex min-h-72 items-center justify-center bg-[#10233f] text-[#75d7dc]">
                    <Newspaper size={68} />
                  </div>
                )}
                <div className="flex flex-col justify-center p-6 md:p-8">
                  <span className="mb-4 w-fit bg-[#ff5b35] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                    Nổi bật
                  </span>
                  <h2 className="customer-display text-3xl font-bold leading-tight text-[#10233f] md:text-4xl">
                    {featured.title}
                  </h2>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">{featured.summary}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(featured.createdat)}</span>
                    {featured.authorName && <span className="flex items-center gap-1"><User size={12} />{featured.authorName}</span>}
                  </div>
                </div>
              </article>
            )}

            <div className="grid gap-5 md:grid-cols-3">
              {secondary.map(post => (
                <article
                  key={post.postid}
                  className="product-card cursor-pointer bg-[#fffdf8]"
                  onClick={() => setSelectedPost(post)}
                >
                  {post.thumbnail ? (
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      className="aspect-video w-full object-cover"
                      onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="customer-grid-pattern flex aspect-video items-center justify-center bg-[#f4f0e8] text-[#10233f]/25">
                      <Newspaper size={36} />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-base font-black leading-snug text-[#10233f] group-hover:text-[#db3d1c]">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{post.summary}</p>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(post.createdat)}</span>
                      <span className="flex items-center gap-0.5 text-[#db3d1c]">Đọc thêm<ChevronRight size={12} /></span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>

      {selectedPost && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#10233f]/70 p-4 backdrop-blur-sm"
          onClick={() => setSelectedPost(null)}
        >
          <article
            className="customer-panel my-8 w-full max-w-3xl overflow-hidden"
            onClick={event => event.stopPropagation()}
          >
            {selectedPost.thumbnail && (
              <img
                src={selectedPost.thumbnail}
                alt={selectedPost.title}
                className="aspect-video w-full object-cover"
                onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
            <div className="p-6 md:p-8">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h2 className="customer-display text-3xl font-bold leading-tight text-[#10233f]">
                  {selectedPost.title}
                </h2>
                <button type="button" onClick={() => setSelectedPost(null)} className="text-slate-400 hover:text-[#10233f]">
                  <X size={22} />
                </button>
              </div>
              <div className="mb-6 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(selectedPost.createdat)}</span>
                {selectedPost.authorName && <span className="flex items-center gap-1"><User size={12} />{selectedPost.authorName}</span>}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-8 text-slate-700">
                {selectedPost.content || selectedPost.summary}
              </div>
            </div>
          </article>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
