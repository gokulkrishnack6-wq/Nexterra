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
          <div className="lg:col-span-7 space-y-4 text-left">
            <div className="inline-flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9] text-xs font-medium">
                Kerala Material Exchange
              </span>
              <span className="text-[#DCD6CB] text-xs">•</span>
              <span className="text-xs text-[#103D2A] flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Verified Community
              </span>
            </div>

            <h1 className="font-serif font-normal text-3xl sm:text-4xl lg:text-5xl text-[#103D2A] tracking-tight leading-[1.15]">
              Give waste a second life.
            </h1>

            <p className="font-sans text-sm sm:text-base text-[#5C6E66] leading-relaxed max-w-xl">
              Buy, sell, or donate recyclable and reusable secondary materials in Kerala. Connect directly with neighbors, farms, and aggregators who can reuse what you no longer need.
            </p>

            {/* Call to Actions */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Link to="/marketplace">
                <Button size="md" variant="primary" icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right">
                  Browse Marketplace
                </Button>
              </Link>

              <Link to="/marketplace/new">
                <Button size="md" variant="outline">
                  Add Listing
                </Button>
              </Link>

              <Link to="/scanner">
                <Button size="md" variant="secondary" icon={<ScanLine className="w-3.5 h-3.5 text-[#103D2A]" />}>
                  Identify Waste
                </Button>
              </Link>
            </div>

            <p className="text-xs text-[#7B8B83] pt-1">
              Free to use • Local pickups across Kerala • Direct WhatsApp coordination.
            </p>
          </div>

          {/* Right Column: Grounded Real-life Editorial Visual */}
          <div className="lg:col-span-5">
            <div className="relative rounded-lg overflow-hidden border border-[#E8E4DA] bg-white shadow-subtle">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1000&q=80"
                alt="Community organic waste segregation and compost bedding in Kerala"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="p-3 bg-white border-t border-[#E8E4DA] flex items-center justify-between text-xs text-[#5C6E66]">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span className="font-medium text-[#1C2826]">Local Material Redistribution</span>
                </div>
                <span className="text-[#5C6E66]">Kerala, India</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. PLATFORM IMPACT BAR */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white p-5 sm:p-6 rounded-lg border border-[#E8E4DA] shadow-subtle">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-[#E8E4DA]">
            
            <div className="pt-2 sm:pt-0 sm:px-4 text-left">
              <span className="text-xs text-[#5C6E66] block font-normal">
                Diverted from Landfill
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono font-bold text-2xl text-[#103D2A]">
                  {metrics.total_waste_diverted_kg.toLocaleString()}
                </span>
                <span className="text-xs text-[#103D2A] font-medium">kg</span>
              </div>
              <span className="text-xs text-[#7B8B83] block mt-0.5">
                Saved from dumping
              </span>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 text-left">
              <span className="text-xs text-[#5C6E66] block font-normal">
                CO₂ Saved
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono font-bold text-2xl text-[#103D2A]">
                  {metrics.total_co2e_avoided_kg.toLocaleString()}
                </span>
                <span className="text-xs text-[#103D2A] font-medium">kg</span>
              </div>
              <span className="text-xs text-[#7B8B83] block mt-0.5">
                Emissions prevented
              </span>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 text-left">
              <span className="text-xs text-[#5C6E66] block font-normal">
                Active Listings
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono font-bold text-2xl text-[#103D2A]">
                  {metrics.total_active_listings}
                </span>
                <span className="text-xs text-[#103D2A] font-medium">items</span>
              </div>
              <span className="text-xs text-[#7B8B83] block mt-0.5">
                Available for pickup
              </span>
            </div>

            <div className="pt-4 sm:pt-0 sm:px-4 text-left">
              <span className="text-xs text-[#5C6E66] block font-normal">
                Completed Exchanges
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono font-bold text-2xl text-[#103D2A]">
                  {metrics.total_completed_exchanges}
                </span>
                <span className="text-xs text-[#103D2A] font-medium">completed</span>
              </div>
              <span className="text-xs text-[#7B8B83] block mt-0.5">
                Verified handovers
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* 3. FOUR-STEP WORKFLOW */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-left mb-6 space-y-1">
          <span className="text-[11px] font-medium text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md inline-block">Workflow</span>
          <h2 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
            Simple 4-step process
          </h2>
          <p className="font-sans text-xs sm:text-sm text-[#5C6E66] max-w-2xl">
            Give unused materials a second life in your neighborhood.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          <div className="flex flex-col justify-between bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all p-4">
            <div>
              <div className="w-8 h-8 rounded-md bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9] flex items-center justify-center font-mono font-medium text-xs mb-2.5">
                1
              </div>
              <h3 className="font-sans font-medium text-sm text-[#1C2826] mb-1">
                Post your materials
              </h3>
              <p className="text-xs text-[#5C6E66] leading-relaxed">
                List cardboard boxes, bottles, organic scraps, or scrap metal with photo, condition, and quantity.
              </p>
            </div>
            <div className="pt-2.5 mt-3 border-t border-[#E8E4DA] text-[11px] text-[#7B8B83]">
              Fast &amp; free
            </div>
          </div>

          <div className="flex flex-col justify-between bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all p-4">
            <div>
              <div className="w-8 h-8 rounded-md bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9] flex items-center justify-center font-mono font-medium text-xs mb-2.5">
                2
              </div>
              <h3 className="font-sans font-medium text-sm text-[#1C2826] mb-1">
                Find local matches
              </h3>
              <p className="text-xs text-[#5C6E66] leading-relaxed">
                Nearby neighbors, gardeners, compost yards, or recyclers discover your listing and send an exchange request.
              </p>
            </div>
            <div className="pt-2.5 mt-3 border-t border-[#E8E4DA] text-[11px] text-[#7B8B83]">
              Local discovery
            </div>
          </div>

          <div className="flex flex-col justify-between bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all p-4">
            <div>
              <div className="w-8 h-8 rounded-md bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9] flex items-center justify-center font-mono font-medium text-xs mb-2.5">
                3
              </div>
              <h3 className="font-sans font-medium text-sm text-[#1C2826] mb-1">
                Chat on WhatsApp
              </h3>
              <p className="text-xs text-[#5C6E66] leading-relaxed">
                Accept a request and click directly into WhatsApp to agree on a convenient pickup time and location.
              </p>
            </div>
            <div className="pt-2.5 mt-3 border-t border-[#E8E4DA] text-[11px] text-[#7B8B83]">
              Direct communication
            </div>
          </div>

          <div className="flex flex-col justify-between bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all p-4">
            <div>
              <div className="w-8 h-8 rounded-md bg-[#E8EFE9] text-[#103D2A] border border-[#C8D6C9] flex items-center justify-center font-mono font-medium text-xs mb-2.5">
                4
              </div>
              <h3 className="font-sans font-medium text-sm text-[#1C2826] mb-1">
                Confirm &amp; earn points
              </h3>
              <p className="text-xs text-[#5C6E66] leading-relaxed">
                Hand over the materials, confirm the secure pickup code, and automatically earn EcoPoints.
              </p>
            </div>
            <div className="pt-2.5 mt-3 border-t border-[#E8E4DA] text-[11px] text-[#7B8B83]">
              Earn EcoPoints
            </div>
          </div>

        </div>
      </section>

      {/* 4. ACTIVE MATERIALS READY FOR CIRCULATION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-3">
          <div className="space-y-1">
            <span className="text-xs text-gl-charcoal-muted uppercase tracking-wider block font-bold">
              Recent Listings
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-gl-charcoal tracking-tight">
              Materials ready for pickup
            </h2>
          </div>
          <Link to="/marketplace">
            <Button variant="secondary" size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right" className="rounded-xl">
              View All ({availableListings.length})
            </Button>
          </Link>
        </div>

        {previewListings.length === 0 ? (
          <div className="p-8 border border-dashed border-gl-border rounded-2xl bg-white text-center max-w-lg mx-auto shadow-2xs">
            <p className="text-gl-charcoal-muted text-sm mb-3">
              Be the first in your area to list reusable materials or recyclables!
            </p>
            <Link to="/marketplace/new">
              <Button variant="primary" size="sm" className="rounded-xl shadow-sm">
                Add Listing
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

      {/* 5. WHO USES GREENLOOP */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-white p-6 sm:p-10 rounded-2xl border border-gl-border shadow-card">
          <div className="text-left mb-8 space-y-1">
            <span className="text-xs text-gl-charcoal-muted uppercase tracking-wider block font-bold">
              Community
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-gl-charcoal tracking-tight">
              Who uses GreenLoop
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-gl-cream/40 p-5 rounded-2xl border border-gl-border">
              <div className="p-2.5 rounded-xl bg-gl-sage-light text-gl-forest border border-gl-sage w-fit mb-3">
                <Home className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-gl-charcoal mb-1">
                Households &amp; Individuals
              </h3>
              <p className="text-xs text-gl-charcoal-muted leading-relaxed">
                Give away or sell cartons, bottles, coconut shells, and recyclables. Earn points and reduce landfill waste.
              </p>
            </div>

            <div className="bg-gl-cream/40 p-5 rounded-2xl border border-gl-border">
              <div className="p-2.5 rounded-xl bg-gl-sage-light text-gl-forest border border-gl-sage w-fit mb-3">
                <Building2 className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-gl-charcoal mb-1">
                Businesses &amp; Restaurants
              </h3>
              <p className="text-xs text-gl-charcoal-muted leading-relaxed">
                Redirect clean packaging, food waste, and excess materials directly to local reuse channels.
              </p>
            </div>

            <div className="bg-gl-cream/40 p-5 rounded-2xl border border-gl-border">
              <div className="p-2.5 rounded-xl bg-gl-sage-light text-gl-forest border border-gl-sage w-fit mb-3">
                <Sprout className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-gl-charcoal mb-1">
                Gardeners &amp; Farmers
              </h3>
              <p className="text-xs text-gl-charcoal-muted leading-relaxed">
                Source organic materials, compost feedstocks, dry leaves, and containers for free or low cost nearby.
              </p>
            </div>

            <div className="bg-gl-cream/40 p-5 rounded-2xl border border-gl-border">
              <div className="p-2.5 rounded-xl bg-gl-sage-light text-gl-forest border border-gl-sage w-fit mb-3">
                <Recycle className="w-5 h-5" />
              </div>
              <h3 className="font-heading font-bold text-base text-gl-charcoal mb-1">
                Recyclers &amp; Collection Hubs
              </h3>
              <p className="text-xs text-gl-charcoal-muted leading-relaxed">
                Find segregated batches of clean plastics, metals, paper, and e-waste directly in your neighborhood.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 6. BOTTOM CALL TO ACTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="bg-gl-forest text-white rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-xl border border-gl-dark">
          <div className="relative z-10 max-w-xl space-y-4 text-left">
            <span className="px-3 py-1 rounded-full bg-gl-sage-light text-gl-dark border border-gl-sage text-xs font-bold tracking-wide uppercase">
              Get Started
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
              Have items you don't need?
            </h2>
            <p className="text-sm sm:text-base text-gl-sage-light/90 leading-relaxed">
              Whether you have leftover boxes, garden scrap, or scrap metal, someone in your community can use it.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link to="/marketplace/new">
                <Button size="lg" className="bg-white text-gl-forest hover:bg-gl-cream border-none font-bold rounded-xl shadow-md">
                  Add a Listing
                </Button>
              </Link>
              <Link to="/scanner">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 rounded-xl">
                  Identify Waste
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
