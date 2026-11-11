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
      style={{ backgroundColor: '#18142A' }}
      className="bg-[#18142A] text-white border-b border-[#3A2A55] px-3 sm:px-6 py-2.5 relative z-50 shadow-md"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Role Switcher Label & Current User */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#3A2A55]/90 border border-[#F6B93B]/40 text-[#F6B93B] text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#F6B93B]" />
            <span>1-Click Role Switcher</span>
          </div>

          <div className="text-xs text-[#D4CEE0] flex items-center gap-1.5">
            <span className="hidden sm:inline">Active:</span>
            {user ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#FFFBF5] bg-[#3A2A55]/60 px-2 py-0.5 rounded-md border border-[#3A2A55]">
                <span className="w-2 h-2 rounded-full bg-[#1F8A7A]" />
                <span className="capitalize">{user.role}</span>
                <span className="text-[#AEA6BF] font-normal hidden sm:inline">({user.full_name})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-[#F6B93B] bg-[#3A2A55]/60 px-2 py-0.5 rounded-md border border-[#3A2A55]">
                <span className="w-2 h-2 rounded-full bg-[#F6B93B]" />
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
                ? 'bg-[#E4572E] text-white border-[#E4572E] shadow-sm font-bold ring-2 ring-[#E4572E]/40'
                : 'bg-[#251F3D] hover:bg-[#3A2A55] text-[#D4CEE0] hover:text-white border-[#3A2A55]'
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
                ? 'bg-[#E4572E] text-white border-[#E4572E] shadow-sm font-bold ring-2 ring-[#E4572E]/40'
                : 'bg-[#251F3D] hover:bg-[#3A2A55] text-[#D4CEE0] hover:text-white border-[#3A2A55]'
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
                ? 'bg-[#E4572E] text-white border-[#E4572E] shadow-sm font-bold ring-2 ring-[#E4572E]/40'
                : 'bg-[#251F3D] hover:bg-[#3A2A55] text-[#D4CEE0] hover:text-white border-[#3A2A55]'
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
                ? 'bg-[#E4572E] text-white border-[#E4572E] shadow-sm font-bold ring-2 ring-[#E4572E]/40'
                : 'bg-[#251F3D] hover:bg-[#3A2A55] text-[#D4CEE0] hover:text-white border-[#3A2A55]'
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
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-300 hover:text-white hover:bg-rose-900/40 border border-rose-900/50 transition ml-1"
              title="Sign out to Guest persona"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => navigate('/browse')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#F6B93B] hover:bg-[#3A2A55] border border-[#F6B93B]/30 transition ml-1"
            >
              Browse Open Wishes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
