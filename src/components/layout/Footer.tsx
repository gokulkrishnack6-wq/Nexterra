import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-primary text-secondary-container border-t border-primary-container pt-12 pb-8 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-body-sm">
          
          {/* Identity */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-container flex items-center justify-center text-on-primary">
                <img src="/logo.png" alt="GreenLoop" className="w-5 h-5 object-contain" />
              </div>
              <span className="font-heading font-bold text-lg text-on-primary tracking-tight">
                GREENLOOP
              </span>
            </div>
            <p className="text-secondary-fixed-dim leading-relaxed">
              A Kerala-focused circular resource network connecting people who have reusable or organic materials with those who can put them to productive use.
            </p>
            <p className="font-label-sm text-label-sm text-secondary-fixed uppercase tracking-wider">
              Waste Has a Second Life.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-heading font-semibold text-on-primary uppercase tracking-wider text-label-sm mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-secondary-fixed-dim">
              <li>
                <Link to="/marketplace" className="hover:text-on-primary transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link to="/bins" className="hover:text-on-primary transition-colors">
                  Collection Bins
                </Link>
              </li>
              <li>
                <Link to="/report-issue" className="hover:text-on-primary transition-colors">
                  Report an Issue
                </Link>
              </li>
              <li>
                <Link to="/scanner" className="hover:text-on-primary transition-colors">
                  Waste Scanner
                </Link>
              </li>
              <li>
                <Link to="/smart-match" className="hover:text-on-primary transition-colors">
                  Smart Match
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-on-primary transition-colors">
                  Recycling Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div>
            <h4 className="font-heading font-semibold text-on-primary uppercase tracking-wider text-label-sm mb-3">
              Community
            </h4>
            <ul className="space-y-2 text-secondary-fixed-dim">
              <li>Households & Residents</li>
              <li>Restaurants & Cafes</li>
              <li>Gardeners & Farmers</li>
              <li>Haritha Karma Sena & Ward MCFs</li>
              <li>Recycling Centres</li>
            </ul>
          </div>

          {/* Competition & Open Source */}
          <div className="space-y-2">
            <h4 className="font-heading font-semibold text-on-primary uppercase tracking-wider text-label-sm mb-3">
              Terracode 2026
            </h4>
            <p className="text-secondary-fixed-dim leading-relaxed">
              Engineered for <strong className="text-on-primary">TERRACODE 2026</strong>, organized by the FOSS Club at MEA Engineering College, Perinthalmanna, Kerala.
            </p>
            <p className="font-label-sm text-label-sm text-secondary-fixed">
              Decentralized Circular Action • Open Source
            </p>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="border-t border-primary-container/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-body-sm text-secondary-fixed-dim">
          <p>© 2026 GreenLoop. Waste Has a Second Life.</p>
          <div className="flex items-center gap-4 text-label-sm">
            <Link to="/marketplace" className="hover:text-on-primary transition-colors">Marketplace</Link>
            <Link to="/impact" className="hover:text-on-primary transition-colors">Impact</Link>
            <Link to="/community" className="hover:text-on-primary transition-colors">Community</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
