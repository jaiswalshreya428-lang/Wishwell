import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: UserRole;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, quickDemoLogin } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regRole, setRegRole] = useState<'donor' | 'institution'>('donor');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [instName, setInstName] = useState('');
  const [instRegNo, setInstRegNo] = useState('');
  const [instCity, setInstCity] = useState('');
  const [instState, setInstState] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      onClose();
    } catch {
      // Handled in context toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload: any = {
        email: regEmail,
        password: regPassword,
        full_name: regFullName,
        role: regRole,
      };
      if (regRole === 'institution') {
        payload.institution_name = instName;
        payload.registration_number = instRegNo;
        payload.address = '123 Care Street';
        payload.city = instCity;
        payload.state = instState;
        payload.postal_code = '560001';
        payload.phone = '+91 9876543210';
      }
      await register(payload);
      onClose();
    } catch {
      // Handled in context toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (role: UserRole) => {
    await quickDemoLogin(role);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tab === 'login' ? 'Sign In to WishWell' : 'Create an Account'}
      subtitle="In-memory authentication &bull; Tokens stored securely"
    >
      <div className="space-y-6">
        {/* Tab switcher */}
        <div className="flex border-b border-cream-200">
          <button
            onClick={() => setTab('login')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === 'login'
                ? 'border-terracotta-600 text-terracotta-700'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('register')}
            className={`flex-1 py-2.5 text-xs font-bold border-b-2 transition ${
              tab === 'register'
                ? 'border-terracotta-600 text-terracotta-700'
                : 'border-transparent text-ink-500 hover:text-ink-800'
            }`}
          >
            New Registration
          </button>
        </div>

        {/* Quick Viva Demo Accounts */}
        {tab === 'login' && (
          <div className="p-3.5 rounded-xl bg-cream-100 border border-cream-200 space-y-2">
            <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider block">
              Viva Examiner One-Click Demo Profiles:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickDemo('donor')}
                className="p-2 rounded-lg bg-white border border-cream-200 hover:bg-cream-50 text-left"
              >
                <div className="font-bold text-ink-900">Sarah Donor</div>
                <div className="text-[10px] text-ink-500">Pledge wishes & impact</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('institution')}
                className="p-2 rounded-lg bg-white border border-cream-200 hover:bg-cream-50 text-left"
              >
                <div className="font-bold text-ink-900">St. Mary&apos;s Haven</div>
                <div className="text-[10px] text-ink-500">Home director & wishes</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('verifier')}
                className="p-2 rounded-lg bg-white border border-cream-200 hover:bg-cream-50 text-left"
              >
                <div className="font-bold text-ink-900">Marcus Verifier</div>
                <div className="text-[10px] text-ink-500">Field inspection review</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="p-2 rounded-lg bg-white border border-cream-200 hover:bg-cream-50 text-left"
              >
                <div className="font-bold text-ink-900">Elena Admin</div>
                <div className="text-[10px] text-ink-500">Approvals & Audit check</div>
              </button>
            </div>
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        ) : (
          /* Register Form */
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1">
                I am registering as:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRegRole('donor')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    regRole === 'donor'
                      ? 'bg-terracotta-50 border-terracotta-600 text-terracotta-800'
                      : 'border-cream-300 text-ink-600'
                  }`}
                >
                  Donor (Individual / Org)
                </button>
                <button
                  type="button"
                  onClick={() => setRegRole('institution')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    regRole === 'institution'
                      ? 'bg-terracotta-50 border-terracotta-600 text-terracotta-800'
                      : 'border-cream-300 text-ink-600'
                  }`}
                >
                  Children&apos;s Home / Shelter
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1">
                Full Name / Director Name
              </label>
              <input
                type="text"
                required
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="e.g., Sister Maria"
                className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="contact@shelter.org"
                className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-800 uppercase tracking-wider mb-1">
                Password (min 8 chars)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs text-ink-900 focus-visible:ring-2 focus-visible:ring-terracotta-600"
              />
            </div>

            {regRole === 'institution' && (
              <div className="space-y-3 pt-2 border-t border-cream-200">
                <span className="text-[10px] font-bold text-ink-500 uppercase tracking-wider block">
                  Institution Registration Details:
                </span>
                <div>
                  <input
                    type="text"
                    required
                    placeholder="Home / Organization Name"
                    value={instName}
                    onChange={(e) => setInstName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-cream-300 text-xs text-ink-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Reg. Number (Govt ID)"
                    value={instRegNo}
                    onChange={(e) => setInstRegNo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs text-ink-900"
                  />
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={instCity}
                    onChange={(e) => setInstCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-cream-300 text-xs text-ink-900"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Account...' : 'Complete Registration'}
            </button>
          </form>
        )}
      </div>
    </Modal>
  );
};

