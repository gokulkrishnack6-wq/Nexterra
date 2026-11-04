import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { RecyclingCentre, WasteListing, PublicWasteBin } from '../../types';
import { useGeolocation } from '../../hooks/useGeolocation';
import { Phone, Clock, ArrowRight, ShieldCheck, Navigation } from 'lucide-react';
import { Link } from 'react-router-dom';

interface KeralaCircularMapProps {
  centres: RecyclingCentre[];
  listings: WasteListing[];
  wasteBins?: PublicWasteBin[];
  initialFilter?: 'all' | 'centres' | 'bins' | 'listings';
}

export const KeralaCircularMap: React.FC<KeralaCircularMapProps> = ({ 
  centres, 
  listings,
  wasteBins = [],
  initialFilter = 'all'
}) => {
  const [filterType, setFilterType] = useState<'all' | 'centres' | 'bins' | 'listings'>(initialFilter);
  const { coords, locality, district } = useGeolocation();

  // Pin for User's Current Location
  const userLocationIcon = L.divIcon({
    className: 'custom-user-pin',
    html: `
      <div style="background-color: #174D36; color: #FFFFFF; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 6px rgba(23, 77, 54, 0.25); border: 2.5px solid #FFFFFF;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11"/>
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  // Pin for Facilities / MCFs
  const centreIcon = L.divIcon({
    className: 'custom-centre-pin',
    html: `
      <div style="background-color: #234B35; color: #FFFFFF; width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid #FFFFFF;">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
          <path d="M11 19h8.2a1.8 1.8 0 0 0 1.5-1 1.8 1.8 0 0 0 0-1.8L17 9.5"/>
          <path d="M11 5h2a2 2 0 0 1 2 2v2H9V7a2 2 0 0 1 2-2Z"/>
        </svg>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });

  // Pin for Public Waste Bins
  const binIcon = L.divIcon({
    className: 'custom-bin-pin',
    html: `
      <div style="background-color: #093420; color: #C4ECD3; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid #FFFFFF;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });

  // Pin for Material Listings
  const listingIcon = L.divIcon({
    className: 'custom-listing-pin',
    html: `
      <div style="background-color: #DCE5D4; color: #093420; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.15); border: 1.5px solid #234B35;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });

  const centerLat = coords ? coords.latitude : 10.2500;
  const centerLng = coords ? coords.longitude : 76.3500;
  const mapZoom = coords ? 11 : 8;

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-outline-variant/70 shadow-sm">
      {/* Map Filter Controls Bar */}
      <div className="absolute top-3 right-3 z-[400] bg-surface-container-lowest/95 backdrop-blur-md p-1.5 rounded-lg border border-outline-variant shadow-dropdown flex flex-wrap items-center gap-1 text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1 rounded-md font-label-md text-xs transition-colors ${
            filterType === 'all'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface hover:bg-surface-container'
          }`}
        >
          All Points ({centres.length + wasteBins.length + listings.length})
        </button>

        <button
          onClick={() => setFilterType('bins')}
          className={`px-3 py-1 rounded-md font-label-md text-xs transition-colors flex items-center gap-1 ${
            filterType === 'bins'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <span>Public Bins ({wasteBins.length})</span>
        </button>

        <button
          onClick={() => setFilterType('centres')}
          className={`px-3 py-1 rounded-md font-label-md text-xs transition-colors flex items-center gap-1 ${
            filterType === 'centres'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-secondary"></span>
          <span>Centres ({centres.length})</span>
        </button>

        <button
          onClick={() => setFilterType('listings')}
          className={`px-3 py-1 rounded-md font-label-md text-xs transition-colors flex items-center gap-1 ${
            filterType === 'listings'
              ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
              : 'text-on-surface hover:bg-surface-container'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-outline"></span>
          <span>Materials ({listings.length})</span>
        </button>
      </div>

      <MapContainer
        center={[centerLat, centerLng]}
        zoom={mapZoom}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* User's Detected Location Marker */}
        {coords && (
          <Marker position={[coords.latitude, coords.longitude]} icon={userLocationIcon}>
            <Popup>
              <div className="p-1 space-y-1 text-left max-w-xs font-sans">
                <span className="text-[10px] uppercase font-bold text-primary">Your Location</span>
                <p className="text-xs font-semibold">{locality || district || 'You are here'}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Public Segregated Waste Bins */}
        {(filterType === 'all' || filterType === 'bins') &&
          wasteBins.map((bin) => (
            <Marker
              key={bin.id}
              position={[bin.latitude, bin.longitude]}
              icon={binIcon}
            >
              <Popup>
                <div className="p-1 space-y-2 text-left max-w-xs font-sans">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-on-primary bg-primary px-2 py-0.5 rounded-full uppercase">
                      Public Waste Bin
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-container text-primary">
                      {bin.fill_percentage}% Full
                    </span>
                  </div>

                  <h4 className="font-heading font-semibold text-xs text-primary leading-tight">
                    {bin.name}
                  </h4>

                  <p className="text-[11px] text-on-surface">
                    {bin.address}
                  </p>

                  <div className="pt-1 text-[10px] text-outline border-t border-gray-200 space-y-0.5">
                    <div>Managed by: <strong>{bin.managed_by}</strong></div>
                    <div>Serviced: {bin.last_serviced}</div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Facilities Markers */}
        {(filterType === 'all' || filterType === 'centres') &&
          centres.map((centre) => (
            <Marker
              key={centre.id}
              position={[centre.latitude, centre.longitude]}
              icon={centreIcon}
            >
              <Popup>
                <div className="p-1 space-y-2 text-left max-w-xs font-sans">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold bg-secondary-container text-primary px-1.5 py-0.5 rounded">
                      {centre.operator_type.replace(/_/g, ' ')}
                    </span>
                    {centre.is_verified && (
                      <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                        <ShieldCheck className="w-3 h-3" /> Verified Hub
                      </span>
                    )}
                  </div>

                  <h4 className="font-heading font-semibold text-xs text-primary leading-tight">
                    {centre.name}
                  </h4>

                  <p className="text-[11px] text-on-surface">
                    {centre.address}
                  </p>

                  <div className="pt-1 border-t border-gray-200 text-[10px] text-outline space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      <span>{centre.operating_hours}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-primary" />
                      <span>{centre.phone}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] text-on-surface font-medium block mb-1">
                      Accepted Segregations:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {centre.accepted_categories.map((c) => (
                        <span key={c} className="text-[9px] bg-gray-100 text-on-surface px-1.5 py-0.5 rounded">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Listings Markers */}
        {(filterType === 'all' || filterType === 'listings') &&
          listings.map((listing) => (
            <Marker
              key={listing.id}
              position={[listing.latitude, listing.longitude]}
              icon={listingIcon}
            >
              <Popup>
                <div className="p-1 space-y-1.5 text-left max-w-xs font-sans">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-semibold text-primary">
                      {listing.category?.name || 'Material'}
                    </span>
                    <span className="text-[10px] font-bold text-primary">
                      {listing.quantity} {listing.unit}
                    </span>
                  </div>

                  <h4 className="font-heading font-semibold text-xs text-on-surface">
                    {listing.title}
                  </h4>

                  <p className="text-[11px] text-outline">
                    {listing.locality}, {listing.district}
                  </p>

                  <Link
                    to={`/marketplace/${listing.id}`}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline pt-1"
                  >
                    <span>View Listing Details</span>
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
