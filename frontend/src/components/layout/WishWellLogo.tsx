import React from 'react';

interface WishWellLogoProps {
  className?: string;
  size?: number;
  variant?: 'mark' | 'full';
  dark?: boolean;
}

/**
 * Modern, distinctive WishWell Brand Logo:
 * Concept: "The Wish Beacon" — An interlocking geometric wish-star and verified protective well.
 * Replaces generic clip-art heart with a sleek, tech-forward, premium charitable emblem.
 */
export const WishWellLogo: React.FC<WishWellLogoProps> = ({
  className = '',
  size = 40,
  variant = 'mark',
  dark = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Sleek Emblem Squircle */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-2xl bg-gradient-to-br from-[#E4572E] via-[#EA6D35] to-[#F6B93B] p-0.5 shadow-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
      >
        {/* Inner subtle glow / glass reflection */}
        <div className="w-full h-full rounded-[14px] bg-gradient-to-b from-white/20 via-transparent to-black/10 flex items-center justify-center relative overflow-hidden">
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/5 h-3/5 drop-shadow-sm"
          >
            {/* Protective Verified Arcs (Wishing Well & Direct Handshake) */}
            <path
              d="M7 19C7 23.9706 11.0294 28 16 28C20.9706 28 25 23.9706 25 19"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeOpacity="0.85"
            />
            {/* Top Arcs forming upper well rim */}
            <path
              d="M10 13C11.5 11 13.5 10 16 10C18.5 10 20.5 11 22 13"
              stroke="white"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeOpacity="0.7"
            />
            {/* The Radiant Wish Star (4-Point Diamond Spark) */}
            <path
              d="M16 4L17.8 11.2L25 13L17.8 14.8L16 22L14.2 14.8L7 13L14.2 11.2L16 4Z"
              fill="white"
            />
            {/* Core Sparkle Center */}
            <circle cx="16" cy="13" r="1.5" fill="#FFE599" />
          </svg>

          {/* Micro light glint */}
          <div className="absolute top-0.5 right-1 w-2 h-2 rounded-full bg-white/40 blur-[1px]" />
        </div>
      </div>

      {variant === 'full' && (
        <div className="flex flex-col text-left">
          <div className="flex items-center space-x-2">
            <span
              className={`font-serif text-2xl font-bold tracking-tight ${
                dark ? 'text-white' : 'text-[#1E1A2B]'
              }`}
            >
              WishWell
            </span>
            <span className="bg-[#1F8A7A]/15 text-[#166C60] text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border border-[#1F8A7A]/30">
              Verified
            </span>
          </div>
          <p
            className={`text-[11px] font-medium hidden sm:block ${
              dark ? 'text-[#AEA6BF]' : 'text-[#6A6378]'
            }`}
          >
            Item-Only Matching for Children&apos;s Homes
          </p>
        </div>
      )}
    </div>
  );
};
