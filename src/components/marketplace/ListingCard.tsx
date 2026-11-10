import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart, ArrowRight, CameraOff } from 'lucide-react';
import { WasteListing } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useGeolocation, calculateDistanceKm } from '../../hooks/useGeolocation';

interface ListingCardProps {
  listing: WasteListing;
  referenceCoords?: { latitude: number; longitude: number } | null;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, referenceCoords }) => {
  const { favourites, toggleFavourite } = useData();
  const { coords } = useGeolocation();
  const isFav = favourites.includes(listing.id);

  const hasValidImage = Boolean(listing.images && listing.images.length > 0 && listing.images[0]);
  const primaryImage = hasValidImage ? listing.images![0] : null;

  const effectiveRefCoords = referenceCoords || coords;
  const hasValidListingCoords =
    typeof listing.latitude === 'number' &&
    typeof listing.longitude === 'number' &&
    !isNaN(listing.latitude) &&
    !isNaN(listing.longitude) &&
    (listing.latitude !== 0 || listing.longitude !== 0);

  const distanceKm =
    effectiveRefCoords &&
    typeof effectiveRefCoords.latitude === 'number' &&
    typeof effectiveRefCoords.longitude === 'number' &&
    hasValidListingCoords
      ? calculateDistanceKm(
          effectiveRefCoords.latitude,
          effectiveRefCoords.longitude,
          listing.latitude,
          listing.longitude
        )
      : null;

  const getPricingBadge = () => {
    switch (listing.listing_type) {
      case 'free':
        return (
          <span className="text-[11px] text-[#103D2A] font-medium bg-[#E8EFE9] px-2 py-0.5 rounded-md border border-[#C8D6C9]">
            Free
          </span>
        );
      case 'exchange':
        return (
          <span className="text-[11px] text-[#103D2A] font-medium bg-[#F0EFE6] px-2 py-0.5 rounded-md border border-[#DCD6CB]">
            Exchange
          </span>
        );
      case 'sale':
        return (
          <span className="text-[11px] text-[#1C2826] font-medium bg-white border border-[#DCD6CB] px-2 py-0.5 rounded-md">
            ₹{listing.price}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E8E4DA] hover:border-[#8BA681] transition-all duration-150 flex flex-col justify-between overflow-hidden group shadow-subtle hover:shadow-card text-left">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full bg-[#F4F1EA] overflow-hidden">
        {hasValidImage ? (
          <img
            src={primaryImage!}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-[#FAF8F2] text-[#68736B]">
            <CameraOff className="w-7 h-7 text-[#8C958E] mb-1 opacity-70" />
            <span className="text-[11px] font-medium text-[#7A857D]">No photo</span>
          </div>
        )}

        {/* Pricing & Status tags */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          {getPricingBadge()}
          {listing.status === 'reserved' && (
            <span className="text-[11px] font-medium text-amber-900 bg-amber-50/95 border border-amber-300 px-2 py-0.5 rounded-md">
              In progress
            </span>
          )}
          {listing.is_demo && (
            <span className="text-[11px] font-medium text-[#5C6E66] bg-white/95 border border-[#DCD6CB] px-2 py-0.5 rounded-md">
              Sample
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavourite(listing.id);
          }}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-md bg-white/90 backdrop-blur-sm text-[#5C6E66] hover:text-red-500 transition-colors ${
            isFav ? 'text-red-500' : 'text-[#7B8B83]'
          }`}
          title="Save material"
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Status pill if completed */}
        {listing.status === 'completed' && (
          <div className="absolute bottom-2.5 left-2.5 bg-[#1C2826]/85 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded-md">
            Completed
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-xs text-[#5C6E66] mb-1">
            <span className="truncate">{listing.category?.name || 'Recyclable'}</span>
            <span className="font-medium text-[#103D2A] shrink-0 ml-1">{listing.quantity} {listing.unit}</span>
          </div>

          <h3 className="font-sans font-medium text-[15px] text-[#1C2826] group-hover:text-[#103D2A] transition-colors line-clamp-1">
            {listing.title}
          </h3>

          <div className="flex items-center gap-1.5 mt-1.5 text-xs">
            {listing.status === 'reserved' ? (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-600 shrink-0" />
                <span className="font-medium text-amber-800">Exchange in progress</span>
              </>
            ) : (
              <>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                <span className="font-medium text-emerald-700">Available</span>
              </>
            )}
            {listing.condition && (
              <>
                <span className="text-[#DCD6CB]">•</span>
                <span className="truncate text-[#5C6E66]">{listing.condition}</span>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#E8E4DA] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[#5C6E66] min-w-0 flex-1 pr-2">
            <MapPin className="w-3.5 h-3.5 text-[#103D2A] shrink-0" />
            <div className="text-xs truncate leading-tight">
              {distanceKm !== null ? (
                <span>
                  <strong className="text-[#103D2A] font-medium">{distanceKm} km</strong>
                  <span className="text-[#DCD6CB] mx-1">•</span>
                  <span>{listing.locality ? `${listing.locality}, ${listing.district}` : listing.district}</span>
                </span>
              ) : (
                <span>{listing.locality ? `${listing.locality}, ${listing.district}` : listing.district}</span>
              )}
            </div>
          </div>

          <Link
            to={`/marketplace/${listing.id}`}
            className="text-white bg-[#103D2A] hover:bg-[#0A261A] px-2.5 py-1 rounded-md text-xs font-medium shrink-0 ml-1 inline-flex items-center gap-1 transition-colors"
          >
            <span>Details</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
