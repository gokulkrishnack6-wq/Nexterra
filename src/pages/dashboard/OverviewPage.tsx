import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { MetricCard } from '../../components/ui/MetricCard';
import { EmptyState, MetricCardSkeleton } from '../../components/ui/Skeleton';
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
  MessageSquare,
  Clock,
  Compass
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { listings, exchangeRequests, metrics, challenges, reports, isLoading } = useData();
  const { district: userDistrict, locality: userLocality } = useGeolocation();
  const navigate = useNavigate();

  // User-specific stats (safely handled when unauthenticated or freshly signed up)
  const currentUserId = currentUser?.id || '';
  const myListings = listings.filter((l) => l.user_id === currentUserId);
  const myExchanges = exchangeRequests.filter(
    (r) => r.requester_id === currentUserId || r.listing?.user_id === currentUserId
  );
  const activeExchanges = myExchanges.filter(
    (r) => r.status === 'accepted' || r.status === 'pending'
  );

  // Available community challenge or spotlight drive
  const spotlightDrive = challenges[0] || null;
  const [rsvpDone, setRsvpDone] = useState(false);

  // Recent civic reports in the area
  const recentReports = reports.slice(0, 3);

  // Smart suggestions from available listings in other categories
  const suggestedListings = listings.filter((l) => l.user_id !== currentUserId && l.status === 'active').slice(0, 2);

  if (isLoading) {
    return (
      <div className="flex flex-col w-full gap-6 pb-12 max-w-7xl mx-auto">
        <div className="h-40 rounded-xl bg-surface-container-high/40 animate-pulse" />
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
    <div className="flex flex-col w-full gap-space-lg pb-space-xl max-w-7xl mx-auto">
      
      {/* 1. TOP WELCOME & LOCATION CONTEXT BANNER */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container p-space-md sm:p-space-lg border border-outline-variant/60 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
          <div className="flex flex-col gap-1 text-left">
            <div className="inline-flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm tracking-wide uppercase font-semibold">
                Kerala Circular Network
              </span>
              <span className="text-outline font-body-sm text-body-sm">•</span>
              <span className="text-secondary font-label-sm text-label-sm flex items-center gap-1 font-medium">
                <Compass className="w-3.5 h-3.5 text-primary" /> {userLocality || userDistrict}
              </span>
            </div>
            
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
              {currentUser ? `Namaskaram, ${currentUser.full_name}` : 'Welcome to GreenLoop'}
            </h1>
            
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              {currentUser
                ? `${currentUser.district} • ${currentUser.role.toUpperCase()} account. Keep reusable materials in active local circulation.`
                : 'Connect with local individuals, businesses, farmers, and recycling collection centres across Kerala.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <Button
              onClick={() => navigate('/marketplace/new')}
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
            >
              List Materials
            </Button>

            <Button
              onClick={() => navigate('/ai-scanner')}
              variant="subtle"
              icon={<ScanLine className="w-4 h-4 text-primary" />}
            >
              Scan with AI
            </Button>

            <Button
              onClick={() => navigate('/report-issue')}
              variant="subtle"
              className="hover:text-error hover:border-error/40"
              icon={<AlertTriangle className="w-4 h-4 text-error" />}
            >
              Report Issue
            </Button>
          </div>
        </div>
      </section>

      {/* 2. KPI METRICS RIBBON (4 Columns) - Genuine Empirical Values */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        
        {/* Active Listings */}
        <MetricCard
          label="My Active Listings"
          value={myListings.length}
          unit="listed"
          subtext={myListings.length === 0 ? 'No listings published yet' : `${myListings.length} active in marketplace`}
          icon={<Package className="w-5 h-5" />}
          iconBg="bg-surface-container"
          iconColor="text-primary"
          footerLabel="Total marketplace listings"
          footerValue={`${listings.filter((l) => l.status === 'active').length} available`}
        />

        {/* Ongoing Exchanges */}
        <MetricCard
          label="My Active Exchanges"
          value={activeExchanges.length}
          unit="in progress"
          subtext={activeExchanges.length === 0 ? 'No active handovers' : `${activeExchanges.length} pending verification`}
          icon={<Repeat className="w-5 h-5" />}
          iconBg="bg-secondary-container"
          iconColor="text-on-secondary-container"
          footerLabel="Total completed exchanges"
          footerValue={`${metrics.total_completed_exchanges} verified`}
        />

        {/* EcoPoints Balance */}
        <MetricCard
          label="EcoPoints Balance"
          value={currentUser ? currentUser.eco_points_balance : 0}
          unit="PTS"
          badge={
            <span className="font-label-sm text-label-sm text-on-surface px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/60 font-semibold">
              {currentUser ? `Role: ${currentUser.role}` : 'Sign in to earn'}
            </span>
          }
          icon={<Award className="w-5 h-5" />}
          iconBg="bg-tertiary-fixed"
          iconColor="text-primary"
        />

        {/* Total Diverted */}
        <MetricCard
          label="Total Waste Diverted"
          value={metrics.total_waste_diverted_kg}
          unit="kg verified"
          subtext={metrics.total_waste_diverted_kg === 0 ? 'Based on verified handovers' : 'Saved from landfills'}
          icon={<Leaf className="w-5 h-5" />}
          iconBg="bg-surface-container-highest"
          iconColor="text-primary"
          footerLabel="Avoided Carbon"
          footerValue={`${metrics.total_co2e_avoided_kg} kg CO₂e`}
        />

      </section>

      {/* 3. MAIN GRID (8 Cols + 4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        
        {/* Left Column (8 Cols): Smart Matches & Active Pipeline */}
        <div className="lg:col-span-8 flex flex-col gap-space-lg">
          
          {/* Smart Material Matches Section */}
          <section className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-bold text-headline-sm text-primary">
                  Smart Material Matches
                </h2>
              </div>
              <Link to="/matches" className="font-label-md text-label-md text-primary hover:underline flex items-center gap-1">
                <span>View all matches</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {suggestedListings.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="w-6 h-6" />}
                title="No Nearby Matches Right Now"
                description="As more individuals, restaurants, and farmers in your district list materials, automated circular matches will appear here."
                actionLabel="List Your First Material"
                actionLink="/marketplace/new"
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                {suggestedListings.map((listing) => (
                  <div
                    key={listing.id}
                    className="flex flex-col justify-between bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/60 shadow-sm hover:shadow-md transition-all text-left"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold bg-secondary-container px-2 py-0.5 rounded-full mb-1">
                            {listing.category?.name || 'Recyclable'}
                          </span>
                          <h3 className="font-heading font-semibold text-title-md text-on-surface line-clamp-1">
                            {listing.title}
                          </h3>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-outline">Quantity:</span>
                          <span className="font-semibold text-primary">{listing.quantity} {listing.unit}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-outline">District:</span>
                          <span className="font-medium text-on-surface">{listing.district}</span>
                        </div>
                      </div>

                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                        {listing.description}
                      </p>
                    </div>

                    <div className="pt-space-md mt-space-sm flex items-center justify-between gap-2 border-t border-outline-variant/40">
                      <span className="font-label-sm text-label-sm text-secondary font-medium">
                        {listing.listing_type === 'free' ? 'Free Material' : listing.listing_type}
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => navigate(`/marketplace/${listing.id}`)}
                        icon={<ArrowRight className="w-3.5 h-3.5" />}
                        iconPosition="right"
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Exchanges Pipeline */}
          <section className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-primary" />
                <h2 className="font-heading font-bold text-headline-sm text-primary">
                  Active Exchanges Pipeline
                </h2>
              </div>
              <Link to="/exchanges" className="font-label-md text-label-md text-primary hover:underline flex items-center gap-0.5">
                <span>View all ({myExchanges.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {activeExchanges.length === 0 ? (
              <EmptyState
                icon={<Repeat className="w-6 h-6" />}
                title="No Active Exchanges"
                description="You currently have no ongoing material handovers. Explore available listings or submit a request to start exchanging."
                actionLabel="Explore Marketplace"
                actionLink="/marketplace"
              />
            ) : (
              <div className="flex flex-col gap-3">
                {activeExchanges.map((req) => (
                  <div
                    key={req.id}
                    className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-left"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary">
                        <Package className="w-6 h-6" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-heading font-semibold text-title-md text-on-surface">
                            {req.listing?.title || 'Material Exchange'} ({req.requested_quantity} {req.listing?.unit || 'kg'})
                          </h4>
                          <Badge variant={req.status === 'accepted' ? 'success' : 'pending'}>
                            {req.status === 'accepted' ? 'Accepted • Verification Ready' : 'Pending Confirmation'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant font-body-sm text-body-sm mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-outline" /> {new Date(req.created_at).toLocaleDateString()}
                          </span>
                          <span>•</span>
                          <span>Verification Code: <strong className="font-mono text-primary">{req.completion_code}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={<QrCode className="w-3.5 h-3.5" />}
                        onClick={() => navigate('/exchanges')}
                      >
                        Manage Exchange
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Real Diversion Footprint Breakdown */}
          <section className="bg-surface-container p-space-md rounded-xl border border-outline-variant/60 shadow-sm flex flex-col sm:flex-row items-center gap-space-md text-left">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-semibold text-title-md text-primary">
                  Empirical Material Diversion
                </h4>
                <span className="font-label-sm text-label-sm text-outline">Real Completed Exchanges</span>
              </div>

              {metrics.category_breakdown.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant py-2">
                  No verified material exchanges recorded yet. Completed exchanges will dynamically update your diversion metrics and carbon offsets.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  {metrics.category_breakdown.map((cat) => (
                    <div key={cat.category_name} className="flex flex-col p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/40">
                      <span className="font-label-sm text-xs text-on-surface-variant truncate">
                        {cat.category_name}
                      </span>
                      <span className="font-heading font-bold text-lg text-primary mt-0.5">
                        {cat.diverted_kg} kg
                      </span>
                      <span className="text-[10px] text-outline">
                        {cat.percentage}% of diverted total
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

        </div>

        {/* Right Column (4 Cols): Community Drives & Civic Watch */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          
          {/* Community Drive Spotlight */}
          {spotlightDrive ? (
            <section className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/60 shadow-sm flex flex-col gap-space-md text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="font-heading font-bold text-title-md text-primary">Upcoming Drive</h3>
                </div>
                <span className="font-label-sm text-label-sm text-primary font-semibold">
                  {spotlightDrive.district}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <h4 className="font-heading font-semibold text-title-md text-on-surface">
                  {spotlightDrive.title}
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3">
                  {spotlightDrive.description}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-secondary-container flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  <span className="font-label-sm text-label-sm text-primary font-semibold">Participation Reward</span>
                </div>
                <span className="font-heading font-bold text-title-md text-primary">+{spotlightDrive.reward_points} EcoPoints</span>
              </div>

              <Button
                variant={rsvpDone ? 'secondary' : 'primary'}
                fullWidth
                onClick={() => setRsvpDone(!rsvpDone)}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                {rsvpDone ? 'RSVP Confirmed' : 'RSVP for Drive'}
              </Button>
            </section>
          ) : (
            <section className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/60 shadow-sm flex flex-col gap-2 text-left">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-title-md text-primary">Community Drives</h3>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                No scheduled drives in your district right now. You can propose or join community cleanup initiatives.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-2"
                onClick={() => navigate('/community')}
              >
                Explore Community Initiatives
              </Button>
            </section>
          )}

          {/* Real Civic Environmental Watch */}
          <section className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/60 shadow-sm flex flex-col gap-space-md text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                <h3 className="font-heading font-bold text-title-md text-primary">Local Civic Watch</h3>
              </div>
              <Link to="/reports" className="font-label-sm text-label-sm text-primary hover:underline font-semibold">
                View Tracker →
              </Link>
            </div>

            {recentReports.length === 0 ? (
              <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/40 text-center">
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  No open environmental issues logged in your area yet.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recentReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-1.5 border border-outline-variant/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`font-label-sm text-[11px] px-2 py-0.5 rounded font-semibold ${
                        report.status === 'resolved' 
                          ? 'bg-secondary-container text-on-secondary-container' 
                          : 'bg-surface-container text-on-surface'
                      }`}>
                        {report.status === 'resolved' ? 'Resolved' : report.status === 'in_progress' ? 'In Review' : 'Reported'}
                      </span>
                      <span className="font-body-sm text-[11px] text-outline">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h5 className="font-heading font-semibold text-body-md text-on-surface line-clamp-1">
                      {report.title}
                    </h5>
                    <p className="font-body-sm text-[11px] text-on-surface-variant line-clamp-2">
                      {report.locality}, {report.district}
                    </p>
                    <div className="pt-1 flex items-center justify-between text-outline text-[11px]">
                      <span>Ticket: #{report.ticket_number}</span>
                      <Link to="/reports" className="text-primary hover:underline font-medium">
                        Track →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate('/report-issue')}
              icon={<AlertTriangle className="w-4 h-4 text-error" />}
            >
              Submit Geo-Tagged Report
            </Button>
          </section>

        </div>

      </div>

    </div>
  );
};
