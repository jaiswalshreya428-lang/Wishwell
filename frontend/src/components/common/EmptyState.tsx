import React from 'react';
import { DeliveryBoxIllustration } from '../illustrations/Illustrations';

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
    <div className="text-center py-12 px-6 rounded-3xl bg-cream-100/70 border border-dashed border-cream-300 max-w-lg mx-auto my-6">
      <div className="flex items-center justify-center mb-4">
        {icon || <DeliveryBoxIllustration size={64} className="mx-auto" />}
      </div>
      <h3 className="font-serif text-xl font-bold text-ink-900 mb-1.5">{title}</h3>
      <p className="text-sm text-ink-600 max-w-sm mx-auto leading-relaxed mb-6">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-5 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-semibold text-xs tracking-wide shadow-soft transition focus-visible:ring-2 focus-visible:ring-terracotta-600 active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};


