import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { EmptyState, MetricCardSkeleton } from '../../components/ui/Skeleton';
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
  Eye,
  MapPin
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { listings, allMarketplaceListings, exchangeRequests, metrics, challenges, reports, isLoading } = useData();
  const {
    district: userDistrict,
    locality: userLocality,
    loading: geoLoading,
    source: geoSource,
    isKeralaBased: geoKeralaBased,
    approximateDistrict: geoApproxDistrict,
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
  const suggestedListings = marketplaceInventory.filter((l) => l.user_id !== currentUserId && l.status === 'active').slice(0, 2);
  const activeMarketplaceCount = marketplaceInventory.filter((l) => l.status === 'active').length;

  if (isLoading && listings.length === 0 && exchangeRequests.length === 0) {
    return (
      <div className="flex flex-col w-full gap-8 pb-12 max-w-7xl mx-auto" aria-busy="true">
        <div className="h-28 rounded-xl bg-white border border-gl-border animate-pulse p-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-6 lg:gap-8 pb-14 max-w-7xl mx-auto text-left min-w-0">

      {/* 1. MASTHEAD */}
      <header className="border-b border-gl-border/70 pb-6 pt-0">
        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-5 min-w-0">

          {/* Brand Introduction & Context */}
          <div className="flex flex-col gap-2 max-w-2xl min-w-0">
            <div className="inline-flex flex-wrap items-center gap-2 text-xs">
              <span className="font-sans text-[11px] font-semibold text-gl-forest bg-gl-sage-light px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gl-fresh animate-pulse" />
                Waste Has a Second Life
              </span>
              <span className="text-gl-sand">•</span>
              <span className="text-[12px] text-gl-charcoal-muted flex items-center gap-1 font-medium">
                <Compass className="w-3.5 h-3.5 text-gl-forest" />
                {userDistrict
                  ? (userLocality && userLocality !== userDistrict ? `${userLocality}, ${userDistrict}` : userDistrict)
                  : 'Kerala Circular Network'}
              </span>
            </div>

            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-gl-charcoal tracking-tight leading-tight">
              {currentUser ? `Welcome, ${currentUser.full_name}` : 'Sustainable Material Exchange'}
            </h1>

            <p className="font-body text-sm sm:text-base text-gl-charcoal-muted leading-relaxed">
              {currentUser
                ? `Manage your listings, coordinate pickups on WhatsApp, and track your environmental impact.`
                : 'Connect with people nearby to buy, sell, or donate recyclable and reusable materials in Kerala.'}
            </p>
          </div>

          {/* Primary Platform Action Dispatch */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full xl:w-auto">
            <button
              onClick={() => navigate('/marketplace/new')}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gl-forest hover:bg-gl-dark text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Add Listing</span>
            </button>

            <button
              onClick={() => navigate('/scanner')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gl-cream text-gl-forest border border-gl-border rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98] w-full sm:w-auto"
            >
              <ScanLine className="w-4 h-4 text-gl-fresh" />
              <span>Waste Scanner</span>
            </button>

            <button
              onClick={() => navigate('/report-issue')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-gl-cream text-gl-charcoal border border-gl-border rounded-xl text-sm font-medium shadow-sm transition-all active:scale-[0.98] w-full sm:w-auto"
              title="Report an Issue"
            >
              <AlertTriangle className="w-4 h-4 text-gl-clay" />
              <span>Report Issue</span>
            </button>
          </div>

        </div>
      </header>

      {/* 2. OPERATIONAL TELEMETRY HORIZON (4 Minimal White KPI Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Metric 1: Verified Material Diverted */}
        <div className="bg-white p-5 rounded-2xl border border-gl-border shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-gl-charcoal-muted font-bold font-sans">
              Verified Diversion
            </span>
            <span className="w-8 h-8 rounded-xl bg-gl-sage-light text-gl-forest flex items-center justify-center shadow-xs">
              <Leaf className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-black text-3xl sm:text-4xl text-gl-charcoal tracking-tight">
                {metrics.total_waste_diverted_kg}
              </span>
              <span className="text-sm font-bold text-gl-fresh">
                kg
              </span>
            </div>
            <p className="text-xs text-gl-charcoal-muted mt-1 leading-normal">
              {metrics.total_waste_diverted_kg === 0 ? 'Recorded from verified handovers' : 'Diverted from regional landfills'}
            </p>
          </div>

          <div className="pt-3 border-t border-gl-border/70 flex flex-wrap items-center justify-between gap-1 text-xs text-gl-charcoal-muted min-w-0">
            <span className="truncate">Avoided Emissions</span>
            <span className="font-semibold text-gl-forest shrink-0">
              {metrics.total_co2e_avoided_kg} kg CO₂e
            </span>
          </div>
        </div>

        {/* Metric 2: Active Inventory */}
        <div className="bg-white p-5 rounded-2xl border border-gl-border shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-gl-charcoal-muted font-bold font-sans">
              Your Active Listings
            </span>
            <span className="w-8 h-8 rounded-xl bg-gl-sage-light text-gl-forest flex items-center justify-center shadow-xs">
              <Package className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-black text-3xl sm:text-4xl text-gl-charcoal tracking-tight">
                {myListings.length}
              </span>
              <span className="text-sm font-semibold text-gl-fresh">
                batches
              </span>
            </div>
            <p className="text-xs text-gl-charcoal-muted mt-1 leading-normal">
              {myListings.length === 0 ? 'No active batches listed' : `${myListings.length} published in marketplace`}
            </p>
          </div>

          <div className="pt-3 border-t border-gl-border/70 flex flex-wrap items-center justify-between gap-1 text-xs text-gl-charcoal-muted min-w-0">
            <span className="truncate">Statewide Marketplace</span>
            <span className="font-semibold text-gl-forest shrink-0">
              {activeMarketplaceCount} available
            </span>
          </div>
        </div>

        {/* Metric 3: Active Handovers */}
        <div className="bg-white p-5 rounded-2xl border border-gl-border shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-gl-charcoal-muted font-bold font-sans">
              Custody Handovers
            </span>
            <span className="w-8 h-8 rounded-xl bg-gl-sage-light text-gl-forest flex items-center justify-center shadow-xs">
              <Repeat className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-black text-3xl sm:text-4xl text-gl-charcoal tracking-tight">
                {activeExchanges.length}
              </span>
              <span className="text-sm font-semibold text-gl-fresh">
                active
              </span>
            </div>
            <p className="text-xs text-gl-charcoal-muted mt-1 leading-normal">
              {activeExchanges.length === 0 ? 'No ongoing handovers' : `${activeExchanges.length} awaiting pickup verification`}
            </p>
          </div>

          <div className="pt-3 border-t border-gl-border/70 flex flex-wrap items-center justify-between gap-1 text-xs text-gl-charcoal-muted min-w-0">
            <span className="truncate">Completed Custodies</span>
            <span className="font-semibold text-gl-forest shrink-0">
              {metrics.total_completed_exchanges} verified
            </span>
          </div>
        </div>

        {/* Metric 4: EcoPoints Balance */}
        <div className="bg-white p-5 rounded-2xl border border-gl-border shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-gl-charcoal-muted font-bold font-sans">
              EcoPoints Balance
            </span>
            <span className="w-8 h-8 rounded-xl bg-amber-100 text-gl-clay flex items-center justify-center shadow-xs">
              <Award className="w-4 h-4" />
            </span>
          </div>

          <div className="my-3">
            <div className="flex items-baseline gap-2">
              <span className="font-heading font-black text-3xl sm:text-4xl text-gl-clay tracking-tight">
                {currentUser ? currentUser.eco_points_balance : 0}
              </span>
              <span className="text-sm font-bold text-gl-clay">
                PTS
              </span>
            </div>
            <p className="text-xs text-gl-charcoal-muted mt-1 leading-normal">
              {currentUser ? `Audited balance for ${currentUser.full_name}` : 'Sign in to accrue reward points'}
            </p>
          </div>

          <div className="pt-3 border-t border-gl-border/70 flex flex-wrap items-center justify-between gap-1 text-xs min-w-0">
            <span className="text-gl-charcoal-muted truncate">Account Tier</span>
            <span className="font-semibold text-gl-forest capitalize shrink-0">
              {currentUser ? `${currentUser.role} Participant` : 'Public Visitor'}
            </span>
          </div>
        </div>

      </section>

      {/* 3. MAIN WORKFLOW GRID (8 Cols + 4 Cols) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8 min-w-0">

        {/* Left Column (8 Cols): Material Marketplace & Operational Custody */}
        <div className="xl:col-span-8 flex flex-col gap-6 lg:gap-8 min-w-0">

          {/* Section A: Smart Material Matches (Marketplace Engine) */}
          <section className="flex flex-col gap-3.5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-xl text-gl-dark">
                    Smart Material Matches
                  </h2>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-gl-sage-light text-gl-forest font-semibold uppercase tracking-wider">
                    Algorithmic Pairing
                  </span>
                </div>
                <p className="text-xs text-gl-charcoal-muted mt-0.5">
                  Pre-consumer biomass and clean recyclables compatible with your profile in {userDistrict}.
                </p>
              </div>

              <Link
                to="/matches"
                className="text-xs font-semibold text-gl-forest hover:text-gl-dark hover:underline flex items-center gap-1 transition-colors self-start sm:self-auto"
              >
                <span>Browse Marketplace ({activeMarketplaceCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {suggestedListings.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="w-6 h-6 text-gl-forest" />}
                title="No Nearby Material Matches Currently"
                description="When households, restaurants, or workshops in your area publish excess organic biomass, clean paper, or plastics, automated circular matches will appear here."
                actionLabel="List First Material Batch"
                actionLink="/marketplace/new"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestedListings.map((listing) => (
                  <article
                    key={listing.id}
                    className="bg-white rounded-2xl p-5 border border-gl-border shadow-card hover:border-gl-sage hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between min-w-0"
                  >
                    <div className="min-w-0">
                      {/* Material Category & Exchange Terms */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-semibold text-gl-forest bg-gl-sage-light px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          {listing.category?.name || 'Recyclable Stream'}
                        </span>
                        <span className="text-xs font-semibold text-gl-charcoal bg-gl-cream px-2 py-0.5 rounded-md">
                          {listing.listing_type === 'free' ? 'Free Material' : listing.listing_type === 'exchange' ? 'Barter Exchange' : `₹${listing.price || 0}`}
                        </span>
                      </div>

                      <h3 className="font-heading font-bold text-base text-gl-charcoal mt-3 line-clamp-1">
                        {listing.title}
                      </h3>

                      {/* Technical Specifications Ledger Strip */}
                      <div className="my-3 py-2 px-3 rounded-xl bg-gl-cream/60 border border-gl-border/70 flex items-center justify-between text-xs text-gl-charcoal">
                        <div>
                          <span className="text-gl-charcoal-muted text-[10px] uppercase font-semibold block">Batch Weight</span>
                          <span className="font-bold text-gl-forest">{listing.quantity} {listing.unit}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gl-charcoal-muted text-[10px] uppercase font-semibold block">District</span>
                          <span className="font-medium text-gl-charcoal">{listing.district}</span>
                        </div>
                      </div>

                      <p className="text-xs text-gl-charcoal-muted line-clamp-2 leading-relaxed">
                        {listing.description}
                      </p>
                    </div>

                    <div className="pt-3.5 mt-3.5 border-t border-gl-border/70 flex items-center justify-between">
                      <span className="text-[11px] text-gl-fresh font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-gl-fresh" />
                        <span>High Proximity Fit</span>
                      </span>
                      <button
                        onClick={() => navigate(`/marketplace/${listing.id}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gl-forest hover:bg-gl-dark text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <span>Inspect Batch</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Section B: Active Exchanges Pipeline (Chain-of-Custody Manifest) */}
          <section className="flex flex-col gap-3.5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-1">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-xl text-gl-charcoal">
                    Active Custody Handovers
                  </h2>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gl-cream text-gl-charcoal font-semibold uppercase tracking-wider border border-gl-border">
                    {myExchanges.length} in custody log
                  </span>
                </div>
                <p className="text-xs text-gl-charcoal-muted mt-0.5">
                  Verifiable material custody handovers and physical verification codes.
                </p>
              </div>

              <Link
                to="/exchanges"
                className="text-xs font-semibold text-gl-forest hover:text-gl-dark hover:underline flex items-center gap-1 transition-colors self-start sm:self-auto"
              >
                <span>View Full Ledger ({myExchanges.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {activeExchanges.length === 0 ? (
              <EmptyState
                icon={<Repeat className="w-6 h-6 text-gl-forest" />}
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
                    className="bg-white p-4 sm:p-5 rounded-2xl border border-gl-border shadow-card hover:shadow-card-hover transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0"
                  >
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-xl bg-gl-sage-light flex items-center justify-center shrink-0 text-gl-forest shadow-xs">
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-heading font-bold text-sm text-gl-charcoal truncate">
                            {req.listing?.title || 'Material Exchange Batch'}
                          </h4>
                          <span className="text-xs font-semibold text-gl-charcoal-muted shrink-0">
                            ({req.requested_quantity} {req.listing?.unit || 'kg'})
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full shrink-0 ${
                            req.status === 'accepted'
                              ? 'bg-gl-sage-light text-gl-forest'
                              : 'bg-amber-100 text-amber-900'
                          }`}>
                            {req.status === 'accepted' ? 'Accepted • Ready for Pickup' : 'Pending Generator Confirmation'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gl-charcoal-muted">
                          <span className="flex items-center gap-1 text-[11px] shrink-0 font-medium">
                            <Clock className="w-3 h-3 text-gl-charcoal-muted" />
                            <span>{new Date(req.created_at).toLocaleDateString()}</span>
                          </span>
                          <span className="text-gl-border shrink-0">•</span>
                          <span className="flex flex-wrap items-center gap-1">
                            <span>Pickup Verification Code:</span>
                            <strong className="font-mono font-bold tracking-widest text-gl-forest bg-gl-cream border border-gl-border px-2.5 py-0.5 rounded-md text-xs">
                              {req.completion_code}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <button
                        onClick={() => setSelectedExchangeForPass(req)}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gl-cream text-gl-forest border border-gl-border text-xs font-semibold shadow-xs transition-colors"
                        type="button"
                      >
                        <QrCode className="w-3.5 h-3.5 text-gl-forest" />
                        <span>Digital Pass</span>
                      </button>

                      <button
                        onClick={() => navigate('/exchanges')}
                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-gl-forest hover:bg-gl-dark text-white text-xs font-semibold shadow-sm transition-colors"
                      >
                        <span>Manage Transfer</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section C: Audited Stream Diversion (Empirical Climate Accounting) */}
          <section className="bg-white p-5 sm:p-6 rounded-2xl border border-gl-border shadow-card flex flex-col gap-4 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 pb-3 border-b border-gl-border/70">
              <div>
                <h3 className="font-heading font-bold text-lg text-gl-charcoal">
                  Audited Material Stream Accounting
                </h3>
                <p className="text-xs text-gl-charcoal-muted mt-0.5">
                  Empirical biomass and recyclable volume diverted through verified physical handovers.
                </p>
              </div>
              <span className="text-[11px] text-gl-forest font-semibold self-start sm:self-auto bg-gl-sage-light px-2.5 py-1 rounded-full uppercase tracking-wider">
                KSPCB & IPCC Model
              </span>
            </div>

            {metrics.category_breakdown.length === 0 ? (
              <p className="text-xs text-gl-charcoal-muted py-2 leading-relaxed">
                No completed material transactions logged yet. When a physical handover is verified using the 6-character pickup code, the empirical weight and carbon offsets automatically populate this audited stream.
              </p>
            ) : (
              <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                {metrics.category_breakdown.map((cat) => (
                  <div key={cat.category_name} className="flex flex-col p-4 rounded-xl bg-gl-cream/60 border border-gl-border/70 min-w-0">
                    <span className="text-[11px] font-semibold text-gl-charcoal-muted truncate">
                      {cat.category_name}
                    </span>
                    <span className="font-heading font-extrabold text-xl text-gl-forest mt-1">
                      {cat.diverted_kg} kg
                    </span>
                    <div className="mt-2.5 w-full bg-gl-border h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-gl-fresh h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.max(8, cat.percentage))}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gl-charcoal-muted mt-1.5 font-medium">
                      {cat.percentage}% of aggregate
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        {/* Right Column (4 Cols): Regional Mobilization & Civic Surveillance */}
        <div className="xl:col-span-4 flex flex-col gap-6 lg:gap-8 min-w-0">

          {/* Section D: Regional Community Spotlight */}
          {spotlightDrive ? (
            <aside className="bg-white border border-gl-border rounded-2xl p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col gap-4 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-gl-charcoal-muted font-bold font-sans">
                  Regional Mobilization
                </span>
                <span className="text-[11px] font-semibold text-gl-forest bg-gl-sage-light px-2.5 py-0.5 rounded-full border border-gl-sage/40">
                  {spotlightDrive.district}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-heading font-extrabold text-lg text-gl-charcoal leading-snug">
                  {spotlightDrive.title}
                </h3>
                <p className="text-xs text-gl-charcoal-muted leading-relaxed line-clamp-3">
                  {spotlightDrive.description}
                </p>
              </div>

              {/* Reward incentive banner with warm amber accent */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/60 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-gl-clay" />
                  <span className="text-xs font-semibold text-amber-950">Participation Incentive</span>
                </div>
                <span className="font-heading font-bold text-sm text-gl-clay">
                  +{spotlightDrive.reward_points} EcoPoints
                </span>
              </div>

              <button
                onClick={() => setRsvpDone(!rsvpDone)}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  rsvpDone
                    ? 'bg-gl-cream text-gl-forest border border-gl-sage font-bold'
                    : 'bg-gl-forest hover:bg-gl-dark text-white'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{rsvpDone ? 'RSVP Confirmed (Attending)' : 'Register for Community Drive'}</span>
              </button>
            </aside>
          ) : (
            <aside className="bg-white border border-gl-border rounded-2xl p-5 shadow-card flex flex-col gap-2 min-w-0">
              <span className="text-[10px] uppercase tracking-wider text-gl-charcoal-muted font-bold font-sans">
                Regional Mobilization
              </span>
              <h3 className="font-heading font-bold text-sm text-gl-charcoal">
                No Scheduled Drives in District
              </h3>
              <p className="text-xs text-gl-charcoal-muted">
                Propose or organize community recovery drives in your municipality.
              </p>
              <button
                onClick={() => navigate('/community')}
                className="mt-2 py-2 px-3 bg-white hover:bg-gl-cream text-gl-forest border border-gl-border rounded-xl text-xs font-semibold transition-colors text-center"
              >
                Explore Community Initiatives
              </button>
            </aside>
          )}

          {/* Section E: Local Civic Environmental Watch */}
          <aside className="bg-white rounded-2xl p-5 sm:p-6 border border-gl-border shadow-card flex flex-col gap-4 min-w-0">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gl-charcoal-muted font-bold block font-sans">
                  Civic Watch & Remediation
                </span>
                <h3 className="font-heading font-bold text-lg text-gl-charcoal">
                  Local Incident Logs
                </h3>
              </div>
              <Link
                to="/reports"
                className="text-xs font-semibold text-gl-forest hover:text-gl-dark hover:underline flex items-center gap-0.5 transition-colors"
              >
                <span>Tracker</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentReports.length === 0 ? (
              <div className="p-4 rounded-xl bg-gl-cream/60 border border-gl-border/70 text-center">
                <p className="text-xs text-gl-charcoal-muted">
                  No open environmental incidents reported in your area.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3.5 rounded-xl bg-gl-cream/50 border border-gl-border/70 flex flex-col gap-1.5 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        report.status === 'resolved'
                          ? 'bg-gl-sage-light text-gl-forest'
                          : report.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-gl-cream text-gl-charcoal'
                      }`}>
                        {report.status === 'resolved' ? 'Resolved' : report.status === 'in_progress' ? 'In Review' : 'Reported'}
                      </span>
                      <span className="text-[10px] text-gl-charcoal-muted font-medium">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h5 className="font-heading font-bold text-xs text-gl-charcoal line-clamp-1">
                      {report.title}
                    </h5>

                    <p className="text-[11px] text-gl-charcoal-muted line-clamp-1">
                      {report.locality}, {report.district}
                    </p>

                    <div className="pt-2 border-t border-gl-border/70 flex items-center justify-between text-[11px]">
                      <span className="text-gl-charcoal-muted font-medium">#{report.ticket_number}</span>
                      <Link to="/reports" className="text-gl-forest font-semibold hover:underline">
                        Status →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/report-issue')}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-gl-cream text-gl-charcoal hover:text-gl-dark border border-gl-border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-gl-clay" />
              <span>Submit Geo-Tagged Report</span>
            </button>
          </aside>

          {/* Section F: Honest Community Verification */}
          <aside className="bg-gl-sage-light/60 rounded-2xl p-4 border border-gl-sage/40 flex flex-col gap-1.5 min-w-0">
            <span className="font-heading font-semibold text-xs text-gl-forest flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-gl-forest" />
              Community Circular Verification
            </span>
            <p className="font-body text-xs text-gl-charcoal-muted leading-relaxed">
              Every verified handover on GreenLoop is confirmed through bilateral custody transfer codes, keeping reusable biomass, glass, paper, and polymers out of unmanaged landfills.
            </p>
          </aside>

        </div>

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
            className="bg-white rounded-2xl border border-gl-border p-4 sm:p-6 max-w-sm w-full shadow-2xl flex flex-col items-center text-center gap-3 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-gl-sage-light text-gl-forest flex items-center justify-center">
              <QrCode className="w-6 h-6" />
            </div>

            <h3 className="font-heading font-bold text-lg text-gl-dark">
              GreenLoop Digital Handover Pass
            </h3>

            <p className="font-body text-xs text-gl-charcoal-muted">
              Generated by GreenLoop to verify bilateral material custody between exchange partners.
            </p>

            <div className="p-4 bg-gl-ivory rounded-xl border border-gl-cream flex flex-col items-center w-full my-1">
              <div className="w-36 h-36 bg-white p-2 rounded-lg flex items-center justify-center shadow-inner border border-gl-border-subtle">
                {/* SVG QR Code */}
                <svg className="w-full h-full text-gl-forest" viewBox="0 0 100 100" fill="currentColor">
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
              <span className="font-heading font-bold text-base text-gl-forest tracking-widest mt-2 font-mono">
                {selectedExchangeForPass.completion_code || selectedExchangeForPass.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="font-body text-[11px] text-gl-charcoal-muted">
                {selectedExchangeForPass.listing?.title || 'Material Handover'}
              </span>
            </div>

            <div className="text-[11px] text-gl-charcoal w-full bg-gl-ivory p-2.5 rounded-lg text-left space-y-1 border border-gl-cream">
              <div className="flex justify-between">
                <span className="text-gl-charcoal-muted">Quantity:</span>
                <span className="font-semibold text-gl-dark">{selectedExchangeForPass.requested_quantity} {selectedExchangeForPass.listing?.unit || 'units'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gl-charcoal-muted">Status:</span>
                <span className="font-semibold text-gl-forest capitalize">{selectedExchangeForPass.status}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedExchangeForPass(null)}
              className="w-full py-2 bg-gl-forest text-white rounded-lg text-xs font-semibold hover:bg-gl-dark transition-colors mt-2 shadow-sm"
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
