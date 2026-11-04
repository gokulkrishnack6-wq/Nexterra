import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Sparkles, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  ShieldCheck, 
  HelpCircle,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { calculateSmartMatches } from '../../lib/smartMatch';

export const SmartMatchPage: React.FC = () => {
  const { listings } = useData();
  const { currentUser } = useAuth();

  const smartMatches = useMemo(() => {
    return calculateSmartMatches(listings, currentUser);
  }, [listings, currentUser]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-lime/30 text-forest-dark border border-lime/40 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-forest" /> Algorithmic Compatibility Engine
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-forest-dark">
            Smart Circular Proximity Matching
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tailored resource matches for <strong className="text-forest-dark">{currentUser.full_name}</strong> ({currentUser.role.toUpperCase()} • {currentUser.district}).
          </p>
        </div>

        <div className="p-3 bg-white rounded-2xl border border-sage/40 shadow-soft text-xs flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-forest text-lime flex items-center justify-center font-bold">
            {smartMatches.length}
          </div>
          <div>
            <span className="font-bold text-forest-dark block">Compatible Batches</span>
            <span className="text-[11px] text-slate-400">Within Regional Radius</span>
          </div>
        </div>
      </div>

      {/* Role Context Callout */}
      <div className="bg-gradient-to-r from-forest to-forest-dark text-white p-6 rounded-3xl shadow-soft flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-lime flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5" /> Active Persona Filter: {currentUser.role}
          </span>
          <h3 className="font-heading font-bold text-lg text-white">
            How GreenLoop prioritizes your matches:
          </h3>
          <p className="text-xs text-sage-light leading-relaxed max-w-2xl">
            {currentUser.role === 'farmer' && 'Matching fresh kitchen peels, fruit discards, and coconut husks for your composting pits and soil amendment.'}
            {currentUser.role === 'recycler' && 'Prioritizing baled polymers, cardboard packaging cartons, metals, and e-waste matching your facility intake.'}
            {currentUser.role === 'business' && 'Connecting local generators to minimize commercial disposal costs and divert food waste.'}
            {currentUser.role === 'ngo' && 'Highlighting high-volume community batches for youth cleanups, upcycling drives, and education.'}
            {currentUser.role === 'individual' && 'Surfacing neighborhood household recyclables and zero-cost reusable materials.'}
            {currentUser.role === 'admin' && 'Demonstrating platform-wide matching transparency and spatial scoring.'}
          </p>
        </div>

        <div className="shrink-0 text-center bg-forest-dark/70 border border-sage/30 px-4 py-2.5 rounded-2xl">
          <span className="text-[10px] text-sage-light uppercase font-bold block">Scoring Weight</span>
          <span className="font-heading font-black text-lime text-base">Category 40% + Proximity 30%</span>
        </div>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {smartMatches.length === 0 ? (
          <div className="bg-white rounded-3xl border border-sage/40 p-12 text-center shadow-soft space-y-3">
            <Sparkles className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-heading font-bold text-base text-forest-dark">
              No matching listings in your district right now
            </h3>
            <p className="text-xs text-slate-500">
              Try switching your persona or browsing the marketplace for statewide batches.
            </p>
          </div>
        ) : (
          smartMatches.map((match) => (
            <div
              key={match.listing.id}
              className="bg-white rounded-2xl border border-sage/40 shadow-soft hover:shadow-elevated transition-all p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
            >
              {/* Left Details */}
              <div className="flex items-start gap-4 flex-1">
                <img
                  src={match.listing.images?.[0] || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80'}
                  alt={match.listing.title}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-100 shrink-0"
                />

                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-forest bg-sage-light px-2 py-0.5 rounded">
                      {match.listing.category?.name || 'Recyclable'}
                    </span>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-forest" />
                      {match.listing.locality}, {match.listing.district} (~{match.distance_km} km away)
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-base text-forest-dark line-clamp-1">
                    {match.listing.title}
                  </h3>

                  <p className="text-xs text-forest font-medium bg-lime/15 border border-lime/30 px-2.5 py-1 rounded-lg">
                    💡 {match.recommendation_reason}
                  </p>
                </div>
              </div>

              {/* Middle Breakdown Scores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-offwhite p-3 rounded-xl border border-slate-100 text-center shrink-0 w-full md:w-auto">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Category</span>
                  <span className="text-xs font-bold text-forest-dark">{match.factors.category_fit}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Distance</span>
                  <span className="text-xs font-bold text-forest-dark">{match.factors.location_proximity}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Quantity</span>
                  <span className="text-xs font-bold text-forest-dark">{match.factors.quantity_suitability}%</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Circularity</span>
                  <span className="text-xs font-bold text-forest-dark">{match.factors.circular_impact}%</span>
                </div>
              </div>

              {/* Right Final Match Score & Action */}
              <div className="flex items-center justify-between md:flex-col md:items-end gap-3 shrink-0 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
                <div className="text-left md:text-right">
                  <div className="flex items-center md:justify-end gap-1.5">
                    <span className="font-heading font-black text-2xl text-forest-dark">
                      {match.match_score}%
                    </span>
                    <span className="text-[10px] bg-lime text-forest-dark font-extrabold px-1.5 py-0.5 rounded">
                      MATCH
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">Transparent Algorithm</span>
                </div>

                <Link
                  to={`/marketplace/${match.listing.id}`}
                  className="flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  <span>Request Batch</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

