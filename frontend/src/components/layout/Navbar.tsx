import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { FairyLights } from '../atmosphere/FairyLights';
import { FirefliesCanvas } from '../atmosphere/FirefliesCanvas';
import { 
  Menu, 
  X, 
  ChevronDown, 
  Heart, 
  LogOut, 
  Sparkles 
} from 'lucide-react';

interface NavLinkItem {
  label: string;
  route: string;
  badge?: number;
  highlight?: boolean;
}

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate, unreadCount = 0 }) => {
  const { user, logout, quickDemoLogin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close role dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clean, single-line navigation links adhering to <1024px collapse rule
  const navLinks: NavLinkItem[] = (() => {
    if (!user) {
      return [
        { label: 'Browse Wishes', route: '/browse' },
        { label: 'How It Works', route: '/#how-it-works' },
        { label: 'Verification', route: '/#verification' },
      ];
    }
    switch (user.role) {
      case 'donor':
        return [
          { label: 'Browse Wishes', route: '/browse' },
          { label: 'My Pledges', route: '/donor/claims' },
          { label: 'My Impact', route: '/donor/impact' },
          { label: 'Notifications', route: '/donor/notifications', badge: unreadCount },
        ];
      case 'institution':
        return [
          { label: 'Onboarding', route: '/institution/onboarding' },
          { label: 'My Wishes', route: '/institution/wishes' },
          { label: '+ Post Wish', route: '/institution/wishes/new', highlight: true },
          { label: 'Deliveries', route: '/institution/deliveries' },
        ];
      case 'verifier':
        return [
          { label: 'Pending Queue', route: '/verifier/queue' },
          { label: 'Browse Wishes', route: '/browse' },
        ];
      case 'admin':
        return [
          { label: 'Approvals', route: '/admin/approvals' },
          { label: 'Analytics', route: '/admin/analytics' },
          { label: 'Audit Ledger', route: '/admin/audit' },
          { label: 'Browse Wishes', route: '/browse' },
        ];
      default:
        return [{ label: 'Browse Wishes', route: '/browse' }];
    }
  })();

  const handleNav = (route: string) => {
    if (route.includes('how-it-works')) {
      if (currentRoute !== '/') {
        navigate('/');
        setTimeout(() => {
          document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      } else {
        document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
      }
      setMobileMenuOpen(false);
      return;
    }

    if (route.includes('verification')) {
      if (currentRoute !== '/') {
        navigate('/');
        setTimeout(() => {
          document.getElementById('verification')?.scrollIntoView({ behavior: 'smooth' });
        }, 150);
      } else {
        document.getElementById('verification')?.scrollIntoView({ behavior: 'smooth' });
      }
      setMobileMenuOpen(false);
      return;
    }

    navigate(route);
    setMobileMenuOpen(false);
  };

  const handleRoleSwitch = async (role: UserRole) => {
    setRoleMenuOpen(false);
    setMobileMenuOpen(false);
    await quickDemoLogin(role);
    if (role === 'donor') navigate('/browse');
    else if (role === 'institution') navigate('/institution/wishes');
    else if (role === 'verifier') navigate('/verifier/queue');
    else if (role === 'admin') navigate('/admin/analytics');
  };

  return (
    <header
      style={{ backgroundColor: '#231F3D' }}
      className="bg-[#231F3D] backdrop-blur-md border-b border-[#3A2A55]/80 text-[#FFFBF5] sticky top-0 z-50 transition-colors duration-300 relative dark-starry-bg shadow-night"
    >
      {/* Atmosphere Container (Safely isolates particle overflow without clipping dropdown menus) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* 1. Subtle Marigold Breathing Lamp Glow in Header */}
        <div
          aria-hidden="true"
          className="absolute -top-12 left-1/3 w-96 h-28 rounded-full bg-[#F6B93B]/15 blur-2xl animate-lamp-glow"
        />

        {/* 2. Floating Fireflies (15-20 particles across header) */}
        <div className="absolute inset-0 opacity-80">
          <FirefliesCanvas
            maxParticlesDesktop={18}
            maxParticlesMobile={8}
            speedMultiplier={0.7}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between relative z-10">
        {/* Brand Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer group shrink-0"
          onClick={() => handleNav('/')}
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#E4572E] to-[#C9441F] flex items-center justify-center text-white shadow-soft transition-transform group-hover:scale-105">
            <Heart className="w-5 h-5 fill-white/20 stroke-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-2xl font-bold tracking-tight text-[#FFFBF5] drop-shadow-sm">
                WishWell
              </span>
              <span className="bg-[#1F8A7A]/30 text-[#6CE0CE] text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full border border-[#1F8A7A]/50">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-[#AEA6BF] font-medium hidden sm:block">
              Item-Only Matching for Children's Homes
            </p>
          </div>
        </div>

        {/* Desktop Single-Line Navigation (>= 768px) */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 whitespace-nowrap">
          {navLinks.map((link) => {
            const isActive = currentRoute === link.route;
            return (
              <button
                key={link.route}
                onClick={() => handleNav(link.route)}
                className={`relative px-3 py-2 rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                  link.highlight
                    ? 'bg-gradient-to-r from-[#E4572E] to-[#C9441F] text-white shadow-soft font-semibold hover:brightness-110 active:scale-95'
                    : isActive
                    ? 'text-[#F6B93B] bg-[#3A2A55]/90 font-bold border border-[#F6B93B]/30 shadow-sm'
                    : 'text-[#D4CEE0] hover:text-[#FFFBF5] hover:bg-[#3A2A55]/50'
                }`}
              >
                <span>{link.label}</span>
                {Boolean(link.badge) && (
                  <span className="px-1.5 py-0.5 bg-[#E4572E] text-white text-[10px] rounded-full font-bold shadow-sm">
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Controls & Interactive Demo Switcher (>= 768px) */}
        <div className="hidden md:flex items-center space-x-3 shrink-0">
          {/* Role Switcher Pill with Anchor Reference */}
          <div className="relative" ref={roleDropdownRef}>
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-full bg-[#3A2A55]/80 hover:bg-[#3A2A55] text-[#FFFBF5] text-xs font-semibold border border-[#F6B93B]/30 shadow-sm transition active:scale-95"
              title="Switch demo persona"
            >
              <span className="w-2 h-2 rounded-full bg-[#F6B93B] animate-pulse" />
              <span className="capitalize">Role: {user ? user.role : 'Guest'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#AEA6BF] transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#1D1933] shadow-2xl border-2 border-[#F6B93B]/40 p-2.5 z-50 text-xs font-medium animate-in fade-in zoom-in-95 backdrop-blur-xl">
                <div className="px-3 py-1.5 text-[10px] text-[#AEA6BF] font-bold uppercase tracking-wider border-b border-[#3A2A55]/70 flex items-center justify-between">
                  <span>Demo Persona Switcher</span>
                  <Sparkles className="w-3 h-3 text-[#F6B93B]" />
                </div>
                <div className="mt-1 space-y-1">
                  <button
                    onClick={() => handleRoleSwitch('donor')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#3A2A55] flex items-center justify-between text-[#FFFBF5] transition"
                  >
                    <span>Sarah (Donor)</span>
                    <span className="text-[10px] bg-[#E8F3FC] text-[#205F94] px-1.5 py-0.5 rounded-full font-bold">donor</span>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('institution')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#3A2A55] flex items-center justify-between text-[#FFFBF5] transition"
                  >
                    <span>St. Mary's (Children's Home)</span>
                    <span className="text-[10px] bg-[#FEF8E8] text-[#9A6405] px-1.5 py-0.5 rounded-full font-bold">home</span>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('verifier')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#3A2A55] flex items-center justify-between text-[#FFFBF5] transition"
                  >
                    <span>Marcus (Field Verifier)</span>
                    <span className="text-[10px] bg-[#F3EBF9] text-[#533E78] px-1.5 py-0.5 rounded-full font-bold">verifier</span>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('admin')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#3A2A55] flex items-center justify-between text-[#FFFBF5] transition"
                  >
                    <span>Elena (Platform Admin)</span>
                    <span className="text-[10px] bg-[#E3F5F2] text-[#166C60] px-1.5 py-0.5 rounded-full font-bold">admin</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center space-x-2 pl-1">
              <span className="text-xs font-medium text-[#D4CEE0] max-w-[120px] truncate">
                {user.full_name}
              </span>
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-[#3A2A55]/60 hover:bg-[#3A2A55] text-[#D4CEE0] hover:text-[#FFFBF5] border border-[#3A2A55] transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleNav('/login')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#E4572E] to-[#C9441F] hover:brightness-110 text-white text-xs font-bold tracking-wide shadow-soft transition active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Collapsible Hamburger Menu Button (< 768px) */}
        <div className="md:hidden flex items-center space-x-2">
          {/* Quick role indicator pill on mobile */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="px-2.5 py-1.5 rounded-full bg-[#3A2A55] text-[11px] font-semibold text-[#F6B93B] border border-[#F6B93B]/30"
          >
            {user ? user.role : 'Guest'}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-[#FFFBF5] hover:bg-[#3A2A55] transition focus-visible:ring-2 focus-visible:ring-[#E4572E]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* 3. Delicate Fairy-Light String Draping Across Bottom of Header */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 overflow-hidden select-none z-10 opacity-75">
        <FairyLights bulbCount={16} />
      </div>

      {/* Collapsible Drawer Menu for Devices Under 768px */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-4 pb-8 border-t border-[#3A2A55] bg-[#1C1832] space-y-3 relative z-50 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.route}
                onClick={() => handleNav(link.route)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between transition ${
                  currentRoute === link.route
                    ? 'bg-[#3A2A55] text-[#F6B93B] font-bold border border-[#F6B93B]/30'
                    : 'text-[#D4CEE0] hover:bg-[#3A2A55]/50 hover:text-white'
                }`}
              >
                <span>{link.label}</span>
                {Boolean(link.badge) && (
                  <span className="px-2 py-0.5 bg-[#E4572E] text-white text-[10px] rounded-full font-bold">
                    {link.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[#3A2A55] space-y-3">
            <div className="text-[11px] font-bold text-[#AEA6BF] uppercase tracking-wider px-2">
              Switch Demo Role
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['donor', 'institution', 'verifier', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSwitch(r)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize border transition ${
                    user?.role === r
                      ? 'bg-[#F6B93B] text-[#1E1A2B] border-[#F6B93B] font-bold'
                      : 'bg-[#3A2A55]/60 text-[#FFFBF5] border-[#3A2A55] hover:bg-[#3A2A55]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {user ? (
              <div className="pt-2 flex items-center justify-between px-2">
                <span className="text-xs text-[#D4CEE0]">{user.full_name} ({user.email})</span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg bg-[#E4572E]/20 text-[#EE7959] border border-[#E4572E]/40 text-xs font-bold hover:bg-[#E4572E] hover:text-white transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('/login')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E4572E] to-[#C9441F] text-white text-xs font-bold tracking-wide shadow-soft"
              >
                Sign In / Register
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
