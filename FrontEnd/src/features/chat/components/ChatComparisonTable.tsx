import { Link } from 'react-router-dom';
import { CheckCircle2, PackageX } from 'lucide-react';
import type { ChatRecommendation } from '../api/chatSessionsApi';
import { formatCurrency } from '@/utils/formatters';

interface ChatComparisonTableProps {
  recommendations: ChatRecommendation[];
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase();

const parseSpecifications = (value: string) => {
  try {
    return JSON.parse(value) as Record<string, string>;
  } catch {
    return {};
  }
};

const findSpecification = (
  recommendation: ChatRecommendation,
  ...terms: string[]
) => {
  const specifications = parseSpecifications(recommendation.specifications);
  const entry = Object.entries(specifications).find(([key]) => {
    const normalizedKey = normalize(key);
    return terms.some(term => normalizedKey.includes(term));
  });
  return entry?.[1] ?? 'Chưa có dữ liệu';
};

export const ChatComparisonTable = ({
  recommendations,
}: ChatComparisonTableProps) => {
  const products = Array.from(
    new Map(recommendations.map(item => [item.productid, item])).values(),
  ).slice(0, 3);
  if (products.length < 2) return null;

  const lowestPrice = Math.min(...products.map(item => item.price));
  const rows = [
    { label: 'Giá bán', value: (item: ChatRecommendation) => formatCurrency(item.price) },
    { label: 'Phiên bản', value: (item: ChatRecommendation) => item.condition },
    { label: 'Chipset', value: (item: ChatRecommendation) => findSpecification(item, 'chipset', 'cpu') },
    { label: 'RAM', value: (item: ChatRecommendation) => findSpecification(item, 'ram') },
    { label: 'Bộ nhớ', value: (item: ChatRecommendation) => findSpecification(item, 'bo nho', 'storage', 'rom') },
    { label: 'Camera', value: (item: ChatRecommendation) => findSpecification(item, 'camera sau', 'camera') },
    { label: 'Pin', value: (item: ChatRecommendation) => findSpecification(item, 'pin') },
  ];

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="min-w-[620px] w-full border-collapse text-left text-xs text-slate-700">
        <thead>
          <tr className="bg-slate-50">
            <th className="w-28 border-b border-r border-slate-200 p-3 font-black text-slate-500">
              Tiêu chí
            </th>
            {products.map(product => (
              <th
                key={product.productid}
                className="min-w-40 border-b border-r border-slate-200 p-3 align-top last:border-r-0"
              >
                <Link
                  to={`/products/${product.productid}`}
                  className="flex items-start gap-2 hover:text-blue-600"
                >
                  <img
                    src={product.imageurl || `https://placehold.co/120x120?text=${encodeURIComponent(product.productname)}`}
                    alt={product.productname}
                    className="h-12 w-12 rounded-lg bg-white object-contain"
                  />
                  <span>
                    <span className="line-clamp-2 font-black text-slate-900">
                      {product.productname}
                    </span>
                    <span className="mt-1 block font-medium text-slate-400">{product.brand}</span>
                  </span>
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.label} className="even:bg-slate-50/70">
              <th className="border-b border-r border-slate-200 p-3 font-bold text-slate-500">
                {row.label}
              </th>
              {products.map(product => (
                <td
                  key={`${row.label}-${product.productid}`}
                  className={`border-b border-r border-slate-200 p-3 last:border-r-0 ${
                    row.label === 'Giá bán' && product.price === lowestPrice
                      ? 'font-black text-red-600'
                      : ''
                  }`}
                >
                  {row.value(product)}
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <th className="border-r border-slate-200 p-3 font-bold text-slate-500">Tồn kho</th>
            {products.map(product => (
              <td key={`stock-${product.productid}`} className="border-r border-slate-200 p-3 last:border-r-0">
                <span className={`inline-flex items-center gap-1 font-bold ${
                  product.stock > 0 ? 'text-emerald-600' : 'text-red-500'
                }`}>
                  {product.stock > 0 ? <CheckCircle2 size={14} /> : <PackageX size={14} />}
                  {product.stock > 0 ? `Còn ${product.stock} máy` : 'Tạm hết hàng'}
                </span>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
