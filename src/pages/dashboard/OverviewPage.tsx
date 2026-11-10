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
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ScanLine,
  Plus,
  QrCode,
  Clock,
  Compass,
  MapPin,
  Check
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { listings, allMarketplaceListings, exchangeRequests, metrics, challenges, reports, isLoading } = useData();
  const {
    district: userDistrict,
    locality: userLocality,
  } = useGeolocation();
  const navigate = useNavigate();

  // User-specific data slices
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

  // Spotlight drive and recent civic reports
  const spotlightDrive = challenges[0] || null;
  const [rsvpDone, setRsvpDone] = useState(false);
  const recentReports = reports.slice(0, 3);

  // Available marketplace items
  const marketplaceInventory = allMarketplaceListings && allMarketplaceListings.length > 0 ? allMarketplaceListings : listings;
  const suggestedListings = marketplaceInventory.filter((l) => l.user_id !== currentUserId && l.status === 'active').slice(0, 4);
  const activeMarketplaceCount = marketplaceInventory.filter((l) => l.status === 'active').length;

  if (isLoading && listings.length === 0 && exchangeRequests.length === 0) {
    return (
      <div className="flex flex-col w-full gap-6 pb-12 max-w-6xl mx-auto" aria-busy="true">
        <div className="h-32 rounded-lg bg-white border border-[#E8E4DA] animate-pulse p-6" />
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
    <div className="flex flex-col w-full gap-8 pb-14 max-w-6xl mx-auto text-left min-w-0">

      {/* 1. EDITORIAL GREETING (Open Layout with Tucked Landscape Artwork) */}
      <section className="relative bg-white rounded-lg p-6 sm:p-8 border border-[#E8E4DA] shadow-subtle overflow-hidden">
        {/* Subtle, restrained Kerala landscape illustration */}
        <LandscapeIllustration className="absolute right-0 top-0 bottom-0 w-full sm:w-1/2 opacity-70 hidden sm:block pointer-events-none" />

        <div className="relative z-10 max-w-lg">
          <div className="flex items-center gap-2 text-xs text-[#6F776F] mb-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#103D2A]" />
            <span>Kerala Circular Network</span>
            <span>•</span>
            <span>
              {userDistrict
                ? (userLocality && userLocality !== userDistrict ? `${userLocality}, ${userDistrict}` : userDistrict)
                : 'Statewide'}
            </span>
          </div>

          <h1 className="font-editorial text-2xl sm:text-3xl text-[#18251F] font-normal tracking-tight leading-snug">
            Namaskaram,{' '}
            <span className="text-[#103D2A] font-medium">
              {currentUser ? currentUser.full_name : 'Friend'}
            </span>
          </h1>

          <p className="font-sans text-sm text-[#6F776F] mt-2 leading-relaxed">
            Manage your listings, coordinate pickups directly on WhatsApp, and review your local environmental contributions.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <button
              onClick={() => navigate('/marketplace/new')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#103D2A] hover:bg-[#08291D] text-white rounded-md text-xs font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Add Listing</span>
            </button>

            <button
              onClick={() => navigate('/ai-scanner')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF8F2] text-[#18251F] border border-[#DCD6CB] rounded-md text-xs font-medium transition-colors"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#103D2A]" />
              <span>Waste Scanner</span>
            </button>

            <button
              onClick={() => navigate('/report-issue')}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#FAF8F2] text-[#6F776F] hover:text-[#18251F] border border-[#DCD6CB] rounded-md text-xs font-medium transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. RESTRAINED HORIZONTAL STATS BAR (Divided cells, not candy-colored identical cards) */}
      <section className="bg-white border border-[#E8E4DA] rounded-lg shadow-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E8E4DA]">
        {/* Metric 1 */}
        <div className="p-5 sm:p-6 flex flex-col justify-between">
          <span className="text-xs text-[#6F776F] font-normal">
            Diverted Waste
          </span>
          <div className="my-2">
            <span className="font-editorial text-2xl sm:text-3xl text-[#18251F] font-normal tracking-tight">
              {metrics.total_waste_diverted_kg}
            </span>
            <span className="text-xs text-[#6F776F] ml-1.5">kg</span>
          </div>
          <span className="text-[11px] text-[#8BA681] font-normal">
            {metrics.total_co2e_avoided_kg} kg CO₂e avoided
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-5 sm:p-6 flex flex-col justify-between">
          <span className="text-xs text-[#6F776F] font-normal">
            Your Active Listings
          </span>
          <div className="my-2">
            <span className="font-editorial text-2xl sm:text-3xl text-[#18251F] font-normal tracking-tight">
              {myListings.length}
            </span>
            <span className="text-xs text-[#6F776F] ml-1.5">batches</span>
          </div>
          <span className="text-[11px] text-[#6F776F] font-normal">
            {activeMarketplaceCount} total across Kerala
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-5 sm:p-6 flex flex-col justify-between">
          <span className="text-xs text-[#6F776F] font-normal">
            Active Handovers
          </span>
          <div className="my-2">
            <span className="font-editorial text-2xl sm:text-3xl text-[#18251F] font-normal tracking-tight">
              {activeExchanges.length}
            </span>
            <span className="text-xs text-[#6F776F] ml-1.5">in progress</span>
          </div>
          <span className="text-[11px] text-[#6F776F] font-normal">
            {metrics.total_completed_exchanges} verified completions
          </span>
        </div>

        {/* Metric 4 */}
        <div className="p-5 sm:p-6 flex flex-col justify-between">
          <span className="text-xs text-[#6F776F] font-normal">
            EcoPoints Balance
          </span>
          <div className="my-2">
            <span className="font-editorial text-2xl sm:text-3xl text-[#103D2A] font-normal tracking-tight">
              {currentUser ? currentUser.eco_points_balance : 0}
            </span>
            <span className="text-xs text-[#103D2A] ml-1.5 font-medium">PTS</span>
          </div>
          <span className="text-[11px] text-[#6F776F] capitalize font-normal">
            {currentUser ? `${currentUser.role} account` : 'Public visitor'}
          </span>
        </div>
      </section>

      {/* 3. TWO-COLUMN WORKSPACE: MATERIAL DIRECTORY (70%) + COMMUNITY & CIVIC (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-w-0">

        {/* Left Column (~70% width, 8 cols): Material Directory */}
        <section className="lg:col-span-8 flex flex-col gap-6 min-w-0">
          
          <div className="flex items-baseline justify-between border-b border-[#E8E4DA] pb-3">
            <div>
              <h2 className="font-editorial text-xl text-[#18251F] font-normal">
                Available Materials Nearby
              </h2>
              <p className="font-sans text-xs text-[#6F776F] mt-0.5">
                Surplus biomass, packaging, and clean recyclables listed in your area.
              </p>
            </div>

            <Link
              to="/marketplace"
              className="text-xs text-[#103D2A] hover:underline flex items-center gap-1 font-medium shrink-0"
            >
              <span>View all in directory ({activeMarketplaceCount})</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {suggestedListings.length === 0 ? (
            <EmptyState
              icon={<Package className="w-5 h-5 text-[#6F776F]" />}
              title="No materials listed nearby yet"
              description="When individuals, workshops, or businesses list surplus materials in your district, they will appear here."
              actionLabel="Add First Material"
              actionLink="/marketplace/new"
            />
          ) : (
            <div className="bg-white border border-[#E8E4DA] rounded-lg divide-y divide-[#E8E4DA] shadow-subtle overflow-hidden">
              {suggestedListings.map((listing) => {
                const primaryImage = listing.images && listing.images.length > 0 
                  ? listing.images[0] 
                  : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80';

                return (
                  <article
                    key={listing.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:bg-[#FAF8F2]/60 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      {/* Product Thumbnail (Crisp 72x72px or 80x80px) */}
                      <img
                        src={primaryImage}
                        alt={listing.title}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-md shrink-0 border border-[#E8E4DA] bg-[#F8F6EF]"
                        loading="lazy"
                      />

                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-[#103D2A] font-medium">
                            {listing.category?.name || 'Recyclable'}
                          </span>
                          <span className="text-[#DCD6CB]">•</span>
                          <span className="text-[#6F776F]">
                            {listing.listing_type === 'free' ? 'Free' : listing.listing_type === 'exchange' ? 'Barter' : `₹${listing.price}`}
                          </span>
                          <span className="text-[#DCD6CB]">•</span>
                          <span className="flex items-center gap-1 text-[#6F776F]">
                            <span className={`w-1.5 h-1.5 rounded-full ${listing.status === 'reserved' ? 'bg-amber-600' : 'bg-emerald-600'}`} />
                            {listing.status === 'reserved' ? 'Reserved' : 'Available'}
                          </span>
                        </div>

                        <h3 className="font-sans font-medium text-sm text-[#18251F] truncate">
                          {listing.title}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-[#6F776F]">
                          <span>Quantity: <strong className="font-medium text-[#18251F]">{listing.quantity} {listing.unit}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#6F776F]" />
                            {listing.district}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0 pt-2 sm:pt-0">
                      <button
                        onClick={() => navigate(`/marketplace/${listing.id}`)}
                        className="px-3 py-1.5 rounded-md bg-white hover:bg-[#FAF8F2] text-[#18251F] border border-[#DCD6CB] text-xs font-medium transition-colors"
                      >
                        Inspect
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Active Handovers Section */}
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-baseline justify-between border-b border-[#E8E4DA] pb-3">
              <div>
                <h3 className="font-editorial text-xl text-[#18251F] font-normal">
                  Ongoing Exchanges
                </h3>
                <p className="font-sans text-xs text-[#6F776F] mt-0.5">
                  Pickups awaiting verification between participants.
                </p>
              </div>

              <Link
                to="/exchanges"
                className="text-xs text-[#103D2A] hover:underline flex items-center gap-1 font-medium"
              >
                <span>All exchanges ({myExchanges.length})</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {activeExchanges.length === 0 ? (
              <div className="p-6 bg-white border border-[#E8E4DA] rounded-lg text-center text-xs text-[#6F776F]">
                No pending handovers. Request materials or accept incoming requests to start exchanging.
              </div>
            ) : (
              <div className="bg-white border border-[#E8E4DA] rounded-lg divide-y divide-[#E8E4DA] shadow-subtle overflow-hidden">
                {activeExchanges.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className={`w-2 h-2 rounded-full ${req.status === 'accepted' ? 'bg-emerald-600' : 'bg-amber-600'}`} />
                        <span className="font-medium text-[#18251F]">
                          {req.status === 'accepted' ? 'Accepted — Ready for Pickup' : 'Pending Response'}
                        </span>
                        <span className="text-[#DCD6CB]">•</span>
                        <span className="text-[#6F776F]">{new Date(req.created_at).toLocaleDateString()}</span>
                      </div>

                      <h4 className="font-sans font-medium text-sm text-[#18251F] truncate">
                        {req.listing?.title || 'Material Batch'}
                      </h4>

                      <div className="flex items-center gap-2 text-xs text-[#6F776F]">
                        <span>Quantity: {req.requested_quantity} {req.listing?.unit || 'units'}</span>
                        <span>•</span>
                        <span>Verification code: <strong className="font-mono text-xs text-[#103D2A] font-semibold">{req.completion_code}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setSelectedExchangeForPass(req)}
                        className="px-3 py-1.5 rounded-md bg-white hover:bg-[#FAF8F2] text-[#18251F] border border-[#DCD6CB] text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                        type="button"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#103D2A]" />
                        <span>Pass</span>
                      </button>

                      <button
                        onClick={() => navigate('/exchanges')}
                        className="px-3 py-1.5 rounded-md bg-[#103D2A] hover:bg-[#08291D] text-white text-xs font-medium transition-colors"
                      >
                        Manage
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </section>

        {/* Right Column (~30% width, 4 cols): Community Initiatives & Civic Reports */}
        <aside className="lg:col-span-4 flex flex-col gap-6 min-w-0">

          {/* Community Drives Panel */}
          <div className="bg-white rounded-lg p-5 border border-[#E8E4DA] shadow-subtle flex flex-col gap-3">
            <div className="flex items-baseline justify-between border-b border-[#E8E4DA] pb-2.5">
              <h3 className="font-editorial text-lg text-[#18251F] font-normal">
                Community Drives
              </h3>
              <span className="text-xs text-[#6F776F]">
                {spotlightDrive ? spotlightDrive.district : 'Kerala'}
              </span>
            </div>

            {spotlightDrive ? (
              <div className="flex flex-col gap-2.5 pt-1">
                <h4 className="font-sans font-medium text-sm text-[#18251F] leading-snug">
                  {spotlightDrive.title}
                </h4>
                <p className="font-sans text-xs text-[#6F776F] leading-relaxed line-clamp-3">
                  {spotlightDrive.description}
                </p>

                <div className="py-2 flex items-center justify-between text-xs text-[#103D2A] font-medium border-t border-[#E8E4DA]/60">
                  <span>Earn points</span>
                  <span>+{spotlightDrive.reward_points} EcoPoints</span>
                </div>

                <button
                  onClick={() => setRsvpDone(!rsvpDone)}
                  className={`w-full py-2 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    rsvpDone
                      ? 'bg-[#FAF8F2] text-[#103D2A] border border-[#8BA681]'
                      : 'bg-[#103D2A] hover:bg-[#08291D] text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{rsvpDone ? 'Registered' : 'Register for Drive'}</span>
                </button>
              </div>
            ) : (
              <div className="py-2 flex flex-col gap-3">
                <p className="font-sans text-xs text-[#6F776F] leading-relaxed">
                  No community drives scheduled nearby.
                </p>
                <button
                  onClick={() => navigate('/community')}
                  className="w-full py-1.5 px-3 bg-white hover:bg-[#FAF8F2] text-[#18251F] border border-[#DCD6CB] rounded-md text-xs font-medium transition-colors"
                >
                  Explore Initiatives
                </button>
              </div>
            )}
          </div>

          {/* Environmental Watch & Reports */}
          <div className="bg-white rounded-lg p-5 border border-[#E8E4DA] shadow-subtle flex flex-col gap-3">
            <div className="flex items-baseline justify-between border-b border-[#E8E4DA] pb-2.5">
              <h3 className="font-editorial text-lg text-[#18251F] font-normal">
                Incident Reports
              </h3>
              <Link
                to="/reports"
                className="text-xs text-[#103D2A] hover:underline font-medium"
              >
                Tracker →
              </Link>
            </div>

            {recentReports.length === 0 ? (
              <p className="text-xs text-[#6F776F] py-2">
                No open environmental incidents in your area.
              </p>
            ) : (
              <div className="divide-y divide-[#E8E4DA]">
                {recentReports.map((report) => (
                  <div key={report.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[#6F776F]">
                      <span className="capitalize">{report.status.replace('_', ' ')}</span>
                      <span>{new Date(report.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="font-medium text-[#18251F] line-clamp-1">{report.title}</p>
                    <p className="text-[#6F776F] text-[11px]">{report.locality}, {report.district}</p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => navigate('/report-issue')}
              className="mt-1 w-full py-1.5 px-3 rounded-md bg-white hover:bg-[#FAF8F2] text-[#18251F] border border-[#DCD6CB] text-xs font-medium transition-colors"
            >
              Submit Report
            </button>
          </div>

        </aside>

      </div>

      {/* Digital Handover Pass Modal */}
      {selectedExchangeForPass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs cursor-pointer"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedExchangeForPass(null);
          }}
        >
          <div
            className="bg-white rounded-lg border border-[#E8E4DA] p-6 max-w-sm w-full shadow-modal flex flex-col items-center text-center gap-3 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-10 rounded-full bg-[#E7EEDC] text-[#103D2A] flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>

            <h3 className="font-editorial font-normal text-lg text-[#18251F]">
              Handover Verification Pass
            </h3>

            <p className="font-sans text-xs text-[#6F776F]">
              Show this code to your exchange partner during physical pickup.
            </p>

            <div className="p-4 bg-[#F8F6EF] rounded-md border border-[#E8E4DA] flex flex-col items-center w-full my-1">
              <div className="w-32 h-32 bg-white p-2 rounded flex items-center justify-center border border-[#E8E4DA]">
                {/* Clean SVG QR Code */}
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
              <span className="font-mono font-semibold text-lg text-[#103D2A] tracking-wider mt-2.5">
                {selectedExchangeForPass.completion_code || selectedExchangeForPass.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="font-sans text-xs text-[#6F776F] mt-0.5">
                {selectedExchangeForPass.listing?.title || 'Material Batch'}
              </span>
            </div>

            <button
              onClick={() => setSelectedExchangeForPass(null)}
              className="w-full py-2 bg-[#103D2A] text-white rounded-md text-xs font-medium hover:bg-[#08291D] transition-colors mt-1"
              type="button"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
