import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './components/public/LandingPage';
import { BrowseWishes } from './components/public/BrowseWishes';
import { WishDetailModal } from './components/public/WishDetailModal';
import { ClaimModal } from './components/donor/ClaimModal';
import { MyClaims } from './components/donor/MyClaims';
import { DonorImpact } from './components/donor/DonorImpact';
import { DonorNotifications } from './components/donor/DonorNotifications';
import { InstitutionOnboarding } from './components/institution/InstitutionOnboarding';
import { CreateWishForm } from './components/institution/CreateWishForm';
import { MyWishesList } from './components/institution/MyWishesList';
import { ConfirmDeliveryModal } from './components/institution/ConfirmDeliveryModal';
import { SendThankYouModal } from './components/institution/SendThankYouModal';
import { VerifierQueue } from './components/verifier/VerifierQueue';
import { AdminApprovalQueue } from './components/admin/AdminApprovalQueue';
import { AdminAnalyticsDashboard } from './components/admin/AdminAnalyticsDashboard';
import { AdminAuditLogViewer } from './components/admin/AdminAuditLogViewer';
import { AuthModal } from './components/auth/AuthModal';
import { OpenWishViewItem, Delivery, UserRole } from './types';
import { api } from './api/endpoints';

const AppContent: React.FC = () => {
  const { user } = useAuth();

  // Simple Hash-based Router
  const [route, setRoute] = useState<string>(() => {
    const hash = window.location.hash.replace(/^#/, '');
    return hash || '/';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '');
      setRoute(hash || '/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (newRoute: string) => {
    if (newRoute.startsWith('/#')) {
      window.location.hash = newRoute.replace('/#', '');
    } else {
      window.location.hash = newRoute;
    }
    setRoute(newRoute.replace(/^#/, ''));
  };

  // Modals & State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedWishForDetail, setSelectedWishForDetail] = useState<OpenWishViewItem | null>(null);
  const [selectedWishForClaim, setSelectedWishForClaim] = useState<OpenWishViewItem | null>(null);
  const [deliveryToConfirm, setDeliveryToConfirm] = useState<Delivery | null>(null);
  const [thankYouDeliveryId, setThankYouDeliveryId] = useState<number | null>(null);
  const [pendingDeliveries, setPendingDeliveries] = useState<Delivery[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Poll notifications count periodically
  useEffect(() => {
    if (user && user.role === 'donor') {
      api.deliveries
        .getNotifications()
        .then((items) => setUnreadNotifications(items.filter((i) => !i.is_read).length))
        .catch(() => {});
    }
  }, [user, route]);

  // Load pending deliveries for institution if on institution deliveries route
  useEffect(() => {
    if (user && user.role === 'institution' && route === '/institution/deliveries') {
      api.deliveries
        .getPendingDeliveriesForInstitution()
        .then(setPendingDeliveries)
        .catch(() => {
          // Fallback demo data if no pending deliveries exist yet
          setPendingDeliveries([]);
        });
    }
  }, [user, route]);

  // Protected Route Guard Helper
  const requireRoles = (roles: UserRole[], children: React.ReactNode) => {
    if (!user) {
      return (
        <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-cream-200 text-center shadow-soft space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg">
            !
          </div>
          <h3 className="font-serif text-xl font-bold text-ink-900">Authentication Required</h3>
          <p className="text-xs text-ink-600 leading-relaxed">
            Please sign in with a verified account to access this role-protected section.
          </p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="px-6 py-2.5 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft transition"
          >
            Sign In or Switch Role &rarr;
          </button>
        </div>
      );
    }

    if (!roles.includes(user.role)) {
      return (
        <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-200 text-center shadow-soft space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg">
            &times;
          </div>
          <h3 className="font-serif text-xl font-bold text-ink-900">Access Restricted (403)</h3>
          <p className="text-xs text-ink-600 leading-relaxed">
            Your current account role (<strong>{user.role}</strong>) does not have permission to view this view. Required role(s): {roles.join(', ')}.
          </p>
          <p className="text-[11px] text-ink-500">
            Use the top-right &ldquo;Role: {user.role}&rdquo; pill to quickly switch roles during testing.
          </p>
        </div>
      );
    }

    return <>{children}</>;
  };

  // Route Dispatcher
  const renderCurrentView = () => {
    switch (route) {
      // Public Routes
      case '/':
        return (
          <LandingPage
            onBrowseWishes={() => navigate('/browse')}
            onRegister={() => setAuthModalOpen(true)}
            onExploreFlow={() => {
              const el = document.getElementById('how-it-works');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        );

      case '/browse':
        return (
          <BrowseWishes
            onSelectWish={(wish) => setSelectedWishForDetail(wish)}
            onClaimWish={(wish) => setSelectedWishForClaim(wish)}
          />
        );

      case '/login':
        return (
          <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-cream-200 shadow-soft text-center space-y-4">
            <h2 className="font-serif text-2xl font-bold text-ink-900">Sign In to WishWell</h2>
            <p className="text-xs text-ink-600">Choose a demo profile or enter your credentials</p>
            <button
              onClick={() => setAuthModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-terracotta-600 text-white text-xs font-bold shadow-soft"
            >
              Open Sign In Dialog
            </button>
          </div>
        );

      // Donor Routes
      case '/donor/claims':
        return requireRoles(['donor'], <MyClaims onBrowseWishes={() => navigate('/browse')} />);

      case '/donor/impact':
        return requireRoles(['donor'], <DonorImpact onBrowseWishes={() => navigate('/browse')} />);

      case '/donor/notifications':
        return requireRoles(['donor'], <DonorNotifications />);

      // Institution Routes
      case '/institution/onboarding':
        return requireRoles(
          ['institution'],
          <InstitutionOnboarding onCreateWish={() => navigate('/institution/wishes/new')} />
        );

      case '/institution/wishes':
        return requireRoles(
          ['institution'],
          <MyWishesList onCreateWish={() => navigate('/institution/wishes/new')} />
        );

      case '/institution/wishes/new':
        return requireRoles(
          ['institution'],
          <CreateWishForm
            onSuccess={() => navigate('/institution/wishes')}
            onCancel={() => navigate('/institution/wishes')}
          />
        );

      case '/institution/deliveries':
        return requireRoles(
          ['institution'],
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            <div className="border-b border-cream-200 pb-4">
              <span className="text-xs font-bold text-terracotta-600 uppercase tracking-widest">
                Delivery Confirmations
              </span>
              <h1 className="font-serif text-3xl font-bold text-ink-900 mt-1">
                Confirm Physical Deliveries
              </h1>
              <p className="text-sm text-ink-600 mt-1">
                Confirm received items with photo proof. Strictly no pictures of children. After confirmation, send a thank-you note to the donor.
              </p>
            </div>

            {pendingDeliveries.length === 0 ? (
              <div className="p-8 text-center bg-cream-100 rounded-2xl border border-cream-200 text-xs text-ink-600">
                No deliveries currently pending confirmation. When a donor marks a claim as delivered, it will appear here.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingDeliveries.map((del) => (
                  <div
                    key={del.id}
                    className="p-6 rounded-2xl bg-white border border-cream-200 shadow-soft flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-xs text-ink-400">Delivery #{del.id}</span>
                      <h4 className="font-serif text-lg font-bold text-ink-900">
                        {del.qty}x {del.item_name}
                      </h4>
                      <p className="text-xs text-ink-500">Wish: {del.wish_title}</p>
                    </div>
                    <div className="flex space-x-3">
                      {del.status === 'pending_confirmation' ? (
                        <button
                          onClick={() => setDeliveryToConfirm(del)}
                          className="px-4 py-2 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-xs font-bold shadow-soft"
                        >
                          Upload Proof Photo &rarr;
                        </button>
                      ) : (
                        <button
                          onClick={() => setThankYouDeliveryId(del.id)}
                          className="px-4 py-2 rounded-xl bg-terracotta-600 hover:bg-terracotta-700 text-white text-xs font-bold shadow-soft"
                        >
                          Send Thank-You Note
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      // Verifier Routes
      case '/verifier/queue':
        return requireRoles(['verifier'], <VerifierQueue />);

      // Admin Routes
      case '/admin/approvals':
        return requireRoles(['admin'], <AdminApprovalQueue />);

      case '/admin/analytics':
        return requireRoles(['admin'], <AdminAnalyticsDashboard />);

      case '/admin/audit':
        return requireRoles(['admin'], <AdminAuditLogViewer />);

      default:
        return (
          <div className="max-w-md mx-auto my-16 text-center space-y-4">
            <h2 className="font-serif text-3xl font-bold text-ink-900">Page Not Found</h2>
            <p className="text-xs text-ink-600">The requested view does not exist.</p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-xl bg-terracotta-600 text-white text-xs font-bold shadow-soft"
            >
              Return to Home
            </button>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col font-sans text-ink-900">
      {/* Navigation */}
      <Navbar currentRoute={route} navigate={navigate} unreadCount={unreadNotifications} />

      {/* Main Content Area */}
      <main className="flex-1 w-full">{renderCurrentView()}</main>

      {/* Footer */}
      <Footer />

      {/* Modals */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

      <WishDetailModal
        wish={selectedWishForDetail}
        isOpen={selectedWishForDetail !== null}
        onClose={() => setSelectedWishForDetail(null)}
        onPledge={(wish) => {
          setSelectedWishForDetail(null);
          setSelectedWishForClaim(wish);
        }}
      />

      <ClaimModal
        wish={selectedWishForClaim}
        isOpen={selectedWishForClaim !== null}
        onClose={() => setSelectedWishForClaim(null)}
        onSuccess={() => {
          navigate('/donor/claims');
        }}
        onNeedLogin={() => setAuthModalOpen(true)}
      />

      <ConfirmDeliveryModal
        delivery={deliveryToConfirm}
        isOpen={deliveryToConfirm !== null}
        onClose={() => setDeliveryToConfirm(null)}
        onSuccess={() => {
          // Offer sending thank you note
          if (deliveryToConfirm) {
            setThankYouDeliveryId(deliveryToConfirm.id);
          }
        }}
      />

      <SendThankYouModal
        deliveryId={thankYouDeliveryId}
        isOpen={thankYouDeliveryId !== null}
        onClose={() => setThankYouDeliveryId(null)}
        onSuccess={() => {
          navigate('/institution/wishes');
        }}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
};

export default App;
