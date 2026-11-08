import React, { useState, useEffect } from 'react';
import { DonorImpactData } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';

export const DonorImpact: React.FC<{ onBrowseWishes: () => void }> = ({ onBrowseWishes }) => {
  const [impact, setImpact] = useState<DonorImpactData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api.deliveries
      .getImpact()
      .then(setImpact)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <LoadingSpinner label="Calculating your lifetime giving impact..." />;
  }

  if (!impact || impact.total_wishes_fulfilled === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <EmptyState
          title="Your Impact Journey Begins Here"
          description="You haven't fulfilled any wishes yet. When you pledge items and deliveries are verified by the homes, your transparent impact timeline and metrics will appear here."
          actionText="Make Your First Pledge"
          onAction={onBrowseWishes}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Title */}
      <div>
        <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">
          Personal Impact
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mt-1">
          Your Generosity at Work
        </h1>
        <p className="text-sm text-ink-600 mt-1 max-w-xl">
          Every item you deliver is directly accounted for with physical photo proof and verified by the recipient children&apos;s homes.
        </p>
      </div>

      {/* Hero Impact Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft">
          <div className="text-xs font-semibold text-terracotta-600 uppercase tracking-wider">
            Total Wishes Fulfilled
          </div>
          <div className="font-serif text-4xl font-bold text-ink-900 mt-2 font-feature-tabular">
            {impact.total_wishes_fulfilled}
          </div>
          <p className="text-xs text-ink-500 mt-1">Completely received & confirmed</p>
        </div>

        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft">
          <div className="text-xs font-semibold text-sage-600 uppercase tracking-wider">
            Items Handed Over
          </div>
          <div className="font-serif text-4xl font-bold text-sage-700 mt-2 font-feature-tabular">
            {impact.total_items_delivered}
          </div>
          <p className="text-xs text-ink-500 mt-1">Directly supplied to children</p>
        </div>

        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            Homes Supported
          </div>
          <div className="font-serif text-4xl font-bold text-ink-900 mt-2 font-feature-tabular">
            {impact.institutions_helped_count}
          </div>
          <p className="text-xs text-ink-500 mt-1">Verified partner institutions</p>
        </div>
      </div>

      {/* Items by Category & Homes Helped */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft space-y-4">
          <h3 className="font-serif text-lg font-bold text-ink-900">Items Delivered by Category</h3>
          <div className="space-y-3">
            {impact.items_by_category.map((cat) => (
              <div key={cat.category_id} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-ink-800">
                  <span>{cat.category_name}</span>
                  <span className="text-terracotta-600 font-feature-tabular">
                    {cat.total_quantity} items
                  </span>
                </div>
                <div className="w-full bg-cream-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-terracotta-600 h-full rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (cat.total_quantity / Math.max(1, impact.total_items_delivered)) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Homes Helped */}
        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft space-y-4">
          <h3 className="font-serif text-lg font-bold text-ink-900">Partner Homes You Helped</h3>
          <div className="divide-y divide-cream-100">
            {impact.institutions_helped.map((inst) => (
              <div key={inst.institution_id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-ink-900">{inst.institution_name}</h4>
                  <p className="text-ink-500">{inst.city}, {inst.state}</p>
                </div>
                <span className="font-bold text-sage-700 bg-sage-50 px-2.5 py-1 rounded-full border border-sage-200">
                  {inst.items_received} items delivered
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Impact Timeline */}
      <div className="bg-white rounded-2xl border border-cream-200 p-6 sm:p-8 shadow-soft space-y-6">
        <h3 className="font-serif text-xl font-bold text-ink-900">Chronological Impact Timeline</h3>
        <div className="relative border-l-2 border-cream-200 pl-6 ml-3 space-y-8">
          {impact.timeline.map((event, idx) => (
            <div key={idx} className="relative group">
              <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-terracotta-500 border-2 border-white shadow-soft-sm" />
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-ink-400 font-feature-tabular">
                  {new Date(event.date).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
                <h4 className="font-bold text-sm text-ink-900">{event.action}</h4>
                <p className="text-xs text-ink-600 leading-relaxed">{event.description}</p>
                {event.wish_title && (
                  <span className="inline-block text-[11px] font-medium text-terracotta-700 bg-terracotta-50 px-2 py-0.5 rounded border border-terracotta-100 mt-1">
                    Wish: {event.wish_title}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

