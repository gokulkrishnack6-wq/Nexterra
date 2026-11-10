import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { EmptyState, MetricCardSkeleton } from '../../components/ui/Skeleton';
import { LandscapeIllustration } from '../../components/dashboard/LandscapeIllustration';
import { ExchangeRequest } from '../../types';
import {
  Package,
  Repeat,
  Award,
  Leaf,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ScanLine,
  Plus,
  QrCode,
  Clock,
  Compass,
  ShieldCheck,
  MapPin,
  Users
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { listings, allMarketplaceListings, exchangeRequests, metrics, challenges, reports, isLoading } = useData();
  const {
    district: userDistrict,
    locality: userLocality,
  } = useGeolocation();
  const navigate = useNavigate();

  // User-specific data slices (safely handled when unauthenticated or freshly signed up)
  const currentUserId = currentUser?.id || '';
  const myListings = listings.filter((l) => l.user_id === currentUserId && l.status === 'active');
  const myExchanges = exchangeRequests.filter(
    (r) => r.requester_id === currentUserId || r.provider_id === currentUserId || r.listing?.user_id === currentUserId
  );
  const activeExchanges = myExchanges.filter(
    (r) => r.status === 'accepted' || r.status === 'pending'
  );

  // Digital Handover Pass Modal State
  const [selectedExchangeForPass, setSelectedExchangeForPass] = useState<ExchangeRequest | null>(null);

  // Handle Escape key and body scroll lock for Handover Pass Modal
  useEffect(() => {
    if (!selectedExchangeForPass) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedExchangeForPass(null);
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedExchangeForPass]);

  // Available community challenge or spotlight drive
  const spotlightDrive = challenges[0] || null;
  const [rsvpDone, setRsvpDone] = useState(false);

  // Recent civic reports in the regional area
  const recentReports = reports.slice(0, 3);

  // Smart suggestions from available listings in other categories
  const marketplaceInventory = allMarketplaceListings && allMarketplaceListings.length > 0 ? allMarketplaceListings : listings;
  const suggestedListings = marketplaceInventory.filter((l) => l.user_id !== currentUserId && l.status === 'active').slice(0, 3);
  const activeMarketplaceCount = marketplaceInventory.filter((l) => l.status === 'active').length;

  if (isLoading && listings.length === 0 && exchangeRequests.length === 0) {
    return (
      <div className="flex flex-col w-full gap-8 pb-12 max-w-7xl mx-auto" aria-busy="true">
        <div className="h-44 rounded-2xl bg-white border border-[#E8E4DA] animate-pulse p-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-8 pb-14 max-w-7xl mx-auto text-left min-w-0">

      {/* 1. DASHBOARD GREETING — EXACT DESIGN */}
      <section className="relative bg-white rounded-[20px] p-6 sm:p-8 lg:p-10 border border-[#E8E4DA] shadow-[0_2px_12px_rgba(16,61,42,0.03)] overflow-hidden">
        {/* Kerala-inspired Landscape Illustration on the right */}
        <LandscapeIllustration className="absolute right-0 top-0 bottom-0 w-full sm:w-2/3 lg:w-1/2 opacity-90 hidden sm:block pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          {/* Subtle Location Pill */}
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="font-sans text-[11px] font-semibold text-[#103D2A] bg-[#E7EEDC] px-3 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#315F3B] animate-pulse" />
              Kerala Circular Action
            </span>
            <span className="text-xs text-[#6F776F] font-medium flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-[#103D2A]" />
              {userDistrict
                ? (userLocality && userLocality !== userDistrict ? `${userLocality}, ${userDistrict}` : userDistrict)
                : 'Statewide Network'}
            </span>
          </div>

          {/* Editorial Greeting Header */}
          <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-[46px] leading-[1.15] text-[#18251F] tracking-tight">
            Namaskaram,<br />
            <span className="text-[#103D2A]">{currentUser ? currentUser.full_name : 'Circular Pioneer'}</span>
          </h1>

          {/* Subtitle */}
          <p className="font-sans text-[15px] sm:text-base text-[#6F776F] mt-3 leading-relaxed">
            Manage your listings, coordinate pickups, and track your environmental impact on GreenLoop.
          </p>

          {/* Three Consistent Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => navigate('/marketplace/new')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#103D2A] hover:bg-[#08291D] text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-[0.99] h-11 sm:h-12"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Add Listing</span>
            </button>

            <button
              onClick={() => navigate('/ai-scanner')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-[#F8F6EF] text-[#18251F] border border-[#E8E4DA] rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-[0.99] h-11 sm:h-12"
            >
              <ScanLine className="w-4 h-4 text-[#315F3B]" />
              <span>Waste Scanner</span>
            </button>

            <button
              onClick={() => navigate('/report-issue')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-[#F8F6EF] text-[#18251F] border border-[#E8E4DA] rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-[0.99] h-11 sm:h-12"
            >
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. DASHBOARD METRIC CARDS (Four Softly Tinted Horizontal Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

        {/* Card 1: Verified Diversion (Soft sage background) */}
        <div className="bg-[#E7EEDC] p-6 rounded-[18px] border border-[#8BA681]/30 shadow-[0_2px_8px_rgba(16,61,42,0.03)] hover:shadow-card-hover transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-wider text-[#103D2A] font-bold font-sans">
              Verified Diversion
            </span>
            <span className="w-9 h-9 rounded-full bg-white/80 text-[#103D2A] flex items-center justify-center shadow-xs">
              <Leaf className="w-4 h-4" />
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-3xl sm:text-[34px] text-[#103D2A] tracking-tight">
                {metrics.total_waste_diverted_kg}
              </span>
              <span className="text-sm font-semibold text-[#315F3B]">
                kg
              </span>
            </div>
            <p className="text-xs text-[#6F776F] mt-1">
              Diverted from regional waste streams
            </p>
          </div>

          <div className="pt-3 border-t border-[#8BA681]/25 flex items-center justify-between text-xs text-[#103D2A] font-medium">
            <span>Avoided Emissions</span>
            <span className="font-bold">{metrics.total_co2e_avoided_kg} kg CO₂e</span>
          </div>
        </div>

        {/* Card 2: Your Active Listings (Soft warm-peach background) */}
        <div className="bg-[#FAF0E6] p-6 rounded-[18px] border border-[#D97706]/20 shadow-[0_2px_8px_rgba(16,61,42,0.03)] hover:shadow-card-hover transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-wider text-[#92400E] font-bold font-sans">
              Your Active Listings
            </span>
            <span className="w-9 h-9 rounded-full bg-white/80 text-[#D97706] flex items-center justify-center shadow-xs">
              <Package className="w-4 h-4" />
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-3xl sm:text-[34px] text-[#92400E] tracking-tight">
                {myListings.length}
              </span>
              <span className="text-sm font-semibold text-[#D97706]">
                batches
              </span>
            </div>
            <p className="text-xs text-[#6F776F] mt-1">
              {myListings.length === 0 ? 'No active batches published' : `${myListings.length} published on marketplace`}
            </p>
          </div>

          <div className="pt-3 border-t border-[#D97706]/15 flex items-center justify-between text-xs text-[#92400E] font-medium">
            <span>Statewide Inventory</span>
            <span className="font-bold">{activeMarketplaceCount} available</span>
          </div>
        </div>

        {/* Card 3: Custody Handovers (Soft pale-mint background) */}
        <div className="bg-[#E6F4EA] p-6 rounded-[18px] border border-[#315F3B]/20 shadow-[0_2px_8px_rgba(16,61,42,0.03)] hover:shadow-card-hover transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-wider text-[#08291D] font-bold font-sans">
              Custody Handovers
            </span>
            <span className="w-9 h-9 rounded-full bg-white/80 text-[#103D2A] flex items-center justify-center shadow-xs">
              <Repeat className="w-4 h-4" />
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-3xl sm:text-[34px] text-[#08291D] tracking-tight">
                {activeExchanges.length}
              </span>
              <span className="text-sm font-semibold text-[#315F3B]">
                active
              </span>
            </div>
            <p className="text-xs text-[#6F776F] mt-1">
              {activeExchanges.length === 0 ? 'No handovers in progress' : `${activeExchanges.length} awaiting pickup verification`}
            </p>
          </div>

          <div className="pt-3 border-t border-[#315F3B]/15 flex items-center justify-between text-xs text-[#08291D] font-medium">
            <span>Completed Handovers</span>
            <span className="font-bold">{metrics.total_completed_exchanges} verified</span>
          </div>
        </div>

        {/* Card 4: EcoPoints Balance (Soft pale-lavender background) */}
        <div className="bg-[#F0EEF8] p-6 rounded-[18px] border border-[#7C3AED]/20 shadow-[0_2px_8px_rgba(16,61,42,0.03)] hover:shadow-card-hover transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[12px] uppercase tracking-wider text-[#5B21B6] font-bold font-sans">
              EcoPoints Balance
            </span>
            <span className="w-9 h-9 rounded-full bg-white/80 text-[#7C3AED] flex items-center justify-center shadow-xs">
              <Award className="w-4 h-4" />
            </span>
          </div>

          <div className="my-4">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-bold text-3xl sm:text-[34px] text-[#5B21B6] tracking-tight">
                {currentUser ? currentUser.eco_points_balance : 0}
              </span>
              <span className="text-sm font-semibold text-[#7C3AED]">
                PTS
              </span>
            </div>
            <p className="text-xs text-[#6F776F] mt-1">
              {currentUser ? `Reward balance for ${currentUser.full_name}` : 'Sign in to accrue reward points'}
            </p>
          </div>

          <div className="pt-3 border-t border-[#7C3AED]/15 flex items-center justify-between text-xs text-[#5B21B6] font-medium">
            <span>Account Status</span>
            <span className="font-bold capitalize">{currentUser ? `${currentUser.role} Participant` : 'Public Visitor'}</span>
          </div>
        </div>

      </section>

      {/* 3. TWO-COLUMN WORKFLOW: SMART MATERIAL MATCHES (70%) + COMMUNITY INITIATIVES (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-w-0">

        {/* Left Column (~70% width, 8 cols): Smart Material Matches */}
        <section className="lg:col-span-8 flex flex-col gap-5 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1 border-b border-[#E8E4DA]/60">
            <div>
              <h2 className="font-heading font-bold text-[24px] sm:text-[26px] text-[#103D2A]">
                Smart Material Matches
              </h2>
              <p className="font-sans text-sm text-[#6F776F] mt-0.5">
                Discover reusable materials available in your area.
              </p>
            </div>

            <Link
              to="/marketplace"
              className="text-xs font-semibold text-[#103D2A] hover:underline flex items-center gap-1 transition-colors self-start sm:self-auto"
            >
              <span>Browse Marketplace ({activeMarketplaceCount})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {suggestedListings.length === 0 ? (
            <EmptyState
              icon={<Sparkles className="w-6 h-6 text-[#103D2A]" />}
              title="No Nearby Material Matches Currently"
              description="When households, workshops, or businesses in your area publish excess organic biomass, clean paper, or plastics, circular matches will appear here."
              actionLabel="List First Material Batch"
              actionLink="/marketplace/new"
            />
          ) : (
            <div className="flex flex-col gap-4">
              {suggestedListings.map((listing) => {
                const primaryImage = listing.images && listing.images.length > 0 
                  ? listing.images[0] 
                  : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80';

                return (
                  <article
                    key={listing.id}
                    className="bg-white rounded-[18px] p-4 sm:p-5 border border-[#E8E4DA] shadow-[0_2px_8px_rgba(16,61,42,0.03)] hover:border-[#8BA681] hover:shadow-card-hover transition-all flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between min-w-0"
                  >
                    <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                      {/* Real Material Image (Approx 125 x 135px) */}
                      <img
                        src={primaryImage}
                        alt={listing.title}
                        className="w-28 sm:w-[125px] h-28 sm:h-[135px] object-cover rounded-xl shrink-0 border border-[#E8E4DA] bg-[#F8F6EF]"
                        loading="lazy"
                      />

                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-[#103D2A] bg-[#E7EEDC] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            {listing.category?.name || 'Reusable Material'}
                          </span>
                          <span className="text-xs font-semibold text-[#18251F] bg-[#F8F6EF] px-2 py-0.5 rounded-md border border-[#E8E4DA]">
                            {listing.listing_type === 'free' ? 'Free' : listing.listing_type === 'exchange' ? 'Barter' : `₹${listing.price || 0}`}
                          </span>
                          <span className="text-xs font-medium text-[#315F3B] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#315F3B]" />
                            {listing.status === 'reserved' ? 'Reserved' : 'Available'}
                          </span>
                        </div>

                        <h3 className="font-heading font-bold text-base text-[#18251F] line-clamp-1">
                          {listing.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6F776F]">
                          <span>Quantity: <strong className="text-[#103D2A] font-semibold">{listing.quantity} {listing.unit}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#103D2A]" />
                            {listing.district}
                          </span>
                        </div>

                        <p className="text-xs text-[#6F776F] line-clamp-2 leading-relaxed">
                          {listing.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#E8E4DA]">
                      <button
                        onClick={() => navigate(`/marketplace/${listing.id}`)}
                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#103D2A] hover:bg-[#08291D] text-white text-xs font-semibold shadow-xs transition-colors w-full sm:w-auto"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Active Custody Handovers (Preserved Bilateral Handover Manifest) */}
          <section className="mt-4 flex flex-col gap-3.5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1 border-b border-[#E8E4DA]/60">
              <div>
                <h3 className="font-heading font-bold text-xl text-[#18251F]">
                  Active Custody Handovers
                </h3>
                <p className="font-sans text-xs text-[#6F776F] mt-0.5">
                  Verifiable material custody handovers and physical pickup codes.
                </p>
              </div>

              <Link
                to="/exchanges"
                className="text-xs font-semibold text-[#103D2A] hover:underline flex items-center gap-1 transition-colors self-start sm:self-auto"
              >
                <span>View My Exchanges ({myExchanges.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {activeExchanges.length === 0 ? (
              <EmptyState
                icon={<Repeat className="w-6 h-6 text-[#103D2A]" />}
                title="No Active Material Exchanges"
                description="You have no material transfers pending physical verification. Request custody of a listed batch or list your surplus biomass to start exchanging."
                actionLabel="Explore Marketplace"
                actionLink="/marketplace"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {activeExchanges.map((req) => (
                  <div
                    key={req.id}
                    className="bg-white p-4 sm:p-5 rounded-[18px] border border-[#E8E4DA] shadow-[0_2px_8px_rgba(16,61,42,0.03)] hover:shadow-card-hover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-[#E7EEDC] flex items-center justify-center shrink-0 text-[#103D2A] shadow-xs">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-heading font-bold text-sm text-[#18251F] truncate">
                            {req.listing?.title || 'Material Exchange Batch'}
                          </h4>
                          <span className="text-xs font-medium text-[#6F776F] shrink-0">
                            ({req.requested_quantity} {req.listing?.unit || 'kg'})
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${
                            req.status === 'accepted'
                              ? 'bg-[#E7EEDC] text-[#103D2A]'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {req.status === 'accepted' ? 'Accepted • Ready for Pickup' : 'Pending Confirmation'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6F776F]">
                          <span className="flex items-center gap-1 text-[11px] shrink-0">
                            <Clock className="w-3 h-3 text-[#6F776F]" />
                            <span>{new Date(req.created_at).toLocaleDateString()}</span>
                          </span>
                          <span>•</span>
                          <span className="flex flex-wrap items-center gap-1">
                            <span>Pickup Verification Code:</span>
                            <strong className="font-mono font-bold tracking-widest text-[#103D2A] bg-[#F8F6EF] border border-[#E8E4DA] px-2.5 py-0.5 rounded-md text-xs">
                              {req.completion_code}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <button
                        onClick={() => setSelectedExchangeForPass(req)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F8F6EF] text-[#103D2A] border border-[#E8E4DA] text-xs font-semibold shadow-xs transition-colors"
                        type="button"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#103D2A]" />
                        <span>Digital Pass</span>
                      </button>

                      <button
                        onClick={() => navigate('/exchanges')}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#103D2A] hover:bg-[#08291D] text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <span>Manage</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        {/* Right Column (~30% width, 4 cols): Community Initiatives Panel */}
        <aside className="lg:col-span-4 flex flex-col gap-6 min-w-0">

          {/* Community Drives Card (Section 8) */}
          <div className="bg-white rounded-[18px] p-6 border border-[#E8E4DA] shadow-[0_2px_8px_rgba(16,61,42,0.03)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DA]/60">
              <h3 className="font-heading font-bold text-xl text-[#103D2A]">
                Community Drives
              </h3>
              <span className="text-[11px] font-semibold text-[#103D2A] bg-[#E7EEDC] px-2.5 py-0.5 rounded-full">
                {spotlightDrive ? spotlightDrive.district : 'Kerala'}
              </span>
            </div>

            {spotlightDrive ? (
              <div className="flex flex-col gap-3">
                <h4 className="font-heading font-bold text-base text-[#18251F] leading-snug">
                  {spotlightDrive.title}
                </h4>
                <p className="font-sans text-xs text-[#6F776F] leading-relaxed line-clamp-3">
                  {spotlightDrive.description}
                </p>

                <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#D97706]" />
                    <span className="text-xs font-semibold text-amber-950">Drive Incentive</span>
                  </div>
                  <span className="font-heading font-bold text-xs text-[#D97706]">
                    +{spotlightDrive.reward_points} EcoPoints
                  </span>
                </div>

                <button
                  onClick={() => setRsvpDone(!rsvpDone)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                    rsvpDone
                      ? 'bg-[#F8F6EF] text-[#103D2A] border border-[#8BA681] font-bold'
                      : 'bg-[#103D2A] hover:bg-[#08291D] text-white'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{rsvpDone ? 'RSVP Confirmed' : 'Register for Drive'}</span>
                </button>
              </div>
            ) : (
              <div className="py-2 flex flex-col gap-2">
                <p className="font-sans text-xs text-[#6F776F] leading-relaxed">
                  No community drives scheduled nearby.
                </p>
                <button
                  onClick={() => navigate('/community')}
                  className="mt-2 w-full py-2.5 px-4 rounded-xl bg-[#103D2A] hover:bg-[#08291D] text-white text-xs font-semibold transition-colors"
                >
                  Explore Community Initiatives
                </button>
              </div>
            )}
          </div>

          {/* Civic Environmental Watch & Incidents */}
          <div className="bg-white rounded-[18px] p-6 border border-[#E8E4DA] shadow-[0_2px_8px_rgba(16,61,42,0.03)] flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E8E4DA]/60">
              <h3 className="font-heading font-bold text-lg text-[#18251F]">
                Incident Reports
              </h3>
              <Link
                to="/reports"
                className="text-xs font-semibold text-[#103D2A] hover:underline flex items-center gap-0.5"
              >
                <span>Tracker</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentReports.length === 0 ? (
              <p className="text-xs text-[#6F776F]">
                No open environmental incidents reported in your area.
              </p>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 rounded-xl bg-[#F8F6EF] border border-[#E8E4DA] flex flex-col gap-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        report.status === 'resolved'
                          ? 'bg-[#E7EEDC] text-[#103D2A]'
                          : report.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-white text-[#18251F] border border-[#E8E4DA]'
                      }`}>
                        {report.status === 'resolved' ? 'Resolved' : report.status === 'in_progress' ? 'In Review' : 'Reported'}
                      </span>
                      <span className="text-[10px] text-[#6F776F]">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="font-heading font-bold text-xs text-[#18251F] line-clamp-1 mt-1">
                      {report.title}
                    </span>
                    <span className="text-[11px] text-[#6F776F]">
                      {report.locality ? `${report.locality}, ${report.district}` : report.district}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/report-issue')}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-[#F8F6EF] text-[#18251F] border border-[#E8E4DA] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Submit Report</span>
            </button>
          </div>

          {/* Verified Circular Impact Guarantee */}
          <div className="bg-[#E7EEDC]/70 rounded-[18px] p-5 border border-[#8BA681]/30 flex flex-col gap-2">
            <span className="font-heading font-bold text-xs text-[#103D2A] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#103D2A]" />
              Verified Circular Custody
            </span>
            <p className="font-sans text-xs text-[#6F776F] leading-relaxed">
              Every material exchange on GreenLoop is verified through bilateral custody transfer codes, keeping organic biomass, glass, paper, and polymers out of unmanaged landfills.
            </p>
          </div>

        </aside>

      </div>

      {/* Digital Handover Pass Modal */}
      {selectedExchangeForPass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm cursor-pointer"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedExchangeForPass(null);
          }}
        >
          <div
            className="bg-white rounded-[20px] border border-[#E8E4DA] p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-3 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#E7EEDC] text-[#103D2A] flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="font-heading font-bold text-lg text-[#103D2A]">
              GreenLoop Handover Pass
            </h3>

            <p className="font-sans text-xs text-[#6F776F]">
              Generated by GreenLoop to verify bilateral material custody between exchange partners.
            </p>

            <div className="p-4 bg-[#F8F6EF] rounded-xl border border-[#E8E4DA] flex flex-col items-center w-full my-1">
              <div className="w-36 h-36 bg-white p-2 rounded-lg flex items-center justify-center shadow-inner border border-[#E8E4DA]">
                {/* SVG QR Code */}
                <svg className="w-full h-full text-[#103D2A]" viewBox="0 0 100 100" fill="currentColor">
                  <rect x="10" y="10" width="25" height="25" />
                  <rect x="15" y="15" width="15" height="15" fill="white" />
                  <rect x="18" y="18" width="9" height="9" />
                  <rect x="65" y="10" width="25" height="25" />
                  <rect x="70" y="15" width="15" height="15" fill="white" />
                  <rect x="73" y="18" width="9" height="9" />
                  <rect x="10" y="65" width="25" height="25" />
                  <rect x="15" y="70" width="15" height="15" fill="white" />
                  <rect x="18" y="73" width="9" height="9" />
                  <rect x="45" y="15" width="10" height="10" />
                  <rect x="45" y="45" width="10" height="10" />
                  <rect x="15" y="45" width="10" height="10" />
                  <rect x="75" y="45" width="10" height="10" />
                  <rect x="45" y="75" width="10" height="10" />
                  <rect x="65" y="65" width="10" height="10" />
                  <rect x="80" y="80" width="10" height="10" />
                </svg>
              </div>
              <span className="font-heading font-bold text-base text-[#103D2A] tracking-widest mt-2 font-mono">
                {selectedExchangeForPass.completion_code || selectedExchangeForPass.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="font-sans text-[11px] text-[#6F776F]">
                {selectedExchangeForPass.listing?.title || 'Material Handover'}
              </span>
            </div>

            <div className="text-[11px] text-[#18251F] w-full bg-[#F8F6EF] p-2.5 rounded-lg text-left space-y-1 border border-[#E8E4DA]">
              <div className="flex justify-between">
                <span className="text-[#6F776F]">Quantity:</span>
                <span className="font-semibold text-[#18251F]">{selectedExchangeForPass.requested_quantity} {selectedExchangeForPass.listing?.unit || 'units'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6F776F]">Status:</span>
                <span className="font-semibold text-[#103D2A] capitalize">{selectedExchangeForPass.status}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedExchangeForPass(null)}
              className="w-full py-2.5 bg-[#103D2A] text-white rounded-xl text-xs font-semibold hover:bg-[#08291D] transition-colors mt-2 shadow-xs"
              type="button"
            >
              Close Handover Pass
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
