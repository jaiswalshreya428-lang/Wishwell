import React from 'react';

interface IllustrationProps {
  className?: string;
  size?: number | string;
}

/**
 * Custom handcrafted inline SVG illustrations designed specifically for WishWell.
 * Uses palette: Cream (#FDF8F1), Terracotta (#C4552F / #9E3F1F), Deep Teal (#1F5C57), Marigold (#F2B441).
 * Strictly zero child photos used anywhere.
 */

// 1. School Bag / Backpack (Education / School Supplies)
export const SchoolBagIllustration: React.FC<IllustrationProps> = ({ className = 'w-16 h-16', size }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="School Bag Illustration"
    role="img"
  >
    {/* Background soft circle */}
    <circle cx="60" cy="60" r="54" fill="#FDF2D5" fillOpacity="0.6" />
    
    {/* Top handle */}
    <path
      d="M48 40V30C48 24.477 52.477 20 58 20H62C67.523 20 72 24.477 72 30V40"
      stroke="#9E3F1F"
      strokeWidth="5"
      strokeLinecap="round"
    />
    
    {/* Main backpack body */}
    <rect x="30" y="38" width="60" height="64" rx="18" fill="#C4552F" />
    
    {/* Top flap */}
    <path
      d="M30 52C30 42 38 38 48 38H72C82 38 90 42 90 52V62C80 66 70 66 60 66C50 66 40 66 30 62V52Z"
      fill="#9E3F1F"
    />
    
    {/* Front pocket */}
    <rect x="40" y="70" width="40" height="24" rx="8" fill="#F2B441" />
    
    {/* Buckle straps */}
    <rect x="45" y="54" width="6" height="20" rx="3" fill="#1F5C57" />
    <rect x="69" y="54" width="6" height="20" rx="3" fill="#1F5C57" />
    
    {/* Golden Buckle Accents */}
    <circle cx="48" cy="68" r="3" fill="#FDF8F1" />
    <circle cx="72" cy="68" r="3" fill="#FDF8F1" />
    
    {/* Pocket zipper */}
    <line x1="46" y1="76" x2="74" y2="76" stroke="#80331A" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

// 2. Books Stack (Education / Study Materials)
export const BooksIllustration: React.FC<IllustrationProps> = ({ className = 'w-16 h-16', size }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Books Illustration"
    role="img"
  >
    {/* Background soft circle */}
    <circle cx="60" cy="60" r="54" fill="#DEEEEC" fillOpacity="0.6" />
    
    {/* Bottom Book (Teal) */}
    <rect x="24" y="80" width="72" height="18" rx="4" fill="#1F5C57" />
    <rect x="30" y="83" width="63" height="12" rx="2" fill="#FDF8F1" />
    <path d="M24 80H30V98H24C21.79 98 20 96.21 20 94V84C20 81.79 21.79 80 24 80Z" fill="#133936" />
    
    {/* Middle Book (Terracotta) */}
    <rect x="28" y="58" width="66" height="18" rx="4" fill="#C4552F" />
    <rect x="34" y="61" width="57" height="12" rx="2" fill="#FDF8F1" />
    <path d="M28 58H34V76H28C25.79 76 24 74.21 24 72V62C24 59.79 25.79 58 28 58Z" fill="#9E3F1F" />
    
    {/* Top Book (Marigold, slightly tilted or smaller) */}
    <rect x="32" y="36" width="58" height="18" rx="4" fill="#F2B441" />
    <rect x="38" y="39" width="49" height="12" rx="2" fill="#FDF8F1" />
    <path d="M32 36H38V54H32C29.79 54 28 52.21 28 50V40C28 37.79 29.79 36 32 36Z" fill="#C37A17" />
    
    {/* Ribbon bookmark hanging from top book */}
    <path d="M72 40V68L77 63L82 68V40H72Z" fill="#C4552F" />
    
    {/* Small star sparkle */}
    <path d="M96 28L98 34L104 36L98 38L96 44L94 38L88 36L94 34L96 28Z" fill="#F2B441" />
  </svg>
);

// 3. Winter Coat / Jacket (Warm Clothing)
export const WinterCoatIllustration: React.FC<IllustrationProps> = ({ className = 'w-16 h-16', size }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Winter Coat Illustration"
    role="img"
  >
    {/* Background soft circle */}
    <circle cx="60" cy="60" r="54" fill="#F9E7DF" fillOpacity="0.7" />
    
    {/* Hood */}
    <path
      d="M38 34C38 21.85 47.85 18 60 18C72.15 18 82 21.85 82 34V42H38V34Z"
      fill="#1F5C57"
    />
    <path
      d="M44 34C44 26 51.16 23 60 23C68.84 23 76 26 76 34V39H44V34Z"
      fill="#DEEEEC"
    />
    
    {/* Coat Body */}
    <path
      d="M32 40L20 74L34 78L40 56V98H80V56L86 78L100 74L88 40H32Z"
      fill="#C4552F"
    />
    
    {/* Center Zipper Line */}
    <line x1="60" y1="40" x2="60" y2="98" stroke="#9E3F1F" strokeWidth="4" />
    
    {/* Marigold Toggle Buttons */}
    <circle cx="53" cy="52" r="3.5" fill="#F2B441" />
    <circle cx="53" cy="66" r="3.5" fill="#F2B441" />
    <circle cx="53" cy="80" r="3.5" fill="#F2B441" />
    
    {/* Soft Pockets */}
    <rect x="42" y="76" width="12" height="14" rx="4" fill="#9E3F1F" />
    <rect x="66" y="76" width="12" height="14" rx="4" fill="#9E3F1F" />
    
    {/* Snowflake badge */}
    <path d="M60 48L60 54M57 51L63 51" stroke="#FDF8F1" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// 4. Birthday Cake / Celebration Gift
export const BirthdayCakeIllustration: React.FC<IllustrationProps> = ({ className = 'w-16 h-16', size }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Birthday Cake Illustration"
    role="img"
  >
    {/* Background soft circle */}
    <circle cx="60" cy="60" r="54" fill="#FEF9EE" />
    
    {/* Plate */}
    <ellipse cx="60" cy="98" rx="46" ry="8" fill="#EADCCB" />
    <ellipse cx="60" cy="96" rx="42" ry="6" fill="#FDF8F1" />
    
    {/* Bottom Cake Tier */}
    <rect x="26" y="68" width="68" height="26" rx="8" fill="#C4552F" />
    {/* Frosting Drips */}
    <path
      d="M26 72C29 76 34 76 38 72C42 76 47 76 51 72C55 76 60 76 64 72C68 76 73 76 77 72C81 76 86 76 94 72V68H26V72Z"
      fill="#FDF8F1"
    />
    
    {/* Top Tier */}
    <rect x="36" y="44" width="48" height="24" rx="6" fill="#1F5C57" />
    <path
      d="M36 48C39 52 44 52 48 48C52 52 57 52 61 48C65 52 70 52 74 48C78 52 81 52 84 48V44H36V48Z"
      fill="#FDF8F1"
    />
    
    {/* Candles */}
    <rect x="46" y="28" width="4" height="16" rx="2" fill="#F2B441" />
    <rect x="58" y="24" width="4" height="20" rx="2" fill="#F2B441" />
    <rect x="70" y="28" width="4" height="16" rx="2" fill="#F2B441" />
    
    {/* Candle Flames */}
    <path d="M48 20C48 17 49 15 48 14C47 15 46 17 46 20C46 21.5 47 22.5 48 22.5C49 22.5 50 21.5 48 20Z" fill="#C4552F" />
    <path d="M60 16C60 13 61 11 60 10C59 11 58 13 58 16C58 17.5 59 18.5 60 18.5C61 18.5 62 17.5 60 16Z" fill="#C4552F" />
    <path d="M72 20C72 17 73 15 72 14C71 15 70 17 70 20C70 21.5 71 22.5 72 22.5C73 22.5 74 21.5 72 20Z" fill="#C4552F" />
  </svg>
);

// 5. Lunchbox / Nutritious Food & Dining
export const LunchboxIllustration: React.FC<IllustrationProps> = ({ className = 'w-16 h-16', size }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Lunchbox Illustration"
    role="img"
  >
    {/* Background soft circle */}
    <circle cx="60" cy="60" r="54" fill="#FDF2D5" fillOpacity="0.5" />
    
    {/* Handle */}
    <path
      d="M48 38V28C48 24.68 50.68 22 54 22H66C69.32 22 72 24.68 72 28V38"
      stroke="#184945"
      strokeWidth="5"
      strokeLinecap="round"
    />
    
    {/* Lunchbox Body */}
    <rect x="24" y="38" width="72" height="58" rx="14" fill="#1F5C57" />
    
    {/* Top Lid Division */}
    <rect x="20" y="38" width="80" height="14" rx="7" fill="#2E7972" />
    
    {/* Latches */}
    <rect x="36" y="48" width="10" height="10" rx="3" fill="#F2B441" />
    <rect x="74" y="48" width="10" height="10" rx="3" fill="#F2B441" />
    
    {/* Fresh Apple Motif */}
    <circle cx="56" cy="74" r="10" fill="#C4552F" />
    <circle cx="64" cy="74" r="10" fill="#C4552F" />
    <path d="M60 64C60 61 62 59 64 58" stroke="#133936" strokeWidth="2.5" strokeLinecap="round" />
    <path d="M64 59C67 59 69 61 68 63C66 63 65 61 64 59Z" fill="#2E7972" />
  </svg>
);

// 6. Shoes / Sneakers (Footwear & Sports)
export const ShoesIllustration: React.FC<IllustrationProps> = ({ className = 'w-16 h-16', size }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Shoes Illustration"
    role="img"
  >
    {/* Background soft circle */}
    <circle cx="60" cy="60" r="54" fill="#F6ECE1" />
    
    {/* Sneaker Body */}
    <path
      d="M22 74C22 62 30 52 42 52L64 52L82 62C92 67 98 72 98 84V88H22V74Z"
      fill="#C4552F"
    />
    
    {/* Ankle Collar */}
    <path d="M36 52V42C36 38.68 38.68 36 42 36H56V52H36Z" fill="#9E3F1F" />
    
    {/* Rubber Sole */}
    <rect x="18" y="86" width="84" height="12" rx="6" fill="#FDF8F1" />
    <path d="M20 92H100" stroke="#EADCCB" strokeWidth="2" strokeLinecap="round" />
    
    {/* Toe Cap */}
    <path d="M82 62C88 65 96 72 98 84H80L82 62Z" fill="#FDF8F1" />
    
    {/* Laces */}
    <line x1="52" y1="50" x2="62" y2="58" stroke="#F2B441" strokeWidth="3" strokeLinecap="round" />
    <line x1="56" y1="58" x2="68" y2="66" stroke="#F2B441" strokeWidth="3" strokeLinecap="round" />
    <line x1="62" y1="66" x2="74" y2="74" stroke="#F2B441" strokeWidth="3" strokeLinecap="round" />
    
    {/* Dynamic Swoosh / Side Detail */}
    <path
      d="M32 76C44 76 60 70 72 64"
      stroke="#DEEEEC"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

// 7. Home Shape (Verified Children's Home)
export const HomeIllustration: React.FC<IllustrationProps> = ({ className = 'w-16 h-16', size }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Home Illustration"
    role="img"
  >
    {/* Background soft circle */}
    <circle cx="60" cy="60" r="54" fill="#DEEEEC" fillOpacity="0.7" />
    
    {/* Chimney */}
    <rect x="74" y="24" width="10" height="22" rx="2" fill="#9E3F1F" />
    
    {/* Smoke Puffs */}
    <circle cx="80" cy="18" r="4" fill="#FDF8F1" fillOpacity="0.8" />
    <circle cx="84" cy="11" r="3" fill="#FDF8F1" fillOpacity="0.6" />
    
    {/* Main House Walls */}
    <rect x="30" y="52" width="60" height="46" rx="8" fill="#FDF8F1" />
    
    {/* Triangular Warm Roof */}
    <path
      d="M18 54L56 22C58.3 20 61.7 20 64 22L102 54C104 55.6 103 58 100.5 58H19.5C17 58 16 55.6 18 54Z"
      fill="#C4552F"
    />
    
    {/* Welcoming Door */}
    <rect x="50" y="68" width="20" height="30" rx="4" fill="#1F5C57" />
    <circle cx="65" cy="83" r="2" fill="#F2B441" />
    
    {/* Windows with Warm Light */}
    <rect x="36" y="62" width="10" height="12" rx="2" fill="#F2B441" />
    <line x1="41" y1="62" x2="41" y2="74" stroke="#C37A17" strokeWidth="1" />
    <line x1="36" y1="68" x2="46" y2="68" stroke="#C37A17" strokeWidth="1" />
    
    <rect x="74" y="62" width="10" height="12" rx="2" fill="#F2B441" />
    <line x1="79" y1="62" x2="79" y2="74" stroke="#C37A17" strokeWidth="1" />
    <line x1="74" y1="68" x2="84" y2="68" stroke="#C37A17" strokeWidth="1" />
    
    {/* Small Heart above Door */}
    <path
      d="M60 58C58 56 55 57 55 59C55 61.5 60 64 60 64C60 64 65 61.5 65 59C65 57 62 56 60 58Z"
      fill="#C4552F"
    />
  </svg>
);

// 8. Delivery Box (Direct Item Delivery & Pledges)
export const DeliveryBoxIllustration: React.FC<IllustrationProps> = ({ className = 'w-16 h-16', size }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Delivery Box Illustration"
    role="img"
  >
    {/* Background soft circle */}
    <circle cx="60" cy="60" r="54" fill="#FDF2D5" />
    
    {/* Isometric / 3D Parcel Box */}
    {/* Front face */}
    <path d="M26 48L60 66V100L26 82V48Z" fill="#C4552F" />
    
    {/* Right face */}
    <path d="M60 66L94 48V82L60 100V66Z" fill="#9E3F1F" />
    
    {/* Top face */}
    <path d="M60 30L94 48L60 66L26 48L60 30Z" fill="#D77D5E" />
    
    {/* Packing tape running across */}
    <path d="M43 39L77 57L60 66L26 48L43 39Z" fill="#EADCCB" fillOpacity="0.4" />
    <path d="M52 34L68 42L68 88L52 80V34Z" fill="#F2B441" fillOpacity="0.8" />
    
    {/* Heart seal on package */}
    <circle cx="60" cy="60" r="10" fill="#FDF8F1" />
    <path
      d="M60 64C57.5 61.5 54 62.5 54 65C54 67.5 60 70 60 70C60 70 66 67.5 66 65C66 62.5 62.5 61.5 60 64Z"
      fill="#1F5C57"
    />
  </svg>
);

// 9. Heart / Hope Illustration (Care, Trust, Compassion)
export const HeartIllustration: React.FC<IllustrationProps> = ({ className = 'w-16 h-16', size }) => (
  <svg
    viewBox="0 0 120 120"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    style={size ? { width: size, height: size } : undefined}
    aria-label="Heart Illustration"
    role="img"
  >
    {/* Background soft glow */}
    <circle cx="60" cy="60" r="54" fill="#FDF5F1" />
    
    {/* Floating warmth rays */}
    <line x1="60" y1="12" x2="60" y2="20" stroke="#F2B441" strokeWidth="4" strokeLinecap="round" />
    <line x1="28" y1="24" x2="34" y2="30" stroke="#F2B441" strokeWidth="4" strokeLinecap="round" />
    <line x1="92" y1="24" x2="86" y2="30" stroke="#F2B441" strokeWidth="4" strokeLinecap="round" />
    
    {/* Main Heart */}
    <path
      d="M60 98C40 82 20 64 20 44C20 28 32 18 46 18C53 18 57.5 21 60 25C62.5 21 67 18 74 18C88 18 100 28 100 44C100 64 80 82 60 98Z"
      fill="#C4552F"
    />
    
    {/* Inner glow highlight */}
    <path
      d="M32 38C32 30 38 24 46 24"
      stroke="#FDF8F1"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * Maps category name strings to the appropriate custom illustration
 */
export const CategoryIllustration: React.FC<{ category: string; className?: string; size?: number | string }> = ({
  category,
  className,
  size = 56,
}) => {
  const norm = (category || '').toLowerCase();

  if (norm.includes('edu') || norm.includes('book') || norm.includes('school') || norm.includes('study')) {
    return <SchoolBagIllustration className={className} size={size} />;
  }
  if (norm.includes('cloth') || norm.includes('wear') || norm.includes('jacket') || norm.includes('winter')) {
    return <WinterCoatIllustration className={className} size={size} />;
  }
  if (norm.includes('bed') || norm.includes('linen') || norm.includes('sleep') || norm.includes('blanket')) {
    return <BooksIllustration className={className} size={size} />;
  }
  if (norm.includes('food') || norm.includes('meal') || norm.includes('nutrition') || norm.includes('ration')) {
    return <LunchboxIllustration className={className} size={size} />;
  }
  if (norm.includes('shoe') || norm.includes('foot') || norm.includes('sport')) {
    return <ShoesIllustration className={className} size={size} />;
  }
  if (norm.includes('celebrat') || norm.includes('birth') || norm.includes('gift') || norm.includes('festiv')) {
    return <BirthdayCakeIllustration className={className} size={size} />;
  }
  if (norm.includes('home') || norm.includes('shelter') || norm.includes('house')) {
    return <HomeIllustration className={className} size={size} />;
  }

  // Fallback to delivery box
  return <DeliveryBoxIllustration className={className} size={size} />;
};

