import React, { useState, useEffect } from 'react';
import { slidersApi } from '@/features/content/api/slidersApi';
import type { Slider } from '@/features/content/api/slidersApi';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';

const AdminSliders: React.FC = () => {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Slider> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSliders();
  }, []);

  const fetchSliders = async () => {
    setLoading(true);
    try {
      const data = await slidersApi.getAll();
      setSliders(data);
    } catch {
      alert('Không thể tải danh sách sliders.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing({ title: '', imageurl: '', linkurl: '', displayorder: 0, isactive: true });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (s: Slider) => {
    setEditing({ ...s });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing?.title?.trim() || !editing?.imageurl?.trim()) {
      setError('Tiêu đề và Đường dẫn ảnh là bắt buộc.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        title: editing.title,
        imageurl: editing.imageurl,
        linkurl: editing.linkurl || '',
        displayorder: editing.displayorder ?? 0,
        isactive: editing.isactive ?? true,
      };
      
      if (editing.sliderid) {
        await slidersApi.update(editing.sliderid, data);
      } else {
        await slidersApi.create(data);
      }
      await fetchSliders();
      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || err.response?.data?.Message || 'Lỗi khi lưu thông tin. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa slider này?')) return;
    try {
      await slidersApi.delete(id);
      setSliders(prev => prev.filter(s => s.sliderid !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Không thể xóa slider.');
    }
  };

  const toggleActive = async (s: Slider) => {
    try {
      await slidersApi.update(s.sliderid, {
        title: s.title,
        imageurl: s.imageurl,
        linkurl: s.linkurl,
        displayorder: s.displayorder,
        isactive: !s.isactive,
      });
      await fetchSliders();
    } catch (err: any) {
      alert(err.response?.data?.message || err.response?.data?.Message || 'Không thể cập nhật trạng thái.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản lý Sliders</h1>
          <p className="text-slate-500 text-sm mt-1">Quản lý các slide trình chiếu trang chủ</p>
        </div>
        <Button onClick={openCreate}>+ Thêm Slider</Button>
      </div>

      <DataTable
        columns={[
          { key: 'sliderid', header: 'ID', render: (s: any) => <span>{s.sliderid}</span> },
          { 
            key: 'imageurl',
            header: 'Hình ảnh', 
            render: (s: any) => <img src={s.imageurl} alt={s.title} className="h-10 w-24 object-cover rounded" />
          },
          { key: 'title', header: 'Tiêu đề', render: (s: any) => <span className="font-bold text-slate-800">{s.title}</span> },
          { key: 'displayorder', header: 'Thứ tự hiển thị', render: (s: any) => <span>{s.displayorder}</span> },
          { 
            key: 'isactive',
            header: 'Trạng thái', 
            render: (s: any) => (
              <button 
                onClick={() => toggleActive(s)}
                className={`px-3 py-1 rounded-full text-xs font-bold ${s.isactive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
              >
                {s.isactive ? 'Hiển thị' : 'Đang ẩn'}
              </button>
            )
          },
          {
            key: 'actions',
            header: 'Thao tác',
            render: (s: any) => (
              <div className="flex gap-2">
                <button onClick={() => openEdit(s)} className="px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-xs font-bold">Sửa</button>
                <button onClick={() => handleDelete(s.sliderid)} className="px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 text-xs font-bold">Xóa</button>
              </div>
            )
          }
        ]}
        data={sliders}
        keyField="sliderid"
        loading={loading}
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing?.sliderid ? 'Sửa Slider' : 'Thêm Slider mới'}>
        <div className="space-y-4">
          <Input 
            label="Tiêu đề (*)" 
            value={editing?.title || ''} 
            onChange={e => setEditing({ ...editing, title: e.target.value })} 
          />
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
            label="Thứ tự hiển thị" 
            type="number"
            value={editing?.displayorder?.toString() || '0'} 
            onChange={e => setEditing({ ...editing, displayorder: parseInt(e.target.value) || 0 })} 
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
              Kích hoạt Slider này
            </label>
          </div>

          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={closeModal} disabled={saving}>Hủy</Button>
            <Button onClick={handleSave} isLoading={saving}>Lưu Slider</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminSliders;
