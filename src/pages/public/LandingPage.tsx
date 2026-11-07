import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  MapPin, 
  CheckCircle2, 
  ScanLine, 
  Building2, 
  Home, 
  Sprout, 
  Recycle,
  ShieldCheck,
  TrendingUp,
  Award
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';

export const LandingPage: React.FC = () => {
  const { listings, allMarketplaceListings, metrics } = useData();

  useEffect(() => {
    if (window.location.hash === '#how-it-works') {
      const el = document.getElementById('how-it-works');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const availableListings = allMarketplaceListings && allMarketplaceListings.length > 0 ? allMarketplaceListings : listings;
  const previewListings = availableListings.filter((l) => l.status === 'active').slice(0, 4);

  return (
    <div className="space-y-16 pb-20">
      
      {/* 1. HERO SECTION */}
      <section className="pt-6 sm:pt-10 pb-6 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Heading & Value Proposition */}
          <div className="lg:col-span-7 space-y-5 text-left">
            <div className="inline-flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm tracking-wide uppercase font-semibold">
                Kerala Circular Resource Action
              </span>
              <span className="text-outline text-xs">•</span>
              <span className="text-secondary font-label-sm text-label-sm flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Community Verified
              </span>
            </div>

            <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-primary tracking-tight leading-[1.15]">
              Give waste a second life.
            </h1>

            <p className="font-body text-body-lg text-on-surface-variant leading-relaxed max-w-xl">
              Connect with people who can reuse, recycle, or transform materials you no longer need. Built for Kerala’s households, restaurants, farmers, and recycling networks.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/marketplace">
                <Button size="lg" variant="primary" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                  Explore Materials
                </Button>
              </Link>

              <Link to="/marketplace/new">
                <Button size="lg" variant="subtle">
                  List Your Waste
                </Button>
              </Link>

              <Link to="/scanner">
                <Button size="lg" variant="secondary" icon={<ScanLine className="w-4 h-4 text-primary" />}>
                  Scan Material
                </Button>
              </Link>
            </div>

            <p className="font-body-sm text-body-sm text-outline pt-1">
              Community platform • Direct circular exchange • Local Kerala district tracking.
            </p>
          </div>

          {/* Right Column: Grounded Real-life Editorial Visual */}
          <div className="lg:col-span-5">
            <div className="relative rounded-xl overflow-hidden border border-outline-variant bg-surface-container shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80"
                alt="Community organic waste segregation and compost bedding in Kerala"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="p-3 bg-surface-container-lowest border-t border-outline-variant flex items-center justify-between text-xs text-on-surface-variant">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span className="font-medium text-on-surface">Decentralized Waste Diversion</span>
                </div>
                <span className="text-outline">Kerala, India</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. RESTRAINED LIVE PLATFORM KPI BAR */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-surface-container p-space-md sm:p-space-lg rounded-xl border border-outline-variant/60 shadow-subtle">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-outline-variant/50">
            
            <div className="pt-2 sm:pt-0 sm:px-4 text-left">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
                Total Diverted
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-heading font-bold text-2xl sm:text-3xl text-primary">
                  {metrics.total_waste_diverted_kg.toLocaleString()}
                </span>
                <span className="font-label-sm text-secondary font-semibold">kg</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant block mt-0.5">
                Empirical landfill diversion
              </span>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 text-left">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
                CO₂e Avoided
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-heading font-bold text-2xl sm:text-3xl text-primary">
                  {metrics.total_co2e_avoided_kg.toLocaleString()}
                </span>
                <span className="font-label-sm text-secondary font-semibold">kg</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant block mt-0.5">
                Empirical emissions prevented
              </span>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 text-left">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
                Active Listings
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-heading font-bold text-2xl sm:text-3xl text-primary">
                  {metrics.total_active_listings}
                </span>
                <span className="font-label-sm text-primary font-semibold">lots</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant block mt-0.5">
                Available for pickup
              </span>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 text-left">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
                Completed Exchanges
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="font-heading font-bold text-2xl sm:text-3xl text-primary">
                  {metrics.total_completed_exchanges}
                </span>
                <span className="font-label-sm text-primary font-semibold">verified</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant block mt-0.5">
                Code verified handovers
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 3. FOUR-STEP PRACTICAL WORKFLOW */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-left mb-8 space-y-1">
          <Badge variant="brand">Operational Workflow</Badge>
          <h2 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            How GreenLoop works in your area
          </h2>
          <p className="font-body text-body-md text-on-surface-variant max-w-2xl">
            A simple, verified loop from material generation to responsible circular redistribution.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <Card variant="elevated" className="flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center font-heading font-bold text-primary mb-3">
                1
              </div>
              <h3 className="font-heading font-bold text-lg text-primary mb-1">
                List your materials
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Post vegetable discards, cardboard cartons, coconut husks, glass bottles, or scrap metals with photo and quantity.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-outline-variant/40 text-[11px] text-outline">
              Instant listing
            </div>
          </Card>

          <Card variant="elevated" className="flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center font-heading font-bold text-primary mb-3">
                2
              </div>
              <h3 className="font-heading font-bold text-lg text-primary mb-1">
                Smart circular guidance
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Smart camera classification identifies the material, estimates weight, gives handling guidance, and suggests composting or recycling.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-outline-variant/40 text-[11px] text-outline">
              Automated Material Analysis
            </div>
          </Card>

          <Card variant="elevated" className="flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center font-heading font-bold text-secondary mb-3">
                3
              </div>
              <h3 className="font-heading font-bold text-lg text-primary mb-1">
                Local smart match
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Nearby terrace gardeners, compost yards, or collection hubs discover compatible materials.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-outline-variant/40 text-[11px] text-outline">
              Proximity match scoring
            </div>
          </Card>

          <Card variant="elevated" className="flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center font-heading font-bold text-primary mb-3">
                4
              </div>
              <h3 className="font-heading font-bold text-lg text-primary mb-1">
                Handover & points
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Coordinate pickup with secure completion codes, confirm handover, and receive verifiable EcoPoints into your ledger.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-outline-variant/40 text-[11px] text-outline">
              Verifiable EcoPoints
            </div>
          </Card>

        </div>
      </section>

      {/* 4. ACTIVE MATERIALS READY FOR CIRCULATION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div className="space-y-1">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
              Recent Kerala Listings
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
              Materials ready for a second life
            </h2>
          </div>
          <Link to="/marketplace">
            <Button variant="secondary" size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
              View All Materials ({availableListings.length})
            </Button>
          </Link>
        </div>

        {previewListings.length === 0 ? (
          <div className="p-8 border border-dashed border-outline-variant rounded-xl bg-surface-container-low/40 text-center max-w-lg mx-auto">
            <p className="font-body-md text-on-surface-variant text-sm mb-3">
              Be the first in your district to list reusable materials, biomass, or recyclables!
            </p>
            <Link to="/marketplace/new">
              <Button variant="primary" size="sm">
                + List Material
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {previewListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {/* 5. KERALA STAKEHOLDERS GRID */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-surface-container p-space-md sm:p-space-xl rounded-xl border border-outline-variant/60">
          <div className="text-left mb-8 space-y-1">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block">
              Local Ecosystem
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
              Built for everyone in Kerala's circular cycle
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/60">
              <div className="p-2 rounded-lg bg-surface-container w-fit mb-3 text-primary">
                <Home className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-primary mb-1">
                Households & Individuals
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Give away cardboard, bottles, dry coconut shells, and e-waste. Track personal CO₂ savings and earn EcoPoints.
              </p>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/60">
              <div className="p-2 rounded-lg bg-surface-container w-fit mb-3 text-primary">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-primary mb-1">
                Restaurants & Markets
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Divert daily vegetable peelings and wet waste directly to local composters, eliminating dump fees.
              </p>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/60">
              <div className="p-2 rounded-lg bg-surface-container w-fit mb-3 text-primary">
                <Sprout className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-primary mb-1">
                Farmers & Gardeners
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Source free organic substrates, coir dust, coffee grounds, and compost material within a local radius.
              </p>
            </div>

            <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/60">
              <div className="p-2 rounded-lg bg-surface-container w-fit mb-3 text-primary">
                <Recycle className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-primary mb-1">
                Recycling MCFs & Centres
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Collection hubs and recyclers locate segregated batches of clean plastics, metals, paper, and e-waste.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 6. BOTTOM CALL TO ACTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-primary-container text-on-primary rounded-xl p-space-lg sm:p-space-xl relative overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-xl space-y-4 text-left">
            <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold tracking-wide uppercase">
              Join Kerala Circular Action
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl lg:text-4xl text-on-primary tracking-tight">
              Start diverting materials today.
            </h2>
            <p className="font-body text-body-md text-on-primary-container leading-relaxed">
              Whether you have 2 kg of kitchen scrap or 50 shipping cartons, someone in your community can give it a second life.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/marketplace/new">
                <Button size="lg" className="bg-surface-container-lowest text-primary hover:bg-surface-container-high border-none font-semibold">
                  List Your First Material
                </Button>
              </Link>
              <Link to="/scanner">
                <Button size="lg" variant="outline" className="border-on-primary-container text-on-primary hover:bg-primary">
                  Try Waste Scanner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
