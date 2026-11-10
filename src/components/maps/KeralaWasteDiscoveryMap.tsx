import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { WasteLocation, WasteListing } from '../../types';
import {
  Trash2,
  Package,
  Recycle,
  MapPin,
  ExternalLink,
  Navigation,
  Phone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flag,
  ChevronRight,
  ShieldCheck,
  Building2,
  Compass
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface KeralaWasteDiscoveryMapProps {
  locations: WasteLocation[];
  listings: WasteListing[];
  selectedLocationId?: string | null;
  selectedListingId?: string | null;
  onSelectLocation?: (location: WasteLocation) => void;
  onSelectListing?: (listing: WasteListing) => void;
  onReportLocation?: (location: WasteLocation) => void;
  userCoords?: { latitude: number; longitude: number } | null;
  centerCoords?: { latitude: number; longitude: number } | null;
  zoomLevel?: number;
  isPickingLocation?: boolean;
  pickedCoords?: { latitude: number; longitude: number } | null;
  onPickCoords?: (coords: { latitude: number; longitude: number }) => void;
  heightClass?: string;
  showLegend?: boolean;
}

// Controller to smoothly pan/fly when centerCoords change
const MapViewController: React.FC<{
  centerCoords?: { latitude: number; longitude: number } | null;
  zoomLevel?: number;
  onZoomChange?: (zoom: number) => void;
}> = ({ centerCoords, zoomLevel, onZoomChange }) => {
  const map = useMap();
  const lastTargetRef = useRef<{ lat: number; lng: number; zoom?: number } | null>(null);

  useMapEvents({
    zoomend: () => {
      if (onZoomChange) onZoomChange(map.getZoom());
    },
  });

  useEffect(() => {
    if (centerCoords && centerCoords.latitude && centerCoords.longitude) {
      const targetZoom = zoomLevel || map.getZoom();
      const prev = lastTargetRef.current;
      const isDifferent =
        !prev ||
        Math.abs(prev.lat - centerCoords.latitude) > 0.0005 ||
        Math.abs(prev.lng - centerCoords.longitude) > 0.0005 ||
        prev.zoom !== targetZoom;

      if (isDifferent) {
        lastTargetRef.current = { lat: centerCoords.latitude, lng: centerCoords.longitude, zoom: targetZoom };
        map.flyTo([centerCoords.latitude, centerCoords.longitude], targetZoom, { duration: 0.9 });
      }
    }
  }, [centerCoords, zoomLevel, map]);

  return null;
};

// Map click listener for Pin-Drop / Community submission coordinate picker
const MapClickHandler: React.FC<{
  enabled: boolean;
  onPick: (coords: { latitude: number; longitude: number }) => void;
}> = ({ enabled, onPick }) => {
  useMapEvents({
    click: (e) => {
      if (enabled) {
        onPick({ latitude: Number(e.latlng.lat.toFixed(6)), longitude: Number(e.latlng.lng.toFixed(6)) });
      }
    },
  });
  return null;
};

/**
 * 1. BLUE BIN MARKER: Public Waste Bins
 */
const createPublicBinIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'custom-discovery-marker bin-marker',
    html: `
      <div style="
        background: #2563A6;
        color: #FFFFFF;
        width: ${isSelected ? '38px' : '32px'};
        height: ${isSelected ? '38px' : '32px'};
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #FFFFFF;
        box-shadow: 0 4px 10px rgba(37, 99, 166, 0.45), 0 0 0 ${isSelected ? '4px rgba(37, 99, 166, 0.3)' : '0'};
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </div>
    `,
    iconSize: [isSelected ? 38 : 32, isSelected ? 38 : 32],
    iconAnchor: [isSelected ? 19 : 16, isSelected ? 19 : 16],
    popupAnchor: [0, isSelected ? -20 : -17],
  });

/**
 * 2. GREEN PACKAGE MARKER: Available Waste Listings
 */
const createListingIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'custom-discovery-marker listing-marker',
    html: `
      <div style="
        background: #287A45;
        color: #FFFFFF;
        width: ${isSelected ? '38px' : '32px'};
        height: ${isSelected ? '38px' : '32px'};
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #FFFFFF;
        box-shadow: 0 4px 10px rgba(40, 122, 69, 0.45), 0 0 0 ${isSelected ? '4px rgba(40, 122, 69, 0.3)' : '0'};
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16.5 9.4 7.55 4.24a1.78 1.78 0 0 0-2.5 1.55v12.42a1.78 1.78 0 0 0 2.5 1.55L16.5 14.6"/>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.29 7 12 12 20.71 7"/>
          <line x1="12" y1="22" x2="12" y2="12"/>
        </svg>
      </div>
    `,
    iconSize: [isSelected ? 38 : 32, isSelected ? 38 : 32],
    iconAnchor: [isSelected ? 19 : 16, isSelected ? 19 : 16],
    popupAnchor: [0, isSelected ? -20 : -17],
  });

