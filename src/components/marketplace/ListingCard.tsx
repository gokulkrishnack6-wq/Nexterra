import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Sparkles, Heart, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { WasteListing } from '../../types';
import { useData } from '../../contexts/DataContext';

interface ListingCardProps {
  listing: WasteListing;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing }) => {
  const { favourites, toggleFavourite } = useData();
  const isFav = favourites.includes(listing.id);

  const getPricingBadge = () => {
    switch (listing.listing_type) {
      case 'free':
        return <span className="bg-lime text-forest-dark font-extrabold px-2.5 py-0.5 rounded-full text-xs">FREE</span>;
      case 'exchange':
        return <span className="bg-sage-light text-forest-dark font-bold px-2.5 py-0.5 rounded-full text-xs">EXCHANGE</span>;
      case 'sale':
        return <span className="bg-emerald-100 text-forest font-bold px-2.5 py-0.5 rounded-full text-xs">₹{listing.price}</span>;
      default:
        return null;
    }
  };

  const primaryImage = listing.images && listing.images.length > 0 
    ? listing.images[0] 
    : 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="bg-white rounded-2xl border border-sage/40 shadow-soft hover:shadow-elevated transition-all duration-300 overflow-hidden flex flex-col group">
      {/* Thumbnail & Badges */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={primaryImage}
          alt={listing.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Pricing Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {getPricingBadge()}
          {listing.ai_classified && (
            <span className="bg-forest-dark/90 backdrop-blur text-lime border border-lime/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Sparkles className="w-3 h-3 text-lime" /> AI Verified
            </span>
          )}
        </div>

        {/* Favourite Button */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleFavourite(listing.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur transition-all ${
            isFav 
              ? 'bg-red-500 text-white shadow-md' 
              : 'bg-white/80 text-slate-600 hover:bg-white hover:text-red-500'
          }`}
          title="Save to favourites"
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-white' : ''}`} />
        </button>

        {/* Category Pill at bottom of image */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur text-forest-dark text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-sm">
          {listing.category?.name || 'Recyclable'}
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Title & Quantity */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-heading font-bold text-base text-forest-dark group-hover:text-forest transition-colors line-clamp-1">
              {listing.title}
            </h3>
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
            {listing.description}
          </p>

          <div className="flex items-center gap-2 mb-3">
            <span className="bg-sage-light/60 text-forest-dark font-bold text-xs px-2.5 py-1 rounded">
              {listing.quantity} {listing.unit}
            </span>
            <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded capitalize">
              {listing.condition}
            </span>
          </div>
        </div>

        <div>
          {/* Location & Metadata */}
          <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1 text-slate-600 truncate">
              <MapPin className="w-3.5 h-3.5 text-forest shrink-0" />
              <span className="truncate">{listing.locality}, {listing.district}</span>
            </div>

            <span className="text-[11px] text-slate-400 shrink-0">
              {new Date(listing.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </div>

          {/* Action Link */}
          <Link
            to={`/marketplace/${listing.id}`}
            className="mt-3.5 w-full flex items-center justify-center gap-1.5 bg-offwhite hover:bg-forest text-forest hover:text-white border border-sage/60 font-semibold text-xs py-2 rounded-xl transition-all duration-200 group-hover:border-forest"
          >
            <span>View & Request</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};
