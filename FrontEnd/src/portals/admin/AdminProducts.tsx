import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { useProducts } from '@/features/products/hooks/useProducts';
import type { Product } from '@/features/products/api/productsApi';
import { productsApi } from '@/features/products/api/productsApi';
import { formatCurrency, formatDate } from '@/utils/formatters';

const PAGE_SIZE = 10;

const AdminProducts: React.FC = () => {
  const { products, loading, error, refetch, deleteProduct } = useProducts();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter & paginate
  const filtered = products.filter(p =>
    p.productname.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand?.brandname ?? '').toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => { setEditing({ productname: '', description: '' }); setModalOpen(true); };
  const openEdit = (p: Product) => { setEditing({ ...p }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const handleSave = async () => {
    if (!editing?.productname?.trim()) return;
    setSaving(true);
    try {
      if (editing.productid) {
        await productsApi.update(editing.productid, editing);
      } else {
        await productsApi.create(editing as Partial<Product>);
      }
      await refetch();
      closeModal();
    } catch {
      alert('Lỗi khi lưu sản phẩm. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await deleteProduct(id);
    } catch {
      alert('Không thể xóa sản phẩm này.');
    }
  };

  const columns = [
    {
      key: 'productid',
      header: '#',
      render: (p: Product) => <span className="font-mono text-xs text-slate-500">#{p.productid}</span>,
      className: 'w-12',
    },
    {
      key: 'productname',
      header: 'Tên sản phẩm',
      render: (p: Product) => (
        <div>
          <p className="font-semibold text-slate-800 text-sm leading-snug line-clamp-1">{p.productname}</p>
          <p className="text-xs text-slate-400 mt-0.5">{p.category?.categoryname ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Thương hiệu',
      render: (p: Product) => (
        <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md">
          {p.brand?.brandname ?? '—'}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Giá bán',
      render: (p: Product) => {
        const v = p.productvariants?.[0];
        if (!v) return <span className="text-slate-400 text-xs">Chưa có variant</span>;
        return (
          <div>
            <p className="font-bold text-red-500 text-sm">{formatCurrency(v.saleprice ?? v.baseprice)}</p>
            {v.saleprice && v.saleprice < v.baseprice && (
              <p className="text-xs text-slate-400 line-through">{formatCurrency(v.baseprice)}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'createdat',
      header: 'Ngày tạo',
      render: (p: Product) => <span className="text-xs text-slate-500">{p.createdat ? formatDate(p.createdat) : '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-28',
      render: (p: Product) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(p)} className="px-2.5 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md font-semibold transition-colors">
            Sửa
          </button>
          <button onClick={() => handleDelete(p.productid)} className="px-2.5 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-md font-semibold transition-colors">
            Xóa
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800">Quản lý Sản phẩm</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? 'Đang tải...' : `${filtered.length} sản phẩm trong hệ thống`}
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          + Thêm sản phẩm
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="max-w-sm">
          <Input
            placeholder="Tìm kiếm tên sản phẩm, thương hiệu..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={paged}
        keyField="productid"
        loading={loading}
      />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        itemCount={filtered.length}
        pageSize={PAGE_SIZE}
      />

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing?.productid ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}
      >
        <div className="space-y-4">
          <Input
            label="Tên sản phẩm *"
            value={editing?.productname ?? ''}
            onChange={e => setEditing(prev => ({ ...prev, productname: e.target.value }))}
            placeholder="VD: iPhone 15 Pro Max 256GB"
          />
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1.5">Mô tả</label>
            <textarea
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 placeholder:text-slate-400 transition-all resize-none"
              rows={4}
              value={editing?.description ?? ''}
              onChange={e => setEditing(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả chi tiết sản phẩm..."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Danh mục (ID)</label>
              <input
                type="number"
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                value={editing?.categoryid ?? ''}
                onChange={e => setEditing(prev => ({ ...prev, categoryid: parseInt(e.target.value) || undefined }))}
                placeholder="1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1.5">Thương hiệu (ID)</label>
              <input
                type="number"
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500"
                value={editing?.brandid ?? ''}
                onChange={e => setEditing(prev => ({ ...prev, brandid: parseInt(e.target.value) || undefined }))}
                placeholder="1"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} isLoading={saving} className="flex-1">
              {editing?.productid ? 'Cập nhật' : 'Thêm mới'}
            </Button>
            <Button variant="secondary" onClick={closeModal} className="flex-1">
              Hủy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProducts;
