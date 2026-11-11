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
      style={{ backgroundColor: '#DFEEF2' }}
      className="bg-[#DFEEF2] text-[#192D2A] border-b border-[#C5DAD7] px-3 sm:px-6 py-2 relative z-50 shadow-xs"
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Left: Role Switcher Label & Current User */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F0] border border-[#D4CAB0] text-[#194641] text-[11px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-[#C69749]" />
            <span>1-Click Role Switcher</span>
          </div>

          <div className="text-xs text-[#3D4D49] flex items-center gap-1.5">
            <span className="hidden sm:inline">Active:</span>
            {user ? (
              <span className="inline-flex items-center gap-1 font-semibold text-[#1D2927] bg-[#FBF9F3] px-2 py-0.5 rounded-md border border-[#D4CAB0] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#24635C]" />
                <span className="capitalize">{user.role}</span>
                <span className="text-[#53645F] font-normal hidden sm:inline">({user.full_name})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-[#1B4D48] bg-[#FBF9F3] px-2 py-0.5 rounded-md border border-[#D4CAB0] shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#C89238]" />
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
                ? 'bg-[#215B54] text-[#FAF7F0] border-[#194641] shadow-sm font-bold ring-2 ring-[#215B54]/25'
                : 'bg-[#FAF7F0] hover:bg-[#F2EEE3] text-[#2A3835] hover:text-[#192D2A] border-[#D4CAB0]'
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
                ? 'bg-[#215B54] text-[#FAF7F0] border-[#194641] shadow-sm font-bold ring-2 ring-[#215B54]/25'
                : 'bg-[#FAF7F0] hover:bg-[#F2EEE3] text-[#2A3835] hover:text-[#192D2A] border-[#D4CAB0]'
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
                ? 'bg-[#215B54] text-[#FAF7F0] border-[#194641] shadow-sm font-bold ring-2 ring-[#215B54]/25'
                : 'bg-[#FAF7F0] hover:bg-[#F2EEE3] text-[#2A3835] hover:text-[#192D2A] border-[#D4CAB0]'
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
                ? 'bg-[#215B54] text-[#FAF7F0] border-[#194641] shadow-sm font-bold ring-2 ring-[#215B54]/25'
                : 'bg-[#FAF7F0] hover:bg-[#F2EEE3] text-[#2A3835] hover:text-[#192D2A] border-[#D4CAB0]'
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
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#722B1F] bg-[#FBF3F1] hover:bg-[#F5E0DC] border border-[#DC9C90] transition ml-1"
              title="Sign out to Guest persona"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => navigate('/browse')}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#194641] bg-[#FAF7F0] hover:bg-[#F2EEE3] border border-[#D4CAB0] transition ml-1"
            >
              Browse Open Wishes
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
