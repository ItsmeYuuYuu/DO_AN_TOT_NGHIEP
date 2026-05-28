import React, { useState, useEffect } from 'react';
import { newsApi } from '@/features/content/api/newsApi';
import type { News as NewsItem } from '@/features/content/api/newsApi';
import { Calendar, User, ChevronRight, X } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';

const NewsPage: React.FC = () => {
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<NewsItem | null>(null);

  useEffect(() => {
    newsApi.getActive()
      .then(res => setNewsList(res))
      .catch(() => setNewsList([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-8 h-1 bg-blue-600 rounded-full" />
            <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Tin tức & Công nghệ</h1>
            <span className="w-8 h-1 bg-blue-600 rounded-full" />
          </div>
          <p className="text-slate-400 text-sm">Cập nhật những tin tức công nghệ mới nhất</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                <Skeleton className="w-full aspect-video" />
                <div className="p-4">
                  <Skeleton className="w-3/4 h-5 mb-3" />
                  <Skeleton className="w-full h-3 mb-1.5" />
                  <Skeleton className="w-2/3 h-3" />
                </div>
              </div>
            ))}
          </div>
        ) : newsList.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">📰</div>
            <h2 className="text-xl font-bold text-slate-600 mb-2">Chưa có bài viết nào</h2>
            <p className="text-slate-400 text-sm">Hãy quay lại sau nhé!</p>
          </div>
        ) : (
          <>
            {/* Featured post */}
            {newsList[0] && (
              <div
                className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden mb-8 cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => setSelectedPost(newsList[0])}
              >
                <div className="md:flex">
                  {newsList[0].thumbnail ? (
                    <img
                      src={newsList[0].thumbnail}
                      alt={newsList[0].title}
                      className="w-full md:w-2/5 aspect-video object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-full md:w-2/5 aspect-video bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      <span className="text-white text-5xl">📰</span>
                    </div>
                  )}
                  <div className="p-6 flex flex-col justify-center">
                    <span className="inline-block bg-blue-100 text-blue-700 text-[10px] font-black uppercase px-2 py-1 rounded-full mb-3 w-fit">
                      Nổi bật
                    </span>
                    <h2 className="text-xl font-black text-slate-800 mb-3 group-hover:text-blue-600 transition-colors leading-snug">
                      {newsList[0].title}
                    </h2>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4 line-clamp-3">{newsList[0].summary}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(newsList[0].createdat)}</span>
                      {newsList[0].authorName && <span className="flex items-center gap-1"><User size={12} />{newsList[0].authorName}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {newsList.slice(1).map(post => (
                <div
                  key={post.postid}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 group"
                  onClick={() => setSelectedPost(post)}
                >
                  {post.thumbnail ? (
                    <img src={post.thumbnail} alt={post.title} className="w-full aspect-video object-cover"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                      <span className="text-slate-400 text-3xl">📄</span>
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-black text-slate-800 mb-2 text-sm leading-snug group-hover:text-blue-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2 mb-3">{post.summary}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1"><Calendar size={11} />{formatDate(post.createdat)}</span>
                      <span className="text-blue-500 font-bold flex items-center gap-0.5">Đọc thêm<ChevronRight size={12} /></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedPost(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mt-8 mb-8 overflow-hidden"
            onClick={e => e.stopPropagation()}>
            {selectedPost.thumbnail && (
              <img src={selectedPost.thumbnail} alt={selectedPost.title} className="w-full aspect-video object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-black text-slate-800 leading-snug pr-4">{selectedPost.title}</h2>
                <button onClick={() => setSelectedPost(null)} className="text-slate-400 hover:text-slate-600 shrink-0"><X size={20} /></button>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 mb-5">
                <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(selectedPost.createdat)}</span>
                {selectedPost.authorName && <span className="flex items-center gap-1"><User size={12} />{selectedPost.authorName}</span>}
              </div>
              <div className="prose prose-sm max-w-none text-slate-600 leading-relaxed whitespace-pre-wrap">
                {selectedPost.content || selectedPost.summary}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewsPage;
