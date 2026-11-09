import React, { useState, useEffect } from 'react';
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
  Package,
  MessageSquare
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation, calculateDistanceKm } from '../../hooks/useGeolocation';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Input';
import { supabase } from '../../lib/supabase';
import { WasteListing } from '../../types';
import { ListingCardSkeleton } from '../../components/ui/Skeleton';
import { isAiGeneratedImage } from '../../services/imageGeneration';

export const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    listings, 
    allMarketplaceListings, 
    exchangeRequests,
    createExchangeRequest, 
    favourites, 
    toggleFavourite, 
    categories, 
    deleteListing, 
    isLoading 
  } = useData();
  const { currentUser } = useAuth();
  const { coords } = useGeolocation();

  const sourceListings = allMarketplaceListings && allMarketplaceListings.length > 0 ? allMarketplaceListings : listings;
  const inMemoryListing = sourceListings.find((l) => l.id === id);

  const [directListing, setDirectListing] = useState<WasteListing | null>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!inMemoryListing && id) {
      let isMounted = true;
      setDirectLoading(true);

      (async () => {
        try {
          const { data, error } = await supabase
            .from('listings')
            .select('*, category:waste_categories(*)')
            .eq('id', id)
            .maybeSingle();

          if (error || !data) {
            if (isMounted) setDirectLoading(false);
            return;
          }

          let sellerInfo = undefined;
          if (data.user_id) {
            const { data: prof } = await supabase
              .from('public_profiles')
              .select('id, full_name, avatar_url, role, district')
              .eq('id', data.user_id)
              .maybeSingle();
            sellerInfo = prof || undefined;
          }

          if (isMounted) {
            setDirectListing({
              ...data,
              user: sellerInfo,
            });
            setDirectLoading(false);
          }
        } catch {
          if (isMounted) setDirectLoading(false);
        }
      })();

      return () => {
        isMounted = false;
      };
    }
  }, [id, inMemoryListing]);

  const listing = inMemoryListing || directListing;

  const [requestedQuantity, setRequestedQuantity] = useState<number>(listing?.quantity || 1);
  const [proposedAction, setProposedAction] = useState('Composting & organic soil amendment');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Keep requestedQuantity synced if listing loads asynchronously
  useEffect(() => {
    if (listing?.quantity) {
      setRequestedQuantity(listing.quantity);
    }
  }, [listing?.quantity]);

  if ((isLoading || directLoading) && !listing) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7">
            <ListingCardSkeleton />
          </div>
          <div className="lg:col-span-5">
            <ListingCardSkeleton />
          </div>
        </div>
      </div>
    );
  }

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

  const existingRequest = currentUser && listing
    ? exchangeRequests.find((r) => r.listing_id === listing.id && r.requester_id === currentUser.id && r.status !== 'cancelled')
    : null;

  const incomingRequests = isOwner && listing
    ? exchangeRequests.filter((r) => r.listing_id === listing.id)
    : [];

  const distanceKm = coords && listing.latitude && listing.longitude
    ? calculateDistanceKm(coords.latitude, coords.longitude, listing.latitude, listing.longitude)
    : null;

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      navigate('/login', { state: { from: `/marketplace/${listing.id}` } });
      return;
    }

    if (currentUser.id === listing.user_id) {
      alert('You cannot submit an exchange request for your own listing.');
      return;
    }

    if (requestedQuantity <= 0 || requestedQuantity > listing.quantity) {
      alert(`Please enter a quantity between 1 and ${listing.quantity} ${listing.unit}`);
      return;
    }

    setSubmitting(true);
    try {
      if (listing.is_demo) {
        setSuccessMessage('Demo Mode: Exchange proposal simulated successfully for competition review! Real exchange requests are enabled on authentic community listings.');
        setTimeout(() => {
          navigate('/marketplace');
        }, 2500);
        return;
      }

      const newRequestId = await createExchangeRequest(
        listing.id,
        requestedQuantity,
        proposedAction,
        message || `Requesting ${requestedQuantity} ${listing.unit} of ${listing.title} for reuse.`
      );
      setCreatedRequestId(newRequestId);
      setSuccessMessage('Exchange request sent and saved to database. Private chat is open with the generator.');
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
          {listing.is_demo && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-heading font-semibold text-sm text-amber-900 dark:text-amber-200">
                  Location-Aware Competition Demonstration Listing
                </h4>
                <p className="font-body-sm text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  This sample material has been dynamically assigned to an authentic locality ({listing.locality}, {listing.district}) based on your current geographic reference point ({distanceKm !== null ? `${distanceKm} km away` : 'nearby'}). It demonstrates how local circular resources are surfaced to nearby residents.
                </p>
              </div>
            </div>
          )}

          <Card variant="elevated" className="overflow-hidden p-0 border border-outline-variant/70">
            <div className="aspect-[16/10] w-full bg-surface-container-low overflow-hidden relative">
              <img
                src={images[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                <span className="font-label-sm text-label-sm text-primary font-bold bg-secondary-container px-3 py-1 rounded-full shadow-sm">
                  {listing.listing_type === 'free' ? 'Free Claim' : listing.listing_type === 'exchange' ? 'Barter Exchange' : `₹${listing.price}`}
                </span>
                {listing.ai_classified && (
                  <span className="font-label-sm text-label-sm text-on-primary bg-primary-container px-3 py-1 rounded-full flex items-center gap-1 shadow-sm font-semibold">
                    <Sparkles className="w-3 h-3" /> Verified Material
                  </span>
                )}
                {isAiGeneratedImage(listing) && (
                  <span className="font-label-sm text-label-sm text-white bg-black/75 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm font-semibold border border-white/20">
                    <Sparkles className="w-3 h-3 text-secondary" /> AI Illustrative Image
                  </span>
                )}
              </div>
            </div>

            <div className="p-space-md sm:p-space-lg space-y-4">
              {isAiGeneratedImage(listing) && (
                <div className="p-3 rounded-xl bg-surface-container/60 border border-outline-variant/60 text-xs text-on-surface-variant flex items-start gap-2.5 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong className="text-primary font-semibold">AI-Generated Illustrative Image: </strong>
                    This image was automatically generated to help circular buyers identify the material type ({listing.material_type || listing.title}). It is an illustrative depiction and not an actual photograph of the seller's specific lot.
                  </p>
                </div>
              )}
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
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 p-3 bg-surface-container rounded-lg border border-outline-variant/40">
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

              {/* Circular Guidance if present */}
              {listing.suggested_action && (
                <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/60 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-secondary-container text-primary mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-heading font-semibold text-body-md text-primary block">
                      Smart Circular Suggestion
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
              <span>Location:</span>
              <span className="font-semibold text-primary">{listing.locality ? `${listing.locality}, ` : ''}{listing.district}</span>
            </div>
          </Card>

          {/* Request Form or Owner Controls */}
          {isOwner ? (
            <Card variant="flat" className="space-y-4 p-4 border border-outline-variant/60">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                  Your Published Listing
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                  Owner Active
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                You created this material listing. Incoming exchange proposals from nearby collectors will appear here and in your exchanges pipeline.
              </p>

              {/* Incoming proposals quick access */}
              {incomingRequests.length > 0 && (
                <div className="p-3 bg-surface-container rounded-lg space-y-2 border border-outline-variant/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">
                      {incomingRequests.length} Incoming Proposal{incomingRequests.length > 1 ? 's' : ''}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">
                      Direct Chat Active
                    </span>
                  </div>
                  <div className="space-y-2">
                    {incomingRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="flex items-center justify-between gap-2 text-xs bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/40">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-on-surface truncate">
                            {req.requester?.full_name || 'Collector'}
                          </p>
                          <p className="text-[10px] text-on-surface-variant">
                            {req.requested_quantity} {listing.unit} • <span className="capitalize font-medium">{req.status}</span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          icon={<MessageSquare className="w-3.5 h-3.5" />}
                          onClick={() => navigate(`/exchanges?req=${req.id}&chat=open`)}
                        >
                          Chat
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate('/exchanges')}
                >
                  View All Exchanges
                </Button>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to remove this listing from the marketplace?')) {
                      try {
                        await deleteListing(listing.id);
                        navigate('/marketplace');
                      } catch (err: any) {
                        alert(err.message || 'Failed to delete listing');
                      }
                    }
                  }}
                  className="w-full py-2 px-3 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
                >
                  Delete Listing
                </button>
              </div>
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
                <div className="p-4 bg-secondary-container text-primary rounded-xl text-body-sm font-medium border border-primary/20 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Proposal Sent Successfully</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {successMessage}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    {createdRequestId && (
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        icon={<MessageSquare className="w-3.5 h-3.5" />}
                        onClick={() => navigate(`/exchanges?req=${createdRequestId}&chat=open`)}
                      >
                        Message Generator
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate('/exchanges')}
                    >
                      View in Exchanges
                    </Button>
                  </div>
                </div>
              ) : existingRequest ? (
                <div className="p-4 bg-surface-container rounded-xl border border-outline-variant/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-semibold text-xs text-primary flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-secondary" /> Active Exchange Request
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize bg-secondary-container text-primary">
                      {existingRequest.status}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    You have an active proposal for <strong>{existingRequest.requested_quantity} {listing.unit}</strong>. Two-way private messaging is active to coordinate collection details.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      icon={<MessageSquare className="w-3.5 h-3.5" />}
                      onClick={() => navigate(`/exchanges?req=${existingRequest.id}&chat=open`)}
                    >
                      Open Private Chat
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate('/exchanges')}
                    >
                      View Exchange
                    </Button>
                  </div>
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
