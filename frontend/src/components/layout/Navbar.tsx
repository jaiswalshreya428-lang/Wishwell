import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { FairyLights } from '../atmosphere/FairyLights';
import { FirefliesCanvas } from '../atmosphere/FirefliesCanvas';
import { WishWellLogo } from './WishWellLogo';
import { 
  Menu, 
  X, 
  ChevronDown, 
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
      style={{ backgroundColor: '#F4F0E5' }}
      className="bg-[#F4F0E5]/95 backdrop-blur-md border-b border-[#D4CAB0] text-[#1D2927] sticky top-0 z-50 transition-colors duration-300 relative shadow-xs"
    >
      {/* Atmosphere Container */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
        {/* Subtle Soothing Verdigris & Warm Brass Breathing Glow */}
        <div
          aria-hidden="true"
          className="absolute -top-12 left-1/3 w-96 h-28 rounded-full bg-[#24635C]/12 blur-2xl animate-lamp-glow"
        />

        {/* Floating Fireflies (Warm brass lantern motes across header) */}
        <div className="absolute inset-0 opacity-45">
          <FirefliesCanvas
            maxParticlesDesktop={14}
            maxParticlesMobile={6}
            speedMultiplier={0.55}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between relative z-10">
        {/* Vintage Wishing Well Brand Logo */}
        <div
          className="cursor-pointer group shrink-0"
          onClick={() => handleNav('/')}
        >
          <WishWellLogo variant="full" size={44} />
        </div>

        {/* Desktop Single-Line Navigation (>= 768px) */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 whitespace-nowrap">
          {navLinks.map((link) => {
            const isActive = currentRoute === link.route;
            return (
              <button
                key={link.route}
                onClick={() => handleNav(link.route)}
                className={`relative px-3.5 py-2 rounded-xl text-xs lg:text-sm font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-1.5 ${
                  link.highlight
                    ? 'bg-gradient-to-r from-[#A84637] to-[#8D3628] text-[#FAF7F0] shadow-soft font-semibold hover:brightness-110 active:scale-95'
                    : isActive
                    ? 'text-[#194641] bg-[#DCE9E5] font-bold border border-[#BAD5CD] shadow-xs'
                    : 'text-[#3D4D49] hover:text-[#192D2A] hover:bg-[#EAE3D2]'
                }`}
              >
                <span>{link.label}</span>
                {Boolean(link.badge) && (
                  <span className="px-1.5 py-0.5 bg-[#A84637] text-white text-[10px] rounded-full font-bold shadow-sm">
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
              className="flex items-center space-x-2 px-3.5 py-2 rounded-full bg-[#FBF9F3] hover:bg-[#EAE3D2] text-[#1D2927] text-xs font-semibold border border-[#D4CAB0] shadow-xs transition active:scale-95"
              title="Switch demo persona"
            >
              <span className="w-2 h-2 rounded-full bg-[#24635C]" />
              <span className="capitalize">Role: {user ? user.role : 'Guest'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#53645F] transition-transform ${roleMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-[#FBF9F3] shadow-2xl border border-[#D4CAB0] p-2.5 z-50 text-xs font-medium animate-in fade-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] text-[#53645F] font-bold uppercase tracking-wider border-b border-[#E5DEC9] flex items-center justify-between">
                  <span>Demo Persona Switcher</span>
                  <Sparkles className="w-3 h-3 text-[#C89238]" />
                </div>
                <div className="mt-1 space-y-1">
                  <button
                    onClick={() => handleRoleSwitch('donor')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#EFECE1] flex items-center justify-between text-[#1D2927] transition"
                  >
                    <span className="font-medium">Sarah (Donor)</span>
                    <span className="text-[10px] bg-[#DCECE8] text-[#1B4D48] px-1.5 py-0.5 rounded-full font-bold">donor</span>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('institution')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#EFECE1] flex items-center justify-between text-[#1D2927] transition"
                  >
                    <span className="font-medium">St. Mary&apos;s (Children&apos;s Home)</span>
                    <span className="text-[10px] bg-[#F6ECD1] text-[#855A19] px-1.5 py-0.5 rounded-full font-bold">home</span>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('verifier')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#EFECE1] flex items-center justify-between text-[#1D2927] transition"
                  >
                    <span className="font-medium">Marcus (Field Verifier)</span>
                    <span className="text-[10px] bg-[#F2EEF5] text-[#544363] px-1.5 py-0.5 rounded-full font-bold">verifier</span>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('admin')}
                    className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#EFECE1] flex items-center justify-between text-[#1D2927] transition"
                  >
                    <span className="font-medium">Elena (Platform Admin)</span>
                    <span className="text-[10px] bg-[#F6E2DA] text-[#7E3120] px-1.5 py-0.5 rounded-full font-bold">admin</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center space-x-2 pl-1">
              <span className="text-xs font-semibold text-[#1D2927] max-w-[120px] truncate">
                {user.full_name}
              </span>
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-[#FBF9F3] hover:bg-[#EAE3D2] text-[#3D4D49] hover:text-[#1D2927] border border-[#D4CAB0] transition"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleNav('/login')}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#A84637] to-[#8D3628] hover:brightness-110 text-[#FAF7F0] text-xs font-bold tracking-wide shadow-soft transition active:scale-95"
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
            className="px-2.5 py-1.5 rounded-full bg-[#FBF9F3] text-[11px] font-semibold text-[#1B4D48] border border-[#D4CAB0]"
          >
            {user ? user.role : 'Guest'}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2.5 rounded-xl text-[#1D2927] hover:bg-[#EAE3D2] transition focus-visible:ring-2 focus-visible:ring-[#24635C]"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Delicate Warm-Brass Fairy-Light String Draping Across Bottom of Header */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 overflow-hidden select-none z-10 opacity-75">
        <FairyLights bulbCount={16} />
      </div>

      {/* Collapsible Drawer Menu for Devices Under 768px */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-4 pb-8 border-t border-[#D4CAB0] bg-[#F4F0E5] space-y-3 relative z-50 animate-in fade-in slide-in-from-top-4">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.route}
                onClick={() => handleNav(link.route)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between transition ${
                  currentRoute === link.route
                    ? 'bg-[#DCECE8] text-[#1B4D48] font-bold border border-[#BADAD3]'
                    : 'text-[#3D4D49] hover:bg-[#EAE3D2] hover:text-[#1D2927]'
                }`}
              >
                <span>{link.label}</span>
                {Boolean(link.badge) && (
                  <span className="px-2 py-0.5 bg-[#B65038] text-white text-[10px] rounded-full font-bold">
                    {link.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-[#D4CAB0] space-y-3">
            <div className="text-[11px] font-bold text-[#53645F] uppercase tracking-wider px-2">
              Switch Demo Role
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['donor', 'institution', 'verifier', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSwitch(r)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize border transition ${
                    user?.role === r
                      ? 'bg-[#24635C] text-[#FAF6EC] border-[#1B4D48] font-bold'
                      : 'bg-[#FBF9F3] text-[#1D2927] border-[#D4CAB0] hover:bg-[#EAE3D2]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {user ? (
              <div className="pt-2 flex items-center justify-between px-2">
                <span className="text-xs text-[#3D4D49]">{user.full_name} ({user.email})</span>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 rounded-lg bg-[#FBF3F0] text-[#9B3F2A] border border-[#DE9F8A] text-xs font-bold hover:bg-[#B65038] hover:text-white transition"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleNav('/login')}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B65038] to-[#9B3F2A] text-[#FAF6EC] text-xs font-bold tracking-wide shadow-soft"
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
