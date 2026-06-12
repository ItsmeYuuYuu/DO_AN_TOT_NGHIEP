import React from 'react';
import { Link } from 'react-router-dom';
import { Boxes, ClipboardList, Headphones, ShieldCheck, Truck, Users } from 'lucide-react';
import AdminDashboard from '@/portals/admin/AdminDashboard';

const shortcuts = [
  { label: 'Điều phối Sales', description: 'Theo dõi và phân công đơn chờ xác nhận.', to: '/staff/sales-orders', Icon: ClipboardList },
  { label: 'Điều phối kho', description: 'Kiểm soát đơn chờ xuất kho và đối chiếu IMEI.', to: '/staff/warehouse-orders', Icon: Truck },
  { label: 'Kho hàng', description: 'Xem tồn kho, IMEI và cảnh báo sắp hết.', to: '/staff/inventory', Icon: Boxes },
  { label: 'Bảo hành', description: 'Theo dõi phiếu tiếp nhận và tiến độ sửa chữa.', to: '/staff/warranties', Icon: ShieldCheck },
  { label: 'Khách hàng', description: 'Tra cứu hồ sơ và lịch sử mua hàng.', to: '/staff/customers', Icon: Users },
  { label: 'Tư vấn AI', description: 'Giám sát các cuộc hội thoại chuyển cho nhân viên.', to: '/staff/consultations', Icon: Headphones },
];

const ManagerWorkspace: React.FC = () => (
  <div className="space-y-8">
    <section>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-600">Manager workspace</p>
      <h1 className="mt-1 text-2xl font-black text-slate-900">Trung tâm điều phối cửa hàng</h1>
      <p className="mt-1 text-sm text-slate-500">
        Một điểm vào để theo dõi doanh thu và chuyển nhanh tới từng bộ phận vận hành.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shortcuts.map(({ label, description, to, Icon }) => (
          <Link
            key={to}
            to={to}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
                <Icon size={20} />
              </span>
              <div>
                <p className="font-black text-slate-800 group-hover:text-emerald-700">{label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
    <section className="border-t border-slate-200 pt-8">
      <AdminDashboard />
    </section>
  </div>
);

export default ManagerWorkspace;
