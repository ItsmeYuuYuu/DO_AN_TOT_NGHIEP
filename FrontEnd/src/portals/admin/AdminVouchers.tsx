import React, { useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';
import { Plus, Edit2, Trash2, Tag, X } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { useAuth } from '@/features/auth/context/AuthContext';
import { confirmAction, notifyError } from '@/utils/notifications';
import { formatDate, formatDateInput } from '@/utils/formatters';


interface Voucher {
  vouchercode: string;
  discountamount?: number;
  discountpercentage?: number;
  validfrom?: string;
  validto?: string;
  isactive?: boolean;
}

const AdminVouchers: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.permissions?.includes('*') || user?.permissions?.includes('vouchers.manage');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingVoucher, setEditingVoucher] = useState<Voucher | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Voucher>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = () => {
    setLoading(true);
    apiClient.get<Voucher[]>('/Vouchers')
      .then(res => setVouchers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const openAddModal = () => {
    setEditingVoucher(null);
    setFormData({ isactive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (v: Voucher) => {
    setEditingVoucher(v);
    setFormData({ ...v });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVoucher(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        validfrom: formData.validfrom ? `${formatDateInput(formData.validfrom)}T00:00:00` : null,
        validto: formData.validto ? `${formatDateInput(formData.validto)}T23:59:59.999` : null,
        discountamount: formData.discountamount || null,
        discountpercentage: formData.discountpercentage || null,
      };
      
      if (editingVoucher) {
        await apiClient.put(`/Vouchers/${editingVoucher.vouchercode}`, payload);
      } else {
        await apiClient.post('/Vouchers', payload);
      }
      fetchVouchers();
      closeModal();
    } catch (err) {
      console.error(err);
      notifyError('Có lỗi xảy ra khi lưu voucher');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (code: string) => {
    if (!(await confirmAction('Bạn có chắc chắn muốn xóa voucher này?', { danger: true, confirmLabel: 'Xóa' }))) return;
    try {
      await apiClient.delete(`/Vouchers/${code}`);
      fetchVouchers();
    } catch {
      notifyError('Không thể xóa voucher');
    }
  };

  const fmtDate = (d?: string) => d ? formatDate(d) : 'Không giới hạn';

  return (
    <div className="space-y-6">
      <div className="ops-hero flex items-center justify-between p-6">
        <div>
          <h1 className="ops-hero-title">Quản lý voucher</h1>
          <p className="text-slate-500 text-sm">Tạo và quản lý các mã giảm giá cho hệ thống</p>
        </div>
        {canManage && (
          <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-[#e30613] text-white font-bold rounded-xl hover:bg-[#c4000b] transition-colors">
            <Plus size={18} /> Thêm Voucher
          </button>
        )}
      </div>

      <div className="ops-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Mã Voucher</th>
              <th className="p-4">Mức giảm</th>
              <th className="p-4">Hiệu lực từ</th>
              <th className="p-4">Đến ngày</th>
              <th className="p-4 text-center">Trạng thái</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
            ) : vouchers.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Chưa có voucher nào</td></tr>
            ) : vouchers.map(v => (
              <tr key={v.vouchercode} className="hover:bg-red-50/40 transition-colors">
                <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                  <Tag size={16} className="text-orange-500" /> {v.vouchercode}
                </td>
                <td className="p-4 text-sm font-medium text-slate-600">
                  {v.discountpercentage ? (
                    <span className="text-green-600">{v.discountpercentage}%</span>
                  ) : (
                    <span className="text-[#e30613]">{v.discountamount?.toLocaleString('vi-VN')}đ</span>
                  )}
                </td>
                <td className="p-4 text-sm text-slate-500">{fmtDate(v.validfrom)}</td>
                <td className="p-4 text-sm text-slate-500">{fmtDate(v.validto)}</td>
                <td className="p-4 text-center">
                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${v.isactive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {v.isactive ? 'Đang hoạt động' : 'Đã tắt'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {canManage && (
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(v)} className="p-2 text-[#e30613] hover:bg-red-50 rounded-2xl transition-colors"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(v.vouchercode)} className="p-2 text-red-600 hover:bg-red-50 rounded-2xl transition-colors"><Trash2 size={16} /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-black text-slate-800">{editingVoucher ? 'Sửa Voucher' : 'Thêm Voucher Mới'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mã Voucher</label>
                <input type="text" required disabled={!!editingVoucher}
                  value={formData.vouchercode || ''}
                  onChange={e => setFormData({ ...formData, vouchercode: e.target.value.toUpperCase() })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold uppercase disabled:bg-slate-100" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Giảm theo %</label>
                  <input type="number" min="0" max="100" step="0.1"
                    value={formData.discountpercentage || ''}
                    onChange={e => setFormData({ ...formData, discountpercentage: Number(e.target.value), discountamount: undefined })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Giảm theo số tiền</label>
                  <input type="number" min="0" step="1000"
                    value={formData.discountamount || ''}
                    onChange={e => setFormData({ ...formData, discountamount: Number(e.target.value), discountpercentage: undefined })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Từ ngày</label>
                  <input type="date"
                    value={formData.validfrom ? formatDateInput(formData.validfrom) : ''}
                    onChange={e => setFormData({ ...formData, validfrom: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Đến ngày</label>
                  <input type="date"
                    value={formData.validto ? formatDateInput(formData.validto) : ''}
                    onChange={e => setFormData({ ...formData, validto: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isactive" checked={!!formData.isactive}
                  onChange={e => setFormData({ ...formData, isactive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-[#e30613] focus:ring-[#e30613]" />
                <label htmlFor="isactive" className="text-sm font-bold text-slate-700">Kích hoạt voucher</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" disabled={saving || (!formData.discountpercentage && !formData.discountamount)} 
                  className="flex-1 py-2 bg-[#e30613] text-white font-bold rounded-xl hover:bg-[#c4000b] disabled:opacity-60 transition-colors">
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

export default AdminVouchers;
