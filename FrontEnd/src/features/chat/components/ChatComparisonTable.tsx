import { Link } from 'react-router-dom';
import { CheckCircle2, PackageX } from 'lucide-react';
import type { ChatRecommendation } from '../api/chatSessionsApi';
import { formatCurrency } from '@/utils/formatters';
import { getProductPath } from '@/features/products/utils/productLinks';

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

const largestNumber = (value: string) => {
  const values = Array.from(value.matchAll(/\d+(?:[.,]\d+)?/g))
    .map(match => Number(match[0].replace(',', '.')))
    .filter(Number.isFinite);
  return values.length > 0 ? Math.max(...values) : null;
};

const sumNumbers = (value: string) => {
  const values = Array.from(value.matchAll(/\d+(?:[.,]\d+)?/g))
    .map(match => Number(match[0].replace(',', '.')))
    .filter(Number.isFinite);
  return values.length > 0
    ? values.reduce((total, current) => total + current, 0)
    : null;
};

const storageCapacity = (value: string) => {
  const capacity = largestNumber(value);
  if (capacity === null) return null;
  return /\btb\b/i.test(value) ? capacity * 1024 : capacity;
};

interface ComparisonRow {
  label: string;
  value: (item: ChatRecommendation) => string;
  metric?: (item: ChatRecommendation) => number | null;
  lowerIsBetter?: boolean;
  bestLabel?: string;
}

export const ChatComparisonTable = ({
  recommendations,
}: ChatComparisonTableProps) => {
  const products = Array.from(
    new Map(recommendations.map(item => [item.productid, item])).values(),
  ).slice(0, 3);
  if (products.length < 2) return null;

  const rows: ComparisonRow[] = [
    {
      label: 'Giá bán',
      value: item => formatCurrency(item.price),
      metric: item => item.price,
      lowerIsBetter: true,
      bestLabel: 'Giá thấp nhất',
    },
    { label: 'Phiên bản', value: item => item.condition },
    { label: 'Chipset', value: item => findSpecification(item, 'chipset', 'cpu') },
    {
      label: 'RAM',
      value: item => findSpecification(item, 'ram'),
      metric: item => largestNumber(findSpecification(item, 'ram')),
      bestLabel: 'RAM lớn nhất',
    },
    {
      label: 'Bộ nhớ',
      value: item => findSpecification(item, 'bo nho', 'storage', 'rom'),
      metric: item => storageCapacity(findSpecification(item, 'bo nho', 'storage', 'rom')),
      bestLabel: 'Dung lượng lớn nhất',
    },
    {
      label: 'Camera',
      value: item => findSpecification(item, 'camera sau', 'camera'),
      metric: item => sumNumbers(findSpecification(item, 'camera sau', 'camera')),
      bestLabel: 'Cụm camera nổi bật',
    },
    {
      label: 'Pin',
      value: item => findSpecification(item, 'pin'),
      metric: item => largestNumber(findSpecification(item, 'pin')),
      bestLabel: 'Pin lớn nhất',
    },
  ];

  return (
    <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e5e7eb] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
      <table className="w-full min-w-[620px] border-collapse text-left text-xs text-slate-700">
        <thead>
          <tr className="bg-[#ffffff]">
            <th className="w-28 border-b border-r border-[#e5e7eb] p-3 font-black uppercase tracking-[0.12em] text-slate-500">
              Tiêu chí
            </th>
            {products.map(product => (
              <th
                key={product.productid}
                className="min-w-40 border-b border-r border-[#e5e7eb] p-3 align-top last:border-r-0"
              >
                <Link
                  to={getProductPath({ productid: product.productid, slug: product.productslug })}
                  className="flex items-start gap-2 hover:text-[#c4000b]"
                >
                  <img
                    src={product.imageurl || `https://placehold.co/120x120?text=${encodeURIComponent(product.productname)}`}
                    alt={product.productname}
                    className="h-12 w-12 border border-[#e5e7eb] bg-white object-contain"
                  />
                  <span>
                    <span className="line-clamp-2 font-black text-[#1f2937]">
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
            <tr key={row.label} className="even:bg-[#ffffff]">
              <th className="border-b border-r border-[#e5e7eb] p-3 font-bold text-slate-500">
                {row.label}
              </th>
              {products.map(product => {
                const metrics = row.metric
                  ? products
                    .map(item => row.metric?.(item) ?? null)
                    .filter((value): value is number => value !== null)
                  : [];
                const productMetric = row.metric?.(product) ?? null;
                const bestMetric = metrics.length > 0
                  ? row.lowerIsBetter
                    ? Math.min(...metrics)
                    : Math.max(...metrics)
                  : null;
                const isBest = productMetric !== null &&
                  bestMetric !== null &&
                  new Set(metrics).size > 1 &&
                  productMetric === bestMetric;

                return (
                  <td
                    key={`${row.label}-${product.productid}`}
                    className={`border-b border-r border-[#e5e7eb] p-3 align-top last:border-r-0 ${
                      isBest ? 'bg-emerald-50/70 font-bold text-emerald-800' : ''
                    }`}
                  >
                    <span className="whitespace-pre-line">{row.value(product)}</span>
                    {isBest && row.bestLabel && (
                      <span className="mt-1 block w-fit bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                        {row.bestLabel}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th className="border-r border-[#e5e7eb] p-3 font-bold text-slate-500">Tồn kho</th>
            {products.map(product => (
              <td key={`stock-${product.productid}`} className="border-r border-[#e5e7eb] p-3 last:border-r-0">
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
