import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import type { Attribute } from '@/features/products/api/attributesApi';
import { attributesApi } from '@/features/products/api/attributesApi';

interface VariantAttributesModalProps {
  isOpen: boolean;
  onClose: () => void;
  variantId: number;
}

export const VariantAttributesModal: React.FC<VariantAttributesModalProps> = ({ isOpen, onClose, variantId }) => {
  const [allAttributes, setAllAttributes] = useState<Attribute[]>([]);
  const [selectedValues, setSelectedValues] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && variantId) {
      loadData();
    }
  }, [isOpen, variantId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [attrs, variantAttrs] = await Promise.all([
        attributesApi.getAttributes(),
        attributesApi.getVariantAttributes(variantId)
      ]);
      setAllAttributes(attrs);
      setSelectedValues(variantAttrs.map(v => v.valueid));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleValue = (valId: number) => {
    setSelectedValues(prev => 
      prev.includes(valId) ? prev.filter(id => id !== valId) : [...prev, valId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await attributesApi.assignVariantAttributes(variantId, selectedValues);
      alert('Đã cập nhật thuộc tính thành công.');
      onClose();
    } catch (err) {
      alert('Không thể cập nhật thuộc tính. Vui lòng kiểm tra lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Thuộc tính của Variant #${variantId}`}>
      {loading ? (
        <div className="p-8 text-center text-slate-400">Đang tải...</div>
      ) : (
        <div className="space-y-6">
          {allAttributes.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có thuộc tính nào trong hệ thống. Hãy thêm thuộc tính trước.</p>
          ) : (
            allAttributes.map(attr => (
              <div key={attr.attributeid} className="space-y-2">
                <p className="font-bold text-sm text-slate-800">{attr.attributename}</p>
                <div className="flex flex-wrap gap-2">
                  {attr.values?.map(val => {
                    const isSelected = selectedValues.includes(val.valueid);
                    return (
                      <button
                        key={val.valueid}
                        onClick={() => toggleValue(val.valueid)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                          isSelected 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {val.valuename}
                      </button>
                    );
                  })}
                  {(!attr.values || attr.values.length === 0) && (
                    <span className="text-xs text-slate-400 italic">Chưa có giá trị</span>
                  )}
                </div>
              </div>
            ))
          )}

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
