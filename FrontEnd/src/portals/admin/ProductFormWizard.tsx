import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { brandsApi } from '@/features/brands/api/brandsApi';
import { categoriesApi } from '@/features/categories/api/categoriesApi';
import { productsApi } from '@/features/products/api/productsApi';
import { productSeriesApi, type ProductSeries } from '@/features/productSeries/api/productSeriesApi';
import type {
  CreateFullProduct,
  CreateFullProductVariant,
  UploadedProductImage,
} from '@/features/products/api/productsApi';
import { 
  AlertCircle, 
  CheckCircle, 
  Image as ImageIcon,
  LoaderCircle,
  Upload,
  Trash2
} from 'lucide-react';
import { getApiErrorMessage } from '@/utils/apiError';

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

interface WizardImage {
  imageurl: string;
  ismain: boolean;
  uploadedFileName?: string;
}

export const ProductFormWizard: React.FC<ProductFormWizardProps> = ({ isOpen, onClose, onSubmit }) => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Lookups
  const [brands, setBrands] = useState<{ brandid: number; brandname: string }[]>([]);
  const [categories, setCategories] = useState<{ categoryid: number; categoryname: string }[]>([]);
  const [seriesList, setSeriesList] = useState<ProductSeries[]>([]);

  // Step 1: Base Info
  const [productname, setProductname] = useState('');
  const [brandid, setBrandid] = useState<number | ''>('');
  const [categoryid, setCategoryid] = useState<number | ''>('');
  const [seriesid, setSeriesid] = useState<number | ''>('');
  const [baseprice, setBaseprice] = useState<number | ''>('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [saleprice, setSaleprice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');

  // Step 2: Description
  const [description, setDescription] = useState('');
  const [descriptionImages, setDescriptionImages] = useState<UploadedProductImage[]>([]);
  const [uploadingDescriptionImages, setUploadingDescriptionImages] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const descriptionImageInputRef = useRef<HTMLInputElement>(null);

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
  const [activeImages, setActiveImages] = useState<WizardImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  // List of added variants
  interface VariantState {
    optionKeys: string[];
    sku: string;
    baseprice: number;
    saleprice: number | '';
    quantity: number;
    condition: string;
    specs: { key: string; value: string }[];
    images: WizardImage[];
  }
  const [variants, setVariants] = useState<VariantState[]>([]);
  const allocatedStock = variants.reduce((sum, variant) => sum + variant.quantity, 0);
  const totalBatchStock = stock === '' ? 0 : Number(stock);
  const remainingStock = totalBatchStock - allocatedStock;

  // Step 4: Specs
  const [activeSpecs, setActiveSpecs] = useState<string[]>([]);
  const [specsData, setSpecsData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      brandsApi.getAll().then(res => setBrands(res.data));
      categoriesApi.getAll().then(res => setCategories(res.data));
      productSeriesApi.getAll({ activeOnly: true }).then(res => setSeriesList(res.data));
      resetForm();
    }
  }, [isOpen]);

  useEffect(() => {
    if (seriesid && brandid) {
      const selected = seriesList.find(series => series.seriesid === seriesid);
      if (selected && selected.brandid !== brandid) {
        setSeriesid('');
      }
    }
  }, [brandid, seriesid, seriesList]);

  const filteredSeries = brandid
    ? seriesList.filter(series => series.brandid === brandid)
    : [];

  // Sync default values from Step 1 to active variant when Step 1 changes
  useEffect(() => {
    setVariantBasePrice(baseprice);
    setVariantSalePrice(saleprice);
  }, [baseprice, saleprice]);

  useEffect(() => {
    if (step === 3 && variantStock === '') {
      setVariantStock(Math.max(remainingStock, 0));
    }
  }, [step, remainingStock, variantStock]);

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
    setSeriesid('');
    setBaseprice('');
    setHasDiscount(false);
    setSaleprice('');
    setStock('');
    setDescription('');
    setDescriptionImages([]);
    setUploadingDescriptionImages(false);
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
    setVariantSku('');
    setVariantBasePrice('');
    setVariantSalePrice('');
    setVariantStock('');
    setActiveImages([]);
    setUploadingImages(false);
  };

  // Step 2 Helpers
  const insertDescriptionImageMarkdown = (images: UploadedProductImage[]) => {
    const textarea = descriptionRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const insertText = images
      .map(image => `\n![Hình ảnh sản phẩm](${image.url})\n`)
      .join('');

    setDescription(before + insertText + after);

    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + insertText.length;
    }, 50);
  };

  const handleUploadDescriptionImages = async (files: File[]) => {
    if (files.length === 0) return;
    if (files.length > 8) {
      setError('Mỗi lần chỉ được chọn tối đa 8 ảnh mô tả.');
      return;
    }

    setUploadingDescriptionImages(true);
    setError(null);
    try {
      const response = await productsApi.uploadImages(files);
      setDescriptionImages(current => [...current, ...response.data]);
      insertDescriptionImageMarkdown(response.data);
    } catch (error) {
      setError(getApiErrorMessage(error, 'Không thể tải ảnh mô tả lên.'));
    } finally {
      setUploadingDescriptionImages(false);
      if (descriptionImageInputRef.current) {
        descriptionImageInputRef.current.value = '';
      }
    }
  };

  const removeDescriptionImage = async (image: UploadedProductImage) => {
    await productsApi.deleteUploadedImage(image.fileName).catch(() => undefined);
    setDescriptionImages(current =>
      current.filter(item => item.fileName !== image.fileName)
    );
    setDescription(current =>
      current
        .replace(`\n![Hình ảnh sản phẩm](${image.url})\n`, '\n')
        .replace(`![Hình ảnh sản phẩm](${image.url})`, '')
    );
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

  const cleanupUploadedFiles = async (images: WizardImage[]) => {
    const fileNames = [...new Set(
      images
        .map(image => image.uploadedFileName)
        .filter((fileName): fileName is string => Boolean(fileName))
    )];

    await Promise.allSettled(
      fileNames.map(fileName => productsApi.deleteUploadedImage(fileName))
    );
  };

  const handleUploadImages = async (files: File[]) => {
    if (files.length === 0) return;

    const remainingSlots = 8 - activeImages.length;
    if (files.length > remainingSlots) {
      setError(`Biến thể này chỉ còn có thể thêm ${remainingSlots} ảnh.`);
      return;
    }

    setUploadingImages(true);
    setError(null);
    try {
      const response = await productsApi.uploadImages(files);
      setActiveImages(current => [
        ...current,
        ...response.data.map((image, index) => ({
          imageurl: image.url,
          ismain: current.length === 0 && index === 0,
          uploadedFileName: image.fileName,
        })),
      ]);
    } catch (error) {
      setError(getApiErrorMessage(error, 'Không thể tải hình ảnh lên máy chủ.'));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const removedImage = activeImages[index];
    if (removedImage?.uploadedFileName) {
      void productsApi.deleteUploadedImage(removedImage.uploadedFileName);
    }

    const remaining = activeImages.filter((_, imageIndex) => imageIndex !== index);
    if (remaining.length > 0 && !remaining.some(image => image.ismain)) {
      remaining[0] = { ...remaining[0], ismain: true };
    }
    setActiveImages(remaining);
  };

  const handleSetMainImage = (index: number) => {
    setActiveImages(activeImages.map((image, imageIndex) => ({
      ...image,
      ismain: imageIndex === index,
    })));
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

    if (Number(variantStock) > remainingStock) {
      setError(
        `Biến thể này vượt quá số lượng còn lại của lô hàng. Chỉ còn ${Math.max(remainingStock, 0)} máy chưa phân bổ.`
      );
      return;
    }

    if (activeImages.length === 0) {
      setError('Vui lòng thêm ít nhất 1 hình ảnh cho biến thể.');
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
        specs: specsList,
        images: activeImages.map(image => ({ ...image })),
      }
    ]);
    setActiveImages([]);
    setVariantStock(Math.max(remainingStock - Number(variantStock), 0));
  };

  const handleRemoveVariant = (idx: number) => {
    void cleanupUploadedFiles(variants[idx]?.images ?? []);
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleClose = async () => {
    if (submitting || uploadingImages) return;

    await cleanupUploadedFiles([
      ...activeImages,
      ...variants.flatMap(variant => variant.images),
      ...descriptionImages.map(image => ({
        imageurl: image.url,
        ismain: false,
        uploadedFileName: image.fileName,
      })),
    ]);
    resetForm();
    onClose();
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
      if (allocatedStock !== totalBatchStock) {
        return setError(
          `Bạn mới phân bổ ${allocatedStock}/${totalBatchStock} máy. Tổng số lượng các biến thể phải bằng đúng số lượng lô hàng.`
        );
      }
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
    setError(null);
    if (allocatedStock !== totalBatchStock) {
      setError(
        `Tổng số lượng các biến thể (${allocatedStock}) phải bằng số lượng lô hàng (${totalBatchStock}).`
      );
      return;
    }
    setSubmitting(true);
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
          specs: specsList,
          images: v.images.map(image => ({
            imageurl: image.imageurl,
            ismain: image.ismain,
          })),
        };
      });

      const payload: CreateFullProduct = {
        productname: productname.trim(),
        description: description.trim(),
        categoryid: Number(categoryid),
        brandid: Number(brandid),
        seriesid: seriesid ? Number(seriesid) : undefined,
        totalquantity: totalBatchStock,
        variants: parsedVariants
      };

      await onSubmit(payload);
      onClose();
      resetForm();
    } catch (error) {
      console.error(error);
      setError(getApiErrorMessage(error, 'Có lỗi phát sinh khi tạo sản phẩm.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Thêm sản phẩm mới" onClose={() => { void handleClose(); }} size="xl">
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
              <div className={`flex items-center gap-2 shrink-0 ${step === item.s ? 'text-[#4f46e5] font-bold' : step > item.s ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 ${
                  step === item.s ? 'border-[#4f46e5] bg-indigo-50 text-[#4f46e5]' :
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
                <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-[#4f46e5] bg-white" value={categoryid} onChange={e => setCategoryid(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map(c => <option key={c.categoryid} value={c.categoryid}>{c.categoryname}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Thương hiệu *</label>
                <select className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-[#4f46e5] bg-white" value={brandid} onChange={e => {
                  setBrandid(e.target.value ? Number(e.target.value) : '');
                  setSeriesid('');
                }}>
                  <option value="">-- Chọn thương hiệu --</option>
                  {brands.map(b => <option key={b.brandid} value={b.brandid}>{b.brandname}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dòng máy</label>
                <select
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm focus:border-[#4f46e5] bg-white disabled:bg-slate-100"
                  value={seriesid}
                  disabled={!brandid || filteredSeries.length === 0}
                  onChange={e => setSeriesid(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">{brandid ? '-- Chọn dòng máy --' : '-- Chọn thương hiệu trước --'}</option>
                  {filteredSeries.map(series => <option key={series.seriesid} value={series.seriesid}>{series.seriesname}</option>)}
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
                  }} className="rounded text-[#4f46e5] cursor-pointer" />
                  <label htmlFor="hasDiscount" className="text-xs font-bold text-slate-700 cursor-pointer select-none">Áp dụng giá giảm</label>
                </div>
              </div>

              <div>
                <Input type="number" value={saleprice} onChange={e => setSaleprice(e.target.value ? Number(e.target.value) : '')} disabled={!hasDiscount} placeholder="0" className="disabled:bg-slate-100" />
              </div>
            </div>

            <div className="w-1/3">
              <Input type="number" min={0} label="Số lượng lô hàng ban đầu *" value={stock} onChange={e => setStock(e.target.value ? Number(e.target.value) : '')} placeholder="0" />
            </div>
          </div>
        )}

        {/* STEP 2: MÔ TẢ SẢN PHẨM */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-600 uppercase">Mô tả sản phẩm</label>
              <input
                ref={descriptionImageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={event => {
                  void handleUploadDescriptionImages(Array.from(event.target.files ?? []));
                }}
              />
              <button
                type="button"
                onClick={() => descriptionImageInputRef.current?.click()}
                disabled={uploadingDescriptionImages}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-[#4f46e5] font-bold text-xs rounded-xl transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingDescriptionImages
                  ? <LoaderCircle size={14} className="animate-spin" />
                  : <ImageIcon size={14} />}
                {uploadingDescriptionImages ? 'Đang tải ảnh...' : 'Chèn ảnh từ máy'}
              </button>
            </div>
            <textarea
              id="description-textarea"
              ref={descriptionRef}
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm h-64 focus:outline-none focus:border-[#4f46e5] font-medium placeholder:text-slate-400"
              placeholder="Nhập mô tả sản phẩm ở đây. Bạn có thể sử dụng markdown hoặc chèn hình ảnh bằng nút chèn ảnh phía trên."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <p className="text-xs leading-5 text-slate-500">
              Đặt con trỏ tại vị trí muốn chèn rồi chọn ảnh từ máy. Hỗ trợ JPG, PNG, WebP; tối đa 5 MB mỗi ảnh.
            </p>
            {descriptionImages.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {descriptionImages.map(image => (
                  <div
                    key={image.fileName}
                    className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5"
                  >
                    <img src={image.url} alt="" className="h-9 w-9 rounded object-cover" />
                    <span className="max-w-32 truncate text-[11px] font-medium text-slate-600">
                      {image.fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => { void removeDescriptionImage(image); }}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      title="Xóa ảnh mô tả"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: CÁC LỰA CHỌN */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className={`rounded-2xl border p-4 ${
              remainingStock === 0
                ? 'border-emerald-200 bg-emerald-50'
                : remainingStock < 0
                  ? 'border-red-200 bg-red-50'
                  : 'border-indigo-200 bg-indigo-50'
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-slate-600">Phân bổ lô hàng theo biến thể</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Đã phân bổ <strong>{allocatedStock}</strong> trên tổng <strong>{totalBatchStock}</strong> máy.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${
                  remainingStock === 0
                    ? 'bg-emerald-200 text-emerald-800'
                    : remainingStock < 0
                      ? 'bg-red-200 text-red-800'
                      : 'bg-indigo-100 text-[#4338ca]'
                }`}>
                  {remainingStock >= 0 ? `Còn ${remainingStock} máy` : `Vượt ${Math.abs(remainingStock)} máy`}
                </span>
              </div>
            </div>
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Thiết lập biến thể (Variants)</h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {/* Màu sắc */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Màu sắc</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#4f46e5] bg-white font-medium" value={activeColor} onChange={e => setActiveColor(e.target.value)}>
                    {allColors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="flex items-center gap-1.5 mt-2">
                    <input type="text" placeholder="Thêm màu..." value={customColor} onChange={e => setCustomColor(e.target.value)}
                      className="border border-slate-300 rounded-2xl px-2 py-1 text-xs w-full outline-none focus:border-[#4f46e5]" />
                    <button type="button" onClick={handleAddCustomColor} className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[10px] rounded-2xl transition-colors shrink-0">Thêm</button>
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RAM</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#4f46e5] bg-white font-medium" value={activeRam} onChange={e => setActiveRam(e.target.value)}>
                    {allRams.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                {/* Bộ nhớ trong */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Bộ nhớ trong</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#4f46e5] bg-white font-medium" value={activeRom} onChange={e => setActiveRom(e.target.value)}>
                    {allRoms.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Tình trạng */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tình trạng máy</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#4f46e5] bg-white font-medium" value={activeCondition} onChange={e => setActiveCondition(e.target.value)}>
                    {allConditions.map(cond => <option key={cond} value={cond}>{cond}</option>)}
                  </select>
                </div>

                {/* Xuất xứ */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Xuất xứ</label>
                  <select className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:border-[#4f46e5] bg-white font-medium" value={activeOrigin} onChange={e => setActiveOrigin(e.target.value)}>
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
                  <Input
                    type="number"
                    min={0}
                    max={Math.max(remainingStock, 0)}
                    label={`Số lượng biến thể * (còn ${Math.max(remainingStock, 0)})`}
                    value={variantStock}
                    onChange={e => setVariantStock(e.target.value ? Number(e.target.value) : '')}
                  />
                </div>
              </div>

              <div className="border-t border-slate-200/50 pt-4 space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-600">Hình ảnh biến thể *</h4>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Nên thêm 4-5 ảnh. Ảnh đại diện dùng ở danh sách, các ảnh còn lại dùng trong gallery chi tiết.
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">{activeImages.length}/8 ảnh</span>
                </div>

                <label
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-4 text-sm font-bold transition-colors ${
                    uploadingImages || activeImages.length >= 8
                      ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                      : 'border-indigo-200 bg-indigo-50 text-[#4338ca] hover:border-indigo-300 hover:bg-indigo-100'
                  }`}
                >
                  {uploadingImages ? <LoaderCircle size={18} className="animate-spin" /> : <Upload size={18} />}
                  {uploadingImages ? 'Đang tải ảnh lên...' : 'Chọn nhiều ảnh từ máy'}
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploadingImages || activeImages.length >= 8}
                    className="hidden"
                    onChange={event => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = '';
                      void handleUploadImages(files);
                    }}
                  />
                </label>

                {activeImages.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-white py-7 text-xs font-medium text-slate-400">
                    <ImageIcon size={18} />
                    Chưa có hình ảnh cho biến thể này.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {activeImages.map((image, imageIndex) => (
                      <div
                        key={image.imageurl}
                        className={`relative overflow-hidden rounded-xl border-2 bg-white p-2 ${
                          image.ismain ? 'border-[#4f46e5] ring-2 ring-indigo-100' : 'border-slate-200'
                        }`}
                      >
                        <div className="aspect-square overflow-hidden rounded-2xl bg-slate-50">
                          <img src={image.imageurl} alt="" className="h-full w-full object-contain" />
                        </div>
                        <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                          <input
                            type="radio"
                            name="main-variant-image"
                            checked={image.ismain}
                            onChange={() => handleSetMainImage(imageIndex)}
                          />
                          Ảnh đại diện
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(imageIndex)}
                          className="absolute right-2 top-2 rounded-2xl bg-white/90 p-1.5 text-red-500 shadow hover:bg-red-50"
                          aria-label="Xóa hình ảnh"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
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
                    <div key={idx} className="p-3.5 border border-slate-200 rounded-2xl bg-white shadow-[0_10px_28px_rgba(15,23,42,0.06)] flex items-center justify-between hover:border-slate-300 transition-colors">
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-[#4f46e5]">{v.sku}</p>
                        <p className="text-xs font-bold text-slate-700 mt-0.5">{v.optionKeys.join(' • ')}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Giá gốc: {v.baseprice.toLocaleString('vi-VN')}đ 
                          {v.saleprice ? ` | Giá giảm: ${v.saleprice.toLocaleString('vi-VN')}đ` : ''} 
                          {` | Tồn kho: ${v.quantity} máy`}
                        </p>
                      </div>
                      <button type="button" onClick={() => handleRemoveVariant(idx)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-colors shrink-0">
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
                      isActive ? 'bg-[#4f46e5] border-[#4f46e5] text-white' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
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

            <div className="border border-slate-200 rounded-2xl bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.06)] space-y-4 text-sm max-w-2xl mx-auto">
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
                  <span className="text-xs font-bold text-slate-400 uppercase">Dòng máy</span>
                  <p className="font-bold text-slate-800 mt-0.5">{seriesList.find(series => series.seriesid === seriesid)?.seriesname || '—'}</p>
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase">Phân bổ lô hàng</span>
                  <p className={`font-bold mt-0.5 ${allocatedStock === totalBatchStock ? 'text-emerald-600' : 'text-red-600'}`}>
                    {allocatedStock.toLocaleString('vi-VN')} / {totalBatchStock.toLocaleString('vi-VN')} máy
                  </p>
                </div>
              </div>

              {/* Tóm tắt Lựa chọn */}
              <div className="border-b border-slate-100 pb-4">
                <span className="text-xs font-bold text-slate-400 uppercase">Các lựa chọn cấu hình ({variants.length} biến thể)</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {variants.map((v, i) => (
                    <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold border border-slate-200">
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
