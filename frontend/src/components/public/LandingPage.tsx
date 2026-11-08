import React from 'react';

interface LandingPageProps {
  onBrowseWishes: () => void;
  onRegister: () => void;
  onExploreFlow: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onBrowseWishes,
  onRegister,
}) => {
  return (
    <div className="space-y-20 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 md:pt-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-cream-200/80 border border-cream-300 text-xs font-semibold text-terracotta-700">
            <span className="w-2 h-2 rounded-full bg-terracotta-500" />
            <span>A Verified, Privacy-First Matching Platform</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-ink-900 tracking-tight leading-[1.08]">
            Real, tangible wishes from <br className="hidden sm:inline" />
            <span className="text-terracotta-600 underline decoration-cream-300 underline-offset-8">
              verified children&apos;s homes.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-ink-600 leading-relaxed font-normal">
            No vague money pools. Verified homes list exact item needs—from school bags to winter coats.
            Donors pledge items, deliver directly, and receive physical item photo confirmation.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={onBrowseWishes}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white font-bold text-sm tracking-wide shadow-soft-lg transition transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-terracotta-600"
            >
              Browse Open Wishes
            </button>
            <button
              onClick={onRegister}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-cream-100 text-ink-800 font-bold text-sm border border-cream-300 shadow-soft transition"
            >
              Register as Donor or Home
            </button>
          </div>

          {/* Trust Guarantees Bar */}
          <div className="pt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
            <div className="p-5 rounded-2xl bg-white border border-cream-200 shadow-soft-sm">
              <div className="w-8 h-8 rounded-lg bg-sage-100 text-sage-700 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-serif text-base font-bold text-ink-900 mb-1">Two-Step Verification</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Every home is physically inspected by a field verifier and approved by an administrator before posting wishes.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-cream-200 shadow-soft-sm">
              <div className="w-8 h-8 rounded-lg bg-terracotta-100 text-terracotta-700 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="font-serif text-base font-bold text-ink-900 mb-1">Item-Only Delivery Proof</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Confirmations require photos of the delivered items only. Strictly zero photographs of children to protect privacy.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-cream-200 shadow-soft-sm">
              <div className="w-8 h-8 rounded-lg bg-cream-200 text-ink-800 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-serif text-base font-bold text-ink-900 mb-1">Append-Only Audit Chain</h3>
              <p className="text-xs text-ink-600 leading-relaxed">
                Every claim, status shift, and delivery is sealed with cryptographic SHA-256 hash chains preventing data tampering.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Flow */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">Transparent Lifecycle</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mt-2">
            How WishWell Connects Homes & Donors
          </h2>
          <p className="text-sm text-ink-600 mt-3">
            A closed-loop platform guaranteeing that every pledged item reaches the children who need it.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="relative p-6 rounded-2xl bg-white border border-cream-200 shadow-soft">
            <div className="text-3xl font-serif font-black text-cream-300 mb-2">01</div>
            <h3 className="font-bold text-ink-900 text-base mb-2">Home Posts Wish</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Verified home directors specify item description, needed quantity, category, and needed-by date.
            </p>
          </div>

          <div className="relative p-6 rounded-2xl bg-white border border-cream-200 shadow-soft">
            <div className="text-3xl font-serif font-black text-cream-300 mb-2">02</div>
            <h3 className="font-bold text-ink-900 text-base mb-2">Donor Claims Items</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Donors pledge full or partial quantities. Database row locks prevent simultaneous over-claiming.
            </p>
          </div>

          <div className="relative p-6 rounded-2xl bg-white border border-cream-200 shadow-soft">
            <div className="text-3xl font-serif font-black text-cream-300 mb-2">03</div>
            <h3 className="font-bold text-ink-900 text-base mb-2">Physical Delivery</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Donor orders or delivers items directly to the verified home address with package tracking.
            </p>
          </div>

          <div className="relative p-6 rounded-2xl bg-white border border-cream-200 shadow-soft">
            <div className="text-3xl font-serif font-black text-cream-300 mb-2">04</div>
            <h3 className="font-bold text-ink-900 text-base mb-2">Photo Proof & Thanks</h3>
            <p className="text-xs text-ink-600 leading-relaxed">
              Home uploads item-only photos (EXIF metadata stripped). Donor receives thank-you note and impact metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Child Privacy Policy Callout */}
      <section id="verification" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-sage-50 border border-sage-200 p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center space-x-2 text-sage-800 text-xs font-bold uppercase tracking-wider">
              <svg className="w-4 h-4 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Our Uncompromising Child Privacy Charter</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900">
              Why you will never see pictures of children on WishWell
            </h3>
            <p className="text-xs sm:text-sm text-ink-700 leading-relaxed">
              Children in welfare institutions deserve dignity, privacy, and protection from digital exploitation.
              Our platform strictly rejects photos of children. All delivery proofs require images of the delivered items,
              books, and equipment in their packages or storage rooms.
            </p>
          </div>
          <div className="shrink-0">
            <button
              onClick={onBrowseWishes}
              className="px-6 py-3 rounded-xl bg-sage-600 hover:bg-sage-700 text-white font-bold text-xs shadow-soft transition"
            >
              See Active Item Needs &rarr;
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

