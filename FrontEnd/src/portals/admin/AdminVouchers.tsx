import React, { useEffect, useMemo, useState } from 'react';
import apiClient from '@/api/apiClient';
import { Edit2, PackageCheck, Plus, Search, Tag, Trash2, X } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useProducts } from '@/features/products/hooks/useProducts';
import { confirmAction, notifyError } from '@/utils/notifications';
import { formatCurrency, formatDate, formatDateInput } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';

interface Voucher {
  vouchercode: string;
  discountamount?: number | null;
  discountpercentage?: number | null;
  minimumorderamount?: number | null;
  maximumdiscountamount?: number | null;
  applicableproductids: number[];
  validfrom?: string | null;
  validto?: string | null;
  isactive?: boolean;
}

interface VoucherForm extends Voucher {
  discounttype: 'percentage' | 'amount';
  applicationscope: 'all' | 'specific';
}

const createEmptyForm = (): VoucherForm => ({
  vouchercode: '',
  discounttype: 'percentage',
  discountpercentage: undefined,
  discountamount: undefined,
  minimumorderamount: undefined,
  maximumdiscountamount: undefined,
  applicationscope: 'all',
  applicableproductids: [],
  validfrom: null,
  validto: null,
  isactive: true,
});

const optionalNumber = (value: string) => value === '' ? undefined : Number(value);

