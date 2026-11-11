import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Sparkles, RotateCw, Gift, Heart, Feather } from 'lucide-react';

type ScenePhase = 'running' | 'receiving' | 'celebrating';

interface GiftBundle {
  id: string;
  label: string;
  tagText: string;
  boxColor: string;
  boxShade: string;
  ribbonColor: string;
  companionNote: string;
  senderTag: string;
}

const GIFT_BUNDLES: GiftBundle[] = [
  {
    id: 'coat',
    label: 'Wool Winter Coats',
    tagText: 'Winter Coats',
    boxColor: '#FAF3E8',
    boxShade: '#E9DCC8',
    ribbonColor: '#A84637',
    companionNote: 'Tucked a tiny origami star inside every warm pocket ♡',
    senderTag: 'Warmth Parcel',
  },
  {
    id: 'books',
    label: 'Illustrated Storybooks',
    tagText: 'Storybooks',
    boxColor: '#E5F2EE',
    boxShade: '#CBE2DB',
    ribbonColor: '#C69749',
    companionNote: 'May every chapter bring a rainy-day adventure ★',
    senderTag: 'Library Nook',
  },
  {
    id: 'satchel',
    label: 'Canvas School Satchels',
    tagText: 'School Bags',
    boxColor: '#FAF0DA',
    boxShade: '#EADBB9',
    ribbonColor: '#215B54',
    companionNote: 'Two extra side pockets ready for pencils & treasures! ✿',
    senderTag: 'Morning Bell',
  },
  {
    id: 'art',
    label: 'Watercolor & Art Kits',
    tagText: 'Art Kits',
    boxColor: '#F7E9E6',
    boxShade: '#E8CFC9',
    ribbonColor: '#4E8089',
    companionNote: 'Twelve soft pastels to paint sunny afternoons ♪',
    senderTag: 'Sketchbook Club',
  },
  {
    id: 'blankets',
    label: 'Thermal Fleece Blankets',
    tagText: 'Blankets',
    boxColor: '#EAE6F2',
    boxShade: '#D6CEE6',
    ribbonColor: '#A84637',
    companionNote: 'Soft like clouds for peaceful, starry nights ✨',
    senderTag: 'Cozy Dorm',
  },
  {
    id: 'shoes',
    label: 'Sturdy School Shoes',
    tagText: 'Footwear',
    boxColor: '#E4F0F3',
    boxShade: '#C8DEE5',
    ribbonColor: '#215B54',
    companionNote: 'Ready for sunlit courtyard sprints and morning play! ♪',
    senderTag: 'Stepping Stones',
  },
];

const EXTRA_CUTE_NOTES = [
  {
    text: 'Wishing bright mornings, gentle rain, and shelves full of favorite books ♡',
    from: 'Neighbor Down the Lane',
    bg: 'bg-[#FCF3F0]',
    border: 'border-[#E6C5BC]',
    tape: 'bg-[#D5E6DF] border-[#9EC2B5]',
    tilt: '-rotate-[1.2deg]',
  },
  {
    text: 'Packed carefully with sturdy twine and twice the smiles ✿',
    from: 'Courtyard Postal Friend',
    bg: 'bg-[#EDF6F2]',
    border: 'border-[#BDD8CD]',
    tape: 'bg-[#F4E3B8] border-[#D9BD75]',
    tilt: 'rotate-[1.1deg]',
  },
  {
    text: 'Every pebble dropped in the well finds a real doorway safely ★',
    from: 'Verified Donor Note',
    bg: 'bg-[#FDF8EB]',
    border: 'border-[#E7D5A8]',
    tape: 'bg-[#F0CEC5] border-[#D59C8F]',
    tilt: '-rotate-[0.8deg]',
  },
  {
    text: 'Here is to warm toes, neat notebooks, and happy afternoon stories ♪',
    from: 'Friend from Afar',
    bg: 'bg-[#EEF5F7]',
    border: 'border-[#C1DBE2]',
    tape: 'bg-[#DCE8D8] border-[#A7C4A0]',
    tilt: 'rotate-[1.3deg]',
  },
];

interface ChildSpec {
  id: 'mina' | 'aarav' | 'tia' | 'rohan';
  name: string;
  facing: 'right' | 'left';
  startLeft: string;
  endLeft: string;
  scaleClass: string;
  zClass: string;
  outfitMain: string;
  outfitAccent: string;
  hairColor: string;
  skinTone: string;
  cheekColor: string;
  hairStyle: 'pigtails' | 'wavy' | 'puffs' | 'beret';
  hasGlasses?: boolean;
  scarfColor: string;
  giftColor: string;
  giftShade: string;
  giftRibbon: string;
  speechNote: string;
  delaySeconds: number;
  bottomOffset: string;
}

