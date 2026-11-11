import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Sparkles } from 'lucide-react';

interface DemoRoleBarProps {
  navigate: (route: string) => void;
}

export const DemoRoleBar: React.FC<DemoRoleBarProps> = ({ navigate }) => {
  const { user, quickDemoLogin, logout } = useAuth();

  const handleSwitch = async (role: UserRole) => {
    await quickDemoLogin(role);
    if (role === 'donor') navigate('/browse');
    else if (role === 'institution') navigate('/institution/wishes');
    else if (role === 'verifier') navigate('/verifier/queue');
    else if (role === 'admin') navigate('/admin/analytics');
  };

  const handleGuest = () => {
    logout();
    navigate('/');
  };

  return (
    <div
      style={{ backgroundColor: '#EBF4FA' }}
      className="bg-[#EBF4FA] text-[#0F172A] border-b border-[#D5E6F2] px-3 sm:px-6 py-2 relative z-50 shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Role Switcher Label & Current User */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E0EFF8] border border-[#CFE4F2] text-[#0369A1] text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#0284C7]" />
            <span>1-Click Role Switcher</span>
          </div>

          <div className="text-xs text-[#475569] flex items-center gap-1.5">
            <span className="hidden sm:inline">Active:</span>
            {user ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#0F172A] bg-white px-2 py-0.5 rounded-md border border-[#D0E2EE] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#0D9488]" />
                <span className="capitalize">{user.role}</span>
                <span className="text-[#64748B] font-normal hidden sm:inline">({user.full_name})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-[#0369A1] bg-white px-2 py-0.5 rounded-md border border-[#D0E2EE] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#0284C7]" />
                <span>Guest (Public)</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Instant 1-Click Role Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* 1. Donor */}
          <button
            onClick={() => handleSwitch('donor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 active:scale-95 border ${
              user?.role === 'donor'
                ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sm font-bold ring-2 ring-[#0284C7]/30'
                : 'bg-white hover:bg-[#E0EFF8] text-[#334155] hover:text-[#0F172A] border-[#D0E2EE]'
            }`}
            title="Switch to Donor persona (Sarah Jenkins) & open Browse Wishes"
          >
            <span>Donor</span>
            <span className="text-[10px] opacity-75 font-normal hidden sm:inline">&bull; Sarah</span>
          </button>

          {/* 2. Children's Home (Institution) */}
          <button
            onClick={() => handleSwitch('institution')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 active:scale-95 border ${
              user?.role === 'institution'
                ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sm font-bold ring-2 ring-[#0284C7]/30'
                : 'bg-white hover:bg-[#E0EFF8] text-[#334155] hover:text-[#0F172A] border-[#D0E2EE]'
            }`}
            title="Switch to Children's Home persona (St. Mary's) & open Institution Hub"
          >
            <span>Institution</span>
            <span className="text-[10px] opacity-75 font-normal hidden sm:inline">&bull; St. Mary&apos;s</span>
          </button>

          {/* 3. Field Verifier */}
          <button
            onClick={() => handleSwitch('verifier')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 active:scale-95 border ${
              user?.role === 'verifier'
                ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sm font-bold ring-2 ring-[#0284C7]/30'
                : 'bg-white hover:bg-[#E0EFF8] text-[#334155] hover:text-[#0F172A] border-[#D0E2EE]'
            }`}
            title="Switch to Field Verifier persona (Marcus) & open Pending Inspection Queue"
          >
            <span>Verifier</span>
            <span className="text-[10px] opacity-75 font-normal hidden sm:inline">&bull; Marcus</span>
          </button>

          {/* 4. Administrator */}
          <button
            onClick={() => handleSwitch('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 active:scale-95 border ${
              user?.role === 'admin'
                ? 'bg-[#0284C7] text-white border-[#0284C7] shadow-sm font-bold ring-2 ring-[#0284C7]/30'
                : 'bg-white hover:bg-[#E0EFF8] text-[#334155] hover:text-[#0F172A] border-[#D0E2EE]'
            }`}
            title="Switch to Platform Administrator (Elena) & open BI Analytics"
          >
            <span>Admin</span>
            <span className="text-[10px] opacity-75 font-normal hidden sm:inline">&bull; Elena</span>
          </button>

          {/* Guest / Sign Out button */}
          {user ? (
            <button
              onClick={handleGuest}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition ml-1"
              title="Sign out to Guest persona"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => navigate('/browse')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#0369A1] bg-white hover:bg-[#E0EFF8] border border-[#D0E2EE] transition ml-1"
            >
              Browse Open Wishes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
