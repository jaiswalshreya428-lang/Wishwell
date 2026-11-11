import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion, Variants } from 'framer-motion';
import {
  ShieldCheck,
  PackageCheck,
  Lock,
  ChevronDown,
  ArrowRight,
  EyeOff,
  CheckCircle2,
  Calendar,
  Sparkles,
  HeartHandshake,
  FileCheck,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  SchoolBagIllustration,
  BooksIllustration,
  WinterCoatIllustration,
  BirthdayCakeIllustration,
  LunchboxIllustration,
  ShoesIllustration,
  HomeIllustration,
  DeliveryBoxIllustration,
  HeartIllustration,
  CategoryIllustration,
} from '../illustrations/Illustrations';
import { SkeletonWishGrid } from '../common/SkeletonCard';
import { api } from '../../api/endpoints';
import { OpenWishViewItem } from '../../types';
import { FairyLights } from '../atmosphere/FairyLights';
import { FirefliesCanvas } from '../atmosphere/FirefliesCanvas';
import { AnimePetalsCanvas } from '../atmosphere/AnimePetalsCanvas';
import { HeroGlowBlobs } from '../atmosphere/HeroGlowBlobs';
import { PaperCutSkyline } from '../atmosphere/PaperCutSkyline';
import { VintageWishingWell } from '../atmosphere/VintageWishingWell';
import { StorybookGiftScene } from '../atmosphere/StorybookGiftScene';
import {
  WashiTape,
  PaperTagPin,
  DoodleArrow,
  DoodleStar,
  TornPaperDivider,
  VintageWaxSeal,
} from '../atmosphere/HandmadeAccents';
import { getCategoryTheme } from '../../utils/categoryColors';

interface LandingPageProps {
  onBrowseWishes: () => void;
  onRegister: () => void;
  onExploreFlow?: () => void;
  onClaimWish?: (wish: OpenWishViewItem) => void;
}

// Live fictional ticker items for recent fulfillment celebration
const RECENT_FULFILLMENTS = [
  { home: "St. Jude's Children's Home", item: '15 Winter Coats', city: 'Denver, CO', time: '12m ago' },
  { home: 'Hope Haven Orphanage', item: '30 Math Textbooks', city: 'Austin, TX', time: '28m ago' },
  { home: 'Sunlight Youth Shelter', item: '25 School Backpacks', city: 'Seattle, WA', time: '1h ago' },
  { home: "Grace Children's Village", item: '18 Pairs of Sneakers', city: 'Atlanta, GA', time: '2h ago' },
  { home: 'Cedar Springs Care Home', item: '40 Insulated Lunchboxes', city: 'Portland, OR', time: '3h ago' },
];

// Impact Category distribution data for the Recharts visualization
const CATEGORY_IMPACT_DATA = [
  { category: 'School & Books', delivered: 1420, color: '#215B54' },
  { category: 'Warm Clothing', delivered: 980, color: '#A84637' },
  { category: 'Nutrition', delivered: 640, color: '#C69749' },
  { category: 'Shoes & Sports', delivered: 490, color: '#4E8089' },
  { category: 'Bedding & Linen', delivered: 320, color: '#5E4B6B' },
];

// Fallback featured wishes in case local database has fewer open wishes
const FALLBACK_FEATURED_WISHES: OpenWishViewItem[] = [
  {
    wish_id: 901,
    wish_title: 'Sturdy Waterproof School Bags for Elementary Students',
    item_name: 'Ergonomic Backpacks',
    wish_description: 'Durable waterproof backpacks with padded shoulder straps for 24 children beginning their new school term.',
    qty_requested: 24,
    qty_claimed: 16,
    qty_remaining: 8,
    category_id: 1,
    category_name: 'Education',
    needed_by: '2026-12-15',
    wish_status: 'open',
    institution_id: 1,
    institution_name: "St. Mary's Children's Home",
    institution_city: 'Seattle',
    institution_state: 'WA',
  },
  {
    wish_id: 902,
    wish_title: 'Heavy Winter Fleece Jackets (Sizes 8–14)',
    item_name: 'Winter Fleece Jackets',
    wish_description: 'Warm insulated winter coats for cold mountain winter nights. Essential for the upcoming December cold snap.',
    qty_requested: 30,
    qty_claimed: 21,
    qty_remaining: 9,
    category_id: 2,
    category_name: 'Clothing',
    needed_by: '2026-12-05',
    wish_status: 'open',
    institution_id: 2,
    institution_name: 'Hope Ridge Care Haven',
    institution_city: 'Boulder',
    institution_state: 'CO',
  },
  {
    wish_id: 903,
    wish_title: 'Nutritious Lunch Bento Boxes with Thermal Bottles',
    item_name: 'Stainless Steel Lunchboxes',
    wish_description: 'Food-grade stainless steel bento lunchboxes to keep daily meals warm during school days.',
    qty_requested: 35,
    qty_claimed: 30,
    qty_remaining: 5,
    category_id: 4,
    category_name: 'Food & Nutrition',
    needed_by: '2026-12-20',
    wish_status: 'open',
    institution_id: 3,
    institution_name: "Cedar Grove Youth Home",
    institution_city: 'Portland',
    institution_state: 'OR',
  },
];

