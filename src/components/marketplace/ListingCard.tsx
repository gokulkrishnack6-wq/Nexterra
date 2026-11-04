import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart, ArrowRight } from 'lucide-react';
import { WasteListing } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useGeolocation, calculateDistanceKm } from '../../hooks/useGeolocation';

interface ListingCardProps {
  listing: WasteListing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const { favourites, toggleFavourite } = useData();
  const { coords } = useGeolocation();
  const isFav = favourites.includes(listing.id);

  const primaryImage = listing.images && listing.images.length > 0 
    ? listing.images[0] 
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80';

  const distanceKm = coords && listing.latitude && listing.longitude
    ? calculateDistanceKm(coords.latitude, coords.longitude, listing.latitude, listing.longitude)
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

        {/* Pricing tag */}
        <div className="absolute top-2.5 left-2.5">
          {getPricingBadge()}
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
            <span>{listing.category?.name || 'Recyclable'}</span>
            <span className="font-semibold text-primary">{listing.quantity} {listing.unit}</span>
          </div>

          <h3 className="font-heading font-semibold text-body-md text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {listing.title}
          </h3>

          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 line-clamp-2 leading-relaxed">
            {listing.description}
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-outline-variant/40 flex items-center justify-between text-body-sm">
          <div className="flex items-center gap-1 text-on-surface-variant truncate">
            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate text-[11px]">
              {distanceKm !== null ? `${distanceKm} km • ` : ''}
              {listing.locality || listing.district}
            </span>
          </div>

          <Link
            to={`/marketplace/${listing.id}`}
            className="text-primary hover:underline font-label-md text-xs font-semibold shrink-0 ml-2 inline-flex items-center gap-0.5"
          >
            <span>View</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};
