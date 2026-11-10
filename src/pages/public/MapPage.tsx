import React, { useState, useEffect } from 'react';
import { Phone, Clock, MapPin, Trash2, ShieldCheck, Recycle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useGeolocation, KERALA_DISTRICT_COORDS } from '../../hooks/useGeolocation';
import { KeralaCircularMap } from '../../components/maps/KeralaCircularMap';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/Skeleton';

export const MapPage: React.FC = () => {
  const { recyclingCentres, listings, allMarketplaceListings, wasteBins } = useData();
  const { district: userDistrict } = useGeolocation();
  const [selectedDistrict, setSelectedDistrict] = useState(userDistrict || 'All Kerala');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (userDistrict) {
      setSelectedDistrict(userDistrict);
    }
  }, [userDistrict]);

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);

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

  const filteredBins = wasteBins.filter((b) => {
    if (selectedDistrict !== 'All Kerala' && b.district !== selectedDistrict) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.locality.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-5 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DA] pb-5">
        <div>
          <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
            Recycling Directory &amp; Bins
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#5C6E66] mt-1">
            Find public waste bins, recycling centres, and collection hubs across Kerala.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full sm:w-auto py-1.5 px-3 bg-white border border-[#DCD6CB] focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 rounded-md text-xs font-medium text-[#1C2826] focus:outline-none transition-all shadow-subtle"
          >
            <option value="All Kerala">All Kerala</option>
            {keralaDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Component with Segregated Layers */}
      <KeralaCircularMap
        centres={filteredCentres}
        listings={allMarketplaceListings || listings}
        wasteBins={filteredBins}
      />

      {/* Public Waste Bins Section */}
      <div className="space-y-3.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-[#103D2A]" />
            <h2 className="font-sans font-medium text-base text-[#1C2826]">
              Public Segregated Waste Bins ({filteredBins.length})
            </h2>
          </div>
        </div>

        {filteredBins.length === 0 ? (
          <EmptyState
            icon={<Trash2 className="w-6 h-6 text-[#7B8B83]" />}
            title="No Public Bins Registered"
            description="No municipal public waste bins have been registered yet for this district. Help add or report locations in your neighborhood."
            actionLabel="Report Overflowing Bin"
            actionLink="/report-issue"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredBins.map((bin) => (
              <div key={bin.id} className="p-4 flex flex-col justify-between space-y-3 bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all text-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11px] font-medium text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md">
                      {bin.bin_type.replace('_', ' ')}
                    </span>
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${
                      bin.fill_percentage > 80 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-[#F0EFE6] text-[#103D2A] border border-[#DCD6CB]'
                    }`}>
                      {bin.fill_percentage}% Full
                    </span>
                  </div>

                  <h3 className="font-sans font-medium text-sm text-[#1C2826]">
                    {bin.name}
                  </h3>

                  <p className="text-xs text-[#5C6E66] flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#103D2A] shrink-0 mt-0.5" />
                    <span>{bin.address}</span>
                  </p>
                </div>

                <div className="pt-2.5 border-t border-[#E8E4DA] text-xs text-[#5C6E66] space-y-0.5">
                  <div>Managed by: <strong className="text-[#1C2826] font-medium">{bin.managed_by}</strong></div>
                  <div>Last Serviced: {bin.last_serviced}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Facility Directory */}
      <div className="space-y-3.5 pt-3">
        <h2 className="font-sans font-medium text-base text-[#1C2826]">
          Recycling &amp; Collection Centres ({filteredCentres.length})
        </h2>

        {filteredCentres.length === 0 ? (
          <EmptyState
            icon={<Recycle className="w-6 h-6 text-[#7B8B83]" />}
            title="No Collection Centres Registered"
            description="No registered recycling centres found for this district yet. Local collection hubs and MCFs will be listed as verified by administrators."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCentres.map((centre) => (
              <div
                key={centre.id}
                className="p-4 flex flex-col justify-between space-y-3 bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md">
                      {centre.operator_type.replace(/_/g, ' ')}
                    </span>
                    {centre.is_verified && (
                      <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Verified
                      </span>
                    )}
                  </div>

                  <h3 className="font-sans font-medium text-sm text-[#1C2826] leading-snug">
                    {centre.name}
                  </h3>

                  <p className="text-xs text-[#5C6E66] flex items-start gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-[#103D2A] shrink-0 mt-0.5" />
                    <span>{centre.address}</span>
                  </p>
                </div>

                <div className="space-y-1.5 border-t border-[#E8E4DA] pt-2.5 text-[#5C6E66]">
                  <p className="flex items-center gap-1.5 text-[#1C2826]">
                    <Phone className="w-3.5 h-3.5 text-[#103D2A]" />
                    <a href={`tel:${centre.phone}`} className="hover:underline font-medium">{centre.phone}</a>
                  </p>
                  <p className="flex items-center gap-1.5 text-[#5C6E66]">
                    <Clock className="w-3.5 h-3.5 text-[#7B8B83]" />
                    <span>{centre.operating_hours}</span>
                  </p>

                  <div className="pt-1.5">
                    <span className="text-xs text-[#1C2826] font-medium block mb-1">
                      Accepted Materials:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {centre.accepted_categories.map((cat, i) => (
                        <span
                          key={i}
                          className="bg-[#F8F6EF] text-[#5C6E66] text-[11px] px-2 py-0.5 rounded-md border border-[#E8E4DA]"
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
        )}
      </div>
    </div>
  );
};
