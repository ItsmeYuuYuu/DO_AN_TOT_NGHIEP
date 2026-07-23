import React, { useEffect, useId, useState } from 'react';
import { productSeriesApi } from '@/features/productSeries/api/productSeriesApi';

interface ProductSeriesInputProps {
  brandId: number | '';
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export const ProductSeriesInput: React.FC<ProductSeriesInputProps> = ({
  brandId,
  value,
  onChange,
  disabled = false,
  className = '',
  placeholder = 'VD: Galaxy S, iPhone Pro',
}) => {
  const generatedId = useId();
  const listId = `product-series-${generatedId.replace(/:/g, '')}`;
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (brandId === '') {
      setSuggestions([]);
      setLoading(false);
      setLoadFailed(false);
      return () => { cancelled = true; };
    }

    setLoading(true);
    setLoadFailed(false);
    productSeriesApi.getAll({ brandId, activeOnly: true })
      .then(response => {
        if (cancelled) return;

        const names = [...new Set(
          response.data
            .map(series => series.seriesname.trim())
            .filter(Boolean)
        )].sort((left, right) => left.localeCompare(right, 'vi'));
        setSuggestions(names);
      })
      .catch(() => {
        if (cancelled) return;
        setSuggestions([]);
        setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [brandId]);

  const helperText = brandId === ''
    ? 'Chọn thương hiệu trước để xem các dòng máy đã có.'
    : loading
      ? 'Đang tải dòng máy...'
      : loadFailed
        ? 'Không tải được gợi ý; bạn vẫn có thể nhập dòng máy mới.'
        : suggestions.length > 0
          ? 'Chọn một dòng máy có sẵn hoặc nhập dòng máy mới.'
          : 'Thương hiệu này chưa có dòng máy; hãy nhập tên mới.';

  return (
    <div className="w-full">
      <input
        className={className}
        value={value}
        onChange={event => onChange(event.target.value)}
        list={brandId !== '' && suggestions.length > 0 ? listId : undefined}
        disabled={disabled || brandId === ''}
        placeholder={brandId === '' ? 'Chọn thương hiệu trước' : placeholder}
        autoComplete="off"
      />
      <datalist id={listId}>
        {suggestions.map(seriesName => (
          <option key={seriesName} value={seriesName} />
        ))}
      </datalist>
      <p className={`mt-1 text-xs ${loadFailed ? 'text-amber-600' : 'text-slate-500'}`}>
        {helperText}
      </p>
    </div>
  );
};
