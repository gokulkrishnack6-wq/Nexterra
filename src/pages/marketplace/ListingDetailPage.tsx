import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Heart,
  UserCheck
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { listings, createExchangeRequest, favourites, toggleFavourite, categories } = useData();
  const { currentUser } = useAuth();

  const listing = listings.find((l) => l.id === id);

  const [requestedQuantity, setRequestedQuantity] = useState<number>(listing?.quantity || 10);
  const [proposedAction, setProposedAction] = useState('Composting & organic soil amendment');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
        <h2 className="font-heading font-bold text-lg text-charcoal">Listing not found</h2>
        <p className="text-xs text-charcoal-muted">This material listing may have been completed or removed.</p>
        <Link to="/marketplace" className="inline-flex items-center text-xs text-forest font-semibold hover:underline">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to marketplace
        </Link>
      </div>
    );
  }

  const category = categories.find((c) => c.id === listing.category_id);
  const isOwner = listing.user_id === currentUser.id;
  const isFav = favourites.includes(listing.id);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestedQuantity <= 0 || requestedQuantity > listing.quantity) {
      alert(`Please enter a quantity between 1 and ${listing.quantity} ${listing.unit}`);
      return;
    }

    setSubmitting(true);
    try {
      createExchangeRequest(
        listing.id,
        requestedQuantity,
        proposedAction,
        message || `Requesting ${requestedQuantity} ${listing.unit} of ${listing.title} for reuse.`
      );
      setSuccessMessage('Exchange request sent. The generator will review your pickup proposal.');
      setTimeout(() => {
        navigate('/dashboard/exchanges');
      }, 1600);
    } catch (err: any) {
      alert(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80'];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs font-medium text-charcoal-muted hover:text-forest"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        <button
          onClick={() => toggleFavourite(listing.id)}
          className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${
            isFav 
              ? 'bg-white text-red-600 border-[#E2E2D8]' 
              : 'bg-white text-charcoal-muted border-[#E2E2D8] hover:text-charcoal'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-600' : ''}`} />
          <span>{isFav ? 'Saved' : 'Save'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image & Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-lg border border-[#E2E2D8] overflow-hidden">
            <div className="relative aspect-[16/10] w-full bg-[#EFEFE6]">
              <img
                src={images[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="bg-white/90 backdrop-blur text-charcoal font-semibold text-xs px-2.5 py-1 rounded border border-[#E2E2D8]">
                  {listing.listing_type === 'free' ? 'Free Material' : listing.listing_type === 'sale' ? `₹${listing.price}` : 'Exchange'}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <span className="text-[11px] font-semibold text-forest uppercase tracking-wider block">
                  {category?.name || 'Material'}
                </span>
                <h1 className="font-heading font-bold text-xl sm:text-2xl text-charcoal mt-1">
                  {listing.title}
                </h1>
              </div>

              {/* Specs table */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-cream rounded-md border border-[#E2E2D8] text-xs">
                <div>
                  <span className="text-[11px] text-charcoal-muted block">Available Quantity</span>
                  <span className="font-semibold text-charcoal text-sm mt-0.5 block">
                    {listing.quantity} {listing.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-charcoal-muted block">Condition</span>
                  <span className="font-semibold text-charcoal text-sm mt-0.5 block capitalize">
                    {listing.condition}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-charcoal-muted block">Status</span>
                  <span className="font-semibold text-forest text-sm mt-0.5 block capitalize">
                    {listing.status}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h3 className="font-heading font-semibold text-xs text-charcoal uppercase tracking-wider">
                  Description
                </h3>
                <p className="text-xs text-charcoal leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>

              {/* AI Guidance if present */}
              {listing.suggested_action && (
                <div className="p-3.5 bg-cream rounded-md border border-[#E2E2D8] text-xs space-y-1">
                  <span className="font-semibold text-forest block">Suggested Circular Action:</span>
                  <p className="text-charcoal-muted">
                    This material has been identified as suitable for <strong className="text-charcoal">{listing.suggested_action}</strong>.
                  </p>
                </div>
              )}

              {/* Location info */}
              <div className="pt-3 border-t border-[#F0F0E6] flex items-center justify-between text-xs text-charcoal-muted">
                <div className="flex items-center gap-1.5 text-charcoal">
                  <MapPin className="w-3.5 h-3.5 text-forest" />
                  <span>{listing.locality}, {listing.district}, Kerala</span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3 h-3" />
                  <span>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Exchange Request Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-lg border border-[#E2E2D8] p-5 space-y-5 sticky top-20">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F0E6]">
              <div>
                <h3 className="font-heading font-semibold text-sm text-charcoal">
                  Request Material
                </h3>
                <p className="text-[11px] text-charcoal-muted">Coordinate direct pickup with the generator.</p>
              </div>
            </div>

            {isOwner ? (
              <div className="p-4 bg-cream rounded-md border border-[#E2E2D8] text-center space-y-2 text-xs">
                <p className="font-medium text-charcoal">You posted this listing</p>
                <p className="text-charcoal-muted leading-relaxed">
                  Manage incoming pickup requests in your exchange management console.
                </p>
                <Link
                  to="/dashboard/exchanges"
                  className="inline-block text-xs font-semibold text-forest hover:underline pt-1"
                >
                  View requests →
                </Link>
              </div>
            ) : successMessage ? (
              <div className="p-4 bg-cream rounded-md border border-[#D5D5CA] text-center space-y-2">
                <CheckCircle2 className="w-6 h-6 text-forest mx-auto" />
                <p className="font-semibold text-xs text-charcoal">{successMessage}</p>
                <span className="text-[11px] text-charcoal-muted block">Redirecting to exchanges...</span>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-charcoal">Quantity to Request ({listing.unit})</label>
                    <span className="text-[11px] text-charcoal-muted">Max: {listing.quantity} {listing.unit}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={listing.quantity}
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
                  />
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1">
                    Your Proposed Purpose
                  </label>
                  <select
                    value={proposedAction}
                    onChange={(e) => setProposedAction(e.target.value)}
                    className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
                  >
                    <option value="Composting & organic soil amendment">Composting & Farm Soil Amendment</option>
                    <option value="Secondary sorting & mechanical recycling">Secondary Sorting & Recycling</option>
                    <option value="Upcycling into craft / planters">Upcycling / Creative Reuse</option>
                    <option value="Biogas / Biomethanation feed">Biogas / Bio-methanation Feed</option>
                    <option value="Community redistribution">Free Community Redistribution</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-charcoal mb-1">
                    Message to Generator (Pickup Timing / Vehicle)
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="E.g., I have a farm pickup vehicle and can collect these tomorrow around 5 PM."
                    className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 bg-forest hover:bg-forest-dark text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit Exchange Request'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
