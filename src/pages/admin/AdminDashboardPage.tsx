import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

export const AdminDashboardPage: React.FC = () => {
  const { listings, recyclingCentres, transactions, deleteListing } = useData();
  const { currentUser, allDemoUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'users' | 'centres' | 'audit'>('listings');

  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <Lock className="w-8 h-8 text-charcoal-muted mx-auto" />
        <h2 className="font-heading font-bold text-lg text-charcoal">
          Administrator Access
        </h2>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          You are currently signed in as <strong>{currentUser.full_name}</strong> ({currentUser.role}). 
          Switch to the <strong>Administrator</strong> persona using the top bar to review moderation controls.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-forest">
            Platform Administration
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Content moderation, user directories, facility approvals, and security audit logs.
          </p>
        </div>

        <span className="text-xs text-charcoal bg-white border border-[#E2E2D8] px-3 py-1.5 rounded-md self-start sm:self-auto">
          Role: Platform Administrator
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-0.5">
          <span className="text-charcoal-muted font-medium block">Registered Users</span>
          <span className="font-heading font-bold text-xl text-charcoal">
            {allDemoUsers.length}
          </span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-0.5">
          <span className="text-charcoal-muted font-medium block">Total Listings</span>
          <span className="font-heading font-bold text-xl text-charcoal">
            {listings.length}
          </span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-0.5">
          <span className="text-charcoal-muted font-medium block">Verified Facilities</span>
          <span className="font-heading font-bold text-xl text-charcoal">
            {recyclingCentres.length}
          </span>
        </div>
        <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-0.5">
          <span className="text-charcoal-muted font-medium block">Verified Transactions</span>
          <span className="font-heading font-bold text-xl text-charcoal">
            {transactions.length}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E2E2D8] text-xs">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'listings'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          Listing Moderation ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'users'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          User Accounts ({allDemoUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('centres')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'centres'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          Recovery Facilities ({recyclingCentres.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-3 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'audit'
              ? 'border-forest text-forest font-semibold'
              : 'border-transparent text-charcoal-muted hover:text-charcoal'
          }`}
        >
          Audit Logs ({transactions.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'listings' && (
        <div className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-charcoal pb-2 border-b border-[#F0F0E6]">
            Marketplace Listings
          </h3>

          <div className="divide-y divide-[#F0F0E6] text-xs">
            {listings.map((l) => (
              <div key={l.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-charcoal-muted text-[11px]">
                    <span className="font-medium text-forest">{l.category?.name}</span>
                    <span>•</span>
                    <span>{l.locality}, {l.district}</span>
                    <span>•</span>
                    <span>{l.quantity} {l.unit}</span>
                  </div>
                  <h4 className="font-heading font-semibold text-sm text-charcoal">{l.title}</h4>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Remove listing "${l.title}" from marketplace?`)) {
                      deleteListing(l.id);
                    }
                  }}
                  className="px-3 py-1 bg-cream hover:bg-red-50 text-red-700 border border-[#D5D5CA] rounded text-xs transition-colors self-start sm:self-auto"
                >
                  Remove Listing
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-charcoal pb-2 border-b border-[#F0F0E6]">
            Registered Users
          </h3>

          <div className="divide-y divide-[#F0F0E6] text-xs">
            {allDemoUsers.map((u) => (
              <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                  <div>
                    <span className="font-semibold text-charcoal">{u.full_name}</span>
                    <span className="text-charcoal-muted text-[11px] block">{u.email} • {u.district}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-semibold text-forest bg-cream px-2 py-0.5 rounded border border-[#E2E2D8]">
                    {u.role}
                  </span>
                  <span className="text-charcoal-muted">{u.eco_points_balance} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'centres' && (
        <div className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-charcoal pb-2 border-b border-[#F0F0E6]">
            Approved Facilities
          </h3>

          <div className="divide-y divide-[#F0F0E6] text-xs">
            {recyclingCentres.map((centre) => (
              <div key={centre.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-heading font-semibold text-sm text-charcoal">{centre.name}</h4>
                  <p className="text-charcoal-muted text-[11px]">{centre.address} • {centre.phone}</p>
                </div>
                <span className="text-forest text-[11px] font-semibold bg-cream px-2 py-0.5 rounded border border-[#E2E2D8]">
                  Verified
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-3">
          <h3 className="font-heading font-semibold text-sm text-charcoal pb-2 border-b border-[#F0F0E6]">
            Verified Handover Records
          </h3>

          <div className="divide-y divide-[#F0F0E6] text-xs">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] text-charcoal-muted block">ID: {tx.id}</span>
                  <span className="font-medium text-charcoal">
                    Exchange: {tx.quantity} {tx.unit}
                  </span>
                  <p className="text-charcoal-muted text-[11px]">
                    Avoided {tx.co2_saved_kg} kg CO₂e • Landfill saved: {tx.landfill_saved_kg} kg
                  </p>
                </div>
                <div className="text-left sm:text-right text-[11px] text-charcoal-muted">
                  {new Date(tx.completed_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
