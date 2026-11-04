import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { MetricCard } from '../../components/ui/MetricCard';
import { 
  Package, 
  Repeat, 
  Award, 
  Leaf, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ScanLine, 
  Plus, 
  QrCode, 
  MessageSquare,
  Clock,
  ExternalLink
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { listings, exchangeRequests, metrics, challenges } = useData();
  const navigate = useNavigate();

  // User-specific stats
  const myListings = listings.filter(l => l.user_id === currentUser.id);
  const myExchanges = exchangeRequests.filter(r => r.requester_id === currentUser.id || r.listing?.user_id === currentUser.id);
  const activeExchanges = myExchanges.filter(r => r.status === 'accepted' || r.status === 'pending');

  // Spotlight drive
  const spotlightDrive = challenges[0] || {
    id: 'c1',
    title: 'Panampilly Nagar E-Waste Collection Drive',
    description: 'Co-organized with Clean Kerala Company Ltd. Segregate spent lithium batteries and obsolete cables.',
    reward_points: 50,
    start_date: 'This Saturday • 9:00 AM',
    banner_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
    district: 'Ernakulam'
  };

  const [rsvpDone, setRsvpDone] = useState(false);

  return (
    <div className="flex flex-col w-full gap-space-lg pb-space-xl max-w-7xl mx-auto">
      
      {/* 1. TOP WELCOME & WARD CONTEXT BANNER */}
      <section className="relative overflow-hidden rounded-xl bg-surface-container p-space-md sm:p-space-lg border border-outline-variant/60 shadow-sm">
        {/* Background Subtle Watermark Leaf / Cyclone */}
        <div className="absolute right-0 top-0 w-96 h-full opacity-10 pointer-events-none flex items-center justify-end pr-space-md">
          <svg className="text-primary" fill="none" height="280" viewBox="0 0 200 200" width="280">
            <path d="M100 20C55.8 20 20 55.8 20 100C20 144.2 55.8 180 100 180C144.2 180 180 144.2 180 100" stroke="currentColor" strokeLinecap="round" strokeWidth="12" />
            <path d="M100 60C77.9 60 60 77.9 60 100C60 122.1 77.9 140 100 140" stroke="currentColor" strokeDasharray="6 8" strokeWidth="8" />
            <circle cx="100" cy="100" fill="currentColor" r="16" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
          <div className="flex flex-col gap-1 text-left">
            <div className="inline-flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm tracking-wide uppercase font-semibold">
                Haritha Karma Sena Synced
              </span>
              <span className="text-outline font-body-sm text-body-sm">•</span>
              <span className="text-secondary font-label-sm text-label-sm flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-surface-tint" /> Ward 24 Verified
              </span>
            </div>
            
            <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
              Namaskaram, {currentUser.full_name}!
            </h1>
            
            <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
              {currentUser.district} Central Ward 24 • Active Participant. Your neighborhood loop is operating at 88% circular diversion this cycle.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <Button
              onClick={() => navigate('/marketplace/new')}
              variant="primary"
              icon={<Plus className="w-4 h-4" />}
            >
              List Unwanted Materials
            </Button>

            <Button
              onClick={() => navigate('/scanner')}
              variant="subtle"
              icon={<ScanLine className="w-4 h-4 text-surface-tint" />}
            >
              Scan with AI
            </Button>

            <Button
              onClick={() => navigate('/report-issue')}
              variant="subtle"
              className="hover:text-error hover:border-error/40"
              icon={<AlertTriangle className="w-4 h-4 text-error" />}
            >
              Report Local Issue
            </Button>
          </div>
        </div>
      </section>

      {/* 2. KPI METRICS RIBBON (4 Columns) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        
        {/* Active Listings */}
        <MetricCard
          label="Active Listings"
          value={myListings.length > 0 ? myListings.length : 3}
          unit="available for claim"
          subtext="Coconut Husks, Cartons, Glass Jars"
          icon={<Package className="w-5 h-5" />}
          iconBg="bg-surface-container"
          iconColor="text-primary"
          footerLabel="Last updated"
          footerValue="Yesterday, 18:30"
        />

        {/* Ongoing Exchanges */}
        <MetricCard
          label="Ongoing Exchanges"
          value={activeExchanges.length > 0 ? activeExchanges.length : 2}
          unit="in handover pipe"
          subtext="1 Awaiting Handover • 1 In Review"
          icon={<Repeat className="w-5 h-5" />}
          iconBg="bg-secondary-container"
          iconColor="text-on-secondary-container"
          footerLabel="Next event"
          footerValue="Today at 16:00"
        />

        {/* EcoPoints Balance */}
        <MetricCard
          label="EcoPoints Balance"
          value={currentUser.eco_points_balance}
          unit="PTS"
          badge={
            <span className="font-label-sm text-label-sm text-on-surface px-2 py-0.5 rounded-full bg-surface-container border border-outline-variant/60 font-semibold">
              Lvl 2: Green Contributor
            </span>
          }
          icon={<Award className="w-5 h-5" />}
          iconBg="bg-tertiary-fixed"
          iconColor="text-primary"
          progressPercent={80}
          progressLabel="Tier Progress (480 / 600)"
        />

        {/* Total Diverted */}
        <MetricCard
          label="Total Waste Diverted"
          value={(metrics.total_waste_diverted_kg / 10).toFixed(1)}
          unit="kg verified"
          subtext="Diverted from Brahmapuram & landfills"
          icon={<Leaf className="w-5 h-5" />}
          iconBg="bg-surface-container-highest"
          iconColor="text-primary"
          footerLabel="Carbon offset equivalent"
          footerValue={`~${((metrics.total_waste_diverted_kg / 10) * 1.5).toFixed(1)} kg CO₂e`}
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
                <Sparkles className="w-5 h-5 text-surface-tint" />
                <h2 className="font-heading font-bold text-headline-sm text-primary">
                  Smart Material Matches
                </h2>
              </div>
              <span className="font-label-sm text-label-sm text-secondary bg-surface-container px-2.5 py-1 rounded-full border border-outline-variant/50 font-semibold">
                Algorithmic Local Pairing
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {/* Card 1: Coconut Husk Match */}
              <div className="flex flex-col justify-between bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/60 shadow-sm hover:shadow-md transition-all text-left">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold bg-tertiary-fixed px-2 py-0.5 rounded-full mb-1">
                        <Sparkles className="w-3 h-3" /> 96% Match Score
                      </span>
                      <h3 className="font-heading font-semibold text-title-md text-on-surface">
                        Kochi Organic Farm Collective
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-primary">
                      <span className="material-symbols-outlined text-[20px]">potted_plant</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Target Material:</span>
                      <span className="font-semibold text-primary">Coconut Husk & Coir Dust</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Distance:</span>
                      <span className="font-medium text-on-surface">4.2 km (Vyttila Hub)</span>
                    </div>
                  </div>

                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Urgent demand for organic mulching & terrace bed substrates for summer vegetable crops. Matches your active backyard husk store.
                  </p>
                </div>

                <div className="pt-space-md mt-space-sm flex items-center justify-between gap-2 border-t border-outline-variant/40">
                  <span className="font-label-sm text-label-sm text-secondary font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">electric_moped</span> Direct Doorstep Pickup
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate('/smart-match')}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                    iconPosition="right"
                  >
                    Initiate Exchange
                  </Button>
                </div>
              </div>

              {/* Card 2: Glass Bottles Match */}
              <div className="flex flex-col justify-between bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/60 shadow-sm hover:shadow-md transition-all text-left">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary font-bold bg-secondary-fixed px-2 py-0.5 rounded-full mb-1">
                        <span className="material-symbols-outlined text-[13px]">tune</span> 89% Match Score
                      </span>
                      <h3 className="font-heading font-semibold text-title-md text-on-surface">
                        Mattancherry Upcycle Studio
                      </h3>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0 text-primary">
                      <span className="material-symbols-outlined text-[20px]">palette</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Target Material:</span>
                      <span className="font-semibold text-primary">Clear Glass Bottles (750ml)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-outline">Distance:</span>
                      <span className="font-medium text-on-surface">6.8 km (Bazaar Road)</span>
                    </div>
                  </div>

                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Seeking undamaged swing-top or crown-neck bottles for artisanal kombucha & cold-brew bottling batches.
                  </p>
                </div>

                <div className="pt-space-md mt-space-sm flex items-center justify-between gap-2 border-t border-outline-variant/40">
                  <span className="font-label-sm text-label-sm text-secondary font-medium flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-primary" /> +35 EcoPoints
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate('/smart-match')}
                  >
                    View Request
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Active Exchanges Pipeline */}
          <section className="flex flex-col gap-space-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-surface-tint" />
                <h2 className="font-heading font-bold text-headline-sm text-primary">
                  Active Exchanges Pipeline
                </h2>
              </div>
              <Link to="/dashboard/exchanges" className="font-label-md text-label-md text-primary hover:underline flex items-center gap-0.5">
                <span>All Historical (14)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="flex flex-col gap-3">
              {/* Pipeline Item 1 */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary">
                    <span className="material-symbols-outlined text-[24px]">compost</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-heading font-semibold text-title-md text-on-surface">
                        Dry Coconut Shells (15 kg)
                      </h4>
                      <Badge variant="success">Awaiting Handover</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant font-body-sm text-body-sm mt-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-outline">person</span> Saji K. (Terrace Potter, Aluva)
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <Clock className="w-3.5 h-3.5" /> Today, 4:00 PM
                      </span>
                      <span>•</span>
                      <span>Location: Kadavanthra Junction Hub</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<MessageSquare className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/dashboard/exchanges')}
                  >
                    Chat
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    icon={<QrCode className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/dashboard/exchanges')}
                  >
                    View QR Pass
                  </Button>
                </div>
              </div>

              {/* Pipeline Item 2 */}
              <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center shrink-0 text-primary">
                    <span className="material-symbols-outlined text-[24px]">inventory</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-heading font-semibold text-title-md text-on-surface">
                        Corrugated Shipping Boxes (8 units)
                      </h4>
                      <Badge variant="pending">Accepted - Pickup Scheduled</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant font-body-sm text-body-sm mt-1">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px] text-outline">local_shipping</span> GreenKart Logistics (EV Route 04)
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-outline" /> Tomorrow, 10:30 AM
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate('/dashboard/exchanges')}
                  >
                    Contact Logistics
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Circular Impact Breakdown Infographic Widget (Donut Chart) */}
          <section className="bg-surface-container p-space-md rounded-xl border border-outline-variant/60 shadow-sm flex flex-col sm:flex-row items-center gap-space-md text-left">
            <div className="w-28 h-28 shrink-0 relative flex items-center justify-center">
              {/* Circular mini SVG donut chart representing material split */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-surface-container-high" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                {/* Organic 55% */}
                <path className="text-primary-container" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="55, 100" strokeWidth="4" />
                {/* Paper 30% */}
                <path className="text-surface-tint" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="30, 100" strokeDashoffset="-55" strokeWidth="4" />
                {/* Glass 15% */}
                <path className="text-secondary" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="15, 100" strokeDashoffset="-85" strokeWidth="4" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading font-bold text-headline-sm text-primary leading-none">84.5</span>
                <span className="font-label-sm text-label-sm text-outline">kg</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-semibold text-title-md text-primary">
                  Your Diversion Footprint by Category
                </h4>
                <span className="font-label-sm text-label-sm text-outline">Q1 2026 Audit</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                    <span>Organic / Biomass</span>
                  </div>
                  <span className="font-heading font-bold text-title-md text-primary mt-0.5">46.5 kg</span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface">
                    <span className="w-2.5 h-2.5 rounded-full bg-surface-tint"></span>
                    <span>Paper & Cardboard</span>
                  </div>
                  <span className="font-heading font-bold text-title-md text-primary mt-0.5">25.3 kg</span>
                </div>

                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                    <span>Glass & Metals</span>
                  </div>
                  <span className="font-heading font-bold text-title-md text-primary mt-0.5">12.7 kg</span>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Right Column (4 Cols): Community Drives & Neighborhood Watch */}
        <div className="lg:col-span-4 flex flex-col gap-space-lg">
          
          {/* Community Drive Spotlight */}
          <section className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/60 shadow-sm flex flex-col gap-space-md text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-surface-tint" />
                <h3 className="font-heading font-bold text-title-md text-primary">Upcoming Drive</h3>
              </div>
              <span className="font-label-sm text-label-sm text-on-primary bg-primary-container px-2 py-0.5 rounded font-semibold">
                Ward 24 Drive
              </span>
            </div>

            <div className="rounded-lg overflow-hidden bg-surface-container relative">
              <img
                className="w-full h-36 object-cover"
                alt="Community waste recycling drive volunteers in Kerala"
                src={spotlightDrive.banner_url || 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80'}
              />
              <div className="absolute bottom-2 right-2 bg-surface/90 backdrop-blur-sm px-2 py-1 rounded text-primary font-label-sm text-label-sm border border-outline-variant/40">
                This Saturday • 9:00 AM
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <h4 className="font-heading font-semibold text-title-md text-on-surface">
                {spotlightDrive.title}
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {spotlightDrive.description}
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-tertiary-fixed flex items-center justify-between">
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
              {rsvpDone ? 'RSVP Confirmed (Added to Ward Cal)' : 'RSVP / Add to Ward Calendar'}
            </Button>
          </section>

          {/* Neighborhood Environmental Watch (Ward Civic Watch) */}
          <section className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/60 shadow-sm flex flex-col gap-space-md text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-surface-tint text-[20px]">visibility</span>
                <h3 className="font-heading font-bold text-title-md text-primary">Ward Civic Watch</h3>
              </div>
              <span className="font-label-sm text-label-sm text-outline font-medium">KMC Real-time</span>
            </div>

            {/* Issue 1: Under Action */}
            <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2 border border-outline-variant/40">
              <div className="flex items-start justify-between gap-2">
                <span className="font-label-sm text-label-sm text-secondary bg-surface-container px-2 py-0.5 rounded flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span> Action in Progress
                </span>
                <span className="font-body-sm text-body-sm text-outline">Reported 2d ago</span>
              </div>
              <h5 className="font-heading font-semibold text-body-md text-on-surface">
                Overflowing Bin near Marine Drive Walkway
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Dispatched to Kochi Municipal Corporation sanitation crew. Route vehicle assigned #KL-07-CS-4190.
              </p>
              <div className="pt-1 flex items-center justify-between text-outline font-label-sm text-label-sm border-t border-outline-variant/30">
                <span>Ticket: #KMC-2026-8812</span>
                <Link to="/reports" className="text-primary hover:underline font-semibold flex items-center gap-0.5">
                  Track Updates →
                </Link>
              </div>
            </div>

            {/* Issue 2: Cleared & Verified */}
            <div className="p-3 rounded-lg bg-surface-container-low flex flex-col gap-2 border border-outline-variant/40">
              <div className="flex items-start justify-between gap-2">
                <span className="font-label-sm text-label-sm text-primary font-bold bg-primary-fixed px-2 py-0.5 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Cleared • Verified
                </span>
                <span className="font-body-sm text-body-sm text-outline">3d ago</span>
              </div>
              <h5 className="font-heading font-semibold text-body-md text-on-surface">
                Coir Residue Dumping at Ravipuram Corner
              </h5>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Haritha Karma Sena team cleared and channeled into nursery bio-mulch depot.
              </p>
            </div>

            <Button
              variant="secondary"
              fullWidth
              onClick={() => navigate('/report-issue')}
              icon={<AlertTriangle className="w-4 h-4 text-error" />}
            >
              Submit Geo-Tagged Report
            </Button>
          </section>

          {/* Local Eco-Partner Recognition */}
          <section className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/50 flex flex-col gap-2 text-left">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">handshake</span>
              <span className="font-heading font-semibold text-body-md text-primary">
                Haritha Karma Sena Partner Ward
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Your segregated waste handovers help support 18 women micro-entrepreneurs in Ward 24's decentralized sorting unit.
            </p>
          </section>

        </div>

      </div>

    </div>
  );
};