const STORYBOOK_CHILDREN: ChildSpec[] = [
  {
    id: 'mina',
    name: 'Mina',
    facing: 'right',
    startLeft: '-8%',
    endLeft: '16%',
    scaleClass: 'w-[92px] h-[106px] sm:w-[112px] sm:h-[126px]',
    zClass: 'z-30',
    outfitMain: '#A84637',
    outfitAccent: '#FAF6EC',
    hairColor: '#56392E',
    skinTone: '#FDE8DA',
    cheekColor: '#ED9B8E',
    hairStyle: 'pigtails',
    scarfColor: '#DFC37C',
    giftColor: '#FAF3E8',
    giftShade: '#E6D8C0',
    giftRibbon: '#215B54',
    speechNote: 'So cozy and warm! ♡',
    delaySeconds: 0,
    bottomOffset: 'bottom-[26px] sm:bottom-[28px]',
  },
  {
    id: 'aarav',
    name: 'Aarav',
    facing: 'right',
    startLeft: '4%',
    endLeft: '36%',
    scaleClass: 'w-[86px] h-[100px] sm:w-[104px] sm:h-[118px]',
    zClass: 'z-20',
    outfitMain: '#215B54',
    outfitAccent: '#EFE6D2',
    hairColor: '#3B2B25',
    skinTone: '#F6D8C3',
    cheekColor: '#E88E7F',
    hairStyle: 'wavy',
    hasGlasses: true,
    scarfColor: '#C69749',
    giftColor: '#E5F2EE',
    giftShade: '#C6DDD5',
    giftRibbon: '#A84637',
    speechNote: 'Ooh, storybooks! ★',
    delaySeconds: 0.16,
    bottomOffset: 'bottom-[40px] sm:bottom-[44px]',
  },
  {
    id: 'tia',
    name: 'Tia',
    facing: 'left',
    startLeft: '96%',
    endLeft: '64%',
    scaleClass: 'w-[88px] h-[102px] sm:w-[106px] sm:h-[120px]',
    zClass: 'z-20',
    outfitMain: '#C69749',
    outfitAccent: '#FAF7F0',
    hairColor: '#453028',
    skinTone: '#F5D2BA',
    cheekColor: '#EA9183',
    hairStyle: 'puffs',
    scarfColor: '#A84637',
    giftColor: '#F9ECE9',
    giftShade: '#EAD0CA',
    giftRibbon: '#215B54',
    speechNote: 'Look at the ribbon! ✿',
    delaySeconds: 0.1,
    bottomOffset: 'bottom-[38px] sm:bottom-[42px]',
  },
  {
    id: 'rohan',
    name: 'Rohan',
    facing: 'left',
    startLeft: '108%',
    endLeft: '85%',
    scaleClass: 'w-[92px] h-[106px] sm:w-[110px] sm:h-[124px]',
    zClass: 'z-30',
    outfitMain: '#4E8089',
    outfitAccent: '#FAF6EC',
    hairColor: '#5D4034',
    skinTone: '#FCE5D6',
    cheekColor: '#EE9B8C',
    hairStyle: 'beret',
    scarfColor: '#A84637',
    giftColor: '#FAF0DA',
    giftShade: '#E8D6AF',
    giftRibbon: '#C69749',
    speechNote: 'For rainy mornings! ♪',
    delaySeconds: 0.22,
    bottomOffset: 'bottom-[24px] sm:bottom-[26px]',
  },
];

interface StorybookChildArtProps {
  child: ChildSpec;
  phase: ScenePhase;
  reduceMotion: boolean;
  activeGift: GiftBundle;
  isLeadChild?: boolean;
}

/**
 * Handcrafted Studio-Storybook Anime Child Vector Sprite:
 * Uses warm sepia ink (#43332C), flowing hairstyles, bent-knee running limbs,
 * luminous catchlight anime eyes during sprint, and happy crescent smiles when holding parcels.
 */
