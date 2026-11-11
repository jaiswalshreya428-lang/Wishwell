import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DonorImpactData } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { WorkPageHeader } from '../layout/WorkPageHeader';
import { getCategoryTheme } from '../../utils/categoryColors';
import { Gift, Package, Building2, Sparkles } from 'lucide-react';

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
    return (
      <div className="py-24">
        <LoadingSpinner label="Calculating your lifetime giving impact..." />
      </div>
    );
  }

  if (!impact || impact.total_wishes_fulfilled === 0) {
    return (
      <div className="space-y-8 pb-16">
        <WorkPageHeader
          badge="Donor Journey"
          badgeIcon={<Gift className="w-3.5 h-3.5 text-[#E4572E]" />}
          title="Your Generosity at Work"
          subtitle="Every item you deliver is directly accounted for with physical photo proof and verified by recipient children's homes."
        />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <EmptyState
            title="Your Impact Journey Begins Here"
            description="You haven't fulfilled any wishes yet. When you pledge items and deliveries are verified by the homes, your transparent impact timeline and metrics will appear here."
            actionText="Make Your First Pledge"
            onAction={onBrowseWishes}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Sunlight Page Header Band */}
      <WorkPageHeader
        badge="Personal Impact"
        badgeIcon={<Gift className="w-3.5 h-3.5 text-[#E4572E]" />}
        title="Your Generosity at Work"
        subtitle="Every item you deliver is directly accounted for with physical photo proof and verified by recipient children's homes."
        actions={
          <button
            onClick={onBrowseWishes}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:brightness-110 text-white font-bold text-xs tracking-wide shadow-soft transition active:scale-95 flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pledge More Items</span>
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* 3 KPI Highlight Cards with Staggered Entrance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="bg-white rounded-3xl border border-[#D8E6F0] p-6 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-coral-600 uppercase tracking-wider">
                Total Wishes Fulfilled
              </span>
              <div className="w-8 h-8 rounded-xl bg-coral-50 text-coral-600 flex items-center justify-center">
                <Gift className="w-4 h-4 text-coral-600" />
              </div>
            </div>
            <div className="font-serif text-4xl font-bold text-ink-900 mt-3 font-feature-tabular">
              {impact.total_wishes_fulfilled}
            </div>
            <p className="text-xs text-ink-500 mt-1">Completely received & confirmed</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="bg-white rounded-3xl border border-[#D8E6F0] p-6 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
                Items Handed Over
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="font-serif text-4xl font-bold text-teal-700 mt-3 font-feature-tabular">
              {impact.total_items_delivered}
            </div>
            <p className="text-xs text-ink-500 mt-1">Directly supplied to children</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="bg-white rounded-3xl border border-[#D8E6F0] p-6 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-marigold-600 uppercase tracking-wider">
                Homes Supported
              </span>
              <div className="w-8 h-8 rounded-xl bg-marigold-50 text-marigold-600 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
            </div>
            <div className="font-serif text-4xl font-bold text-ink-900 mt-3 font-feature-tabular">
              {impact.institutions_helped_count}
            </div>
            <p className="text-xs text-ink-500 mt-1">Verified partner institutions</p>
          </motion.div>
        </div>

        {/* Items by Category & Homes Helped Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Category Breakdown with Category Color Coding */}
          <div className="bg-white rounded-3xl border border-[#D8E6F0] p-6 sm:p-7 shadow-soft space-y-4">
            <h3 className="font-serif text-lg font-bold text-ink-900">Items Delivered by Category</h3>
            <div className="space-y-3.5 pt-1">
              {impact.items_by_category.map((cat) => {
                const theme = getCategoryTheme(cat.category_name);
                const percent = Math.min(
                  100,
                  Math.round((cat.total_quantity / Math.max(1, impact.total_items_delivered)) * 100)
                );

                return (
                  <div key={cat.category_id} className="space-y-1.5 p-3 rounded-2xl bg-white border border-[#E2EDF5]">
                    <div className="flex justify-between text-xs font-semibold text-ink-800">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                        <span>{cat.category_name}</span>
                      </div>
                      <span className="font-feature-tabular font-bold text-coral-600">
                        {cat.total_quantity} items ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#E2EDF5] rounded-full h-2 overflow-hidden flex shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${percent}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className="h-full rounded-full shadow-sm"
                        style={{ backgroundColor: theme.primary }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Partner Homes Helped */}
          <div className="bg-white rounded-3xl border border-[#D8E6F0] p-6 sm:p-7 shadow-soft space-y-4">
            <h3 className="font-serif text-lg font-bold text-ink-900">Partner Homes You Supported</h3>
            <div className="divide-y divide-[#E2EDF5]">
              {((impact as any).institutions_helped_list || (Array.isArray(impact.institutions_helped) ? impact.institutions_helped : [])).map((inst: any) => (
                <div key={inst.institution_id} className="py-3.5 flex items-center justify-between text-xs">
                  <div>
                    <h4 className="font-bold text-ink-900 text-sm">{inst.institution_name}</h4>
                    <p className="text-ink-500 mt-0.5">{inst.city}, {inst.state}</p>
                  </div>
                  <span className="font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                    {inst.items_received} items delivered
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Visual Impact Timeline */}
        <div className="bg-white rounded-3xl border border-[#D8E6F0] p-6 sm:p-8 shadow-soft space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-bold text-ink-900">Chronological Impact Timeline</h3>
              <p className="text-xs text-ink-500 mt-1">Verified delivery milestones backed by physical receipts</p>
            </div>
            <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
              Zero Child Photos
            </span>
          </div>

          <div className="relative border-l-2 border-cream-300 pl-6 ml-3 space-y-8 pt-2">
            {impact.timeline.map((event, idx) => (
              <div key={idx} className="relative group">
                <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-coral-500 border-2 border-white shadow-soft-sm" />
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-ink-500 font-feature-tabular">
                    {new Date(event.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <h4 className="font-bold text-sm text-ink-900">{event.action}</h4>
                  <p className="text-xs text-ink-600 leading-relaxed">{event.description}</p>
                  {event.wish_title && (
                    <span className="inline-block text-[11px] font-medium text-coral-700 bg-coral-50 px-2.5 py-0.5 rounded-lg border border-coral-200 mt-1">
                      Wish: {event.wish_title}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
