import React, { useState, useEffect } from 'react';
import { AdminAnalyticsOverview } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';

export const AdminAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTriggeringJob, setIsTriggeringJob] = useState(false);
  const { showToast } = useToast();

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const overview = await api.admin.getOverview();
      setData(overview);
    } catch {
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Could not fetch admin analytics metrics.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const handleTriggerStaleClaims = async () => {
    setIsTriggeringJob(true);
    try {
      const res = await api.admin.triggerStaleClaimRelease();
      showToast({
        type: 'success',
        title: 'Job Executed',
        message: res.message || 'Stored procedure sp_release_stale_claims executed successfully.',
      });
      loadAnalytics();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Execution Failed',
        message: err.message || 'Failed to execute stale claims release procedure.',
      });
    } finally {
      setIsTriggeringJob(false);
    }
  };

  if (isLoading) return <LoadingSpinner label="Crunching system-wide analytics..." />;
  if (!data) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header & Procedures Trigger */}
      <div className="border-b border-cream-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">
            Executive Analytics & BI Feed
          </span>
          <h1 className="font-serif text-3xl font-bold text-ink-900 mt-1">
            Platform Performance Dashboard
          </h1>
          <p className="text-sm text-ink-600 mt-1">
            Aggregated metrics formatted for Power BI. Invariants enforced via T-SQL triggers and stored procedures.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleTriggerStaleClaims}
            disabled={isTriggeringJob}
            className="px-4 py-2.5 rounded-xl bg-ink-800 hover:bg-ink-900 text-white text-xs font-bold shadow-soft transition flex items-center space-x-2 disabled:opacity-50"
            title="Invokes sp_release_stale_claims in one atomic transaction"
          >
            <svg className="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{isTriggeringJob ? 'Executing SP...' : 'Run sp_release_stale_claims'}</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft">
          <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Avg. Time to Deliver</span>
          <div className="font-serif text-3xl font-bold text-ink-900 mt-2 font-feature-tabular">
            {data.delivery_time.average_days} <span className="text-base font-normal text-ink-500">days</span>
          </div>
          <p className="text-xs text-ink-500 mt-1">
            {data.delivery_time.average_hours} total hours ({data.delivery_time.total_completed_deliveries} delivered items)
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft">
          <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Stale-Claim Rate</span>
          <div className="font-serif text-3xl font-bold text-amber-600 mt-2 font-feature-tabular">
            {data.stale_claims.stale_claim_rate_percentage}%
          </div>
          <p className="text-xs text-ink-500 mt-1">
            {data.stale_claims.expired_claims} expired out of {data.stale_claims.total_claims} claims
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft">
          <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Active Claims in Transit</span>
          <div className="font-serif text-3xl font-bold text-terracotta-600 mt-2 font-feature-tabular">
            {data.stale_claims.active_claims}
          </div>
          <p className="text-xs text-ink-500 mt-1">
            {data.stale_claims.delivered_claims} delivered successfully
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-cream-200 p-6 shadow-soft">
          <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">Homes Verified</span>
          <div className="font-serif text-3xl font-bold text-sage-700 mt-2 font-feature-tabular">
            {data.institution_breakdown.find((i) => i.status === 'verified')?.count || 0}
          </div>
          <p className="text-xs text-ink-500 mt-1">
            {data.institution_breakdown.find((i) => i.status === 'pending')?.count || 0} pending field review
          </p>
        </div>
      </div>

      {/* Monthly Wishes Posted vs Fulfilled Chart */}
      <div className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-8 shadow-soft space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-xl font-bold text-ink-900">
              Monthly Wishes Demand vs. Fulfillment Trend
            </h3>
            <p className="text-xs text-ink-500">Tracking wishes posted vs confirmed fulfilled deliveries</p>
          </div>
          <div className="flex items-center space-x-4 text-xs font-semibold">
            <span className="flex items-center space-x-1.5 text-ink-700">
              <span className="w-3 h-3 rounded bg-cream-300" />
              <span>Posted</span>
            </span>
            <span className="flex items-center space-x-1.5 text-terracotta-700">
              <span className="w-3 h-3 rounded bg-terracotta-600" />
              <span>Fulfilled</span>
            </span>
          </div>
        </div>

        {/* Responsive Interactive SVG Bar Chart */}
        <div className="h-64 w-full flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-2 border-b border-cream-200 px-4">
          {data.monthly_trends.map((item, idx) => {
            const maxVal = Math.max(
              ...data.monthly_trends.flatMap((m) => [m.wishes_posted, m.wishes_fulfilled, 10])
            );
            const postedHeight = Math.max(10, (item.wishes_posted / maxVal) * 100);
            const fulfilledHeight = Math.max(10, (item.wishes_fulfilled / maxVal) * 100);

            return (
              <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                <div className="w-full flex items-end justify-center space-x-1 sm:space-x-2 h-full">
                  {/* Posted bar */}
                  <div
                    className="w-1/2 max-w-[28px] bg-cream-300 hover:bg-cream-400 rounded-t-md transition-all duration-300 relative"
                    style={{ height: `${postedHeight}%` }}
                    title={`Posted: ${item.wishes_posted}`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none transition">
                      {item.wishes_posted}
                    </span>
                  </div>

                  {/* Fulfilled bar */}
                  <div
                    className="w-1/2 max-w-[28px] bg-terracotta-600 hover:bg-terracotta-700 rounded-t-md transition-all duration-300 relative"
                    style={{ height: `${fulfilledHeight}%` }}
                    title={`Fulfilled: ${item.wishes_fulfilled}`}
                  >
                    <span className="opacity-0 group-hover:opacity-100 absolute -top-6 left-1/2 -translate-x-1/2 bg-terracotta-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow pointer-events-none transition">
                      {item.wishes_fulfilled}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-ink-500 mt-2 font-feature-tabular">
                  {item.month}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Categories & Institution Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Categories */}
        <div className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-8 shadow-soft space-y-6">
          <div>
            <h3 className="font-serif text-xl font-bold text-ink-900">Top Categories by Demand</h3>
            <p className="text-xs text-ink-500">Volume of wishes requested vs completed per category</p>
          </div>

          <div className="space-y-4">
            {data.top_categories.map((cat) => (
              <div key={cat.category_id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-ink-900">{cat.category_name}</span>
                  <span className="text-ink-600 font-feature-tabular">
                    {cat.fulfilled_wishes} / {cat.total_wishes} wishes ({cat.fulfillment_rate}%)
                  </span>
                </div>
                <div className="w-full bg-cream-100 rounded-full h-2.5 overflow-hidden flex">
                  <div
                    className="bg-terracotta-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${cat.fulfillment_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Institutions by Status */}
        <div className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-8 shadow-soft space-y-6">
          <div>
            <h3 className="font-serif text-xl font-bold text-ink-900">Institution Verification Distribution</h3>
            <p className="text-xs text-ink-500">State of homes registered across the two-step verification workflow</p>
          </div>

          <div className="space-y-3">
            {data.institution_breakdown.map((item) => (
              <div
                key={item.status}
                className="p-4 rounded-xl border border-cream-200 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      item.status === 'verified'
                        ? 'bg-sage-600'
                        : item.status === 'recommended'
                        ? 'bg-amber-500'
                        : item.status === 'pending'
                        ? 'bg-ink-400'
                        : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-xs font-bold text-ink-900 capitalize">
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-ink-900 font-feature-tabular">
                    {item.count} homes
                  </span>
                  <span className="text-[11px] text-ink-500 ml-2 font-feature-tabular">
                    ({item.percentage}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

