import React from 'react';
import { Link } from 'react-router-dom';
import { Image, Newspaper, PackageSearch } from 'lucide-react';

const modules = [
  {
    title: 'Nội dung sản phẩm',
    description: 'Chỉnh tên, mô tả, thông số và bộ ảnh hiển thị của sản phẩm.',
    to: '/staff/products',
    action: 'Mở danh sách sản phẩm',
    Icon: PackageSearch,
    color: 'bg-blue-50 text-blue-700',
  },
  {
    title: 'Tin tức',
    description: 'Soạn bài, tải ảnh đại diện và quản lý trạng thái xuất bản.',
    to: '/staff/news',
    action: 'Quản lý tin tức',
    Icon: Newspaper,
    color: 'bg-violet-50 text-violet-700',
  },
  {
    title: 'Banner & slider',
    description: 'Tải ảnh từ máy, sắp xếp và bật tắt nội dung trên trang chủ.',
    to: '/staff/promotional-contents',
    action: 'Quản lý banner',
    Icon: Image,
    color: 'bg-orange-50 text-orange-700',
  },
];

const ContentWorkspace: React.FC = () => (
  <div className="space-y-6">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Content workspace</p>
      <h1 className="mt-1 text-2xl font-black text-slate-900">Trung tâm nội dung</h1>
      <p className="mt-1 text-sm text-slate-500">
        Quản lý nội dung hiển thị cho khách hàng mà không can thiệp giá, tồn kho hay đơn hàng.
      </p>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      {modules.map(({ title, description, to, action, Icon, color }) => (
        <Link
          key={to}
          to={to}
          className="group flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className={`w-fit rounded-2xl p-3 ${color}`}>
            <Icon size={26} />
          </span>
          <h2 className="mt-5 text-lg font-black text-slate-800">{title}</h2>
          <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{description}</p>
          <span className="mt-5 text-sm font-bold text-blue-600 group-hover:underline">{action} →</span>
        </Link>
      ))}
    </div>

    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-sm text-blue-800">
      Tài khoản Content chỉ chỉnh phần nội dung. Tạo sản phẩm mới, giá bán, tồn kho và xóa dữ liệu vẫn thuộc Admin, Manager hoặc Warehouse.
    </div>
  </div>
);

export default ContentWorkspace;
