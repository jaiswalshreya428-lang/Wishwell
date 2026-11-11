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
import { HeroGlowBlobs } from '../atmosphere/HeroGlowBlobs';
import { PaperCutSkyline } from '../atmosphere/PaperCutSkyline';
import {
  WashiTape,
  PaperTagPin,
  DoodleArrow,
  DoodleStar,
  TornPaperDivider,
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
  { category: 'School & Books', delivered: 1420, color: '#1F8A7A' },
  { category: 'Warm Clothing', delivered: 980, color: '#E4572E' },
  { category: 'Nutrition', delivered: 640, color: '#F6B93B' },
  { category: 'Shoes & Sports', delivered: 490, color: '#3E8FD1' },
  { category: 'Bedding & Linen', delivered: 320, color: '#533E78' },
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
      {/* 1. HERO SECTION WITH SOOTHING LIGHT BLUE & LIGHT GREEN ATMOSPHERE          */}
      {/* ========================================================================= */}
      <section
        style={{ backgroundColor: '#EFF6FC' }}
        className="relative pt-6 sm:pt-14 pb-0 overflow-hidden bg-gradient-to-b from-[#EFF6FC] via-[#F3F9F7] to-[#E9F5F1] text-[#0F172A] border-b border-[#D8E6F0]"
      >
        {/* Fairy lights string across the top of hero */}
        <FairyLights className="absolute top-0 left-0 right-0 z-20" bulbCount={18} />

        {/* Drifting soft gradient blobs + breathing soothing glow */}
        <HeroGlowBlobs />

        {/* Floating fireflies / dust motes canvas (15 particles) */}
        <FirefliesCanvas
          maxParticlesDesktop={15}
          maxParticlesMobile={8}
          speedMultiplier={0.7}
        />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center space-y-6 max-w-4xl mx-auto pt-6"
          >
            {/* Top Pill Badge */}
            <motion.div variants={itemFadeUp} className="inline-flex items-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/95 border border-[#BAE6FD] text-xs font-semibold text-[#0369A1] shadow-xs backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                <span>A Verified, Privacy-First Matching Platform</span>
                <span className="text-[#BAE6FD]">&bull;</span>
                <span className="text-[#0D9488] font-medium hidden sm:inline">Zero Photos of Children</span>
              </span>
            </motion.div>

            {/* Main Headline with Self-Drawing Underline */}
            <motion.h1
              variants={itemFadeUp}
              className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-[#0F172A] tracking-tight leading-[1.08]"
            >
              Real, tangible wishes from <br className="hidden sm:inline" />
              <span className="relative inline-block text-[#E4572E]">
                <span>verified children&apos;s homes.</span>
                {/* Self-drawing SVG Underline */}
                <svg
                  className="absolute left-0 -bottom-2 w-full h-3 overflow-visible pointer-events-none"
                  viewBox="0 0 400 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <motion.path
                    d="M3 11C70 4 190 2 397 13"
                    stroke="#0284C7"
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

            {/* Subtitle with soft scrim behind text for WCAG AA readability */}
            <motion.div variants={itemFadeUp} className="max-w-2xl mx-auto px-5 py-3 rounded-2xl bg-white/90 border border-[#D5E6F2] shadow-xs backdrop-blur-sm">
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed font-normal">
                No vague money pools. Document-verified homes list exact item needs—from school bags to winter coats.
                Donors pledge items, deliver directly, and receive physical item photo confirmation.
              </p>
            </motion.div>

            {/* Call to Action Buttons */}
            <motion.div
              variants={itemFadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2"
            >
              <motion.button
                whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.02 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                onClick={onBrowseWishes}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-coral-500 to-coral-600 hover:brightness-110 text-white font-bold text-sm tracking-wide shadow-warm transition focus-visible:ring-2 focus-visible:ring-coral-500 flex items-center justify-center gap-2 group"
              >
                <span>Browse Open Wishes</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.button>
              <motion.button
                whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                onClick={onRegister}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-[#EBF4FA] text-[#0F172A] font-bold text-sm border border-[#D0E2EE] shadow-soft transition flex items-center justify-center gap-2"
              >
                <span>Register as Donor or Home</span>
              </motion.button>
            </motion.div>

            {onExploreFlow && (
              <motion.div variants={itemFadeUp} className="pt-1">
                <button
                  onClick={onExploreFlow}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0284C7] transition"
                >
                  <span>See the 5-step transparent lifecycle</span>
                  <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                </button>
              </motion.div>
            )}

            {/* Recently Fulfilled Ticker */}
            <motion.div variants={itemFadeUp} className="pt-2">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 border border-[#D0E2EE] text-xs text-[#475569] shadow-xs backdrop-blur-sm">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
                <span className="font-semibold text-[#0D9488] uppercase tracking-wider text-[10px]">Just Fulfilled:</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={tickerIndex}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="font-medium"
                  >
                    <strong className="text-[#0F172A]">{RECENT_FULFILLMENTS[tickerIndex].home}</strong> received{' '}
                    <span className="text-coral-600 font-semibold">{RECENT_FULFILLMENTS[tickerIndex].item}</span>{' '}
                    <span className="text-[#64748B] hidden sm:inline">({RECENT_FULFILLMENTS[tickerIndex].city})</span> &bull;{' '}
                    <span className="text-[#64748B]">{RECENT_FULFILLMENTS[tickerIndex].time}</span>
                  </motion.span>
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>

          {/* Floating cluster of custom SVG item illustrations */}
          <div className="mt-12 pt-2 relative max-w-4xl mx-auto">
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
                  className="flex flex-col items-center p-3 rounded-2xl bg-white/80 backdrop-blur-sm border border-cream-200 shadow-soft-sm hover:shadow-soft transition group"
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

        {/* Paper-cut skyline at bottom of hero with glowing home windows and subtle parallax */}
        <PaperCutSkyline className="mt-8" />
        <TornPaperDivider position="bottom" fillColor="#F0F6FB" />
      </section>

      {/* ========================================================================= */}
      {/* 2. TRUST STRIP (WITH HOMELY STITCHED BORDERS & CARDS)                     */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-10"
        >
          <span className="text-xs font-bold text-teal-700 uppercase tracking-widest">Uncompromising Standards</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink-900 mt-1">
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
            className="p-6 rounded-3xl bg-white border-2 border-dashed border-cream-300 hover:border-teal-400 shadow-soft flex flex-col justify-between transition-colors relative"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-ink-900 mb-2">Two-Step Verification</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Every children&apos;s home undergoes strict document validation with official registration vetting, field verifier recommendation, and final administrator sign-off before listing wishes.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-cream-100 flex items-center text-[11px] font-semibold text-teal-700">
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
            className="p-6 rounded-3xl bg-white border-2 border-dashed border-cream-300 hover:border-terracotta-400 shadow-soft flex flex-col justify-between transition-colors relative"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-terracotta-50 text-terracotta-700 flex items-center justify-center mb-4">
                <PackageCheck className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-ink-900 mb-2">Item-Only Delivery Proof</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Confirmations require photos of the delivered physical items only. Strictly zero photographs of children are permitted, guaranteeing child safety, dignity, and privacy.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-cream-100 flex items-center text-[11px] font-semibold text-terracotta-700">
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
            className="p-6 rounded-3xl bg-white border-2 border-dashed border-cream-300 hover:border-marigold-400 shadow-soft flex flex-col justify-between transition-colors relative"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-marigold-50 text-marigold-700 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-ink-900 mb-2">Tamper-Evident Audit Chain</h3>
              <p className="text-xs sm:text-sm text-ink-600 leading-relaxed">
                Every claim, status shift, and confirmation is cryptographically sealed in an append-only SHA-256 hash chain with database row-level locks preventing race conditions.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-cream-100 flex items-center text-[11px] font-semibold text-marigold-800">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              <span>SHA-256 Cryptographic Chain</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. ANIMATED "HOW IT WORKS" (WARM PEACH TINT + DOTTED PATH + TRAVELLING BOX) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-4xl bg-gradient-to-b from-[#FDF5F1] via-[#FDF7F3] to-[#FDF5F1] border border-cream-300/80 p-8 sm:p-12 shadow-soft-sm relative overflow-hidden">
          {/* Subtle decorative warm watermark */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 w-80 h-80 rounded-full bg-marigold-100/40 blur-3xl"
          />

          <div className="text-center max-w-2xl mx-auto mb-10 relative z-10">
            <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">Transparent Lifecycle</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mt-2">
              How WishWell Connects Homes & Donors
            </h2>
            <p className="text-sm text-ink-600 mt-2">
              A closed-loop platform guaranteeing that every pledged item reaches the verified home.
            </p>
          </div>

          {/* Dotted Connecting Progress Track with Travelling Delivery Box */}
          <div className="hidden md:block relative max-w-4xl mx-auto mb-10 px-8">
            <div className="h-0.5 w-full border-t-2 border-dashed border-marigold-300 relative top-3" />
            <motion.div
              animate={{
                left: `${(activeStep / 4) * 100}%`,
              }}
              transition={{ type: 'spring', damping: 20, stiffness: 120 }}
              className="absolute -top-3 -translate-x-1/2 z-20 pointer-events-none"
            >
              <div className="p-1 rounded-xl bg-white shadow-soft border border-marigold-300 flex items-center justify-center">
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
                    ? 'bg-terracotta-600 text-white shadow-warm scale-105'
                    : 'bg-white text-ink-600 border border-cream-200 hover:bg-cream-100'
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
                  className={`p-6 rounded-3xl bg-white border-2 border-dashed transition-all cursor-pointer flex flex-col justify-between ${isHighlighted
                      ? 'border-terracotta-500 shadow-warm ring-4 ring-terracotta-500/15 scale-[1.02]'
                      : 'border-cream-300 shadow-soft hover:border-terracotta-300'
                    }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-serif text-2xl font-black text-cream-400">{step.num}</span>
                      <div>{step.icon}</div>
                    </div>
                    <h3 className="font-serif text-base font-bold text-ink-900 mb-2">{step.title}</h3>
                    <p className="text-xs text-ink-600 leading-relaxed">{step.desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-cream-100 flex items-center justify-between text-[10px] font-semibold text-terracotta-700">
                    <span>Step {idx + 1} of 5</span>
                    {isHighlighted && <span className="text-teal-700">&bull; Active Step</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. LIVE IMPACT STATS WITH SOOTHING LIGHT BLUE & GREEN CARD                 */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-4xl bg-white bg-gradient-to-br from-[#F0F7FD] via-[#FFFFFF] to-[#EFF8F5] border border-[#D5E6E3] p-8 sm:p-12 shadow-soft text-[#0F172A] relative overflow-hidden">
          {/* Subtle cyan glow inside stats card */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#38BDF8]/15 blur-3xl animate-lamp-glow"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            {/* Numeric Counters */}
            <div className="lg:col-span-5 space-y-6">
              <div>
                <span className="text-xs font-bold text-[#0284C7] uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span>Demonstrated Impact</span>
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#0F172A] mt-1.5">
                  Every Number Is a Real Child Supported
                </h2>
                <p className="text-xs sm:text-sm text-[#475569] mt-2 leading-relaxed">
                  WishWell matches tangible essentials directly with verified children&apos;s homes. Here is what donors and homes have accomplished together.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-[#D2E2EE] shadow-xs">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-coral-600">
                    <AnimatedCounter value={480} suffix="+" />
                  </div>
                  <p className="text-xs font-semibold text-[#0F172A] mt-1">Wishes Fulfilled</p>
                  <p className="text-[11px] text-[#64748B]">100% item matched</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#D2E2EE] shadow-xs">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[#0D9488]">
                    <AnimatedCounter value={42} suffix="" />
                  </div>
                  <p className="text-xs font-semibold text-[#0F172A] mt-1">Verified Homes</p>
                  <p className="text-[11px] text-[#64748B]">Document approved</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#D2E2EE] shadow-xs">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[#0284C7]">
                    <AnimatedCounter value={3850} suffix="+" />
                  </div>
                  <p className="text-xs font-semibold text-[#0F172A] mt-1">Items Delivered</p>
                  <p className="text-[11px] text-[#64748B]">Direct to institution</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-[#D2E2EE] shadow-xs">
                  <div className="text-2xl sm:text-3xl font-serif font-black text-[#0F172A]">
                    <AnimatedCounter value={100} suffix="%" />
                  </div>
                  <p className="text-xs font-semibold text-[#0F172A] mt-1">Item Photo Proof</p>
                  <p className="text-[11px] text-[#64748B]">Zero child photos</p>
                </div>
              </div>
            </div>

            {/* Mini Recharts Bar Chart */}
            <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-[#D2E2EE] shadow-soft backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#0F172A]">Items Delivered by Category</h3>
                  <p className="text-xs text-[#64748B]">Distribution of verified physical goods provided</p>
                </div>
                <span className="text-[11px] font-semibold text-[#0D9488] bg-[#0D9488]/10 px-2.5 py-1 rounded-full border border-[#0D9488]/20">
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
                      tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                      width={110}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white text-[#0F172A] border border-[#D2E2EE] p-2.5 rounded-xl shadow-soft text-xs">
                              <p className="font-bold text-[#0F172A]">{data.category}</p>
                              <p className="text-[#0284C7] font-feature-tabular font-semibold">
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

              <div className="mt-4 pt-4 border-t border-[#E2EDF5] flex items-center justify-between text-xs text-[#64748B]">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488]" />
                  Verified physical receipts on file
                </span>
                <button
                  onClick={onBrowseWishes}
                  className="font-bold text-[#0284C7] hover:text-[#0369A1] transition"
                >
                  View All Open Wishes &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. FEATURED OPEN WISHES (WASHI TAPE + PAPER TAG PINS + STITCHED BORDERS)  */}
      {/* ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">Active Needs</span>
              <DoodleStar size={16} />
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink-900 mt-1 flex items-center gap-2">
              <span>Featured Wishes Ready for Pledging</span>
            </h2>
            <p className="text-sm text-ink-600 mt-2 max-w-xl">
              Verified homes with urgent pending needs. Pledge partial or full item quantities with guaranteed delivery tracking.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBrowseWishes}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white hover:bg-cream-100 text-ink-800 font-bold text-xs border border-cream-300 shadow-soft transition self-start md:self-auto hover:shadow-warm"
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
                  className={`bg-white rounded-3xl border-2 border-dashed ${theme.border} hover:border-coral-500 p-6 flex flex-col justify-between shadow-soft hover:shadow-card transition-all duration-200 relative overflow-hidden group ${shouldReduceMotion ? '' : tiltClass
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
                      <div className="p-2 rounded-2xl bg-white border border-cream-200 shadow-soft-sm">
                        <CategoryIllustration category={wish.category_name} size={46} />
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                          {wish.category_name}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                          <ShieldCheck className="w-3 h-3 text-teal-600" />
                          Verified
                        </span>
                      </div>
                    </div>

                    {/* Wish Title & Item */}
                    <h3
                      onClick={() => handleClaim(wish)}
                      className="font-serif text-lg font-bold text-ink-900 hover:text-coral-600 cursor-pointer transition line-clamp-1"
                    >
                      {wish.wish_title}
                    </h3>
                    <p className="text-xs font-semibold text-coral-600 mt-1 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Item: {wish.item_name}</span>
                    </p>
                    <p className="text-xs text-ink-600 mt-2 line-clamp-2 leading-relaxed">
                      {wish.wish_description}
                    </p>

                    {/* Institution */}
                    <div className="mt-4 pt-4 border-t border-cream-100 flex items-center justify-between text-xs text-ink-500">
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
                        <span className="font-bold text-coral-600">{percentClaimed}%</span>
                      </div>
                      <div className="w-full bg-cream-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-coral-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percentClaimed}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card Action Footer */}
                  <div className="mt-6 pt-4 border-t border-cream-100 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-500">
                      <Calendar className="w-3.5 h-3.5 text-ink-400" />
                      {formatNeededBy(wish.needed_by)}
                    </span>
                    <motion.button
                      whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                      whileTap={shouldReduceMotion ? undefined : { scale: 0.96 }}
                      onClick={() => handleClaim(wish)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-coral-500 to-coral-600 hover:brightness-110 text-white font-bold text-xs shadow-warm transition focus-visible:ring-2 focus-visible:ring-coral-500"
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
      {/* 6. VERIFICATION PROCESS SECTION FOR INSTITUTIONS */}
      {/* ========================================================================= */}
      <section id="verification" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-4xl bg-teal-900 text-white p-8 sm:p-14 relative overflow-hidden shadow-teal">
          {/* Decorative radial lighting */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -bottom-20 w-96 h-96 bg-teal-500/20 blur-3xl rounded-full"
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 text-marigold-300 text-xs font-bold uppercase tracking-wider">
                <FileCheck className="w-4 h-4" />
                <span>Rigorous Institutional Onboarding</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold leading-tight">
                Document-Based Verification for Children&apos;s Homes
              </h2>
              <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
                WishWell maintains uncompromising vetting before any institution is approved to list wishes.
                Our document-based verification ensures donors know exactly where their items are going while protecting sensitive facility data.
              </p>
              <div className="pt-2">
                <button
                  onClick={onRegister}
                  className="px-6 py-3 rounded-xl bg-marigold-400 hover:bg-marigold-500 text-ink-900 font-bold text-xs shadow-soft transition"
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
                  className="p-4 sm:p-5 rounded-2xl bg-teal-800/60 border border-teal-700/60 flex items-start gap-4 backdrop-blur-sm"
                >
                  <span className="font-serif text-xl font-bold text-marigold-300 shrink-0">{stage.step}</span>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">{stage.title}</h4>
                    <p className="text-xs text-teal-200 leading-relaxed">{stage.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FAQ ACCORDION */}
      {/* ========================================================================= */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold text-coral-600 uppercase tracking-widest">Questions & Answers</span>
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
                className="bg-white rounded-2xl border border-cream-200 shadow-soft-sm overflow-hidden transition"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus-visible:ring-2 focus-visible:ring-coral-500 rounded-2xl"
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
                      <div className="px-5 sm:px-6 pb-6 pt-1 text-xs sm:text-sm text-ink-600 leading-relaxed border-t border-cream-100">
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
      {/* 8. CALL TO ACTION SECTION BEFORE FOOTER                                   */}
      {/* ========================================================================= */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-4xl bg-[#E4572E] bg-gradient-to-br from-[#E4572E] via-[#E8643B] to-[#D3461D] text-white p-8 sm:p-14 text-center shadow-warm relative overflow-hidden border border-[#D3461D]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 bg-white/15 blur-3xl rounded-full"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-[#F6B93B]/25 blur-3xl rounded-full"
          />

          <div className="max-w-2xl mx-auto space-y-5 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/25">
              <HeartHandshake className="w-4 h-4 text-white" />
              <span>Join Hundreds of Verified Donors</span>
            </div>
            <h2 className="font-serif text-3xl sm:text-5xl font-bold leading-tight text-white">
              Bring a Tangible Smile to a Child in Need
            </h2>
            <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-lg mx-auto">
              Choose a wish, order the exact needed item, and receive physical photo proof that your gift made a difference.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
              <button
                onClick={onBrowseWishes}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-[#FFF9F5] text-[#E4572E] font-bold text-xs tracking-wide shadow-soft transition"
              >
                Browse Open Wishes Now &rarr;
              </button>
              <button
                onClick={onRegister}
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/30 shadow-soft transition backdrop-blur-sm"
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
