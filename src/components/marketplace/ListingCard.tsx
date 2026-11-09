import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart, ArrowRight, Sparkles } from 'lucide-react';
import { WasteListing } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useGeolocation, calculateDistanceKm } from '../../hooks/useGeolocation';
import { isAiGeneratedImage } from '../../services/imageGeneration';

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
          <span className="text-[11px] text-gl-forest font-bold bg-gl-sage-light px-2.5 py-0.5 rounded-full shadow-xs">
            Free
          </span>
        );
      case 'exchange':
        return (
          <span className="text-[11px] text-gl-forest font-semibold bg-gl-lime px-2.5 py-0.5 rounded-full shadow-xs">
            Exchange
          </span>
        );
      case 'sale':
        return (
          <span className="text-[11px] text-gl-forest font-bold bg-white border border-gl-border px-2.5 py-0.5 rounded-full shadow-xs">
            ₹{listing.price}
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gl-border hover:border-gl-sage transition-all duration-200 flex flex-col justify-between overflow-hidden group shadow-card hover:shadow-card-hover text-left">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full bg-gl-cream overflow-hidden">
        <img
          src={primaryImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
        />

        {/* Pricing & Sample tag */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          {getPricingBadge()}
          {listing.is_demo && (
            <span className="text-[10px] uppercase font-bold text-amber-900 bg-amber-50/95 border border-amber-200 px-2 py-0.5 rounded-full shadow-xs backdrop-blur-sm">
              Sample Stream
            </span>
          )}
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavourite(listing.id);
          }}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded-full bg-white/90 backdrop-blur-sm text-gl-charcoal hover:text-red-500 transition-colors shadow-xs ${
            isFav ? 'text-red-500' : 'text-gl-charcoal-muted'
          }`}
          title="Save material"
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
        </button>

        {/* Status pill if completed/pending */}
        {listing.status !== 'active' && (
          <div className="absolute bottom-2.5 left-2.5 bg-gl-charcoal/85 backdrop-blur-sm text-white text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full">
            {listing.status}
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-gl-charcoal-muted mb-1 font-medium">
            <span className="truncate">{listing.category?.name || 'Recyclable'}</span>
            <span className="font-semibold text-gl-forest shrink-0 ml-1">{listing.quantity} {listing.unit}</span>
          </div>

          <h3 className="font-heading font-bold text-base text-gl-charcoal group-hover:text-gl-forest transition-colors line-clamp-1">
            {listing.title}
          </h3>

          <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-gl-fresh shrink-0" />
            <span className="font-medium text-gl-fresh">Available</span>
            {listing.condition && (
              <>
                <span className="text-gl-border">•</span>
                <span className="truncate text-gl-charcoal-muted font-medium">{listing.condition}</span>
              </>
            )}
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-gl-border/70 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-gl-charcoal-muted min-w-0 flex-1 pr-2">
            <MapPin className="w-3.5 h-3.5 text-gl-forest shrink-0" />
            <div className="text-[11px] truncate leading-tight">
              {distanceKm !== null ? (
                <span>
                  <strong className="text-gl-forest font-semibold">{distanceKm} km</strong>
                  <span className="text-gl-border mx-1">•</span>
                  <span>{listing.locality ? `${listing.locality}, ${listing.district}` : listing.district}</span>
                </span>
              ) : (
                <span>{listing.locality ? `${listing.locality}, ${listing.district}` : listing.district}</span>
              )}
            </div>
          </div>

          <Link
            to={`/marketplace/${listing.id}`}
            className="text-white bg-gl-forest hover:bg-gl-dark px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 ml-1 inline-flex items-center gap-1 shadow-xs transition-all active:scale-[0.98]"
          >
            <span>Details</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
