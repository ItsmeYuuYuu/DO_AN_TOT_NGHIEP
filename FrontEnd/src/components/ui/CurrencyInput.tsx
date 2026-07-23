import React from 'react';

interface CurrencyInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  label?: string;
  disabled?: boolean;
  className?: string;
  min?: number;
  id?: string;
}

const formatValue = (value: number | '') =>
  value === '' ? '' : new Intl.NumberFormat('vi-VN').format(value);

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  label,
  disabled,
  className = '',
  min = 0,
  id,
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const digits = event.target.value.replace(/\D/g, '');
    if (!digits) {
      onChange('');
      return;
    }

    const parsed = Number(digits);
    onChange(Number.isSafeInteger(parsed) ? Math.max(min, parsed) : value);
  };

  return (
    <label className="block">
      {label && <span className="mb-1 block text-xs font-bold uppercase text-slate-600">{label}</span>}
      <span className="relative block">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={formatValue(value)}
          onChange={handleChange}
          placeholder="0"
          className={`w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-2 pr-10 text-sm outline-none focus:border-[#e30613] disabled:bg-slate-100 ${className}`}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-bold text-slate-500">đ</span>
      </span>
    </label>
  );
};
