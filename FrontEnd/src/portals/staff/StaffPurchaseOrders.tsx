import React, { useState, useEffect } from 'react';
import apiClient from '@/api/apiClient';
import { ShoppingCart, Plus, Calendar, User } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';

interface PurchaseOrderDetail {
  podetailid: number;
  variantid?: number;
  quantity: number;
  importprice: number;
  variantSku?: string;
  productName?: string;
}

interface PurchaseOrder {
  poid: number;
  supplierid?: number;
  userid?: number;
  importdate?: string;
  totalamount: number;
  status?: string;
  supplierName?: string;
  userFullname?: string;
  details: PurchaseOrderDetail[];
}

interface Supplier {
  supplierid: number;
  suppliername: string;
}

const StaffPurchaseOrders: React.FC = () => {
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    supplierid: '',
    userid: '', // In reality, we might fetch from current logged-in user, but let's allow input for now
    status: 'Pending',
    variantid: '',
    quantity: 1,
    importprice: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [poRes, supRes] = await Promise.all([
        apiClient.get<PurchaseOrder[]>('/PurchaseOrders'),
        apiClient.get<Supplier[]>('/Suppliers').catch(() => ({ data: [] }))
      ]);
      setPos(poRes.data);
      setSuppliers(supRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiClient.post('/PurchaseOrders', {
        supplierid: Number(formData.supplierid),
        userid: Number(formData.userid),
        status: formData.status,
        details: [
          {
            variantid: Number(formData.variantid),
            quantity: Number(formData.quantity),
            importprice: Number(formData.importprice)
          }
        ]
      });
      fetchData();
      setIsModalOpen(false);
      setFormData({ supplierid: '', userid: '', status: 'Pending', variantid: '', quantity: 1, importprice: 0 });
    } catch (err) {
      alert('Không thể lưu đơn nhập hàng. Hãy kiểm tra lại dữ liệu.');
    } finally {
      setSaving(false);
    }
  };

  const fmtMoney = (n: number) => n.toLocaleString('vi-VN') + 'đ';
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : '';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Đơn nhập hàng (PO)</h1>
          <p className="text-slate-500 text-sm">Quản lý các đơn nhập hàng từ nhà cung cấp</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={18} /> Tạo PO mới
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Mã PO</th>
              <th className="p-4">Nhà cung cấp</th>
              <th className="p-4">Ngày nhập</th>
              <th className="p-4 text-right">Tổng tiền</th>
              <th className="p-4 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-4"><Skeleton className="h-10 w-full" /></td></tr>
            ) : pos.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Không có dữ liệu</td></tr>
            ) : pos.map(po => (
              <tr key={po.poid} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-800 flex items-center gap-2">
                  <ShoppingCart size={16} className="text-blue-500" /> #{po.poid}
                </td>
                <td className="p-4 text-sm font-bold text-slate-700">{po.supplierName || `Supplier #${po.supplierid}`}</td>
                <td className="p-4 text-sm text-slate-500 flex items-center gap-1"><Calendar size={14} />{fmtDate(po.importdate)}</td>
                <td className="p-4 text-right font-black text-blue-600">{fmtMoney(po.totalamount)}</td>
                <td className="p-4 text-center">
                  <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider
                    ${po.status === 'Completed' ? 'bg-green-100 text-green-700' :
                      po.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-slate-100 text-slate-500'}`}>
                    {po.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-black text-slate-800">Tạo Đơn Nhập Hàng (PO)</h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nhà cung cấp *</label>
                <select required value={formData.supplierid} onChange={e => setFormData({ ...formData, supplierid: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium">
                  <option value="">-- Chọn NCC --</option>
                  {suppliers.map(s => <option key={s.supplierid} value={s.supplierid}>{s.suppliername}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">User ID * (Người tạo)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="number" required value={formData.userid} onChange={e => setFormData({ ...formData, userid: e.target.value })}
                    className="w-full pl-9 pr-4 py-2 border-2 border-slate-200 rounded-xl text-sm font-medium" />
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4 space-y-3">
                <p className="text-xs font-black text-slate-700">CHI TIẾT SẢN PHẨM NHẬP (Demo 1 item)</p>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Variant ID *</label>
                  <input type="number" required value={formData.variantid} onChange={e => setFormData({ ...formData, variantid: e.target.value })}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Số lượng *</label>
                    <input type="number" min="1" required value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Giá nhập *</label>
                    <input type="number" min="0" required value={formData.importprice} onChange={e => setFormData({ ...formData, importprice: Number(e.target.value) })}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Trạng thái</label>
                <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium">
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors">Hủy</button>
                <button type="submit" disabled={saving || !formData.supplierid || !formData.userid || !formData.variantid} 
                  className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {saving ? 'Đang lưu...' : 'Tạo PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffPurchaseOrders;
