import React from 'react';

export const LoadingSpinner: React.FC<{ label?: string; size?: 'sm' | 'md' | 'lg' }> = ({
  label = 'Loading...',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }[size];

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3" role="status" aria-live="polite">
      <div
        className={`${sizeClasses} rounded-full border-cream-300 border-t-terracotta-600 animate-spin`}
        aria-hidden="true"
      />
      {label && <span className="text-xs font-medium text-ink-500 tracking-wide uppercase">{label}</span>}
    </div>
  );
};

