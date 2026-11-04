import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowRight, 
  PackagePlus, 
  Users, 
  RefreshCw, 
  MapPin, 
  Check, 
  Camera, 
  Building2, 
  Home, 
  Sprout, 
  Recycle,
  ShieldCheck
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { ListingCard } from '../../components/marketplace/ListingCard';

export const LandingPage: React.FC = () => {
  const { listings, metrics } = useData();

  // Featured 5 representative materials requested:
  // Coconut husk, Used cardboard, Plastic bottles, Vegetable waste, Used books
  const previewListings = listings.filter((l) => {
    const title = l.title.toLowerCase();
    return (
      title.includes('vegetable') ||
      title.includes('coconut') ||
      title.includes('carton') ||
      title.includes('cardboard') ||
      title.includes('plastic') ||
      title.includes('pouch') ||
      title.includes('book')
    );
  }).slice(0, 5);

  return (
    <div className="space-y-20 pb-16">
      
      {/* 1. HERO SECTION */}
      <section className="pt-10 sm:pt-14 pb-8 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Heading & Value Proposition */}
          <div className="lg:col-span-6 space-y-5 text-left">
            <span className="inline-block text-[11px] uppercase tracking-wider font-semibold text-forest bg-olive/50 px-2.5 py-1 rounded">
              Kerala Circular Resource Exchange
            </span>

            <h1 className="font-heading font-bold text-3xl sm:text-4xl lg:text-5xl text-forest tracking-tight leading-[1.18]">
              Give waste a second life.
            </h1>

            <p className="text-base text-charcoal leading-relaxed max-w-lg">
              Connect with people who can reuse, recycle, or transform materials you no longer need.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                to="/marketplace"
                className="bg-forest hover:bg-forest-dark text-white text-xs font-semibold px-5 py-3 rounded-md transition-colors"
              >
                Explore Materials
              </Link>

              <Link
                to="/marketplace/new"
                className="bg-white hover:bg-cream text-charcoal border border-[#D5D5CA] text-xs font-semibold px-5 py-3 rounded-md transition-colors"
              >
                List Your Waste
              </Link>
            </div>

            <p className="text-[11px] text-charcoal-muted pt-2">
              Free to use • Connecting households, restaurants, farmers, and recycling centres.
            </p>
          </div>

          {/* Right Column: Realistic Photograph */}
          <div className="lg:col-span-6">
            <div className="relative rounded-lg overflow-hidden border border-[#E2E2D8] bg-[#EFEFE6]">
              <img
                src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80"
                alt="Community member tending to compost and fresh organic soil in Kerala"
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="p-3 bg-white border-t border-[#E8E8DE] flex items-center justify-between text-xs text-charcoal-muted">
                <span className="font-medium text-charcoal">Organic material diversion</span>
                <span>Perinthalmanna, Malappuram</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="bg-white border-y border-[#E8E8DE] py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="max-w-xl">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-forest">
              How GreenLoop works
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1 leading-relaxed">
              Three simple steps to connect available materials with people who have a practical use for them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-cream border border-[#E2E2D8] flex items-center justify-center text-forest">
                <PackagePlus className="w-5 h-5 stroke-[1.75]" />
              </div>
              <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                Step 1
              </span>
              <h3 className="font-heading font-bold text-base text-charcoal">
                List materials you no longer need.
              </h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Describe the item, quantity, and your location. Add a photo or use our camera scanner for guidance.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-cream border border-[#E2E2D8] flex items-center justify-center text-forest">
                <Users className="w-5 h-5 stroke-[1.75]" />
              </div>
              <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                Step 2
              </span>
              <h3 className="font-heading font-bold text-base text-charcoal">
                Connect with someone who can use them.
              </h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Nearby farmers, recyclers, or residents review your listing and request collection.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-md bg-cream border border-[#E2E2D8] flex items-center justify-center text-forest">
                <RefreshCw className="w-5 h-5 stroke-[1.75]" />
              </div>
              <span className="text-[11px] font-semibold text-charcoal-muted uppercase tracking-wider block">
                Step 3
              </span>
              <h3 className="font-heading font-bold text-base text-charcoal">
                Give those materials a new purpose.
              </h3>
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Verify collection with a quick code. Waste stays out of landfills and becomes compost, paper pulp, or secondary resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. EXPLORE MATERIALS (PRACTICAL MARKETPLACE PREVIEW) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-forest">
              Explore available materials
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
              Current listings from households, restaurants, and local centres.
            </p>
          </div>
          <Link
            to="/marketplace"
            className="text-xs font-semibold text-forest hover:text-forest-dark inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View all marketplace listings ({listings.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {previewListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* 4. AI MATERIAL SCANNER (SIMPLE & REALISTIC) */}
      <section className="bg-white border-y border-[#E8E8DE] py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-4">
              <span className="text-[11px] font-semibold text-forest bg-olive/50 px-2 py-0.5 rounded">
                Camera Assistant
              </span>
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-forest">
                Not sure how to categorise your waste?
              </h2>
              <p className="text-xs sm:text-sm text-charcoal leading-relaxed">
                Take a photo and let GreenLoop help identify it. Our tool suggests the appropriate material category, practical reuse options, and local safety considerations.
              </p>

              <div className="space-y-2 text-xs text-charcoal-muted pt-1">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-forest shrink-0" />
                  <span>Identifies organic biomass, paper, plastics, and e-waste</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-forest shrink-0" />
                  <span>Suggests whether composting, recycling, or repair fits best</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-forest shrink-0" />
                  <span>Fills in listing details automatically to save time</span>
                </div>
              </div>

              <div className="pt-3">
                <Link
                  to="/scanner"
                  className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-xs font-semibold px-4 py-2.5 rounded-md transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  <span>Try the Material Scanner</span>
                </Link>
              </div>
            </div>

            {/* Realistic Scanner Interface Preview (No futuristic AI neon graphics) */}
            <div className="lg:col-span-6">
              <div className="bg-cream rounded-lg border border-[#E2E2D8] p-5 space-y-4">
                <div className="flex items-center justify-between text-xs pb-3 border-b border-[#E8E8DE]">
                  <span className="font-medium text-charcoal">Scanner preview</span>
                  <span className="text-charcoal-muted">Sample result</span>
                </div>

                <div className="flex gap-4 items-start">
                  <img
                    src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80"
                    alt="Vegetable peels sample"
                    className="w-24 h-24 rounded-md object-cover border border-[#D5D5CA] shrink-0"
                  />
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-semibold text-forest bg-white border border-[#D5D5CA] px-1.5 py-0.5 rounded">
                      Organic Waste
                    </span>
                    <h4 className="font-heading font-bold text-sm text-charcoal">
                      Kitchen vegetable trimmings
                    </h4>
                    <p className="text-[11px] text-charcoal-muted leading-relaxed">
                      High-nitrogen organic discards. Suitable for farm vermicomposting or local bio-gas feed.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-md border border-[#E2E2D8] text-[11px] space-y-1">
                  <span className="font-semibold text-charcoal block">Recommended Action:</span>
                  <p className="text-charcoal-muted">
                    Transfer in ventilated bins within 48 hours to nearby community garden or farmer.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. ENVIRONMENTAL IMPACT (MEANINGFUL, CLEAN METRICS) */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        <div className="max-w-xl">
          <h2 className="font-heading font-bold text-xl sm:text-2xl text-forest">
            Environmental impact
          </h2>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-1 leading-relaxed">
            Transparent metrics tracking materials diverted from disposal into local reuse loops.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-lg border border-[#E2E2D8] space-y-1">
            <span className="text-xs text-charcoal-muted font-medium block">Materials exchanged</span>
            <div className="font-heading font-bold text-2xl sm:text-3xl text-forest">
              {metrics.total_waste_diverted_kg} <span className="text-sm font-normal text-charcoal-muted">kg</span>
            </div>
            <p className="text-[11px] text-charcoal-muted pt-1">
              Diverted across 8 material categories.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-[#E2E2D8] space-y-1">
            <span className="text-xs text-charcoal-muted font-medium block">Successful exchanges</span>
            <div className="font-heading font-bold text-2xl sm:text-3xl text-forest">
              {metrics.total_completed_exchanges} <span className="text-sm font-normal text-charcoal-muted">completed</span>
            </div>
            <p className="text-[11px] text-charcoal-muted pt-1">
              Verified through pickup confirmation codes.
            </p>
          </div>

          <div className="bg-white p-5 rounded-lg border border-[#E2E2D8] space-y-1">
            <span className="text-xs text-charcoal-muted font-medium block">People participating</span>
            <div className="font-heading font-bold text-2xl sm:text-3xl text-forest">
              6 <span className="text-sm font-normal text-charcoal-muted">pilot groups</span>
            </div>
            <p className="text-[11px] text-charcoal-muted pt-1">
              Households, restaurants, farms, and collection centres.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-charcoal-muted pt-1">
          <span>* Design preview calculated from verified platform transaction logs.</span>
          <Link to="/impact" className="text-forest font-medium hover:underline">
            View detailed methodology & factors →
          </Link>
        </div>
      </section>

      {/* 6. COMMUNITY SECTION (WHO PARTICIPATES) */}
      <section className="bg-white border-y border-[#E8E8DE] py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="max-w-xl">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-forest">
              Built for everyday community participation
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-muted mt-1 leading-relaxed">
              Every group plays a specific, practical role in keeping useful materials circulating.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
            {/* Households */}
            <div className="space-y-2 p-4 rounded-lg bg-cream border border-[#E2E2D8]">
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-forest border border-[#E2E2D8]">
                <Home className="w-4 h-4" />
              </div>
              <h3 className="font-heading font-bold text-sm text-charcoal">Households</h3>
              <p className="text-charcoal-muted leading-relaxed">
                List cardboard cartons, clean glass jars, sorted plastics, and used books for neighborhood collection.
              </p>
            </div>

            {/* Businesses & Restaurants */}
            <div className="space-y-2 p-4 rounded-lg bg-cream border border-[#E2E2D8]">
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-forest border border-[#E2E2D8]">
                <Building2 className="w-4 h-4" />
              </div>
              <h3 className="font-heading font-bold text-sm text-charcoal">Businesses & Kitchens</h3>
              <p className="text-charcoal-muted leading-relaxed">
                Redirect bulk vegetable prep trimmings, coffee grounds, and shipping pallets directly to farms.
              </p>
            </div>

            {/* Farmers & Gardeners */}
            <div className="space-y-2 p-4 rounded-lg bg-cream border border-[#E2E2D8]">
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-forest border border-[#E2E2D8]">
                <Sprout className="w-4 h-4" />
              </div>
              <h3 className="font-heading font-bold text-sm text-charcoal">Farmers & Gardeners</h3>
              <p className="text-charcoal-muted leading-relaxed">
                Discover organic biomass, coconut husks for mulch, and compostable feed without transport delays.
              </p>
            </div>

            {/* Recyclers & Haritha Karma Sena */}
            <div className="space-y-2 p-4 rounded-lg bg-cream border border-[#E2E2D8]">
              <div className="w-8 h-8 rounded bg-white flex items-center justify-center text-forest border border-[#E2E2D8]">
                <Recycle className="w-4 h-4" />
              </div>
              <h3 className="font-heading font-bold text-sm text-charcoal">Recyclers & Facilities</h3>
              <p className="text-charcoal-muted leading-relaxed">
                Publish intake schedules for plastics, metals, and e-waste, coordinating collection with MCFs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CTA */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4 pt-6">
        <h2 className="font-heading font-bold text-2xl sm:text-3xl text-forest">
          Small actions. A more circular future.
        </h2>
        <p className="text-xs sm:text-sm text-charcoal max-w-md mx-auto leading-relaxed">
          Join households, local farmers, and recycling networks across Kerala. Give unused materials a purposeful second life.
        </p>
        <div className="pt-2">
          <Link
            to="/register"
            className="inline-block bg-forest hover:bg-forest-dark text-white text-xs font-semibold px-6 py-3 rounded-md transition-colors"
          >
            Join GreenLoop
          </Link>
        </div>
      </section>

    </div>
  );
};
