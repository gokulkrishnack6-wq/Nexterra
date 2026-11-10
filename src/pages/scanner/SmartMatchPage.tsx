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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DA] pb-5">
        <div>
          <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
            Smart Matches
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#5C6E66] mt-1">
            Discover reusable materials available in your area matching your profile role.
          </p>
        </div>

        <span className="text-xs text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2.5 py-1 rounded-md font-medium self-start sm:self-auto">
          {smartMatches.length} Matches Found
        </span>
      </div>

      {/* Role Matching Explanation Banner */}
      <div className="p-3.5 space-y-1 bg-[#F8F6EF] border border-[#E8E4DA] rounded-lg text-xs">
        <span className="font-sans font-medium text-xs text-[#103D2A] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#103D2A]" />
          <span>Recommendations for your profile:</span>
        </span>
        <p className="text-xs text-[#5C6E66] leading-relaxed">
          {userRole === 'farmer' && 'Showing organic materials, vegetable scrap, and coconut husks for compost and soil amendment.'}
          {userRole === 'recycler' && 'Showing clean plastics, cardboard boxes, scrap metals, and e-waste.'}
          {userRole === 'business' && 'Connecting commercial outlets with local composting and recycling channels.'}
          {userRole === 'ngo' && 'Surfacing bulk batches suitable for community collection drives.'}
          {userRole === 'individual' && 'Showing free items, household recyclables, and materials available nearby.'}
          {userRole === 'admin' && 'Displaying circular materials and local diversion opportunities across all districts.'}
        </p>
      </div>

      {/* Matches List */}
      <div className="space-y-3">
        {smartMatches.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6 text-[#7B8B83]" />}
            title="No Smart Matches Found"
            description="No active listings currently match your profile role and geographic radius. Explore the marketplace or list items yourself."
            actionLabel="Explore Marketplace"
            actionLink="/marketplace"
          />
        ) : (
          smartMatches.map((match) => (
            <div
              key={match.listing.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all"
            >
              <div className="flex flex-col min-[380px]:flex-row items-start gap-3 sm:gap-4 flex-1">
                <img
                  src={match.listing.images?.[0] || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=300&q=80'}
                  alt=""
                  className="w-16 h-16 rounded-md object-cover border border-[#E8E4DA] shrink-0 bg-[#F4F1EA]"
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-[#103D2A] bg-[#E8EFE9] px-2 py-0.5 rounded-md border border-[#C8D6C9]">
                      {match.listing.category?.name || 'Material'}
                    </span>
                    <span className="text-[#5C6E66] text-xs flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#103D2A]" />
                      {match.listing.locality}, {match.listing.district} (~{match.distance_km} km)
                    </span>
                  </div>

                  <h3 className="font-sans font-medium text-sm text-[#1C2826]">
                    {match.listing.title}
                  </h3>

                  <p className="text-xs text-[#5C6E66] leading-relaxed line-clamp-2">
                    {match.recommendation_reason}
                  </p>
                </div>
              </div>

              <div className="flex flex-col xs:flex-row sm:flex-col items-stretch xs:items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto">
                <div className="text-left sm:text-right">
                  <div className="inline-flex items-center gap-1 text-xs text-[#103D2A] font-medium bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md">
                    <Sparkles className="w-3 h-3 text-[#103D2A]" /> {match.match_score}% Match
                  </div>
                  <span className="text-xs text-[#5C6E66] block mt-0.5">
                    Quantity: {match.listing.quantity} {match.listing.unit}
                  </span>
                </div>

                <Link to={`/marketplace/${match.listing.id}`} className="w-full sm:w-auto">
                  <Button size="sm" variant="primary" fullWidth className="sm:w-auto" icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right">
                    View Details
                  </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
