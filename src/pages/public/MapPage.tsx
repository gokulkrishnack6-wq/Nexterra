import React, { useState } from 'react';
import { 
  MapPin, 
  Phone, 
  Clock, 
  ShieldCheck, 
  Recycle, 
  Search, 
  Filter, 
  ExternalLink 
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { KeralaCircularMap } from '../../components/maps/KeralaCircularMap';
import { KERALA_DISTRICTS } from '../../lib/mockData';

export const MapPage: React.FC = () => {
  const { recyclingCentres, listings } = useData();
  const [selectedDistrict, setSelectedDistrict] = useState('All Kerala');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCentres = recyclingCentres.filter((c) => {
    if (selectedDistrict !== 'All Kerala' && c.district !== selectedDistrict) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.locality.toLowerCase().includes(q) ||
        c.accepted_categories.some((cat) => cat.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-lime/30 text-forest-dark border border-lime/40 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <MapPin className="w-3.5 h-3.5 text-forest" /> Geospatial Infrastructure
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-forest-dark">
            Kerala Circular Recovery Map
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Find Haritha Karma Sena RRF facilities, Clean Kerala Company hubs, and active community waste listings.
          </p>
        </div>

        {/* Quick Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="py-2 px-3 bg-white border border-sage/60 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-forest text-slate-800 shadow-sm"
          >
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d === 'All Kerala' ? '📍 All Kerala' : `📍 ${d}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Map Component */}
      <KeralaCircularMap centres={filteredCentres} listings={listings} />

      {/* Directory of Verified Facilities */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-extrabold text-xl text-forest-dark">
            Verified Collection & Recovery Facilities ({filteredCentres.length})
          </h2>
          <span className="text-xs text-slate-400">
            Approved by Suchitwa Mission & Municipal Corporations
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCentres.map((centre) => (
            <div
              key={centre.id}
              className="bg-white p-5 rounded-2xl border border-sage/40 shadow-soft hover:shadow-elevated transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="bg-sage-light text-forest text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {centre.operator_type.replace(/_/g, ' ')}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                    <span>★</span>
                    <span>{centre.rating}</span>
                  </div>
                </div>

                <h3 className="font-heading font-bold text-base text-forest-dark leading-snug">
                  {centre.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-forest shrink-0 mt-0.5" />
                  <span>{centre.address}</span>
                </p>
              </div>

              <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-3.5 h-3.5 text-forest" />
                  <a href={`tel:${centre.phone}`} className="hover:underline font-medium">
                    {centre.phone}
                  </a>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-forest" />
                  <span>{centre.operating_hours}</span>
                </div>

                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">
                    Accepted Streams:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {centre.accepted_categories.map((cat, i) => (
                      <span
                        key={i}
                        className="bg-offwhite border border-slate-200 text-slate-700 text-[10px] font-medium px-2 py-0.5 rounded-md"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
