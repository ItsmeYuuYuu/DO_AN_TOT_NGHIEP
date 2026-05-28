import React, { useState, useEffect } from 'react';
import { bannersApi } from '@/features/content/api/bannersApi';
import type { Banner } from '@/features/content/api/bannersApi';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';

const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    setLoading(true);
    try {
      const data = await bannersApi.getAll();
      setBanners(data);
    } catch {
      alert('Không thể tải danh sách banners.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing({ imageurl: '', linkurl: '', position: '', isactive: true });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing({ ...b });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing?.imageurl?.trim()) {
      setError('Đường dẫn ảnh là bắt buộc.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        imageurl: editing.imageurl,
        linkurl: editing.linkurl || '',
        position: editing.position || '',
        isactive: editing.isactive ?? true,
      };
      
      if (editing.bannerid) {
        await bannersApi.update(editing.bannerid, data);
      } else {
        await bannersApi.create(data);
      }
      await fetchBanners();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.Message || 'Lỗi khi lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa banner này?')) return;
    try {
      await bannersApi.delete(id);
      setBanners(prev => prev.filter(b => b.bannerid !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Không thể xóa banner.');
    }
  };

  const toggleActive = async (b: Banner) => {
    try {
      await bannersApi.update(b.bannerid, {
        imageurl: b.imageurl,
        linkurl: b.linkurl,
        position: b.position,
        isactive: !b.isactive,
      });
      await fetchBanners();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Không thể cập nhật trạng thái.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản lý Banners</h1>
          <p className="text-slate-500 text-sm mt-1">Thêm, sửa, xóa các banner quảng cáo</p>
        </div>
        <Button onClick={openCreate}>+ Thêm Banner</Button>
      </div>

      <DataTable
        columns={[
          { key: 'bannerid', header: 'ID', render: (b: any) => <span>{b.bannerid}</span> },
          { 
            key: 'imageurl',
            header: 'Hình ảnh', 
            render: (b: any) => <img src={b.imageurl} alt="banner" className="h-10 w-24 object-cover rounded" />
          },
          { key: 'linkurl', header: 'Đường dẫn đích (Link)', render: (b: any) => <span className="text-xs text-blue-600 break-all">{b.linkurl}</span> },
          { key: 'position', header: 'Vị trí', render: (b: any) => <span>{b.position}</span> },
          { 
            key: 'isactive',
            header: 'Trạng thái', 
            render: (b: any) => (
              <button 
                onClick={() => toggleActive(b)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${b.isactive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
              >
                {b.isactive ? 'Hiển thị' : 'Đang ẩn'}
              </button>
            )
          },
          {
            key: 'actions',
            header: 'Thao tác',
            render: (b: any) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(b)} className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs font-bold">Sửa</button>
                <button onClick={() => handleDelete(b.bannerid)} className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-bold">Xóa</button>
              </div>
            )
          }
        ]}
        data={banners}
        keyField="bannerid"
        loading={loading}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing?.bannerid ? 'Sửa Banner' : 'Thêm Banner mới'}>
        <div className="space-y-4">
          <Input 
            label="Đường dẫn ảnh (*)" 
            value={editing?.imageurl || ''} 
            onChange={e => setEditing({ ...editing, imageurl: e.target.value })} 
          />
          {editing?.imageurl && (
            <div className="mt-2 border rounded-lg overflow-hidden">
              <img src={editing.imageurl} alt="Preview" className="w-full max-h-40 object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
            </div>
          )}
          <Input 
            label="Đường dẫn khi click (Link URL)" 
            value={editing?.linkurl || ''} 
            onChange={e => setEditing({ ...editing, linkurl: e.target.value })} 
          />
          <Input 
            label="Vị trí (VD: right_top, middle)" 
            value={editing?.position || ''} 
            onChange={e => setEditing({ ...editing, position: e.target.value })} 
          />

          <div className="flex items-center gap-2 mt-2">
            <input 
              type="checkbox" 
              id="isactive" 
              checked={editing?.isactive ?? true} 
              onChange={e => setEditing({ ...editing, isactive: e.target.checked })} 
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="isactive" className="text-sm font-bold text-slate-700">
              Kích hoạt Banner này
            </label>
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={closeModal} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} isLoading={saving}>Lưu Banner</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminBanners;
