import React, { useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { DataTable } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { useProducts } from '@/features/products/hooks/useProducts';
import type { Product } from '@/features/products/api/productsApi';
import { productsApi } from '@/features/products/api/productsApi';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { ProductFormWizard } from './ProductFormWizard';
import { ProductEditModal } from './ProductEditModal';
import { brandsApi } from '@/features/brands/api/brandsApi';
import { categoriesApi } from '@/features/categories/api/categoriesApi';
import axios from 'axios';
import { useAuth } from '@/features/auth/context/AuthContext';

const PAGE_SIZE = 10;

const AdminProducts: React.FC = () => {
  const { user } = useAuth();
  const { products, loading, error, refetch, deleteProduct } = useProducts();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);

  // New Filters
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDiscount, setFilterDiscount] = useState(false);

  // Lookups
  const [brands, setBrands] = React.useState<{brandid: number, brandname: string}[]>([]);
  const [categories, setCategories] = React.useState<{categoryid: number, categoryname: string}[]>([]);

  React.useEffect(() => {
    brandsApi.getAll().then(r => setBrands(r.data));
    categoriesApi.getAll().then(r => setCategories(r.data));
  }, []);

  // Filter & paginate
  const filtered = products.filter(p => {
    const matchSearch = p.productname.toLowerCase().includes(search.toLowerCase()) || (p.brand?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchBrand = filterBrand ? p.brand?.id.toString() === filterBrand : true;
    const matchCategory = filterCategory ? p.category?.id.toString() === filterCategory : true;
    const matchDiscount = filterDiscount ? p.productvariants?.some(v => v.saleprice && v.saleprice < v.baseprice) : true;
    return matchSearch && matchBrand && matchCategory && matchDiscount;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => setWizardOpen(true);
  const openEdit = (product: Product) => setEditingProductId(product.productid);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await deleteProduct(id);
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? err.response?.data?.message
        : null;
      alert(message || 'Không thể xóa sản phẩm này.');
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
          <p className="text-xs text-slate-400 mt-0.5">{p.category?.name ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Thương hiệu',
      render: (p: Product) => (
        <span className="inline-flex px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-md">
          {p.brand?.name ?? '—'}
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
          {user?.rolename === 'Admin' && (
            <button onClick={() => handleDelete(p.productid)} className="px-2.5 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-md font-semibold transition-colors">
              Xóa
            </button>
          )}
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
        {user?.rolename !== 'Content' && (
          <Button onClick={openCreate} size="sm">
            + Thêm sản phẩm
          </Button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="w-64">
          <Input
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filterBrand} onChange={e => setFilterBrand(e.target.value)}>
          <option value="">Tất cả Thương hiệu</option>
          {brands.map(b => <option key={b.brandid} value={b.brandid}>{b.brandname}</option>)}
        </select>
        <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
          <option value="">Tất cả Danh mục</option>
          {categories.map(c => <option key={c.categoryid} value={c.categoryid}>{c.categoryname}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={filterDiscount} onChange={e => setFilterDiscount(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500" />
          Đang giảm giá
        </label>
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

      <ProductEditModal
        productId={editingProductId}
        brands={brands}
        categories={categories}
        onClose={() => setEditingProductId(null)}
        onSaved={async () => {
          await refetch();
          setEditingProductId(null);
        }}
      />

      <ProductFormWizard 
        isOpen={wizardOpen} 
        onClose={() => setWizardOpen(false)} 
        onSubmit={async (data) => {
          await productsApi.createFull(data);
          await refetch();
        }}
      />
    </div>
  );
};

export default AdminProducts;
