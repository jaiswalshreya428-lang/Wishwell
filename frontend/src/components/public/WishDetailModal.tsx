import React from 'react';
import { OpenWishViewItem } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';

interface WishDetailModalProps {
  wish: OpenWishViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onPledge: (wish: OpenWishViewItem) => void;
}

export const WishDetailModal: React.FC<WishDetailModalProps> = ({
  wish,
  isOpen,
  onClose,
  onPledge,
}) => {
  if (!wish) return null;

  const percentClaimed = Math.min(
    100,
    Math.round((wish.qty_claimed / wish.qty_requested) * 100)
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={wish.wish_title}
      subtitle={`Wish #${wish.wish_id} &bull; ${wish.category_name}`}
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Status and Category Badges */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-terracotta-700 bg-terracotta-50 px-3 py-1 rounded-full border border-terracotta-200">
              {wish.category_name}
            </span>
            <StatusBadge status={wish.wish_status} size="md" />
          </div>
          <span className="text-xs text-ink-500 font-feature-tabular">
            Needed by: {new Date(wish.needed_by).toLocaleDateString()}
          </span>
        </div>

        {/* Specific Item Specification */}
        <div className="p-4 rounded-2xl bg-cream-100 border border-cream-200 space-y-1">
          <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider block">
            Requested Item
          </span>
          <h4 className="font-serif text-xl font-bold text-ink-900">{wish.item_name}</h4>
          <p className="text-xs text-ink-700 leading-relaxed pt-1">{wish.wish_description}</p>
        </div>

        {/* Home Information */}
        <div className="p-4 rounded-2xl border border-cream-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider block">
              Recipient Children&apos;s Home
            </span>
            <h4 className="font-bold text-sm text-ink-900 mt-0.5">{wish.institution_name}</h4>
            <p className="text-xs text-ink-500">{wish.institution_city}, {wish.institution_state}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-sage-800 bg-sage-50 px-3 py-1 rounded-full border border-sage-200 inline-block">
              &check; Physical Verification Passed
            </span>
            <p className="text-[10px] text-ink-400 mt-1">Inspected by Field Verifier</p>
          </div>
        </div>

        {/* Quantity and Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-ink-800 font-feature-tabular">
            <span>Fulfillment Progress: {percentClaimed}%</span>
            <span>
              {wish.qty_claimed} claimed / <strong className="text-terracotta-700">{wish.qty_remaining} still needed</strong>
            </span>
          </div>
          <div className="w-full bg-cream-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-terracotta-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${percentClaimed}%` }}
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="pt-4 border-t border-cream-200 flex items-center justify-between">
          <p className="text-xs text-ink-500 max-w-sm">
            Deliver items directly to the home. Proof of items will be confirmed by director photo.
          </p>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-cream-300 text-xs font-semibold text-ink-700 hover:bg-cream-100"
            >
              Back to Browse
            </button>
            <button
              type="button"
              disabled={wish.qty_remaining <= 0}
              onClick={() => {
                onClose();
                onPledge(wish);
              }}
              className="px-6 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
            >
              Pledge Items Now &rarr;
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

