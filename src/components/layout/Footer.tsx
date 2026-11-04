import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Heart, Shield, Award, ExternalLink, Github } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-forest-dark text-slate-300 border-t border-forest pt-12 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Identity & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-forest flex items-center justify-center text-lime shadow-md">
                <Leaf className="w-5 h-5" />
              </div>
              <span className="font-heading font-extrabold text-xl text-white tracking-tight">
                GREEN<span className="text-lime">LOOP</span>
              </span>
            </div>
            <p className="text-xs text-sage-light/80 leading-relaxed">
              Waste is not the end of a product's life. It is the beginning of another resource. 
              Connecting households, businesses, farmers, and recycling networks across Kerala.
            </p>
            <div className="flex items-center gap-2 text-xs text-lime">
              <Award className="w-4 h-4" />
              <span className="font-semibold">TERRACODE 2026</span>
              <span className="text-sage-light/60">• FOSS Club MEA</span>
            </div>
          </div>

          {/* Quick Platform Links */}
          <div>
            <h4 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-3">
              Circular Network
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/marketplace" className="hover:text-lime transition-colors">
                  Waste Material Marketplace
                </Link>
              </li>
              <li>
                <Link to="/scanner" className="hover:text-lime transition-colors">
                  AI Waste Classification Scanner
                </Link>
              </li>
              <li>
                <Link to="/smart-match" className="hover:text-lime transition-colors">
                  Smart Proximity Matchmaker
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-lime transition-colors">
                  Recycling Centres & Haritha Karma Map
                </Link>
              </li>
              <li>
                <Link to="/impact" className="hover:text-lime transition-colors">
                  Environmental Impact Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* User Ecosystem */}
          <div>
            <h4 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-3">
              Participant Roles
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-sage-light font-medium">Households:</span> Free recyclable exchange & EcoPoints
              </li>
              <li>
                <span className="text-sage-light font-medium">Restaurants & Kitchens:</span> Organic food waste diversion
              </li>
              <li>
                <span className="text-sage-light font-medium">Farmers & Gardeners:</span> Biomass, coconut husk & compost
              </li>
              <li>
                <span className="text-sage-light font-medium">Recyclers & MCF:</span> Baled polymers, e-waste & scrap
              </li>
              <li>
                <span className="text-sage-light font-medium">NGOs & Drives:</span> Community cleanups & challenges
              </li>
            </ul>
          </div>

          {/* Competition & Open Source */}
          <div className="space-y-3">
            <h4 className="text-sm font-heading font-bold text-white uppercase tracking-wider mb-3">
              TERRACODE 2026
            </h4>
            <p className="text-xs text-sage-light/80 leading-relaxed">
              Organised by FOSS Club, MEA Engineering College, Perinthalmanna, Malappuram, Kerala.
            </p>
            <div className="pt-2">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-forest/80 hover:bg-forest text-lime border border-forest px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>Open Source Repository</span>
                <ExternalLink className="w-3 h-3 text-sage" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-forest pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-sage-light/70">
          <p>© 2026 GREENLOOP. Open-source circular economy under MIT License.</p>
          <div className="flex items-center gap-1">
            <span>Built for a Sustainable Kerala with</span>
            <Heart className="w-3.5 h-3.5 text-lime fill-lime mx-1" />
            <span>at MEA Engineering College</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

