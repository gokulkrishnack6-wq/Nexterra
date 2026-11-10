import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Sparkles, Award } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { calculateSmartMatches } from '../../lib/smartMatch';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Skeleton';

export const SmartMatchPage: React.FC = () => {
  const { listings, allMarketplaceListings } = useData();
  const { currentUser } = useAuth();

  const sourceListings = allMarketplaceListings || listings;

  const smartMatches = useMemo(() => {
    return calculateSmartMatches(sourceListings, currentUser);
  }, [sourceListings, currentUser]);

  const userRole = currentUser?.role || 'individual';
  const userDistrict = currentUser?.district || 'Kerala';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DA] pb-5">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl lg:text-[34px] text-[#18251F] tracking-tight">
            Smart Matches
          </h1>
          <p className="font-sans text-sm text-[#6F776F] mt-1">
            Discover reusable materials available in your area.
          </p>
        </div>

        <span className="text-xs text-[#103D2A] bg-[#E7EEDC] px-3.5 py-1.5 rounded-full font-semibold self-start sm:self-auto">
          {smartMatches.length} Matches Found
        </span>
      </div>

      {/* Role Matching Explanation Banner */}
      <Card variant="low" className="p-4 space-y-1 bg-gl-cream/70 border border-gl-border rounded-2xl">
        <span className="font-heading font-bold text-xs text-gl-charcoal flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-gl-forest" />
          <span>Recommendations for your profile:</span>
        </span>
        <p className="text-xs text-gl-charcoal-muted leading-relaxed">
          {userRole === 'farmer' && 'Showing organic materials, vegetable scrap, and coconut husks for compost and soil amendment.'}
          {userRole === 'recycler' && 'Showing clean plastics, cardboard boxes, scrap metals, and e-waste.'}
          {userRole === 'business' && 'Connecting commercial outlets with local composting and recycling channels.'}
          {userRole === 'ngo' && 'Surfacing bulk batches suitable for community collection drives.'}
          {userRole === 'individual' && 'Showing free items, household recyclables, and materials available nearby.'}
          {userRole === 'admin' && 'Displaying circular materials and local diversion opportunities across all districts.'}
        </p>
      </Card>

      {/* Matches List */}
      <div className="space-y-3">
        {smartMatches.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6 text-gl-charcoal-muted" />}
            title="No Smart Matches Found"
            description="No active listings currently match your profile role and geographic radius. Explore the marketplace or list items yourself."
            actionLabel="Explore Marketplace"
            actionLink="/marketplace"
          />
        ) : (
          smartMatches.map((match) => (
            <Card
              key={match.listing.id}
              variant="elevated"
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left bg-white border border-gl-border rounded-2xl shadow-card hover:shadow-card-hover transition-all"
            >
              <div className="flex flex-col min-[380px]:flex-row items-start gap-3 sm:gap-4 flex-1">
                <img
                  src={match.listing.images?.[0] || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=300&q=80'}
                  alt=""
                  className="w-20 h-20 rounded-xl object-cover border border-gl-border shrink-0 bg-gl-cream"
                />

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gl-dark uppercase tracking-wider bg-gl-sage-light px-2.5 py-0.5 rounded-full border border-gl-sage">
                      {match.listing.category?.name || 'Material'}
                    </span>
                    <span className="text-gl-charcoal-muted text-xs flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gl-forest" />
                      {match.listing.locality}, {match.listing.district} (~{match.distance_km} km)
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-base text-gl-charcoal">
                    {match.listing.title}
                  </h3>

                  <p className="text-xs text-gl-charcoal-muted leading-relaxed line-clamp-2">
                    {match.recommendation_reason}
                  </p>
                </div>
              </div>

              <div className="flex flex-col xs:flex-row sm:flex-col items-stretch xs:items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                <div className="text-left sm:text-right">
                  <div className="inline-flex items-center gap-1 text-xs text-gl-dark font-bold bg-gl-sage-light border border-gl-sage px-2.5 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3 text-gl-fresh" /> {match.match_score}% Match
                  </div>
                  <span className="text-[11px] text-gl-charcoal-muted block mt-0.5">
                    Quantity: {match.listing.quantity} {match.listing.unit}
                  </span>
                </div>

                <Link to={`/marketplace/${match.listing.id}`} className="w-full sm:w-auto">
                  <Button size="sm" variant="primary" fullWidth className="sm:w-auto rounded-xl shadow-sm" icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right">
                    View Details
                  </Button>
                </Link>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
