import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Heart } from 'lucide-react';
import { WasteListing } from '../../types';
import { useData } from '../../contexts/DataContext';

interface ListingCardProps {
  listing: WasteListing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const { favourites, toggleFavourite } = useData();
  const isFav = favourites.includes(listing.id);

  const primaryImage = listing.images && listing.images.length > 0 
    ? listing.images[0] 
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80';

  const getPricingLabel = () => {
    switch (listing.listing_type) {
      case 'free':
        return <span className="text-[11px] font-semibold text-forest bg-olive/50 px-2 py-0.5 rounded">Free</span>;
      case 'exchange':
        return <span className="text-[11px] font-medium text-charcoal bg-[#EBEBE0] px-2 py-0.5 rounded">Exchange</span>;
      case 'sale':
        return <span className="text-[11px] font-semibold text-charcoal bg-white border border-[#D5D5CA] px-2 py-0.5 rounded">₹{listing.price}</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-[#E2E2D8] hover:border-forest/40 transition-colors flex flex-col justify-between overflow-hidden group">
      {/* Thumbnail */}
      <div className="relative aspect-[4/3] w-full bg-[#EFEFE6] overflow-hidden">
        <img
          src={primaryImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
        />

        {/* Pricing tag */}
        <div className="absolute top-2.5 left-2.5">
          {getPricingLabel()}
        </div>

        {/* Save button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavourite(listing.id);
          }}
          className={`absolute top-2.5 right-2.5 p-1.5 rounded bg-white/90 text-charcoal hover:text-red-600 transition-colors ${
            isFav ? 'text-red-600' : 'text-charcoal-muted'
          }`}
          title="Save material"
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-600' : ''}`} />
        </button>

        {/* Status pill if completed/pending */}
        {listing.status !== 'active' && (
          <div className="absolute bottom-2.5 left-2.5 bg-charcoal/80 text-white text-[10px] uppercase font-medium px-2 py-0.5 rounded">
            {listing.status}
          </div>
        )}
      </div>

      {/* Info Body */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] text-charcoal-muted mb-1">
            <span>{listing.category?.name || 'Recyclable'}</span>
            <span className="font-medium text-charcoal">{listing.quantity} {listing.unit}</span>
          </div>

          <h3 className="font-heading font-semibold text-sm text-charcoal group-hover:text-forest transition-colors line-clamp-1">
            {listing.title}
          </h3>

          <p className="text-[12px] text-charcoal-muted mt-1 line-clamp-2 leading-relaxed">
            {listing.description}
          </p>
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#F0F0E6] flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1 text-charcoal-muted truncate">
            <MapPin className="w-3 h-3 text-forest shrink-0" />
            <span className="truncate">{listing.locality}, {listing.district}</span>
          </div>

          <Link
            to={`/marketplace/${listing.id}`}
            className="text-forest hover:text-forest-dark font-medium underline-offset-2 hover:underline ml-2 shrink-0"
          >
            Details
          </Link>
        </div>
      </div>
    </div>
  );
};
