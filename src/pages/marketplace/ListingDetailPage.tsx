import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  Sparkles, 
  Calendar, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  ShieldCheck, 
  AlertCircle, 
  Share2, 
  Heart,
  Recycle,
  Scale
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
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-heading font-bold text-forest-dark">Listing Not Found</h2>
        <p className="text-xs text-slate-500">The listing you are trying to view might have been completed or removed.</p>
        <Link to="/marketplace" className="inline-flex items-center text-xs text-forest font-bold hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Marketplace
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
        message || `Requesting ${requestedQuantity} ${listing.unit} of ${listing.title} for circular reuse.`
      );
      setSuccessMessage('Exchange request sent successfully! The generator has been notified.');
      setTimeout(() => {
        navigate('/dashboard/exchanges');
      }, 1800);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-forest-dark"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleFavourite(listing.id)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isFav ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-red-600' : ''}`} />
            <span>{isFav ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Image Gallery & Material Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-sage/40 shadow-soft overflow-hidden">
            <div className="relative h-80 sm:h-96 w-full bg-slate-100">
              <img
                src={images[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="bg-forest text-lime font-black px-3 py-1 rounded-full text-xs shadow-md uppercase">
                  {listing.listing_type}
                </span>
                {listing.ai_classified && (
                  <span className="bg-forest-dark/90 backdrop-blur text-lime border border-lime/30 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 text-lime" /> AI Classified ({listing.ai_confidence}%)
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs font-bold text-forest uppercase tracking-wider">
                  {category?.name || 'Recyclable'}
                </span>
                <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-forest-dark mt-1">
                  {listing.title}
                </h1>
              </div>

              {/* Material Quick Specs */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-offwhite rounded-2xl border border-sage/30 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Available Quantity</span>
                  <span className="font-heading font-black text-base text-forest-dark">
                    {listing.quantity} {listing.unit}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Condition</span>
                  <span className="font-bold text-forest capitalize block mt-0.5">
                    {listing.condition}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Price</span>
                  <span className="font-heading font-black text-base text-forest-dark">
                    {listing.listing_type === 'free' ? 'FREE' : `₹${listing.price}`}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-heading font-bold text-sm text-forest-dark mb-1">
                  Material Details & Context
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </p>
              </div>

              {/* AI Guidance Insights if present */}
              {listing.suggested_action && (
                <div className="p-4 bg-lime/15 border border-lime/30 rounded-2xl space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-forest-dark">
                    <Sparkles className="w-4 h-4 text-forest" />
                    <span>Recommended Circular Route:</span>
                    <span className="uppercase text-forest">{listing.suggested_action}</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Calculated optimal redistribution route according to Kerala State Pollution Control Board guidance.
                  </p>
                </div>
              )}

              {/* Location details */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-forest" />
                  <span className="font-medium text-slate-700">
                    {listing.locality}, {listing.district}, Kerala
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Posted {new Date(listing.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Exchange Request Action Card */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 space-y-6 sticky top-24">
            {/* Generator Profile Preview */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 border border-forest/30 flex items-center justify-center font-bold text-forest text-sm">
                  {listing.locality.charAt(0)}
                </div>
                <div>
                  <h4 className="font-heading font-bold text-xs text-forest-dark">
                    Waste Generator
                  </h4>
                  <p className="text-[11px] text-slate-500">{listing.district} Cluster</p>
                </div>
              </div>
              <span className="bg-sage-light text-forest font-bold px-2.5 py-0.5 rounded text-[11px] uppercase">
                Verified
              </span>
            </div>

            {/* Request Form or Owner Notice */}
            {isOwner ? (
              <div className="p-4 bg-sage-light/40 rounded-2xl border border-sage text-center space-y-2">
                <p className="text-xs font-bold text-forest-dark">This is your listing</p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  You can track incoming collection requests and manage handovers in your dashboard.
                </p>
                <Link
                  to="/dashboard/exchanges"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-forest hover:underline"
                >
                  <span>Go to Exchange Management →</span>
                </Link>
              </div>
            ) : successMessage ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-heading font-bold text-sm text-emerald-900">
                  Request Dispatched!
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {successMessage}
                </p>
                <span className="text-[11px] text-emerald-600 block">Redirecting to exchanges dashboard...</span>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                    <label>Quantity to Request ({listing.unit})</label>
                    <span className="text-[11px] text-slate-400">Max: {listing.quantity} {listing.unit}</span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={listing.quantity}
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 bg-offwhite border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-forest text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Proposed Circular Action
                  </label>
                  <select
                    value={proposedAction}
                    onChange={(e) => setProposedAction(e.target.value)}
                    className="w-full px-3 py-2 bg-offwhite border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-forest text-slate-800"
                  >
                    <option value="Composting & organic soil amendment">Composting & Farm Soil Amendment</option>
                    <option value="Mechanical Recycling & Shredding">Secondary Sorting & Mechanical Recycling</option>
                    <option value="Upcycling into craft / planters">Upcycling into Plant Pots / Crafts</option>
                    <option value="Biogas / Biomethanation feed">Biogas / Bio-methanation Feed</option>
                    <option value="Community redistribution">Community Free Reuse & Redistribution</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Message to Generator (Pickup Timing / Vehicle)
                  </label>
                  <textarea
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="E.g., I have a farm pickup vehicle and can collect these vegetable peels this evening around 5 PM."
                    className="w-full px-3 py-2 bg-offwhite border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-forest text-slate-800 resize-none"
                  />
                </div>

                {/* EcoPoints Preview */}
                <div className="p-3 bg-sage-light/50 border border-sage/60 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-forest-dark font-medium">
                    <Sparkles className="w-4 h-4 text-forest" />
                    <span>Reward upon collection:</span>
                  </div>
                  <span className="font-bold text-forest bg-white px-2 py-0.5 rounded shadow-sm">
                    +30 EcoPoints
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-forest hover:bg-forest-dark text-white rounded-xl text-xs font-bold shadow-md hover:shadow-elevated transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Send className="w-4 h-4 text-lime" />
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

