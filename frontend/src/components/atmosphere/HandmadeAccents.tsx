import React from 'react';

/**
 * Washi Tape Corner Strip:
 * Gives cards a tactile, scrapbook / pinned paper note feeling.
 */
export const WashiTape: React.FC<{
  position?: 'top-left' | 'top-right' | 'top-center';
  color?: 'terracotta' | 'marigold' | 'sage' | 'plum' | 'coral' | 'teal' | 'sky';
  className?: string;
}> = ({ position = 'top-right', color = 'marigold', className = '' }) => {
  const positionClasses = {
    'top-left': '-top-3 -left-3 -rotate-12',
    'top-right': '-top-3 -right-3 rotate-12',
    'top-center': '-top-3 left-1/2 -translate-x-1/2 rotate-1',
  }[position];

  const colorStyles: Record<string, string> = {
    terracotta: 'bg-[#ECC4B5]/90 border-[#D49E8B] text-[#7E3120]',
    coral: 'bg-[#ECC4B5]/90 border-[#D49E8B] text-[#7E3120]',
    marigold: 'bg-[#ECD8A3]/90 border-[#DFBF72] text-[#6E4A10]',
    sage: 'bg-[#C0D4C2]/90 border-[#9BB99E] text-[#314B37]',
    teal: 'bg-[#BADAD3]/90 border-[#8EC0B6] text-[#153B37]',
    plum: 'bg-[#E2D9EA]/90 border-[#C9BBD6] text-[#42354E]',
    sky: 'bg-[#BDD6DA]/90 border-[#93BAC1] text-[#2A4C53]',
  };

  const style = colorStyles[color] || colorStyles.marigold;

  return (
    <div
      aria-hidden="true"
      className={`absolute z-10 pointer-events-none select-none w-14 h-5 shadow-sm border-t border-b border-dashed ${positionClasses} ${style} ${className}`}
      style={{
        clipPath: 'polygon(0% 0%, 95% 0%, 100% 50%, 95% 100%, 0% 100%, 5% 50%)',
      }}
    />
  );
};

/**
 * Paper Tag Pin / String Loop:
 * A subtle brass pin and eyelet at the top of paper tag cards.
 */
export const PaperTagPin: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none flex flex-col items-center ${className}`}
    >
      {/* Brass Pin Head */}
      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-marigold-300 via-marigold-500 to-terracotta-700 shadow-sm border border-marigold-600 flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-cream-50 opacity-80" />
      </div>
      {/* Little hole punch eyelet */}
      <div className="w-2.5 h-2.5 -mt-0.5 rounded-full bg-cream-300 border border-cream-400" />
    </div>
  );
};

/**
 * Hand-Drawn Doodle Arrow:
 * Charming friendly SVG doodle indicating a journey or CTA direction.
 */
export const DoodleArrow: React.FC<{ className?: string; flipped?: boolean }> = ({
  className = '',
  flipped = false,
}) => {
  return (
    <svg
      viewBox="0 0 80 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-12 h-6 ${flipped ? '-scale-x-100' : ''} ${className}`}
      aria-hidden="true"
    >
      <path
        d="M6 24C24 10 50 12 72 20"
        stroke="#C4552F"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M60 12L74 21L64 30"
        stroke="#C4552F"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Hand-Drawn Doodle Star:
 * Playful sparkle doodle.
 */
export const DoodleStar: React.FC<{ className?: string; size?: number }> = ({
  className = '',
  size = 20,
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: size, height: size }}
      className={`text-marigold-500 ${className}`}
      aria-hidden="true"
    >
      <path
        d="M12 2L13.8 8.6L20.4 10.4L13.8 12.2L12 18.8L10.2 12.2L3.6 10.4L10.2 8.6L12 2Z"
        fill="#F2B441"
        stroke="#C37A17"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

/**
 * Gentle Wavy / Torn Paper Section Divider:
 * Replaces sharp mechanical lines with a warm, organic torn-paper deckle edge.
 */
export const TornPaperDivider: React.FC<{
  position?: 'top' | 'bottom';
  fillColor?: string;
  className?: string;
}> = ({ position = 'bottom', fillColor = '#EFF5F1', className = '' }) => {
  const isTop = position === 'top';

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none w-full overflow-hidden leading-none z-10 ${className}`}
      style={{
        transform: isTop ? 'rotate(180deg)' : 'none',
      }}
    >
      <svg
        viewBox="0 0 1200 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-4 sm:h-6 object-cover"
        preserveAspectRatio="none"
      >
        <path
          d="M0 0C75 14 150 4 225 16C300 6 375 18 450 8C525 20 600 6 675 16C750 4 825 18 900 8C975 16 1050 6 1125 18C1165 10 1190 14 1200 12V24H0V0Z"
          fill={fillColor}
        />
      </svg>
    </div>
  );
};

/**
 * Vintage Wax Seal Stamp:
 * Embossed antique wax seal with W crest for verified parchment cards.
 */
export const VintageWaxSeal: React.FC<{
  className?: string;
  label?: string;
}> = ({ className = '', label = 'VERIFIED WELL' }) => (
  <div
    aria-label={label}
    title={label}
    className={`inline-flex items-center justify-center select-none pointer-events-none ${className}`}
  >
    <svg viewBox="0 0 48 48" className="w-10 h-10 drop-shadow-sm" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M24 3L28.2 6.1L33.3 5.2L35.7 9.8L40.6 11.1L40.8 16.3L44.6 19.8L42.5 24.5L44.4 29.4L40.3 32.6L39.9 37.8L34.9 38.8L32.3 43.3L27.2 42.1L24 45L20.8 42.1L15.7 43.3L13.1 38.8L8.1 37.8L7.7 32.6L3.6 29.4L5.5 24.5L3.4 19.8L7.2 16.3L7.4 11.1L12.3 9.8L14.7 5.2L19.8 6.1L24 3Z"
        fill="#8D3628"
        stroke="#722B1F"
        strokeWidth="1.2"
      />
      <circle cx="24" cy="24" r="13.5" fill="#A84637" stroke="#DFC37C" strokeWidth="1" strokeOpacity="0.6" />
      <circle cx="24" cy="24" r="10.5" fill="none" stroke="#FAF2DE" strokeWidth="0.7" strokeOpacity="0.45" strokeDasharray="2 1.5" />
      <path d="M18.5 19L21 29L24 22.5L27 29L29.5 19" stroke="#FAF2DE" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

