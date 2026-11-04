import React, { useState } from 'react';
import { Phone, Clock, MapPin, Trash2, ShieldCheck, Search } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { KeralaCircularMap } from '../../components/maps/KeralaCircularMap';
import { KERALA_DISTRICTS } from '../../lib/mockData';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export const MapPage: React.FC = () => {
  const { recyclingCentres, listings, wasteBins } = useData();
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
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Badge variant="brand">Spatial Telemetry</Badge>
            <span className="text-outline text-xs">•</span>
            <span className="font-label-sm text-label-sm text-secondary">
              Kerala Infrastructure & Segregated Points
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            Waste Bins & Facility Directory
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Locate nearby public bio-bins, Haritha Karma Sena recovery facilities (RRF), municipal MCFs, and active material pick-ups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="py-2 px-3 bg-surface-container-lowest border border-outline-variant hover:border-outline focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 rounded-lg text-body-sm text-on-surface focus:outline-none transition-all"
          >
            {KERALA_DISTRICTS.map((d) => (
              <option key={d} value={d}>
                {d === 'All Kerala' ? 'All Kerala Districts' : d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Component with Segregated Layers */}
      <KeralaCircularMap 
        centres={filteredCentres} 
        listings={listings} 
        wasteBins={filteredBins} 
      />

      {/* Public Waste Bins Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-primary" />
            <h2 className="font-heading font-bold text-headline-sm text-primary">
              Public Segregated Waste Bins ({filteredBins.length})
            </h2>
          </div>
          <span className="font-label-sm text-label-sm text-outline">Real-time Fill Capacity</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBins.map((bin) => (
            <Card key={bin.id} variant="elevated" className="p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-label-sm text-[10px] font-bold text-primary bg-surface-container px-2 py-0.5 rounded-full uppercase">
                    {bin.bin_type.replace('_', ' ')}
                  </span>
                  <span className={`font-label-sm text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    bin.fill_percentage > 80 ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed text-primary'
                  }`}>
                    {bin.fill_percentage}% Full
                  </span>
                </div>

                <h3 className="font-heading font-semibold text-title-md text-on-surface">
                  {bin.name}
                </h3>

                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-1">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{bin.address}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-outline-variant/40 text-body-sm text-outline space-y-0.5">
                <div>Managed by: <strong className="text-primary">{bin.managed_by}</strong></div>
                <div>Last Serviced: {bin.last_serviced}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Facility Directory */}
      <div className="space-y-3 pt-4">
        <h2 className="font-heading font-bold text-headline-sm text-primary">
          Resource Recovery Facilities & MCFs ({filteredCentres.length})
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCentres.map((centre) => (
            <Card
              key={centre.id}
              variant="elevated"
              className="p-4 flex flex-col justify-between space-y-3 text-body-sm"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-[10px] uppercase font-bold text-primary bg-tertiary-fixed px-2 py-0.5 rounded-full">
                    {centre.operator_type.replace(/_/g, ' ')}
                  </span>
                  {centre.is_verified && (
                    <span className="text-[11px] text-surface-tint font-medium flex items-center gap-0.5">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>

                <h3 className="font-heading font-semibold text-title-md text-on-surface leading-snug">
                  {centre.name}
                </h3>

                <p className="font-body-sm text-body-sm text-on-surface-variant flex items-start gap-1 pt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{centre.address}</span>
                </p>
              </div>

              <div className="space-y-1.5 text-body-sm border-t border-outline-variant/40 pt-2.5 text-on-surface-variant">
                <p className="flex items-center gap-1.5 text-on-surface">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  <a href={`tel:${centre.phone}`} className="hover:underline font-medium">{centre.phone}</a>
                </p>
                <p className="flex items-center gap-1.5 text-outline">
                  <Clock className="w-3.5 h-3.5 text-outline" />
                  <span>{centre.operating_hours}</span>
                </p>

                <div className="pt-2">
                  <span className="font-label-sm text-[11px] text-outline font-semibold block mb-1">
                    Accepted Segregations:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {centre.accepted_categories.map((cat, i) => (
                      <span
                        key={i}
                        className="bg-surface-container text-on-surface text-[10px] px-2 py-0.5 rounded font-medium"
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
      </div>
    </div>
  );
};
