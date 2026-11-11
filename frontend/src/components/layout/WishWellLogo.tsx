import React from 'react';

interface WishWellLogoProps {
  className?: string;
  size?: number;
  variant?: 'mark' | 'full';
  dark?: boolean;
}

/**
 * Vintage Wishing Well Brand Logo:
 * A crafted stone wishing well with shingled clay roof, timber crossbar & rope bucket,
 * hanging brass wish lantern, mossy base, and shimmering concentric water ripples.
 */
export const WishWellLogo: React.FC<WishWellLogoProps> = ({
  className = '',
  size = 40,
  variant = 'mark',
  dark = false,
}) => {
  const gradSuffix = `${variant}-${dark ? 'dark' : 'light'}`;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Vintage Wishing Well Medallion */}
      <div
        style={{ width: size, height: size }}
        className="relative rounded-2xl bg-gradient-to-br from-[#DFBF72] via-[#C89238] to-[#8C5B19] p-[2px] shadow-md flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
      >
        <div
          className={`w-full h-full rounded-[14px] flex items-center justify-center relative overflow-hidden ${
            dark
              ? 'bg-gradient-to-b from-[#173633] via-[#1E4743] to-[#132927]'
              : 'bg-gradient-to-b from-[#1E4A47] via-[#265D58] to-[#183B38]'
          }`}
        >
          {/* Subtle inner brass heirloom ring */}
          <div className="pointer-events-none absolute inset-[2px] rounded-[12px] border border-[#F2D58F]/25" />

          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-[84%] h-[84%] drop-shadow-sm"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={`roofGrad-${gradSuffix}`} x1="8" y1="5" x2="32" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#CE6349" />
                <stop offset="100%" stopColor="#8E3824" />
              </linearGradient>
              <linearGradient id={`waterGrad-${gradSuffix}`} x1="11" y1="25" x2="29" y2="30" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#8BD1C7" />
                <stop offset="50%" stopColor="#5AA9A0" />
                <stop offset="100%" stopColor="#8BD1C7" />
              </linearGradient>
            </defs>

            {/* Distant twinkling wish star above roof */}
            <path
              d="M31 6.5L31.7 8.4L33.6 9.1L31.7 9.8L31 11.7L30.3 9.8L28.4 9.1L30.3 8.4L31 6.5Z"
              fill="#F7DDA0"
            />
            <circle cx="9.5" cy="8.5" r="1" fill="#F2D078" opacity="0.85" />

            {/* Pitched Shingled Roof */}
            <path
              d="M7 15.5L20 5.5L33 15.5H7Z"
              fill={`url(#roofGrad-${gradSuffix})`}
              stroke="#F7EAD0"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Roof eave trim & shingle rib */}
            <path d="M5.5 16H34.5" stroke="#DFBF72" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M13 11.5H27" stroke="#6E2818" strokeWidth="0.9" strokeOpacity="0.45" />
            <circle cx="20" cy="5.5" r="1.4" fill="#F2D078" />

            {/* Timber Support Posts */}
            <rect x="11.5" y="16" width="2.2" height="10" rx="0.8" fill="#D4B27A" />
            <rect x="26.3" y="16" width="2.2" height="10" rx="0.8" fill="#D4B27A" />

            {/* Horizontal Axle / Crank Bar */}
            <line x1="10.5" y1="19.2" x2="30.5" y2="19.2" stroke="#F4E5C2" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M30.5 19.2H32V21.5" stroke="#DFBF72" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Rope & Brass Wishing Bucket */}
            <line x1="20" y1="19.2" x2="20" y2="23" stroke="#F7EAD0" strokeWidth="1.1" strokeDasharray="1.5 0.8" />
            <path d="M18 22.8H22L21.5 25.6H18.5L18 22.8Z" fill="#DFBF72" stroke="#8C5B19" strokeWidth="0.6" />
            {/* Falling brass wish drop / glint */}
            <circle cx="20" cy="27.2" r="0.9" fill="#FFF2C6" />

            {/* Shimmering Water Inside Rim */}
            <ellipse cx="20" cy="27.2" rx="8.8" ry="2.2" fill={`url(#waterGrad-${gradSuffix})`} />
            <path d="M15.2 27.2C17.2 26.5 22.8 26.5 24.8 27.2" stroke="#FFFDF5" strokeWidth="0.85" strokeLinecap="round" opacity="0.9" />

            {/* Stone Well Rim */}
            <rect
              x="9.5"
              y="26"
              width="21"
              height="3.2"
              rx="1.5"
              fill="#F5EFE2"
              stroke="#B8AD92"
              strokeWidth="0.9"
            />

            {/* Stone Masonry Base Drum */}
            <path
              d="M11 29.2H29V34.2C29 35.1 28.2 35.8 27.2 35.8H12.8C11.8 35.8 11 35.1 11 34.2V29.2Z"
              fill="#E7DEC9"
              stroke="#B8AD92"
              strokeWidth="0.9"
            />
            {/* Stone Brick Joints */}
            <line x1="11.5" y1="32.4" x2="28.5" y2="32.4" stroke="#B8AD92" strokeWidth="0.85" />
            <line x1="16.5" y1="29.4" x2="16.5" y2="32.4" stroke="#B8AD92" strokeWidth="0.85" />
            <line x1="23.5" y1="29.4" x2="23.5" y2="32.4" stroke="#B8AD92" strokeWidth="0.85" />
            <line x1="20" y1="32.4" x2="20" y2="35.6" stroke="#B8AD92" strokeWidth="0.85" />

            {/* Delicate Moss Tufts at Base */}
            <path d="M10 35.5C11.5 34.2 13 34.5 14 35.8H10V35.5Z" fill="#77A384" />
            <path d="M26.5 35.8C27.5 34.5 29 34.2 30.2 35.6V35.8H26.5Z" fill="#77A384" />
          </svg>
        </div>
      </div>

      {variant === 'full' && (
        <div className="flex flex-col text-left">
          <div className="flex items-center space-x-2">
            <span
              className={`font-serif text-2xl font-bold tracking-tight ${
                dark ? 'text-[#FAF6EC]' : 'text-[#1D2927]'
              }`}
            >
              WishWell
            </span>
            <span
              className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                dark
                  ? 'bg-[#24635C]/35 text-[#9DD4CC] border-[#5D9E93]/40'
                  : 'bg-[#24635C]/12 text-[#1B4D48] border-[#24635C]/30'
              }`}
            >
              Verified Well
            </span>
          </div>
          <p
            className={`text-[11px] font-medium hidden sm:block ${
              dark ? 'text-[#B5C6C1]' : 'text-[#53645F]'
            }`}
          >
            Item-Only Wishing Well for Children&apos;s Homes
          </p>
        </div>
      )}
    </div>
  );
};
