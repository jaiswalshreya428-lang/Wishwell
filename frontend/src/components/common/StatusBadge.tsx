import React from 'react';
import { getStatusStyle } from '../../utils/categoryColors';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = (status || '').toLowerCase().trim();

  // Custom mapping tailored to Vintage Mineral-Spring WishWell palette
  const config: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    // Institution Verification Statuses
    verified: { label: 'Verified Home', bg: 'bg-[#E4F0ED]', text: 'text-[#1B4D48]', border: 'border-[#BADAD3]', dot: 'bg-[#24635C]' },
    recommended: { label: 'Field Recommended', bg: 'bg-[#FAF2DE]', text: 'text-[#855A19]', border: 'border-[#ECD8A3]', dot: 'bg-[#C89238]' },
    pending: { label: 'Pending Review', bg: 'bg-[#F3EFE2]', text: 'text-[#53645F]', border: 'border-[#D4CAB0]', dot: 'bg-[#6D7D77]' },
    rejected: { label: 'Declined', bg: 'bg-[#FBF3F0]', text: 'text-[#9B3F2A]', border: 'border-[#ECC4B5]', dot: 'bg-[#B65038]' },

    // Wish Statuses
    open: { label: 'Open', bg: 'bg-[#E4F0ED]', text: 'text-[#1B4D48]', border: 'border-[#BADAD3]', dot: 'bg-[#24635C]' },
    partially_claimed: { label: 'Partially Claimed', bg: 'bg-[#FAF2DE]', text: 'text-[#855A19]', border: 'border-[#ECD8A3]', dot: 'bg-[#C89238]' },
    claimed: { label: 'Claimed', bg: 'bg-[#F2EEF5]', text: 'text-[#544363]', border: 'border-[#D6CCE0]', dot: 'bg-[#5E4B6B]' },
    delivered: { label: 'Delivered', bg: 'bg-[#E9F1E9]', text: 'text-[#314B37]', border: 'border-[#C0D4C2]', dot: 'bg-[#416148]' },
    expired: { label: 'Expired', bg: 'bg-[#F3EFE2]', text: 'text-[#53645F]', border: 'border-[#D4CAB0]', dot: 'bg-[#6D7D77]' },
    cancelled: { label: 'Cancelled', bg: 'bg-[#F3EFE2]', text: 'text-[#53645F]', border: 'border-[#D4CAB0]', dot: 'bg-[#6D7D77]' },

    // Claim & Delivery Statuses
    active: { label: 'Pledge Active', bg: 'bg-[#FAF2DE]', text: 'text-[#855A19]', border: 'border-[#ECD8A3]', dot: 'bg-[#C89238]' },
    released: { label: 'Released', bg: 'bg-[#F3EFE2]', text: 'text-[#53645F]', border: 'border-[#D4CAB0]', dot: 'bg-[#6D7D77]' },
    in_transit: { label: 'In Transit', bg: 'bg-[#E4EFF0]', text: 'text-[#2D5057]', border: 'border-[#BDD6DA]', dot: 'bg-[#4E8089]' },
    confirmed: { label: 'Confirmed Receipt', bg: 'bg-[#E9F1E9]', text: 'text-[#314B37]', border: 'border-[#C0D4C2]', dot: 'bg-[#416148]' },
    pending_confirmation: { label: 'Awaiting Proof', bg: 'bg-[#FAF2DE]', text: 'text-[#855A19]', border: 'border-[#ECD8A3]', dot: 'bg-[#C89238]' },
  };

  const fallbackStyle = getStatusStyle(normalized);
  const current = config[normalized] || {
    label: normalized.replace(/_/g, ' '),
    bg: fallbackStyle.badgeBg,
    text: fallbackStyle.badgeText,
    border: fallbackStyle.badgeBorder,
    dot: fallbackStyle.dotColor,
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-semibold rounded-full border ${current.bg} ${current.text} ${current.border} ${pad}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};
