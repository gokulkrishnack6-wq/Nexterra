import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { EmptyState, MetricCardSkeleton } from '../../components/ui/Skeleton';
import { LandscapeIllustration } from '../../components/dashboard/LandscapeIllustration';
import { BotanicalWatermark } from '../../components/ui/BotanicalWatermark';
import { Modal } from '../../components/ui/Modal';
import { ExchangeRequest } from '../../types';
import { getIssueTypeLabel } from '../../lib/reportCategories';
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
  Check,
  Calendar
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

      {/* 1. EDITORIAL GREETING (Open Layout with Seamless Kerala Landscape Artwork) */}
      <section className="relative overflow-hidden pt-1 pb-4">
        {/* Authentic Kerala landscape illustration on right */}
        <LandscapeIllustration className="absolute right-0 top-0 bottom-0 w-1/2 lg:w-[48%] h-full hidden md:block pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#18251F] font-normal tracking-tight leading-tight">
            Namaskaram,
            <span className="block font-bold text-[#103D2A] mt-1">
              {currentUser ? currentUser.full_name : 'Friend'}
            </span>
          </h1>

          <p className="font-sans text-sm text-[#68736B] mt-3 leading-relaxed max-w-lg">
            Manage your listings, coordinate pickups directly on WhatsApp, and review your local environmental contributions.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <button
              onClick={() => navigate('/marketplace/new')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#103D2A] hover:bg-[#0B3827] text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Add Listing</span>
            </button>

            <button
              onClick={() => navigate('/ai-scanner')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-[#FAF8F2] text-[#18251F] border border-[#DCD6CB] rounded-lg text-xs font-medium transition-colors shadow-2xs"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#103D2A]" />
              <span>Waste Scanner</span>
            </button>

            <button
              onClick={() => navigate('/report-issue')}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-[#FAF8F2] text-[#18251F] border border-[#DCD6CB] rounded-lg text-xs font-medium transition-colors shadow-2xs"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
              <span>Report Issue</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. FOUR METRIC CARDS (Exact Match to Visual Reference) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Diverted Waste */}
        <div className="bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[142px] shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E8EEDC] text-[#174B32] flex items-center justify-center shrink-0">
              <Leaf className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#18251F]">Diverted Waste</span>
          </div>
          <div className="my-1.5">
            <span className="font-editorial text-2xl sm:text-3xl text-[#18251F] font-bold tracking-tight">
              {metrics.total_waste_diverted_kg}
            </span>
            <span className="text-xs text-[#68736B] ml-1.5 font-normal">kg</span>
          </div>
          <span className="text-[11px] text-[#68736B]">
            {metrics.total_co2e_avoided_kg} kg CO₂e avoided
          </span>
          <BotanicalWatermark />
        </div>

        {/* Metric 2: Your Active Listings */}
        <div className="bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[142px] shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FCE8D5] text-[#C26522] flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#18251F]">Your Active Listings</span>
          </div>
          <div className="my-1.5">
            <span className="font-editorial text-2xl sm:text-3xl text-[#18251F] font-bold tracking-tight">
              {myListings.length}
            </span>
            <span className="text-xs text-[#68736B] ml-1.5 font-normal">
              {myListings.length === 1 ? 'batch' : 'batches'}
            </span>
          </div>
          <span className="text-[11px] text-[#68736B]">
            {activeMarketplaceCount} total across Kerala
          </span>
        </div>

        {/* Metric 3: Active Handovers */}
        <div className="bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[142px] shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#E3EFE3] text-[#2E7D32] flex items-center justify-center shrink-0">
              <Repeat className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#18251F]">Active Handovers</span>
          </div>
          <div className="my-1.5">
            <span className="font-editorial text-2xl sm:text-3xl text-[#18251F] font-bold tracking-tight">
              {activeExchanges.length}
            </span>
            <span className="text-xs text-[#68736B] ml-1.5 font-normal">in progress</span>
          </div>
          <span className="text-[11px] text-[#68736B]">
            {metrics.total_completed_exchanges} verified completions
          </span>
        </div>

        {/* Metric 4: EcoPoints Balance */}
        <div className="bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[142px] shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#EFE8F5] text-[#6B46C1] flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-[#18251F]">EcoPoints Balance</span>
          </div>
          <div className="my-1.5">
            <span className="font-editorial text-2xl sm:text-3xl text-[#18251F] font-bold tracking-tight">
              {currentUser ? currentUser.eco_points_balance : 0}
            </span>
            <span className="text-xs text-[#18251F] ml-1.5 font-bold">PTS</span>
          </div>
          <span className="text-[11px] text-[#68736B] capitalize">
            {currentUser ? `${currentUser.role} Account` : 'Individual Account'}
          </span>
        </div>
      </section>

      {/* 3. TWO-COLUMN WORKSPACE: AVAILABLE MATERIALS NEARBY (70%) + COMMUNITY & IMPACT (30%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">

        {/* Left Column (~70% width, 8 cols): Available Materials Nearby */}
        <section className="lg:col-span-8 flex flex-col gap-4 min-w-0">
          
          <div className="flex items-baseline justify-between pb-1">
            <div>
              <h2 className="font-editorial text-2xl text-[#18251F] font-bold tracking-tight">
                Available Materials Nearby
              </h2>
              <p className="font-sans text-xs sm:text-sm text-[#68736B] mt-0.5">
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
            <div className="flex flex-col gap-3">
              {suggestedListings.map((listing) => {
                const primaryImage = listing.images && listing.images.length > 0 
                  ? listing.images[0] 
                  : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80';

                return (
                  <article
                    key={listing.id}
                    className="bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs hover:border-[#8BA681]/60 transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                      {/* Product Thumbnail */}
                      <img
                        src={primaryImage}
                        alt={listing.title}
                        className="w-20 h-20 sm:w-24 sm:h-20 object-cover rounded-xl shrink-0 border border-[#E9E2D5] bg-[#F7F4EC]"
                        loading="lazy"
                      />

                      <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8EEDC] text-[#174B32]">
                            {listing.category?.name || 'Recyclable'}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#F6EFE5] text-[#8C6D3B]">
                            {listing.listing_type === 'free' ? 'Free' : listing.listing_type === 'exchange' ? 'Barter' : `₹${listing.price}`}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-[#174B32] font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full ${listing.status === 'reserved' ? 'bg-amber-600' : 'bg-emerald-600'}`} />
                            {listing.status === 'reserved' ? 'Reserved' : 'Available'}
                          </span>
                        </div>

                        <h3 className="font-editorial font-bold text-base sm:text-lg text-[#18251F] truncate">
                          {listing.title}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-[#68736B]">
                          <span className="flex items-center gap-1">
                            <Package className="w-3.5 h-3.5 text-[#68736B]" />
                            Quantity: <strong className="font-medium text-[#18251F]">{listing.quantity} {listing.unit}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#68736B]" />
                            {listing.district || 'Kasaragod'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center self-end sm:self-center shrink-0">
                      <button
                        onClick={() => navigate(`/marketplace/${listing.id}`)}
                        className="px-5 py-2 rounded-lg bg-[#103D2A] hover:bg-[#0B3827] text-white text-xs font-medium transition-colors shadow-2xs"
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
            <div className="flex items-baseline justify-between pb-1">
              <div>
                <h3 className="font-editorial text-xl text-[#18251F] font-bold">
                  Ongoing Exchanges
                </h3>
                <p className="font-sans text-xs text-[#68736B] mt-0.5">
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
              <div className="p-6 bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl text-center text-xs text-[#68736B]">
                No pending handovers. Request materials or accept incoming requests to start exchanging.
              </div>
            ) : (
              <div className="bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl divide-y divide-[#E6E0D5] shadow-2xs overflow-hidden">
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
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-[#FAF8F2] text-[#18251F] border border-[#DCD6CB] text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
                        type="button"
                      >
                        <QrCode className="w-3.5 h-3.5 text-[#103D2A]" />
                        <span>Pass</span>
                      </button>

                      <button
                        onClick={() => navigate('/exchanges')}
                        className="px-3.5 py-1.5 rounded-lg bg-[#103D2A] hover:bg-[#08291D] text-white text-xs font-medium transition-colors"
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

        {/* Right Column (~30% width, 4 cols): Community Drives & Your Impact */}
        <aside className="lg:col-span-4 flex flex-col gap-4 min-w-0">

          {/* Community Drives Panel */}
          <div className="bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3.5 shadow-2xs">
            <div className="flex items-baseline justify-between border-b border-[#E8E4DA] pb-2.5">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#103D2A]" />
                <h3 className="font-editorial text-lg text-[#18251F] font-bold">
                  Community Drives
                </h3>
              </div>
              <span className="text-xs text-[#68736B]">
                {spotlightDrive ? spotlightDrive.district : 'Kerala'}
              </span>
            </div>

            {spotlightDrive ? (
              <div className="flex flex-col gap-2.5 pt-1">
                <h4 className="font-sans font-medium text-sm text-[#18251F] leading-snug">
                  {spotlightDrive.title}
                </h4>
                <p className="font-sans text-xs text-[#68736B] leading-relaxed line-clamp-3">
                  {spotlightDrive.description}
                </p>

                <div className="py-2 flex items-center justify-between text-xs text-[#103D2A] font-medium border-t border-[#E8E4DA]/60">
                  <span>Earn points</span>
                  <span>+{spotlightDrive.reward_points} EcoPoints</span>
                </div>

                <button
                  onClick={() => setRsvpDone(!rsvpDone)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    rsvpDone
                      ? 'bg-[#FAF8F2] text-[#103D2A] border border-[#8BA681]'
                      : 'bg-[#103D2A] hover:bg-[#0B3827] text-white'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{rsvpDone ? 'Registered' : 'Register for Drive'}</span>
                </button>
              </div>
            ) : (
              <div className="py-2 flex flex-col gap-3">
                <p className="font-sans text-xs text-[#68736B] leading-relaxed">
                  No community drives scheduled nearby.
                </p>
                <button
                  onClick={() => navigate('/community')}
                  className="w-full py-2 px-3 bg-white hover:bg-[#FAF8F2] text-[#18251F] border border-[#DCD6CB] rounded-lg text-xs font-medium transition-colors text-center"
                >
                  Explore Initiatives
                </button>
              </div>
            )}
            <BotanicalWatermark />
          </div>

          {/* Your Impact Panel */}
          <div className="bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3 shadow-2xs">
            <div className="flex items-center gap-2 border-b border-[#E8E4DA] pb-2.5">
              <Leaf className="w-5 h-5 text-[#103D2A]" />
              <h3 className="font-editorial text-lg text-[#18251F] font-bold">
                Your Impact
              </h3>
            </div>

            <p className="font-sans text-xs text-[#68736B] leading-relaxed py-1">
              Keep contributing for a cleaner, circular Kerala.
            </p>

            <BotanicalWatermark />
          </div>

          {/* Environmental Watch & Reports */}
          <div className="bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl p-5 relative overflow-hidden flex flex-col gap-3 shadow-2xs">
            <div className="flex items-baseline justify-between border-b border-[#E8E4DA] pb-2.5">
              <h3 className="font-editorial text-lg text-[#18251F] font-bold">
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
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9]">
                        {getIssueTypeLabel(report.issue_type)}
                      </span>
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
        <Modal
          isOpen={Boolean(selectedExchangeForPass)}
          onClose={() => setSelectedExchangeForPass(null)}
          title="Handover Verification Pass"
          subtitle="Show this code to your exchange partner during physical pickup."
          icon={<QrCode className="w-5 h-5 text-[#103D2A]" />}
          maxWidth="sm"
          footer={
            <button
              onClick={() => setSelectedExchangeForPass(null)}
              className="w-full py-2.5 bg-[#103D2A] hover:bg-[#0B3827] text-white rounded-xl text-xs font-medium transition-colors shadow-2xs"
              type="button"
            >
              Close Pass
            </button>
          }
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className="p-4 bg-[#F8F6EF] rounded-xl border border-[#E8E4DA] flex flex-col items-center w-full my-1">
              <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center border border-[#E8E4DA] shadow-2xs">
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
              <span className="font-mono font-bold text-xl text-[#103D2A] tracking-wider mt-3">
                {selectedExchangeForPass.completion_code || selectedExchangeForPass.id.slice(0, 8).toUpperCase()}
              </span>
              <span className="font-sans text-xs text-[#68736B] mt-0.5 truncate max-w-[240px]">
                {selectedExchangeForPass.listing?.title || 'Material Batch'}
              </span>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
