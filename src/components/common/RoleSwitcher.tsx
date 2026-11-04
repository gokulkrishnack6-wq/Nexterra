import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserCheck } from 'lucide-react';
import { UserRole } from '../../types';

export const RoleSwitcher: React.FC = () => {
  const { currentUser, allDemoUsers, switchUser } = useAuth();

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'individual': return 'Household';
      case 'business': return 'Business / Restaurant';
      case 'farmer': return 'Farmer / Grower';
      case 'recycler': return 'Recycling Facility';
      case 'ngo': return 'Community NGO';
      case 'admin': return 'Administrator';
      default: return role;
    }
  };

  return (
    <div className="bg-[#EFEFE6] border-b border-[#E2E2D8] text-[11px] py-1 px-4 text-charcoal flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
        <span className="font-medium text-forest">Demo Mode</span>
        <span className="hidden sm:inline text-charcoal-muted">
          — Switch user role to preview permissions:
        </span>
      </div>

      <div className="flex items-center gap-2">
        <UserCheck className="w-3.5 h-3.5 text-charcoal-muted" />
        <select
          value={currentUser.id}
          onChange={(e) => switchUser(e.target.value)}
          className="bg-white border border-[#D5D5CA] text-charcoal rounded px-2 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-forest cursor-pointer"
        >
          {allDemoUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name} ({getRoleLabel(u.role)}) • {u.district}
            </option>
          ))}
        </select>
        <span className="text-[10px] uppercase tracking-wider text-charcoal-muted font-medium bg-white border border-[#D5D5CA] px-1.5 py-0.5 rounded">
          {currentUser.role}
        </span>
      </div>
    </div>
  );
};
