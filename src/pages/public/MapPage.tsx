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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-gl-charcoal tracking-tight">
            Recycling Directory &amp; Bins
          </h1>
          <p className="text-sm text-gl-charcoal-muted mt-1">
            Find public waste bins, recycling centres, and collection hubs across Kerala.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="w-full sm:w-auto py-2.5 px-3.5 bg-white border border-gl-border hover:border-gl-forest/50 focus:border-gl-forest focus:ring-2 focus:ring-gl-forest/20 rounded-xl text-sm font-medium text-gl-charcoal focus:outline-none transition-all shadow-2xs"
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
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-gl-forest" />
            <h2 className="font-heading font-bold text-xl text-gl-charcoal">
              Public Segregated Waste Bins ({filteredBins.length})
            </h2>
          </div>
        </div>

        {filteredBins.length === 0 ? (
          <EmptyState
            icon={<Trash2 className="w-6 h-6 text-gl-charcoal-muted" />}
            title="No Public Bins Registered"
            description="No municipal public waste bins have been registered yet for this district. Help add or report locations in your neighborhood."
            actionLabel="Report Overflowing Bin"
            actionLink="/report-issue"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBins.map((bin) => (
              <Card key={bin.id} variant="elevated" className="p-5 flex flex-col justify-between space-y-3 bg-white border border-gl-border rounded-2xl shadow-card hover:shadow-card-hover transition-all">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-gl-dark bg-gl-sage-light border border-gl-sage px-2.5 py-0.5 rounded-full uppercase">
                      {bin.bin_type.replace('_', ' ')}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      bin.fill_percentage > 80 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-gl-lime text-gl-dark border border-gl-border'
                    }`}>
                      {bin.fill_percentage}% Full
                    </span>
                  </div>

                  <h3 className="font-heading font-bold text-base text-gl-charcoal">
                    {bin.name}
                  </h3>

                  <p className="text-xs text-gl-charcoal-muted flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gl-forest shrink-0 mt-0.5" />
                    <span>{bin.address}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-gl-border text-xs text-gl-charcoal-muted space-y-0.5">
                  <div>Managed by: <strong className="text-gl-charcoal">{bin.managed_by}</strong></div>
                  <div>Last Serviced: {bin.last_serviced}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Facility Directory */}
      <div className="space-y-4 pt-4">
        <h2 className="font-heading font-bold text-xl text-gl-charcoal">
          Recycling &amp; Collection Centres ({filteredCentres.length})
        </h2>

        {filteredCentres.length === 0 ? (
          <EmptyState
            icon={<Recycle className="w-6 h-6 text-gl-charcoal-muted" />}
            title="No Collection Centres Registered"
            description="No registered recycling centres found for this district yet. Local collection hubs and MCFs will be listed as verified by administrators."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCentres.map((centre) => (
              <Card
                key={centre.id}
                variant="elevated"
                className="p-5 flex flex-col justify-between space-y-3 bg-white border border-gl-border rounded-2xl shadow-card hover:shadow-card-hover transition-all text-xs"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-gl-dark bg-gl-sage-light border border-gl-sage px-2.5 py-0.5 rounded-full">
                      {centre.operator_type.replace(/_/g, ' ')}
                    </span>
                    {centre.is_verified && (
                      <span className="text-[11px] text-gl-forest font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-gl-fresh" /> Verified
                      </span>
                    )}
                  </div>

                  <h3 className="font-heading font-bold text-base text-gl-charcoal leading-snug">
                    {centre.name}
                  </h3>

                  <p className="text-xs text-gl-charcoal-muted flex items-start gap-1.5 pt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gl-forest shrink-0 mt-0.5" />
                    <span>{centre.address}</span>
                  </p>
                </div>

                <div className="space-y-2 border-t border-gl-border pt-3 text-gl-charcoal-muted">
                  <p className="flex items-center gap-1.5 text-gl-charcoal">
                    <Phone className="w-3.5 h-3.5 text-gl-forest" />
                    <a href={`tel:${centre.phone}`} className="hover:underline font-semibold">{centre.phone}</a>
                  </p>
                  <p className="flex items-center gap-1.5 text-gl-charcoal-muted">
                    <Clock className="w-3.5 h-3.5 text-gl-charcoal-muted" />
                    <span>{centre.operating_hours}</span>
                  </p>

                  <div className="pt-2">
                    <span className="text-[11px] text-gl-charcoal font-semibold block mb-1">
                      Accepted Materials:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {centre.accepted_categories.map((cat, i) => (
                        <span
                          key={i}
                          className="bg-gl-cream text-gl-charcoal text-[10px] px-2 py-0.5 rounded-md font-medium border border-gl-border"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
