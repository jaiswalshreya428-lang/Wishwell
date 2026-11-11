import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, 
  Play, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  BarChart3, 
  Layers, 
  Building2 
} from 'lucide-react';
import { AdminAnalyticsOverview } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { WorkPageHeader } from '../layout/WorkPageHeader';
import { getCategoryTheme } from '../../utils/categoryColors';

// Failsafe sample data in case the database is brand-new / empty or network fails
const DEMO_FALLBACK_ANALYTICS: AdminAnalyticsOverview = {
  monthly_wishes: [
    { month: '2026-06', wishes_posted: 18, wishes_fulfilled: 14, fulfillment_rate_percentage: 77.8 },
    { month: '2026-07', wishes_posted: 24, wishes_fulfilled: 21, fulfillment_rate_percentage: 87.5 },
    { month: '2026-08', wishes_posted: 32, wishes_fulfilled: 28, fulfillment_rate_percentage: 87.5 },
    { month: '2026-09', wishes_posted: 45, wishes_fulfilled: 39, fulfillment_rate_percentage: 86.7 },
    { month: '2026-10', wishes_posted: 58, wishes_fulfilled: 51, fulfillment_rate_percentage: 87.9 },
    { month: '2026-11', wishes_posted: 42, wishes_fulfilled: 36, fulfillment_rate_percentage: 85.7 },
  ],
  delivery_time: {
    average_days: 3.4,
    average_hours: 81.6,
    total_completed_deliveries: 189,
  },
  stale_claims: {
    total_claims: 212,
    active_claims: 18,
    delivered_claims: 189,
    released_claims: 3,
    expired_claims: 2,
    stale_claim_rate_percentage: 0.9,
  },
  institutions_by_status: [
    { status: 'verified', count: 14, percentage: 70.0 },
    { status: 'recommended', count: 3, percentage: 15.0 },
    { status: 'pending', count: 2, percentage: 10.0 },
    { status: 'rejected', count: 1, percentage: 5.0 },
  ],
  top_categories: [
    { category_id: 1, category_name: 'School Essentials', wishes_count: 52, total_items_requested: 210, total_items_delivered: 195, fulfillment_rate_percentage: 92.9 },
    { category_id: 2, category_name: 'Winter Warmth', wishes_count: 38, total_items_requested: 160, total_items_delivered: 142, fulfillment_rate_percentage: 88.8 },
    { category_id: 3, category_name: 'Footwear & Sports', wishes_count: 29, total_items_requested: 95, total_items_delivered: 81, fulfillment_rate_percentage: 85.3 },
    { category_id: 4, category_name: 'Books & Literacy', wishes_count: 24, total_items_requested: 180, total_items_delivered: 162, fulfillment_rate_percentage: 90.0 },
  ],
};

