import React, { useState, useEffect } from 'react';
import { promotionsApi, type PromotionalContent } from '@/features/content/api/promotionsApi';
import { productsApi, type Product } from '@/features/products/api/productsApi';
import { Button } from '@/components/Button';
import { Edit2, Trash2, Sliders, Image, Check, X, Upload, LoaderCircle } from 'lucide-react';
import { getApiErrorMessage } from '@/utils/apiError';
import { confirmAction, notifyError, notifySuccess } from '@/utils/notifications';
import { getProductPath } from '@/features/products/utils/productLinks';


export const AdminPromotionalContents: React.FC = () => {
  const [contents, setContents] = useState<PromotionalContent[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'Slider' | 'Banner'>('Slider');
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<number | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [imageurl, setImageurl] = useState('');
  const [linkurl, setLinkurl] = useState('');
  const [displayorder, setDisplayorder] = useState(0);
  const [isactive, setIsactive] = useState(true);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    setLoading(true);
    try {
      const [contentData, productResponse] = await Promise.all([
        promotionsApi.getAll(),
        productsApi.getAll(),
      ]);
      setContents(contentData);
      setProducts(productResponse.data);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu quảng cáo:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContents = contents
    .filter(c => c.contenttype === activeTab)
    .sort((a, b) => (a.displayorder ?? 0) - (b.displayorder ?? 0));
  const selectedProductId = products.find(product => linkurl === getProductPath(product))
    ?.productid
    .toString() ?? linkurl.match(/^\/products\/(\d+)$/)?.[1] ?? '';

  const resetForm = (deleteTemporaryImage = true) => {
    if (deleteTemporaryImage && uploadedFileName) {
      void productsApi.deleteUploadedImage(uploadedFileName);
    }
    setTitle('');
    setImageurl('');
    setLinkurl('');
    setDisplayorder(0);
    setIsactive(true);
    setIsEditing(false);
    setCurrentId(null);
    setUploadedFileName(null);
  };

  const handleEdit = (c: PromotionalContent) => {
    if (uploadedFileName) {
      void productsApi.deleteUploadedImage(uploadedFileName);
    }
    setCurrentId(c.contentid);
    setTitle(c.title || '');
    setImageurl(c.imageurl);
    setLinkurl(c.linkurl || '');
    setDisplayorder(c.displayorder || 0);
    setIsactive(c.isactive ?? true);
    setIsEditing(true);
    setUploadedFileName(null);
  };

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    setUploadingImage(true);
    try {
      if (uploadedFileName) {
        await productsApi.deleteUploadedImage(uploadedFileName).catch(() => undefined);
      }
      const response = await productsApi.uploadImages([file]);
      const uploaded = response.data[0];
      setImageurl(uploaded.url);
      setUploadedFileName(uploaded.fileName);
    } catch (error) {
      notifyError(getApiErrorMessage(error, 'Không thể tải ảnh lên.'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!(await confirmAction('Bạn có chắc chắn muốn xóa nội dung quảng cáo này?', { danger: true, confirmLabel: 'Xóa' }))) return;
    try {
      await promotionsApi.delete(id);
      setContents(prev => prev.filter(c => c.contentid !== id));
      notifySuccess('Đã xóa thành công.');
    } catch {
      notifyError('Không thể xóa nội dung quảng cáo.');
    }
  };

  const handleToggleActive = async (c: PromotionalContent) => {
    try {
      const updated = await promotionsApi.update(c.contentid, {
        contenttype: c.contenttype,
        title: c.title,
        imageurl: c.imageurl,
        linkurl: c.linkurl,
        displayorder: c.displayorder,
        isactive: !c.isactive
      });
      setContents(prev => prev.map(item => item.contentid === c.contentid ? updated : item));
    } catch {
      notifyError('Không thể thay đổi trạng thái.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageurl) {
      notifyError('Vui lòng chọn hình ảnh từ máy.');
      return;
    }

    const payload = {
      contenttype: activeTab,
      title: title || undefined,
      imageurl,
      linkurl: linkurl || undefined,
      displayorder,
      isactive
    };

    try {
      if (isEditing && currentId !== null) {
        const updated = await promotionsApi.update(currentId, payload);
        setContents(prev => prev.map(item => item.contentid === currentId ? updated : item));
        notifySuccess('Cập nhật thành công.');
      } else {
        const created = await promotionsApi.create(payload);
        setContents(prev => [created, ...prev]);
        notifySuccess('Thêm mới thành công.');
      }
      setUploadedFileName(null);
      resetForm(false);
    } catch {
      notifyError('Có lỗi xảy ra khi lưu nội dung.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản lý nội dung quảng cáo</h1>
          <p className="text-sm text-slate-500 mt-1">Cấu hình các banner trang chủ và thanh trượt slider quảng cáo sản phẩm.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('Slider'); resetForm(); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'Slider'
              ? 'border-[#4f46e5] text-[#4f46e5]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sliders size={16} /> Sliders Quảng Cáo
        </button>
        <button
          onClick={() => { setActiveTab('Banner'); resetForm(); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'Banner'
              ? 'border-[#4f46e5] text-[#4f46e5]'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Image size={16} /> Banner phụ trang chủ
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white rounded-xl shadow-[0_10px_28px_rgba(15,23,42,0.06)] border border-slate-100 p-5 h-fit space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? 'Cập nhật nội dung' : `Thêm mới ${activeTab === 'Slider' ? 'Slider chính' : 'Banner phụ'}`}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tiêu đề (Tùy chọn)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề hoặc mô tả ngắn..."
                className="w-full px-3 py-2 text-sm rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Hình ảnh</label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-bold text-[#4338ca] hover:bg-indigo-100">
                {uploadingImage ? <LoaderCircle size={17} className="animate-spin" /> : <Upload size={17} />}
                {uploadingImage ? 'Đang tải ảnh...' : imageurl ? 'Chọn ảnh khác' : 'Chọn ảnh từ máy'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  disabled={uploadingImage}
                  onChange={event => {
                    void handleImageUpload(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              {imageurl && (
                <img
                  src={imageurl}
                  alt="Xem trước nội dung quảng cáo"
                  className="mt-3 h-36 w-full rounded-2xl border border-slate-200 object-cover"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Sản phẩm liên kết</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  const selectedProduct = products.find(product =>
                    product.productid === Number(e.target.value));
                  setLinkurl(selectedProduct ? getProductPath(selectedProduct) : '');
                }}
                className="mb-2 w-full px-3 py-2 text-sm rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-slate-800"
              >
                <option value="">Không gắn sản phẩm cụ thể</option>
                {products.map(product => (
                  <option key={product.productid} value={product.productid}>
                    #{product.productid} - {product.productname}
                  </option>
                ))}
              </select>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Đường dẫn liên kết (Tùy chọn)</label>
              <input
                type="text"
                value={linkurl}
                onChange={(e) => setLinkurl(e.target.value)}
                placeholder="/products/google-pixel-10-pro"
                className="w-full px-3 py-2 text-sm rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Thứ tự hiển thị</label>
              <input
                type="number"
                value={displayorder}
                onChange={(e) => setDisplayorder(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 text-sm rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#4f46e5] text-slate-800"
              />
              {activeTab === 'Banner' && (
                <p className="mt-1 text-[11px] font-medium text-slate-400">Trang chủ lấy 2 banner phụ đầu tiên theo thứ tự này.</p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isactive-checkbox"
                checked={isactive}
                onChange={(e) => setIsactive(e.target.checked)}
                className="w-4 h-4 text-[#4f46e5] border-slate-300 rounded focus:ring-[#4f46e5]"
              />
              <label htmlFor="isactive-checkbox" className="text-sm font-medium text-slate-700 select-none">Hiển thị nội dung này</label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">
                {isEditing ? 'Cập nhật' : 'Thêm mới'}
              </Button>
              {isEditing && (
                <Button type="button" variant="secondary" onClick={() => resetForm()}>
                  Hủy
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-[0_10px_28px_rgba(15,23,42,0.06)] border border-slate-100 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-400">Đang tải danh sách...</div>
          ) : filteredContents.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic">Chưa có nội dung nào được tạo.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Hình ảnh</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Thông tin</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Thứ tự</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContents.map(c => (
                    <tr key={c.contentid} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-5 py-4">
                        <img
                          src={c.imageurl}
                          alt={c.title || 'Promo'}
                          className="w-24 h-12 object-cover rounded-xl border border-slate-100 shadow-[0_10px_28px_rgba(15,23,42,0.06)]"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800 text-sm">{c.title || <span className="text-slate-400 italic">Không có tiêu đề</span>}</div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]" title={c.linkurl}>Liên kết: {c.linkurl || 'Không có'}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-600 font-medium">
                        {c.displayorder}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleToggleActive(c)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            c.isactive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {c.isactive ? <Check size={12} /> : <X size={12} />}
                          {c.isactive ? 'Hiển thị' : 'Ẩn'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleEdit(c)}
                            className="p-1.5 text-slate-400 hover:text-[#4f46e5] rounded-2xl hover:bg-slate-100 transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.contentid)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-2xl hover:bg-slate-100 transition-all"
                            title="Xóa"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
