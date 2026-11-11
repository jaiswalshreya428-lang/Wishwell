import React, { useState, useEffect } from 'react';
import { Category } from '../../types';
import { api, WishCreatePayload } from '../../api/endpoints';
import { DuplicateWishError } from '../../api/client';
import { useToast } from '../../context/ToastContext';

interface CreateWishFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const CreateWishForm: React.FC<CreateWishFormProps> = ({ onSuccess, onCancel }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<number>(1);
  const [title, setTitle] = useState('');
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [qtyRequested, setQtyRequested] = useState<number>(10);
  const [neededBy, setNeededBy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    similarWishes: Array<{ id: number; title: string; item_name: string; similarity_score: number }>;
  } | null>(null);

  const { showToast } = useToast();

  useEffect(() => {
    api.wishes
      .getCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0].id);
      })
      .catch(() => {});

    // Set default needed_by date to 30 days in the future
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setNeededBy(defaultDate.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = async (confirmDuplicate = false) => {
    setIsSubmitting(true);
    try {
      const payload: WishCreatePayload = {
        category_id: categoryId,
        title: title.trim(),
        item_name: itemName.trim(),
        description: description.trim(),
        qty_requested: qtyRequested,
        needed_by: new Date(`${neededBy}T23:59:59Z`).toISOString(),
        confirm_duplicate: confirmDuplicate,
      };

      await api.wishes.create(payload);
      showToast({
        type: 'success',
        title: 'Wish Created Successfully',
        message: `Your wish for ${qtyRequested}x "${itemName}" is now open for donor pledges.`,
      });
      onSuccess();
    } catch (err: any) {
      if (err instanceof DuplicateWishError || err.name === 'DuplicateWishError') {
        // Trigger Duplicate-Warning Step
        setDuplicateWarning({
          message: err.message,
          similarWishes: err.similarWishes || [],
        });
        showToast({
          type: 'warning',
          title: 'Duplicate Warning Detected',
          message: 'A similar open wish was found in this category. Please review.',
        });
      } else {
        showToast({
          type: 'error',
          title: 'Validation Error',
          message: err.message || 'Could not create wish. Ensure date is in the future.',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl border border-cream-200 p-6 sm:p-10 shadow-soft space-y-8">
        <div>
          <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">
            New Item Request
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900 mt-1">
            Post an Item Wish for Your Children
          </h2>
          <p className="text-xs sm:text-sm text-ink-600 mt-1">
            Specify the precise item and count needed. Only verified institutions can post requests.
          </p>
        </div>

        {/* Duplicate Warning Step Banner */}
        {duplicateWarning && (
          <div className="p-6 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-4 animate-in fade-in">
            <div className="flex items-start space-x-3">
              <svg className="w-5 h-5 stroke-amber-700 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-bold text-sm text-amber-900">
                  Duplicate Need Detection Warning (Rule-Based Overlap Check)
                </h4>
                <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                  {duplicateWarning.message}
                </p>
              </div>
            </div>

            {/* Similar open wishes list */}
            <div className="bg-white/80 rounded-xl p-3 divide-y divide-amber-200 text-xs">
              <div className="font-bold text-ink-700 pb-1.5 uppercase text-[10px] tracking-wider">
                Existing Open Wishes in this Category:
              </div>
              {duplicateWarning.similarWishes.map((sim) => (
                <div key={sim.id} className="py-2 flex items-center justify-between">
                  <span className="font-semibold text-ink-900">
                    Wish #{sim.id}: {sim.item_name}
                  </span>
                  <span className="text-[11px] font-mono bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                    {Math.round(sim.similarity_score * 100)}% token overlap
                  </span>
                </div>
              ))}
            </div>

            {/* Confirmation Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateWarning(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-white border border-amber-300 text-xs font-bold text-ink-800 hover:bg-amber-100/50 transition"
              >
                &larr; Revise Item Details
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSubmit(true)}
                className="w-full sm:w-auto px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold shadow-soft transition"
              >
                {isSubmitting ? 'Posting...' : 'Confirm & Create Anyway'}
              </button>
            </div>
          </div>
        )}

        {/* Wish Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit(false);
          }}
          className="space-y-6"
        >
          {/* Category */}
          <div>
            <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
              Item Category
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(parseInt(e.target.value, 10))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 bg-white text-xs text-ink-900 font-medium focus-visible:ring-2 focus-visible:ring-terracotta-600"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
              Wish Title
            </label>
            <input
              type="text"
              required
              minLength={5}
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., 20 Science Textbooks for Grade 8 Children"
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs text-ink-900 font-medium focus-visible:ring-2 focus-visible:ring-terracotta-600"
            />
          </div>

          {/* Item Name (Used for duplicate token overlap checking) */}
          <div>
            <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
              Specific Item Name (Checked for Duplicates)
            </label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={100}
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g., Grade 8 Science Textbook NCERT"
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs text-ink-900 font-medium focus-visible:ring-2 focus-visible:ring-terracotta-600"
            />
            <span className="text-[11px] text-ink-500 mt-1 block">
              Checked against existing open wishes using explainable Jaccard token overlap (&ge; 50%).
            </span>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
              Detailed Description & Dimensions / Specifications
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe details: brand, sizes, grades, or special conditions..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
            />
          </div>

          {/* Quantity & Needed By Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
                Quantity Needed (&gt; 0)
              </label>
              <input
                type="number"
                required
                min={1}
                max={5000}
                value={qtyRequested}
                onChange={(e) => setQtyRequested(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs font-bold text-ink-900 font-feature-tabular focus-visible:ring-2 focus-visible:ring-terracotta-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1.5">
                Needed-By Date (Must be in Future)
              </label>
              <input
                type="date"
                required
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-cream-300 text-xs font-semibold text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-cream-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl border border-cream-300 hover:bg-cream-100 text-xs font-semibold text-ink-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-7 py-2.5 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:brightness-110 text-white text-xs font-bold tracking-wide shadow-warm transition disabled:opacity-50"
            >
              {isSubmitting ? 'Validating...' : 'Post Wish for Pledges'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

