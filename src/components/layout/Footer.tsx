import React from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#183B2A] text-[#DCE5D4] border-t border-[#234B35] pt-12 pb-8 mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-xs">
          
          {/* Identity */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#234B35] flex items-center justify-center text-white">
                <Leaf className="w-3.5 h-3.5" />
              </div>
              <span className="font-heading font-bold text-base text-white tracking-tight">
                GreenLoop
              </span>
            </div>
            <p className="text-[#A8B89F] leading-relaxed">
              A Kerala-focused circular resource network connecting people who have reusable or organic materials with those who can put them to good use.
            </p>
            <p className="text-[11px] text-[#A8B89F]">
              Waste Has a Second Life.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-heading font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-[#A8B89F]">
              <li>
                <Link to="/marketplace" className="hover:text-white transition-colors">
                  Explore Materials
                </Link>
              </li>
              <li>
                <Link to="/scanner" className="hover:text-white transition-colors">
                  AI Material Scanner
                </Link>
              </li>
              <li>
                <Link to="/smart-match" className="hover:text-white transition-colors">
                  Smart Proximity Match
                </Link>
              </li>
              <li>
                <Link to="/map" className="hover:text-white transition-colors">
                  Recovery Facilities Map
                </Link>
              </li>
              <li>
                <Link to="/impact" className="hover:text-white transition-colors">
                  Environmental Metrics
                </Link>
              </li>
            </ul>
          </div>

          {/* Ecosystem */}
          <div>
            <h4 className="font-heading font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              Participants
            </h4>
            <ul className="space-y-2 text-[#A8B89F]">
              <li>Households & Apartment complexes</li>
              <li>Restaurants & Kitchens</li>
              <li>Organic Farmers & Nurseries</li>
              <li>Haritha Karma Sena & MCFs</li>
              <li>Clean Kerala Company facilities</li>
            </ul>
          </div>

          {/* Competition & Open Source */}
          <div className="space-y-2">
            <h4 className="font-heading font-semibold text-white uppercase tracking-wider text-[11px] mb-3">
              Context
            </h4>
            <p className="text-[#A8B89F] leading-relaxed">
              Built for <strong className="text-white">TERRACODE 2026</strong>, organized by the FOSS Club at MEA Engineering College, Perinthalmanna, Kerala.
            </p>
            <p className="text-[11px] text-[#A8B89F]">
              Open-source software published under the MIT License.
            </p>
          </div>
        </div>

        {/* Bottom divider */}
        <div className="border-t border-[#234B35] pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#A8B89F]">
          <p>© 2026 GreenLoop. Kerala Circular Waste Exchange.</p>
          <div className="flex items-center gap-4">
            <Link to="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link to="/impact" className="hover:text-white transition-colors">Impact Telemetry</Link>
            <Link to="/community" className="hover:text-white transition-colors">Community</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