// Frequently Asked Questions
const FAQ_ITEMS = [
  {
    question: 'Why do you strictly prohibit photos of children?',
    answer:
      "Children in welfare homes deserve uncompromised dignity, privacy, and safety from digital exploitation. Our platform enforces an absolute zero-photo policy regarding children. Delivery verification is done solely via photos of delivered item packages, storage shelving, and official receipts with EXIF camera metadata automatically stripped.",
  },
  {
    question: 'How are children’s homes verified before they can list wishes?',
    answer:
      'We use a multi-tiered document verification workflow. Homes must submit valid institutional registration certificates, tax exemption records, and license documentation. An assigned Field Verifier reviews credentials, conducts identity checks, and issues a formal recommendation. Only after final Administrator sign-off can an institution publish wishes.',
  },
  {
    question: 'How do donors deliver claimed items?',
    answer:
      'When you pledge to fulfill an item, you receive the verified institution’s direct postal shipping address. You can purchase items online (via Amazon, Target, Walmart, etc.) and ship directly to the home, or deliver locally. You simply paste the parcel tracking number into WishWell to keep the home updated.',
  },
  {
    question: 'Can I pledge a partial quantity of a large wish?',
    answer:
      'Yes! If a home requests 30 winter jackets, you can claim 2, 5, or all 30 depending on your budget. Our transactional database utilizes pessimistic row locking (UPDLOCK / HOLDLOCK) to ensure simultaneous pledges never over-claim any wish.',
  },
  {
    question: 'Are cash donations accepted on WishWell?',
    answer:
      'No. WishWell is strictly an item-only donation platform. We believe direct, tangible goods eliminate overhead, prevent fund diversion, and provide 100% transparency to both donors and institutions.',
  },
];

/**
 * Animated Counter Component with ease-out numeric progression
 * Includes a friendly star sparkle burst upon count completion
 */
const AnimatedCounter: React.FC<{ value: number; suffix?: string; duration?: number }> = ({
  value,
  suffix = '',
  duration = 1.8,
}) => {
  const [count, setCount] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setCount(value);
      setIsDone(true);
      return;
    }

    let start = 0;
    const end = value;
    const startTime = performance.now();
    const durationMs = duration * 1000;

    const updateCount = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic: 1 - (1 - t)^3
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeProgress * (end - start) + start));

      if (progress < 1) {
        requestAnimationFrame(updateCount);
      } else {
        setCount(end);
        setIsDone(true);
      }
    };

    requestAnimationFrame(updateCount);
  }, [value, duration, shouldReduceMotion]);

  return (
    <span className="relative inline-flex items-center font-feature-tabular">
      <span>
        {count.toLocaleString()}
        {suffix}
      </span>
      {isDone && !shouldReduceMotion && (
        <motion.span
          initial={{ scale: 0, opacity: 0, rotate: -25 }}
          animate={{ scale: [0, 1.4, 1], opacity: 1, rotate: 0 }}
          transition={{ duration: 0.45 }}
          className="ml-1 inline-block -mt-1 text-marigold-500"
          title="Goal Verified"
        >
          <DoodleStar size={15} />
        </motion.span>
      )}
    </span>
  );
};

