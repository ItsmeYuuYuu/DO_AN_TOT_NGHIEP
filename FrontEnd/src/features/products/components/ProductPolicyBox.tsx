import React from 'react';
import { Shield, Truck, RotateCcw, Tag } from 'lucide-react';

export const ProductPolicyBox: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <h3 className="font-bold text-slate-800 text-base mb-2">Chính sách mua hàng</h3>
      
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
          <Shield className="text-blue-500 w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-700 text-sm">Bảo hành chính hãng</p>
          <p className="text-xs text-slate-500 mt-0.5">Bảo hành 12 tháng tại các trung tâm bảo hành ủy quyền.</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
          <Truck className="text-emerald-500 w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-700 text-sm">Giao hàng toàn quốc</p>
          <p className="text-xs text-slate-500 mt-0.5">Miễn phí giao hàng cho đơn từ 500K. Nhận hàng trong 2-4 ngày.</p>
        </div>
      </div>

      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center shrink-0">
          <RotateCcw className="text-orange-500 w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-700 text-sm">Đổi trả dễ dàng</p>
          <p className="text-xs text-slate-500 mt-0.5">1 đổi 1 trong 30 ngày nếu có lỗi từ nhà sản xuất.</p>
        </div>
      </div>
      
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
          <Tag className="text-purple-500 w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-slate-700 text-sm">Cam kết giá tốt</p>
          <p className="text-xs text-slate-500 mt-0.5">Hoàn tiền nếu ở đâu rẻ hơn.</p>
        </div>
      </div>
    </div>
  );
};
