import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { VariantAttributeValue } from '../api/productsApi';

interface ProductSpecsTableProps {
  attributes?: VariantAttributeValue[];
}

// Mảng cấu hình độ ưu tiên (những specs này sẽ hiện đầu tiên)
const PRIORITY_KEYS = [
  'Kích thước màn hình',
  'Công nghệ màn hình',
  'Độ phân giải',
  'Hệ điều hành',
  'Chipset',
  'CPU',
  'GPU',
  'RAM',
  'Bộ nhớ trong',
  'Camera sau',
  'Quay video sau',
  'Camera trước',
  'Pin',
  'Cổng sạc',
  'Công nghệ sạc',
  'SIM',
  'Wi-Fi',
  'Bluetooth',
  'GPS',
  'Kích thước',
  'Trọng lượng',
  'Chất liệu'
];

export const ProductSpecsTable: React.FC<ProductSpecsTableProps> = ({ attributes }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedAttributes = useMemo(() => {
    if (!attributes) return [];
    
    return [...attributes].sort((a, b) => {
      const idxA = PRIORITY_KEYS.indexOf(a.attributename);
      const idxB = PRIORITY_KEYS.indexOf(b.attributename);

      // Nếu cả hai đều nằm trong priority keys, so sánh theo index
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      // Nếu chỉ A nằm trong priority, A lên trước
      if (idxA !== -1) return -1;
      // Nếu chỉ B nằm trong priority, B lên trước
      if (idxB !== -1) return 1;
      
      // Nếu không nằm trong priority, sort theo tên alphabet
      return a.attributename.localeCompare(b.attributename);
    });
  }, [attributes]);

  if (!sortedAttributes || sortedAttributes.length === 0) {
    return (
      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center text-slate-500 text-sm">
        Đang cập nhật thông số kỹ thuật...
      </div>
    );
  }

  const DEFAULT_ROWS = 8;
  const showToggleButton = sortedAttributes.length > DEFAULT_ROWS;
  const visibleAttributes = isExpanded ? sortedAttributes : sortedAttributes.slice(0, DEFAULT_ROWS);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <h3 className="bg-slate-50 px-5 py-4 font-bold text-slate-800 border-b border-slate-200 uppercase tracking-wide text-sm">
        Thông số kỹ thuật
      </h3>
      <div className="flex flex-col relative">
        {visibleAttributes.map((attr) => (
          <div
            key={attr.valueid}
            className="flex text-sm border-b border-slate-100 last:border-0"
          >
            <div className="w-1/3 bg-slate-50 font-semibold text-slate-600 shrink-0 p-3 border-r border-slate-100 flex items-center">
              {attr.attributename}
            </div>
            <div className="w-2/3 bg-white text-slate-800 font-medium whitespace-pre-line leading-relaxed p-3">
              {attr.valuename}
            </div>
          </div>
        ))}
        
        {/* Lớp gradient làm mờ để người dùng biết còn nội dung khi chưa mở rộng */}
        {!isExpanded && showToggleButton && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {showToggleButton && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-center gap-2 py-4 bg-white hover:bg-slate-50 border-t border-slate-200 text-sm font-bold text-[#e30613] transition-colors"
        >
          {isExpanded ? (
            <>
              Thu gọn <ChevronUp size={16} />
            </>
          ) : (
            <>
              Xem thêm cấu hình chi tiết <ChevronDown size={16} />
            </>
          )}
        </button>
      )}
    </div>
  );
};
