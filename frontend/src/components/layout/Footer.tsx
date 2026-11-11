import React from 'react';
import { ShieldCheck, Lock, EyeOff, Sparkles } from 'lucide-react';
import { WishWellLogo } from './WishWellLogo';

/**
 * Vintage Courtyard Wishing Well Footer:
 * Deep Mossy Well-Slate background (#172523) with heirloom brass accents & crisp vellum type,
 * featuring the vintage Wishing Well emblem and core privacy guarantees.
 */
export const Footer: React.FC = () => {
  return (
    <footer
      style={{ backgroundColor: '#172523' }}
      className="bg-[#172523] bg-gradient-to-b from-[#1B2B29] to-[#101B19] text-[#FAF6EC] border-t border-[#2D4541] mt-auto relative overflow-hidden"
    >
      {/* Subtle Concentric Water-Ripple Motif in Footer Corner */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -bottom-24 w-96 h-96 rounded-full border border-[#5D9E93]/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -bottom-12 w-64 h-64 rounded-full border border-[#DFBF72]/10"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        {/* Top Trust & Privacy Banner */}
        <div className="mb-14 p-6 sm:p-7 rounded-3xl bg-[#203330]/95 border border-[#35524D] shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#24635C]/30 text-[#9DD4CC] border border-[#5D9E93]/40 flex items-center justify-center shrink-0 shadow-sm">
              <EyeOff className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif text-lg font-bold text-[#FBF8F0]">Our Privacy Promise</h4>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#E9C97B] bg-[#C89238]/20 px-2 py-0.5 rounded-full border border-[#C89238]/35">
                  Strict Invariant
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#CDD9D5] mt-0.5 leading-relaxed">
                We strictly protect the safety and dignity of minors: <strong className="text-[#FAF6EC] font-semibold underline decoration-[#DFBF72]/60 decoration-2">We never show photos of children.</strong> Proof of delivery is confirmed with physical items only.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#9DD4CC] bg-[#24635C]/30 px-4 py-2 rounded-full border border-[#5D9E93]/40 shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#8EC0B6]" />
            <span>Document-Verified Homes Only</span>
          </div>
        </div>

        {/* 4-Column Informational Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-3.5">
            <WishWellLogo variant="full" dark size={38} />
            <p className="text-xs sm:text-sm text-[#B3C2BC] max-w-md leading-relaxed">
              A transparent, closed-loop wish-matching platform connecting verified children&apos;s homes directly with donors.
              Built on 3NF relational data integrity, document-based verification, and item-only delivery proof.
            </p>
            <div className="flex items-center space-x-2 text-xs text-[#B3C2BC] pt-1">
              <span className="w-2 h-2 rounded-full bg-[#CA765D]" />
              <span>Direct item delivery with cryptographic audit chain protection.</span>
            </div>
          </div>

          {/* Verification Process */}
          <div>
            <h4 className="text-xs font-bold text-[#DFBF72] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verification Stages</span>
            </h4>
            <ul className="text-xs text-[#B3C2BC] space-y-2.5">
              <li className="hover:text-[#FAF6EC] transition">1. Document &amp; Registration Upload</li>
              <li className="hover:text-[#FAF6EC] transition">2. Verifier Credential Evaluation</li>
              <li className="hover:text-[#FAF6EC] transition">3. Administrator Final Approval</li>
              <li className="hover:text-[#FAF6EC] transition">4. Verified Wish Posting Privileges</li>
            </ul>
          </div>

          {/* Safeguards */}
          <div>
            <h4 className="text-xs font-bold text-[#DFBF72] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Technical Safeguards</span>
            </h4>
            <ul className="text-xs text-[#B3C2BC] space-y-2.5">
              <li className="flex items-center gap-1.5 hover:text-[#FAF6EC] transition">
                <span className="w-1.5 h-1.5 rounded-full bg-[#CA765D]" />
                ACID Concurrency Row Locks
              </li>
              <li className="flex items-center gap-1.5 hover:text-[#FAF6EC] transition">
                <span className="w-1.5 h-1.5 rounded-full bg-[#5D9E93]" />
                SHA-256 Tamper-Evident Ledger
              </li>
              <li className="flex items-center gap-1.5 hover:text-[#FAF6EC] transition">
                <span className="w-1.5 h-1.5 rounded-full bg-[#DFBF72]" />
                Client-Side EXIF / GPS Stripping
              </li>
              <li className="flex items-center gap-1.5 hover:text-[#FAF6EC] transition">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A996BA]" />
                Role-Based Access Control (RBAC)
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Guarantee */}
        <div className="pt-8 border-t border-[#2A3F3B] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#899C95]">
          <p>&copy; {new Date().getFullYear()} WishWell. Open source charitable matching platform.</p>
          <div className="flex items-center space-x-6 text-xs text-[#B3C2BC]">
            <span>WCAG AA Compliant</span>
            <span>Zero Child Photographs</span>
            <span className="text-[#DFBF72] font-medium">Vintage Charter Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
