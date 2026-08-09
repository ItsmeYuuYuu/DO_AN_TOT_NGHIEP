import React, { useCallback, useEffect, useMemo, useState } from 'react';
import apiClient from '@/api/apiClient';
import { Check, Edit2, Filter, History, Package, Plus, Search, X } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { notifyError, notifySuccess } from '@/utils/notifications';
import { getApiErrorMessage } from '@/utils/apiError';
import { useAuth } from '@/features/auth/context/AuthContext';
import { formatDate, formatDateTime } from '@/utils/formatters';

interface InventoryItem {
  imei: string;
  variantid?: number;
  status?: string;
  importedat?: string;
  variantSku?: string;
  productName?: string;
}

interface InventoryTransaction {
  transactionid: number;
  orderid?: number;
  username?: string;
  transactiontype: string;
  fromstatus?: string;
  tostatus: string;
  note?: string;
  createdat?: string;
}

interface LowStockVariant {
  variantid: number;
  variantSku?: string;
  productName?: string;
  inStockQuantity: number;
}

interface VariantOption {
  variantid: number;
  sku: string;
  productName: string;
  condition?: string;
  inStockQuantity: number;
}

const splitImeis = (value: string) =>
  value
    .split(/[\s,;]+/)
    .map(imei => imei.trim())
    .filter(Boolean);

