import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronRight, Newspaper, User } from 'lucide-react';
import { newsApi } from '@/features/content/api/newsApi';
import type { News as NewsItem } from '@/features/content/api/newsApi';
import { Skeleton } from '@/components/Skeleton';
import { Seo } from '@/components/Seo';
import { buildSeoDescription } from '@/utils/seoUtils';

const formatDate = (date?: string) =>
  date ? new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

const getNewsPath = (post: NewsItem) => `/news/${post.slug ?? post.postid}`;

const NewsPage: React.FC = () => {
  const { slug } = useParams<{ slug?: string }>();
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailPost, setDetailPost] = useState<NewsItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (slug) {
      setLoading(false);
      return;
    }

    setLoading(true);
    newsApi.getActive()
      .then(response => setNewsList(response))
      .catch(() => setNewsList([]))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!slug) {
      setDetailPost(null);
      return;
    }

    setDetailLoading(true);
    newsApi.getBySlug(slug)
      .then(response => setDetailPost(response))
      .catch(() => setDetailPost(null))
      .finally(() => setDetailLoading(false));
  }, [slug]);

  if (slug) {
    const description = buildSeoDescription(detailPost?.summary || detailPost?.content, 'Tin tuc cong nghe moi nhat tu Cuong Dien Thoai.');

    return (
      <div className="customer-shell min-h-screen pb-16">
        <Seo
          title={detailPost ? `${detailPost.title} - Cuong Dien Thoai` : 'Tin tuc cong nghe - Cuong Dien Thoai'}
          description={description}
          image={detailPost?.thumbnail}
          canonicalPath={`/news/${detailPost?.slug ?? slug}`}
          type="article"
        />

        <main className="customer-container px-4 py-10">
          <Link
            to="/news"
            className="mb-6 inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.12em] text-[#c4000b] hover:text-[#1f2937]"
          >
            <ArrowLeft size={16} />
            Quay lại tin tức
          </Link>

          {detailLoading ? (
            <article className="customer-panel overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-6 md:p-8">
                <Skeleton className="mb-4 h-9 w-3/4" />
                <Skeleton className="mb-3 h-4 w-1/3" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="mb-2 h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </article>
          ) : !detailPost ? (
            <div className="customer-panel-soft px-6 py-20 text-center">
              <Newspaper className="mx-auto mb-5 text-[#1f2937]/25" size={54} />
              <h1 className="customer-display text-3xl font-bold text-[#1f2937]">Không tìm thấy bài viết</h1>
              <p className="mt-3 text-sm text-slate-500">Bài viết có thể đã bị ẩn hoặc đường dẫn không còn tồn tại.</p>
            </div>
          ) : (
            <article className="customer-panel overflow-hidden bg-white">
              {detailPost.thumbnail && (
                <img
                  src={detailPost.thumbnail}
                  alt={detailPost.title}
                  className="aspect-video w-full object-cover"
                  onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="p-6 md:p-10">
                <p className="customer-label">Tin công nghệ</p>
                <h1 className="customer-display mt-3 text-3xl font-bold leading-tight text-[#1f2937] md:text-5xl">
                  {detailPost.title}
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(detailPost.createdat)}</span>
                  {detailPost.authorName && <span className="flex items-center gap-1"><User size={12} />{detailPost.authorName}</span>}
                </div>
                {detailPost.summary && (
                  <p className="mt-6 text-base font-semibold leading-7 text-slate-600">{detailPost.summary}</p>
                )}
                <div className="mt-8 whitespace-pre-wrap text-sm leading-8 text-slate-700">
                  {detailPost.content || detailPost.summary}
                </div>
              </div>
            </article>
          )}
        </main>
      </div>
    );
  }

  const featured = newsList[0];
  const secondary = newsList.slice(1);

  return (
    <div className="customer-shell min-h-screen pb-16">
      <Seo
        title="Tin tuc cong nghe - Cuong Dien Thoai"
        description="Cap nhat tin tuc smartphone, xu huong cong nghe va noi dung giup ban chon dien thoai phu hop hon."
        canonicalPath="/news"
        type="article"
      />
      <section className="border-b customer-rule bg-[#ffffff] px-4 py-10">
        <div className="customer-container grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
          <div>
            <p className="customer-label">Tech journal</p>
            <h1 className="customer-display mt-2 text-4xl font-bold text-[#1f2937] md:text-5xl">
              Tin tức & công nghệ
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Cập nhật sản phẩm, xu hướng smartphone và các nội dung giúp bạn chọn máy tỉnh táo hơn.
            </p>
          </div>
          <div className="customer-panel-soft p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center bg-[#1f2937] text-[#ffd166]">
                <Newspaper size={24} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c4000b]">Đang có</p>
                <p className="customer-display text-3xl font-bold text-[#1f2937]">{newsList.length} bài viết</p>
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
            <Newspaper className="mx-auto mb-5 text-[#1f2937]/25" size={54} />
            <h2 className="customer-display text-3xl font-bold text-[#1f2937]">Chưa có bài viết nào</h2>
            <p className="mt-3 text-sm text-slate-500">Hãy quay lại sau để đọc thêm nội dung mới.</p>
          </div>
        ) : (
          <>
            {featured && (
              <Link
                to={getNewsPath(featured)}
                className="customer-panel mb-8 grid overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl md:grid-cols-[1fr_1fr]"
              >
                {featured.thumbnail ? (
                  <img
                    src={featured.thumbnail}
                    alt={featured.title}
                    className="aspect-video h-full w-full object-cover md:aspect-auto"
                    onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="customer-grid-pattern flex min-h-72 items-center justify-center bg-[#1f2937] text-[#ffd166]">
                    <Newspaper size={68} />
                  </div>
                )}
                <div className="flex flex-col justify-center p-6 md:p-8">
                  <span className="mb-4 w-fit bg-[#e30613] px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                    Nổi bật
                  </span>
                  <h2 className="customer-display text-3xl font-bold leading-tight text-[#1f2937] md:text-4xl">
                    {featured.title}
                  </h2>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">{featured.summary}</p>
                  <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                    <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(featured.createdat)}</span>
                    {featured.authorName && <span className="flex items-center gap-1"><User size={12} />{featured.authorName}</span>}
                  </div>
                </div>
              </Link>
            )}

            <div className="grid gap-5 md:grid-cols-3">
              {secondary.map(post => (
                <Link key={post.postid} to={getNewsPath(post)} className="product-card group bg-[#ffffff]">
                  {post.thumbnail ? (
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      className="aspect-video w-full object-cover"
                      onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="customer-grid-pattern flex aspect-video items-center justify-center bg-[#f3f4f6] text-[#1f2937]/25">
                      <Newspaper size={36} />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-base font-black leading-snug text-[#1f2937] group-hover:text-[#c4000b]">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{post.summary}</p>
                    <div className="mt-4 flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(post.createdat)}</span>
                      <span className="flex items-center gap-0.5 text-[#c4000b]">Đọc thêm<ChevronRight size={12} /></span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default NewsPage;