const StorybookChildArt: React.FC<StorybookChildArtProps> = ({
  child,
  phase,
  reduceMotion,
  activeGift,
  isLeadChild,
}) => {
  const heldBoxColor = isLeadChild ? activeGift.boxColor : child.giftColor;
  const heldBoxShade = isLeadChild ? activeGift.boxShade : child.giftShade;
  const heldRibbon = isLeadChild ? activeGift.ribbonColor : child.giftRibbon;
  const ink = '#43332C';
  const isRunning = phase === 'running';
  const showGift = phase !== 'running';

  return (
    <svg
      viewBox="0 0 132 142"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: child.facing === 'left' ? 'scaleX(-1)' : undefined,
      }}
      className="w-full h-full overflow-visible drop-shadow-sm"
    >
      {/* Soft Meadow Contact Shadow */}
      <ellipse
        cx="66"
        cy="132"
        rx={isRunning ? 26 : 21}
        ry="5"
        fill="#6D847B"
        opacity="0.3"
      />

      {/* Twinkling Storybook Sparkles During Arrival & Celebration */}
      {phase !== 'running' && (
        <>
          <path
            d="M16 32L18 38L24 40L18 42L16 48L14 42L8 40L14 38L16 32Z"
            fill="#DFC37C"
            className="animate-anime-sparkle"
          />
          <path
            d="M114 22L115.6 26.8L120.4 28.4L115.6 30L114 34.8L112.4 30L107.6 28.4L112.4 26.8L114 22Z"
            fill="#C69749"
            className="animate-anime-sparkle"
          />
        </>
      )}

      {/* Slight Playful Forward Sprint Lean */}
      <g transform={isRunning ? 'rotate(8 66 96)' : 'rotate(0 66 96)'}>
        {/* Fluttering Scarf Tail */}
        <g
          className={isRunning && !reduceMotion ? 'animate-anime-scarf' : ''}
          style={{ transformOrigin: '52px 76px' }}
        >
          <path
            d={
              isRunning
                ? 'M52 76C34 76 18 68 9 74C17 82 33 83 50 81Z'
                : 'M53 76C43 83 37 92 39 98C45 97 50 88 55 81Z'
            }
            fill={child.scarfColor}
            stroke={ink}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>

        {/* Back Leg (Lively bent knee stride while running) */}
        <g
          className={isRunning && !reduceMotion ? 'animate-anime-stride-left' : ''}
          style={{ transformOrigin: '57px 102px' }}
        >
          <path
            d={
              isRunning
                ? 'M54 101L48 117L57 122'
                : 'M54 101V122'
            }
            stroke={child.skinTone}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={
              isRunning
                ? 'M54 101L48 117L57 122'
                : 'M54 101V122'
            }
            stroke={ink}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Boot / Shoe */}
          <path
            d={
              isRunning
                ? 'M49 119H62C64 119 65 125 61 125H49V119Z'
                : 'M49 121H62C64 121 65 127 61 127H49V121Z'
            }
            fill="#5D4235"
            stroke={ink}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>

        {/* Front Leg */}
        <g
          className={isRunning && !reduceMotion ? 'animate-anime-stride-right' : ''}
          style={{ transformOrigin: '69px 102px' }}
        >
          <path
            d={
              isRunning
                ? 'M68 101L75 115L70 123'
                : 'M69 101V122'
            }
            stroke={child.skinTone}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={
              isRunning
                ? 'M68 101L75 115L70 123'
                : 'M69 101V122'
            }
            stroke={ink}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={
              isRunning
                ? 'M64 119H78C80 119 81 125 77 125H64V119Z'
                : 'M64 121H78C80 121 81 127 77 127H64V121Z'
            }
            fill="#704F3F"
            stroke={ink}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>

        {/* Back Arm (Reaches forward to cradle parcel when received) */}
        <g
          className={isRunning && !reduceMotion ? 'animate-anime-stride-right' : ''}
          style={{ transformOrigin: '75px 79px' }}
        >
          <path
            d={isRunning ? 'M74 79L89 87' : 'M75 81L91 88'}
            stroke={child.outfitAccent}
            strokeWidth="8.5"
            strokeLinecap="round"
          />
          <path
            d={isRunning ? 'M74 79L89 87' : 'M75 81L91 88'}
            stroke={ink}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle
            cx={isRunning ? 91 : 93}
            cy={isRunning ? 88 : 89}
            r="4.3"
            fill={child.skinTone}
            stroke={ink}
            strokeWidth="1.4"
          />
        </g>

        {/* Torso Dress / Knit Cardigan / Smock */}
        {child.hairStyle === 'pigtails' || child.hairStyle === 'puffs' ? (
          <>
            {/* Flared Vintage Pinafore Skirt / Smock */}
            <path
              d="M49 77C49 72 77 72 77 77L86 105C74 109 52 109 40 105L49 77Z"
              fill={child.outfitMain}
              stroke={ink}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            {/* Cream Pinafore Apron Front Panel */}
            <path
              d="M55 76H71L74 104C68 106 58 106 52 104L55 76Z"
              fill={child.outfitAccent}
              fillOpacity="0.92"
              stroke={ink}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Cute Peter Pan Collar */}
            <path
              d="M53 74L63 82L73 74Z"
              fill="#FAF7F0"
              stroke={ink}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </>
        ) : (
          <>
            {/* Cozy Cardigan + Knicker Shorts / Trousers */}
            <path
              d="M48 76C48 72 78 72 78 76L81 98C71 101 55 101 45 98L48 76Z"
              fill={child.outfitMain}
              stroke={ink}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <path
              d="M47 96H79L80 105C72 107 54 107 46 105L47 96Z"
              fill="#5D5146"
              stroke={ink}
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            {/* Ivory Collar + Wood Buttons */}
            <path
              d="M54 74L63 82L72 74Z"
              fill={child.outfitAccent}
              stroke={ink}
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <circle cx="63" cy="87" r="1.7" fill="#DFC37C" />
            <circle cx="63" cy="93" r="1.7" fill="#DFC37C" />
          </>
        )}

        {/* Scarf Collar Wrap */}
        <rect
          x="53"
          y="71"
          width="20"
          height="6.5"
          rx="3"
          fill={child.scarfColor}
          stroke={ink}
          strokeWidth="1.5"
        />

        {/* Head & Flowing Anime Hair */}
        <g>
          {/* Hairstyle Silhouettes (Back Layer) */}
          {child.hairStyle === 'pigtails' && (
            <>
              {/* Fluttering Twin Pigtails */}
              <g
                className={isRunning && !reduceMotion ? 'animate-anime-scarf' : ''}
                style={{ transformOrigin: '43px 36px' }}
              >
                <path
                  d="M42 35C29 34 22 45 27 57C33 55 39 48 43 41Z"
                  fill={child.hairColor}
                  stroke={ink}
                  strokeWidth="1.6"
                />
                <path
                  d="M39 33C33 27 31 35 37 37Z"
                  fill="#A84637"
                  stroke={ink}
                  strokeWidth="1.2"
                />
              </g>
              <circle cx="84" cy="40" r="9" fill={child.hairColor} stroke={ink} strokeWidth="1.6" />
              <circle cx="82" cy="33" r="3" fill="#A84637" stroke={ink} strokeWidth="1.2" />
            </>
          )}

          {child.hairStyle === 'puffs' && (
            <>
              <circle cx="40" cy="30" r="10.5" fill={child.hairColor} stroke={ink} strokeWidth="1.6" />
              <circle cx="86" cy="30" r="10.5" fill={child.hairColor} stroke={ink} strokeWidth="1.6" />
              {/* Gold Hair Clips */}
              <circle cx="45" cy="36" r="2.6" fill="#DFC37C" stroke={ink} strokeWidth="1" />
              <circle cx="81" cy="36" r="2.6" fill="#DFC37C" stroke={ink} strokeWidth="1" />
            </>
          )}

          {/* Base Back Hair Crown */}
          <path
            d="M38 47C36 26 49 17 65 17C81 17 91 28 89 48C89 58 84 65 78 67H47C40 64 38 56 38 47Z"
            fill={child.hairColor}
            stroke={ink}
            strokeWidth="1.7"
          />

          {/* Cozy Beret Hat for Rohan */}
          {child.hairStyle === 'beret' && (
            <>
              <path
                d="M36 31C35 16 58 12 78 16C91 19 92 31 86 35C74 29 52 28 36 31Z"
                fill="#567C73"
                stroke={ink}
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M62 15L64 10" stroke={ink} strokeWidth="2" strokeLinecap="round" />
            </>
          )}

          {/* Cute Little Ear */}
          <circle cx="43" cy="49" r="4.5" fill={child.skinTone} stroke={ink} strokeWidth="1.4" />

          {/* Expressive Anime Soft-Chin Face */}
          <path
            d="M44 45C44 32 54 26 66 26C77 26 86 33 86 46C86 58 77 68 65 68C53 68 44 58 44 45Z"
            fill={child.skinTone}
            stroke={ink}
            strokeWidth="1.7"
          />

          {/* Forehead Wispy Anime Bangs */}
          <path
            d="M43 41C46 25 58 21 68 22C79 22 87 29 87 41C82 34 78 33 75 38C72 32 67 31 63 38C59 32 53 33 49 40C47 36 44 37 43 41Z"
            fill={child.hairColor}
            stroke={ink}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          {/* Subtle Hair Light Arc */}
          <path d="M55 27C61 25 70 25 75 28" stroke="#967465" strokeWidth="1.8" strokeLinecap="round" opacity="0.55" />

          {/* Rosy Warm Cheek Blush */}
          <ellipse
            cx="52"
            cy="55"
            rx="5.5"
            ry="2.8"
            fill={child.cheekColor}
            opacity={phase === 'celebrating' ? 0.65 : 0.4}
          />
          <ellipse
            cx="78"
            cy="55"
            rx="5.5"
            ry="2.8"
            fill={child.cheekColor}
            opacity={phase === 'celebrating' ? 0.65 : 0.4}
          />

          {/* Luminous Anime Eyes (Running = Sparkle Catchlight Eyes; Received = Happy ^ ^ Arcs) */}
          {phase === 'running' ? (
            <g>
              {/* Left Eye */}
              <ellipse cx="58" cy="47.5" rx="3.8" ry="4.8" fill="#2E221E" />
              <circle cx="59.4" cy="45.6" r="1.55" fill="#FFFFFF" />
              <circle cx="56.8" cy="49.5" r="0.8" fill="#FFFFFF" />
              {/* Top Eyelash Curve */}
              <path d="M53.5 43.2C56 41.2 60.5 41.2 62.5 43.2" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />

              {/* Right Eye */}
              <ellipse cx="75" cy="47.5" rx="3.8" ry="4.8" fill="#2E221E" />
              <circle cx="76.4" cy="45.6" r="1.55" fill="#FFFFFF" />
              <circle cx="73.8" cy="49.5" r="0.8" fill="#FFFFFF" />
              <path d="M70.5 43.2C73 41.2 77.5 41.2 79.5 43.2" stroke={ink} strokeWidth="1.4" strokeLinecap="round" />

              {/* Eager Smile */}
              <path d="M63 57C65.5 59.6 69.5 59.6 72 57" stroke={ink} strokeWidth="1.6" strokeLinecap="round" />
            </g>
          ) : (
            <g>
              {/* Happy Crescent Smile Eyes */}
              <path d="M53 48.5C55.2 44.3 60.5 44.3 62.5 48.5" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
              <path d="M70.5 48.5C72.7 44.3 78 44.3 80 48.5" stroke={ink} strokeWidth="2.1" strokeLinecap="round" />
              {/* Cheerful Open Laughing Smile */}
              <path
                d="M62 56H71.5C70.8 61 62.7 61 62 56Z"
                fill="#D46F65"
                stroke={ink}
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </g>
          )}

          {/* Optional Cute Round Vintage Glasses for Aarav */}
          {child.hasGlasses && (
            <g stroke="#7A5A2B" strokeWidth="1.3">
              <circle cx="58" cy="47.5" r="6.2" fill="none" />
              <circle cx="75" cy="47.5" r="6.2" fill="none" />
              <line x1="64.2" y1="47.2" x2="68.8" y2="47.2" />
            </g>
          )}
        </g>

        {/* Hugged Gift Parcel When Received (Phases 2 & 3) */}
        {showGift && (
          <g transform="translate(65, 72)">
            <rect x="0" y="6" width="33" height="24" rx="4" fill={heldBoxColor} stroke={ink} strokeWidth="1.7" />
            <rect x="-2" y="2" width="37" height="7" rx="2.5" fill={heldBoxShade} stroke={ink} strokeWidth="1.7" />
            <rect x="13.5" y="2" width="6" height="28" fill={heldRibbon} />
            <path d="M16.5 2C12 -4 7 -2 9 2Z" fill={heldRibbon} stroke={ink} strokeWidth="1.2" />
            <path d="M16.5 2C21 -4 26 -2 24 2Z" fill={heldRibbon} stroke={ink} strokeWidth="1.2" />
            {/* Tiny Tied Gift Tag */}
            <rect x="21" y="13" width="9" height="6" rx="1" fill="#FFFDF6" stroke={ink} strokeWidth="0.9" transform="rotate(-12 21 13)" />
          </g>
        )}

        {/* Front Arm (Swings naturally while running; hugs box once received) */}
        <g
          className={isRunning && !reduceMotion ? 'animate-anime-stride-left' : ''}
          style={{ transformOrigin: '54px 80px' }}
        >
          <path
            d={isRunning ? 'M54 80L41 93' : 'M54 81L73 89'}
            stroke={child.outfitAccent}
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d={isRunning ? 'M54 80L41 93' : 'M54 81L73 89'}
            stroke={ink}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle
            cx={isRunning ? 40 : 74}
            cy={isRunning ? 94 : 89}
            r="4.3"
            fill={child.skinTone}
            stroke={ink}
            strokeWidth="1.4"
          />
        </g>
      </g>
    </svg>
  );
};

