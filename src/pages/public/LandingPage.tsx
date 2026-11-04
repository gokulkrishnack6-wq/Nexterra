import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ScanLine, 
  Store, 
  Sparkles, 
  ArrowRight, 
  Leaf, 
  Recycle, 
  Award, 
  TrendingUp, 
  ShieldCheck, 
  Users, 
  CheckCircle2, 
  Compass, 
  ChevronRight,
  Flame,
  Globe2
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { ImpactCharts } from '../../components/charts/ImpactCharts';

export const LandingPage: React.FC = () => {
  const { listings, metrics, categories, challenges } = useData();
  const { currentUser } = useAuth();

  const featuredListings = listings.slice(0, 3);
  const activeChallenges = challenges.slice(0, 2);

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sage-light/50 via-offwhite to-white pt-12 pb-20 border-b border-sage/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-emerald-900/10 border border-forest/20 text-forest-dark px-3 py-1.5 rounded-full text-xs font-semibold">
                <Leaf className="w-3.5 h-3.5 text-forest" />
                <span>TERRACODE 2026 • FOSS Club MEA Engineering College</span>
              </div>

              <h1 className="font-heading font-extrabold text-4xl sm:text-5xl lg:text-6xl text-forest-dark tracking-tight leading-[1.12]">
                Waste Has a <span className="text-forest underline decoration-lime decoration-4 underline-offset-8">Second Life</span>.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed">
                Kerala's AI-powered circular exchange platform. Connect households, restaurants, organic farmers, 
                and certified recyclers to repurpose organic biomass, paper, e-waste, and polymers.
              </p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  to="/scanner"
                  className="flex items-center gap-2 bg-forest hover:bg-forest-dark text-white font-semibold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-elevated transition-all group"
                >
                  <ScanLine className="w-4 h-4 text-lime" />
                  <span>Scan Waste with AI</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/marketplace"
                  className="flex items-center gap-2 bg-white hover:bg-offwhite text-forest-dark border border-sage font-semibold text-sm px-5 py-3 rounded-xl shadow-sm transition-all"
                >
                  <Store className="w-4 h-4 text-forest" />
                  <span>Explore Marketplace</span>
                </Link>

                <Link
                  to="/map"
                  className="flex items-center gap-2 bg-sage-light hover:bg-sage/50 text-forest-dark font-medium text-sm px-4 py-3 rounded-xl transition-all"
                >
                  <Compass className="w-4 h-4 text-forest" />
                  <span>Circular Map</span>
                </Link>
              </div>

              {/* Metric Quick Strip */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-sage/40 max-w-lg mx-auto lg:mx-0">
                <div>
                  <p className="font-heading font-black text-2xl text-forest-dark">
                    {metrics.total_waste_diverted_kg} <span className="text-sm font-bold text-forest">kg</span>
                  </p>
                  <p className="text-xs text-slate-500 font-medium">Waste Diverted</p>
                </div>
                <div>
                  <p className="font-heading font-black text-2xl text-forest">
                    {metrics.total_co2e_avoided_kg} <span className="text-sm font-bold text-lime-600">kg</span>
                  </p>
                  <p className="text-xs text-slate-500 font-medium">CO₂e Avoided</p>
                </div>
                <div>
                  <p className="font-heading font-black text-2xl text-forest-dark">
                    {metrics.total_ecopoints_circulated}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">EcoPoints Earned</p>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Circular Flow Preview */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-3xl p-6 border border-sage/50 shadow-elevated relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="text-xs font-bold text-forest uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-lime" /> Live Circular Workflow
                  </span>
                  <span className="text-[10px] bg-lime/30 text-forest-dark font-bold px-2 py-0.5 rounded-full">
                    Active Demo
                  </span>
                </div>

                {/* Workflow Steps Preview */}
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-offwhite rounded-xl border border-sage/30">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-forest flex items-center justify-center font-bold text-xs shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-forest-dark">Restaurant Lists Surplus</h4>
                      <p className="text-[11px] text-slate-500">Malabar Kitchen posts 25kg pre-consumer organic vegetable peels.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-offwhite rounded-xl border border-sage/30">
                    <div className="w-8 h-8 rounded-lg bg-lime/40 text-forest-dark flex items-center justify-center font-bold text-xs shrink-0">
                      2
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-forest-dark flex items-center gap-1">
                        <span>AI Suggests Composting</span>
                        <span className="text-[9px] bg-forest text-lime font-bold px-1 rounded">96% Fit</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">Gemini vision classifies high nitrogen biomass optimal for soil enrichment.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-offwhite rounded-xl border border-sage/30">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-forest flex items-center justify-center font-bold text-xs shrink-0">
                      3
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-forest-dark">Nearby Farmer Requests</h4>
                      <p className="text-[11px] text-slate-500">Veda Organics (Ottapalam) coordinates pickup via secure 6-digit code.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-forest text-white rounded-xl shadow-sm">
                    <div className="w-8 h-8 rounded-lg bg-lime text-forest-dark flex items-center justify-center font-bold text-xs shrink-0">
                      ✓
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-lime">Handover Verified & Points Awarded</h4>
                      <p className="text-[11px] text-sage-light">45.0 kg CO₂e saved from landfill. EcoPoints credited to both accounts.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <Link
                    to="/scanner"
                    className="text-xs font-bold text-forest hover:text-forest-dark inline-flex items-center gap-1"
                  >
                    <span>Try the AI Scanner on Your Discards</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Featured Waste Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-forest mb-1">
              Kerala Circular Resource Streams
            </div>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-forest-dark">
              Accepted Material Categories
            </h2>
          </div>
          <Link
            to="/marketplace"
            className="text-xs font-bold text-forest hover:underline inline-flex items-center gap-1"
          >
            <span>Browse All Available Batches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/marketplace?category=${cat.slug}`}
              className="bg-white p-4 rounded-2xl border border-sage/40 hover:border-forest hover:shadow-soft transition-all duration-200 group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-sage-light text-forest group-hover:bg-forest group-hover:text-lime flex items-center justify-center mb-3 transition-colors">
                  <Recycle className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-sm text-forest-dark group-hover:text-forest transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Recyclability</span>
                <span className="font-bold text-forest">{cat.recyclability_score}%</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Active Marketplace Listings */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-forest">
              Live Exchange Opportunities
            </span>
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-forest-dark">
              Recent Waste Listings Near You
            </h2>
          </div>
          <Link
            to="/marketplace"
            className="hidden sm:inline-flex items-center gap-1 bg-white border border-sage/50 text-forest-dark hover:bg-offwhite text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
          >
            <span>View All ({listings.length})</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* Environmental Impact Analytics Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-forest">
            Verified Environmental Telemetry
          </span>
          <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-forest-dark">
            Real-Time Diversion Impact
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Calculated with documented conversion factors from KSPCB, IPCC Waste Model, and Suchitwa Mission.
          </p>
        </div>

        <ImpactCharts metrics={metrics} />
      </section>

      {/* Community Drives & Challenges */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-forest rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-elevated">
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 bg-lime text-forest-dark text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4">
              <Flame className="w-3.5 h-3.5" /> Community Sustainability Drives
            </div>
            <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight leading-tight">
              Join Kerala's Collective Circular Challenges
            </h2>
            <p className="text-xs sm:text-sm text-sage-light mt-2 leading-relaxed">
              Divert materials together with schools, college campuses, and local clubs. 
              Earn collective badges and high-tier EcoPoints rewards.
            </p>

            <div className="mt-6 flex flex-wrap gap-4">
              <Link
                to="/community"
                className="bg-lime hover:bg-lime-hover text-forest-dark font-bold text-xs px-5 py-3 rounded-xl transition-all shadow-md"
              >
                Explore Active Challenges
              </Link>
              <Link
                to="/dashboard/impact"
                className="bg-forest-dark/80 hover:bg-forest-dark border border-sage/40 text-white font-semibold text-xs px-5 py-3 rounded-xl transition-all"
              >
                View Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