/**
 * 3. ORANGE RECYCLING MARKER: Waste Collection & Recycling Centres
 */
const createCollectionCentreIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'custom-discovery-marker centre-marker',
    html: `
      <div style="
        background: #B66A20;
        color: #FFFFFF;
        width: ${isSelected ? '38px' : '32px'};
        height: ${isSelected ? '38px' : '32px'};
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2.5px solid #FFFFFF;
        box-shadow: 0 4px 10px rgba(182, 106, 32, 0.45), 0 0 0 ${isSelected ? '4px rgba(182, 106, 32, 0.3)' : '0'};
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        cursor: pointer;
      ">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 19H4.815a1.83 1.83 0 0 1-1.57-.881 1.785 1.785 0 0 1-.004-1.784L7.196 9.5"/>
          <path d="M11 19h8.2a1.8 1.8 0 0 0 1.5-1 1.8 1.8 0 0 0 0-1.8L17 9.5"/>
          <path d="M11 5h2a2 2 0 0 1 2 2v2H9V7a2 2 0 0 1 2-2Z"/>
        </svg>
      </div>
    `,
    iconSize: [isSelected ? 38 : 32, isSelected ? 38 : 32],
    iconAnchor: [isSelected ? 19 : 16, isSelected ? 19 : 16],
    popupAnchor: [0, isSelected ? -20 : -17],
  });

/**
 * 4. Cluster Pin (at low zoom levels)
 */