interface StorybookGiftSceneProps {
  externalTriggerCount?: number;
  onGiftDelivered?: () => void;
}

/**
 * Multi-Child Vintage Anime Courtyard Vignette:
 * 4 animated storybook children run joyfully from both sides toward a bountiful bench of wrapped gifts,
 * receive distinct parcels, and celebrate with floating handwritten thank-you notes and pinned postcard notes.
 * Strictly zero photos of children — 100% stylized illustration.
 */
export const StorybookGiftScene: React.FC<StorybookGiftSceneProps> = ({
  externalTriggerCount = 0,
  onGiftDelivered,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<ScenePhase>(shouldReduceMotion ? 'celebrating' : 'running');
  const [giftIndex, setGiftIndex] = useState(0);
  const [cycleId, setCycleId] = useState(1);

  const currentGift = GIFT_BUNDLES[giftIndex % GIFT_BUNDLES.length];
  const onGiftDeliveredRef = useRef(onGiftDelivered);
  useEffect(() => {
    onGiftDeliveredRef.current = onGiftDelivered;
  }, [onGiftDelivered]);

  const triggerNextGift = useCallback(
    (selectedIndex?: number) => {
      setGiftIndex((prev) =>
        typeof selectedIndex === 'number' ? selectedIndex : (prev + 1) % GIFT_BUNDLES.length
      );
      setCycleId((c) => c + 1);
      setPhase(shouldReduceMotion ? 'celebrating' : 'running');
      onGiftDeliveredRef.current?.();
    },
    [shouldReduceMotion]
  );

  // Allow Wishing Well coin tosses to dispatch the next gift bundle
  useEffect(() => {
    if (externalTriggerCount > 0) {
      triggerNextGift();
    }
  }, [externalTriggerCount, triggerNextGift]);

  // Smooth 3-Beat Courtyard Timeline
  useEffect(() => {
    if (shouldReduceMotion) {
      setPhase('celebrating');
      return;
    }

    setPhase('running');

    const receiveTimer = window.setTimeout(() => {
      setPhase('receiving');
    }, 2450);

    const celebrateTimer = window.setTimeout(() => {
      setPhase('celebrating');
    }, 4200);

    const loopTimer = window.setTimeout(() => {
      setGiftIndex((prev) => (prev + 1) % GIFT_BUNDLES.length);
      setCycleId((c) => c + 1);
    }, 9600);

    return () => {
      window.clearTimeout(receiveTimer);
      window.clearTimeout(celebrateTimer);
      window.clearTimeout(loopTimer);
    };
  }, [cycleId, shouldReduceMotion]);

  return (
    <div className="relative rounded-4xl bg-gradient-to-b from-[#FAFBF7] via-[#F2F7F3] to-[#E9F1EC] border-2 border-[#C7DBD3] p-4 sm:p-6 shadow-card vintage-double-frame overflow-hidden">
      {/* Antique Brass Corner Brackets */}
      <div aria-hidden="true" className="pointer-events-none absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-[#C69749]/65 rounded-tl-sm" />
      <div aria-hidden="true" className="pointer-events-none absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-[#C69749]/65 rounded-tr-sm" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 border-[#C69749]/65 rounded-bl-sm" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 border-[#C69749]/65 rounded-br-sm" />

      {/* Top Ribbon Controls & Gift Bundle Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-[#D4E2DC]">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#215B54]">
            <Sparkles className="w-3.5 h-3.5 text-[#C69749] animate-anime-sparkle" />
            <span>Storybook Courtyard Moment</span>
          </div>
          <h3 className="font-serif text-lg sm:text-xl font-bold text-[#192D2A] mt-0.5">
            From the Wishing Well to <span className="italic font-semibold text-[#A84637]">Warm, Happy Hearts</span>
          </h3>
        </div>

        {/* 6 Gift Theme Selector Pills + Next Bundle Button */}
        <div className="flex flex-wrap items-center gap-1.5">
          {GIFT_BUNDLES.map((g, idx) => (
            <button
              key={g.id}
              type="button"
              onClick={() => triggerNextGift(idx)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition active:scale-95 ${
                giftIndex % GIFT_BUNDLES.length === idx
                  ? 'bg-[#215B54] text-[#FAF8F3] border-[#194641] shadow-xs'
                  : 'bg-[#FAFBF8] text-[#455A54] border-[#C7DBD3] hover:bg-[#E4EFEA]'
              }`}
            >
              {g.tagText}
            </button>
          ))}
          <button
            type="button"
            onClick={() => triggerNextGift()}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#A84637] to-[#8D3628] text-[#FAF8F3] text-[11px] font-bold shadow-xs hover:brightness-110 transition active:scale-95 ml-1"
            title="Dispatch next gift bundle across the courtyard"
          >
            <RotateCw className="w-3 h-3" />
            <span>Send Next Gift</span>
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* SOOTHING ANIME COURTYARD THEATER STAGE (4 ANIMATED CHILDREN + GIFTS) */}
      {/* =================================================================== */}
      <div
        onClick={() => triggerNextGift()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            triggerNextGift();
          }
        }}
        aria-label="Replay anime courtyard animation with children receiving gifts"
        className="relative mt-4 h-[290px] sm:h-[325px] w-full rounded-3xl border border-[#C3DAD4] overflow-hidden cursor-pointer select-none focus-visible:ring-2 focus-visible:ring-[#215B54]"
        style={{
          background:
            'linear-gradient(180deg, #D9ECEF 0%, #E7F3EE 46%, #F3F6EE 76%, #DFEBE3 100%)',
        }}
      >
        {/* 1. Painted Soothing Meadow & Garden Terrace Backdrop SVG */}
        <svg
          viewBox="0 0 1000 325"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full pointer-events-none"
          preserveAspectRatio="xMidYMax slice"
        >
          {/* Soft Sunbeam Halo */}
          <radialGradient id="meadowSunbeam" cx="52%" cy="22%" r="55%">
            <stop offset="0%" stopColor="#FFFBF0" stopOpacity="0.92" />
            <stop offset="55%" stopColor="#EBF5EE" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#D9ECEF" stopOpacity="0" />
          </radialGradient>
          <rect width="1000" height="325" fill="url(#meadowSunbeam)" />

          {/* Soft Drifting Pastel Clouds */}
          <path d="M90 68C103 48 134 45 148 59C162 50 185 55 191 69H90Z" fill="#FCFDFB" opacity="0.78" />
          <path d="M460 46C472 31 500 29 514 41C527 33 546 38 552 49H460Z" fill="#FCFDFB" opacity="0.65" />
          <path d="M775 64C786 48 812 46 824 57C836 50 854 54 859 66H775Z" fill="#FCFDFB" opacity="0.75" />

          {/* Rolling Soothing Seafoam & Sage Hills */}
          <path d="M0 194C210 156 410 198 635 166C815 140 925 170 1000 155V325H0V194Z" fill="#CBE1DA" opacity="0.78" />
          <path d="M0 220C250 188 510 226 760 196C875 182 950 198 1000 192V325H0V220Z" fill="#BBD5CA" opacity="0.82" />

          {/* Cozy Storybook Children's Home & Wishing Well Silhouette in Background */}
          <g transform="translate(465, 114)" opacity="0.85">
            <rect x="6" y="34" width="66" height="44" rx="4" fill="#FAF6EC" stroke="#8DA399" strokeWidth="1.5" />
            <path d="M0 36L39 8L78 36H0Z" fill="#BA6556" stroke="#85453A" strokeWidth="1.5" strokeLinejoin="round" />
            <rect x="52" y="13" width="8" height="14" fill="#9D5144" />
            <rect x="16" y="47" width="13" height="13" rx="2" fill="#F6DF9A" stroke="#8DA399" strokeWidth="1" />
            <rect x="50" y="47" width="13" height="13" rx="2" fill="#F6DF9A" stroke="#8DA399" strokeWidth="1" />
            <rect x="33" y="51" width="12" height="27" rx="6" fill="#5D847C" />
          </g>

          {/* Background Courtyard Wishing Well on Left Ridge */}
          <g transform="translate(155, 134)" opacity="0.82">
            <rect x="7" y="24" width="4" height="24" fill="#6D7E76" />
            <rect x="37" y="24" width="4" height="24" fill="#6D7E76" />
            <path d="M0 25L24 5L48 25H0Z" fill="#A8594B" />
            <rect x="6" y="46" width="36" height="17" rx="3" fill="#EDF0E8" stroke="#9AAFA6" strokeWidth="1.2" />
          </g>

          {/* Hanging Flowering Almond Branches Framing Both Corners */}
          <path d="M0 22C50 32 90 20 132 48" stroke="#7A6557" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="48" cy="27" r="8" fill="#F7DDD6" opacity="0.9" />
          <circle cx="62" cy="21" r="6" fill="#FFFDF9" opacity="0.95" />
          <circle cx="102" cy="34" r="7.5" fill="#F0C7BE" opacity="0.88" />
          <circle cx="128" cy="48" r="5.5" fill="#FFFDF9" opacity="0.92" />

          <path d="M1000 28C945 38 905 25 860 54" stroke="#7A6557" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="950" cy="33" r="8" fill="#F7DDD6" opacity="0.9" />
          <circle cx="916" cy="28" r="6" fill="#FFFDF9" opacity="0.95" />
          <circle cx="874" cy="49" r="7" fill="#F0C7BE" opacity="0.88" />

          {/* Calm Pastel Sage-Limestone Courtyard Path & Meadow Lawn */}
          <rect x="0" y="242" width="1000" height="83" fill="#DAE5DD" />
          <line x1="0" y1="242" x2="1000" y2="242" stroke="#B6CBBF" strokeWidth="2" />
          <ellipse cx="110" cy="272" rx="28" ry="7" fill="#ECF2EE" opacity="0.7" />
          <ellipse cx="265" cy="286" rx="34" ry="7.5" fill="#ECF2EE" opacity="0.65" />
          <ellipse cx="435" cy="268" rx="30" ry="6.5" fill="#ECF2EE" opacity="0.7" />
          <ellipse cx="600" cy="288" rx="34" ry="7" fill="#ECF2EE" opacity="0.65" />
          <ellipse cx="770" cy="272" rx="30" ry="6.5" fill="#ECF2EE" opacity="0.7" />
          <ellipse cx="905" cy="286" rx="28" ry="6.5" fill="#ECF2EE" opacity="0.6" />

          {/* Little Wildflowers Along Garden Path */}
          <circle cx="82" cy="252" r="3" fill="#F7DDD6" />
          <circle cx="330" cy="254" r="2.8" fill="#F6DF9A" />
          <circle cx="670" cy="252" r="3" fill="#F7DDD6" />
          <circle cx="890" cy="256" r="2.8" fill="#FFFDF9" />
        </svg>

        {/* Subtle Floating Blossom Petals Inside Courtyard */}
        {!shouldReduceMotion && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {[
              { left: '14%', delay: 0, duration: 5.5, color: '#F6DCD5' },
              { left: '34%', delay: 1.2, duration: 6.4, color: '#FFFDF8' },
              { left: '54%', delay: 0.6, duration: 5.8, color: '#F1CBC2' },
              { left: '72%', delay: 1.8, duration: 6.2, color: '#F7E5B2' },
              { left: '88%', delay: 0.9, duration: 5.9, color: '#FAF7F0' },
            ].map((p, i) => (
              <motion.div
                key={i}
                initial={{ y: -12, x: 0, opacity: 0, rotate: 0 }}
                animate={{
                  y: [0, 270],
                  x: [0, 24, -14, 18],
                  opacity: [0, 0.85, 0.85, 0],
                  rotate: [0, 140, 280],
                }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{ left: p.left }}
                className="absolute top-0"
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill={p.color}>
                  <path d="M6 1C8.5 1 11 3.5 11 6C8.5 8.5 5 11 2 10C1 7 3.5 1 6 1Z" />
                </svg>
              </motion.div>
            ))}
          </div>
        )}

        {/* 2. Center Courtyard Carved Gift Bench Holding Bountiful Wrapped Gifts */}
        <div className="hidden sm:flex absolute bottom-[52px] left-1/2 -translate-x-1/2 z-10 pointer-events-none flex-col items-center">
          {/* Bountiful Stacked Gift Parcels Waiting on Bench (Fade gently as kids claim theirs) */}
          <AnimatePresence>
            {phase === 'running' && (
              <motion.div
                key={`courtyard-gift-pile-${cycleId}`}
                initial={{ opacity: 0, y: -10, scale: 0.9 }}
                animate={{ opacity: 1, y: [0, -3, 0], scale: 1 }}
                exit={{ opacity: 0, scale: 1.12, y: -12 }}
                transition={{
                  opacity: { duration: 0.35 },
                  y: { repeat: Infinity, duration: 2.1, ease: 'easeInOut' },
                }}
                className="relative -mb-2 flex items-end gap-1.5"
              >
                <div className="absolute -inset-4 rounded-full bg-[#FFF7DC]/70 blur-lg" />
                {/* Tall Coral Box */}
                <svg viewBox="0 0 42 46" className="w-10 h-11 relative drop-shadow-xs" fill="none">
                  <rect x="4" y="14" width="32" height="28" rx="4" fill={currentGift.boxColor} stroke="#43332C" strokeWidth="1.6" />
                  <rect x="2" y="9" width="36" height="8" rx="2.5" fill={currentGift.boxShade} stroke="#43332C" strokeWidth="1.6" />
                  <rect x="17" y="9" width="6" height="33" fill={currentGift.ribbonColor} />
                  <path d="M20 9C16 2 10 4 12 9Z" fill={currentGift.ribbonColor} stroke="#43332C" strokeWidth="1.2" />
                  <path d="M20 9C24 2 30 4 28 9Z" fill={currentGift.ribbonColor} stroke="#43332C" strokeWidth="1.2" />
                </svg>
                {/* Wide Center Box with Cute Paper Tag */}
                <svg viewBox="0 0 54 44" className="w-12 h-10 relative drop-shadow-xs" fill="none">
                  <rect x="4" y="12" width="44" height="28" rx="4" fill="#E5F2EE" stroke="#43332C" strokeWidth="1.6" />
                  <rect x="2" y="7" width="48" height="8" rx="2.5" fill="#C6DDD5" stroke="#43332C" strokeWidth="1.6" />
                  <rect x="23" y="7" width="6" height="33" fill="#A84637" />
                  <path d="M26 7C21 0 15 2 17 7Z" fill="#A84637" stroke="#43332C" strokeWidth="1.2" />
                  <path d="M26 7C31 0 37 2 35 7Z" fill="#A84637" stroke="#43332C" strokeWidth="1.2" />
                  <rect x="33" y="18" width="10" height="7" rx="1.5" fill="#FFFDF7" stroke="#43332C" strokeWidth="1" transform="rotate(-10 33 18)" />
                </svg>
                {/* Butter Yellow Box */}
                <svg viewBox="0 0 42 40" className="w-9 h-9 relative drop-shadow-xs" fill="none">
                  <rect x="4" y="10" width="32" height="26" rx="4" fill="#FAF0DA" stroke="#43332C" strokeWidth="1.6" />
                  <rect x="2" y="6" width="36" height="7" rx="2.5" fill="#EAD6AF" stroke="#43332C" strokeWidth="1.6" />
                  <rect x="17" y="6" width="6" height="30" fill="#C69749" />
                  <path d="M20 6C16 0 11 2 13 6Z" fill="#C69749" stroke="#43332C" strokeWidth="1.2" />
                  <path d="M20 6C24 0 29 2 27 6Z" fill="#C69749" stroke="#43332C" strokeWidth="1.2" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Vintage Wooden Garden Bench */}
          <svg viewBox="0 0 160 28" className="w-40 h-auto drop-shadow-xs" fill="none">
            <rect x="8" y="6" width="144" height="7" rx="3" fill="#D5BFA2" stroke="#6E5744" strokeWidth="1.4" />
            <rect x="22" y="13" width="9" height="14" rx="2" fill="#8E725A" stroke="#5A4535" strokeWidth="1.3" />
            <rect x="129" y="13" width="9" height="14" rx="2" fill="#8E725A" stroke="#5A4535" strokeWidth="1.3" />
          </svg>
        </div>

        {/* Side Basket Parcels Near Left & Right Children */}
        <AnimatePresence>
          {phase === 'running' && (
            <>
              <motion.div
                key={`left-gift-${cycleId}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1, y: shouldReduceMotion ? 0 : [0, -3, 0] }}
                exit={{ opacity: 0, scale: 1.2, y: -10 }}
                transition={{ y: { repeat: Infinity, duration: 1.9, ease: 'easeInOut' } }}
                className="absolute bottom-[36px] left-[22%] sm:left-[23%] z-10 pointer-events-none"
              >
                <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-xs" fill="none">
                  <rect x="5" y="13" width="32" height="25" rx="4" fill={currentGift.boxColor} stroke="#43332C" strokeWidth="1.6" />
                  <rect x="3" y="8" width="36" height="8" rx="2.5" fill={currentGift.boxShade} stroke="#43332C" strokeWidth="1.6" />
                  <rect x="18" y="8" width="6" height="30" fill={currentGift.ribbonColor} />
                  <path d="M21 8C17 2 11 4 13 8Z" fill={currentGift.ribbonColor} stroke="#43332C" strokeWidth="1.2" />
                  <path d="M21 8C25 2 31 4 29 8Z" fill={currentGift.ribbonColor} stroke="#43332C" strokeWidth="1.2" />
                </svg>
              </motion.div>

              <motion.div
                key={`right-gift-${cycleId}`}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1, y: shouldReduceMotion ? 0 : [0, -3, 0] }}
                exit={{ opacity: 0, scale: 1.2, y: -10 }}
                transition={{ y: { repeat: Infinity, duration: 2.0, delay: 0.25, ease: 'easeInOut' } }}
                className="absolute bottom-[36px] right-[14%] sm:right-[18%] z-10 pointer-events-none"
              >
                <svg viewBox="0 0 44 42" className="w-10 h-10 drop-shadow-xs" fill="none">
                  <rect x="5" y="13" width="32" height="25" rx="4" fill="#F9ECE9" stroke="#43332C" strokeWidth="1.6" />
                  <rect x="3" y="8" width="36" height="8" rx="2.5" fill="#EAD0CA" stroke="#43332C" strokeWidth="1.6" />
                  <rect x="18" y="8" width="6" height="30" fill="#215B54" />
                  <path d="M21 8C17 2 11 4 13 8Z" fill="#215B54" stroke="#43332C" strokeWidth="1.2" />
                  <path d="M21 8C25 2 31 4 29 8Z" fill="#215B54" stroke="#43332C" strokeWidth="1.2" />
                </svg>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* 3. FOUR ANIMATED STORYBOOK CHILDREN RUNNING, RECEIVING & CELEBRATING */}
        {STORYBOOK_CHILDREN.map((child, idx) => (
          <motion.div
            key={`${child.id}-${cycleId}`}
            initial={{ left: shouldReduceMotion ? child.endLeft : child.startLeft }}
            animate={{
              left: child.endLeft,
              y: shouldReduceMotion
                ? 0
                : phase === 'running'
                ? [0, -7, 0, -7, 0, -6, 0, -6, 0]
                : phase === 'receiving'
                ? [0, 4, -3, 0]
                : 0,
            }}
            transition={{
              left: {
                duration: phase === 'running' ? 2.3 : 0.35,
                delay: phase === 'running' ? child.delaySeconds : 0,
                ease: [0.22, 1, 0.36, 1],
              },
              y:
                phase === 'running'
                  ? { duration: 2.3, delay: child.delaySeconds, ease: 'easeInOut' }
                  : { duration: 0.55, ease: 'easeOut' },
            }}
            style={
              phase === 'celebrating' && !shouldReduceMotion
                ? { animationDelay: `${idx * 0.14}s` }
                : undefined
            }
            className={`absolute ${child.bottomOffset} -ml-[46px] sm:-ml-[55px] ${child.scaleClass} ${child.zClass} pointer-events-none ${
              phase === 'celebrating' && !shouldReduceMotion ? 'animate-anime-hop' : ''
            }`}
          >
            {/* Sprint Trailing Dust Cloud While Running */}
            <AnimatePresence>
              {phase === 'running' && !shouldReduceMotion && (
                <motion.div
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: [0.65, 0.9, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                  className={`absolute bottom-2 ${
                    child.facing === 'right' ? '-left-6' : '-right-6'
                  } flex items-center gap-1`}
                >
                  <span className="w-4 h-3 rounded-full bg-[#FFFDF8]/85 blur-[1px]" />
                  <span className="w-6 h-[2px] rounded-full bg-[#FAF8F2]/80" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Golden Celebration Burst Halo When Receiving Parcel */}
            <AnimatePresence>
              {phase === 'receiving' && !shouldReduceMotion && (
                <motion.div
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1.25, opacity: [0, 1, 0] }}
                  transition={{ duration: 0.85, delay: idx * 0.08, ease: 'easeOut' }}
                  className="absolute inset-0 -m-2 pointer-events-none flex items-center justify-center"
                >
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-[#C69749]" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cute Floating Handwritten Speech Notes Above Each Child */}
            <AnimatePresence>
              {phase === 'celebrating' && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={
                    shouldReduceMotion
                      ? { opacity: 1, y: 0, scale: 1 }
                      : { opacity: 1, y: [0, -4, 0], scale: 1 }
                  }
                  exit={{ opacity: 0, y: -8 }}
                  transition={{
                    opacity: { duration: 0.35, delay: idx * 0.12 },
                    y: { repeat: Infinity, duration: 1.8 + idx * 0.2, ease: 'easeInOut' },
                  }}
                  className={`absolute -top-9 sm:-top-10 left-1/2 -translate-x-1/2 z-40 px-2.5 py-1 rounded-full border shadow-soft text-[10px] sm:text-[11px] font-serif italic font-bold whitespace-nowrap ${
                    idx % 2 === 0
                      ? 'bg-[#FAF8F3] border-[#C69749] text-[#8D3628]'
                      : 'bg-[#EAF4F0] border-[#8EBAB0] text-[#194641]'
                  } ${idx === 1 || idx === 2 ? 'hidden sm:block' : 'block'}`}
                >
                  {child.speechNote}
                </motion.div>
              )}
            </AnimatePresence>

            <StorybookChildArt
              child={child}
              phase={phase}
              reduceMotion={Boolean(shouldReduceMotion)}
              activeGift={currentGift}
              isLeadChild={idx === 0}
            />
          </motion.div>
        ))}

        {/* Bottom Caption Ribbon Inside Courtyard */}
        <div className="absolute bottom-2.5 left-4 right-4 flex items-center justify-between text-[10px] sm:text-[11px] pointer-events-none z-40">
          <span className="px-2.5 py-0.5 rounded-full bg-[#FAFBF7]/92 border border-[#C7DBD3] font-semibold text-[#192D2A] shadow-xs flex items-center gap-1.5">
            <Gift className="w-3 h-3 text-[#A84637]" />
            <span>
              {phase === 'running'
                ? `Children hurrying for: ${currentGift.label}...`
                : phase === 'receiving'
                ? `Parcels handed out: ${currentGift.label}!`
                : `Joy delivered (${currentGift.label}) — Smiles & thank-you notes`}
            </span>
          </span>
          <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full bg-[#192D2A]/82 text-[#FAF8F3] font-medium">
            Stylized Storybook Illustration &bull; Zero Child Photos
          </span>
        </div>
      </div>

      {/* =================================================================== */}
      {/* CUTE PINNED COURTYARD NOTES & GIFT COMPANION CARDS                  */}
      {/* =================================================================== */}
      <div className="mt-4 pt-4 border-t border-[#D4E2DC]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#215B54]">
            <Feather className="w-3.5 h-3.5 text-[#A84637]" />
            <span>Cute Parcel Notes &amp; Gratitude Postcards</span>
          </div>
          <span className="text-[11px] font-medium text-[#4F615C] italic flex items-center gap-1">
            <Heart className="w-3 h-3 text-[#A84637]" />
            <span>Current bundle note: &ldquo;{currentGift.companionNote}&rdquo;</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {EXTRA_CUTE_NOTES.map((note, idx) => (
            <motion.div
              key={idx}
              whileHover={shouldReduceMotion ? undefined : { y: -3, rotate: 0, scale: 1.02 }}
              onClick={() => triggerNextGift(idx % GIFT_BUNDLES.length)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  triggerNextGift(idx % GIFT_BUNDLES.length);
                }
              }}
              className={`relative rounded-2xl border border-dashed ${note.border} ${note.bg} p-3.5 shadow-soft-sm cursor-pointer transition ${
                shouldReduceMotion ? '' : note.tilt
              } hover:rotate-0`}
            >
              {/* Mini Washi Tape Strip */}
              <div
                aria-hidden="true"
                className={`absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-3 rounded-xs border border-dashed opacity-90 ${note.tape}`}
              />
              <p className="font-serif italic text-xs text-[#192D2A] leading-relaxed pt-1">
                &ldquo;{note.text}&rdquo;
              </p>
              <div className="mt-2 pt-1.5 border-t border-black/5 flex items-center justify-between text-[10px] font-semibold text-[#4F615C]">
                <span>{note.from}</span>
                <span className="text-[#A84637]">Send &rarr;</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
