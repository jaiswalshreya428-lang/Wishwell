import React, { useState, useEffect, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { OpenWishViewItem, Category } from '../../types';
import { api } from '../../api/endpoints';
import { SkeletonWishGrid } from '../common/SkeletonCard';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';
import { CategoryIllustration } from '../illustrations/Illustrations';
import { WashiTape, PaperTagPin } from '../atmosphere/HandmadeAccents';
import { WorkPageHeader } from '../layout/WorkPageHeader';
import { getCategoryTheme } from '../../utils/categoryColors';
import { ShieldCheck, Calendar, Sparkles, Search, Layers, RefreshCw } from 'lucide-react';

interface BrowseWishesProps {
  onSelectWish: (wish: OpenWishViewItem) => void;
  onClaimWish: (wish: OpenWishViewItem) => void;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: 'Educational Supplies', description: 'Notebooks, textbooks, stationery' },
  { id: 2, name: 'Clothing & Footwear', description: 'School uniforms, sweaters, shoes' },
  { id: 3, name: 'Health & Hygiene', description: 'Toothbrushes, soaps, sanitizers' },
  { id: 4, name: 'Nutrition & Food', description: 'Rice sacks, lentils, infant formula' },
  { id: 5, name: 'Bedding & Linen', description: 'Mattresses, wool blankets, pillows' },
  { id: 6, name: 'Sports & Recreation', description: 'Footballs, cricket bats, art supplies' },
];

