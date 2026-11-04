import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck, Sparkles } from 'lucide-react';
import { UserRole } from '../../types';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, allDemoUsers, switchUser } = useAuth();

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'individual': return 'Household / Resident';
      case 'business': return 'Business / Restaurant';
      case 'farmer': return 'Farmer / Agro Grower';
      case 'recycler': return 'Recycling Facility';
      case 'ngo': return 'NGO / Community';
      case 'admin': return 'Platform Admin';
      default: return role;
    }
  };

  return (
    <div className="bg-emerald-950/80 backdrop-blur border-b border-forest/40 text-xs py-1.5 px-4 text-emerald-100 flex flex-wrap items-center justify-between gap-2 shadow-inner">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-lime"></span>
        </span>
        <span className="font-semibold text-lime flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> TERRACODE 2026 Live Demo:
        </span>
        <span className="hidden sm:inline text-sage-light/80">
          Switch active user persona to preview role-based workflows:
        </span>
      </div>

      <div className="flex items-center gap-2">
        <UserCheck className="w-3.5 h-3.5 text-sage" />
        <select
          value={currentUser.id}
          onChange={(e) => switchUser(e.target.value)}
          className="bg-forest-dark border border-forest/60 text-white rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-lime cursor-pointer font-medium"
        >
          {allDemoUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name} ({getRoleLabel(u.role)}) — {u.district}
            </option>
          ))}
        </select>
        <span className="bg-lime/20 text-lime border border-lime/30 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]">
          {currentUser.role}
        </span>
      </div>
    </div>
  );
};
