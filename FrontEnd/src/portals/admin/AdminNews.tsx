import React, { useState, useEffect } from 'react';
import { newsApi } from '@/features/content/api/newsApi';
import type { News } from '@/features/content/api/newsApi';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';

const AdminNews: React.FC = () => {
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<News> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const data = await newsApi.getAll();
      setNews(data);
    } catch {
      alert('Không thể tải danh sách tin tức.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing({ title: '', summary: '', content: '', thumbnail: '', isactive: true });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (n: News) => {
    setEditing({ ...n });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing?.title?.trim()) {
      setError('Tiêu đề là bắt buộc.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        title: editing.title,
        summary: editing.summary || '',
        content: editing.content || '',
        thumbnail: editing.thumbnail || '',
        isactive: editing.isactive ?? true,
      };
      
      if (editing.postid) {
        await newsApi.update(editing.postid, data);
      } else {
        await newsApi.create(data);
      }
      await fetchNews();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.Message || 'Lỗi khi lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa tin tức này?')) return;
    try {
      await newsApi.delete(id);
      setNews(prev => prev.filter(n => n.postid !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Không thể xóa tin tức.');
    }
  };

  const toggleActive = async (n: News) => {
    try {
      await newsApi.update(n.postid, {
        title: n.title,
        summary: n.summary,
        content: n.content,
        thumbnail: n.thumbnail,
        isactive: !n.isactive,
      });
      await fetchNews();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Không thể cập nhật trạng thái.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản lý Tin tức</h1>
          <p className="text-slate-500 text-sm mt-1">Thêm, sửa, xóa các bài viết tin tức</p>
        </div>
        <Button onClick={openCreate}>+ Thêm tin tức</Button>
      </div>

      <DataTable
        columns={[
          { key: 'postid', header: 'ID', render: (n: any) => <span>{n.postid}</span> },
          { 
            key: 'thumbnail',
            header: 'Thumbnail', 
            render: (n: any) => n.thumbnail ? <img src={n.thumbnail} alt={n.title} className="h-10 w-16 object-cover rounded" /> : <div className="h-10 w-16 bg-slate-100 rounded" />
          },
          { key: 'title', header: 'Tiêu đề', render: (n: any) => <span className="font-bold text-slate-800">{n.title}</span> },
          { key: 'authorName', header: 'Tác giả', render: (n: any) => <span>{n.authorName}</span> },
          { 
            key: 'isactive',
            header: 'Trạng thái', 
            render: (n: any) => (
              <button 
                onClick={() => toggleActive(n)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${n.isactive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
              >
                {n.isactive ? 'Hiển thị' : 'Đang ẩn'}
              </button>
            )
          },
          {
            key: 'actions',
            header: 'Thao tác',
            render: (n: any) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(n)} className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs font-bold">Sửa</button>
                <button onClick={() => handleDelete(n.postid)} className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-bold">Xóa</button>
              </div>
            )
          }
        ]}
        data={news}
        keyField="postid"
        loading={loading}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing?.postid ? 'Sửa tin tức' : 'Thêm tin tức mới'}>
        <div className="space-y-4">
          <Input 
            label="Tiêu đề (*)" 
            value={editing?.title || ''} 
            onChange={e => setEditing({ ...editing, title: e.target.value })} 
          />
          <Input 
            label="Đường dẫn Thumbnail" 
            value={editing?.thumbnail || ''} 
            onChange={e => setEditing({ ...editing, thumbnail: e.target.value })} 
          />
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Tóm tắt</label>
            <textarea 
              className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none text-sm h-20"
              value={editing?.summary || ''} 
              onChange={e => setEditing({ ...editing, summary: e.target.value })} 
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-slate-700">Nội dung</label>
            <textarea 
              className="w-full border border-slate-200 rounded-xl p-3 focus:border-blue-500 focus:outline-none text-sm h-40"
              value={editing?.content || ''} 
              onChange={e => setEditing({ ...editing, content: e.target.value })} 
            />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="isactive" 
              checked={editing?.isactive ?? true} 
              onChange={e => setEditing({ ...editing, isactive: e.target.checked })} 
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="isactive" className="text-sm font-bold text-slate-700">
              Hiển thị bài viết này
            </label>
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={closeModal} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} isLoading={saving}>Lưu tin tức</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminNews;