const normalizeSearch = (value?: string | number) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const StaffInventory: React.FC = () => {
  const { user } = useAuth();
  const canManageInventory = user?.permissions?.includes('*') || user?.permissions?.includes('inventory.manage');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [variantOptions, setVariantOptions] = useState<VariantOption[]>([]);
  const [lowStockVariants, setLowStockVariants] = useState<LowStockVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [variantSearch, setVariantSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<{ variantid: number | ''; status: string }>({
    variantid: '',
    status: 'InStock',
  });
  const [imeiBatch, setImeiBatch] = useState('');
  const [saving, setSaving] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const parsedImeis = useMemo(() => splitImeis(imeiBatch), [imeiBatch]);
  const normalizedSearchTerm = useMemo(() => normalizeSearch(searchTerm), [searchTerm]);
  const filteredItems = useMemo(() => {
    if (!normalizedSearchTerm) return items;

    return items.filter(item =>
      [item.imei, item.productName, item.variantSku]
        .some(value => normalizeSearch(value).includes(normalizedSearchTerm)));
  }, [items, normalizedSearchTerm]);
  const filteredLowStockVariants = useMemo(() => {
    if (!normalizedSearchTerm) return lowStockVariants;

    return lowStockVariants.filter(variant =>
      [variant.productName, variant.variantSku]
        .some(value => normalizeSearch(value).includes(normalizedSearchTerm)));
  }, [lowStockVariants, normalizedSearchTerm]);
  const filteredVariantOptions = useMemo(() => {
    const keyword = normalizeSearch(variantSearch);
    if (!keyword) return variantOptions;

    return variantOptions.filter(option =>
      [option.productName, option.sku, option.condition, option.variantid]
        .some(value => normalizeSearch(value).includes(keyword)));
  }, [variantOptions, variantSearch]);
  const selectedVariant = useMemo(
    () => variantOptions.find(option => option.variantid === Number(formData.variantid)),
    [formData.variantid, variantOptions],
  );

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/Inventory/status/${statusFilter}` : '/Inventory';
      const [itemsResponse, lowStockResponse, variantOptionsResponse] = await Promise.all([
        apiClient.get<InventoryItem[]>(url),
        apiClient.get<LowStockVariant[]>('/Inventory/low-stock', { params: { threshold: 2 } }),
        apiClient.get<VariantOption[]>('/Inventory/variant-options'),
      ]);
      setItems(itemsResponse.data);
      setLowStockVariants(canManageInventory ? lowStockResponse.data : []);
      setVariantOptions(variantOptionsResponse.data);
    } catch (error) {
      console.error(error);
      setItems([]);
      notifyError(getApiErrorMessage(error, 'Không thể tải dữ liệu tồn kho.'));
    } finally {
      setLoading(false);
    }
  }, [canManageInventory, statusFilter]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ variantid: '', status: 'InStock' });
    setImeiBatch('');
    setVariantSearch('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({ variantid: item.variantid ?? '', status: item.status ?? 'InStock' });
    setImeiBatch(item.imei);
    setVariantSearch('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const openHistory = async (item: InventoryItem) => {
    setHistoryItem(item);
    setTransactions([]);
    setHistoryLoading(true);
    try {
      const response = await apiClient.get<InventoryTransaction[]>(`/InventoryTransactions/imei/${item.imei}`);
      setTransactions(response.data);
    } catch {
      setTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canManageInventory) {
      notifyError('Tài khoản hiện tại chỉ có quyền xem kho hàng.');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        const correctedImei = imeiBatch.trim();
        if (!/^\d{15}$/.test(correctedImei)) {
          notifyError('IMEI phải gồm đúng 15 chữ số.');
          return;
        }

        await apiClient.put(`/Inventory/${encodeURIComponent(editingItem.imei)}/correct-imei`, { imei: correctedImei });
        notifySuccess(`Đã hiệu chỉnh IMEI ${editingItem.imei} thành ${correctedImei}.`);
      } else {
        const response = await apiClient.post<{ importedCount: number }>('/Inventory/import-batch', {
          variantid: Number(formData.variantid),
          imeis: parsedImeis,
        });
        notifySuccess(`Đã nhập kho ${response.data.importedCount} thiết bị theo IMEI thực tế.`);
      }

      closeModal();
      await fetchItems();
    } catch (error) {
      notifyError(getApiErrorMessage(error, editingItem ? 'Không thể hiệu chỉnh IMEI.' : 'Không thể nhập kho.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="ops-hero mb-6 flex items-center justify-between gap-4 p-6">
        <div>
          <h1 className="ops-hero-title">Quản lý thiết bị và IMEI</h1>
          <p className="mt-1 text-sm text-slate-500">Mỗi IMEI tương ứng với một máy vật lý thực tế trong kho.</p>
        </div>
        {canManageInventory ? (
          <button onClick={openAddModal} className="ops-hero-action">
            <Plus size={18} /> Nhập kho theo IMEI
          </button>
        ) : (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-slate-500">
            Chỉ xem
          </span>
        )}
      </div>

      <div className="mb-6 rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Tìm theo tên sản phẩm, SKU hoặc IMEI..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-11 text-sm font-medium outline-none transition focus:border-[#e30613] focus:bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                aria-label="Xóa từ khóa"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div className="relative">
            <Filter size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={event => setStatusFilter(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-bold text-slate-700 outline-none transition focus:border-[#e30613] focus:bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="InStock">Trong kho</option>
              <option value="Sold">Đã bán</option>
              <option value="Reserved">Đã giữ cho đơn hàng</option>
              <option value="Shipping">Đang giao</option>
              <option value="Defective">Lỗi</option>
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Đang hiển thị <span className="font-bold text-slate-700">{filteredItems.length}/{items.length}</span> thiết bị.
          Có thể tìm SKU trước khi bấm nhập kho.
        </p>
      </div>

      {lowStockVariants.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-amber-900">Cảnh báo tồn kho thấp</h2>
              <p className="text-sm text-amber-700">{lowStockVariants.length} SKU còn tối đa 2 máy sẵn sàng bán.</p>
            </div>
            <button onClick={openAddModal} className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">
              Nhập kho
            </button>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filteredLowStockVariants.slice(0, 6).map(variant => (
              <button
                type="button"
                key={variant.variantid}
                onClick={() => {
                  setFormData({ variantid: variant.variantid, status: 'InStock' });
                  setImeiBatch('');
                  setVariantSearch(`${variant.productName ?? ''} ${variant.variantSku ?? ''}`.trim());
                  setEditingItem(null);
                  setIsModalOpen(true);
                }}
                className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2 text-left hover:border-amber-400"
              >
                <p className="truncate text-xs font-bold text-slate-800">{variant.productName ?? `SKU #${variant.variantid}`}</p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-slate-400">{variant.variantSku ?? 'Không có SKU'}</span>
                  <span className={variant.inStockQuantity === 0 ? 'text-xs font-black text-red-600' : 'text-xs font-black text-amber-700'}>
                    {variant.inStockQuantity} máy
                  </span>
                </div>
              </button>
            ))}
            {filteredLowStockVariants.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-amber-300 bg-white/70 px-4 py-5 text-center text-sm text-amber-800">
                Không có SKU tồn kho thấp khớp với từ khóa đang tìm.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <th className="p-4">IMEI</th>
              <th className="p-4">Sản phẩm</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Ngày nhập</th>
              <th className="p-4 text-center">Trạng thái</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
            ) : filteredItems.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Không có thiết bị phù hợp.</td></tr>
            ) : filteredItems.map(item => (
              <tr key={item.imei} className="transition-colors hover:bg-red-50/40">
                <td className="flex items-center gap-2 p-4 font-bold text-slate-800"><Package size={16} className="text-[#e30613]" /> {item.imei}</td>
                <td className="p-4 text-sm font-bold text-slate-700">{item.productName || `Variant #${item.variantid}`}</td>
                <td className="p-4 text-sm text-slate-500">{item.variantSku}</td>
                <td className="p-4 text-sm text-slate-500">{item.importedat ? formatDate(item.importedat) : '—'}</td>
                <td className="p-4 text-center">
                  <span className={`inline-block rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    item.status === 'InStock' ? 'bg-green-100 text-green-700'
                      : item.status === 'Sold' ? 'bg-slate-100 text-slate-500'
                        : item.status === 'Shipping' ? 'bg-blue-50 text-blue-700'
                          : item.status === 'Defective' ? 'bg-red-100 text-red-700'
                            : 'bg-orange-100 text-orange-700'
                  }`}>{item.status}</span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => void openHistory(item)} className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100" title="Lịch sử kho"><History size={16} /></button>
                  {canManageInventory && (
                    <button
                      onClick={() => openEditModal(item)}
                      disabled={item.status !== 'InStock'}
                      className="rounded-2xl p-2 text-[#e30613] hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                      title={item.status === 'InStock' ? 'Hiệu chỉnh IMEI nhập nhầm' : 'Chỉ hiệu chỉnh IMEI khi máy còn trong kho'}
                    >
                      <Edit2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">{editingItem ? 'Hiệu chỉnh IMEI' : 'Nhập kho thiết bị'}</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {editingItem ? 'Chỉ sửa IMEI nhập nhầm cho máy còn trong kho; SKU và trạng thái được giữ nguyên.' : 'Chọn SKU rồi quét hoặc dán danh sách IMEI thực tế.'}
                </p>
              </div>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4 p-6">
              {!editingItem && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Sản phẩm / SKU *</label>
                <div className="relative">
                  <Search size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={variantSearch}
                    onChange={event => setVariantSearch(event.target.value)}
                    placeholder="Nhập tên sản phẩm hoặc SKU..."
                    className="h-11 w-full rounded-xl border-2 border-slate-200 pl-11 pr-4 text-sm font-medium outline-none focus:border-[#e30613]"
                    autoFocus={!editingItem}
                  />
                </div>
                <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                  {filteredVariantOptions.length === 0 ? (
                    <p className="px-3 py-6 text-center text-sm text-slate-400">Không tìm thấy sản phẩm hoặc SKU phù hợp.</p>
                  ) : (
                    filteredVariantOptions.slice(0, 50).map(option => {
                      const isSelected = option.variantid === Number(formData.variantid);
                      return (
                        <button
                          type="button"
                          key={option.variantid}
                          onClick={() => {
                            setFormData({ ...formData, variantid: option.variantid });
                            setVariantSearch(`${option.productName} ${option.sku}`);
                          }}
                          className={`mb-1 flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition last:mb-0 ${
                            isSelected
                              ? 'border-red-200 bg-red-50'
                              : 'border-transparent bg-white hover:border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isSelected ? 'bg-[#e30613] text-white' : 'bg-slate-100 text-slate-400'
                          }`}>
                            {isSelected ? <Check size={16} /> : <Package size={15} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-black text-slate-800">{option.productName}</span>
                            <span className="block truncate text-xs text-slate-500">{option.sku}</span>
                          </span>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                            option.inStockQuantity === 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {option.inStockQuantity} máy
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
                {selectedVariant && (
                  <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    Đã chọn <span className="font-black">{selectedVariant.productName}</span>
                    {' — '}<span className="font-bold">{selectedVariant.sku}</span>
                  </p>
                )}
              </div>
              )}

              {editingItem ? (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">Sản phẩm / SKU</label>
                    <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-sm font-black text-slate-800">{editingItem.productName || `Variant #${editingItem.variantid}`}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{editingItem.variantSku || 'Không có SKU'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-slate-600">IMEI thực tế *</label>
                    <input
                      required
                      autoFocus
                      value={imeiBatch}
                      onChange={event => setImeiBatch(event.target.value.replace(/\D/g, '').slice(0, 15))}
                      inputMode="numeric"
                      maxLength={15}
                      className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 text-sm font-bold outline-none focus:border-[#e30613]"
                    />
                    <p className="mt-2 text-xs text-slate-500">Chỉ hiệu chỉnh khi nhập nhầm và máy còn trong kho. Không thể sửa IMEI đã giữ đơn, giao, bán, bảo hành hoặc đổi trả.</p>
                  </div>
                </>
              ) : (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase text-slate-600">Danh sách IMEI *</label>
                    <span className="text-xs font-bold text-[#e30613]">{parsedImeis.length} thiết bị</span>
                  </div>
                  <textarea
                    required
                    rows={7}
                    value={imeiBatch}
                    onChange={event => setImeiBatch(event.target.value)}
                    placeholder={'Mỗi dòng một IMEI gồm đúng 15 chữ số\nVí dụ:\n356789012345678\n356789012345679'}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm focus:border-[#e30613] focus:outline-none"
                  />
                  <p className="mt-2 text-xs text-slate-500">Có thể dùng máy quét mã vạch; hệ thống tự tách theo dòng, dấu phẩy hoặc khoảng trắng và chặn IMEI trùng.</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 py-2.5 font-bold text-slate-600 hover:bg-slate-200">Hủy</button>
                <button
                  type="submit"
                  disabled={saving || (editingItem ? !/^\d{15}$/.test(imeiBatch.trim()) : formData.variantid === '' || parsedImeis.length === 0)}
                  className="flex-1 rounded-xl bg-[#e30613] py-2.5 font-bold text-white hover:bg-[#c4000b] disabled:opacity-60"
                >
                  {saving ? 'Đang lưu...' : editingItem ? 'Lưu IMEI đã hiệu chỉnh' : `Nhập kho ${parsedImeis.length} máy`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-800">Lịch sử giao dịch kho</h2>
                <p className="text-xs font-bold text-[#e30613]">{historyItem.imei}</p>
              </div>
              <button onClick={() => setHistoryItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-6">
              {historyLoading ? <Skeleton className="h-24 w-full" /> : transactions.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">IMEI này chưa có lịch sử giao dịch.</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map(transaction => (
                    <div key={transaction.transactionid} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-slate-800">{transaction.transactiontype}</p>
                          <p className="mt-1 text-xs text-slate-500">{transaction.fromstatus ?? 'Khởi tạo'} → <span className="font-bold text-[#c4000b]">{transaction.tostatus}</span></p>
                        </div>
                        <p className="text-xs text-slate-400">{transaction.createdat ? formatDateTime(transaction.createdat) : '—'}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                        {transaction.orderid && <span>Đơn #{transaction.orderid}</span>}
                        {transaction.username && <span>Thao tác: {transaction.username}</span>}
                      </div>
                      {transaction.note && <p className="mt-2 text-xs text-slate-400">{transaction.note}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffInventory;