export const AdminAnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AdminAnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isTriggeringJob, setIsTriggeringJob] = useState(false);
  const [isUsingDemoFallback, setIsUsingDemoFallback] = useState(false);
  const { showToast } = useToast();

  const loadAnalytics = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const overview = await api.admin.getOverview();
      setData(overview);
      setIsUsingDemoFallback(false);
    } catch (err: any) {
      const msg = err?.message || 'Could not fetch admin analytics metrics from API.';
      setFetchError(msg);
      showToast({
        type: 'error',
        title: 'Analytics API Notice',
        message: 'Could not fetch live metrics. Showing cached / fallback view.',
      });
      // Fallback to sample data so administrator is never presented with a blank white page
      setData(DEMO_FALLBACK_ANALYTICS);
      setIsUsingDemoFallback(true);
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
        message: err?.message || 'Failed to execute stale claims release procedure.',
      });
    } finally {
      setIsTriggeringJob(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="py-24">
        <LoadingSpinner label="Crunching platform analytics and Power BI data feed..." />
      </div>
    );
  }

  // Safe extraction with fallbacks to both schema variants (backend and frontend aliases)
  const activeData = data || DEMO_FALLBACK_ANALYTICS;
  const monthlyData = activeData.monthly_wishes || activeData.monthly_trends || [];
  const instData = activeData.institutions_by_status || activeData.institution_breakdown || [];
  const topCats = activeData.top_categories || [];
  const deliveryMetric = activeData.delivery_time || {
    average_days: 0,
    average_hours: 0,
    total_completed_deliveries: 0,
  };
  const staleMetric = activeData.stale_claims || {
    total_claims: 0,
    active_claims: 0,
    delivered_claims: 0,
    released_claims: 0,
    expired_claims: 0,
    stale_claim_rate_percentage: 0,
  };

  const verifiedCount = instData.find((i) => i.status === 'verified')?.count || 0;
  const pendingCount = instData.find((i) => i.status === 'pending')?.count || 0;

  // Maximum value for bar chart height scaling
  const maxBarValue = Math.max(
    10,
    ...monthlyData.flatMap((m) => [m.wishes_posted || 0, m.wishes_fulfilled || 0])
  );

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Twilight Home Dark Indigo Page Header Band */}
      <WorkPageHeader
        badge="Executive BI & Analytics"
        badgeIcon={<BarChart3 className="w-3.5 h-3.5 text-[#F6B93B]" />}
        title="Platform Performance Dashboard"
        subtitle="Real-time delivery turnaround, stale-claim velocity, verification pipeline, and category demand aggregation formatted for direct Power BI ingestion."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadAnalytics}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-xl bg-[#3A2A55]/80 hover:bg-[#3A2A55] text-[#FFFBF5] text-xs font-semibold transition flex items-center space-x-2 border border-[#F6B93B]/20 active:scale-95"
              title="Refresh all metrics from the database"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#F6B93B] ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>

            <button
              onClick={handleTriggerStaleClaims}
              disabled={isTriggeringJob}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:brightness-110 text-white text-xs font-bold shadow-soft transition flex items-center space-x-2 disabled:opacity-50 active:scale-95"
              title="Invokes sp_release_stale_claims in one atomic transaction"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isTriggeringJob ? 'Running Job...' : 'Run sp_release_stale_claims'}</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Fallback Notice Banner (shown if API was unreachable) */}
        {isUsingDemoFallback && (
          <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-soft">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div className="text-xs">
                <span className="font-bold">Live API Notice:</span> Live database query returned no active data or required fresh sync. Showing platform preview metrics.
                {fetchError && <span className="block text-[11px] text-amber-700/80 mt-0.5">{fetchError}</span>}
              </div>
            </div>
            <button
              onClick={loadAnalytics}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-soft transition flex items-center space-x-1.5 self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry Sync</span>
            </button>
          </div>
        )}

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Turnaround Lead Time */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white rounded-3xl border border-cream-200/90 p-6 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
              Avg. Delivery Lead Time
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mt-3 font-feature-tabular">
            {deliveryMetric.average_days}{' '}
            <span className="text-base font-normal text-ink-500">days</span>
          </div>
          <div className="mt-3 pt-3 border-t border-cream-100 flex items-center justify-between text-xs text-ink-500">
            <span>{deliveryMetric.average_hours} total hours</span>
            <span className="font-medium text-ink-700 font-feature-tabular">
              {deliveryMetric.total_completed_deliveries} delivered
            </span>
          </div>
        </motion.div>

        {/* Metric 2: Stale Claim Velocity */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-3xl border border-cream-200/90 p-6 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
              Stale-Claim Rate
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-rose-600 mt-3 font-feature-tabular">
            {staleMetric.stale_claim_rate_percentage}%
          </div>
          <div className="mt-3 pt-3 border-t border-cream-100 flex items-center justify-between text-xs text-ink-500">
            <span>{staleMetric.expired_claims} expired</span>
            <span className="font-medium text-ink-700 font-feature-tabular">
              {staleMetric.total_claims} total claims
            </span>
          </div>
        </motion.div>

        {/* Metric 3: Active Pledges in Transit */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white rounded-3xl border border-cream-200/90 p-6 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
              Active Claims in Transit
            </span>
            <div className="w-8 h-8 rounded-xl bg-terracotta-50 text-terracotta-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-terracotta-600 mt-3 font-feature-tabular">
            {staleMetric.active_claims}
          </div>
          <div className="mt-3 pt-3 border-t border-cream-100 flex items-center justify-between text-xs text-ink-500">
            <span>{staleMetric.delivered_claims} fulfilled</span>
            <span className="font-medium text-ink-700 font-feature-tabular">
              {staleMetric.released_claims} released
            </span>
          </div>
        </motion.div>

        {/* Metric 4: Verified Children's Homes */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-3xl border border-cream-200/90 p-6 shadow-soft hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 relative group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-ink-500 uppercase tracking-wider">
              Homes Verified
            </span>
            <div className="w-8 h-8 rounded-xl bg-forest-50 text-forest-700 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-bold text-forest-700 mt-3 font-feature-tabular">
            {verifiedCount}
          </div>
          <div className="mt-3 pt-3 border-t border-cream-100 flex items-center justify-between text-xs text-ink-500">
            <span>{pendingCount} pending review</span>
            <span className="font-medium text-forest-700 font-feature-tabular">
              2-step verified
            </span>
          </div>
        </motion.div>
      </div>

      {/* Monthly Wishes Demand vs Fulfillment Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.25 }}
        className="bg-white rounded-3xl border border-cream-200/90 p-6 sm:p-8 shadow-soft space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-terracotta-600" />
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-ink-900">
                Monthly Wishes Demand vs. Fulfillment Trend
              </h3>
            </div>
            <p className="text-xs text-ink-500 mt-1">
              Monthly tracking of requested items vs physically delivered packages
            </p>
          </div>

          <div className="flex items-center space-x-5 text-xs font-semibold bg-cream-50 px-4 py-2 rounded-2xl border border-cream-200 self-start sm:self-auto">
            <span className="flex items-center space-x-2 text-ink-700">
              <span className="w-3 h-3 rounded-md bg-cream-300 border border-cream-400" />
              <span>Requested</span>
            </span>
            <span className="flex items-center space-x-2 text-terracotta-700">
              <span className="w-3 h-3 rounded-md bg-terracotta-600" />
              <span>Fulfilled</span>
            </span>
          </div>
        </div>

        {monthlyData.length === 0 ? (
          <div className="h-48 rounded-2xl bg-cream-50 border border-dashed border-cream-200 flex items-center justify-center text-xs text-ink-500">
            No historical monthly wish records found. Wishes created this month will appear here automatically.
          </div>
        ) : (
          <div className="pt-4">
            {/* Interactive SVG Bar Chart with Hover Tooltips */}
            <div className="h-64 w-full flex items-end justify-between gap-2 sm:gap-6 pb-2 border-b border-cream-200 px-2 sm:px-6">
              {monthlyData.map((item, idx) => {
                const posted = item.wishes_posted || 0;
                const fulfilled = item.wishes_fulfilled || 0;
                const postedHeight = Math.max(8, (posted / maxBarValue) * 100);
                const fulfilledHeight = Math.max(8, (fulfilled / maxBarValue) * 100);

                return (
                  <div key={item.month || idx} className="flex-1 flex flex-col items-center h-full justify-end group">
                    <div className="w-full flex items-end justify-center space-x-1 sm:space-x-2 h-full">
                      {/* Posted Bar */}
                      <div
                        className="w-1/2 max-w-[32px] bg-cream-300 hover:bg-cream-400 rounded-t-lg transition-all duration-300 relative cursor-pointer"
                        style={{ height: `${postedHeight}%` }}
                      >
                        <span className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 bg-ink-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-soft transition whitespace-nowrap z-10">
                          Posted: {posted}
                        </span>
                      </div>

                      {/* Fulfilled Bar */}
                      <div
                        className="w-1/2 max-w-[32px] bg-terracotta-600 hover:bg-terracotta-700 rounded-t-lg transition-all duration-300 relative cursor-pointer shadow-sm"
                        style={{ height: `${fulfilledHeight}%` }}
                      >
                        <span className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 bg-terracotta-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-soft transition whitespace-nowrap z-10">
                          Fulfilled: {fulfilled} ({item.fulfillment_rate_percentage || 0}%)
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-ink-500 mt-3 font-feature-tabular">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-ink-500 px-2 sm:px-6">
              <span>Historical progression (oldest &rarr; newest)</span>
              <span>Source: SQL analytical view <code className="font-mono text-[10px] bg-cream-100 px-1.5 py-0.5 rounded">v_monthly_wishes</code></span>
            </div>
          </div>
        )}
      </motion.div>

      {/* Top Categories & Institution Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Categories by Demand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className="bg-white rounded-3xl border border-cream-200/90 p-6 sm:p-8 shadow-soft space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-terracotta-600" />
                <h3 className="font-serif text-xl font-bold text-ink-900">
                  Top Categories by Demand
                </h3>
              </div>
              <p className="text-xs text-ink-500 mt-1">
                Volume of wishes requested vs delivered per category
              </p>
            </div>
            <span className="text-xs font-bold text-ink-500">
              {topCats.length} Categories
            </span>
          </div>

          {topCats.length === 0 ? (
            <div className="py-12 text-center text-xs text-ink-500 bg-cream-50 rounded-2xl border border-dashed border-cream-200">
              No category data recorded yet.
            </div>
          ) : (
            <div className="space-y-4 pt-1">
              {topCats.map((cat) => {
                const delivered = cat.total_items_delivered ?? cat.fulfilled_wishes ?? 0;
                const requested = cat.total_items_requested ?? cat.total_wishes ?? 0;
                const wishes = cat.wishes_count ?? cat.total_wishes ?? 0;
                const rate = cat.fulfillment_rate_percentage ?? cat.fulfillment_rate ?? (requested > 0 ? Math.round((delivered / requested) * 100) : 0);
                const theme = getCategoryTheme(cat.category_name);

                return (
                  <div key={cat.category_id} className="p-4 rounded-2xl bg-[#FFFBF5] border border-cream-200/80 space-y-2.5 shadow-soft-sm">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: theme.primary }} />
                        <span className="font-bold text-ink-900">{cat.category_name}</span>
                      </div>
                      <span className="text-ink-600 font-feature-tabular font-medium">
                        {delivered} / {requested} items ({wishes} wishes &middot; <strong className="text-coral-600">{rate}%</strong>)
                      </span>
                    </div>
                    <div className="w-full bg-cream-200/80 rounded-full h-2.5 overflow-hidden flex shadow-inner">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
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
          )}
        </motion.div>

        {/* Institution Verification Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.35 }}
          className="bg-white rounded-3xl border border-cream-200/90 p-6 sm:p-8 shadow-soft space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-forest-700" />
                <h3 className="font-serif text-xl font-bold text-ink-900">
                  Verification Pipeline Status
                </h3>
              </div>
              <p className="text-xs text-ink-500 mt-1">
                Distribution of registered homes across two-step verification
              </p>
            </div>
            <span className="text-xs font-bold text-ink-500">
              {instData.reduce((acc, i) => acc + (i.count || 0), 0)} Total Homes
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {instData.map((item) => {
              const bulletColor =
                item.status === 'verified'
                  ? 'bg-forest-600'
                  : item.status === 'recommended'
                  ? 'bg-amber-500'
                  : item.status === 'pending'
                  ? 'bg-ink-400'
                  : 'bg-rose-500';

              return (
                <div
                  key={item.status}
                  className="p-4 rounded-2xl border border-cream-200/80 bg-cream-50/50 flex items-center justify-between hover:bg-cream-100/50 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className={`w-3 h-3 rounded-full ${bulletColor}`} />
                    <span className="text-xs font-bold text-ink-900 capitalize">
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-ink-900 font-feature-tabular">
                      {item.count} homes
                    </span>
                    <span className="text-[11px] text-ink-500 ml-2 font-feature-tabular font-medium">
                      ({item.percentage}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-cream-100/70 border border-dashed border-cream-300 text-xs text-ink-600 leading-relaxed">
            <span className="font-semibold text-ink-900">Governance Note:</span> Only homes with status <span className="font-semibold text-forest-700">verified</span> can post wish items to the public donor feed. Unverified submissions remain gated until verifier recommendation and admin confirmation.
          </div>
        </motion.div>
      </div>
    </div>
    </div>
  );
};
