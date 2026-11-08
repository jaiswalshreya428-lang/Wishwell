import React, { useState, useEffect, useCallback } from 'react';
import { WishClaim } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';

export const MyClaims: React.FC<{ onBrowseWishes: () => void }> = ({ onBrowseWishes }) => {
  const [claims, setClaims] = useState<WishClaim[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedClaimForDelivery, setSelectedClaimForDelivery] = useState<WishClaim | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const loadClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.claims.getMyClaims();
      setClaims(data);
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load your pledged wishes.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const handleRelease = async (claim: WishClaim) => {
    if (!window.confirm(`Are you sure you want to release your pledge of ${claim.qty} items? The quantity will immediately return to the open pool for other donors.`)) {
      return;
    }

    try {
      await api.claims.release(claim.id);
      showToast({
        type: 'info',
        title: 'Pledge Released',
        message: `Claim #${claim.id} released. Quantity restored to open wish pool.`,
      });
      loadClaims();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Release Failed',
        message: err.message || 'Could not release pledge.',
      });
    }
  };

  const handleMarkDelivered = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClaimForDelivery) return;

    setIsSubmitting(true);
    try {
      await api.deliveries.markDelivered(selectedClaimForDelivery.id, trackingNumber.trim() || undefined);
      showToast({
        type: 'success',
        title: 'Delivery Dispatched!',
        message: 'Marked as delivered. The home director has been notified to inspect and confirm receipt.',
      });
      setSelectedClaimForDelivery(null);
      setTrackingNumber('');
      loadClaims();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: err.message || 'Could not mark claim as delivered.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-cream-200 pb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">
            Donor Dashboard
          </span>
          <h1 className="font-serif text-3xl font-bold text-ink-900 mt-1">My Active Pledges</h1>
          <p className="text-sm text-ink-600 mt-1">
            Track your claimed items, mark packages as dispatched, or release claims before their deadline.
          </p>
        </div>
        <button
          onClick={onBrowseWishes}
          className="px-4 py-2 rounded-xl bg-cream-200 hover:bg-cream-300 text-xs font-bold text-ink-800 transition"
        >
          + Pledge Another Wish
        </button>
      </div>

      {isLoading && <LoadingSpinner label="Loading your pledges..." />}

      {!isLoading && claims.length === 0 && (
        <EmptyState
          title="You have no active pledges"
          description="Browse open wishes posted by verified homes and make your first pledge today."
          actionText="Browse Open Wishes"
          onAction={onBrowseWishes}
        />
      )}

      {!isLoading && claims.length > 0 && (
        <div className="space-y-4">
          {claims.map((claim) => {
            const deadlineDate = new Date(claim.deadline);
            const isOverdue = deadlineDate < new Date() && claim.status === 'active';

            return (
              <div
                key={claim.id}
                className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-semibold text-ink-400">Claim #{claim.id}</span>
                    <StatusBadge status={claim.status} size="sm" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-ink-900">
                    {claim.qty}x {claim.item_name || 'Requested Items'}
                  </h3>
                  <p className="text-xs text-ink-600">
                    Wish: <span className="font-medium text-ink-800">{claim.wish_title || `#${claim.wish_id}`}</span> &bull; Home: {claim.institution_name || 'Verified Haven'}
                  </p>

                  <div className="flex items-center space-x-4 pt-2 text-xs text-ink-500 font-feature-tabular">
                    <span>Pledged: {new Date(claim.created_at).toLocaleDateString()}</span>
                    <span>&bull;</span>
                    <span className={isOverdue ? 'font-bold text-rose-600' : 'text-ink-700'}>
                      Deadline: {deadlineDate.toLocaleDateString()} {isOverdue && '(Overdue)'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3 shrink-0">
                  {claim.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleRelease(claim)}
                        className="px-3 py-2 rounded-xl border border-cream-300 hover:bg-cream-100 text-ink-700 text-xs font-semibold transition"
                      >
                        Release Claim
                      </button>
                      <button
                        onClick={() => setSelectedClaimForDelivery(claim)}
                        className="px-4 py-2 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition"
                      >
                        Mark as Delivered &rarr;
                      </button>
                    </>
                  )}
                  {claim.status === 'delivered' && (
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                      Awaiting Home Confirmation &photo;
                    </span>
                  )}
                  {claim.status === 'released' && (
                    <span className="text-xs font-medium text-ink-400">
                      Returned to open pool
                    </span>
                  )}
                  {claim.status === 'expired' && (
                    <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200">
                      Expired (Released by Scheduler)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mark as Delivered Modal */}
      <Modal
        isOpen={selectedClaimForDelivery !== null}
        onClose={() => setSelectedClaimForDelivery(null)}
        title="Confirm Shipment / Delivery"
        subtitle={`Claim #${selectedClaimForDelivery?.id} (${selectedClaimForDelivery?.qty} items)`}
      >
        <form onSubmit={handleMarkDelivered} className="space-y-4">
          <p className="text-xs text-ink-600 leading-relaxed">
            Let the children&apos;s home know that your package is on its way. Once received, the director will inspect the package and upload a photo confirmation of the items.
          </p>

          <div>
            <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
              Courier Tracking Number or Delivery Note (Optional)
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g., FEDEX-829104, Amazon Order, or Hand Delivered"
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
            />
          </div>

          <div className="pt-3 flex justify-end space-x-3 border-t border-cream-200">
            <button
              type="button"
              onClick={() => setSelectedClaimForDelivery(null)}
              className="px-4 py-2 rounded-xl border border-cream-300 text-xs font-semibold text-ink-700 hover:bg-cream-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Mark Dispatched'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

