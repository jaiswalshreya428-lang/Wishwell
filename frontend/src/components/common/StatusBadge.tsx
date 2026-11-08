import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = status.toLowerCase();

  const config: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    // Institution statuses
    verified: { label: 'Verified Home', bg: 'bg-sage-100', text: 'text-sage-700', dot: 'bg-sage-500' },
    recommended: { label: 'Recommended', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
    pending: { label: 'Verification Pending', bg: 'bg-cream-200', text: 'text-ink-700', dot: 'bg-ink-400' },
    rejected: { label: 'Declined', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },

    // Wish statuses
    open: { label: 'Open for Pledges', bg: 'bg-sage-100', text: 'text-sage-700', dot: 'bg-sage-500' },
    partially_claimed: { label: 'Partially Claimed', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
    claimed: { label: 'Fully Claimed', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
    delivered: { label: 'Items Received', bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-600' },
    expired: { label: 'Expired', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },
    cancelled: { label: 'Cancelled', bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-400' },

    // Claim statuses
    active: { label: 'Pledge Active', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
    released: { label: 'Released', bg: 'bg-ink-100', text: 'text-ink-600', dot: 'bg-ink-400' },

    // Delivery statuses
    in_transit: { label: 'In Transit', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
    confirmed: { label: 'Confirmed Receipt', bg: 'bg-sage-100', text: 'text-sage-700', dot: 'bg-sage-600' },
    pending_confirmation: { label: 'Awaiting Photo Confirmation', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  };

  const current = config[normalized] || {
    label: status.replace(/_/g, ' '),
    bg: 'bg-cream-200',
    text: 'text-ink-700',
    dot: 'bg-ink-500',
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-medium rounded-full ${current.bg} ${current.text} ${pad}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span className="capitalize">{current.label}</span>
    </span>
  );
};

