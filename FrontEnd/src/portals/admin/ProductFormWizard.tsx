import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { brandsApi } from '@/features/brands/api/brandsApi';
import { categoriesApi } from '@/features/categories/api/categoriesApi';
import type { CreateFullProduct, CreateFullProductVariant } from '@/features/products/api/productsApi';
import { 
  AlertCircle, 
  CheckCircle, 
  Image as ImageIcon,
  Trash2
} from 'lucide-react';

interface ProductFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateFullProduct) => Promise<void>;
}

// 23 Specs List
const SPEC_KEYS = [
  'Kích thước màn hình',
  'Công nghệ màn hình',
  'Độ phân giải màn hình',
  'Camera sau',
  'Quay video sau',
  'Camera trước',
  'Quay video trước',
  'Hệ điều hành',
  'Chipset',
  'Loại CPU',
  'GPU',
  'Dung lượng RAM',
  'Bộ nhớ trong',
  'Pin',
  'Cổng sạc',
  'Công nghệ sạc',
  'Các loại cảm biến',
  'Wi-Fi',
  'Bluetooth',
  'GPS',
  'Kích thước',
  'Trọng lượng',
  'Chất liệu'
];

export const ProductFormWizard: React.FC<ProductFormWizardProps> = ({ isOpen, onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Lookups
  const [brands, setBrands] = useState<{ brandid: number; brandname: string }[]>([]);
  const [categories, setCategories] = useState<{ categoryid: number; categoryname: string }[]>([]);

  // Step 1: Base Info
  const [productname, setProductname] = useState('');
  const [brandid, setBrandid] = useState<number | ''>('');
  const [categoryid, setCategoryid] = useState<number | ''>('');
  const [baseprice, setBaseprice] = useState<number | ''>('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [saleprice, setSaleprice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');

  // Step 2: Description
  const [description, setDescription] = useState('');
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Step 3: Options (Lựa chọn) - Configure one variant at a time
  const [allColors, setAllColors] = useState<string[]>(['Đen', 'Trắng', 'Xanh', 'Vàng', 'Hồng', 'Xám']);
  const allRams = ['8GB', '12GB', '16GB', '24GB'];
  const allRoms = ['64GB', '128GB', '256GB', '512GB', '1TB'];
  const allConditions = ['98% Fullbox', 'New Seal', 'Likenew Fullbox', 'Likenew', 'Xước nhẹ 98%'];
  const allOrigins = ['Chính hãng', 'Nội địa'];

  // Current variant configuration state
  const [activeColor, setActiveColor] = useState('Đen');
  const [activeRam, setActiveRam] = useState('8GB');
  const [activeRom, setActiveRom] = useState('128GB');
  const [activeCondition, setActiveCondition] = useState('New Seal');
  const [activeOrigin, setActiveOrigin] = useState('Chính hãng');
  const [customColor, setCustomColor] = useState('');
  
  const [variantSku, setVariantSku] = useState('');
  const [variantBasePrice, setVariantBasePrice] = useState<number | ''>('');
  const [variantSalePrice, setVariantSalePrice] = useState<number | ''>('');
  const [variantStock, setVariantStock] = useState<number | ''>('');

  // List of added variants
  interface VariantState {
    optionKeys: string[];
    sku: string;
    baseprice: number;
    saleprice: number | '';
    quantity: number;
    condition: string;
    specs: { key: string; value: string }[];
  }
  const [variants, setVariants] = useState<VariantState[]>([]);

  // Step 4: Specs
  const [activeSpecs, setActiveSpecs] = useState<string[]>([]);
  const [specsData, setSpecsData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      brandsApi.getAll().then(res => setBrands(res.data));
      categoriesApi.getAll().then(res => setCategories(res.data));
      resetForm();
    }
  }, [isOpen]);

  // Sync default values from Step 1 to active variant when Step 1 changes
  useEffect(() => {
    setVariantBasePrice(baseprice);
    setVariantSalePrice(saleprice);
    setVariantStock(stock);
  }, [baseprice, saleprice, stock, step]);

  // Auto-generate SKU based on product name and active options
  useEffect(() => {
    if (productname) {
      const cleanName = productname.substring(0, 5).toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
      const cleanColor = activeColor.replace(/\s+/g, '').replace(/%/g, '').toUpperCase();
      const cleanRam = activeRam.replace(/\s+/g, '').replace(/%/g, '').toUpperCase();
      const cleanRom = activeRom.replace(/\s+/g, '').replace(/%/g, '').toUpperCase();
      const cleanCond = activeCondition.replace(/\s+/g, '').replace(/%/g, '').toUpperCase();
      const cleanOrigin = activeOrigin.replace(/\s+/g, '').replace(/%/g, '').toUpperCase();
      setVariantSku(`${cleanName}-${cleanColor}-${cleanRam}-${cleanRom}-${cleanCond}-${cleanOrigin}`);
    }
  }, [productname, activeColor, activeRam, activeRom, activeCondition, activeOrigin]);

  const resetForm = () => {
    setStep(1);
    setError(null);
    setProductname('');
    setBrandid('');
    setCategoryid('');
    setBaseprice('');
    setHasDiscount(false);
    setSaleprice('');
    setStock('');
    setDescription('');
    setVariants([]);
    setActiveSpecs([]);
    setSpecsData({});
    // Reset active options
    setActiveColor('Đen');
    setActiveRam('8GB');
    setActiveRom('128GB');
    setActiveCondition('New Seal');
    setActiveOrigin('Chính hãng');
    setCustomColor('');
  };

  // Step 2 Helpers
  const insertImage = () => {
    const url = prompt('Nhập URL hình ảnh:');
    if (!url) return;
    const textarea = descriptionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const insertText = `\n![Hình ảnh](${url})\n`;
    
    setDescription(before + insertText + after);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
    }, 50);
  };

  // Step 3 Helpers
  const handleAddCustomColor = () => {
    if (!customColor.trim()) return;
    const cleanColor = customColor.trim();
    if (!allColors.includes(cleanColor)) {
      setAllColors([...allColors, cleanColor]);
    }
    setActiveColor(cleanColor);
    setCustomColor('');
  };

  const handleAddVariant = () => {
    setError(null);
    if (!variantSku.trim()) {
      setError('Vui lòng nhập mã SKU cho biến thể.');
      return;
    }
    const cleanSku = variantSku.trim();
    if (variants.some(v => v.sku === cleanSku)) {
      setError(`Mã SKU [${cleanSku}] đã được thêm.`);
      return;
    }
    if (variantBasePrice === '' || Number(variantBasePrice) <= 0) {
      setError('Giá gốc của biến thể phải lớn hơn 0.');
      return;
    }
    if (variantStock === '' || Number(variantStock) < 0) {
      setError('Số lượng tồn kho phải là số không âm.');
      return;
    }

    const optionKeys = [activeColor, activeRam, activeRom, activeCondition, activeOrigin];
    const specsList = [
      { key: 'Màu sắc', value: activeColor },
      { key: 'RAM', value: activeRam },
      { key: 'Bộ nhớ trong', value: activeRom },
      { key: 'Tình trạng', value: activeCondition },
      { key: 'Xuất xứ', value: activeOrigin }
    ];

    setVariants([
      ...variants,
      {
        optionKeys,
        sku: cleanSku,
        baseprice: Number(variantBasePrice),
        saleprice: variantSalePrice ? Number(variantSalePrice) : '',
        quantity: Number(variantStock),
        condition: activeCondition,
        specs: specsList
      }
    ]);
  };

  const handleRemoveVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx));
  };

  // Step 4 Helpers
  const toggleSpec = (spec: string) => {
    if (activeSpecs.includes(spec)) {
      setActiveSpecs(activeSpecs.filter(s => s !== spec));
      // Remove value too
      const updated = { ...specsData };
      delete updated[spec];
      setSpecsData(updated);
    } else {
      setActiveSpecs([...activeSpecs, spec]);
      setSpecsData({ ...specsData, [spec]: '' });
    }
  };

  const handleSpecValChange = (spec: string, value: string) => {
    setSpecsData({ ...specsData, [spec]: value });
  };

  // Navigation validation
  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!productname.trim()) return setError('Vui lòng nhập tên sản phẩm.');
      if (!categoryid) return setError('Vui lòng chọn danh mục.');
      if (!brandid) return setError('Vui lòng chọn thương hiệu.');
      if (baseprice === '' || Number(baseprice) <= 0) return setError('Giá gốc sản phẩm phải lớn hơn 0.');
      if (hasDiscount && (saleprice === '' || Number(saleprice) < 0)) return setError('Giá giảm không hợp lệ.');
      if (hasDiscount && Number(saleprice) > Number(baseprice)) return setError('Giá giảm không được lớn hơn giá gốc.');
      if (stock === '' || Number(stock) < 0) return setError('Số lượng tồn kho phải là số không âm.');
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (variants.length === 0) return setError('Vui lòng tạo ít nhất 1 biến thể cho sản phẩm.');
      setStep(4);
    } else if (step === 4) {
      // Validate active specs have values
      for (const spec of activeSpecs) {
        if (!specsData[spec] || !specsData[spec].trim()) {
          return setError(`Vui lòng nhập giá trị cho thông số đã chọn: "${spec}".`);
        }
      }
      setStep(5);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const parsedVariants: CreateFullProductVariant[] = variants.map(v => {
        // Build specs for this variant: option specs + active specs
        const specsList = [...v.specs];

        // Add step 4 specs
        activeSpecs.forEach(specName => {
          if (specsData[specName]?.trim()) {
            specsList.push({ key: specName, value: specsData[specName].trim() });
          }
        });

        return {
          sku: v.sku.trim(),
          baseprice: Number(v.baseprice),
          saleprice: v.saleprice ? Number(v.saleprice) : undefined,
          condition: v.condition,
          quantity: Number(v.quantity),
          specs: specsList
        };
      });

      const payload: CreateFullProduct = {
        productname: productname.trim(),
        description: description.trim(),
        categoryid: Number(categoryid),
        brandid: Number(brandid),
        variants: parsedVariants
      };

      await onSubmit(payload);
      onClose();
      resetForm();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || 'Có lỗi phát sinh khi tạo sản phẩm.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Thêm sản phẩm mới" onClose={onClose} size="xl">
      <div className="w-full pb-6">
        
        {/* Step Navigation Bar */}
        <div className="flex items-center gap-2 mb-8 pt-2 overflow-x-auto pb-2 border-b border-slate-100">
          {[
            { s: 1, label: 'Thông tin cơ bản' },
            { s: 2, label: 'Mô tả sản phẩm' },
            { s: 3, label: 'Các lựa chọn' },
            { s: 4, label: 'Thông số kĩ thuật' },
            { s: 5, label: 'Hoàn tất' }
          ].map((item, idx) => (
            <React.Fragment key={item.s}>
              <div className={`flex items-center gap-2 shrink-0 ${step === item.s ? 'text-blue-600 font-bold' : step > item.s ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 ${
                  step === item.s ? 'border-blue-600 bg-blue-50 text-blue-600' :
                  step > item.s ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400'
                }`}>
                  {step > item.s ? '✓' : item.s}
                </div>
                <span className="text-xs">{item.label}</span>
              </div>
              {idx < 4 && <div className={`w-4 h-0.5 shrink-0 ${step > item.s ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="font-semibold">{error}</div>
          </div>
        )}

        {/* STEP 1: THÔNG TIN CƠ BẢN */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <Input label="Tên sản phẩm *" value={productname} onChange={e => setProductname(e.target.value)} placeholder="VD: Google Pixel 8 Pro" />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Danh mục *</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-blue-500 bg-white" value={categoryid} onChange={e => setCategoryid(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.categoryid} value={c.categoryid}>{c.categoryname}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Thương hiệu *</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-blue-500 bg-white" value={brandid} onChange={e => setBrandid(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">-- Chọn thương hiệu --</option>
                  {brands.map(b => <option key={b.brandid} value={b.brandid}>{b.brandname}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <Input type="number" label="Giá gốc (đ) *" value={baseprice} onChange={e => setBaseprice(e.target.value ? Number(e.target.value) : '')} placeholder="0" />
              
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-600 uppercase">Giá giảm</label>
                <div className="flex items-center gap-2 h-10 border-2 border-slate-200 rounded-xl px-3 bg-slate-50">
                  <input type="checkbox" id="hasDiscount" checked={hasDiscount} onChange={e => {
                    setHasDiscount(e.target.checked);
                    if (!e.target.checked) setSaleprice('');
                  }} className="rounded text-blue-600 cursor-pointer" />
                  <label htmlFor="hasDiscount" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Áp dụng giá giảm</label>
                </div>
              </div>

              <div>
                <Input type="number" value={saleprice} onChange={e => setSaleprice(e.target.value ? Number(e.target.value) : '')} disabled={!hasDiscount} placeholder="0" className="disabled:bg-slate-100" />
              </div>
            </div>

            <div className="w-1/3">
              <Input type="number" label="Số lượng tồn kho *" value={stock} onChange={e => setStock(e.target.value ? Number(e.target.value) : '')} placeholder="0" />
            </div>
          </div>
        )}

        {/* STEP 2: MÔ TẢ SẢN PHẨM */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-600 uppercase">Mô tả sản phẩm</label>
              <button type="button" onClick={insertImage} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs rounded-xl transition-colors">
                <ImageIcon size={14} /> Chèn hình ảnh vào mô tả
              </button>
            </div>
            <textarea
              id="description-textarea"
              ref={descriptionRef}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm h-64 focus:outline-none focus:border-blue-500 font-medium placeholder:text-slate-400"
              placeholder="Nhập mô tả sản phẩm ở đây. Bạn có thể sử dụng markdown hoặc chèn hình ảnh bằng nút chèn ảnh phía trên."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
        )}

        {/* STEP 3: CÁC LỰA CHỌN */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Thiết lập biến thể (Variants)</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Màu sắc */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Màu sắc</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 bg-white font-medium" value={activeColor} onChange={e => setActiveColor(e.target.value)}>
                    {allColors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5 mt-2">
                    <input type="text" placeholder="Thêm màu..." value={customColor} onChange={e => setCustomColor(e.target.value)}
                      className="border border-slate-300 rounded-lg px-2 py-1 text-xs w-full outline-none focus:border-blue-400" />
                    <button type="button" onClick={handleAddCustomColor} className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded-lg transition-colors shrink-0">Thêm</button>
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RAM</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 bg-white font-medium" value={activeRam} onChange={e => setActiveRam(e.target.value)}>
                    {allRams.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Bộ nhớ trong */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bộ nhớ trong</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 bg-white font-medium" value={activeRom} onChange={e => setActiveRom(e.target.value)}>
                    {allRoms.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Tình trạng */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tình trạng máy</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 bg-white font-medium" value={activeCondition} onChange={e => setActiveCondition(e.target.value)}>
                    {allConditions.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                  </select>
                </div>

                {/* Xuất xứ */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Xuất xứ</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-blue-500 bg-white font-medium" value={activeOrigin} onChange={e => setActiveOrigin(e.target.value)}>
                    {allOrigins.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Variant Details Inputs */}
              <div className="border-t border-slate-200/50 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="col-span-2 sm:col-span-2">
                  <Input label="Mã SKU Biến thể" value={variantSku} onChange={e => setVariantSku(e.target.value)} />
                </div>
                <div>
                  <Input type="number" label="Giá gốc (đ) *" value={variantBasePrice} onChange={e => setVariantBasePrice(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div>
                  <Input type="number" label="Giá giảm (đ)" value={variantSalePrice} onChange={e => setVariantSalePrice(e.target.value ? Number(e.target.value) : '')} />
                </div>
                <div>
                  <Input type="number" label="Số lượng tồn kho *" value={variantStock} onChange={e => setVariantStock(e.target.value ? Number(e.target.value) : '')} />
                </div>
              </div>

              <div className="pt-2">
                <Button variant="primary" onClick={handleAddVariant} className="w-full justify-center font-bold">
                  + Thêm biến thể này vào danh sách
                </Button>
              </div>
            </div>

            {/* List of Added Variants */}
            <div className="space-y-3">
              <h4 className="font-black text-slate-800 text-sm">Danh sách các biến thể của sản phẩm ({variants.length})</h4>
              
              {variants.length === 0 ? (
                <div className="text-center p-8 text-slate-400 font-medium italic border-2 border-dashed border-slate-200 rounded-2xl bg-white">
                  Chưa có biến thể nào được chọn. Nhập cấu hình phía trên và nhấn Thêm biến thể.
                </div>
              ) : (
                <div className="grid gap-3 max-h-64 overflow-y-auto pr-1">
                  {variants.map((v, idx) => (
                    <div key={idx} className="p-3.5 border border-slate-200 rounded-2xl bg-white shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-blue-600">{v.sku}</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{v.optionKeys.join(' • ')}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Giá gốc: {v.baseprice.toLocaleString('vi-VN')}đ 
                          {v.saleprice ? ` | Giá giảm: ${v.saleprice.toLocaleString('vi-VN')}đ` : ''} 
                          {` | Tồn kho: ${v.quantity} máy`}
                        </p>
                      </div>
                      <button type="button" onClick={() => handleRemoveVariant(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* STEP 4: THÔNG SỐ KĨ THUẬT */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wide">Nhấp vào nút để kích hoạt và điền thông số kỹ thuật:</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border-b border-slate-100 pb-4">
              {SPEC_KEYS.map(spec => {
                const isActive = activeSpecs.includes(spec);
                return (
                  <button key={spec} type="button" onClick={() => toggleSpec(spec)}
                    className={`px-3 py-2 text-left text-xs font-bold rounded-xl border-2 transition-colors flex items-center justify-between ${
                      isActive ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}>
                    <span className="truncate">{spec}</span>
                    <span className="text-[10px] opacity-75">{isActive ? 'ON' : 'OFF'}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
              {activeSpecs.length === 0 ? (
                <div className="text-center p-8 text-slate-400 font-medium italic border-2 border-dashed border-slate-100 rounded-2xl">
                  Chưa kích hoạt thông số kỹ thuật nào.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeSpecs.map(spec => (
                    <div key={spec}>
                      <Input label={`${spec} *`} value={specsData[spec] ?? ''} onChange={e => handleSpecValChange(spec, e.target.value)} placeholder={`Nhập ${spec.toLowerCase()}...`} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: HOÀN TẤT */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="text-center max-w-md mx-auto">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle size={28} />
              </div>
              <h3 className="text-lg font-black text-slate-800">Thông tin sản phẩm đã sẵn sàng</h3>
              <p className="text-xs text-slate-400 mt-1">Vui lòng rà soát lại thông tin trước khi nhấn Xác nhận tạo sản phẩm.</p>
            </div>

            <div className="border border-slate-200 rounded-2xl bg-white p-5 shadow-sm space-y-4 text-sm max-w-2xl mx-auto">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Tên sản phẩm</span>
                  <p className="font-bold text-slate-800 mt-0.5">{productname}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Giá bán cơ bản</span>
                  <p className="font-bold text-red-500 mt-0.5">
                    {baseprice ? baseprice.toLocaleString('vi-VN') + 'đ' : '—'} 
                    {hasDiscount && saleprice ? ` (Giảm còn: ${saleprice.toLocaleString('vi-VN')}đ)` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Danh mục</span>
                  <p className="font-bold text-slate-800 mt-0.5">{categories.find(c => c.categoryid === categoryid)?.categoryname || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Thương hiệu</span>
                  <p className="font-bold text-slate-800 mt-0.5">{brands.find(b => b.brandid === brandid)?.brandname || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Tổng tồn kho dự kiến</span>
                  <p className="font-bold text-blue-600 mt-0.5">{stock ? stock.toLocaleString('vi-VN') + ' máy' : '0'}</p>
                </div>
              </div>

              {/* Tóm tắt Lựa chọn */}
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Các lựa chọn cấu hình ({variants.length} biến thể)</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {variants.map((v, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                      {v.sku} ({v.condition}) - {v.quantity} máy
                    </span>
                  ))}
                </div>
              </div>

              {/* Tóm tắt Specs */}
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase">Thông số kỹ thuật kỹ thuật ({activeSpecs.length} thông số)</span>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-2 text-xs">
                  {activeSpecs.map(spec => (
                    <div key={spec} className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-500 font-semibold">{spec}</span>
                      <span className="text-slate-800 font-black text-right">{specsData[spec]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button Footer */}
        <div className="mt-8 flex justify-between items-center sticky bottom-0 bg-white border-t border-slate-100 pt-4 z-10">
          {step > 1 ? (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Quay lại
            </Button>
          ) : <div />}

          {step < 5 ? (
            <Button variant="primary" onClick={handleNext} className="min-w-[120px]">
              Tiếp theo
            </Button>
          ) : (
            <Button variant="primary" isLoading={submitting} onClick={handleSubmit} className="min-w-[120px]">
              Xác nhận tạo
            </Button>
          )}
        </div>

      </div>
    </Modal>
  );
};
