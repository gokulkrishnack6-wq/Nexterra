import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  MapPin, 
  Calendar, 
  ArrowLeft, 
  Send, 
  CheckCircle2, 
  Heart,
  Sparkles,
  ShieldCheck,
  Package
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation, calculateDistanceKm } from '../../hooks/useGeolocation';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { listings, createExchangeRequest, favourites, toggleFavourite, categories } = useData();
  const { currentUser } = useAuth();
  const { coords } = useGeolocation();

  const listing = listings.find((l) => l.id === id);

  const [requestedQuantity, setRequestedQuantity] = useState<number>(listing?.quantity || 1);
  const [proposedAction, setProposedAction] = useState('Composting & organic soil amendment');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  if (!listing) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
        <h2 className="font-heading font-bold text-xl text-primary">Listing Not Found</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">This material listing may have been completed, expired, or removed.</p>
        <Link to="/marketplace">
          <Button variant="secondary" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Back to Marketplace
          </Button>
        </Link>
      </div>
    );
  }

  const category = categories.find((c) => c.id === listing.category_id || c.slug === listing.category_id);
  const isOwner = currentUser && listing.user_id === currentUser.id;
  const isFav = favourites.includes(listing.id);

  const distanceKm = coords && listing.latitude && listing.longitude
    ? calculateDistanceKm(coords.latitude, coords.longitude, listing.latitude, listing.longitude)
    : null;

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      navigate('/login', { state: { from: `/marketplace/${listing.id}` } });
      return;
    }

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
      setSuccessMessage('Exchange request sent. The material generator will review your proposal.');
      setTimeout(() => {
        navigate('/exchanges');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit exchange proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const images = listing.images && listing.images.length > 0
    ? listing.images
    : ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80'];

  const ownerName = listing.user?.full_name || 'Community Member';
  const ownerInitial = ownerName.trim().charAt(0).toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 font-label-md text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>

        <button
          onClick={() => toggleFavourite(listing.id)}
          className={`px-3 py-1.5 rounded-lg border text-xs font-label-md flex items-center gap-1.5 transition-colors ${
            isFav 
              ? 'bg-surface-container-lowest text-error border-error/30' 
              : 'bg-surface-container-lowest text-on-surface-variant border-outline-variant hover:text-on-surface'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-error text-error' : ''}`} />
          <span>{isFav ? 'Saved' : 'Save Material'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Col (7 cols): Images & Description */}
        <div className="lg:col-span-7 space-y-6">
          <Card variant="elevated" className="overflow-hidden p-0 border border-outline-variant/70">
            <div className="aspect-[16/10] w-full bg-surface-container-low overflow-hidden relative">
              <img
                src={images[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="font-label-sm text-label-sm text-primary font-bold bg-secondary-container px-3 py-1 rounded-full shadow-sm">
                  {listing.listing_type === 'free' ? 'Free Claim' : listing.listing_type === 'exchange' ? 'Barter Exchange' : `₹${listing.price}`}
                </span>
                {listing.ai_classified && (
                  <span className="font-label-sm text-label-sm text-on-primary bg-primary-container px-3 py-1 rounded-full flex items-center gap-1 shadow-sm font-semibold">
                    <Sparkles className="w-3 h-3" /> AI Verified
                  </span>
                )}
              </div>
            </div>

            <div className="p-space-md sm:p-space-lg space-y-4">
              <div>
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block font-semibold">
                  {category?.name || 'Recyclable Material'}
                </span>
                <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight mt-1">
                  {listing.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-on-surface-variant font-body-sm text-body-sm mt-2">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {distanceKm !== null ? `${distanceKm} km away • ` : ''}
                    {listing.locality}, {listing.district}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-outline" /> Listed on {new Date(listing.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Material Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-surface-container rounded-lg border border-outline-variant/40">
                <div>
                  <span className="font-label-sm text-label-sm text-outline block">Available Quantity</span>
                  <span className="font-heading font-bold text-body-lg text-primary">{listing.quantity} {listing.unit}</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-outline block">Condition</span>
                  <span className="font-heading font-semibold text-body-md text-on-surface capitalize">{listing.condition}</span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-outline block">Circularity Mode</span>
                  <span className="font-heading font-semibold text-body-md text-on-surface capitalize">{listing.listing_type}</span>
                </div>
              </div>

              <div>
                <h3 className="font-heading font-semibold text-title-md text-primary mb-1">
                  Material Details & Context
                </h3>
                <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
                  {listing.description}
                </p>
              </div>

              {/* AI Guidance if present */}
              {listing.suggested_action && (
                <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-secondary-container text-primary mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-heading font-semibold text-body-md text-primary block">
                      AI Circular Suggestion
                    </span>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                      Suggested Action: <strong className="capitalize text-primary">{listing.suggested_action.replace('_', ' ')}</strong>
                      {listing.ai_confidence ? ` • Confidence ${Math.round(listing.ai_confidence * 100)}%` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Col (5 cols): Seller Card & Request Form */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Generator Info */}
          <Card variant="elevated" className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              {listing.user?.avatar_url ? (
                <img
                  src={listing.user.avatar_url}
                  alt={ownerName}
                  className="w-12 h-12 rounded-full object-cover ring-1 ring-outline-variant"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary font-bold text-base flex items-center justify-center ring-1 ring-outline-variant">
                  {ownerInitial}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-heading font-semibold text-title-md text-on-surface">
                    {ownerName}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <span className="font-body-sm text-body-sm text-outline block capitalize">
                  {listing.user?.role || 'Community Member'} • {listing.district}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-outline-variant/40 flex items-center justify-between text-body-sm text-on-surface-variant">
              <span>EcoPoints Balance:</span>
              <span className="font-semibold text-primary">{listing.user?.eco_points_balance ?? 0} PTS</span>
            </div>
          </Card>

          {/* Request Form or Owner Controls */}
          {isOwner ? (
            <Card variant="flat" className="space-y-3 p-4">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Your Published Listing
              </span>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                You created this material listing. Incoming exchange proposals from nearby collectors will appear in your exchanges pipeline.
              </p>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/exchanges')}
              >
                View My Exchanges
              </Button>
            </Card>
          ) : (
            <Card variant="elevated" className="space-y-4 p-5">
              <h3 className="font-heading font-semibold text-title-md text-primary">
                Propose Material Exchange
              </h3>

              {!currentUser && (
                <div className="p-3 bg-secondary-container/40 rounded-lg text-xs text-primary flex items-center justify-between border border-primary/20">
                  <span>Sign in to request this material and earn EcoPoints.</span>
                  <Link
                    to="/login"
                    state={{ from: `/marketplace/${listing.id}` }}
                    className="font-bold underline hover:opacity-80 shrink-0 ml-2"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {successMessage ? (
                <div className="p-4 bg-secondary-container text-primary rounded-lg text-body-sm font-medium border border-primary/20 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4" /> Request Submitted
                  </div>
                  <p>{successMessage}</p>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-3">
                  <Input
                    label={`Requested Quantity (Max ${listing.quantity} ${listing.unit}) *`}
                    type="number"
                    min={1}
                    max={listing.quantity}
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(Number(e.target.value))}
                    required
                  />

                  <div>
                    <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                      Proposed Circular Purpose *
                    </label>
                    <select
                      value={proposedAction}
                      onChange={(e) => setProposedAction(e.target.value)}
                      className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
                    >
                      <option value="Composting & organic soil amendment">Composting & organic soil amendment</option>
                      <option value="Direct reuse or packaging">Direct reuse or packaging</option>
                      <option value="Mechanical recycling at registered centre">Mechanical recycling at registered centre</option>
                      <option value="Artisanal upcycling / crafts">Artisanal upcycling / crafts</option>
                      <option value="Bio-gas generation / animal feed">Bio-gas generation / animal feed</option>
                    </select>
                  </div>

                  <Textarea
                    label="Message to Generator"
                    placeholder="e.g. Can pick up this weekend near your locality..."
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    size="lg"
                    loading={submitting}
                    icon={<Send className="w-4 h-4" />}
                  >
                    {submitting ? 'Submitting Proposal...' : 'Submit Pickup Proposal'}
                  </Button>
                </form>
              )}
            </Card>
          )}

        </div>
      </div>
    </div>
  );
};
