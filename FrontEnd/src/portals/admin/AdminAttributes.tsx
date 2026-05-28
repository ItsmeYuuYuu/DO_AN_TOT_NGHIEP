import React, { useState, useEffect } from 'react';
import type { Attribute, AttributeValue } from '@/features/products/api/attributesApi';
import { attributesApi } from '@/features/products/api/attributesApi';
import { Plus, Edit2, Trash2, Tags, PlusCircle } from 'lucide-react';
import { Skeleton } from '@/components/Skeleton';
import { Modal } from '@/components/Modal';

const AdminAttributes: React.FC = () => {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [attrModalOpen, setAttrModalOpen] = useState(false);
  const [editingAttr, setEditingAttr] = useState<Attribute | null>(null);
  const [attrName, setAttrName] = useState('');

  const [valModalOpen, setValModalOpen] = useState(false);
  const [activeAttr, setActiveAttr] = useState<Attribute | null>(null);
  const [editingVal, setEditingVal] = useState<AttributeValue | null>(null);
  const [valName, setValName] = useState('');

  useEffect(() => {
    fetchAttributes();
  }, []);

  const fetchAttributes = async () => {
    setLoading(true);
    try {
      const data = await attributesApi.getAttributes();
      setAttributes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openAttrModal = (attr?: Attribute) => {
    if (attr) {
      setEditingAttr(attr);
      setAttrName(attr.attributename);
    } else {
      setEditingAttr(null);
      setAttrName('');
    }
    setAttrModalOpen(true);
  };

  const saveAttribute = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAttr) {
        await attributesApi.updateAttribute(editingAttr.attributeid, attrName);
      } else {
        await attributesApi.createAttribute(attrName);
      }
      setAttrModalOpen(false);
      fetchAttributes();
    } catch (err) {
      alert('Lỗi lưu thuộc tính. Vui lòng kiểm tra lại.');
    }
  };

  const deleteAttribute = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thuộc tính này và tất cả giá trị của nó?')) return;
    try {
      await attributesApi.deleteAttribute(id);
      fetchAttributes();
    } catch (err) {
      alert('Không thể xóa thuộc tính đang được sử dụng.');
    }
  };

  const openValModal = (attr: Attribute, val?: AttributeValue) => {
    setActiveAttr(attr);
    if (val) {
      setEditingVal(val);
      setValName(val.valuename);
    } else {
      setEditingVal(null);
      setValName('');
    }
    setValModalOpen(true);
  };

  const saveValue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAttr) return;
    try {
      if (editingVal) {
        await attributesApi.updateAttributeValue(editingVal.valueid, valName);
      } else {
        await attributesApi.createAttributeValue(activeAttr.attributeid, valName);
      }
      setValModalOpen(false);
      fetchAttributes();
    } catch (err) {
      alert('Lỗi lưu giá trị.');
    }
  };

  const deleteValue = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa giá trị này?')) return;
    try {
      await attributesApi.deleteAttributeValue(id);
      fetchAttributes();
    } catch (err) {
      alert('Không thể xóa giá trị đang được sử dụng.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Thuộc tính sản phẩm</h1>
          <p className="text-slate-500 text-sm">Quản lý RAM, Bộ nhớ, Màu sắc,... và các giá trị</p>
        </div>
        <button onClick={() => openAttrModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={18} /> Thêm Nhóm Thuộc Tính
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : attributes.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <Tags size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-500 font-medium">Chưa có thuộc tính nào.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {attributes.map(attr => (
            <div key={attr.attributeid} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <Tags size={18} className="text-blue-500"/>
                  {attr.attributename}
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => openAttrModal(attr)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => deleteAttribute(attr.attributeid)} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-3">
                  {attr.values?.map(val => (
                    <div key={val.valueid} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg group">
                      <span className="text-sm font-bold text-slate-700">{val.valuename}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openValModal(attr, val)} className="text-slate-400 hover:text-blue-600"><Edit2 size={12}/></button>
                        <button onClick={() => deleteValue(val.valueid)} className="text-slate-400 hover:text-red-600"><Trash2 size={12}/></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => openValModal(attr)} className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400 rounded-lg text-sm font-bold transition-all">
                    <PlusCircle size={14} /> Thêm giá trị
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={attrModalOpen} onClose={() => setAttrModalOpen(false)} title={editingAttr ? 'Sửa Nhóm Thuộc Tính' : 'Thêm Nhóm Thuộc Tính'}>
        <form onSubmit={saveAttribute} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tên Thuộc Tính *</label>
            <input required type="text" value={attrName} onChange={e => setAttrName(e.target.value)} placeholder="Ví dụ: RAM, Màu sắc..."
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none transition-colors" />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
            Lưu lại
          </button>
        </form>
      </Modal>

      <Modal isOpen={valModalOpen} onClose={() => setValModalOpen(false)} title={editingVal ? 'Sửa Giá Trị' : 'Thêm Giá Trị'}>
        <form onSubmit={saveValue} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Giá Trị Cho "{activeAttr?.attributename}" *</label>
            <input required type="text" value={valName} onChange={e => setValName(e.target.value)} placeholder="Ví dụ: 8GB, Đen..."
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none transition-colors" />
          </div>
          <button type="submit" className="w-full py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
            Lưu lại
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default AdminAttributes;
