import React, { useState } from 'react';
import { Phone, Clock, MapPin } from 'lucide-react';
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-forest">
            Facility Directory & Map
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Haritha Karma Sena resource recovery facilities (RRF), municipal collection points, and active listings.
          </p>
        </div>

        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="py-1.5 px-3 bg-white border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest self-start sm:self-auto"
        >
          {KERALA_DISTRICTS.map((d) => (
            <option key={d} value={d}>
              {d === 'All Kerala' ? 'All Kerala Districts' : d}
            </option>
          ))}
        </select>
      </div>

      {/* Map */}
      <KeralaCircularMap centres={filteredCentres} listings={listings} />

      {/* Facility Directory */}
      <div className="space-y-4 pt-2">
        <h2 className="font-heading font-bold text-lg text-charcoal">
          Collection & Recovery Facilities ({filteredCentres.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCentres.map((centre) => (
            <div
              key={centre.id}
              className="bg-white p-4 rounded-lg border border-[#E2E2D8] flex flex-col justify-between space-y-3 text-xs"
            >
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-semibold text-forest bg-cream px-1.5 py-0.5 rounded border border-[#E2E2D8] inline-block">
                  {centre.operator_type.replace(/_/g, ' ')}
                </span>
                <h3 className="font-heading font-semibold text-sm text-charcoal leading-snug">
                  {centre.name}
                </h3>
                <p className="text-[11px] text-charcoal-muted flex items-start gap-1 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-forest shrink-0 mt-0.5" />
                  <span>{centre.address}</span>
                </p>
              </div>

              <div className="space-y-1 text-[11px] border-t border-[#F0F0E6] pt-2.5 text-charcoal-muted">
                <p className="flex items-center gap-1.5 text-charcoal">
                  <Phone className="w-3 h-3 text-forest" />
                  <a href={`tel:${centre.phone}`} className="hover:underline">{centre.phone}</a>
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-forest" />
                  <span>{centre.operating_hours}</span>
                </p>

                <div className="pt-2">
                  <span className="text-[10px] text-charcoal font-medium block mb-1">
                    Accepted Materials:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {centre.accepted_categories.map((cat, i) => (
                      <span
                        key={i}
                        className="bg-cream text-charcoal text-[10px] px-1.5 py-0.5 rounded border border-[#E2E2D8]"
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
