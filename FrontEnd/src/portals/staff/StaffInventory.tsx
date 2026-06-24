import React, { useCallback, useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';
import { Package, Plus, Filter, Edit2, History, X } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { notifyError } from '@/utils/notifications';


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
  imei: string;
  orderid?: number;
  userid?: number;
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
  threshold: number;
}

const StaffInventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<{ imei: string; variantid: number | ''; status: string }>({ imei: '', variantid: '', status: 'InStock' });
  const [saving, setSaving] = useState(false);
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [lowStockVariants, setLowStockVariants] = useState<LowStockVariant[]>([]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/Inventory/status/${statusFilter}` : '/Inventory';
      const [itemsResponse, lowStockResponse] = await Promise.all([
        apiClient.get<InventoryItem[]>(url),
        apiClient.get<LowStockVariant[]>('/Inventory/low-stock', { params: { threshold: 2 } }),
      ]);
      setItems(itemsResponse.data);
      setLowStockVariants(lowStockResponse.data);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ imei: '', variantid: '', status: 'InStock' });
    setIsModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({ 
      imei: item.imei, 
      variantid: item.variantid ?? '', 
      status: item.status ?? 'InStock' 
    });
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await apiClient.put(`/Inventory/${editingItem.imei}`, {
          variantid: Number(formData.variantid),
          status: formData.status
        });
      } else {
        await apiClient.post('/Inventory', {
          imei: formData.imei,
          variantid: Number(formData.variantid),
          status: formData.status
        });
      }
      fetchItems();
      closeModal();
    } catch {
      notifyError(editingItem ? 'Không thể cập nhật IMEI này.' : 'Không thể lưu dữ liệu. Có thể IMEI đã tồn tại.');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Quản lý IMEI Tồn kho</h1>
          <p className="text-slate-500 text-sm">Theo dõi chi tiết thiết bị trong kho</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-[#4f46e5] text-white font-bold rounded-xl hover:bg-[#4338ca] transition-colors">
          <Plus size={18} /> Thêm IMEI
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-[0_10px_28px_rgba(15,23,42,0.06)] border border-slate-100">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600 uppercase">Lọc trạng thái:</span>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-2xl text-sm px-3 py-1.5 bg-slate-50 focus:outline-none focus:border-[#4f46e5] font-medium"
        >
          <option value="">Tất cả</option>
          <option value="InStock">InStock (Trong kho)</option>
          <option value="Sold">Sold (Đã bán)</option>
          <option value="Reserved">Reserved (Đã đặt trước)</option>
          <option value="Shipping">Shipping (Đang giao)</option>
          <option value="Defective">Defective (Lỗi)</option>
        </select>
      </div>

      {lowStockVariants.length > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-black text-amber-900">Cảnh báo tồn kho thấp</h2>
              <p className="text-sm text-amber-700">
                {lowStockVariants.length} cấu hình còn tối đa 2 máy sẵn sàng bán.
              </p>
            </div>
            <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-black text-amber-900">
              Cần nhập kho
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {lowStockVariants.slice(0, 6).map(variant => (
              <div key={variant.variantid} className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2">
                <p className="truncate text-xs font-bold text-slate-800">
                  {variant.productName ?? `Variant #${variant.variantid}`}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-slate-400">{variant.variantSku ?? 'Không có SKU'}</span>
                  <span className={`text-xs font-black ${variant.inStockQuantity === 0 ? 'text-red-600' : 'text-amber-700'}`}>
                    {variant.inStockQuantity} máy
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-[0_10px_28px_rgba(15,23,42,0.06)] border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
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
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Không có dữ liệu</td></tr>
            ) : items.map(item => (
              <tr key={item.imei} className="hover:bg-indigo-50/40 transition-colors">
                <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                  <Package size={16} className="text-[#4f46e5]" /> {item.imei}
                </td>
                <td className="p-4 text-sm font-bold text-slate-700">{item.productName || `Variant #${item.variantid}`}</td>
                <td className="p-4 text-sm text-slate-500">{item.variantSku}</td>
                <td className="p-4 text-sm text-slate-500">{fmtDate(item.importedat)}</td>
                <td className="p-4 text-center">
                  <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                    ${item.status === 'InStock' ? 'bg-green-100 text-green-700' :
                      item.status === 'Sold' ? 'bg-slate-100 text-slate-500' :
                      item.status === 'Shipping' ? 'bg-indigo-100 text-[#4338ca]' :
                      item.status === 'Defective' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'}`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => openHistory(item)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors" title="Lịch sử kho">
                    <History size={16} />
                  </button>
                  <button onClick={() => openEditModal(item)} className="p-2 text-[#4f46e5] hover:bg-indigo-50 rounded-2xl transition-colors">
                    <Edit2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-800">{editingItem ? 'Sửa IMEI' : 'Thêm IMEI Mới'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">IMEI *</label>
                <input type="text" required disabled={!!editingItem}
                  value={formData.imei}
                  onChange={e => setFormData({ ...formData, imei: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold uppercase disabled:bg-slate-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Variant ID *</label>
                <input type="number" required
                  value={formData.variantid}
                  onChange={e => setFormData({ ...formData, variantid: Number(e.target.value) })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium"
                >
                  <option value="InStock">InStock</option>
                  <option value="Sold">Sold</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Shipping">Shipping</option>
                  <option value="Defective">Defective</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" disabled={saving || !formData.imei || formData.variantid === ''} 
                  className="flex-1 py-2 bg-[#4f46e5] text-white font-bold rounded-xl hover:bg-[#4338ca] disabled:opacity-60 transition-colors">
                  {saving ? 'Đang lưu...' : 'Lưu lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-lg font-black text-slate-800">Lịch sử giao dịch kho</h2>
                <p className="text-xs font-mono font-bold text-[#4f46e5]">{historyItem.imei}</p>
              </div>
              <button onClick={() => setHistoryItem(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6 max-h-[65vh] overflow-y-auto">
              {historyLoading ? (
                <Skeleton className="h-24 w-full" />
              ) : transactions.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-400">IMEI này chưa có lịch sử giao dịch.</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map(transaction => (
                    <div key={transaction.transactionid} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-slate-800">{transaction.transactiontype}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {transaction.fromstatus ?? 'Khởi tạo'} → <span className="font-bold text-[#4338ca]">{transaction.tostatus}</span>
                          </p>
                        </div>
                        <p className="text-xs text-slate-400">
                          {transaction.createdat ? new Date(transaction.createdat).toLocaleString('vi-VN') : '—'}
                        </p>
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
