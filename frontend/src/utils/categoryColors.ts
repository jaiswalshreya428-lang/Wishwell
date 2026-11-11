/**
 * "Twilight Home" Category & Status Color-Coding Utility
 *
 * SPECIFICATION:
 * - Bedding: Plum (#3A2A55, tint #F3EBF9)
 * - Clothing: Coral (#E4572E, tint #FDEEE9)
 * - Education: Teal (#1F8A7A, tint #E3F5F2)
 * - Health: Sage-green (#5A8D66, tint #EBF4EC)
 * - Nutrition: Marigold (#F6B93B, tint #FEF8E8)
 * - Sports: Sky Blue (#3E8FD1, tint #E8F3FC)
 *
 * Status badges:
 * - open = teal
 * - partially claimed = marigold
 * - claimed = plum
 * - delivered = green
 * - expired = grey
 */

export interface CategoryTheme {
  name: string;
  primary: string;           // Main text / border / icon hex
  tint: string;              // Light chip / pill background
  border: string;            // Border hex
  gradient: string;          // Card top header gradient
  badgeBg: string;           // Badge background
  badgeText: string;         // Badge text
  badgeBorder: string;       // Badge border
  washiColor: 'plum' | 'coral' | 'teal' | 'sage' | 'marigold' | 'sky';
  hoverShadow: string;
}

export function getCategoryTheme(categoryNameOrId: string | number | undefined | null): CategoryTheme {
  const norm = String(categoryNameOrId || '').toLowerCase().trim();

  // 1. Bedding & Linen -> Heather Plum
  if (norm.includes('bed') || norm.includes('linen') || norm.includes('blanket') || norm.includes('pillow')) {
    return {
      name: 'Bedding & Linen',
      primary: '#5E4B6B',
      tint: '#F2EEF5',
      border: '#D6CCE0',
      gradient: 'from-[#F2EEF5]/90 to-transparent',
      badgeBg: 'bg-[#F2EEF5]',
      badgeText: 'text-[#544363]',
      badgeBorder: 'border-[#D6CCE0]',
      washiColor: 'plum',
      hoverShadow: 'hover:shadow-plum/15',
    };
  }

  // 2. Clothing & Footwear -> Antique Terracotta
  if (norm.includes('cloth') || norm.includes('footwear') || norm.includes('wear') || norm.includes('shoe') || norm.includes('coat')) {
    return {
      name: 'Clothing & Footwear',
      primary: '#B65038',
      tint: '#F9ECE6',
      border: '#ECC4B5',
      gradient: 'from-[#F9ECE6]/90 to-transparent',
      badgeBg: 'bg-[#F9ECE6]',
      badgeText: 'text-[#9B3F2A]',
      badgeBorder: 'border-[#ECC4B5]',
      washiColor: 'coral',
      hoverShadow: 'hover:shadow-coral/20',
    };
  }

  // 3. Educational Supplies -> Well Verdigris Teal
  if (norm.includes('edu') || norm.includes('book') || norm.includes('school') || norm.includes('notebook') || norm.includes('geometry')) {
    return {
      name: 'Educational Supplies',
      primary: '#24635C',
      tint: '#E4F0ED',
      border: '#BADAD3',
      gradient: 'from-[#E4F0ED]/90 to-transparent',
      badgeBg: 'bg-[#E4F0ED]',
      badgeText: 'text-[#1B4D48]',
      badgeBorder: 'border-[#BADAD3]',
      washiColor: 'teal',
      hoverShadow: 'hover:shadow-teal/15',
    };
  }

  // 4. Health & Hygiene -> Dried Sage
  if (norm.includes('health') || norm.includes('hygiene') || norm.includes('medical') || norm.includes('soap') || norm.includes('sanitary')) {
    return {
      name: 'Health & Hygiene',
      primary: '#416148',
      tint: '#E9F1E9',
      border: '#C0D4C2',
      gradient: 'from-[#E9F1E9]/90 to-transparent',
      badgeBg: 'bg-[#E9F1E9]',
      badgeText: 'text-[#314B37]',
      badgeBorder: 'border-[#C0D4C2]',
      washiColor: 'sage',
      hoverShadow: 'hover:shadow-sage/20',
    };
  }

  // 5. Nutrition & Food -> Burnished Brass
  if (norm.includes('nutri') || norm.includes('food') || norm.includes('meal') || norm.includes('grain') || norm.includes('ration')) {
    return {
      name: 'Nutrition & Food',
      primary: '#A97624',
      tint: '#FAF2DE',
      border: '#ECD8A3',
      gradient: 'from-[#FAF2DE]/90 to-transparent',
      badgeBg: 'bg-[#FAF2DE]',
      badgeText: 'text-[#855A19]',
      badgeBorder: 'border-[#ECD8A3]',
      washiColor: 'marigold',
      hoverShadow: 'hover:shadow-marigold/20',
    };
  }

  // 6. Sports & Recreation -> Mineral Well Blue
  if (norm.includes('sport') || norm.includes('recreation') || norm.includes('game') || norm.includes('play') || norm.includes('toy')) {
    return {
      name: 'Sports & Recreation',
      primary: '#3B666E',
      tint: '#E4EFF0',
      border: '#BDD6DA',
      gradient: 'from-[#E4EFF0]/90 to-transparent',
      badgeBg: 'bg-[#E4EFF0]',
      badgeText: 'text-[#2D5057]',
      badgeBorder: 'border-[#BDD6DA]',
      washiColor: 'sky',
      hoverShadow: 'hover:shadow-skyblue/15',
    };
  }

  // Default fallback (Verdigris Teal)
  return {
    name: 'General Need',
    primary: '#24635C',
    tint: '#E4F0ED',
    border: '#BADAD3',
    gradient: 'from-[#E4F0ED]/90 to-transparent',
    badgeBg: 'bg-[#E4F0ED]',
    badgeText: 'text-[#1B4D48]',
    badgeBorder: 'border-[#BADAD3]',
    washiColor: 'teal',
    hoverShadow: 'hover:shadow-teal/15',
  };
}

