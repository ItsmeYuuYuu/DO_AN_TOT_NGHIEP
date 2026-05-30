import React, { useState, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { brandsApi } from '@/features/brands/api/brandsApi';
import { categoriesApi } from '@/features/categories/api/categoriesApi';
import type { CreateFullProduct, CreateFullProductVariant } from '@/features/products/api/productsApi';
import { Plus, Trash2, AlertCircle, Settings, CheckCircle } from 'lucide-react';

interface ProductFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFullProduct) => Promise<void>;
}

interface SpecItem {
  key: string;
  value: string;
}

interface VariantState {
  optionKeys: string[];
  sku: string;
  baseprice: number | '';
  saleprice: number | '';
  specs: SpecItem[];
}

export const ProductFormWizard: React.FC<ProductFormWizardProps> = ({ isOpen, onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Lookups
  const [brands, setBrands] = useState<{ brandid: number; brandname: string }[]>([]);
  const [categories, setCategories] = useState<{ categoryid: number; categoryname: string }[]>([]);

  // Step 1: Base Info
  const [productname, setProductname] = useState('');
  const [description, setDescription] = useState('');
  const [brandid, setBrandid] = useState<number | ''>('');
  const [categoryid, setCategoryid] = useState<number | ''>('');

  // Step 2: Options & Variants
  const [optionGroups, setOptionGroups] = useState<{ id: string; name: string; values: string }[]>([
    { id: '1', name: 'Màu sắc', values: '' },
    { id: '2', name: 'Bộ nhớ trong', values: '' }
  ]);
  
  const [variants, setVariants] = useState<VariantState[]>([]);
  const [showMatrixWarning, setShowMatrixWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      brandsApi.getAll().then(res => setBrands(res.data));
      categoriesApi.getAll().then(res => setCategories(res.data));
      
      // Reset state
      setStep(1);
      setProductname('');
      setDescription('');
      setBrandid('');
      setCategoryid('');
      setOptionGroups([
        { id: Math.random().toString(), name: 'Màu sắc', values: '' }, 
        { id: Math.random().toString(), name: 'Bộ nhớ trong', values: '' }
      ]);
      setVariants([]);
      setError(null);
      setShowMatrixWarning(false);
    }
  }, [isOpen]);

  const addOptionGroup = () => {
    setOptionGroups([...optionGroups, { id: Math.random().toString(), name: '', values: '' }]);
  };

  const removeOptionGroup = (id: string) => {
    setOptionGroups(optionGroups.filter(g => g.id !== id));
  };

  const handleGenerateClick = () => {
    // If there's existing data, show warning
    const hasData = variants.some(v => v.sku || v.baseprice || v.specs.length > 0);
    if (hasData && !showMatrixWarning) {
      setShowMatrixWarning(true);
      return;
    }
    
    generateMatrix();
    setShowMatrixWarning(false);
  };

  const generateMatrix = () => {
    const validGroups = optionGroups.filter(g => g.name.trim() && g.values.trim());
    if (validGroups.length === 0) {
      setVariants([{ sku: '', baseprice: '', saleprice: '', specs: [], optionKeys: ['Mặc định'] }]);
      return;
    }

    const arrays = validGroups.map(g => g.values.split(',').map(v => v.trim()).filter(Boolean));
    
    const cartesian = (a: any[], b?: any[], ...c: any[][]): any[] => {
      if (!b) return a.map(v => [v]);
      const bCartesian = cartesian(b, c[0], ...c.slice(1));
      return a.flatMap(d => bCartesian.map(e => [d, ...e]));
    };

    const combinations = arrays.length > 1 ? cartesian(arrays[0], arrays[1], ...(arrays.slice(2) as any[][])) : arrays[0].map(v => [v]);

    const newVariants: VariantState[] = combinations.map(combo => ({
      optionKeys: combo,
      sku: '',
      baseprice: '',
      saleprice: '',
      specs: []
    }));
    
    setVariants(newVariants);
  };

  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!productname.trim()) return setError('Vui lòng nhập tên sản phẩm.');
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleVariantChange = (index: number, field: keyof VariantState, value: any) => {
    const newVars = [...variants];
    (newVars[index] as any)[field] = value;
    setVariants(newVars);
  };

  const addSpec = (variantIndex: number) => {
    const newVars = [...variants];
    newVars[variantIndex].specs.push({ key: '', value: '' });
    setVariants(newVars);
  };

  const removeSpec = (variantIndex: number, specIndex: number) => {
    const newVars = [...variants];
    newVars[variantIndex].specs.splice(specIndex, 1);
    setVariants(newVars);
  };

  const handleSpecChange = (variantIndex: number, specIndex: number, field: keyof SpecItem, value: string) => {
    const newVars = [...variants];
    newVars[variantIndex].specs[specIndex][field] = value;
    setVariants(newVars);
  };

  const handleSubmit = async () => {
    try {
      setError(null);
      
      if (!productname.trim()) {
        setError("Vui lòng nhập tên sản phẩm.");
        setStep(1);
        return;
      }
      
      if (variants.length === 0) {
        setError("Sản phẩm phải có ít nhất 1 biến thể.");
        setStep(2);
        return;
      }
      
      const skus = new Set();
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const variantName = v.optionKeys.join(' - ');
        
        if (!v.sku || v.sku.trim() === '') {
            setError(`Biến thể [${variantName}] chưa có mã SKU.`);
            setStep(2);
            return;
        }
        if (skus.has(v.sku.trim())) {
            setError(`Mã SKU [${v.sku.trim()}] bị trùng lặp ở biến thể [${variantName}].`);
            setStep(2);
            return;
        }
        skus.add(v.sku.trim());
        
        const base = Number(v.baseprice);
        const sale = v.saleprice !== '' && v.saleprice !== undefined && v.saleprice !== null ? Number(v.saleprice) : null;
        
        if (isNaN(base) || base <= 0) {
            setError(`Giá gốc của biến thể [${variantName}] phải lớn hơn 0.`);
            setStep(2);
            return;
        }
        if (sale !== null) {
            if (isNaN(sale) || sale < 0) {
                setError(`Giá khuyến mãi của biến thể [${variantName}] không được âm.`);
                setStep(2);
                return;
            }
            if (sale > base) {
                setError(`Giá khuyến mãi của biến thể [${variantName}] không được lớn hơn giá gốc.`);
                setStep(2);
                return;
            }
        }
      }

      setSubmitting(true);
      
      const parsedVariants: CreateFullProductVariant[] = variants.map(v => {
        // Filter out empty specs
        const validSpecs = v.specs.filter(s => s.key.trim() && s.value.trim()).map(s => ({
          key: s.key.trim(),
          value: s.value.trim()
        }));
          
        // Add options as specs too
        const validGroups = optionGroups.filter(g => g.name.trim() && g.values.trim());
        if (validGroups.length > 0 && v.optionKeys[0] !== 'Mặc định') {
          validGroups.forEach((g, i) => {
             validSpecs.push({ key: g.name.trim(), value: v.optionKeys[i] });
          });
        }

        return {
          sku: v.sku.trim(),
          baseprice: Number(v.baseprice),
          saleprice: v.saleprice ? Number(v.saleprice) : undefined,
          specs: validSpecs
        };
      });

      const payload: CreateFullProduct = {
        productname,
        description,
        brandid: brandid ? Number(brandid) : undefined,
        categoryid: categoryid ? Number(categoryid) : undefined,
        variants: parsedVariants
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Lỗi hệ thống khi tạo sản phẩm.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} title="Tạo sản phẩm mới" onClose={onClose} size="xl">
      <div className="w-full pb-6">
        {/* Progress Bar */}
        <div className="flex items-center gap-4 mb-8 pt-2">
          {[
            { s: 1, label: 'Cơ bản', icon: <Settings size={18} /> },
            { s: 2, label: 'Biến thể', icon: <Plus size={18} /> },
            { s: 3, label: 'Hoàn tất', icon: <CheckCircle size={18} /> }
          ].map((item, idx) => (
            <React.Fragment key={item.s}>
              <div className={`flex items-center gap-2 ${step >= item.s ? 'text-blue-600 font-semibold' : 'text-slate-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${step >= item.s ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
                  {item.icon}
                </div>
                <span className="hidden sm:inline">{item.label}</span>
              </div>
              {idx < 2 && <div className={`flex-1 h-0.5 ${step > item.s ? 'bg-blue-600' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-bold text-lg text-slate-800 border-b border-slate-100 pb-2">Thông tin cơ bản</h3>
              <Input label="Tên sản phẩm *" value={productname} onChange={e => setProductname(e.target.value)} placeholder="Nhập tên sản phẩm (VD: iPhone 15 Pro Max)" />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Thương hiệu</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors" value={brandid} onChange={e => setBrandid(Number(e.target.value))}>
                    <option value="">-- Chọn thương hiệu --</option>
                    {brands.map(b => <option key={b.brandid} value={b.brandid}>{b.brandname}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Danh mục</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors" value={categoryid} onChange={e => setCategoryid(Number(e.target.value))}>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => <option key={c.categoryid} value={c.categoryid}>{c.categoryname}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Mô tả chi tiết</label>
                <textarea 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm h-32 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors"
                  placeholder="Nhập mô tả sản phẩm..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Option Groups */}
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Cấu hình biến thể (Options)</h3>
                <Button variant="outline" size="sm" onClick={addOptionGroup} className="flex items-center gap-1">
                  <Plus size={16} /> Thêm nhóm
                </Button>
              </div>
              
              {optionGroups.length === 0 ? (
                <div className="text-sm text-slate-500 italic mb-4">Sản phẩm không có biến thể. Nhấn Tạo ma trận để cấu hình giá cơ bản.</div>
              ) : (
                <div className="space-y-3 mb-4">
                  {optionGroups.map((group, idx) => (
                    <div key={group.id} className="flex items-start gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Tên nhóm (Thuộc tính)</label>
                        <Input placeholder="VD: Màu sắc, ROM..." value={group.name} onChange={e => {
                          const newG = [...optionGroups];
                          newG[idx].name = e.target.value;
                          setOptionGroups(newG);
                        }} />
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Các giá trị (Ngăn cách bằng dấu phẩy)</label>
                        <Input placeholder="VD: Đỏ, Xanh, Đen" value={group.values} onChange={e => {
                          const newG = [...optionGroups];
                          newG[idx].values = e.target.value;
                          setOptionGroups(newG);
                        }} />
                      </div>
                      <button onClick={() => removeOptionGroup(group.id)} className="mt-6 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa nhóm này">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {showMatrixWarning ? (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-orange-800 text-sm">Cảnh báo ghi đè</h4>
                    <p className="text-orange-700 text-sm mt-1">Việc tạo lại ma trận sẽ xóa toàn bộ SKU, Giá và Thông số đã nhập ở bên dưới. Bạn có chắc chắn muốn tạo lại?</p>
                    <div className="flex gap-2 mt-3">
                      <Button variant="danger" size="sm" onClick={generateMatrix}>Vâng, tạo lại</Button>
                      <Button variant="outline" size="sm" onClick={() => setShowMatrixWarning(false)}>Hủy bỏ</Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Button variant="primary" onClick={handleGenerateClick} className="w-full justify-center">
                  Tự động sinh Ma trận {optionGroups.length > 0 ? 'Biến thể' : 'Mặc định'}
                </Button>
              )}
            </div>

            {/* Matrix Editor */}
            {variants.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-800">Danh sách {variants.length} Phiên bản</h3>
                </div>
                
                <div className="grid gap-4">
                  {variants.map((v, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <div className="font-bold text-blue-700 flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 px-2.5 py-1 rounded text-sm">Phiên bản {idx + 1}</span>
                          {v.optionKeys.join(' • ')}
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-5">
                        <div className="grid grid-cols-3 gap-4">
                          <Input label="Mã SKU *" value={v.sku} onChange={e => handleVariantChange(idx, 'sku', e.target.value)} placeholder="VD: IP15-RED-256" />
                          <Input type="number" label="Giá gốc (VNĐ) *" value={v.baseprice} onChange={e => handleVariantChange(idx, 'baseprice', e.target.value)} placeholder="0" />
                          <Input type="number" label="Giá KM (VNĐ)" value={v.saleprice} onChange={e => handleVariantChange(idx, 'saleprice', e.target.value)} placeholder="Để trống nếu không KM" />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-semibold text-slate-700">Thông số kỹ thuật riêng</label>
                            <Button variant="outline" size="sm" onClick={() => addSpec(idx)} className="h-8 text-xs flex items-center gap-1">
                              <Plus size={14} /> Thêm thông số
                            </Button>
                          </div>
                          
                          {v.specs.length === 0 ? (
                            <div className="text-sm text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 text-center">
                              Chưa có thông số cấu hình riêng.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {v.specs.map((spec, sIdx) => (
                                <div key={sIdx} className="flex items-center gap-2">
                                  <div className="flex-1">
                                    <Input placeholder="Tên thông số (VD: Màn hình)" value={spec.key} onChange={e => handleSpecChange(idx, sIdx, 'key', e.target.value)} />
                                  </div>
                                  <div className="flex-[2]">
                                    <Input placeholder="Giá trị (VD: 6.7 inch)" value={spec.value} onChange={e => handleSpecChange(idx, sIdx, 'value', e.target.value)} />
                                  </div>
                                  <button onClick={() => removeSpec(idx, sIdx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Xóa dòng này">
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-2">Kiểm tra thông tin hoàn tất</h3>
              <p className="text-slate-500 text-sm mb-6">Bạn chuẩn bị tạo một sản phẩm mới vào hệ thống với các thông số tóm tắt dưới đây.</p>
              
              <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 max-w-lg mx-auto space-y-3">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Tên sản phẩm</span>
                  <span className="font-bold text-slate-800">{productname}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Thương hiệu</span>
                  <span className="font-medium text-slate-800">{brands.find(b => b.brandid === brandid)?.brandname || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500">Danh mục</span>
                  <span className="font-medium text-slate-800">{categories.find(c => c.categoryid === categoryid)?.categoryname || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số lượng phiên bản</span>
                  <span className="font-bold text-blue-600 bg-blue-100 px-2 rounded-full">{variants.length} SKU</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex justify-between items-center sticky bottom-0 bg-white border-t border-slate-200 py-4 z-10 -mx-2 px-2">
          {step > 1 ? (
            <Button variant="outline" onClick={() => setStep(step - 1)}>Quay lại</Button>
          ) : <div />}
          
          {step < 3 ? (
            <Button variant="primary" onClick={handleNext} className="min-w-[120px]">Tiếp tục</Button>
          ) : (
            <Button variant="primary" isLoading={submitting} onClick={handleSubmit} className="min-w-[120px]">Xác nhận Tạo</Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
