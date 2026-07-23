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
    color: 'bg-red-50 text-[#c4000b]',
  },
  {
    title: 'Tin tức',
    description: 'Soạn bài, tải ảnh đại diện và quản lý trạng thái xuất bản.',
    to: '/staff/news',
    action: 'Quản lý tin tức',
    Icon: Newspaper,
    color: 'bg-red-50 text-[#c4000b]',
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
    <div className="ops-hero p-6">
      <h1 className="ops-hero-title">Trung tâm nội dung</h1>
    </div>

    <div className="grid gap-4 lg:grid-cols-3">
      {modules.map(({ title, description, to, action, Icon, color }) => (
        <Link
          key={to}
          to={to}
          className="group flex min-h-52 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_10px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <span className={`w-fit rounded-2xl p-3 ${color}`}>
            <Icon size={26} />
          </span>
          <h2 className="mt-5 text-lg font-black text-slate-800">{title}</h2>
          <p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{description}</p>
          <span className="mt-5 text-sm font-bold text-[#e30613] group-hover:underline">{action} →</span>
        </Link>
      ))}
    </div>

    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-[#c4000b]">
      Tài khoản Content chỉ chỉnh phần nội dung. Tạo sản phẩm mới, giá bán, tồn kho và xóa dữ liệu vẫn thuộc Admin, Manager hoặc Warehouse.
    </div>
  </div>
);

export default ContentWorkspace;
