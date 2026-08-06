import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, ChevronRight, Newspaper, User } from 'lucide-react';
import { newsApi } from '@/features/content/api/newsApi';
import type { News as NewsItem } from '@/features/content/api/newsApi';
import { Skeleton } from '@/components/Skeleton';
import { Seo } from '@/components/Seo';
import { buildSeoDescription } from '@/utils/seoUtils';
import { RichTextContent } from '@/components/RichTextContent';
import { parseApiDate, VIETNAM_TIME_ZONE } from '@/utils/formatters';

const formatDate = (date?: string) =>
  date
    ? parseApiDate(date).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: VIETNAM_TIME_ZONE,
      })
    : '';

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
    const description = buildSeoDescription(detailPost?.summary || detailPost?.content, 'Tin tức công nghệ mới nhất từ Cuồng Điện Thoại.');

    return (
      <div className="customer-shell min-h-screen pb-16">
        <Seo
          title={detailPost ? `${detailPost.title} - Cuồng Điện Thoại` : 'Tin tức công nghệ - Cuồng Điện Thoại'}
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
              <h1 className="text-3xl font-semibold tracking-[-0.025em] text-[#1f2937]">Không tìm thấy bài viết</h1>
              <p className="mt-3 text-sm text-slate-500">Bài viết có thể đã bị ẩn hoặc đường dẫn không còn tồn tại.</p>
            </div>
          ) : (
            <article className="customer-panel overflow-hidden bg-white">
              {detailPost.thumbnail && (
                <img
                  src={detailPost.thumbnail}
                  alt={detailPost.title}
                  width={1280}
                  height={720}
                  className="aspect-video w-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
                />
              )}
              <div className="p-6 md:p-10">
                <p className="customer-label">Tin công nghệ</p>
                <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.025em] text-[#1f2937] md:text-5xl">
                  {detailPost.title}
                </h1>
                <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(detailPost.createdat)}</span>
                  {detailPost.authorName && <span className="flex items-center gap-1"><User size={12} />{detailPost.authorName}</span>}
                </div>
                {detailPost.summary && (
                  <p className="mt-6 text-base font-semibold leading-7 text-slate-600">{detailPost.summary}</p>
                )}
                <RichTextContent
                  html={detailPost.content || detailPost.summary || ''}
                  className="mt-8"
                />
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
        title="Tin tức công nghệ - Cuồng Điện Thoại"
        description="Cap nhat tin tuc smartphone, xu huong cong nghe va noi dung giup ban chon dien thoai phu hop hon."
        canonicalPath="/news"
        type="article"
      />
      <section className="border-b customer-rule bg-[#ffffff] px-4 py-8">
        <div className="customer-container flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="customer-label">Tin công nghệ</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.03em] text-[#1f2937] md:text-[2.75rem]">
              Tin tức & công nghệ
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Cập nhật sản phẩm, xu hướng smartphone và các nội dung giúp bạn chọn máy tỉnh táo hơn.
            </p>
          </div>
          <div className="flex w-fit items-center gap-3 rounded-full border border-[#f3b8bd] bg-[#fff7f7] px-5 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#c4000b] shadow-sm">
              <Newspaper size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#9f2730]">Nội dung đang hiển thị</p>
              <p className="text-base font-bold text-[#1f2937]">{newsList.length} bài viết</p>
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
            <h2 className="text-3xl font-semibold tracking-[-0.025em] text-[#1f2937]">Chưa có bài viết nào</h2>
            <p className="mt-3 text-sm text-slate-500">Hãy quay lại sau để đọc thêm nội dung mới.</p>
          </div>
        ) : (
          <>
            {featured && (
              <Link
                to={getNewsPath(featured)}
                className="mb-8 grid overflow-hidden rounded-[24px] border border-[#e5e7eb] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.09)] transition hover:-translate-y-0.5 hover:border-[#f3b8bd] hover:shadow-[0_22px_50px_rgba(15,23,42,0.13)] md:grid-cols-[0.95fr_1.05fr]"
              >
                {featured.thumbnail ? (
                  <img
                    src={featured.thumbnail}
                    alt={featured.title}
                    width={1280}
                    height={720}
                    className="aspect-video h-full w-full object-cover md:aspect-auto"
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="customer-grid-pattern flex min-h-72 items-center justify-center bg-[#1f2937] text-[#ffd166]">
                    <Newspaper size={68} />
                  </div>
                )}
                <div className="flex flex-col justify-center p-6 md:p-9">
                  <span className="mb-4 w-fit rounded-full bg-[#fff1f2] px-3 py-1.5 text-[11px] font-bold text-[#c4000b]">
                    Nổi bật
                  </span>
                  <h2 className="text-2xl font-semibold leading-[1.25] tracking-[-0.025em] text-[#1f2937] md:text-[2rem]">
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
                <Link
                  key={post.postid}
                  to={getNewsPath(post)}
                  className="group overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_12px_30px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:border-[#f3b8bd] hover:shadow-[0_18px_38px_rgba(15,23,42,0.11)]"
                >
                  {post.thumbnail ? (
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      width={800}
                      height={450}
                      className="aspect-video w-full object-cover"
                      loading="lazy"
                      decoding="async"
                      onError={event => { (event.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="customer-grid-pattern flex aspect-video items-center justify-center bg-[#f3f4f6] text-[#1f2937]/25">
                      <Newspaper size={36} />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#1f2937] group-hover:text-[#c4000b]">
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
