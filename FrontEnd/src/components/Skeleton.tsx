import React from 'react';

interface SkeletonProps {
  variant?: 'rect' | 'bento' | 'row';
  className?: string;
}

// Asymmetric bento skeleton – no boring uniform squares
export const Skeleton: React.FC<SkeletonProps> = ({ variant = 'rect', className = '' }) => {
  if (variant === 'bento') {
    return (
      <div className={`grid grid-cols-3 gap-2 ${className}`}>
        <div className="skeleton col-span-2 h-32" />
        <div className="skeleton h-32" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton col-span-3 h-12" />
      </div>
    );
  }

  if (variant === 'row') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-10 w-full" style={{ opacity: 1 - i * 0.12 }} />
        ))}
      </div>
    );
  }

  return <div className={`skeleton ${className}`} />;
};