const createClusterIcon = (count: number, dominantType: 'bin' | 'listing' | 'centre' | 'mixed') => {
  const bg =
    dominantType === 'bin'
      ? '#2563A6'
      : dominantType === 'listing'
      ? '#287A45'
      : dominantType === 'centre'
      ? '#B66A20'
      : '#103D2A';

  const size = count > 50 ? 44 : count > 20 ? 40 : 34;

  return L.divIcon({
    className: 'custom-cluster-marker',
    html: `
      <div style="
        background: ${bg};
        color: #FFFFFF;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: ui-sans-serif, system-ui, sans-serif;
        font-weight: 700;
        font-size: 13px;
        border: 3px solid #FFFFFF;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
      ">
        ${count}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

/**
 * 5. User GPS Position Icon
 */
const userGpsIcon = L.divIcon({
  className: 'custom-user-gps-marker',
  html: `
    <div style="position: relative; width: 24px; height: 24px;">
      <div style="position: absolute; inset: 0; border-radius: 50%; background: #103D2A; opacity: 0.3; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: absolute; inset: 2px; border-radius: 50%; background: #103D2A; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

/**
 * 6. Dropped Pin (for community suggestion picker)
 */
const droppedPinIcon = L.divIcon({
  className: 'custom-dropped-pin-marker',
  html: `
    <div style="
      background: #C74738;
      color: #FFFFFF;
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 4px 10px rgba(199, 71, 56, 0.5);
    ">
      <div style="transform: rotate(45deg); width: 8px; height: 8px; background: #FFFFFF; border-radius: 50%;"></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

export const KeralaWasteDiscoveryMap: React.FC<KeralaWasteDiscoveryMapProps> = ({
  locations,
  listings,
  selectedLocationId,
  selectedListingId,
  onSelectLocation,
  onSelectListing,
  onReportLocation,
  userCoords,
  centerCoords,
  zoomLevel = 11,
  isPickingLocation = false,
  pickedCoords,
  onPickCoords,
  heightClass = 'h-[380px] sm:h-[480px] lg:h-[620px]',
  showLegend = true,
}) => {
  const [currentZoom, setCurrentZoom] = useState(zoomLevel);
  const [legendOpen, setLegendOpen] = useState(true);

  // Filter listings to active/reserved only (never completed/deleted)
  const availableListings = useMemo(() => {
    return listings.filter(
      (l) => l.status === 'active' || l.status === 'reserved'
    );
  }, [listings]);

  // Default Kerala Center coordinates
  const defaultCenterLat = centerCoords?.latitude || userCoords?.latitude || 10.2500;
  const defaultCenterLng = centerCoords?.longitude || userCoords?.longitude || 76.3500;

  // Grid-based lightweight clustering for zoom <= 9 (entire Kerala view)
  const shouldCluster = currentZoom <= 9;

  const clusters = useMemo(() => {
    if (!shouldCluster) return [];

    const gridSize = currentZoom <= 7 ? 0.6 : 0.35;
    const gridMap = new Map<
      string,
      {
        latSum: number;
        lonSum: number;
        items: Array<{ type: 'location' | 'listing'; data: any }>;
      }
    >();

    for (const loc of locations) {
      const gX = Math.floor(loc.longitude / gridSize);
      const gY = Math.floor(loc.latitude / gridSize);
      const key = `${gX}_${gY}`;
      if (!gridMap.has(key)) {
        gridMap.set(key, { latSum: 0, lonSum: 0, items: [] });
      }
      const g = gridMap.get(key)!;
      g.latSum += loc.latitude;
      g.lonSum += loc.longitude;
      g.items.push({ type: 'location', data: loc });
    }

    for (const list of availableListings) {
      if (list.latitude && list.longitude) {
        const gX = Math.floor(list.longitude / gridSize);
        const gY = Math.floor(list.latitude / gridSize);
        const key = `${gX}_${gY}`;
        if (!gridMap.has(key)) {
          gridMap.set(key, { latSum: 0, lonSum: 0, items: [] });
        }
        const g = gridMap.get(key)!;
        g.latSum += list.latitude;
        g.lonSum += list.longitude;
        g.items.push({ type: 'listing', data: list });
      }
    }

    const res: Array<{
      id: string;
      latitude: number;
      longitude: number;
      count: number;
      dominantType: 'bin' | 'listing' | 'centre' | 'mixed';
    }> = [];

    gridMap.forEach((val, key) => {
      const count = val.items.length;
      if (count === 0) return;
      const binCount = val.items.filter(
        (i) => i.type === 'location' && i.data.location_type === 'public_bin'
      ).length;
      const centreCount = val.items.filter(
        (i) => i.type === 'location' && i.data.location_type === 'collection_centre'
      ).length;
      const listingCount = val.items.filter((i) => i.type === 'listing').length;

      let dominantType: 'bin' | 'listing' | 'centre' | 'mixed' = 'mixed';
      if (binCount > count * 0.5) dominantType = 'bin';
      else if (centreCount > count * 0.5) dominantType = 'centre';
      else if (listingCount > count * 0.5) dominantType = 'listing';

      res.push({
        id: `cluster-${key}`,
        latitude: val.latSum / count,
        longitude: val.lonSum / count,
        count,
        dominantType,
      });
    });

    return res;
  }, [locations, availableListings, shouldCluster, currentZoom]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-[#E6E0D5] shadow-sm select-none`}>
      {/* Interactive Map */}
      <MapContainer
        center={[defaultCenterLat, defaultCenterLng]}
        zoom={zoomLevel}
        scrollWheelZoom={true}
        className="w-full h-full z-0 font-sans"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapViewController
          centerCoords={centerCoords}
          zoomLevel={zoomLevel}
          onZoomChange={setCurrentZoom}
        />

        {isPickingLocation && onPickCoords && (
          <MapClickHandler enabled={isPickingLocation} onPick={onPickCoords} />
        )}

        {/* 1. User Location Pin */}
        {userCoords && userCoords.latitude && userCoords.longitude && (
          <Marker position={[userCoords.latitude, userCoords.longitude]} icon={userGpsIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <strong className="block text-[#103D2A] font-semibold">Your Location</strong>
                <span className="text-[#68736B]">Live GPS verified position</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 2. Picked Coordinate Pin (Community Submission Mode) */}
        {isPickingLocation && pickedCoords && (
          <Marker position={[pickedCoords.latitude, pickedCoords.longitude]} icon={droppedPinIcon}>
            <Popup autoPan={false}>
              <div className="p-1 text-xs text-center">
                <strong className="block text-[#C74738] font-bold">Selected Coordinates</strong>
                <span className="font-mono text-[11px] text-[#68736B]">
                  {pickedCoords.latitude.toFixed(5)}°N, {pickedCoords.longitude.toFixed(5)}°E
                </span>
                <p className="text-[10px] text-[#18251F] mt-1">
                  Click elsewhere on map to reposition pin.
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 3. Render Clusters when zoomed out */}
        {shouldCluster &&
          clusters.map((c) => (
            <Marker
              key={c.id}
              position={[c.latitude, c.longitude]}
              icon={createClusterIcon(c.count, c.dominantType)}
              eventHandlers={{
                click: (e) => {
                  const map = e.target._map;
                  map.flyTo([c.latitude, c.longitude], currentZoom + 3, { duration: 0.8 });
                },
              }}
            />
          ))}

        {/* 4. Render Individual Points when zoomed in */}
        {!shouldCluster && (
          <>
            {/* A. PUBLIC WASTE BINS & COLLECTION CENTRES */}
            {locations.map((loc) => {
              const isSelected = selectedLocationId === loc.id;
              const isPublicBin = loc.location_type === 'public_bin';
              const icon = isPublicBin
                ? createPublicBinIcon(isSelected)
                : createCollectionCentreIcon(isSelected);

              return (
                <Marker
                  key={loc.id}
                  position={[loc.latitude, loc.longitude]}
                  icon={icon}
                  eventHandlers={{
                    click: () => {
                      if (onSelectLocation) onSelectLocation(loc);
                    },
                  }}
                >
                  <Popup className="custom-waste-popup">
                    <div className="p-2.5 max-w-[270px] space-y-2 text-left font-sans text-xs">
                      {/* Badge Header */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            isPublicBin
                              ? 'bg-blue-100 text-[#2563A6]'
                              : 'bg-amber-100 text-[#B66A20]'
                          }`}
                        >
                          {isPublicBin ? (
                            <>
                              <Trash2 className="w-3 h-3" /> Public Waste Bin
                            </>
                          ) : (
                            <>
                              <Recycle className="w-3 h-3" /> Collection Facility
                            </>
                          )}
                        </span>

                        <span
                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                            loc.verification_status === 'officially_verified'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {loc.verification_status === 'officially_verified'
                            ? 'Verified'
                            : 'Community'}
                        </span>
                      </div>

                      {/* Name */}
                      <h4 className="font-semibold text-sm text-[#18251F] leading-snug">
                        {loc.name}
                      </h4>

                      {/* Address */}
                      <p className="text-[11px] text-[#556059] flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#103D2A] shrink-0 mt-0.5" />
                        <span>{loc.address}</span>
                      </p>

                      {/* Accepted Materials */}
                      {loc.accepted_waste_categories && loc.accepted_waste_categories.length > 0 && (
                        <div className="pt-1">
                          <span className="text-[10px] font-semibold text-[#18251F] block mb-1">
                            Accepted Waste:
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {loc.accepted_waste_categories.slice(0, 4).map((cat, idx) => (
                              <span
                                key={idx}
                                className="text-[9.5px] px-1.5 py-0.5 bg-[#F0ECE1] text-[#18251F] rounded"
                              >
                                {cat}
                              </span>
                            ))}
                            {loc.accepted_waste_categories.length > 4 && (
                              <span className="text-[9.5px] text-[#68736B]">
                                +{loc.accepted_waste_categories.length - 4} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Hours */}
                      {loc.opening_hours && (
                        <div className="flex items-center gap-1.5 text-[10.5px] text-[#68736B] pt-0.5">
                          <Clock className="w-3 h-3 shrink-0 text-[#103D2A]" />
                          <span>{loc.opening_hours}</span>
                        </div>
                      )}

                      {/* Contact */}
                      {loc.contact_number && (
                        <div className="flex items-center gap-1.5 text-[10.5px] text-[#68736B]">
                          <Phone className="w-3 h-3 shrink-0 text-[#103D2A]" />
                          <span>{loc.contact_number}</span>
                        </div>
                      )}

                      {/* Action Links */}
                      <div className="pt-2 border-t border-[#EAE5D9] flex items-center justify-between gap-2">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#103D2A] hover:underline"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>Directions</span>
                        </a>

                        {onReportLocation && (
                          <button
                            type="button"
                            onClick={() => onReportLocation(loc)}
                            className="inline-flex items-center gap-1 text-[10.5px] text-[#8C938D] hover:text-[#C74738] transition-colors"
                          >
                            <Flag className="w-2.5 h-2.5" />
                            <span>Report Info</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* B. GREENLOOP WASTE LISTINGS */}
            {availableListings.map((listing) => {
              if (!listing.latitude || !listing.longitude) return null;
              const isSelected = selectedListingId === listing.id;

              return (
                <Marker
                  key={listing.id}
                  position={[listing.latitude, listing.longitude]}
                  icon={createListingIcon(isSelected)}
                  eventHandlers={{
                    click: () => {
                      if (onSelectListing) onSelectListing(listing);
                    },
                  }}
                >
                  <Popup className="custom-waste-popup">
                    <div className="p-2.5 max-w-[270px] space-y-2 text-left font-sans text-xs">
                      {/* Header Badge */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="bg-emerald-100 text-[#287A45] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Package className="w-3 h-3" /> Available Waste
                        </span>

                        <span
                          className={`text-[9.5px] font-semibold px-2 py-0.5 rounded ${
                            listing.listing_type === 'free'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-800'
                          }`}
                        >
                          {listing.listing_type === 'free' ? 'Free Material' : `₹${listing.price || 0}`}
                        </span>
                      </div>

                      {/* Thumbnail Image if available */}
                      {listing.images && listing.images.length > 0 && (
                        <div className="w-full h-24 rounded-lg overflow-hidden bg-[#F0ECE1] border border-[#E6E0D5]">
                          <img
                            src={listing.images[0]}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Title & Quantity */}
                      <div>
                        <h4 className="font-semibold text-sm text-[#18251F] leading-snug line-clamp-1">
                          {listing.title}
                        </h4>
                        <span className="text-[11px] text-[#68736B]">
                          Quantity: <strong className="text-[#18251F] font-medium">{listing.quantity} {listing.unit || 'kg'}</strong>
                        </span>
                      </div>

                      {/* Location */}
                      <p className="text-[11px] text-[#556059] flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#103D2A] shrink-0 mt-0.5" />
                        <span className="truncate">{listing.formatted_address || listing.locality || listing.district}</span>
                      </p>

                      {/* Listed By */}
                      {listing.user && (
                        <div className="text-[10px] text-[#8C938D]">
                          Listed by: <span className="font-medium text-[#18251F]">{listing.user.full_name}</span>
                        </div>
                      )}

                      {/* View Listing CTA Button */}
                      <div className="pt-2 border-t border-[#EAE5D9]">
                        <Link
                          to={`/marketplace/${listing.id}`}
                          className="w-full py-1.5 px-3 rounded-lg bg-[#103D2A] hover:bg-[#0B3827] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <span>View Listing</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </>
        )}
      </MapContainer>

      {/* Floating Interactive Map Legend (as specified in User Request) */}
      {showLegend && (
        <div className="absolute top-3 left-3 z-[400] max-w-[240px] xs:max-w-[280px]">
          <div className="bg-white/95 backdrop-blur-md border border-[#E6E0D5] rounded-xl shadow-lg p-3 text-xs select-none transition-all">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#EFECE4] mb-2">
              <span className="font-semibold text-[11px] uppercase tracking-wider text-[#103D2A] flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" /> Map Legend
              </span>
              <button
                type="button"
                onClick={() => setLegendOpen(!legendOpen)}
                className="text-[10px] font-medium text-[#68736B] hover:text-[#103D2A]"
              >
                {legendOpen ? 'Hide' : 'Show'}
              </button>
            </div>

            {legendOpen && (
              <div className="space-y-2">
                {/* 1. Public Waste Bins */}
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#2563A6] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Trash2 className="w-3 h-3" />
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-[#18251F] block text-xs leading-none">Public Waste Bins</span>
                    <span className="text-[10px] text-[#68736B]">Public &amp; transit disposal</span>
                  </div>
                </div>

                {/* 2. Available Waste Listings */}
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-[#287A45] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Package className="w-3 h-3" />
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-[#18251F] block text-xs leading-none">Available Waste Listings</span>
                    <span className="text-[10px] text-[#68736B]">Materials from GreenLoop users</span>
                  </div>
                </div>

                {/* 3. Waste Collection Centres */}
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#B66A20] text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Recycle className="w-3 h-3" />
                  </div>
                  <div className="truncate">
                    <span className="font-medium text-[#18251F] block text-xs leading-none">Collection &amp; Recycling</span>
                    <span className="text-[10px] text-[#68736B]">MCF, RRF, Haritha Karma Sena</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pin-Drop Helper Banner (when Suggesting a location) */}
      {isPickingLocation && (
        <div className="absolute bottom-4 inset-x-4 z-[400] max-w-md mx-auto">
          <div className="bg-[#103D2A] text-white p-3 rounded-xl shadow-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
              <span>
                {pickedCoords
                  ? `Pin set at: ${pickedCoords.latitude.toFixed(4)}°N, ${pickedCoords.longitude.toFixed(4)}°E`
                  : 'Click anywhere on the map to set the exact pin coordinates.'}
              </span>
            </div>
            {pickedCoords && (
              <span className="bg-emerald-500/20 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                Pinned
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

