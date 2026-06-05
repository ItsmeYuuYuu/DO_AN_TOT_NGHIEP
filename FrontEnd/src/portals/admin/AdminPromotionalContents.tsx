import React, { useState, useEffect } from 'react';
import { promotionsApi, type PromotionalContent } from '@/features/content/api/promotionsApi';
import { Button } from '@/components/Button';
import { Edit2, Trash2, Sliders, Image, Check, X } from 'lucide-react';

export const AdminPromotionalContents: React.FC = () => {
  const [contents, setContents] = useState<PromotionalContent[]>([]);
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

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    setLoading(true);
    try {
      const data = await promotionsApi.getAll();
      setContents(data);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu quảng cáo:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredContents = contents.filter(c => c.contenttype === activeTab);

  const resetForm = () => {
    setTitle('');
    setImageurl('');
    setLinkurl('');
    setDisplayorder(0);
    setIsactive(true);
    setIsEditing(false);
    setCurrentId(null);
  };

  const handleEdit = (c: PromotionalContent) => {
    setCurrentId(c.contentid);
    setTitle(c.title || '');
    setImageurl(c.imageurl);
    setLinkurl(c.linkurl || '');
    setDisplayorder(c.displayorder || 0);
    setIsactive(c.isactive ?? true);
    setIsEditing(true);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nội dung quảng cáo này?')) return;
    try {
      await promotionsApi.delete(id);
      setContents(prev => prev.filter(c => c.contentid !== id));
      alert('Đã xóa thành công.');
    } catch (err) {
      alert('Không thể xóa nội dung quảng cáo.');
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
    } catch (err) {
      alert('Không thể thay đổi trạng thái.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageurl) {
      alert('Vui lòng nhập URL hình ảnh.');
      return;
    }

    const payload = {
      contenttype: activeTab,
      title: title || undefined,
      imageurl,
      linkurl: linkurl || undefined,
      displayorder: activeTab === 'Slider' ? displayorder : undefined,
      isactive
    };

    try {
      if (isEditing && currentId !== null) {
        const updated = await promotionsApi.update(currentId, payload);
        setContents(prev => prev.map(item => item.contentid === currentId ? updated : item));
        alert('Cập nhật thành công.');
      } else {
        const created = await promotionsApi.create(payload);
        setContents(prev => [created, ...prev]);
        alert('Thêm mới thành công.');
      }
      resetForm();
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu nội dung.');
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
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sliders size={16} /> Sliders Quảng Cáo
        </button>
        <button
          onClick={() => { setActiveTab('Banner'); resetForm(); }}
          className={`flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'Banner'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Image size={16} /> Banners Khuyến Mãi
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 h-fit space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            {isEditing ? 'Cập nhật nội dung' : `Thêm mới ${activeTab === 'Slider' ? 'Slider' : 'Banner'}`}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tiêu đề (Tùy chọn)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề hoặc mô tả ngắn..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">URL Hình ảnh</label>
              <input
                type="text"
                value={imageurl}
                onChange={(e) => setImageurl(e.target.value)}
                placeholder="https://example.com/banner.jpg"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Đường dẫn liên kết (Tùy chọn)</label>
              <input
                type="text"
                value={linkurl}
                onChange={(e) => setLinkurl(e.target.value)}
                placeholder="/products/101"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
            </div>

            {activeTab === 'Slider' && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Thứ tự hiển thị</label>
                <input
                  type="number"
                  value={displayorder}
                  onChange={(e) => setDisplayorder(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isactive-checkbox"
                checked={isactive}
                onChange={(e) => setIsactive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isactive-checkbox" className="text-sm font-medium text-slate-700 select-none">Hiển thị nội dung này</label>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1">
                {isEditing ? 'Cập nhật' : 'Thêm mới'}
              </Button>
              {isEditing && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Hủy
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
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
                    {activeTab === 'Slider' && (
                      <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Thứ tự</th>
                    )}
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase">Trạng thái</th>
                    <th className="px-5 py-3 text-xs font-bold text-slate-500 uppercase text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContents.map(c => (
                    <tr key={c.contentid} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4">
                        <img
                          src={c.imageurl}
                          alt={c.title || 'Promo'}
                          className="w-24 h-12 object-cover rounded-md border border-slate-100 shadow-sm"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800 text-sm">{c.title || <span className="text-slate-400 italic">Không có tiêu đề</span>}</div>
                        <div className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]" title={c.linkurl}>Liên kết: {c.linkurl || 'Không có'}</div>
                      </td>
                      {activeTab === 'Slider' && (
                        <td className="px-5 py-4 text-sm text-slate-600 font-medium">
                          {c.displayorder}
                        </td>
                      )}
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
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-all"
                            title="Chỉnh sửa"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.contentid)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-all"
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
