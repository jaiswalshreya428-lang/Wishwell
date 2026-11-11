import React from 'react';
import { getStatusStyle } from '../../utils/categoryColors';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normalized = (status || '').toLowerCase().trim();

  // Custom mapping adhering strictly to the "Twilight Home" specification
  const config: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    // Institution Verification Statuses
    verified: { label: 'Verified Home', bg: 'bg-[#E3F5F2]', text: 'text-[#166C60]', border: 'border-[#BDE6DF]', dot: 'bg-[#1F8A7A]' },
    recommended: { label: 'Field Recommended', bg: 'bg-[#FEF8E8]', text: 'text-[#9A6405]', border: 'border-[#FBE4AE]', dot: 'bg-[#F6B93B]' },
    pending: { label: 'Pending Review', bg: 'bg-[#F4F4F5]', text: 'text-[#52525B]', border: 'border-[#E4E4E7]', dot: 'bg-[#71717A]' },
    rejected: { label: 'Declined', bg: 'bg-[#FDF2EE]', text: 'text-[#C9441F]', border: 'border-[#F9C4B3]', dot: 'bg-[#E4572E]' },

    // Wish Statuses
    open: { label: 'Open', bg: 'bg-[#E3F5F2]', text: 'text-[#166C60]', border: 'border-[#BDE6DF]', dot: 'bg-[#1F8A7A]' },
    partially_claimed: { label: 'Partially Claimed', bg: 'bg-[#FEF8E8]', text: 'text-[#9A6405]', border: 'border-[#FBE4AE]', dot: 'bg-[#F6B93B]' },
    claimed: { label: 'Claimed', bg: 'bg-[#F3EBF9]', text: 'text-[#533E78]', border: 'border-[#D8C5E8]', dot: 'bg-[#3A2A55]' },
    delivered: { label: 'Delivered', bg: 'bg-[#E5F6EC]', text: 'text-[#215E3C]', border: 'border-[#B7E5C7]', dot: 'bg-[#2D7A4F]' },
    expired: { label: 'Expired', bg: 'bg-[#F4F4F5]', text: 'text-[#52525B]', border: 'border-[#E4E4E7]', dot: 'bg-[#71717A]' },
    cancelled: { label: 'Cancelled', bg: 'bg-[#F4F4F5]', text: 'text-[#52525B]', border: 'border-[#E4E4E7]', dot: 'bg-[#71717A]' },

    // Claim & Delivery Statuses
    active: { label: 'Pledge Active', bg: 'bg-[#FEF8E8]', text: 'text-[#9A6405]', border: 'border-[#FBE4AE]', dot: 'bg-[#F6B93B]' },
    released: { label: 'Released', bg: 'bg-[#F4F4F5]', text: 'text-[#52525B]', border: 'border-[#E4E4E7]', dot: 'bg-[#71717A]' },
    in_transit: { label: 'In Transit', bg: 'bg-[#E8F3FC]', text: 'text-[#205F94]', border: 'border-[#BDDCF6]', dot: 'bg-[#3E8FD1]' },
    confirmed: { label: 'Confirmed Receipt', bg: 'bg-[#E5F6EC]', text: 'text-[#215E3C]', border: 'border-[#B7E5C7]', dot: 'bg-[#2D7A4F]' },
    pending_confirmation: { label: 'Awaiting Proof', bg: 'bg-[#FEF8E8]', text: 'text-[#9A6405]', border: 'border-[#FBE4AE]', dot: 'bg-[#F6B93B]' },
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
