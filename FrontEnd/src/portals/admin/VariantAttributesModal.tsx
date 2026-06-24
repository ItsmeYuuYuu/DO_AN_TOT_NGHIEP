import React, { useCallback, useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { attributesApi } from '@/features/products/api/attributesApi';
import { Plus, Trash2 } from 'lucide-react';
import { notifyError, notifySuccess } from '@/utils/notifications';


interface VariantAttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  variantId: number;
}

export const VariantAttributesModal: React.FC<VariantAttributesModalProps> = ({ isOpen, onClose, variantId }) => {
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const variantAttrs = await attributesApi.getVariantAttributes(variantId);
      setSpecs(variantAttrs.map(v => ({ key: v.attributename || '', value: v.valuename || '' })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [variantId]);

  useEffect(() => {
    if (isOpen && variantId) {
      loadData();
    }
  }, [isOpen, variantId, loadData]);

  const addSpec = () => {
    setSpecs(prev => [...prev, { key: '', value: '' }]);
  };

  const removeSpec = (index: number) => {
    setSpecs(prev => prev.filter((_, i) => i !== index));
  };

  const updateSpecKey = (index: number, keyVal: string) => {
    setSpecs(prev => prev.map((item, i) => i === index ? { ...item, key: keyVal } : item));
  };

  const updateSpecValue = (index: number, valueVal: string) => {
    setSpecs(prev => prev.map((item, i) => i === index ? { ...item, value: valueVal } : item));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Filter out empty keys
      const filtered = specs.filter(s => s.key.trim() !== '');
      await attributesApi.assignVariantAttributes(variantId, filtered);
      notifySuccess('Đã cập nhật thông số kỹ thuật thành công.');
      onClose();
    } catch {
      notifyError('Không thể cập nhật thông số kỹ thuật. Vui lòng kiểm tra lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Thông số kỹ thuật - Variant #${variantId}`}>
      {loading ? (
        <div className="p-8 text-center text-slate-400">Đang tải...</div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500 font-medium">Danh sách các thông số (ví dụ: RAM, Bộ nhớ, Chipset...)</span>
            <Button size="sm" variant="secondary" onClick={addSpec} className="flex items-center gap-1">
              <Plus size={14} /> Thêm dòng
            </Button>
          </div>

          <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1">
            {specs.length === 0 ? (
              <p className="text-sm text-slate-400 italic text-center py-6">Chưa có thông số kỹ thuật nào. Click "Thêm dòng" để bắt đầu.</p>
            ) : (
              specs.map((spec, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Tên thông số (e.g. RAM)"
                    value={spec.key}
                    onChange={(e) => updateSpecKey(index, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-white text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Giá trị (e.g. 12GB)"
                    value={spec.value}
                    onChange={(e) => updateSpecValue(index, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] focus:border-[#4f46e5] bg-white text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(index)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-3 pt-4 border-t border-slate-100">
            <Button onClick={handleSave} isLoading={saving} className="flex-1">
              Lưu thay đổi
            </Button>
            <Button variant="secondary" onClick={onClose} className="flex-1">
              Đóng
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