export const LandingPage: React.FC<LandingPageProps> = ({
  onBrowseWishes,
  onRegister,
  onExploreFlow,
  onClaimWish,
}) => {
  const shouldReduceMotion = useReducedMotion();

  // Open FAQ accordion index
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Active step in How it Works
  const [activeStep, setActiveStep] = useState(0);

  // Real open wishes from the API
  const [featuredWishes, setFeaturedWishes] = useState<OpenWishViewItem[]>([]);
  const [wishesLoading, setWishesLoading] = useState(true);

  // Current ticker item
  const [tickerIndex, setTickerIndex] = useState(0);

  // Shared trigger syncing Well coin toss -> Storybook courtyard gift delivery
  const [giftTriggerCount, setGiftTriggerCount] = useState(0);

  // Rotate ticker item every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % RECENT_FULFILLMENTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Fetch featured open wishes from the API
  useEffect(() => {
    let isMounted = true;
    setWishesLoading(true);
    api.wishes
      .list({ limit: 6 })
      .then((res) => {
        if (!isMounted) return;
        if (res.items && res.items.length > 0) {
          setFeaturedWishes(res.items.slice(0, 3));
        } else {
          setFeaturedWishes(FALLBACK_FEATURED_WISHES);
        }
      })
      .catch(() => {
        if (isMounted) {
          setFeaturedWishes(FALLBACK_FEATURED_WISHES);
        }
      })
      .finally(() => {
        if (isMounted) setWishesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const formatNeededBy = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 0) return 'Urgent: Due today';
      if (diffDays === 1) return 'Due tomorrow';
      if (diffDays <= 7) return `Needed in ${diffDays} days`;
      return `Needed by ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    } catch {
      return dateStr;
    }
  };

  const handleClaim = (wish: OpenWishViewItem) => {
    if (onClaimWish) {
      onClaimWish(wish);
    } else {
      onBrowseWishes();
    }
  };

  // Motion variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: 0.1,
      },
    },
  };

  const itemFadeUp: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: 'easeOut' },
    },
  };

  return (
    <div className="space-y-24 sm:space-y-32 pb-24 overflow-x-hidden selection:bg-terracotta-100 selection:text-terracotta-900">
      {/* ========================================================================= */}
      {/* 1. HERO SECTION — SOOTHING MISTY MINERAL SPRING & ANIME STORYBOOK         */}
      {/* ========================================================================= */}
      <section
        style={{ backgroundColor: '#DFEEF2' }}
        className="relative pt-8 sm:pt-14 pb-0 overflow-hidden bg-gradient-to-b from-[#DFEEF2] via-[#E8F3EE] to-[#EFF5F1] text-[#192D2A] border-b border-[#C5DAD7]"
      >
        {/* Fairy lights string across the top of hero */}
        <FairyLights className="absolute top-0 left-0 right-0 z-20" bulbCount={18} />

        {/* Drifting soft sage/parchment mist blobs + breathing glow */}
        <HeroGlowBlobs />

        {/* Subtle anime blossom petals drifting gently across the hero */}
        <AnimePetalsCanvas />

        {/* Floating fireflies / warm lantern dust motes canvas */}
        <FirefliesCanvas
          maxParticlesDesktop={14}
          maxParticlesMobile={7}
          speedMultiplier={0.6}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center pt-4">
            {/* Left Editorial Folio Column */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-7 text-center lg:text-left space-y-6"
            >
              {/* Top Vintage Charter Pill Badge */}
              <motion.div variants={itemFadeUp} className="inline-flex items-center">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FAF7F0]/95 border border-[#C7D6CD] text-xs font-semibold text-[#194641] shadow-xs backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-[#215B54]" />
                  <span>Verified Wishing Well Charter</span>
                  <span className="text-[#C69749]">&bull;</span>
                  <span className="text-[#8D3628] font-medium hidden sm:inline">Zero Photos of Children</span>
                </span>
              </motion.div>

              {/* Main Headline with Self-Drawing Underline */}
              <motion.h1
                variants={itemFadeUp}
                className="font-serif text-4xl sm:text-5xl xl:text-[3.75rem] font-bold text-[#192D2A] tracking-tight leading-[1.08]"
              >
                Real, tangible wishes from{' '}
                <span className="relative inline-block text-[#A84637]">
                  <span className="italic font-semibold">verified children&apos;s homes.</span>
                  {/* Self-drawing SVG Underline */}
                  <svg
                    className="absolute left-0 -bottom-2 w-full h-3 overflow-visible pointer-events-none"
                    viewBox="0 0 400 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <motion.path
                      d="M3 11C70 4 190 2 397 13"
                      stroke="#215B54"
                      strokeWidth="4"
                      strokeLinecap="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{
                        duration: shouldReduceMotion ? 0.01 : 1.2,
                        delay: shouldReduceMotion ? 0 : 0.6,
                        ease: 'easeInOut',
                      }}
                    />
                  </svg>
                </span>
              </motion.h1>

              {/* Subtitle with warm antique vellum scrim for WCAG AA readability */}
              <motion.div
                variants={itemFadeUp}
                className="max-w-2xl mx-auto lg:mx-0 px-5 py-3.5 rounded-2xl bg-[#FAF7F0]/92 border border-[#D4CAB0] shadow-xs backdrop-blur-sm"
              >
                <p className="text-base sm:text-lg text-[#3D4D49] leading-relaxed font-normal">
                  No vague money pools. Cast a pebble of kindness toward document-verified homes listing exact needs—from school bags to winter coats—and receive physical item photo confirmation.
                </p>
              </motion.div>

              {/* Call to Action Buttons */}
              <motion.div
                variants={itemFadeUp}
                className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 pt-1"
              >
                <motion.button
                  whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  onClick={onBrowseWishes}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#A84637] to-[#8D3628] hover:brightness-110 text-[#FAF7F0] font-bold text-sm tracking-wide shadow-warm transition focus-visible:ring-2 focus-visible:ring-[#215B54] flex items-center justify-center gap-2 group"
                >
                  <span>Browse Open Wishes</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </motion.button>
                <motion.button
                  whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  onClick={onRegister}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#FAF7F0] hover:bg-[#EFEAD8] text-[#192D2A] font-bold text-sm border border-[#CBBF9F] shadow-soft transition flex items-center justify-center gap-2"
                >
                  <span>Register as Donor or Home</span>
                </motion.button>
              </motion.div>

              {/* Recently Fulfilled Ticker & Flow Jump Link */}
              <motion.div variants={itemFadeUp} className="space-y-3 pt-1">
                <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#FAF7F0]/95 border border-[#D4CAB0] text-xs text-[#3D4D49] shadow-xs backdrop-blur-sm">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E7D73] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#215B54]"></span>
                  </span>
                  <span className="font-semibold text-[#194641] uppercase tracking-wider text-[10px]">Just Fulfilled:</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={tickerIndex}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.3 }}
                      className="font-medium"
                    >
                      <strong className="text-[#192D2A]">{RECENT_FULFILLMENTS[tickerIndex].home}</strong> received{' '}
                      <span className="text-[#A84637] font-semibold">{RECENT_FULFILLMENTS[tickerIndex].item}</span>{' '}
                      <span className="text-[#4F615C] hidden sm:inline">({RECENT_FULFILLMENTS[tickerIndex].city})</span> &bull;{' '}
                      <span className="text-[#4F615C]">{RECENT_FULFILLMENTS[tickerIndex].time}</span>
                    </motion.span>
                  </AnimatePresence>
                </div>

                {onExploreFlow && (
                  <div>
                    <button
                      onClick={onExploreFlow}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F615C] hover:text-[#215B54] transition"
                    >
                      <span>See the 5-step transparent lifecycle</span>
                      <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>

            {/* Right Interactive Unique Feature: The Courtyard Wishing Well */}
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="lg:col-span-5 max-w-md mx-auto lg:max-w-none w-full"
            >
              <VintageWishingWell
                wishes={featuredWishes.length > 0 ? featuredWishes : FALLBACK_FEATURED_WISHES}
                onSelectWish={handleClaim}
                onBrowseWishes={onBrowseWishes}
                onCoinToss={() => setGiftTriggerCount((c) => c + 1)}
              />
            </motion.div>
          </div>

          {/* Animated Vintage Anime Courtyard Vignette: Multiple Children Running, Receiving Gifts & Notes */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-10 max-w-5xl mx-auto"
          >
            <StorybookGiftScene externalTriggerCount={giftTriggerCount} />
          </motion.div>

          {/* Floating cluster of custom SVG item illustrations */}
          <div className="mt-10 pt-2 relative max-w-5xl mx-auto">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 sm:gap-6 items-center justify-items-center">
              {[
                { component: <SchoolBagIllustration size={68} />, label: 'Backpacks', delay: 0 },
                { component: <WinterCoatIllustration size={68} />, label: 'Winter Coats', delay: 0.1 },
                { component: <BooksIllustration size={68} />, label: 'Books & STEM', delay: 0.2 },
                { component: <LunchboxIllustration size={68} />, label: 'Nutrition', delay: 0.3 },
                { component: <ShoesIllustration size={68} />, label: 'Footwear', delay: 0.4 },
                { component: <BirthdayCakeIllustration size={68} />, label: 'Celebrations', delay: 0.5 },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: shouldReduceMotion ? 0 : [0, idx % 2 === 0 ? -6 : 6, 0],
                  }}
                  transition={{
                    opacity: { duration: 0.5, delay: item.delay },
                    scale: { duration: 0.5, delay: item.delay },
                    y: {
                      repeat: Infinity,
                      duration: 3 + idx * 0.4,
                      ease: 'easeInOut',
                    },
                  }}
                  className="flex flex-col items-center p-3 rounded-2xl bg-[#FAF7F0]/88 backdrop-blur-sm border border-[#D4CAB0] shadow-soft-sm hover:shadow-soft transition group w-full"
                >
                  <div className="transition-transform group-hover:scale-110 duration-200">
                    {item.component}
                  </div>
                  <span className="text-[11px] font-semibold text-ink-700 mt-2 text-center">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Paper-cut skyline at bottom of hero with glowing home windows and wishing well silhouette */}
        <PaperCutSkyline className="mt-8" />
        <TornPaperDivider position="bottom" fillColor="#EFF5F1" />
      </section>

      {/* ========================================================================= */}
      {/* 2. TRUST STRIP (ARCHIVAL PARCHMENT CARDS WITH STITCHED BORDERS)            */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <span className="text-xs font-bold text-[#215B54] uppercase tracking-widest">Uncompromising Standards</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#192D2A] mt-1">
            Why Donors and Institutions Trust WishWell
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Trust Guarantee 1: Document Verification */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="p-6 rounded-3xl bg-[#FAF7F0] border-2 border-dashed border-[#D4CAB0] hover:border-[#215B54] shadow-soft flex flex-col justify-between transition-colors relative"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#E2EEEA] text-[#194641] flex items-center justify-center mb-4 border border-[#BAD5CD]">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#192D2A] mb-2">Two-Step Verification</h3>
              <p className="text-xs sm:text-sm text-[#3D4D49] leading-relaxed">
                Every children&apos;s home undergoes strict document validation with official registration vetting, field verifier recommendation, and final administrator sign-off before listing wishes.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5DEC9] flex items-center text-[11px] font-semibold text-[#194641]">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              <span>Document-Verified Institutions</span>
            </div>
          </motion.div>

          {/* Trust Guarantee 2: Item-Only Photo Proof */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.4, delay: 0.12 }}
            className="p-6 rounded-3xl bg-[#FAF7F0] border-2 border-dashed border-[#D4CAB0] hover:border-[#A84637] shadow-soft flex flex-col justify-between transition-colors relative"
          >
            <VintageWaxSeal className="absolute -top-3 -right-2 rotate-12" />
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#F9ECE9] text-[#8D3628] flex items-center justify-center mb-4 border border-[#EBC2BA]">
                <PackageCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#192D2A] mb-2">Item-Only Delivery Proof</h3>
              <p className="text-xs sm:text-sm text-[#3D4D49] leading-relaxed">
                Confirmations require photos of the delivered physical items only. Strictly zero photographs of children are permitted, guaranteeing child safety, dignity, and privacy.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5DEC9] flex items-center text-[11px] font-semibold text-[#8D3628]">
              <EyeOff className="w-3.5 h-3.5 mr-1" />
              <span>100% Child Privacy Protection</span>
            </div>
          </motion.div>

          {/* Trust Guarantee 3: Append-Only Audit Log */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            transition={{ duration: 0.4, delay: 0.19 }}
            className="p-6 rounded-3xl bg-[#FAF7F0] border-2 border-dashed border-[#D4CAB0] hover:border-[#C69749] shadow-soft flex flex-col justify-between transition-colors relative"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-[#FAF2DF] text-[#815D1E] flex items-center justify-center mb-4 border border-[#ECDAA9]">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-[#192D2A] mb-2">Tamper-Evident Audit Chain</h3>
              <p className="text-xs sm:text-sm text-[#3D4D49] leading-relaxed">
                Every claim, status shift, and confirmation is cryptographically sealed in an append-only SHA-256 hash chain with database row-level locks preventing race conditions.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-[#E5DEC9] flex items-center text-[11px] font-semibold text-[#815D1E]">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#C69749]" />
              <span>SHA-256 Cryptographic Chain</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ANIMATED "HOW IT WORKS" (VINTAGE LINEN FOLIO + TRAVELLING PARCEL)      */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-4xl bg-gradient-to-b from-[#F5F1E3] via-[#FAF7EE] to-[#EDE8D6] border border-[#D4CAB0] p-8 sm:p-12 shadow-soft-sm relative overflow-hidden vintage-double-frame">
          {/* Subtle decorative warm watermark */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 w-80 h-80 rounded-full bg-[#ECD8A3]/40 blur-3xl"
          />

          <div className="text-center max-w-2xl mx-auto mb-10 relative z-10">
            <span className="text-xs font-bold text-[#8D3628] uppercase tracking-widest">Transparent Lifecycle</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#192D2A] mt-2">
              How WishWell Connects Homes &amp; Donors
            </h2>
            <p className="text-sm text-[#4F615C] mt-2">
              A closed-loop platform guaranteeing that every pledged item reaches the verified home.
            </p>
          </div>

          {/* Dotted Connecting Progress Track with Travelling Delivery Box */}
          <div className="hidden md:block relative max-w-4xl mx-auto mb-10 px-8">
            <div className="h-0.5 w-full border-t-2 border-dashed border-[#C69749]/70 relative top-3" />
            <motion.div
              animate={{
                left: `${(activeStep / 4) * 100}%`,
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 120 }}
              className="absolute -top-3 -translate-x-1/2 z-20 pointer-events-none"
            >
              <div className="p-1 rounded-xl bg-[#FAF7F0] shadow-soft border border-[#C69749] flex items-center justify-center">
                <DeliveryBoxIllustration size={26} />
              </div>
            </motion.div>
          </div>

          {/* Step Navigation Pill Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8 flex-wrap relative z-10">
            {['1. Post Wish', '2. Pledge', '3. Deliver', '4. Photo Proof', '5. Gratitude'].map((label, idx) => (
              <button
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${activeStep === idx
                    ? 'bg-[#A84637] text-[#FAF7F0] shadow-warm scale-105'
                    : 'bg-[#FFFDF8] text-[#4F615C] border border-[#D4CAB0] hover:bg-[#F3EFE2]'
                  }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 5-Step Cards Grid with Stitched Borders */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative z-10">
            {[
              {
                num: '01',
                title: 'Home Lists Needs',
                desc: 'Verified directors specify exact item description, needed quantity, category, and deadline.',
                icon: <HomeIllustration size={44} />,
              },
              {
                num: '02',
                title: 'Donor Claims Items',
                desc: 'Donors pledge full or partial quantities. Pessimistic row locks prevent double-pledging.',
                icon: <HeartIllustration size={44} />,
              },
              {
                num: '03',
                title: 'Direct Delivery',
                desc: 'Donor orders or delivers items directly to the verified physical address with tracking.',
                icon: <DeliveryBoxIllustration size={44} />,
              },
              {
                num: '04',
                title: 'Item Photo Proof',
                desc: 'Home uploads item-only photos (EXIF stripped) confirming goods arrived in great condition.',
                icon: <SchoolBagIllustration size={44} />,
              },
              {
                num: '05',
                title: 'Thank-You Note',
                desc: 'Home sends a heartfelt thank-you message; donor impact counters update permanently.',
                icon: <BirthdayCakeIllustration size={44} />,
              },
            ].map((step, idx) => {
              const isHighlighted = activeStep === idx;
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={shouldReduceMotion ? undefined : { y: -4 }}
                  transition={{ duration: 0.35, delay: idx * 0.08 }}
                  onClick={() => setActiveStep(idx)}
                  className={`p-6 rounded-3xl bg-[#FFFDF8] border-2 border-dashed transition-all cursor-pointer flex flex-col justify-between ${isHighlighted
                      ? 'border-[#A84637] shadow-warm ring-4 ring-[#A84637]/15 scale-[1.02]'
                      : 'border-[#D4CAB0] shadow-soft hover:border-[#A84637]/60'
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-serif text-2xl font-black text-[#B8AD92]">{step.num}</span>
                      <div>{step.icon}</div>
                    </div>
                    <h3 className="font-serif text-base font-bold text-[#192D2A] mb-2">{step.title}</h3>
                    <p className="text-xs text-[#4F615C] leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#E5DEC9] flex items-center justify-between text-[10px] font-semibold text-[#8D3628]">
                    <span>Step {idx + 1} of 5</span>
                    {isHighlighted && <span className="text-[#215B54]">&bull; Active Step</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. LIVE IMPACT STATS WITH MINERAL SPRING & PARCHMENT LEDGER CARD          */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-4xl bg-gradient-to-br from-[#DCE9E5] via-[#FAF7F0] to-[#ECE7D8] border border-[#C7D6CD] p-8 sm:p-12 shadow-soft text-[#192D2A] relative overflow-hidden vintage-double-frame">
          {/* Subtle aqua glow inside stats card */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#215B54]/12 blur-3xl animate-lamp-glow"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Numeric Counters */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-[#215B54] uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#C69749]" />
                  <span>Demonstrated Impact</span>
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#192D2A] mt-1.5">
                  Every Number Is a <span className="italic font-semibold text-[#A84637]">Real Child</span> Supported
                </h2>
                <p className="text-xs sm:text-sm text-[#3D4D49] mt-2 leading-relaxed">
                  WishWell matches tangible essentials directly with verified children&apos;s homes. Here is what donors and homes have accomplished together.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#D4CAB0] shadow-xs">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[#A84637]">
                    <AnimatedCounter value={480} suffix="+" />
                  </div>
                  <p className="text-xs font-semibold text-[#192D2A] mt-1">Wishes Fulfilled</p>
                  <p className="text-[11px] text-[#4F615C]">100% item matched</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#D4CAB0] shadow-xs">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[#215B54]">
                    <AnimatedCounter value={42} suffix="" />
                  </div>
                  <p className="text-xs font-semibold text-[#192D2A] mt-1">Verified Homes</p>
                  <p className="text-[11px] text-[#4F615C]">Document approved</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#D4CAB0] shadow-xs">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[#4E8089]">
                    <AnimatedCounter value={3850} suffix="+" />
                  </div>
                  <p className="text-xs font-semibold text-[#192D2A] mt-1">Items Delivered</p>
                  <p className="text-[11px] text-[#4F615C]">Direct to institution</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FFFDF8] border border-[#D4CAB0] shadow-xs">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[#A5792F]">
                    <AnimatedCounter value={100} suffix="%" />
                  </div>
                  <p className="text-xs font-semibold text-[#192D2A] mt-1">Item Photo Proof</p>
                  <p className="text-[11px] text-[#4F615C]">Zero child photos</p>
                </div>
              </div>
            </div>

            {/* Mini Recharts Bar Chart */}
            <div className="lg:col-span-7 bg-[#FFFDF8] p-6 sm:p-8 rounded-3xl border border-[#D4CAB0] shadow-soft backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#192D2A]">Items Delivered by Category</h3>
                  <p className="text-xs text-[#4F615C]">Distribution of verified physical goods provided</p>
                </div>
                <span className="text-[11px] font-semibold text-[#194641] bg-[#E2EEEA] px-2.5 py-1 rounded-full border border-[#BAD5CD]">
                  Live Audit Data
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={CATEGORY_IMPACT_DATA}
                    layout="vertical"
                    margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="category"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#3D4D49', fontSize: 12, fontWeight: 500 }}
                      width={110}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-[#FAF7EF] text-[#1D2927] border border-[#D4CAB0] p-2.5 rounded-xl shadow-soft text-xs">
                              <p className="font-bold text-[#1D2927]">{data.category}</p>
                              <p className="text-[#24635C] font-feature-tabular font-semibold">
                                {data.delivered.toLocaleString()} items delivered
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="delivered" radius={[0, 8, 8, 0]}>
                      {CATEGORY_IMPACT_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 pt-4 border-t border-[#E5DEC9] flex items-center justify-between text-xs text-[#53645F]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#24635C]" />
                  Verified physical receipts on file
                </span>
                <button
                  onClick={onBrowseWishes}
                  className="font-bold text-[#24635C] hover:text-[#1B4D48] transition"
                >
                  View All Open Wishes &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FEATURED OPEN WISHES (WASHI TAPE + PAPER TAG PINS + VELLUM CARDS)      */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#8D3628] uppercase tracking-widest">Active Needs</span>
              <DoodleStar size={16} className="animate-anime-sparkle" />
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#192D2A] mt-1 flex items-center gap-2">
              <span>Featured Wishes Ready for Pledging</span>
            </h2>
            <p className="text-sm text-[#4F615C] mt-2 max-w-xl">
              Verified homes with urgent pending needs. Pledge partial or full item quantities with guaranteed delivery tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBrowseWishes}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#FAF7F0] hover:bg-[#EFEAD8] text-[#192D2A] font-bold text-xs border border-[#D4CAB0] shadow-soft transition self-start md:self-auto hover:shadow-warm"
            >
              <span>Browse All Wishes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <DoodleArrow className="hidden lg:block -mb-2" />
          </div>
        </div>

        {/* Wishes Grid */}
        {wishesLoading ? (
          <SkeletonWishGrid count={3} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
            {featuredWishes.map((wish, index) => {
              const theme = getCategoryTheme(wish.category_name);
              const percentClaimed = Math.min(
                100,
                Math.round((wish.qty_claimed / wish.qty_requested) * 100)
              );
              // Slight friendly handmade tilt that straightens on hover
              const tiltClass =
                index % 3 === 0
                  ? '-rotate-[0.8deg]'
                  : index % 3 === 1
                    ? 'rotate-[0.7deg]'
                    : '-rotate-[0.5deg]';

              return (
                <motion.div
                  key={wish.wish_id}
                  initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  animate={
                    shouldReduceMotion
                      ? undefined
                      : {
                        y: [0, -3.5, 0],
                      }
                  }
                  transition={{
                    opacity: { duration: 0.35, delay: index * 0.08 },
                    y: shouldReduceMotion
                      ? undefined
                      : {
                        duration: 4.5 + (index % 3) * 0.8,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: index * 0.4,
                      },
                  }}
                  whileHover={shouldReduceMotion ? undefined : { y: -7, rotate: 0, scale: 1.01 }}
                  className={`bg-[#FAF7F0] rounded-3xl border-2 border-dashed ${theme.border} hover:border-[#A84637] p-6 flex flex-col justify-between shadow-soft hover:shadow-card transition-all duration-200 relative overflow-hidden group ${shouldReduceMotion ? '' : tiltClass
                    } hover:rotate-0`}
                >
                  {/* Category gentle gradient header wash */}
                  <div
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-0 left-0 right-0 h-24 bg-gradient-to-b ${theme.gradient} opacity-80`}
                  />

                  {/* Homely Handmade Accents: Washi Tape & Brass Tag Pin */}
                  <WashiTape
                    position={index % 2 === 0 ? 'top-right' : 'top-left'}
                    color={theme.washiColor}
                  />
                  <PaperTagPin />

                  <div className="pt-2 relative z-10">
                    {/* Top Row: Category Illustration & Badges */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="p-2 rounded-2xl bg-[#FFFDF8] border border-[#E5DEC9] shadow-soft-sm">
                        <CategoryIllustration category={wish.category_name} size={46} />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                          {wish.category_name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1B4D48] bg-[#E4F0ED] px-2 py-0.5 rounded-full border border-[#BADAD3]">
                          <ShieldCheck className="w-3 h-3 text-[#24635C]" />
                          Verified
                        </span>
                      </div>
                    </div>

                    {/* Wish Title & Item */}
                    <h3
                      onClick={() => handleClaim(wish)}
                      className="font-serif text-lg font-bold text-[#192D2A] hover:text-[#A84637] cursor-pointer transition line-clamp-1"
                    >
                      {wish.wish_title}
                    </h3>
                    <p className="text-xs font-semibold text-[#8D3628] mt-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#C69749]" />
                      <span>Item: {wish.item_name}</span>
                    </p>
                    <p className="text-xs text-[#4F615C] mt-2 line-clamp-2 leading-relaxed">
                      {wish.wish_description}
                    </p>

                    {/* Institution */}
                    <div className="mt-4 pt-4 border-t border-[#E5DEC9] flex items-center justify-between text-xs text-ink-500">
                      <div className="truncate mr-2">
                        <span className="font-semibold text-ink-800 block truncate">
                          {wish.institution_name}
                        </span>
                        <span className="text-[11px] text-ink-500">
                          {wish.institution_city}, {wish.institution_state}
                        </span>
                      </div>
                      <span className="text-[11px] font-feature-tabular text-ink-500">
                        {wish.qty_remaining} left
                      </span>
                    </div>

                    {/* Fulfillment Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-medium text-ink-700 font-feature-tabular">
                        <span>{wish.qty_claimed} of {wish.qty_requested} pledged</span>
                        <span className="font-bold text-[#8D3628]">{percentClaimed}%</span>
                      </div>
                      <div className="w-full bg-[#E5DEC9] rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-[#A84637] h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentClaimed}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="mt-6 pt-4 border-t border-[#E5DEC9] flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-500">
                      <Calendar className="w-3.5 h-3.5 text-ink-400" />
                      {formatNeededBy(wish.needed_by)}
                    </span>
                    <motion.button
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                      onClick={() => handleClaim(wish)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#A84637] to-[#8D3628] hover:brightness-110 text-[#FAF7F0] font-bold text-xs shadow-warm transition focus-visible:ring-2 focus-visible:ring-[#215B54]"
                    >
                      Pledge Item &rarr;
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 6. VERIFICATION PROCESS SECTION FOR INSTITUTIONS (DEEP WELL VERDIGRIS)    */}
      {/* ========================================================================= */}
      <section id="verification" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-4xl bg-gradient-to-br from-[#1B3A37] via-[#224743] to-[#142B29] text-[#FAF6EC] p-8 sm:p-14 relative overflow-hidden shadow-teal border border-[#34615C]">
          {/* Decorative brass & teal glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -bottom-20 w-96 h-96 bg-[#5D9E93]/20 blur-3xl rounded-full"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-[#E9C97B] text-xs font-bold uppercase tracking-wider">
                <FileCheck className="w-4 h-4" />
                <span>Rigorous Institutional Onboarding</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight text-[#FAF6EC]">
                Document-Based Verification for Children&apos;s Homes
              </h2>
              <p className="text-xs sm:text-sm text-[#C9DAD5] leading-relaxed">
                WishWell maintains uncompromising vetting before any institution is approved to list wishes.
                Our document-based verification ensures donors know exactly where their items are going while protecting sensitive facility data.
              </p>
              <div className="pt-2">
                <button
                  onClick={onRegister}
                  className="px-6 py-3 rounded-xl bg-[#DFBF72] hover:bg-[#D4A84E] text-[#1D2927] font-bold text-xs shadow-soft transition"
                >
                  Register Your Institution &rarr;
                </button>
              </div>
            </div>

            {/* Verification Stage Cards */}
            <div className="lg:col-span-6 space-y-3">
              {[
                {
                  step: '01',
                  title: 'Official Document Upload',
                  desc: 'Director registers the home and uploads official registration certificates, tax exemption records, and license documentation.',
                },
                {
                  step: '02',
                  title: 'Field Verifier Evaluation',
                  desc: 'An assigned verifier validates certificate authenticity, checks public registry records, and submits a formal recommendation.',
                },
                {
                  step: '03',
                  title: 'Administrator Final Approval',
                  desc: 'System administrators review the audit dossier and activate the account, unlocking verified wish publication privileges.',
                },
              ].map((stage, idx) => (
                <div
                  key={idx}
                  className="p-4 sm:p-5 rounded-2xl bg-[#183330]/75 border border-[#386660] flex items-start gap-4 backdrop-blur-sm"
                >
                  <span className="font-serif text-xl font-bold text-[#DFBF72] shrink-0">{stage.step}</span>
                  <div>
                    <h4 className="font-bold text-sm text-[#FAF6EC] mb-1">{stage.title}</h4>
                    <p className="text-xs text-[#C2D4CE] leading-relaxed">{stage.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FAQ ACCORDION (ARCHIVAL PARCHMENT ACCORDION)                           */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-[#9B3F2A] uppercase tracking-widest">Questions &amp; Answers</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mt-2">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-ink-600 mt-2">
            Everything you need to know about our privacy charter, item delivery, and verification.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-[#FAF7EF] rounded-2xl border border-[#D4CAB0] shadow-soft-sm overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus-visible:ring-2 focus-visible:ring-[#24635C] rounded-2xl"
                  aria-expanded={isOpen}
                >
                  <span className="font-serif text-base sm:text-lg font-bold text-ink-900">
                    {faq.question}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0 text-ink-500"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </motion.div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-ink-600 leading-relaxed border-t border-[#E5DEC9]">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. CALL TO ACTION SECTION BEFORE FOOTER (VENETIAN TERRACOTTA FOLIO)        */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-4xl bg-[#A84637] bg-gradient-to-br from-[#A84637] via-[#983C2E] to-[#722B1F] text-[#FAF7F0] p-8 sm:p-14 text-center shadow-warm relative overflow-hidden border border-[#722B1F]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 bg-[#FAF7F0]/12 blur-3xl rounded-full"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-[#DFC37C]/25 blur-3xl rounded-full"
          />

          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#FAF7F0]/20 text-[#FAF7F0] text-xs font-semibold backdrop-blur-sm border border-[#FAF7F0]/30">
              <HeartHandshake className="w-4 h-4 text-[#FAF7F0]" />
              <span>Join Hundreds of Verified Donors</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold leading-tight text-[#FAF7F0]">
              Bring a <span className="italic font-semibold text-[#F6ECD3]">Tangible Smile</span> to a Child in Need
            </h2>
            <p className="text-xs sm:text-sm text-[#FAF7F0]/90 leading-relaxed max-w-lg mx-auto">
              Choose a wish, order the exact needed item, and receive physical photo proof that your gift made a difference.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                onClick={onBrowseWishes}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#FAF7F0] hover:bg-[#FFFDF8] text-[#8D3628] font-bold text-xs tracking-wide shadow-soft transition"
              >
                Browse Open Wishes Now &rarr;
              </button>
              <button
                onClick={onRegister}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#FAF7F0]/15 hover:bg-[#FAF7F0]/25 text-[#FAF7F0] font-bold text-xs border border-[#FAF7F0]/30 shadow-soft transition backdrop-blur-sm"
              >
                Register Children&apos;s Home
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