const AdminVouchers: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.permissions?.includes('*') || user?.permissions?.includes('vouchers.manage');
  const { products, loading: productsLoading } = useProducts(true);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<VoucherForm>(createEmptyForm);
  const [productSearch, setProductSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<Voucher[]>('/Vouchers');
      setVouchers(response.data);
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Không thể tải danh sách voucher.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchVouchers(); }, []);

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase('vi-VN');
    if (!query) return products;
    return products.filter(product =>
      product.productname.toLocaleLowerCase('vi-VN').includes(query)
      || product.brand?.name.toLocaleLowerCase('vi-VN').includes(query)
      || product.category?.name.toLocaleLowerCase('vi-VN').includes(query));
  }, [productSearch, products]);

  const openAddModal = () => {
    setEditingCode(null);
    setFormData(createEmptyForm());
    setProductSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (voucher: Voucher) => {
    setEditingCode(voucher.vouchercode);
    setFormData({
      ...voucher,
      applicableproductids: voucher.applicableproductids ?? [],
      discounttype: voucher.discountpercentage ? 'percentage' : 'amount',
      applicationscope: voucher.applicableproductids?.length ? 'specific' : 'all',
    });
    setProductSearch('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCode(null);
    setProductSearch('');
  };

  const toggleProduct = (productId: number) => {
    setFormData(current => ({
      ...current,
      applicableproductids: current.applicableproductids.includes(productId)
        ? current.applicableproductids.filter(id => id !== productId)
        : [...current.applicableproductids, productId],
    }));
  };

  const validateForm = () => {
    if (formData.discounttype === 'percentage' && (!formData.discountpercentage || formData.discountpercentage > 100))
      return 'Phần trăm giảm phải lớn hơn 0 và không vượt quá 100%.';
    if (formData.discounttype === 'amount' && !formData.discountamount)
      return 'Số tiền giảm phải lớn hơn 0.';
    if (formData.applicationscope === 'specific' && formData.applicableproductids.length === 0)
      return 'Vui lòng chọn ít nhất một sản phẩm áp dụng.';
    if (formData.validfrom && formData.validto
      && formatDateInput(formData.validto) < formatDateInput(formData.validfrom))
      return 'Ngày kết thúc phải sau ngày bắt đầu.';
    return null;
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      notifyError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        vouchercode: formData.vouchercode.trim().toUpperCase(),
        discountamount: formData.discounttype === 'amount' ? formData.discountamount || null : null,
        discountpercentage: formData.discounttype === 'percentage' ? formData.discountpercentage || null : null,
        minimumorderamount: formData.minimumorderamount || null,
        maximumdiscountamount: formData.discounttype === 'percentage'
          ? formData.maximumdiscountamount || null
          : null,
        applicableproductids: formData.applicationscope === 'specific'
          ? formData.applicableproductids
          : [],
        validfrom: formData.validfrom ? `${formatDateInput(formData.validfrom)}T00:00:00` : null,
        validto: formData.validto ? `${formatDateInput(formData.validto)}T23:59:59.999` : null,
        isactive: formData.isactive,
      };

      if (editingCode) await apiClient.put(`/Vouchers/${editingCode}`, payload);
      else await apiClient.post('/Vouchers', payload);

      await fetchVouchers();
      closeModal();
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Có lỗi xảy ra khi lưu voucher.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!(await confirmAction('Bạn có chắc chắn muốn xóa voucher này?', { danger: true, confirmLabel: 'Xóa' }))) return;
    try {
      await apiClient.delete(`/Vouchers/${code}`);
      await fetchVouchers();
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Không thể xóa voucher.'));
    }
  };

  const formatDiscount = (voucher: Voucher) => voucher.discountpercentage
    ? `${voucher.discountpercentage}%${voucher.maximumdiscountamount ? ` · tối đa ${formatCurrency(voucher.maximumdiscountamount)}` : ''}`
    : formatCurrency(voucher.discountamount ?? 0);

  const formatCondition = (voucher: Voucher) => voucher.minimumorderamount
    ? `Từ ${formatCurrency(voucher.minimumorderamount)}`
    : 'Không yêu cầu tối thiểu';

  const formatScope = (voucher: Voucher) => voucher.applicableproductids?.length
    ? `${voucher.applicableproductids.length} sản phẩm được chọn`
    : 'Toàn bộ sản phẩm';

  const fmtDate = (date?: string | null) => date ? formatDate(date) : 'Không giới hạn';

  return (
    <div className="space-y-6">
      <section className="ops-hero flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <h1 className="ops-hero-title">Quản lý voucher</h1>
          <p className="text-sm text-slate-500">Cấu hình mức giảm, giá trị tối thiểu và phạm vi sản phẩm áp dụng.</p>
        </div>
        {canManage && (
          <button type="button" onClick={openAddModal} className="flex items-center gap-2 rounded-xl bg-[#e30613] px-4 py-2 font-bold text-white transition-colors hover:bg-[#c4000b]">
            <Plus size={18} /> Thêm voucher
          </button>
        )}
      </section>

      <div className="ops-card overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="p-4">Mã voucher</th>
              <th className="p-4">Mức giảm</th>
              <th className="p-4">Điều kiện</th>
              <th className="p-4">Phạm vi</th>
              <th className="p-4">Hiệu lực</th>
              <th className="p-4 text-center">Trạng thái</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={7} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-slate-400">Chưa có voucher nào</td></tr>
            ) : vouchers.map(voucher => (
              <tr key={voucher.vouchercode} className="transition-colors hover:bg-red-50/40">
                <td className="p-4 font-bold text-slate-800"><span className="flex items-center gap-2"><Tag size={16} className="text-orange-500" />{voucher.vouchercode}</span></td>
                <td className="p-4 text-sm font-bold text-[#c4000b]">{formatDiscount(voucher)}</td>
                <td className="p-4 text-sm text-slate-600">{formatCondition(voucher)}</td>
                <td className="p-4 text-sm text-slate-600">{formatScope(voucher)}</td>
                <td className="p-4 text-sm text-slate-500"><p>{fmtDate(voucher.validfrom)}</p><p className="mt-1 text-xs">đến {fmtDate(voucher.validto)}</p></td>
                <td className="p-4 text-center">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${voucher.isactive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {voucher.isactive ? 'Đang hoạt động' : 'Đã tắt'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {canManage && (
                    <div className="flex items-center justify-end gap-2">
                      <button type="button" aria-label={`Sửa ${voucher.vouchercode}`} onClick={() => openEditModal(voucher)} className="rounded-xl p-2 text-[#e30613] transition-colors hover:bg-red-50"><Edit2 size={16} /></button>
                      <button type="button" aria-label={`Xóa ${voucher.vouchercode}`} onClick={() => void handleDelete(voucher.vouchercode)} className="rounded-xl p-2 text-red-600 transition-colors hover:bg-red-50"><Trash2 size={16} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-lg font-black text-slate-800">{editingCode ? 'Sửa voucher' : 'Thêm voucher mới'}</h2>
                <p className="mt-1 text-xs text-slate-500">Thiết lập đầy đủ điều kiện trước khi kích hoạt mã.</p>
              </div>
              <button type="button" aria-label="Đóng" onClick={closeModal} className="rounded-xl p-2 text-slate-400 hover:bg-white hover:text-slate-700"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-black text-slate-800">Mức giảm và điều kiện</h3>
                  <label className="block text-xs font-bold uppercase text-slate-600">
                    Mã voucher
                    <input type="text" required disabled={!!editingCode} value={formData.vouchercode}
                      onChange={event => setFormData(current => ({ ...current, vouchercode: event.target.value.toUpperCase() }))}
                      className="mt-1 w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-bold uppercase outline-none focus:border-[#e30613] disabled:bg-slate-100" />
                  </label>

                  <div>
                    <p className="text-xs font-bold uppercase text-slate-600">Loại giảm giá</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {(['percentage', 'amount'] as const).map(type => (
                        <button key={type} type="button" onClick={() => setFormData(current => ({ ...current, discounttype: type }))}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${formData.discounttype === type ? 'border-[#e30613] bg-red-50 text-[#c4000b]' : 'border-slate-200 text-slate-600'}`}>
                          {type === 'percentage' ? 'Theo phần trăm' : 'Theo số tiền'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.discounttype === 'percentage' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-bold uppercase text-slate-600">Phần trăm giảm
                        <input type="number" required min="0.1" max="100" step="0.1" value={formData.discountpercentage ?? ''}
                          onChange={event => setFormData(current => ({ ...current, discountpercentage: optionalNumber(event.target.value) }))}
                          className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#e30613]" />
                      </label>
                      <label className="text-xs font-bold uppercase text-slate-600">Giảm tối đa
                        <input type="number" min="1000" step="1000" placeholder="Không giới hạn" value={formData.maximumdiscountamount ?? ''}
                          onChange={event => setFormData(current => ({ ...current, maximumdiscountamount: optionalNumber(event.target.value) }))}
                          className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#e30613]" />
                      </label>
                    </div>
                  ) : (
                    <label className="block text-xs font-bold uppercase text-slate-600">Số tiền giảm
                      <input type="number" required min="1000" step="1000" value={formData.discountamount ?? ''}
                        onChange={event => setFormData(current => ({ ...current, discountamount: optionalNumber(event.target.value) }))}
                        className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#e30613]" />
                    </label>
                  )}

                  <label className="block text-xs font-bold uppercase text-slate-600">Giá trị sản phẩm tối thiểu
                    <input type="number" min="0" step="1000" placeholder="Không yêu cầu" value={formData.minimumorderamount ?? ''}
                      onChange={event => setFormData(current => ({ ...current, minimumorderamount: optionalNumber(event.target.value) }))}
                      className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#e30613]" />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-bold uppercase text-slate-600">Từ ngày
                      <input type="date" value={formData.validfrom ? formatDateInput(formData.validfrom) : ''}
                        onChange={event => setFormData(current => ({ ...current, validfrom: event.target.value }))}
                        className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#e30613]" />
                    </label>
                    <label className="text-xs font-bold uppercase text-slate-600">Đến ngày
                      <input type="date" value={formData.validto ? formatDateInput(formData.validto) : ''}
                        onChange={event => setFormData(current => ({ ...current, validto: event.target.value }))}
                        className="mt-1 w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#e30613]" />
                    </label>
                  </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-slate-200 p-4">
                  <div>
                    <h3 className="font-black text-slate-800">Sản phẩm áp dụng</h3>
                    <p className="mt-1 text-xs text-slate-500">Ngưỡng tối thiểu và tiền giảm chỉ tính trên các sản phẩm đủ điều kiện.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setFormData(current => ({ ...current, applicationscope: 'all', applicableproductids: [] }))}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${formData.applicationscope === 'all' ? 'border-[#e30613] bg-red-50 text-[#c4000b]' : 'border-slate-200 text-slate-600'}`}>
                      Toàn bộ sản phẩm
                    </button>
                    <button type="button" onClick={() => setFormData(current => ({ ...current, applicationscope: 'specific' }))}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${formData.applicationscope === 'specific' ? 'border-[#e30613] bg-red-50 text-[#c4000b]' : 'border-slate-200 text-slate-600'}`}>
                      Sản phẩm được chọn
                    </button>
                  </div>

                  {formData.applicationscope === 'specific' && (
                    <>
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="search" value={productSearch} onChange={event => setProductSearch(event.target.value)} placeholder="Tìm tên, thương hiệu hoặc danh mục..."
                          className="w-full rounded-xl border-2 border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#e30613]" />
                      </div>
                      <p className="text-xs font-bold text-[#c4000b]">Đã chọn {formData.applicableproductids.length} sản phẩm</p>
                      <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                        {productsLoading ? <Skeleton className="h-28 w-full" /> : filteredProducts.map(product => {
                          const checked = formData.applicableproductids.includes(product.productid);
                          return (
                            <label key={product.productid} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${checked ? 'border-red-200 bg-red-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                              <input type="checkbox" checked={checked} onChange={() => toggleProduct(product.productid)} className="mt-0.5 h-4 w-4 accent-[#e30613]" />
                              <span className="min-w-0"><span className="block text-sm font-bold text-slate-800">{product.productname}</span><span className="mt-1 block text-xs text-slate-500">{product.brand?.name ?? 'Chưa có thương hiệu'} · {product.category?.name ?? 'Chưa có danh mục'}{!product.isactive ? ' · Ngừng kinh doanh' : ''}</span></span>
                            </label>
                          );
                        })}
                        {!productsLoading && filteredProducts.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Không tìm thấy sản phẩm.</p>}
                      </div>
                    </>
                  )}

                  {formData.applicationscope === 'all' && (
                    <div className="flex gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800"><PackageCheck size={20} className="shrink-0" /><p>Voucher có thể áp dụng cho mọi sản phẩm đang kinh doanh nếu đạt điều kiện giá trị tối thiểu.</p></div>
                  )}
                </section>
              </div>

              <label className="mt-5 flex items-center gap-2 rounded-xl bg-slate-50 p-3">
                <input type="checkbox" checked={!!formData.isactive} onChange={event => setFormData(current => ({ ...current, isactive: event.target.checked }))} className="h-4 w-4 accent-[#e30613]" />
                <span className="text-sm font-bold text-slate-700">Kích hoạt voucher</span>
              </label>

              <div className="mt-5 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-600 hover:bg-slate-200">Hủy</button>
                <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-[#e30613] py-2.5 font-bold text-white hover:bg-[#c4000b] disabled:opacity-60">{saving ? 'Đang lưu...' : 'Lưu voucher'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVouchers;
