import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-cream-100 border-t border-cream-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2">
              <span className="font-serif text-2xl font-bold text-ink-900">WishWell</span>
              <span className="text-[10px] bg-sage-200 text-sage-800 font-semibold px-2 py-0.5 rounded-full">
                Privacy-Preserving
              </span>
            </div>
            <p className="text-sm text-ink-600 max-w-md leading-relaxed">
              A transparent wish-matching platform connecting verified children's homes directly with donors.
              Built on 3NF relational data integrity, strict physical verification, and item-only delivery proof.
            </p>
            <div className="flex items-center space-x-2 text-xs text-ink-500 pt-2">
              <span className="inline-block w-2 h-2 rounded-full bg-sage-500"></span>
              <span>Strict Rule: Zero photos of children permitted. Delivery confirmation requires item-only photos.</span>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider mb-3">Verification Stages</h4>
            <ul className="text-xs text-ink-600 space-y-2">
              <li>1. Profile & Registration Upload</li>
              <li>2. Field Verifier Physical Inspection</li>
              <li>3. Administrator Final Approval</li>
              <li>4. Verified Wish Posting Privileges</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-ink-900 uppercase tracking-wider mb-3">Technical Architecture</h4>
            <ul className="text-xs text-ink-600 space-y-2">
              <li>Microsoft SQL Server (T-SQL) Docker Engine</li>
              <li>Row Locks (UPDLOCK, HOLDLOCK) for Race Conditions</li>
              <li>Append-Only Cryptographic Audit Log (SHA-256)</li>
              <li>Private Azurite Blob Storage & SAS URLs</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-cream-200 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-ink-500">
          <p>&copy; 2026 WishWell Platform &bull; University Project Monorepo</p>
          <p className="mt-2 sm:mt-0 font-mono text-[11px]">3NF Normalized &bull; Concurrency Verified &bull; EXIF Stripped</p>
        </div>
      </div>
    </footer>
  );
};

