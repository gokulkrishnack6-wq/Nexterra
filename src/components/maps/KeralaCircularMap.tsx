import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { RecyclingCentre, WasteListing } from '../../types';
import { Phone, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KeralaCircularMapProps {
  centres: RecyclingCentre[];
  listings: WasteListing[];
}

export const KeralaCircularMap: React.FC<KeralaCircularMapProps> = ({ centres, listings }) => {
  const [filterType, setFilterType] = useState<'all' | 'centres' | 'listings'>('all');

  // Clean custom pin for Facilities
  const centreIcon = L.divIcon({
    className: 'custom-centre-pin',
    html: `
      <div style="background-color: #234B35; color: #FFFFFF; width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.2); border: 1.5px solid #FFFFFF;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
          <path d="M11 19h8.2a1.8 1.8 0 0 0 1.5-1 1.8 1.8 0 0 0 0-1.8L17 9.5"/>
          <path d="M11 5h2a2 2 0 0 1 2 2v2H9V7a2 2 0 0 1 2-2Z"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

  // Clean custom pin for Listings
  const listingIcon = L.divIcon({
    className: 'custom-listing-pin',
    html: `
      <div style="background-color: #DCE5D4; color: #183B2A; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15); border: 1.5px solid #234B35;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });

  const centerLat = 10.9760;
  const centerLng = 76.2254;

  return (
    <div className="relative w-full h-[480px] rounded-lg overflow-hidden border border-[#E2E2D8]">
      {/* Map Filter Controls Bar */}
      <div className="absolute top-3 right-3 z-[400] bg-white p-1 rounded-md border border-[#E2E2D8] flex items-center gap-1 text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-forest text-white'
              : 'text-charcoal hover:bg-cream'
          }`}
        >
          All ({centres.length + listings.length})
        </button>
        <button
          onClick={() => setFilterType('centres')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            filterType === 'centres'
              ? 'bg-forest text-white'
              : 'text-charcoal hover:bg-cream'
          }`}
        >
          Facilities ({centres.length})
        </button>
        <button
          onClick={() => setFilterType('listings')}
          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
            filterType === 'listings'
              ? 'bg-forest text-white'
              : 'text-charcoal hover:bg-cream'
          }`}
        >
          Materials ({listings.length})
        </button>
      </div>

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={9}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Facilities Markers */}
        {(filterType === 'all' || filterType === 'centres') &&
          centres.map((centre) => (
            <Marker
              key={centre.id}
              position={[centre.latitude, centre.longitude]}
              icon={centreIcon}
            >
              <Popup>
                <div className="p-1 max-w-[210px] text-xs">
                  <span className="text-[10px] uppercase font-semibold text-forest block mb-0.5">
                    Recovery Facility
                  </span>
                  <h4 className="font-heading font-bold text-sm text-charcoal leading-snug">
                    {centre.name}
                  </h4>
                  <p className="text-[11px] text-charcoal-muted mt-1">{centre.address}</p>
                  
                  <div className="mt-2 text-[11px] text-charcoal space-y-0.5">
                    <p className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-forest" />
                      <span>{centre.phone}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-forest" />
                      <span>{centre.operating_hours}</span>
                    </p>
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
                <div className="p-1 max-w-[210px] text-xs">
                  <span className="text-[10px] uppercase font-semibold text-forest block mb-0.5">
                    Available Material
                  </span>
                  <h4 className="font-heading font-bold text-sm text-charcoal leading-snug">
                    {listing.title}
                  </h4>
                  <p className="text-xs font-semibold text-forest mt-0.5">
                    {listing.quantity} {listing.unit} • {listing.listing_type.toUpperCase()}
                  </p>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    {listing.locality}, {listing.district}
                  </p>
                  <Link
                    to={`/marketplace/${listing.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-forest font-semibold hover:underline"
                  >
                    <span>View Listing</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
};
