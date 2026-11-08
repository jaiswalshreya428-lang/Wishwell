import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="text-center py-12 px-4 rounded-2xl bg-cream-100/60 border border-dashed border-cream-300 max-w-lg mx-auto my-6">
      <div className="w-12 h-12 mx-auto rounded-full bg-cream-200 flex items-center justify-center text-ink-600 mb-4">
        {icon || (
          <svg className="w-6 h-6 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="1.75">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="font-serif text-lg font-bold text-ink-900 mb-1">{title}</h3>
      <p className="text-sm text-ink-600 max-w-sm mx-auto leading-relaxed mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 rounded-lg bg-terracotta-600 hover:bg-terracotta-700 text-white font-medium text-xs tracking-wide shadow-soft transition focus-visible:ring-2 focus-visible:ring-terracotta-600"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

