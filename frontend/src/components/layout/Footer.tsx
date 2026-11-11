import React from 'react';
import { ShieldCheck, Lock, EyeOff, Sparkles } from 'lucide-react';
import { WishWellLogo } from './WishWellLogo';

/**
 * Modern Clean Warm Footer:
 * Warm Charcoal background (#181520) with clean typography,
 * featuring the new Wish Beacon emblem and core privacy guarantees.
 */
export const Footer: React.FC = () => {
  return (
    <footer
      style={{ backgroundColor: '#181520' }}
      className="bg-[#181520] bg-gradient-to-b from-[#1E1B28] to-[#14121B] text-white border-t border-[#2E283C] mt-auto relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative z-10">
        {/* Top Trust & Privacy Banner */}
        <div className="mb-14 p-6 sm:p-7 rounded-3xl bg-[#231E2E]/90 border border-[#352D45] shadow-sm flex flex-col md:flex-row items-center justify-between gap-5 backdrop-blur-sm">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1F8A7A]/20 text-[#6CE0CE] border border-[#1F8A7A]/40 flex items-center justify-center shrink-0 shadow-sm">
              <EyeOff className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-serif text-lg font-bold text-[#FFFDF9]">Our Privacy Promise</h4>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#F6B93B] bg-[#F6B93B]/15 px-2 py-0.5 rounded-full border border-[#F6B93B]/30">
                  Strict Invariant
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#D1CADB] mt-0.5 leading-relaxed">
                We strictly protect the safety and dignity of minors: <strong className="text-white font-semibold underline decoration-[#F6B93B]/50 decoration-2">We never show photos of children.</strong> Proof of delivery is confirmed with physical items only.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6CE0CE] bg-[#1F8A7A]/20 px-4 py-2 rounded-full border border-[#1F8A7A]/40 shrink-0">
            <ShieldCheck className="w-4 h-4 text-[#1F8A7A]" />
            <span>Document-Verified Homes Only</span>
          </div>
        </div>

        {/* 4-Column Informational Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Brand & Mission */}
          <div className="md:col-span-2 space-y-3.5">
            <div className="flex items-center space-x-3">
              <WishWellLogo size={32} />
              <span className="text-[10px] bg-[#1F8A7A]/30 text-[#6CE0CE] font-bold px-2.5 py-0.5 rounded-full border border-[#1F8A7A]/40">
                Verified Platform
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#A8A1B5] max-w-md leading-relaxed">
              A transparent, closed-loop wish-matching platform connecting verified children&apos;s homes directly with donors.
              Built on 3NF relational data integrity, document-based verification, and item-only delivery proof.
            </p>
            <div className="flex items-center space-x-2 text-xs text-[#A8A1B5] pt-1">
              <span className="w-2 h-2 rounded-full bg-[#E4572E]" />
              <span>Direct item delivery with cryptographic audit chain protection.</span>
            </div>
          </div>

          {/* Verification Process */}
          <div>
            <h4 className="text-xs font-bold text-[#F6B93B] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verification Stages</span>
            </h4>
            <ul className="text-xs text-[#A8A1B5] space-y-2.5">
              <li className="hover:text-white transition">1. Document & Registration Upload</li>
              <li className="hover:text-white transition">2. Verifier Credential Evaluation</li>
              <li className="hover:text-white transition">3. Administrator Final Approval</li>
              <li className="hover:text-white transition">4. Verified Wish Posting Privileges</li>
            </ul>
          </div>

          {/* Safeguards */}
          <div>
            <h4 className="text-xs font-bold text-[#F6B93B] uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Technical Safeguards</span>
            </h4>
            <ul className="text-xs text-[#A8A1B5] space-y-2.5">
              <li className="flex items-center gap-1.5 hover:text-white transition">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E4572E]" />
                ACID Concurrency Row Locks
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A7A]" />
                SHA-256 Tamper-Evident Ledger
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F6B93B]" />
                Client-Side EXIF / GPS Stripping
              </li>
              <li className="flex items-center gap-1.5 hover:text-white transition">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8A5FB8]" />
                Role-Based Access Control (RBAC)
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright & Guarantee */}
        <div className="pt-8 border-t border-[#2E283C] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7E778C]">
          <p>&copy; {new Date().getFullYear()} WishWell. Open source charitable matching platform.</p>
          <div className="flex items-center space-x-6 text-xs text-[#A8A1B5]">
            <span>WCAG AA Compliant</span>
            <span>Zero Child Photographs</span>
            <span className="text-[#F6B93B] font-medium">Verified Community Edition</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
