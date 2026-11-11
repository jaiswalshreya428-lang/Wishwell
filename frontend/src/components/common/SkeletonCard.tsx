import React from 'react';

export const SkeletonWishCard: React.FC = () => {
  return (
    <div className="bg-[#FBF8F1] rounded-3xl p-6 border border-cream-200 shadow-soft-sm flex flex-col justify-between h-[360px] animate-pulse">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-14 h-14 rounded-2xl bg-cream-200" />
          <div className="w-20 h-6 rounded-full bg-cream-200" />
        </div>
        <div className="w-3/4 h-5 rounded-lg bg-cream-200 mb-2" />
        <div className="w-1/2 h-4 rounded-lg bg-cream-100 mb-4" />
        <div className="space-y-2">
          <div className="w-full h-3 rounded bg-cream-100" />
          <div className="w-5/6 h-3 rounded bg-cream-100" />
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-cream-100">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <div className="w-16 h-3 rounded bg-cream-200" />
            <div className="w-12 h-3 rounded bg-cream-200" />
          </div>
          <div className="w-full h-2.5 rounded-full bg-cream-200" />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="w-24 h-4 rounded bg-cream-100" />
          <div className="w-24 h-9 rounded-xl bg-cream-300" />
        </div>
      </div>
    </div>
  );
};

export const SkeletonWishGrid: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonWishCard key={i} />
      ))}
    </div>
  );
};

