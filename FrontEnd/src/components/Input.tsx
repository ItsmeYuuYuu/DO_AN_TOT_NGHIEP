import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
            {icon}
          </div>
        )}
        <input
          className={`
            w-full bg-white border ${error ? 'border-red-500 ring-1 ring-red-100' : 'border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50'}
            text-slate-900 text-sm px-4 py-2.5 outline-none
            placeholder:text-slate-400 transition-all duration-200
            rounded-lg
            ${icon ? 'pl-10' : ''}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
};
