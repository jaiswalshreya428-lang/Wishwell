import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { OpenWishViewItem } from '../../types';
import { Sparkles, ShieldCheck, ArrowRight, RotateCw } from 'lucide-react';

interface VintageWishingWellProps {
  wishes: OpenWishViewItem[];
  onSelectWish?: (wish: OpenWishViewItem) => void;
  onBrowseWishes: () => void;
  onCoinToss?: () => void;
}

interface RippleBurst {
  id: number;
}

const STORAGE_KEY = 'wishwell_ripples_cast_v1';

/**
 * Interactive Vintage Courtyard Wishing Well:
 * Visitors can toss an antique brass coin / click the spring water to cast concentric ripples
 * across the well pool, awakening a live verified "Wish Echo" scroll from a real home.
 */
export const VintageWishingWell: React.FC<VintageWishingWellProps> = ({
  wishes,
  onSelectWish,
  onBrowseWishes,
  onCoinToss,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [rippleCount, setRippleCount] = useState<number>(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? parseInt(saved, 10) : NaN;
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 1284;
    } catch {
      return 1284;
    }
  });
  const [echoIndex, setEchoIndex] = useState(0);
  const [ripples, setRipples] = useState<RippleBurst[]>([]);
  const [isDroppingCoin, setIsDroppingCoin] = useState(false);
  const nextRippleId = useRef(1);

  const safeWishes = wishes.length > 0 ? wishes : [];
  const activeWish = safeWishes.length > 0 ? safeWishes[echoIndex % safeWishes.length] : null;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(rippleCount));
    } catch {
      // Ignore storage write errors in restricted browsing modes
    }
  }, [rippleCount]);

  const handleTossWishCoin = () => {
    if (isDroppingCoin && !shouldReduceMotion) return;

    const burstId = nextRippleId.current++;
    setIsDroppingCoin(true);
    setRippleCount((c) => c + 1);
    onCoinToss?.();

    if (safeWishes.length > 1) {
      setEchoIndex((prev) => (prev + 1) % safeWishes.length);
    }

    setRipples((prev) => [...prev.slice(-3), { id: burstId }]);

    setTimeout(() => {
      setIsDroppingCoin(false);
    }, shouldReduceMotion ? 100 : 750);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== burstId));
    }, 1700);
  };

  return (
    <div className="relative rounded-4xl bg-gradient-to-b from-[#FAF7F0] via-[#F4EFE2] to-[#ECE5D4] border-2 border-[#D4CAB0] p-5 sm:p-6 shadow-card vintage-double-frame overflow-hidden select-none">
      {/* Archival Corner Brackets */}
      <div aria-hidden="true" className="pointer-events-none absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#C69749]/65 rounded-tl-sm" />
      <div aria-hidden="true" className="pointer-events-none absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#C69749]/65 rounded-tr-sm" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#C69749]/65 rounded-bl-sm" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#C69749]/65 rounded-br-sm" />

      {/* Header Plaque & Interactive Ripple Ledger */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#DED5BE]">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#215B54] shadow-xs" />
          <span className="font-serif text-sm font-bold text-[#192D2A] tracking-tight">
            The Courtyard Wishing Well
          </span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E2EEEA] border border-[#BAD5CD] text-[11px] font-bold text-[#194641] font-feature-tabular"
          title="Interactive ripples cast during your session"
        >
          <Sparkles className="w-3 h-3 text-[#C69749] animate-anime-sparkle" />
          <span>{rippleCount.toLocaleString()} ripples</span>
        </span>
      </div>

      {/* Illustrated Stone Wishing Well Canvas (Click Anywhere on the Well to Cast a Ripple) */}
      <div
        onClick={handleTossWishCoin}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleTossWishCoin();
          }
        }}
        aria-label="Toss a brass wish coin into the courtyard well to inspect another open wish"
        className="relative mt-3 mb-4 rounded-3xl bg-gradient-to-b from-[#DCEAE6] via-[#E5EFE9] to-[#DCE4D5] border border-[#C7D6CE] pt-5 pb-3 px-4 cursor-pointer group overflow-hidden focus-visible:ring-2 focus-visible:ring-[#24635C]"
      >
        {/* Soft Sunbeam Halo Behind Well */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-[#FFF7DC]/70 blur-2xl"
        />

        {/* Animated Brass Wish Coin Drop */}
        {isDroppingCoin && !shouldReduceMotion && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 z-20 animate-coin-drop"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#F7DDA0] via-[#C89238] to-[#8C5B19] border border-[#FFF5D6] shadow-md flex items-center justify-center text-[9px] font-serif font-black text-[#4E3108]">
              W
            </div>
          </div>
        )}

        {/* Expanding Concentric Ripples Over Well Pool */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[154px] -translate-x-1/2 -translate-y-1/2 z-10 w-24 h-8 flex items-center justify-center"
        >
          {ripples.map((r) => (
            <React.Fragment key={r.id}>
              <span className="absolute w-14 h-5 rounded-[100%] border-2 border-[#7CC7BD] animate-well-ripple" />
              <span
                className="absolute w-14 h-5 rounded-[100%] border border-[#DFBF72] animate-well-ripple"
                style={{ animationDelay: '0.22s' }}
              />
            </React.Fragment>
          ))}
        </div>

        {/* Crisp Handcrafted Vintage Well SVG */}
        <svg
          viewBox="0 0 280 215"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full max-w-[270px] mx-auto relative z-10 drop-shadow-sm transition-transform duration-300 group-hover:scale-[1.015]"
        >
          <defs>
            <linearGradient id="vwRoofLeft" x1="56" y1="20" x2="140" y2="82" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#C46046" />
              <stop offset="100%" stopColor="#8E3824" />
            </linearGradient>
            <linearGradient id="vwRoofRight" x1="140" y1="20" x2="224" y2="82" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#B65038" />
              <stop offset="100%" stopColor="#7C2F1E" />
            </linearGradient>
            <linearGradient id="vwWaterPool" x1="88" y1="138" x2="192" y2="152" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3B7B75" />
              <stop offset="50%" stopColor="#7AC4BA" />
              <stop offset="100%" stopColor="#2C655F" />
            </linearGradient>
          </defs>

          {/* Soft Ground Moss Shadow */}
          <ellipse cx="140" cy="196" rx="88" ry="11" fill="#A9BEA8" opacity="0.55" />

          {/* Tiny Archival Stars & Mist Motes */}
          <path d="M44 46L46 51L51 53L46 55L44 60L42 55L37 53L42 51L44 46Z" fill="#DFC37C" className="animate-anime-sparkle" />
          <path d="M236 38L237.5 42L241.5 43.5L237.5 45L236 49L234.5 45L230.5 43.5L234.5 42L236 38Z" fill="#C69749" className="animate-anime-sparkle" />
          <circle cx="62" cy="30" r="2" fill="#8EBAB0" opacity="0.7" />
          <circle cx="215" cy="64" r="1.8" fill="#DFC37C" opacity="0.8" />

          {/* Timber Support Posts */}
          <rect x="86" y="76" width="12" height="68" rx="3" fill="#7D5A3F" stroke="#573D29" strokeWidth="1.5" />
          <rect x="182" y="76" width="12" height="68" rx="3" fill="#7D5A3F" stroke="#573D29" strokeWidth="1.5" />
          {/* Timber Grain Lines */}
          <line x1="92" y1="84" x2="92" y2="136" stroke="#A67F5E" strokeWidth="1" opacity="0.5" />
          <line x1="188" y1="84" x2="188" y2="136" stroke="#A67F5E" strokeWidth="1" opacity="0.5" />

          {/* Hanging Brass Lantern on Left Post */}
          <g transform="translate(103, 94)">
            <path d="M-5 0H5" stroke="#573D29" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="4" cy="9" r="9" fill="#F2D078" opacity="0.3" />
            <rect x="1" y="4" width="6" height="9" rx="1.5" fill="#F6DF9D" stroke="#9E6E21" strokeWidth="1.2" />
            <path d="M0 4L4 0.5L8 4H0Z" fill="#8C5B19" />
          </g>

          {/* Horizontal Winch Beam & Iron Handle */}
          <line x1="80" y1="100" x2="206" y2="100" stroke="#573D29" strokeWidth="5" strokeLinecap="round" />
          <line x1="82" y1="100" x2="204" y2="100" stroke="#A67F5E" strokeWidth="2" strokeLinecap="round" />
          {/* Winch Crank */}
          <path d="M206 100H216V113H223" stroke="#6E5847" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="224" cy="113" r="3" fill="#C89238" stroke="#573D29" strokeWidth="1" />

          {/* Hanging Rope & Swinging Brass Bucket */}
          <line x1="140" y1="100" x2="140" y2="122" stroke="#D4CAB0" strokeWidth="2.5" strokeDasharray="3 2" />
          <path d="M132 120C134 114 146 114 148 120" stroke="#8C5B19" strokeWidth="1.6" fill="none" />
          <path d="M131 120H149L147 132H133L131 120Z" fill="#DFBF72" stroke="#8C5B19" strokeWidth="1.4" strokeLinejoin="round" />
          <line x1="132" y1="124" x2="148" y2="124" stroke="#8C5B19" strokeWidth="1" opacity="0.6" />

          {/* Pitched Clay-Shingled Roof */}
          <path d="M44 82L140 20L140 82H44Z" fill="url(#vwRoofLeft)" stroke="#622518" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M140 20L236 82H140V20Z" fill="url(#vwRoofRight)" stroke="#622518" strokeWidth="1.8" strokeLinejoin="round" />
          {/* Shingle Scallop Rows */}
          <path d="M74 62H206" stroke="#FAF2DE" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="6 4" />
          <path d="M98 46H182" stroke="#FAF2DE" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="6 4" />
          {/* Roof Fascia Beam & Brass Finial */}
          <path d="M38 82H242" stroke="#573D29" strokeWidth="5.5" strokeLinecap="round" />
          <path d="M40 82H240" stroke="#DFBF72" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="140" cy="18" r="5" fill="#DFBF72" stroke="#7D4F12" strokeWidth="1.4" />

          {/* Spring Water Basin Inside Well Rim */}
          <ellipse cx="140" cy="144" rx="60" ry="12" fill="url(#vwWaterPool)" />
          <path d="M104 143C118 139 162 139 176 143" stroke="#E8F6F3" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
          <path d="M116 147C128 144.5 152 144.5 164 147" stroke="#DFBF72" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />

          {/* Stone Well Curb Rim (Top Oval Ring) */}
          <path
            d="M72 144C72 135 102 128 140 128C178 128 208 135 208 144V153C208 162 178 169 140 169C102 169 72 162 72 153V144Z"
            fill="none"
            stroke="#8D826E"
            strokeWidth="1.6"
          />
          {/* Front Rim Apron */}
          <path
            d="M72 144C72 153 102 160 140 160C178 160 208 153 208 144V154C208 163 178 170 140 170C102 170 72 163 72 154V144Z"
            fill="#EFE8D6"
            stroke="#9B907A"
            strokeWidth="1.6"
          />

          {/* Weathered Limestone Well Wall Drum */}
          <path
            d="M80 156V187C80 194 106 200 140 200C174 200 200 194 200 187V156C184 162 163 165 140 165C117 165 96 162 80 156Z"
            fill="#E3DAC4"
            stroke="#9B907A"
            strokeWidth="1.6"
          />
          {/* Stone Masonry Courses */}
          <path d="M81 174C98 179 118 182 140 182C162 182 182 179 199 174" stroke="#B0A48C" strokeWidth="1.3" />
          <path d="M81 187C98 192 118 195 140 195C162 195 182 192 199 187" stroke="#B0A48C" strokeWidth="1.2" opacity="0.65" />
          <line x1="112" y1="162" x2="112" y2="179" stroke="#B0A48C" strokeWidth="1.3" />
          <line x1="168" y1="162" x2="168" y2="179" stroke="#B0A48C" strokeWidth="1.3" />
          <line x1="94" y1="178" x2="94" y2="191" stroke="#B0A48C" strokeWidth="1.3" />
          <line x1="140" y1="182" x2="140" y2="195" stroke="#B0A48C" strokeWidth="1.3" />
          <line x1="186" y1="178" x2="186" y2="191" stroke="#B0A48C" strokeWidth="1.3" />

          {/* Hanging Moss & Meadow Tufts Around Base */}
          <path d="M74 192C78 185 88 184 94 191C99 187 105 189 109 196H74V192Z" fill="#6F9478" stroke="#4D6E55" strokeWidth="1" />
          <path d="M174 196C178 189 186 186 193 190C198 186 205 188 208 195H174V196Z" fill="#6F9478" stroke="#4D6E55" strokeWidth="1" />
          {/* Climbing Ivy Leaf Accent on Right Rim */}
          <path d="M189 156C195 159 198 164 194 169C190 165 188 160 189 156Z" fill="#5D8768" />
        </svg>

        {/* Subtle Prompt Under Well Pool */}
        <div className="mt-1 flex items-center justify-center gap-2 text-[11px] font-semibold text-[#215B54]">
          <RotateCw className={`w-3 h-3 ${isDroppingCoin ? 'animate-spin' : ''}`} />
          <span>Click well or toss coin to ripple &amp; send a gift below</span>
        </div>
      </div>

      {/* Revealed Vintage Scroll Card ("Well Echo") */}
      <AnimatePresence mode="wait">
        {activeWish ? (
          <motion.div
            key={activeWish.wish_id}
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl bg-[#FFFDF8] border border-dashed border-[#CBBF9F] p-4 shadow-soft-sm space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#194641] bg-[#DCE9E5] px-2.5 py-0.5 rounded-full border border-[#BAD5CD]">
                <ShieldCheck className="w-3 h-3" />
                Verified Well Echo
              </span>
              <span className="text-[11px] font-bold text-[#8D3628] font-feature-tabular">
                {activeWish.qty_remaining} needed
              </span>
            </div>

            <div>
              <h4 className="font-serif text-sm sm:text-base font-bold text-[#192D2A] line-clamp-1">
                {activeWish.wish_title}
              </h4>
              <p className="text-[11px] text-[#4F615C] mt-0.5 truncate">
                {activeWish.institution_name} &bull; {activeWish.institution_city}, {activeWish.institution_state}
              </p>
            </div>

            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleTossWishCoin}
                className="px-3 py-2 rounded-xl bg-[#F3EFE2] hover:bg-[#E7DEC9] text-[#192D2A] text-xs font-bold border border-[#CBBF9F] transition active:scale-95 flex items-center gap-1.5"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-[#F2D078] to-[#C69749] border border-[#815D1E]" />
                <span>Toss Wish Coin</span>
              </button>

              <button
                type="button"
                onClick={() => (onSelectWish ? onSelectWish(activeWish) : onBrowseWishes())}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#215B54] to-[#194641] hover:brightness-110 text-[#FAF7F0] text-xs font-bold shadow-xs transition active:scale-95 flex items-center gap-1"
              >
                <span>Answer Echo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <div className="rounded-2xl bg-[#FFFDF8] border border-dashed border-[#CBBF9F] p-4 text-center space-y-2">
            <p className="text-xs text-[#53645F]">Every coin tossed ripples into verified item support.</p>
            <button
              type="button"
              onClick={handleTossWishCoin}
              className="px-4 py-2 rounded-xl bg-[#215B54] text-[#FAF7F0] text-xs font-bold"
            >
              Toss a Wish Coin
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

