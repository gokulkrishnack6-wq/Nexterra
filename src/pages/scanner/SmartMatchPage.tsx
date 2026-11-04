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
  const { listings } = useData();
  const { currentUser } = useAuth();

  const smartMatches = useMemo(() => {
    return calculateSmartMatches(listings, currentUser);
  }, [listings, currentUser]);

  const userRole = currentUser?.role || 'individual';
  const userDistrict = currentUser?.district || 'Kerala';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Badge variant="brand">Algorithmic Pairing</Badge>
            <span className="text-outline text-xs">•</span>
            <span className="font-label-sm text-label-sm text-secondary">
              Proximity & Circular Compatibility Engine
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            Smart Material Matches
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Materials matching your profile as <strong className="text-primary capitalize">{userRole}</strong> in {userDistrict}.
          </p>
        </div>

        <span className="font-label-sm text-label-sm text-primary bg-surface-container px-3 py-1.5 rounded-full border border-outline-variant font-semibold self-start sm:self-auto">
          {smartMatches.length} Compatible Batches Found
        </span>
      </div>

      {/* Role Matching Explanation Banner */}
      <Card variant="low" className="p-4 space-y-1">
        <span className="font-heading font-semibold text-body-md text-primary flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Active Role Matching Logic:</span>
        </span>
        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          {userRole === 'farmer' && 'Prioritizing organic kitchen discards, vegetable peelings, and coconut husks for compost amendment.'}
          {userRole === 'recycler' && 'Highlighting segregated clean plastics, corrugated shipping cartons, e-waste, and scrap metals.'}
          {userRole === 'business' && 'Connecting local commercial food outlets to regional decentralized composting hubs.'}
          {userRole === 'ngo' && 'Surfacing bulk community batches suitable for neighborhood drives and cooperative sorting.'}
          {userRole === 'individual' && 'Surfacing neighborhood household items, free materials, and nearby collection opportunities.'}
          {userRole === 'admin' && 'Displaying multi-district proximity and circular diversion scores across all stakeholders.'}
        </p>
      </Card>

      {/* Matches List */}
      <div className="space-y-3">
        {smartMatches.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6" />}
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
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left hover:border-outline transition-all"
            >
              <div className="flex items-start gap-4 flex-1">
                <img
                  src={match.listing.images?.[0] || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=300&q=80'}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover border border-outline-variant/60 shrink-0 bg-surface-container"
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-[10px] font-bold text-primary uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-full border border-outline-variant/50">
                      {match.listing.category?.name || 'Material'}
                    </span>
                    <span className="text-on-surface-variant font-body-sm text-xs flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary" />
                      {match.listing.locality}, {match.listing.district} (~{match.distance_km} km)
                    </span>
                  </div>

                  <h3 className="font-heading font-semibold text-title-md text-on-surface">
                    {match.listing.title}
                  </h3>

                  <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed line-clamp-2">
                    {match.recommendation_reason}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                <div className="text-left sm:text-right">
                  <div className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold bg-secondary-container px-2.5 py-0.5 rounded-full">
                    <Sparkles className="w-3 h-3" /> {match.match_score}% Match
                  </div>
                  <span className="font-label-sm text-[10px] text-outline block mt-0.5">
                    Quantity: {match.listing.quantity} {match.listing.unit}
                  </span>
                </div>

                <Link to={`/marketplace/${match.listing.id}`}>
                  <Button size="sm" variant="primary" icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right">
                    Initiate Exchange
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
