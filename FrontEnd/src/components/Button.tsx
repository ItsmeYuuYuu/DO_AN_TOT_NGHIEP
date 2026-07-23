import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantClasses = {
  primary: 'bg-[#e30613] text-white hover:bg-[#c4000b] shadow-sm active:bg-[#9f0009]',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300',
  danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm active:bg-red-700',
  outline: 'bg-transparent text-[#c4000b] border border-red-200 hover:bg-red-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900',
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
  xl: 'px-10 py-4 text-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  return (
    <button
      className={`
        inline-flex items-center justify-center
        rounded-xl font-semibold transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-50
        ${fullWidth ? 'w-full' : ''}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Đang tải...
        </span>
      ) : (
        children
      )}
    </button>
  );
};
