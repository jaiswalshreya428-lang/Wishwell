import React, { useState, useEffect } from 'react';
import { Wish } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { WorkPageHeader } from '../layout/WorkPageHeader';

export const MyWishesList: React.FC<{ onCreateWish: () => void }> = ({ onCreateWish }) => {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const loadWishes = async () => {
    setIsLoading(true);
    try {
      // In the API, listing wishes can be filtered by institution or we can fetch all open view items
      const res = await api.wishes.list({ limit: 50 });
      // Map to wish records
      setWishes(
        res.items.map((i) => ({
          id: i.wish_id,
          institution_id: i.institution_id,
          category_id: i.category_id,
          title: i.wish_title,
          description: i.wish_description,
          item_name: i.item_name,
          qty_requested: i.qty_requested,
          needed_by: i.needed_by,
          status: i.wish_status,
          created_at: '',
          category_name: i.category_name,
          institution_name: i.institution_name,
        }))
      );
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load your institution wishes.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWishes();
  }, []);

  const handleCancelWish = async (wish: Wish) => {
    if (!window.confirm(`Are you sure you want to cancel wish #${wish.id} ("${wish.title}")?`)) {
      return;
    }

    try {
      await api.wishes.cancel(wish.id);
      showToast({
        type: 'info',
        title: 'Wish Cancelled',
        message: `Wish #${wish.id} has been marked as cancelled.`,
      });
      loadWishes();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Cancellation Blocked',
        message: err.message || 'Cannot cancel a wish that has active pledges.',
      });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <WorkPageHeader
        badge="Institution Hub"
        title="Our Posted Wishes"
        subtitle="Manage your item requests. Per platform integrity rules, wishes with active pledges cannot be edited or deleted."
        stats={[
          { label: 'Total Wishes', value: wishes.length, helper: 'Created by home' },
          { label: 'Open Pledges', value: wishes.filter((w) => w.status === 'open' || w.status === 'partially_claimed').length, helper: 'Awaiting donors' },
        ]}
        action={
          <button
            onClick={onCreateWish}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:brightness-110 text-white text-xs font-bold shadow-warm transition"
          >
            + Post New Wish
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

      {isLoading && <LoadingSpinner label="Loading your wishes..." />}

      {!isLoading && wishes.length === 0 && (
        <EmptyState
          title="No wishes currently active"
          description="Your home hasn't posted any wish requests. Create a wish for educational items, clothing, or nutritional supplies."
          actionText="Create First Wish"
          onAction={onCreateWish}
        />
      )}

      {!isLoading && wishes.length > 0 && (
        <div className="space-y-4">
          {wishes.map((w) => {
            const hasActivePledges = w.status === 'partially_claimed' || w.status === 'claimed';

            return (
              <div
                key={w.id}
                className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs text-ink-400">Wish #{w.id}</span>
                    <span className="text-[10px] font-bold text-terracotta-700 bg-terracotta-50 px-2 py-0.5 rounded border border-terracotta-100">
                      {w.category_name}
                    </span>
                    <StatusBadge status={w.status} size="sm" />
                  </div>
                  <h3 className="font-serif text-lg font-bold text-ink-900">{w.title}</h3>
                  <p className="text-xs font-medium text-terracotta-600">Item: {w.item_name}</p>
                  <p className="text-xs text-ink-600 line-clamp-1">{w.description}</p>

                  <div className="flex items-center space-x-4 pt-2 text-xs text-ink-500 font-feature-tabular">
                    <span>Quantity: {w.qty_requested} requested</span>
                    <span>&bull;</span>
                    <span>Needed by: {new Date(w.needed_by).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-3 shrink-0">
                  <button
                    onClick={() => handleCancelWish(w)}
                    disabled={hasActivePledges}
                    title={
                      hasActivePledges
                        ? 'Disabled: Donors have already pledged items for this wish'
                        : 'Cancel wish'
                    }
                    className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                      hasActivePledges
                        ? 'border-cream-200 text-ink-300 cursor-not-allowed bg-cream-50'
                        : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                    }`}
                  >
                    Cancel Wish
                  </button>
                  {hasActivePledges && (
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                      Active Pledges Exist
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>
    </div>
  );
};

