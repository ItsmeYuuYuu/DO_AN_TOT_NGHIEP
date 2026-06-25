import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { productsApi } from '@/features/products/api/productsApi';
import type { UpdateFullProduct, UpdateFullProductVariant } from '@/features/products/api/productsApi';
import { productSeriesApi, type ProductSeries } from '@/features/productSeries/api/productSeriesApi';
import { useAuth } from '@/features/auth/context/AuthContext';

interface ProductEditModalProps {
  productId: number | null;
  brands: { brandid: number; brandname: string }[];
  categories: { categoryid: number; categoryname: string }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}

interface EditImage {
  imageid?: number;
  imageurl: string;
  ismain: boolean;
  uploadedFileName?: string;
}

interface EditVariant {
  clientId: string;
  variantid?: number;
  sku: string;
  condition: string;
  baseprice: number | '';
  saleprice: number | '';
  quantity: number | '';
  specs: { key: string; value: string }[];
  images: EditImage[];
  expanded: boolean;
}

const inputClass =
  'w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#4f46e5] disabled:bg-slate-100 disabled:text-slate-500';

const newClientId = () => crypto.randomUUID();

export const ProductEditModal: React.FC<ProductEditModalProps> = ({
  productId,
  brands,
  categories,
  onClose,
  onSaved,
}) => {
  const { user } = useAuth();
  const contentOnly = user?.rolename === 'Content';
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productname, setProductname] = useState('');
  const [description, setDescription] = useState('');
  const [categoryid, setCategoryid] = useState<number | ''>('');
  const [brandid, setBrandid] = useState<number | ''>('');
  const [seriesid, setSeriesid] = useState<number | ''>('');
  const [seriesList, setSeriesList] = useState<ProductSeries[]>([]);
  const [variants, setVariants] = useState<EditVariant[]>([]);
  const [uploadingVariant, setUploadingVariant] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;

    setLoading(true);
    setError(null);
    Promise.all([
      productsApi.getFullDetail(productId),
      productSeriesApi.getAll({ activeOnly: true }),
    ])
      .then(([response, seriesResponse]) => {
        const product = response.data;
        setSeriesList(seriesResponse.data);
        setProductname(product.productname);
        setDescription(product.description ?? '');
        setCategoryid(product.category?.id ?? '');
        setBrandid(product.brand?.id ?? '');
        setSeriesid(product.series?.id ?? '');
        setVariants((product.productvariants ?? []).map((variant, index) => ({
          clientId: newClientId(),
          variantid: variant.variantid,
          sku: variant.sku,
          condition: variant.condition?.conditionname ?? 'New Seal',
          baseprice: variant.baseprice,
          saleprice: variant.saleprice ?? '',
          quantity: variant.stockquantity ?? 0,
          specs: (variant.attributes ?? []).map(attribute => ({
            key: attribute.attributename,
            value: attribute.valuename,
          })),
          images: (variant.productimages ?? []).map(image => ({ ...image })),
          expanded: index === 0,
        })));
      })
      .catch(() => setError('Không thể tải dữ liệu chi tiết sản phẩm.'))
      .finally(() => setLoading(false));
  }, [productId]);

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

  const updateVariant = (clientId: string, updater: (variant: EditVariant) => EditVariant) => {
    setVariants(current => current.map(variant =>
      variant.clientId === clientId ? updater(variant) : variant
    ));
  };

  const cleanupUploads = async (images: EditImage[]) => {
    const fileNames = [...new Set(
      images
        .map(image => image.uploadedFileName)
        .filter((fileName): fileName is string => Boolean(fileName))
    )];
    await Promise.allSettled(fileNames.map(fileName => productsApi.deleteUploadedImage(fileName)));
  };

  const closeSafely = async () => {
    if (saving || uploadingVariant) return;
    await cleanupUploads(variants.flatMap(variant => variant.images));
    onClose();
  };

  const addVariant = () => {
    setVariants(current => [
      ...current.map(variant => ({ ...variant, expanded: false })),
      {
        clientId: newClientId(),
        sku: '',
        condition: 'New Seal',
        baseprice: '',
        saleprice: '',
        quantity: 0,
        specs: [],
        images: [],
        expanded: true,
      },
    ]);
  };

  const removeVariant = async (variant: EditVariant) => {
    await cleanupUploads(variant.images);
    setVariants(current => current.filter(item => item.clientId !== variant.clientId));
  };

  const uploadImages = async (variant: EditVariant, files: File[]) => {
    if (files.length === 0) return;
    const remainingSlots = 8 - variant.images.length;
    if (files.length > remainingSlots) {
      setError(`Biến thể ${variant.sku || 'mới'} chỉ còn có thể thêm ${remainingSlots} ảnh.`);
      return;
    }

    setUploadingVariant(variant.clientId);
    setError(null);
    try {
      const response = await productsApi.uploadImages(files);
      updateVariant(variant.clientId, current => ({
        ...current,
        images: [
          ...current.images,
          ...response.data.map((image, index) => ({
            imageurl: image.url,
            ismain: current.images.length === 0 && index === 0,
            uploadedFileName: image.fileName,
          })),
        ],
      }));
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Không thể tải ảnh lên.'
        : 'Không thể tải ảnh lên.');
    } finally {
      setUploadingVariant(null);
    }
  };

  const removeImage = async (variant: EditVariant, imageIndex: number) => {
    const image = variant.images[imageIndex];
    if (image.uploadedFileName) {
      await productsApi.deleteUploadedImage(image.uploadedFileName).catch(() => undefined);
    }

    updateVariant(variant.clientId, current => {
      const images = current.images.filter((_, index) => index !== imageIndex);
      if (images.length > 0 && !images.some(item => item.ismain)) {
        images[0] = { ...images[0], ismain: true };
      }
      return { ...current, images };
    });
  };

  const setMainImage = (variant: EditVariant, imageIndex: number) => {
    updateVariant(variant.clientId, current => ({
      ...current,
      images: current.images.map((image, index) => ({
        ...image,
        ismain: index === imageIndex,
      })),
    }));
  };

  const updateSpec = (variant: EditVariant, specIndex: number, field: 'key' | 'value', value: string) => {
    updateVariant(variant.clientId, current => ({
      ...current,
      specs: current.specs.map((spec, index) =>
        index === specIndex ? { ...spec, [field]: value } : spec
      ),
    }));
  };

  const validate = () => {
    if (!productname.trim()) return 'Vui lòng nhập tên sản phẩm.';
    if (!categoryid) return 'Vui lòng chọn danh mục.';
    if (!brandid) return 'Vui lòng chọn thương hiệu.';
    if (variants.length === 0) return 'Sản phẩm phải có ít nhất một biến thể.';

    for (const variant of variants) {
      if (!variant.sku.trim()) return 'SKU không được để trống.';
      if (variant.baseprice === '' || Number(variant.baseprice) <= 0) {
        return `Giá gốc của SKU ${variant.sku || 'mới'} phải lớn hơn 0.`;
      }
      if (variant.saleprice !== '' && Number(variant.saleprice) > Number(variant.baseprice)) {
        return `Giá giảm của SKU ${variant.sku} không được lớn hơn giá gốc.`;
      }
      if (variant.quantity === '' || Number(variant.quantity) < 0) {
        return `Tồn kho của SKU ${variant.sku} không hợp lệ.`;
      }
      if (variant.images.length === 0) {
        return `SKU ${variant.sku} phải có ít nhất một hình ảnh.`;
      }
    }
    return null;
  };

  const save = async () => {
    if (!productId) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: UpdateFullProduct = {
      productname: productname.trim(),
      description: description.trim(),
      categoryid: Number(categoryid),
      brandid: Number(brandid),
      seriesid: seriesid ? Number(seriesid) : undefined,
      variants: variants.map<UpdateFullProductVariant>(variant => ({
        variantid: variant.variantid,
        sku: variant.sku.trim(),
        condition: variant.condition.trim(),
        baseprice: Number(variant.baseprice),
        saleprice: variant.saleprice === '' ? undefined : Number(variant.saleprice),
        quantity: Number(variant.quantity),
        specs: variant.specs
          .filter(spec => spec.key.trim())
          .map(spec => ({ key: spec.key.trim(), value: spec.value.trim() })),
        images: variant.images.map(image => ({
          imageurl: image.imageurl,
          ismain: image.ismain,
        })),
      })),
    };

    setSaving(true);
    setError(null);
    try {
      await productsApi.updateFull(productId, payload);
      setVariants(current => current.map(variant => ({
        ...variant,
        images: variant.images.map(image => ({ ...image, uploadedFileName: undefined })),
      })));
      await onSaved();
    } catch (err) {
      setError(axios.isAxiosError(err)
        ? err.response?.data?.message ?? 'Không thể cập nhật sản phẩm.'
        : 'Không thể cập nhật sản phẩm.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={productId !== null}
      onClose={() => { void closeSafely(); }}
      title="Chỉnh sửa sản phẩm"
      size="xl"
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
          <LoaderCircle size={20} className="animate-spin" />
          Đang tải dữ liệu sản phẩm...
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {contentOnly && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Tài khoản Content chỉ được chỉnh tên, mô tả, hình ảnh và thông số kỹ thuật. Giá, SKU, tồn kho, danh mục và thương hiệu được khóa để tránh sai lệch dữ liệu bán hàng.
            </div>
          )}

          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-800">Thông tin cơ bản</h3>
            <Input label="Tên sản phẩm *" value={productname} onChange={event => setProductname(event.target.value)} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Danh mục *</label>
                <select disabled={contentOnly} className={inputClass} value={categoryid} onChange={event => setCategoryid(Number(event.target.value) || '')}>
                  <option value="">Chọn danh mục</option>
                  {categories.map(category => (
                    <option key={category.categoryid} value={category.categoryid}>{category.categoryname}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Thương hiệu *</label>
                <select disabled={contentOnly} className={inputClass} value={brandid} onChange={event => {
                  setBrandid(Number(event.target.value) || '');
                  setSeriesid('');
                }}>
                  <option value="">Chọn thương hiệu</option>
                  {brands.map(brand => (
                    <option key={brand.brandid} value={brand.brandid}>{brand.brandname}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-600">Dòng máy</label>
                <select
                  className={inputClass}
                  value={seriesid}
                  disabled={contentOnly || !brandid || filteredSeries.length === 0}
                  onChange={event => setSeriesid(Number(event.target.value) || '')}
                >
                  <option value="">{brandid ? 'Chọn dòng máy' : 'Chọn thương hiệu trước'}</option>
                  {filteredSeries.map(series => (
                    <option key={series.seriesid} value={series.seriesid}>{series.seriesname}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600">Mô tả</label>
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={description}
                onChange={event => setDescription(event.target.value)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Biến thể sản phẩm</h3>
                <p className="text-xs text-slate-500">Sửa giá, tồn kho, thông số và bộ ảnh của từng SKU.</p>
              </div>
              {!contentOnly && (
                <Button size="sm" variant="secondary" onClick={addVariant}>
                  <Plus size={15} /> Thêm biến thể
                </Button>
              )}
            </div>

            {variants.map(variant => (
              <article key={variant.clientId} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-3">
                  {variant.images[0] ? (
                    <img
                      src={(variant.images.find(image => image.ismain) ?? variant.images[0]).imageurl}
                      alt=""
                      className="h-11 w-11 rounded-2xl border border-slate-200 bg-white object-contain"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200 text-slate-400">
                      <ImageIcon size={18} />
                    </div>
                  )}
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => updateVariant(variant.clientId, current => ({ ...current, expanded: !current.expanded }))}
                  >
                    <p className="truncate text-sm font-bold text-slate-800">{variant.sku || 'Biến thể mới'}</p>
                    <p className="text-xs text-slate-500">{variant.images.length} ảnh · Tồn kho {variant.quantity || 0}</p>
                  </button>
                  {!contentOnly && (
                    <button
                      type="button"
                      onClick={() => { void removeVariant(variant); }}
                      className="rounded-2xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Xóa biến thể"
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => updateVariant(variant.clientId, current => ({ ...current, expanded: !current.expanded }))}
                    className="rounded-2xl p-2 text-slate-500 hover:bg-slate-200"
                  >
                    {variant.expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {variant.expanded && (
                  <div className="space-y-5 p-4">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="lg:col-span-2">
                        <label className="mb-1 block text-xs font-bold text-slate-600">SKU *</label>
                        <input disabled={contentOnly} className={inputClass} value={variant.sku} onChange={event =>
                          updateVariant(variant.clientId, current => ({ ...current, sku: event.target.value }))
                        } />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">Tình trạng</label>
                        <input disabled={contentOnly} className={inputClass} value={variant.condition} onChange={event =>
                          updateVariant(variant.clientId, current => ({ ...current, condition: event.target.value }))
                        } />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">Giá gốc *</label>
                        <input disabled={contentOnly} type="number" className={inputClass} value={variant.baseprice} onChange={event =>
                          updateVariant(variant.clientId, current => ({
                            ...current,
                            baseprice: event.target.value ? Number(event.target.value) : '',
                          }))
                        } />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">Giá giảm</label>
                        <input disabled={contentOnly} type="number" className={inputClass} value={variant.saleprice} onChange={event =>
                          updateVariant(variant.clientId, current => ({
                            ...current,
                            saleprice: event.target.value ? Number(event.target.value) : '',
                          }))
                        } />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-600">Tồn kho *</label>
                        <input disabled={contentOnly} type="number" min={0} className={inputClass} value={variant.quantity} onChange={event =>
                          updateVariant(variant.clientId, current => ({
                            ...current,
                            quantity: event.target.value ? Number(event.target.value) : '',
                          }))
                        } />
                      </div>
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold uppercase text-slate-600">Hình ảnh ({variant.images.length}/8)</h4>
                          <p className="text-[11px] text-slate-500">Chọn một ảnh làm đại diện cho danh sách sản phẩm.</p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-bold text-[#4338ca] hover:bg-indigo-100">
                          {uploadingVariant === variant.clientId
                            ? <LoaderCircle size={15} className="animate-spin" />
                            : <Upload size={15} />}
                          Chọn ảnh
                          <input
                            type="file"
                            multiple
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            disabled={uploadingVariant !== null || variant.images.length >= 8}
                            onChange={event => {
                              const files = Array.from(event.target.files ?? []);
                              event.target.value = '';
                              void uploadImages(variant, files);
                            }}
                          />
                        </label>
                      </div>

                      {variant.images.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-slate-200 py-8 text-center text-xs text-slate-400">
                          Chưa có hình ảnh.
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          {variant.images.map((image, imageIndex) => (
                            <div
                              key={`${image.imageurl}-${imageIndex}`}
                              className={`relative rounded-xl border-2 bg-white p-2 ${
                                image.ismain ? 'border-[#4f46e5] ring-2 ring-indigo-100' : 'border-slate-200'
                              }`}
                            >
                              <img src={image.imageurl} alt="" className="aspect-square w-full rounded-2xl bg-slate-50 object-contain" />
                              <label className="mt-2 flex cursor-pointer items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                                <input
                                  type="radio"
                                  name={`main-image-${variant.clientId}`}
                                  checked={image.ismain}
                                  onChange={() => setMainImage(variant, imageIndex)}
                                />
                                Ảnh đại diện
                              </label>
                              <button
                                type="button"
                                onClick={() => { void removeImage(variant, imageIndex); }}
                                className="absolute right-2 top-2 rounded-2xl bg-white/90 p-1.5 text-red-500 shadow hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase text-slate-600">Thông số kỹ thuật</h4>
                        <button
                          type="button"
                          onClick={() => updateVariant(variant.clientId, current => ({
                            ...current,
                            specs: [...current.specs, { key: '', value: '' }],
                          }))}
                          className="inline-flex items-center gap-1 rounded-2xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                        >
                          <Plus size={14} /> Thêm thông số
                        </button>
                      </div>
                      {variant.specs.length === 0 ? (
                        <p className="rounded-2xl bg-slate-50 py-5 text-center text-xs text-slate-400">Chưa có thông số kỹ thuật.</p>
                      ) : (
                        <div className="space-y-2">
                          {variant.specs.map((spec, specIndex) => (
                            <div key={specIndex} className="flex gap-2">
                              <input
                                className={inputClass}
                                placeholder="Tên thông số"
                                value={spec.key}
                                onChange={event => updateSpec(variant, specIndex, 'key', event.target.value)}
                              />
                              <input
                                className={inputClass}
                                placeholder="Giá trị"
                                value={spec.value}
                                onChange={event => updateSpec(variant, specIndex, 'value', event.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => updateVariant(variant.clientId, current => ({
                                  ...current,
                                  specs: current.specs.filter((_, index) => index !== specIndex),
                                }))}
                                className="rounded-2xl p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </article>
            ))}
          </section>

          <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-100 bg-white pt-4">
            <Button variant="secondary" onClick={() => { void closeSafely(); }} disabled={saving || uploadingVariant !== null}>
              Hủy
            </Button>
            <Button onClick={save} isLoading={saving} disabled={uploadingVariant !== null}>
              Lưu toàn bộ thay đổi
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
