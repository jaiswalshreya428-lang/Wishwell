import React, { useState, useEffect, useCallback } from 'react';
import { OpenWishViewItem, Category } from '../../types';
import { api } from '../../api/endpoints';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

interface BrowseWishesProps {
  onSelectWish: (wish: OpenWishViewItem) => void;
  onClaimWish: (wish: OpenWishViewItem) => void;
}

export const BrowseWishes: React.FC<BrowseWishesProps> = ({ onSelectWish, onClaimWish }) => {
  const [wishes, setWishes] = useState<OpenWishViewItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalWishes, setTotalWishes] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load categories
  useEffect(() => {
    api.wishes
      .getCategories()
      .then(setCategories)
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Description */}
      <div className="border-b border-cream-200 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">
            Direct Item Donations
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mt-1">
            Browse Verified Wishes
          </h1>
          <p className="text-sm text-ink-600 mt-1 max-w-xl">
            Choose a wish posted by a verified home. Pledge full or partial quantities and ship items directly.
          </p>
        </div>
        <div className="text-xs text-ink-500 font-feature-tabular">
          Showing {wishes.length} of {totalWishes} open wishes
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items, textbooks, clothing, home..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-cream-300 bg-white text-xs font-medium text-ink-900 placeholder:text-ink-400 focus-visible:ring-2 focus-visible:ring-terracotta-600 focus-visible:outline-none shadow-soft-sm"
          />
          <svg
            className="w-4 h-4 stroke-ink-400 absolute left-3.5 top-3"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        {/* Category Pill Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button
            onClick={() => handleCategoryClick(undefined)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              selectedCategory === undefined
                ? 'bg-terracotta-600 text-white shadow-soft-sm'
                : 'bg-white text-ink-700 hover:bg-cream-100 border border-cream-200'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-terracotta-600 text-white shadow-soft-sm'
                  : 'bg-white text-ink-700 hover:bg-cream-100 border border-cream-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <LoadingSpinner label="Fetching open wishes from verified homes..." />}

      {/* Error State */}
      {!isLoading && error && (
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center max-w-lg mx-auto">
          <p className="text-sm font-semibold text-rose-800">{error}</p>
          <button
            onClick={loadWishes}
            className="mt-4 px-4 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-rose-700"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && wishes.length === 0 && (
        <EmptyState
          title="No open wishes found"
          description="Try broadening your category filter or clearing your search keywords."
          actionText="Clear All Filters"
          onAction={() => {
            setSelectedCategory(undefined);
            setSearchQuery('');
            setPage(1);
          }}
        />
      )}

      {/* Wishes Grid */}
      {!isLoading && !error && wishes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishes.map((wish) => {
            const percentClaimed = Math.min(
              100,
              Math.round((wish.qty_claimed / wish.qty_requested) * 100)
            );
            return (
              <div
                key={wish.wish_id}
                className="bg-white rounded-2xl border border-cream-200 p-6 flex flex-col justify-between shadow-soft hover:shadow-soft-lg transition-all duration-200 transform hover:-translate-y-1"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold text-terracotta-700 bg-terracotta-50 px-2.5 py-0.5 rounded-full border border-terracotta-100">
                      {wish.category_name}
                    </span>
                    <StatusBadge status={wish.wish_status} size="sm" />
                  </div>

                  {/* Title & Description */}
                  <h3
                    onClick={() => onSelectWish(wish)}
                    className="font-serif text-lg font-bold text-ink-900 hover:text-terracotta-600 cursor-pointer transition line-clamp-1"
                  >
                    {wish.wish_title}
                  </h3>
                  <p className="text-xs font-medium text-terracotta-600 mt-0.5">
                    Item: {wish.item_name}
                  </p>
                  <p className="text-xs text-ink-600 mt-2 line-clamp-2 leading-relaxed">
                    {wish.wish_description}
                  </p>

                  {/* Institution Details */}
                  <div className="mt-4 pt-4 border-t border-cream-100 flex items-center justify-between text-xs text-ink-500">
                    <div className="truncate">
                      <span className="font-semibold text-ink-800 block truncate">
                        {wish.institution_name}
                      </span>
                      <span className="text-[11px]">
                        {wish.institution_city}, {wish.institution_state}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-sage-700 bg-sage-50 px-2 py-0.5 rounded border border-sage-200">
                      Physical Check &check;
                    </span>
                  </div>

                  {/* Fulfillment Progress */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium text-ink-700 font-feature-tabular">
                      <span>{wish.qty_claimed} of {wish.qty_requested} pledged</span>
                      <span className="font-bold text-terracotta-600">{wish.qty_remaining} left</span>
                    </div>
                    <div className="w-full bg-cream-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-terracotta-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentClaimed}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-6 pt-4 border-t border-cream-100 flex items-center justify-between gap-3">
                  <span className="text-[11px] font-medium text-ink-500">
                    {formatNeededBy(wish.needed_by)}
                  </span>
                  <button
                    onClick={() => onClaimWish(wish)}
                    disabled={wish.qty_remaining <= 0}
                    className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition shadow-soft-sm ${
                      wish.qty_remaining > 0
                        ? 'bg-terracotta-600 hover:bg-terracotta-700 text-white'
                        : 'bg-cream-200 text-ink-400 cursor-not-allowed'
                    }`}
                  >
                    Pledge Items &rarr;
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3.5 py-1.5 rounded-lg border border-cream-300 text-xs font-semibold text-ink-700 hover:bg-cream-100 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs font-semibold text-ink-600 px-3 font-feature-tabular">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3.5 py-1.5 rounded-lg border border-cream-300 text-xs font-semibold text-ink-700 hover:bg-cream-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

