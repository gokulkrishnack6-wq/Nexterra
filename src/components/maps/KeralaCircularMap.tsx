import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { RecyclingCentre, WasteListing } from '../../types';
import { MapPin, Phone, Clock, ArrowRight, Store, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KeralaCircularMapProps {
  centres: RecyclingCentre[];
  listings: WasteListing[];
}

export const KeralaCircularMap: React.FC<KeralaCircularMapProps> = ({ centres, listings }) => {
  const [filterType, setFilterType] = useState<'all' | 'centres' | 'listings'>('all');

  // Custom DivIcon for Recycling Centres
  const centreIcon = L.divIcon({
    className: 'custom-centre-pin',
    html: `
      <div style="background-color: #174D36; color: #B6D96B; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(16, 59, 42, 0.4); border: 2px solid #ffffff;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
          <path d="M11 19h8.2a1.8 1.8 0 0 0 1.5-1 1.8 1.8 0 0 0 0-1.8L17 9.5"/>
          <path d="M11 5h2a2 2 0 0 1 2 2v2H9V7a2 2 0 0 1 2-2Z"/>
        </svg>
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -18],
  });

  // Custom DivIcon for Waste Listings
  const listingIcon = L.divIcon({
    className: 'custom-listing-pin',
    html: `
      <div style="background-color: #B6D96B; color: #103B2A; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.25); border: 2px solid #174D36;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  // Center coordinate around Malappuram / Central Kerala
  const centerLat = 10.9760;
  const centerLng = 76.2254;

  return (
    <div className="relative w-full h-[540px] rounded-2xl overflow-hidden border border-sage/40 shadow-soft">
      {/* Map Filter Controls Bar */}
      <div className="absolute top-4 right-4 z-[400] bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-sage/40 shadow-elevated flex items-center gap-1 text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            filterType === 'all'
              ? 'bg-forest text-white shadow-sm'
              : 'text-slate-600 hover:text-forest'
          }`}
        >
          All Points ({centres.length + listings.length})
        </button>
        <button
          onClick={() => setFilterType('centres')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            filterType === 'centres'
              ? 'bg-forest text-white shadow-sm'
              : 'text-slate-600 hover:text-forest'
          }`}
        >
          Recycling Centres ({centres.length})
        </button>
        <button
          onClick={() => setFilterType('listings')}
          className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
            filterType === 'listings'
              ? 'bg-forest text-white shadow-sm'
              : 'text-slate-600 hover:text-forest'
          }`}
        >
          Available Listings ({listings.length})
        </button>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-sage/40 shadow-elevated text-xs space-y-1.5 max-w-xs">
        <p className="font-heading font-bold text-forest-dark text-[11px] uppercase tracking-wider">
          Kerala Circular Legend
        </p>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-forest border border-white shrink-0"></div>
          <span className="text-slate-600">Haritha Karma Sena & MCF Centres</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-lime border border-forest shrink-0"></div>
          <span className="text-slate-600">Active Waste Material Listings</span>
        </div>
      </div>

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={9}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Recycling Centres Markers */}
        {(filterType === 'all' || filterType === 'centres') &&
          centres.map((centre) => (
            <Marker
              key={centre.id}
              position={[centre.latitude, centre.longitude]}
              icon={centreIcon}
            >
              <Popup>
                <div className="p-1 max-w-[220px]">
                  <div className="flex items-center gap-1 text-[10px] text-forest font-bold uppercase mb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                    <span>Verified Recovery Centre</span>
                  </div>
                  <h4 className="font-heading font-bold text-sm text-forest-dark leading-snug">
                    {centre.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">{centre.address}</p>
                  
                  <div className="mt-2 text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-forest" />
                      <span>{centre.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-forest" />
                      <span>{centre.operating_hours}</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                    {centre.accepted_categories.slice(0, 3).map((c, i) => (
                      <span key={i} className="bg-sage-light text-forest text-[10px] font-medium px-1.5 py-0.5 rounded">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Waste Listings Markers */}
        {(filterType === 'all' || filterType === 'listings') &&
          listings.map((listing) => (
            <Marker
              key={listing.id}
              position={[listing.latitude, listing.longitude]}
              icon={listingIcon}
            >
              <Popup>
                <div className="p-1 max-w-[220px]">
                  <div className="flex items-center gap-1 text-[10px] text-lime-600 font-bold uppercase mb-1">
                    <Store className="w-3.5 h-3.5 text-forest" />
                    <span>Available Waste Material</span>
                  </div>
                  <h4 className="font-heading font-bold text-sm text-forest-dark leading-snug">
                    {listing.title}
                  </h4>
                  <p className="text-xs font-bold text-forest mt-1">
                    {listing.quantity} {listing.unit} • {listing.listing_type.toUpperCase()}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {listing.locality}, {listing.district}
                  </p>
                  <Link
                    to={`/marketplace/${listing.id}`}
                    className="mt-2.5 inline-flex items-center gap-1 text-xs text-forest hover:text-forest-dark font-bold hover:underline"
                  >
                    <span>View Listing Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};

