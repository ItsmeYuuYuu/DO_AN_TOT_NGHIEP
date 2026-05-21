import React, { useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';
import { Package, Plus, Filter } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';

interface InventoryItem {
  imei: string;
  variantid?: number;
  podetailid?: number;
  status?: string;
  importedat?: string;
  variantSku?: string;
  productName?: string;
}

const StaffInventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<{ imei: string; variantid: number | ''; status: string }>({ imei: '', variantid: '', status: 'Available' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchItems(); }, [statusFilter]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const url = statusFilter ? `/Inventory/status/${statusFilter}` : '/Inventory';
      const res = await apiClient.get<InventoryItem[]>(url);
      setItems(res.data);
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/Inventory', {
        imei: formData.imei,
        variantid: Number(formData.variantid),
        status: formData.status
      });
      fetchItems();
      setIsModalOpen(false);
      setFormData({ imei: '', variantid: '', status: 'Available' });
    } catch (err) {
      alert('Không thể lưu dữ liệu. Có thể IMEI đã tồn tại.');
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
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={18} /> Thêm IMEI
        </button>
      </div>

      <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <span className="text-sm font-bold text-slate-600 uppercase">Lọc trạng thái:</span>
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-lg text-sm px-3 py-1.5 bg-slate-50 focus:outline-none focus:border-blue-400 font-medium"
        >
          <option value="">Tất cả</option>
          <option value="Available">Available (Sẵn sàng)</option>
          <option value="Sold">Sold (Đã bán)</option>
          <option value="Reserved">Reserved (Đã đặt trước)</option>
          <option value="Defective">Defective (Lỗi)</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">IMEI</th>
              <th className="p-4">Sản phẩm</th>
              <th className="p-4">SKU</th>
              <th className="p-4">Ngày nhập</th>
              <th className="p-4 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Không có dữ liệu</td></tr>
            ) : items.map(item => (
              <tr key={item.imei} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                  <Package size={16} className="text-blue-500" /> {item.imei}
                </td>
                <td className="p-4 text-sm font-bold text-slate-700">{item.productName || `Variant #${item.variantid}`}</td>
                <td className="p-4 text-sm text-slate-500">{item.variantSku}</td>
                <td className="p-4 text-sm text-slate-500">{fmtDate(item.importedat)}</td>
                <td className="p-4 text-center">
                  <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                    ${item.status === 'Available' ? 'bg-green-100 text-green-700' :
                      item.status === 'Sold' ? 'bg-slate-100 text-slate-500' :
                      item.status === 'Defective' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-black text-slate-800">Thêm IMEI Mới</h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">IMEI *</label>
                <input type="text" required
                  value={formData.imei}
                  onChange={e => setFormData({ ...formData, imei: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold uppercase" />
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
                  <option value="Available">Available</option>
                  <option value="Sold">Sold</option>
                  <option value="Reserved">Reserved</option>
                  <option value="Defective">Defective</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" disabled={saving || !formData.imei || formData.variantid === ''} 
                  className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {saving ? 'Đang lưu...' : 'Lưu lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffInventory;
