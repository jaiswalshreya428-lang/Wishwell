import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate, unreadCount = 0 }) => {
  const { user, logout, quickDemoLogin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const navLinks = (() => {
    if (!user) {
      return [
        { label: 'Browse Wishes', route: '/browse' },
        { label: 'How It Works', route: '/#how-it-works' },
        { label: 'Verification Process', route: '/#verification' },
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
          { label: 'Onboarding & Status', route: '/institution/onboarding' },
          { label: 'Active Wishes', route: '/institution/wishes' },
          { label: '+ Post Wish', route: '/institution/wishes/new' },
          { label: 'Confirm Deliveries', route: '/institution/deliveries' },
        ];
      case 'verifier':
        return [
          { label: 'Pending Queue', route: '/verifier/queue' },
          { label: 'Browse Wishes', route: '/browse' },
        ];
      case 'admin':
        return [
          { label: 'Approval Queue', route: '/admin/approvals' },
          { label: 'Analytics Dashboard', route: '/admin/analytics' },
          { label: 'Cryptographic Audit Log', route: '/admin/audit' },
          { label: 'Browse Wishes', route: '/browse' },
        ];
      default:
        return [{ label: 'Browse Wishes', route: '/browse' }];
    }
  })();

  const handleNav = (route: string) => {
    navigate(route);
    setMobileMenuOpen(false);
  };

  const handleRoleSwitch = async (role: UserRole) => {
    setRoleMenuOpen(false);
    await quickDemoLogin(role);
    if (role === 'donor') navigate('/browse');
    else if (role === 'institution') navigate('/institution/wishes');
    else if (role === 'verifier') navigate('/verifier/queue');
    else if (role === 'admin') navigate('/admin/analytics');
  };

  return (
    <header className="bg-cream-50/90 backdrop-blur-md border-b border-cream-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => handleNav('/')}>
          <div className="w-10 h-10 rounded-xl bg-terracotta-600 flex items-center justify-center text-white shadow-soft">
            <svg className="w-6 h-6 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif text-2xl font-bold tracking-tight text-ink-900">WishWell</span>
              <span className="bg-sage-100 text-sage-700 text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border border-sage-200">
                Verified
              </span>
            </div>
            <p className="text-[11px] text-ink-500 font-medium hidden sm:block">Item-Only Matching for Children's Homes</p>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          {navLinks.map((link) => {
            const isActive = currentRoute === link.route;
            return (
              <button
                key={link.route}
                onClick={() => handleNav(link.route)}
                className={`relative px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'text-terracotta-700 bg-terracotta-50/80 font-semibold'
                    : 'text-ink-700 hover:text-terracotta-600 hover:bg-cream-100'
                }`}
              >
                {link.label}
                {Boolean(link.badge) && (
                  <span className="ml-1.5 px-1.5 py-0.2 bg-terracotta-600 text-white text-[10px] rounded-full font-bold">
                    {link.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User / Viva Demo Switcher */}
        <div className="hidden md:flex items-center space-x-3">
          {/* Viva Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-cream-200/80 hover:bg-cream-300 text-ink-700 text-xs font-semibold border border-cream-300 transition"
              title="Viva Quick Switcher"
            >
              <span className="w-2 h-2 rounded-full bg-terracotta-500 animate-pulse" />
              <span>Role: {user ? user.role : 'Guest'}</span>
              <svg className="w-3.5 h-3.5 stroke-current opacity-70" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-soft-lg border border-cream-200 p-2 z-50 text-xs font-medium animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[10px] text-ink-400 font-bold uppercase tracking-wider">
                  Viva Quick Demo Switcher
                </div>
                <button
                  onClick={() => handleRoleSwitch('donor')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-cream-100 flex items-center justify-between text-ink-800"
                >
                  <span>Sarah (Donor)</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">donor</span>
                </button>
                <button
                  onClick={() => handleRoleSwitch('institution')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-cream-100 flex items-center justify-between text-ink-800"
                >
                  <span>St. Mary's Haven (Home)</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">institution</span>
                </button>
                <button
                  onClick={() => handleRoleSwitch('verifier')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-cream-100 flex items-center justify-between text-ink-800"
                >
                  <span>Marcus (Field Verifier)</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded">verifier</span>
                </button>
                <button
                  onClick={() => handleRoleSwitch('admin')}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-cream-100 flex items-center justify-between text-ink-800"
                >
                  <span>Elena (Platform Admin)</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">admin</span>
                </button>
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-ink-600 hidden lg:inline">{user.full_name}</span>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg border border-cream-300 hover:bg-cream-100 text-ink-700 text-xs font-semibold transition"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleNav('/login')}
              className="px-4 py-2 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold tracking-wide shadow-soft transition"
            >
              Sign In / Register
            </button>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center space-x-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-ink-700 hover:bg-cream-200"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="2">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 border-t border-cream-200 bg-cream-50 space-y-2">
          {navLinks.map((link) => (
            <button
              key={link.route}
              onClick={() => handleNav(link.route)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-ink-800 hover:bg-cream-200 flex items-center justify-between"
            >
              <span>{link.label}</span>
              {Boolean(link.badge) && (
                <span className="px-2 py-0.5 bg-terracotta-600 text-white text-[10px] rounded-full font-bold">
                  {link.badge}
                </span>
              )}
            </button>
          ))}
          <div className="pt-4 border-t border-cream-200 flex flex-col space-y-2">
            <div className="text-[11px] font-bold text-ink-500 uppercase tracking-wider px-3">Switch Demo Role</div>
            <div className="grid grid-cols-2 gap-2">
              {(['donor', 'institution', 'verifier', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => handleRoleSwitch(r)}
                  className="px-3 py-1.5 rounded-lg bg-cream-200 text-xs font-semibold text-ink-800 capitalize"
                >
                  {r}
                </button>
              ))}
            </div>
            {user ? (
              <button
                onClick={logout}
                className="w-full mt-2 py-2 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200"
              >
                Sign Out ({user.full_name})
              </button>
            ) : (
              <button
                onClick={() => handleNav('/login')}
                className="w-full mt-2 py-2.5 rounded-xl bg-terracotta-600 text-white text-xs font-bold shadow-soft"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

