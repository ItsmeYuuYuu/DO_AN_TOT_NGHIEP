import React, { useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';
import { ShieldAlert, Plus, ShieldCheck, Clock, User, Edit2, X } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';

interface Warranty {
  warrantyid: number;
  imei?: string;
  customerid?: number;
  startdate: string;
  enddate: string;
  status?: string;
  customerName?: string;
}

const StaffWarranties: React.FC = () => {
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarranty, setEditingWarranty] = useState<Warranty | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    imei: '',
    customerid: '',
    startdate: new Date().toISOString().split('T')[0],
    enddate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    status: 'Active'
  });

  useEffect(() => {
    fetchWarranties();
  }, []);

  const fetchWarranties = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<Warranty[]>('/Warranties');
      setWarranties(res.data);
    } catch (err) {
      console.error(err);
      setWarranties([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingWarranty(null);
    setFormData({
      imei: '',
      customerid: '',
      startdate: new Date().toISOString().split('T')[0],
      enddate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (w: Warranty) => {
    setEditingWarranty(w);
    setFormData({
      imei: w.imei || '',
      customerid: w.customerid?.toString() || '',
      startdate: new Date(w.startdate).toISOString().split('T')[0],
      enddate: new Date(w.enddate).toISOString().split('T')[0],
      status: w.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingWarranty(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        imei: formData.imei,
        customerid: Number(formData.customerid),
        startdate: new Date(formData.startdate).toISOString(),
        enddate: new Date(formData.enddate).toISOString(),
        status: formData.status
      };

      if (editingWarranty) {
        await apiClient.put(`/Warranties/${editingWarranty.warrantyid}`, payload);
      } else {
        await apiClient.post('/Warranties', payload);
      }
      
      fetchWarranties();
      closeModal();
    } catch (err) {
      alert(editingWarranty ? 'Không thể cập nhật phiếu bảo hành.' : 'Không thể lưu phiếu bảo hành. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Quản lý Bảo hành</h1>
          <p className="text-slate-500 text-sm">Quản lý thông tin bảo hành thiết bị của khách hàng</p>
        </div>
        <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={18} /> Tạo thẻ bảo hành
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">IMEI</th>
              <th className="p-4">Khách hàng</th>
              <th className="p-4">Ngày kích hoạt</th>
              <th className="p-4">Hạn bảo hành</th>
              <th className="p-4 text-center">Trạng thái</th>
              <th className="p-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
            ) : warranties.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Không có dữ liệu bảo hành</td></tr>
            ) : warranties.map(w => (
              <tr key={w.warrantyid} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-blue-500" /> {w.imei}
                </td>
                <td className="p-4 text-sm font-bold text-slate-700 flex items-center gap-1.5"><User size={14} className="text-slate-400"/> {w.customerName || `Customer #${w.customerid}`}</td>
                <td className="p-4 text-sm text-slate-500">{fmtDate(w.startdate)}</td>
                <td className="p-4 text-sm text-slate-500 flex items-center gap-1.5"><Clock size={14} className="text-slate-400"/> {fmtDate(w.enddate)}</td>
                <td className="p-4 text-center">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                    ${w.status === 'Active' ? 'bg-green-100 text-green-700' :
                      w.status === 'Expired' ? 'bg-red-100 text-red-700' :
                      'bg-slate-100 text-slate-500'}`}>
                    {w.status === 'Active' && <ShieldCheck size={12}/>}
                    {w.status === 'Expired' && <ShieldAlert size={12}/>}
                    {w.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => openEditModal(w)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
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
              <h2 className="text-lg font-black text-slate-800">{editingWarranty ? 'Sửa Thẻ Bảo Hành' : 'Thêm Phiếu Bảo Hành'}</h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">IMEI *</label>
                <input type="text" required disabled={!!editingWarranty}
                  value={formData.imei}
                  onChange={e => setFormData({ ...formData, imei: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold uppercase disabled:bg-slate-100" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Customer ID *</label>
                <input type="number" required
                  value={formData.customerid}
                  onChange={e => setFormData({ ...formData, customerid: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Kích hoạt *</label>
                  <input type="date" required
                    value={formData.startdate}
                    onChange={e => setFormData({ ...formData, startdate: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-2 py-2 text-sm font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hết hạn *</label>
                  <input type="date" required
                    value={formData.enddate}
                    onChange={e => setFormData({ ...formData, enddate: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-2 py-2 text-sm font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Trạng thái</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium"
                >
                  <option value="Active">Active</option>
                  <option value="Expired">Expired</option>
                  <option value="Void">Void</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={closeModal} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" disabled={saving || !formData.imei || !formData.customerid} 
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

export default StaffWarranties;
