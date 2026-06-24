import React, { useState, useEffect } from 'react';
import { warrantyPackagesApi } from '@/features/orders/api/warrantyPackagesApi';
import type { WarrantyPackage } from '@/features/orders/api/warrantyPackagesApi';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { DataTable } from '@/components/DataTable';
import { formatCurrency } from '@/utils/formatters';
import { getApiErrorMessage } from '@/utils/apiError';
import { confirmAction, notifyError } from '@/utils/notifications';


const AdminWarrantyPackages: React.FC = () => {
  const [packages, setPackages] = useState<WarrantyPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<WarrantyPackage> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const data = await warrantyPackagesApi.getAll();
      setPackages(data);
    } catch {
      notifyError('Không thể tải danh sách gói bảo hành.');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing({ packagename: '', durationmonths: 12, price: 0 });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: WarrantyPackage) => {
    setEditing({ ...p });
    setError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!editing?.packagename?.trim() || !editing?.durationmonths || editing.price === undefined) {
      setError('Vui lòng điền đủ thông tin hợp lệ.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = {
        packagename: editing.packagename,
        durationmonths: editing.durationmonths,
        price: editing.price,
      };
      
      if (editing.packageid) {
        await warrantyPackagesApi.update(editing.packageid, data);
      } else {
        await warrantyPackagesApi.create(data);
      }
      await fetchPackages();
      closeModal();
    } catch (error) {
      setError(getApiErrorMessage(error, 'Lỗi khi lưu thông tin. Vui lòng thử lại.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmAction('Bạn có chắc muốn xóa gói bảo hành này?', { danger: true, confirmLabel: 'Xóa' }))) return;
    try {
      await warrantyPackagesApi.delete(id);
      await fetchPackages();
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Không thể xóa gói bảo hành này.'));
    }
  };

  const columns = [
    {
      key: 'packageid',
      header: 'ID',
      className: 'w-16',
      render: (p: WarrantyPackage) => <span className="text-slate-500 font-mono text-xs">#{p.packageid}</span>,
    },
    {
      key: 'packagename',
      header: 'Tên gói bảo hành',
      render: (p: WarrantyPackage) => <span className="font-bold text-slate-800">{p.packagename}</span>,
    },
    {
      key: 'durationmonths',
      header: 'Thời hạn',
      render: (p: WarrantyPackage) => <span>{p.durationmonths} tháng</span>,
    },
    {
      key: 'price',
      header: 'Giá',
      render: (p: WarrantyPackage) => <span className="font-bold text-orange-500">{formatCurrency(p.price)}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      className: 'w-28 text-right',
      render: (p: WarrantyPackage) => (
        <div className="flex justify-end gap-2">
          <button onClick={() => openEdit(p)} className="px-3 py-1.5 bg-indigo-50 text-[#4f46e5] rounded hover:bg-indigo-100 font-semibold text-xs transition-colors">
            Sửa
          </button>
          <button onClick={() => handleDelete(p.packageid)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 font-semibold text-xs transition-colors">
            Xóa
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Quản lý Gói Bảo Hành</h1>
          <p className="text-sm text-slate-500 mt-1">Cấu hình các gói bảo hành mở rộng cho sản phẩm</p>
        </div>
        <Button onClick={openCreate} size="sm">+ Thêm Gói Bảo Hành</Button>
      </div>

      <DataTable 
        columns={columns} 
        data={packages} 
        keyField="packageid" 
        loading={loading} 
      />

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing?.packageid ? 'Sửa gói bảo hành' : 'Thêm gói bảo hành'}>
        <div className="space-y-4">
          <Input 
            label="Tên gói bảo hành *" 
            value={editing?.packagename ?? ''} 
            onChange={e => setEditing(p => ({ ...p!, packagename: e.target.value }))}
            placeholder="VD: Bảo hành vàng 12 tháng"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Thời hạn (Tháng) *</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#4f46e5] transition-colors"
                value={editing?.durationmonths ?? ''} 
                onChange={e => setEditing(p => ({ ...p!, durationmonths: parseInt(e.target.value) || 0 }))}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Giá gói (VNĐ) *</label>
              <input 
                type="number" 
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#4f46e5] transition-colors"
                value={editing?.price ?? ''} 
                onChange={e => setEditing(p => ({ ...p!, price: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
          </div>
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-2xl border border-red-100">{error}</div>}
          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button onClick={handleSave} isLoading={saving} className="flex-1">Lưu lại</Button>
            <Button onClick={closeModal} variant="secondary" className="flex-1">Hủy</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AdminWarrantyPackages;
