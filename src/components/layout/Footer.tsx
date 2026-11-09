import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gl-forest text-gl-sage-light border-t border-gl-border pt-12 pb-8 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-xs sm:text-sm">
          
          {/* Identity */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <img src="/logo.png" alt="GreenLoop" className="w-6 h-6 object-contain" />
              </div>
              <span className="font-heading font-extrabold text-lg text-white tracking-tight">
                GREENLOOP
              </span>
            </div>
            <p className="text-gl-sage-light/80 leading-relaxed text-xs">
              A Kerala-focused circular resource network connecting people who have reusable or organic materials with those who can put them to productive use.
            </p>
            <p className="text-[11px] text-gl-lime font-bold uppercase tracking-wider">
              Waste Has a Second Life.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-xs mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-gl-sage-light/80">
              <li>
                <Link to="/marketplace" className="hover:text-white transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/bins" className="hover:text-white transition-colors">
                  Collection Bins
                </Link>
              </li>
              <li>
                <Link to="/report-issue" className="hover:text-white transition-colors">
                  Report an Issue
                </Link>
              </li>
              <li>
                <Link to="/scanner" className="hover:text-white transition-colors">
                  Waste Scanner
                </Link>
              </li>
              <li>
                <Link to="/smart-match" className="hover:text-white transition-colors">
                  Smart Match
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-white transition-colors">
                  Recycling Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div>
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-xs mb-3">
              Community
            </h4>
            <ul className="space-y-2 text-xs text-gl-sage-light/80">
              <li>Households &amp; Residents</li>
              <li>Restaurants &amp; Cafes</li>
              <li>Gardeners &amp; Farmers</li>
              <li>Haritha Karma Sena &amp; Ward MCFs</li>
              <li>Recycling Centres</li>
            </ul>
          </div>

          {/* Competition & Open Source */}
          <div className="space-y-2">
            <h4 className="font-heading font-bold text-white uppercase tracking-wider text-xs mb-3">
              Terracode 2026
            </h4>
            <p className="text-xs text-gl-sage-light/80 leading-relaxed">
              Engineered for <strong className="text-white">TERRACODE 2026</strong>, organized by the FOSS Club at MEA Engineering College, Perinthalmanna, Kerala.
            </p>
            <p className="text-[11px] text-gl-lime font-bold">
              Decentralized Circular Action • Open Source
            </p>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gl-sage-light/60">
          <p>© 2026 GreenLoop. Waste Has a Second Life.</p>
          <div className="flex items-center gap-4">
            <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link to="/impact" className="hover:text-white transition-colors">Impact</Link>
            <Link to="/community" className="hover:text-white transition-colors">Community</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
