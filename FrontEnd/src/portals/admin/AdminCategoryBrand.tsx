import React, { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { Pagination } from '@/components/Pagination';
import { categoriesApi } from '@/features/categories/api/categoriesApi';
import { brandsApi } from '@/features/brands/api/brandsApi';
import type { Category } from '@/features/categories/api/categoriesApi';
import type { Brand } from '@/features/brands/api/brandsApi';

const PAGE_SIZE = 8;

// ─── Category Section ─────────────────────────────────────────────────────────
const CategorySection: React.FC = () => {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true); setError(null);
    try { const res = await categoriesApi.getAll(); setItems(res.data); }
    catch { setError('Không tải được danh mục.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = items.filter(i => i.categoryname.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setEditing({ categoryname: '', description: '' }); setModalOpen(true); };
  const openEdit = (c: Category) => { setEditing({ ...c }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!editing?.categoryname?.trim()) return;
    setSaving(true);
    try {
      if (editing.categoryid) {
        await categoriesApi.update(editing.categoryid, editing);
      } else {
        await categoriesApi.create({ categoryname: editing.categoryname, description: editing.description });
      }
      await fetchAll(); closeModal();
    } catch { alert('Lỗi khi lưu.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa danh mục này?')) return;
    try { await categoriesApi.delete(id); await fetchAll(); }
    catch { alert('Không thể xóa danh mục này.'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Danh mục sản phẩm <span className="text-slate-400 font-normal text-sm">({filtered.length})</span></h3>
        <Button size="sm" onClick={openCreate}>+ Thêm danh mục</Button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      <div className="max-w-xs">
        <Input placeholder="Tìm danh mục..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['#', 'Tên danh mục', 'Mô tả', 'Sản phẩm', 'Thao tác'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="skeleton h-4 w-3/4" /></td>))}</tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">Không có danh mục.</td></tr>
            ) : paged.map(cat => (
              <tr key={cat.categoryid} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-400">#{cat.categoryid}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{cat.categoryname}</td>
                <td className="px-4 py-3 text-sm text-slate-500 max-w-xs"><span className="line-clamp-1">{cat.description ?? '—'}</span></td>
                <td className="px-4 py-3"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">{(cat.products as unknown[])?.length ?? 0} sp</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(cat)} className="px-2.5 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md font-semibold">Sửa</button>
                    <button onClick={() => handleDelete(cat.categoryid)} className="px-2.5 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-md font-semibold">Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} itemCount={filtered.length} pageSize={PAGE_SIZE} />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing?.categoryid ? 'Sửa danh mục' : 'Thêm danh mục mới'} size="sm">
        <div className="space-y-4">
          <Input label="Tên danh mục *" value={editing?.categoryname ?? ''} onChange={e => setEditing(p => ({ ...p, categoryname: e.target.value }))} placeholder="VD: Điện thoại" />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Mô tả</label>
            <textarea className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 resize-none" rows={3} value={editing?.description ?? ''} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} placeholder="Mô tả ngắn..." />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} isLoading={saving} className="flex-1">{editing?.categoryid ? 'Cập nhật' : 'Thêm mới'}</Button>
            <Button variant="secondary" onClick={closeModal} className="flex-1">Hủy</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Brand Section ────────────────────────────────────────────────────────────
const BrandSection: React.FC = () => {
  const [items, setItems] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true); setError(null);
    try { const res = await brandsApi.getAll(); setItems(res.data); }
    catch { setError('Không tải được thương hiệu.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = items.filter(i => i.brandname.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setEditing({ brandname: '' }); setModalOpen(true); };
  const openEdit = (b: Brand) => { setEditing({ ...b }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!editing?.brandname?.trim()) return;
    setSaving(true);
    try {
      if (editing.brandid) await brandsApi.update(editing.brandid, editing);
      else await brandsApi.create({ brandname: editing.brandname });
      await fetchAll(); closeModal();
    } catch { alert('Lỗi khi lưu.'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Xóa thương hiệu này?')) return;
    try { await brandsApi.delete(id); await fetchAll(); }
    catch { alert('Không thể xóa thương hiệu này.'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-800">Thương hiệu <span className="text-slate-400 font-normal text-sm">({filtered.length})</span></h3>
        <Button size="sm" onClick={openCreate}>+ Thêm thương hiệu</Button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>}
      <div className="max-w-xs">
        <Input placeholder="Tìm thương hiệu..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['#', 'Thương hiệu', 'Sản phẩm', 'Thao tác'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 4 }).map((_, j) => (<td key={j} className="px-4 py-3"><div className="skeleton h-4 w-3/4" /></td>))}</tr>
              ))
            ) : paged.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400 text-sm">Không có thương hiệu.</td></tr>
            ) : paged.map(b => (
              <tr key={b.brandid} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-400">#{b.brandid}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-800">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-600">
                      {b.brandname.charAt(0)}
                    </span>
                    {b.brandname}
                  </span>
                </td>
                <td className="px-4 py-3"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">{(b.products as unknown[])?.length ?? 0} sp</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(b)} className="px-2.5 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md font-semibold">Sửa</button>
                    <button onClick={() => handleDelete(b.brandid)} className="px-2.5 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-md font-semibold">Xóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} itemCount={filtered.length} pageSize={PAGE_SIZE} />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing?.brandid ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'} size="sm">
        <div className="space-y-4">
          <Input label="Tên thương hiệu *" value={editing?.brandname ?? ''} onChange={e => setEditing(p => ({ ...p, brandname: e.target.value }))} placeholder="VD: Apple, Samsung..." />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} isLoading={saving} className="flex-1">{editing?.brandid ? 'Cập nhật' : 'Thêm mới'}</Button>
            <Button variant="secondary" onClick={closeModal} className="flex-1">Hủy</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────
const AdminCategoryBrand: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black text-slate-800">Quản lý Danh mục & Thương hiệu</h2>
        <p className="text-sm text-slate-500">Phân loại sản phẩm trong hệ thống</p>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['categories', 'brands'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-all ${
              activeTab === tab ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'categories' ? '📁 Danh mục' : '🏷️ Thương hiệu'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {activeTab === 'categories' ? <CategorySection /> : <BrandSection />}
      </div>
    </div>
  );
};

export default AdminCategoryBrand;
