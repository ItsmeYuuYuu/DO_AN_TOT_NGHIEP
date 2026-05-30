import React, { useState, useMemo } from 'react';
import { useSuppliers } from '@/features/suppliers/hooks/useSuppliers';
import type { Supplier } from '@/features/suppliers/api/suppliersApi';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
import { Plus, Edit2, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 10;

const AdminSuppliers: React.FC = () => {
  const { suppliers, loading, error, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const navigate = useNavigate();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterContact, setFilterContact] = useState('all'); // all, with_phone, no_phone
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const [formData, setFormData] = useState({
    suppliername: '',
    contactphone: '',
    address: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = useMemo(() => suppliers.filter(s => {
    const matchSearch = search === '' || 
      s.suppliername.toLowerCase().includes(search.toLowerCase()) || 
      (s.contactphone ?? '').includes(search);
      
    const matchFilter = filterContact === 'all' || 
      (filterContact === 'with_phone' && s.contactphone) || 
      (filterContact === 'no_phone' && !s.contactphone);
      
    return matchSearch && matchFilter;
  }), [suppliers, search, filterContact]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setFormData({ suppliername: '', contactphone: '', address: '' });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setFormData({ 
      suppliername: s.suppliername, 
      contactphone: s.contactphone ?? '', 
      address: s.address ?? '' 
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.supplierid, formData);
      } else {
        await createSupplier(formData);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Có lỗi xảy ra khi lưu dữ liệu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleteError(null);
    try {
      await deleteSupplier(id);
      setDeleteConfirmId(null);
      if (paged.length === 1 && page > 1) setPage(page - 1);
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Không thể xóa nhà cung cấp này vì đang có ràng buộc dữ liệu.');
    }
  };

  const openDeleteConfirm = (id: number) => {
    setDeleteError(null);
    setDeleteConfirmId(id);
  };

  const handleCreatePO = (id: number) => {
    navigate(`/staff/purchase-orders?supplierId=${id}`);
  };

  const columns = [
    {
      key: 'supplierid',
      header: 'ID',
      className: 'w-16 font-mono text-slate-500',
    },
    {
      key: 'suppliername',
      header: 'Nhà cung cấp',
      render: (s: Supplier) => (
        <span className="font-bold text-slate-800">{s.suppliername}</span>
      )
    },
    {
      key: 'contactphone',
      header: 'Điện thoại',
      render: (s: Supplier) => (
        <span className={s.contactphone ? 'text-slate-700' : 'text-slate-400 italic'}>
          {s.contactphone || 'Chưa có'}
        </span>
      )
    },
    {
      key: 'address',
      header: 'Địa chỉ',
      render: (s: Supplier) => (
         <span className="text-slate-600 truncate block max-w-[200px]" title={s.address}>{s.address || '—'}</span>
      )
    },
    {
      key: 'deeplink',
      header: 'Nhập hàng',
      className: 'w-36 text-center',
      render: (s: Supplier) => (
        <Button variant="outline" size="sm" onClick={() => handleCreatePO(s.supplierid)} className="w-full flex items-center justify-center gap-2">
          <ExternalLink size={14} /> Tạo PO
        </Button>
      )
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-24 text-right',
      render: (s: Supplier) => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => handleOpenEdit(s)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 size={16} />
          </button>
          <button onClick={() => openDeleteConfirm(s.supplierid)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Quản lý Nhà cung cấp</h2>
          <p className="text-sm text-slate-500 mt-1">
            {loading ? 'Đang tải...' : `${filtered.length} nhà cung cấp`}
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="flex items-center gap-2">
          <Plus size={18} /> Thêm NCC
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {['all', 'with_phone', 'no_phone'].map(f => (
            <button
              key={f}
              onClick={() => { setFilterContact(f); setPage(1); }}
              className={`text-xs font-semibold px-4 py-2 rounded-full border transition-all ${
                filterContact === f
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                  : 'border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              {f === 'all' ? 'Tất cả' : f === 'with_phone' ? 'Có SĐT' : 'Thiếu SĐT'}
            </button>
          ))}
        </div>
        
        <div className="max-w-md">
           <Input 
             placeholder="Tìm kiếm theo Tên hoặc Số điện thoại..." 
             value={search}
             onChange={e => { setSearch(e.target.value); setPage(1); }}
           />
        </div>
      </div>

      <DataTable columns={columns} data={paged} keyField="supplierid" loading={loading} />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemCount={filtered.length}
        pageSize={PAGE_SIZE}
      />

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => !isSubmitting && setIsModalOpen(false)} title={editingSupplier ? `Sửa thông tin NCC #${editingSupplier.supplierid}` : 'Thêm Nhà cung cấp'}>
        <form onSubmit={handleSave} className="space-y-4">
          {formError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{formError}</div>}
          
          <Input 
            label="Tên nhà cung cấp *" 
            required 
            maxLength={100}
            value={formData.suppliername}
            onChange={e => setFormData({...formData, suppliername: e.target.value})}
          />
          
          <Input 
            label="Số điện thoại" 
            type="tel"
            maxLength={20}
            value={formData.contactphone}
            onChange={e => setFormData({...formData, contactphone: e.target.value})}
          />
          
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Địa chỉ</label>
            <textarea 
               className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 transition-all resize-none"
               rows={3}
               maxLength={255}
               value={formData.address}
               onChange={e => setFormData({...formData, address: e.target.value})}
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Hủy</Button>
            <Button type="submit" className="flex-1" isLoading={isSubmitting}>{editingSupplier ? 'Lưu cập nhật' : 'Thêm mới'}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} title="Xác nhận xóa">
        <div className="space-y-6">
          <p className="text-slate-600">Bạn có chắc chắn muốn xóa nhà cung cấp này không? Hành động này không thể hoàn tác.</p>
          {deleteError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{deleteError}</div>}
          <div className="flex gap-3">
             <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirmId(null)}>Hủy</Button>
             <Button variant="primary" className="flex-1 bg-red-600 hover:bg-red-700 shadow-red-600/20" onClick={() => handleDelete(deleteConfirmId!)}>Xóa NCC</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminSuppliers;
