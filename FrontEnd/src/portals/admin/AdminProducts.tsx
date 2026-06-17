import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Boxes, Package, Plus, Search, Tags, Trash2, Wrench } from 'lucide-react';
import { Button } from '@/components/Button';
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
import { useAuth } from '@/features/auth/context/AuthContext';

const PAGE_SIZE = 10;

const AdminProducts: React.FC = () => {
  const { user } = useAuth();
  const { products, loading, error, refetch, deleteProduct } = useProducts();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [filterBrand, setFilterBrand] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDiscount, setFilterDiscount] = useState(false);
  const [brands, setBrands] = useState<{ brandid: number; brandname: string }[]>([]);
  const [categories, setCategories] = useState<{ categoryid: number; categoryname: string }[]>([]);

  useEffect(() => {
    brandsApi.getAll().then(response => setBrands(response.data)).catch(() => setBrands([]));
    categoriesApi.getAll().then(response => setCategories(response.data)).catch(() => setCategories([]));
  }, []);

  const filtered = useMemo(() => products.filter(product => {
    const keyword = search.trim().toLowerCase();
    const matchSearch =
      !keyword ||
      product.productname.toLowerCase().includes(keyword) ||
      (product.brand?.name ?? '').toLowerCase().includes(keyword) ||
      (product.series?.name ?? '').toLowerCase().includes(keyword);
    const matchBrand = filterBrand ? product.brand?.id.toString() === filterBrand : true;
    const matchCategory = filterCategory ? product.category?.id.toString() === filterCategory : true;
    const matchDiscount = filterDiscount
      ? product.productvariants?.some(variant => variant.saleprice && variant.saleprice < variant.baseprice)
      : true;
    return matchSearch && matchBrand && matchCategory && matchDiscount;
  }), [filterBrand, filterCategory, filterDiscount, products, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalVariants = products.reduce((total, product) => total + (product.productvariants?.length ?? 0), 0);
  const discountedProducts = products.filter(product =>
    product.productvariants?.some(variant => variant.saleprice && variant.saleprice < variant.baseprice),
  ).length;
  const totalStock = products.reduce(
    (total, product) => total + (product.productvariants ?? []).reduce((sum, variant) => sum + (variant.stockquantity ?? 0), 0),
    0,
  );

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này?')) return;
    try {
      await deleteProduct(id);
    } catch (err) {
      const message = axios.isAxiosError(err) ? err.response?.data?.message : null;
      alert(message || 'Không thể xóa sản phẩm này.');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilterBrand('');
    setFilterCategory('');
    setFilterDiscount(false);
    setPage(1);
  };

  const columns = [
    {
      key: 'productid',
      header: '#',
      render: (product: Product) => <span className="font-mono text-xs font-black text-slate-400">#{product.productid}</span>,
      className: 'w-16',
    },
    {
      key: 'productname',
      header: 'Sản phẩm',
      render: (product: Product) => {
        const firstVariant = product.productvariants?.[0];
        const image = firstVariant?.productimages?.find(item => item.ismain)?.imageurl ?? firstVariant?.productimages?.[0]?.imageurl;
        return (
          <div className="flex min-w-[280px] items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-slate-200 bg-slate-50">
              {image ? (
                <img src={image} alt={product.productname} className="h-full w-full object-contain p-1" />
              ) : (
                <Package size={18} className="text-slate-300" />
              )}
            </div>
            <div className="min-w-0">
              <p className="line-clamp-1 text-sm font-black text-[#10233f]">{product.productname}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {product.category?.name ?? 'Chưa có danh mục'} · {product.productvariants?.length ?? 0} biến thể
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'brand',
      header: 'Hãng / dòng',
      render: (product: Product) => (
        <div className="space-y-1">
          <span className="inline-flex bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
            {product.brand?.name ?? '—'}
          </span>
          {product.series?.name && <p className="text-[11px] font-bold text-slate-400">{product.series.name}</p>}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Giá đại diện',
      render: (product: Product) => {
        const variant = product.productvariants?.[0];
        if (!variant) return <span className="text-xs font-semibold text-slate-400">Chưa có biến thể</span>;
        return (
          <div>
            <p className="text-sm font-black text-[#db3d1c]">{formatCurrency(variant.saleprice ?? variant.baseprice)}</p>
            {variant.saleprice && variant.saleprice < variant.baseprice && (
              <p className="text-xs text-slate-400 line-through">{formatCurrency(variant.baseprice)}</p>
            )}
          </div>
        );
      },
    },
    {
      key: 'stock',
      header: 'Tồn kho',
      render: (product: Product) => {
        const stock = (product.productvariants ?? []).reduce((sum, variant) => sum + (variant.stockquantity ?? 0), 0);
        return (
          <span className={`inline-flex px-2.5 py-1 text-xs font-black ${stock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
            {stock > 0 ? `${stock} máy` : 'Hết hàng'}
          </span>
        );
      },
    },
    {
      key: 'createdat',
      header: 'Ngày tạo',
      render: (product: Product) => (
        <span className="text-xs font-semibold text-slate-500">{product.createdat ? formatDate(product.createdat) : '—'}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-36',
      render: (product: Product) => (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditingProductId(product.productid)}
            className="inline-flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100"
          >
            <Wrench size={12} /> Sửa
          </button>
          {user?.rolename === 'Admin' && (
            <button
              type="button"
              onClick={() => handleDelete(product.productid)}
              className="inline-flex items-center gap-1 bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-600 hover:bg-red-100"
            >
              <Trash2 size={12} /> Xóa
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <section className="ops-card overflow-hidden">
        <div className="grid gap-6 bg-[#10233f] p-6 text-white lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-orange-200">Product operations</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Quản lý sản phẩm</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-blue-100">
              Kiểm soát sản phẩm, biến thể, hình ảnh, tồn kho và chương trình giảm giá trước khi bán ra website.
            </p>
          </div>
          {user?.rolename !== 'Content' && (
            <Button onClick={() => setWizardOpen(true)} size="sm" className="inline-flex items-center gap-2 bg-[#ff5b35] hover:bg-[#e64925]">
              <Plus size={16} /> Thêm sản phẩm
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Tổng sản phẩm', value: products.length, icon: <Package size={19} />, tone: 'bg-blue-50 text-blue-700' },
          { label: 'Biến thể', value: totalVariants, icon: <Tags size={19} />, tone: 'bg-violet-50 text-violet-700' },
          { label: 'Tổng tồn kho', value: totalStock, icon: <Boxes size={19} />, tone: 'bg-emerald-50 text-emerald-700' },
          { label: 'Đang giảm giá', value: discountedProducts, icon: <Search size={19} />, tone: 'bg-orange-50 text-orange-700' },
        ].map(item => (
          <div key={item.label} className="ops-card p-4">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center ${item.tone}`}>{item.icon}</div>
            <p className="text-2xl font-black text-[#10233f]">{loading ? '...' : item.value}</p>
            <p className="text-xs font-bold text-slate-400">{item.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="ops-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={search}
              onChange={event => { setSearch(event.target.value); setPage(1); }}
              placeholder="Tìm sản phẩm, thương hiệu, dòng máy..."
              className="w-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm font-semibold outline-none focus:border-[#10233f] focus:bg-white"
            />
          </div>
          <select className="border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-[#10233f]" value={filterBrand} onChange={event => { setFilterBrand(event.target.value); setPage(1); }}>
            <option value="">Tất cả thương hiệu</option>
            {brands.map(brand => <option key={brand.brandid} value={brand.brandid}>{brand.brandname}</option>)}
          </select>
          <select className="border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-[#10233f]" value={filterCategory} onChange={event => { setFilterCategory(event.target.value); setPage(1); }}>
            <option value="">Tất cả danh mục</option>
            {categories.map(category => <option key={category.categoryid} value={category.categoryid}>{category.categoryname}</option>)}
          </select>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-black text-[#10233f]">
            <input type="checkbox" checked={filterDiscount} onChange={event => { setFilterDiscount(event.target.checked); setPage(1); }} className="accent-[#ff5b35]" />
            Đang giảm giá
          </label>
          {(search || filterBrand || filterCategory || filterDiscount) && (
            <button type="button" onClick={resetFilters} className="text-xs font-black uppercase tracking-wide text-slate-400 hover:text-[#10233f]">
              Xóa lọc
            </button>
          )}
        </div>
      </section>

      <DataTable columns={columns} data={paged} keyField="productid" loading={loading} emptyMessage="Chưa có sản phẩm phù hợp." />

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
        onSubmit={async data => {
          await productsApi.createFull(data);
          await refetch();
        }}
      />
    </div>
  );
};

export default AdminProducts;
