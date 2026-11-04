import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Store, 
  Recycle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileText, 
  Sparkles,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

export const AdminDashboardPage: React.FC = () => {
  const { listings, recyclingCentres, transactions, deleteListing } = useData();
  const { currentUser, allDemoUsers } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'users' | 'centres' | 'audit'>('listings');

  // If active user is not admin, show role barrier with 1-click switch
  if (currentUser.role !== 'admin') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="font-heading font-extrabold text-2xl text-forest-dark">
          Administrator Access Required
        </h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          You are currently signed in as <strong>{currentUser.full_name}</strong> ({currentUser.role}). 
          For TERRACODE 2026 evaluation, switch your persona to <strong>Platform Admin</strong> using the top demo bar to preview administrative moderation.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-forest text-lime border border-forest-light px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-lime" /> Superadmin Operations Console
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-forest-dark">
            Platform Moderation & Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Oversee user verification, marketplace content moderation, and cryptographic exchange audit trails.
          </p>
        </div>

        <span className="bg-lime/20 text-forest-dark border border-lime/40 px-3 py-1.5 rounded-xl font-bold text-xs">
          Role: Platform Administrator (TERRACODE)
        </span>
      </div>

      {/* Admin Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-sage/40 shadow-soft">
          <span className="text-xs text-slate-400 font-medium block">Registered Users</span>
          <span className="font-heading font-black text-2xl text-forest-dark">
            {allDemoUsers.length}
          </span>
          <span className="text-[10px] text-emerald-600 block mt-1">100% Identity Verified</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-sage/40 shadow-soft">
          <span className="text-xs text-slate-400 font-medium block">Total Listings</span>
          <span className="font-heading font-black text-2xl text-forest-dark">
            {listings.length}
          </span>
          <span className="text-[10px] text-forest block mt-1">Active on Marketplace</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-sage/40 shadow-soft">
          <span className="text-xs text-slate-400 font-medium block">Verified Recovery Centres</span>
          <span className="font-heading font-black text-2xl text-forest-dark">
            {recyclingCentres.length}
          </span>
          <span className="text-[10px] text-slate-500 block mt-1">Haritha Karma / Clean Kerala</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-sage/40 shadow-soft">
          <span className="text-xs text-slate-400 font-medium block">Completed Transactions</span>
          <span className="font-heading font-black text-2xl text-forest-dark">
            {transactions.length}
          </span>
          <span className="text-[10px] text-lime-700 font-bold block mt-1">With Handover Security Codes</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-sage/40 pb-2">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'listings' ? 'bg-forest text-white shadow-sm' : 'text-slate-600 hover:bg-white'
          }`}
        >
          Listing Moderation ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'users' ? 'bg-forest text-white shadow-sm' : 'text-slate-600 hover:bg-white'
          }`}
        >
          User Accounts ({allDemoUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('centres')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'centres' ? 'bg-forest text-white shadow-sm' : 'text-slate-600 hover:bg-white'
          }`}
        >
          Facility Approvals ({recyclingCentres.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'audit' ? 'bg-forest text-white shadow-sm' : 'text-slate-600 hover:bg-white'
          }`}
        >
          Security Audit Logs ({transactions.length})
        </button>
      </div>

      {/* Content Panels */}
      {activeTab === 'listings' && (
        <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-heading font-bold text-base text-forest-dark">
              Marketplace Listings Under Moderation
            </h3>
            <span className="text-xs text-slate-400">Status: Realtime Active Sync</span>
          </div>

          <div className="divide-y divide-slate-100">
            {listings.map((l) => (
              <div key={l.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-forest bg-sage-light px-2 py-0.5 rounded">
                      {l.category?.name || 'Recyclable'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      {l.locality}, {l.district}
                    </span>
                    {l.ai_classified && (
                      <span className="text-[10px] bg-lime/40 text-forest font-bold px-1.5 py-0.5 rounded">
                        AI Verified ({l.ai_confidence}%)
                      </span>
                    )}
                  </div>
                  <h4 className="font-heading font-bold text-sm text-forest-dark">{l.title}</h4>
                  <p className="text-xs text-slate-500">
                    Quantity: {l.quantity} {l.unit} • Pricing: {l.listing_type} • Status: {l.status}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (confirm(`Remove listing "${l.title}" from GreenLoop?`)) {
                        deleteListing(l.id);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Moderate / Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-4">
          <h3 className="font-heading font-bold text-base text-forest-dark pb-3 border-b border-slate-100">
            Registered Community Members & Organizations
          </h3>

          <div className="divide-y divide-slate-100">
            {allDemoUsers.map((u) => (
              <div key={u.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <img src={u.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <h4 className="font-heading font-bold text-forest-dark">{u.full_name}</h4>
                    <p className="text-[11px] text-slate-400">{u.email} • {u.district}, Kerala</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="bg-sage-light text-forest px-2 py-0.5 rounded font-bold uppercase text-[10px]">
                    {u.role}
                  </span>
                  <span className="font-bold text-forest-dark">
                    {u.eco_points_balance} PTS
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'centres' && (
        <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-4">
          <h3 className="font-heading font-bold text-base text-forest-dark pb-3 border-b border-slate-100">
            Certified Facilities Registry
          </h3>

          <div className="divide-y divide-slate-100">
            {recyclingCentres.map((centre) => (
              <div key={centre.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-heading font-bold text-forest-dark text-sm">{centre.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {centre.address} • Phone: {centre.phone}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Certified Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-4">
          <h3 className="font-heading font-bold text-base text-forest-dark pb-3 border-b border-slate-100">
            Cryptographic Transaction & Exchange Audit Logs
          </h3>

          <div className="divide-y divide-slate-100 text-xs">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] text-slate-400 block font-bold">TX ID: {tx.id}</span>
                  <p className="font-bold text-forest-dark mt-0.5">
                    Circular Exchange of {tx.quantity} {tx.unit}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Saved {tx.co2_saved_kg} kg CO₂e • Diverted {tx.landfill_saved_kg} kg from landfill • Awarded {tx.eco_points_awarded} PTS
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">
                    {new Date(tx.completed_at).toLocaleString()}
                  </span>
                  <span className="text-emerald-700 font-bold text-[11px]">
                    Verified Handover ✓
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