export const BrowseWishes: React.FC<BrowseWishesProps> = ({ onSelectWish, onClaimWish }) => {
  const shouldReduceMotion = useReducedMotion();
  const [wishes, setWishes] = useState<OpenWishViewItem[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalWishes, setTotalWishes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load categories from database (merges new categories seamlessly)
  useEffect(() => {
    api.wishes
      .getCategories()
      .then((data) => {
        if (data && data.length > 0) setCategories(data);
      })
      .catch(() => {});
  }, []);

  // Load wishes
  const loadWishes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.wishes.list({
        page,
        limit: 9,
        category_id: selectedCategory,
        search: searchQuery.trim() || undefined,
      });
      setWishes(res.items);
      setTotalPages(res.total_pages);
      setTotalWishes(res.total);
    } catch (err: any) {
      setError(err.message || 'Unable to load wishes. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [page, selectedCategory, searchQuery]);

  useEffect(() => {
    loadWishes();
  }, [loadWishes]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadWishes();
  };

  const handleCategoryClick = (catId?: number) => {
    setSelectedCategory(catId);
    setPage(1);
  };

  const formatNeededBy = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Urgent: Due today';
      if (diffDays === 1) return 'Due tomorrow';
      if (diffDays <= 7) return `Needed in ${diffDays} days`;
      return `Needed by ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Sunlight Page Header Band */}
      <WorkPageHeader
        badge="Direct Item Donations"
        badgeIcon={<Layers className="w-3.5 h-3.5" />}
        title="Browse Verified Wishes"
        subtitle="Choose a wish posted by a document-verified children's home. Pledge full or partial quantities and ship physical items directly with guaranteed delivery tracking."
        actions={
          <div className="flex items-center gap-2 bg-[#FBF9F3] px-4 py-2 rounded-2xl border border-[#C7D6CD] text-xs font-semibold text-[#1D2927] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#24635C] animate-pulse" />
            <span>{totalWishes} Open Wishes Available</span>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Filter & Search Bar */}
        <div className="bg-[#FAF7EF]/95 backdrop-blur-sm rounded-3xl border border-[#D4CAB0] p-5 sm:p-6 shadow-soft flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by item, home, or keywords..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-[#D4CAB0] bg-[#FFFDF8] text-xs font-medium text-ink-900 placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:outline-none shadow-soft-sm transition"
            />
            <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-3.5" />
          </form>

          {/* Category Pill Filters with Color-Coded Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            <button
              onClick={() => handleCategoryClick(undefined)}
              className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === undefined
                  ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white shadow-soft font-bold'
                  : 'bg-white text-ink-700 hover:bg-cream-100 border border-cream-200'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => {
              const theme = getCategoryTheme(cat.name);
              const isSelected = selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-gradient-to-r from-coral-500 to-coral-600 text-white border-coral-600 shadow-soft font-bold'
                      : `${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} hover:brightness-95`
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading State - Skeleton Grid */}
        {isLoading && <SkeletonWishGrid count={6} />}

        {/* Error State */}
        {!isLoading && error && (
          <div className="p-8 rounded-3xl bg-rose-50/90 border border-rose-200 text-center max-w-lg mx-auto shadow-soft space-y-3">
            <p className="text-sm font-semibold text-rose-800">{error}</p>
            <button
              onClick={loadWishes}
              className="px-5 py-2.5 bg-coral-600 hover:bg-coral-700 text-white text-xs font-bold rounded-xl shadow-soft transition inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Loading</span>
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && wishes.length === 0 && (
          <EmptyState
            title="No open wishes found"
            description="Try selecting another category or clearing your search keywords."
            actionText="Clear All Filters"
            onAction={() => {
              setSelectedCategory(undefined);
              setSearchQuery('');
              setPage(1);
            }}
          />
        )}

        {/* Wishes Grid with Category Color-Coded Cards & Gentle Floating Animation */}
        {!isLoading && !error && wishes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
            {wishes.map((wish, index) => {
              const theme = getCategoryTheme(wish.category_name);
              const percentClaimed = Math.min(
                100,
                Math.round((wish.qty_claimed / wish.qty_requested) * 100)
              );

              // Friendly slight handmade tilt
              const tiltRotation = index % 3 === 0 ? -0.7 : index % 3 === 1 ? 0.6 : -0.4;

              return (
                <motion.div
                  key={wish.wish_id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{
                    opacity: 1,
                    y: shouldReduceMotion ? 0 : [0, -3.5, 0],
                  }}
                  transition={{
                    opacity: { duration: 0.35, delay: index * 0.05 },
                    y: shouldReduceMotion
                      ? undefined
                      : {
                          duration: 4.5 + (index % 3) * 0.8,
                          repeat: Infinity,
                          ease: 'easeInOut',
                          delay: (index % 3) * 0.4,
                        },
                  }}
                  whileHover={shouldReduceMotion ? undefined : { y: -7, rotate: 0, transition: { duration: 0.2 } }}
                  className={`bg-[#FBF8F1] rounded-3xl border-2 border-dashed ${theme.border} hover:border-coral-500 p-6 flex flex-col justify-between shadow-soft hover:shadow-card transition-all duration-200 relative overflow-hidden group`}
                  style={{ transform: shouldReduceMotion ? 'none' : `rotate(${tiltRotation}deg)` }}
                >
                  {/* Category subtle gradient wash at top of card */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${theme.gradient} opacity-80`}
                  />

                  {/* Washi Tape in Category Accent */}
                  <WashiTape
                    position={index % 2 === 0 ? 'top-right' : 'top-left'}
                    color={theme.washiColor}
                  />
                  <PaperTagPin />

                  <div className="pt-2 relative z-10">
                    {/* Top Row: Category Illustration & Badges */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="p-2 rounded-2xl bg-white border border-cream-200 shadow-soft-sm">
                        <CategoryIllustration category={wish.category_name} size={44} />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                          {wish.category_name}
                        </span>
                        <StatusBadge status={wish.wish_status} size="sm" />
                      </div>
                    </div>

                    {/* Title & Item Name */}
                    <h3
                      onClick={() => onSelectWish(wish)}
                      className="font-serif text-lg font-bold text-ink-900 hover:text-coral-600 cursor-pointer transition line-clamp-1"
                    >
                      {wish.wish_title}
                    </h3>
                    <p className="text-xs font-semibold text-coral-600 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Item: {wish.item_name}</span>
                    </p>
                    <p className="text-xs text-ink-600 mt-2 line-clamp-2 leading-relaxed">
                      {wish.wish_description}
                    </p>

                    {/* Institution Details */}
                    <div className="mt-4 pt-3.5 border-t border-cream-200/70 flex items-center justify-between text-xs text-ink-500">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-ink-900 block truncate">
                          {wish.institution_name}
                        </span>
                        <span className="text-[11px] text-ink-500">
                          {wish.institution_city}, {wish.institution_state}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-full border border-teal-200 shrink-0">
                        <ShieldCheck className="w-3 h-3 text-teal-600" />
                        Verified Home
                      </span>
                    </div>

                    {/* Quantity Fulfillment Progress with Animation */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-ink-700 font-feature-tabular">
                        <span>{wish.qty_claimed} of {wish.qty_requested} pledged</span>
                        <span className="font-bold text-coral-600">{wish.qty_remaining} needed</span>
                      </div>
                      <div className="w-full bg-cream-200/90 rounded-full h-2.5 overflow-hidden flex shadow-inner">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${percentClaimed}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          className="bg-coral-500 h-full rounded-full shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Date & Claim Action */}
                  <div className="mt-5 pt-3.5 border-t border-cream-200/70 flex items-center justify-between relative z-10">
                    <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                      <Calendar className="w-3.5 h-3.5 text-ink-400" />
                      <span>{formatNeededBy(wish.needed_by)}</span>
                    </span>
                    <button
                      onClick={() => onClaimWish(wish)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:brightness-110 text-white font-bold text-xs tracking-wide shadow-soft transition active:scale-95"
                    >
                      Pledge Item &rarr;
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="pt-6 flex items-center justify-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl bg-white border border-cream-300 text-xs font-semibold text-ink-700 disabled:opacity-40 hover:bg-cream-100 shadow-soft-sm transition"
            >
              &larr; Previous
            </button>
            <span className="text-xs font-medium text-ink-600 px-3">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl bg-white border border-cream-300 text-xs font-semibold text-ink-700 disabled:opacity-40 hover:bg-cream-100 shadow-soft-sm transition"
            >
              Next &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
