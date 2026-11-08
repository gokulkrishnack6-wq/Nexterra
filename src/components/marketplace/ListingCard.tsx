import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart, ArrowRight } from 'lucide-react';
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

  const primaryImage = listing.images && listing.images.length > 0 
    ? listing.images[0] 
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80';

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
          <span className="font-label-sm text-label-sm text-primary font-bold bg-secondary-container px-2.5 py-0.5 rounded-full shadow-sm">
            Free
          </span>
        );
      case 'exchange':
        return (
          <span className="font-label-sm text-label-sm text-on-secondary-container font-medium bg-surface-container px-2.5 py-0.5 rounded-full shadow-sm">
            Exchange
          </span>
        );
      case 'sale':
        return (
          <span className="font-label-sm text-label-sm text-primary font-bold bg-surface-container-lowest border border-outline-variant px-2.5 py-0.5 rounded-full shadow-sm">
            ₹{listing.price}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/70 hover:border-outline transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-sm hover:shadow-md text-left">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full bg-surface-container-low overflow-hidden">
        <img
          src={primaryImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
        />

        {/* Pricing & Demo tag */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          {getPricingBadge()}
          {listing.is_demo && (
            <span className="font-label-sm text-[10px] uppercase font-bold text-amber-800 bg-amber-100/95 dark:bg-amber-950/90 dark:text-amber-300 border border-amber-300 px-2 py-0.5 rounded-full shadow-sm backdrop-blur-sm">
              Demo Sample
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavourite(listing.id);
          }}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-sm text-on-surface hover:text-error transition-colors shadow-sm ${
            isFav ? 'text-error' : 'text-outline'
          }`}
          title="Save material"
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-error text-error' : ''}`} />
        </button>

        {/* Status pill if completed/pending */}
        {listing.status !== 'active' && (
          <div className="absolute bottom-2.5 left-2.5 bg-inverse-surface/85 backdrop-blur-sm text-inverse-on-surface font-label-sm text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full">
            {listing.status}
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-outline mb-1 font-label-sm">
            <span className="truncate">{listing.category?.name || 'Recyclable'}</span>
            <span className="font-semibold text-primary shrink-0 ml-1">{listing.quantity} {listing.unit}</span>
          </div>

          <h3 className="font-heading font-semibold text-body-md text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {listing.title}
          </h3>

          <div className="flex items-center gap-1.5 mt-1 text-[11px] font-label-sm text-secondary">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-medium text-emerald-700 dark:text-emerald-400">Available</span>
            <span className="text-outline">•</span>
            <span className="truncate text-on-surface-variant font-medium">{listing.condition}</span>
          </div>

          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 line-clamp-2 leading-relaxed">
            {listing.description}
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-outline-variant/40 flex items-center justify-between text-body-sm">
          <div className="flex items-center gap-1.5 text-on-surface-variant min-w-0 flex-1 pr-2">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="text-[11px] truncate leading-tight">
              {distanceKm !== null ? (
                <span>
                  <strong className="text-primary font-semibold">{distanceKm} km away</strong>
                  <span className="text-outline mx-1">•</span>
                  <span>{listing.locality ? `${listing.locality}, ${listing.district}` : listing.district}</span>
                </span>
              ) : (
                <span>
                  <span className="text-on-surface-variant/75">Distance unavailable</span>
                  <span className="text-outline mx-1">•</span>
                  <span>{listing.locality ? `${listing.locality}, ${listing.district}` : listing.district}</span>
                </span>
              )}
            </div>
          </div>

          <Link
            to={`/marketplace/${listing.id}`}
            className="text-primary hover:underline font-label-md text-xs font-semibold shrink-0 ml-1 inline-flex items-center gap-0.5"
          >
            <span>View</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
