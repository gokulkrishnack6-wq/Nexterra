import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Sparkles } from 'lucide-react';
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-forest">
            Smart Proximity Matches
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Materials matching your profile as <strong className="text-charcoal capitalize">{currentUser.role}</strong> in {currentUser.district}.
          </p>
        </div>

        <span className="text-xs text-charcoal bg-white border border-[#E2E2D8] px-3 py-1.5 rounded-md self-start sm:self-auto">
          {smartMatches.length} Compatible Materials Found
        </span>
      </div>

      {/* Explanation Banner */}
      <div className="bg-cream border border-[#E2E2D8] p-4 rounded-lg text-xs space-y-1">
        <span className="font-semibold text-forest flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-forest" />
          <span>Role Matching Criterion:</span>
        </span>
        <p className="text-charcoal-muted leading-relaxed">
          {currentUser.role === 'farmer' && 'Focusing on kitchen peels, garden trimmings, and coconut mulch for soil enrichment.'}
          {currentUser.role === 'recycler' && 'Highlighting baled plastics, corrugated cardboard, e-waste, and metals matching recovery intakes.'}
          {currentUser.role === 'business' && 'Connecting local commercial generators to divert bulk organic waste.'}
          {currentUser.role === 'ngo' && 'Prioritizing bulk community batches suitable for cleanups and local recycling drives.'}
          {currentUser.role === 'individual' && 'Surfacing neighborhood household materials and zero-cost reusable items.'}
          {currentUser.role === 'admin' && 'Displaying transparent proximity and category weighting across all sectors.'}
        </p>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {smartMatches.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#E2E2D8] p-12 text-center text-xs space-y-2">
            <h3 className="font-heading font-semibold text-sm text-charcoal">
              No immediate matches in your local area
            </h3>
            <p className="text-charcoal-muted">
              Explore the full marketplace or switch your test persona to view other role suggestions.
            </p>
          </div>
        ) : (
          smartMatches.map((match) => (
            <div
              key={match.listing.id}
              className="bg-white rounded-lg border border-[#E2E2D8] hover:border-forest/40 transition-colors p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div className="flex items-start gap-3.5 flex-1">
                <img
                  src={match.listing.images?.[0] || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=300&q=80'}
                  alt=""
                  className="w-16 h-16 rounded-md object-cover border border-[#E2E2D8] shrink-0"
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-forest uppercase tracking-wider bg-cream px-1.5 py-0.5 rounded border border-[#E2E2D8]">
                      {match.listing.category?.name || 'Material'}
                    </span>
                    <span className="text-charcoal-muted flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-forest" />
                      {match.listing.locality}, {match.listing.district} (~{match.distance_km} km)
                    </span>
                  </div>

                  <h3 className="font-heading font-semibold text-sm text-charcoal">
                    {match.listing.title}
                  </h3>

                  <p className="text-[11px] text-charcoal-muted leading-relaxed">
                    {match.recommendation_reason}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                <div className="text-left sm:text-right">
                  <span className="font-heading font-bold text-forest text-base">
                    {match.match_score}%
                  </span>
                  <span className="text-[10px] text-charcoal-muted block">compatibility</span>
                </div>

                <Link
                  to={`/marketplace/${match.listing.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-forest hover:underline"
                >
                  <span>View Details</span>
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
