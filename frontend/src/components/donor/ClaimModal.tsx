import React, { useState } from 'react';
import { OpenWishViewItem } from '../../types';
import { api } from '../../api/endpoints';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { SuccessBurst } from '../atmosphere/SuccessBurst';

interface ClaimModalProps {
  wish: OpenWishViewItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNeedLogin: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({
  wish,
  isOpen,
  onClose,
  onSuccess,
  onNeedLogin,
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [qty, setQty] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  if (!wish) return null;

  // Compute maximum pledgeable quantity
  const maxQty = Math.max(1, wish.qty_remaining);

  // Compute calculated deadline (14 days from now, or needed_by, whichever is earlier)
  const computeCalculatedDeadline = () => {
    try {
      const now = new Date();
      const fourteenDays = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const neededBy = new Date(wish.needed_by);
      const effective = fourteenDays < neededBy ? fourteenDays : neededBy;
      return effective.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '14 days';
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setConflictError(null);

    if (!user) {
      onClose();
      onNeedLogin();
      return;
    }

    if (user.role !== 'donor') {
      showToast({
        type: 'warning',
        title: 'Donor Role Required',
        message: 'Only registered donors can pledge items. Please switch to a donor account.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await api.claims.claim(wish.wish_id, qty);
      showToast({
        type: 'success',
        title: 'Pledge Confirmed!',
        message: `You successfully claimed ${qty}x ${wish.item_name}. Please ship within the deadline.`,
      });
      setIsSuccess(true);
    } catch (err: any) {
      if (err.status === 409 || err.name === 'OverClaimError') {
        setConflictError(
          err.message ||
            'Concurrency Conflict: Another donor claimed items just moments ago. The remaining quantity has decreased.'
        );
      } else {
        setConflictError(err.message || 'Unable to complete pledge. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pledge to Fulfill Wish"
      subtitle={`For ${wish.institution_name} in ${wish.institution_city}, ${wish.institution_state}`}
    >
      {isSuccess ? (
        <div className="py-8 flex items-center justify-center">
          <SuccessBurst
            message={`Confirmed: ${qty}x ${wish.item_name} Pledged!`}
            onComplete={() => {
              setIsSuccess(false);
              onSuccess();
              onClose();
            }}
          />
        </div>
      ) : (
      <form onSubmit={handleClaim} className="space-y-6">
        {/* Item summary card */}
        <div className="p-4 rounded-xl bg-cream-100/70 border border-cream-200">
          <div className="text-xs font-semibold text-terracotta-700 uppercase tracking-wider mb-0.5">
            {wish.category_name}
          </div>
          <h4 className="font-serif text-lg font-bold text-ink-900">{wish.item_name}</h4>
          <p className="text-xs text-ink-600 mt-1">{wish.wish_description}</p>
          <div className="mt-3 flex items-center justify-between text-xs pt-3 border-t border-cream-200">
            <span className="text-ink-500">Remaining needed:</span>
            <span className="font-bold text-terracotta-600 font-feature-tabular">
              {wish.qty_remaining} of {wish.qty_requested} items
            </span>
          </div>
        </div>

        {/* Prominent 409 Conflict Error Banner */}
        {conflictError && (
          <div
            className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs leading-relaxed animate-in fade-in space-y-2"
            role="alert"
          >
            <div className="flex items-center space-x-2 font-bold text-rose-800">
              <svg className="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Concurrency Conflict (HTTP 409)</span>
            </div>
            <p>{conflictError}</p>
            <p className="text-[11px] opacity-80">
              Database row locking (UPDLOCK, HOLDLOCK) guarded against over-allocation. Please reduce your quantity.
            </p>
          </div>
        )}

        {/* Quantity Selector */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider">
            Quantity You Wish to Pledge
          </label>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-10 h-10 rounded-xl bg-cream-200 hover:bg-cream-300 text-ink-800 font-bold text-lg disabled:opacity-40 transition"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) setQty(Math.min(maxQty, Math.max(1, val)));
              }}
              className="w-24 text-center py-2 rounded-xl border border-cream-300 bg-white font-bold text-ink-900 text-lg font-feature-tabular focus-visible:ring-2 focus-visible:ring-terracotta-600"
            />
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
              disabled={qty >= maxQty}
              className="w-10 h-10 rounded-xl bg-cream-200 hover:bg-cream-300 text-ink-800 font-bold text-lg disabled:opacity-40 transition"
            >
              +
            </button>
            <span className="text-xs text-ink-500 font-medium">
              (Max available: {maxQty})
            </span>
          </div>
        </div>

        {/* Calculated Deadline Display */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2.5">
          <svg className="w-4 h-4 stroke-current shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="font-bold">Pledge Delivery Deadline: {computeCalculatedDeadline()}</span>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
              Enforced by database: default 14 days, capped by the home&apos;s need date. Overdue claims are automatically released back to the open pool.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end space-x-3 border-t border-cream-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-cream-300 hover:bg-cream-100 text-xs font-semibold text-ink-700 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || maxQty <= 0}
            className="px-6 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
          >
            {isSubmitting ? 'Confirming Pledge...' : `Confirm Pledge of ${qty} Item(s)`}
          </button>
        </div>
      </form>
      )}
    </Modal>
  );
};