export interface StatusStyle {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  dotColor: string;
}

export function getStatusStyle(status: string): StatusStyle {
  const norm = String(status || '').toLowerCase().trim();

  switch (norm) {
    case 'open':
      return {
        label: 'Open Wish',
        badgeBg: 'bg-[#E3F5F2]',
        badgeText: 'text-[#166C60]',
        badgeBorder: 'border-[#BDE6DF]',
        dotColor: 'bg-[#1F8A7A]',
      };
    case 'partially_claimed':
    case 'partially claimed':
      return {
        label: 'Partially Claimed',
        badgeBg: 'bg-[#FEF8E8]',
        badgeText: 'text-[#9A6405]',
        badgeBorder: 'border-[#FBE4AE]',
        dotColor: 'bg-[#F6B93B]',
      };
    case 'claimed':
    case 'fully_claimed':
    case 'fully claimed':
      return {
        label: 'Claimed',
        badgeBg: 'bg-[#F3EBF9]',
        badgeText: 'text-[#533E78]',
        badgeBorder: 'border-[#D8C5E8]',
        dotColor: 'bg-[#3A2A55]',
      };
    case 'delivered':
    case 'fulfilled':
      return {
        label: 'Delivered',
        badgeBg: 'bg-[#E5F6EC]',
        badgeText: 'text-[#215E3C]',
        badgeBorder: 'border-[#B7E5C7]',
        dotColor: 'bg-[#2D7A4F]',
      };
    case 'expired':
    case 'cancelled':
    default:
      return {
        label: norm ? norm.replace('_', ' ') : 'Expired',
        badgeBg: 'bg-[#F4F4F5]',
        badgeText: 'text-[#52525B]',
        badgeBorder: 'border-[#E4E4E7]',
        dotColor: 'bg-[#71717A]',
      };
  }
}

