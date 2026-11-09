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
  MessageSquare,
  MessageCircle,
  Repeat
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
import { isAiGeneratedImage, generateListingImage } from '../../services/imageGeneration';

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
    updateListing,
    isLoading 
  } = useData();
  const { currentUser } = useAuth();
  const { coords } = useGeolocation();

  const sourceListings = allMarketplaceListings && allMarketplaceListings.length > 0 ? allMarketplaceListings : listings;
  const inMemoryListing = sourceListings.find((l) => l.id === id);

  const [directListing, setDirectListing] = useState<WasteListing | null>(null);
  const [directLoading, setDirectLoading] = useState(false);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);

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
        setSuccessMessage('This is a sample listing for demonstration. On real listings, requests notify the owner and unlock WhatsApp contact upon acceptance.');
        setTimeout(() => {
          navigate('/marketplace');
        }, 2500);
        return;
      }

      const newRequestId = await createExchangeRequest(
        listing.id,
        requestedQuantity,
        proposedAction,
        message || `Requesting ${requestedQuantity} ${listing.unit} of ${listing.title}.`
      );
      setCreatedRequestId(newRequestId);
      setSuccessMessage('Request sent. When the owner accepts, you can chat directly on WhatsApp.');
    } catch (err: any) {
      alert(err.message || 'Failed to submit request');
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
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl p-3 flex items-center gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded">Sample</span>
              <span>This is a sample listing to demonstrate how materials are shared on GreenLoop.</span>
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
                <span className="font-label-sm text-xs text-primary font-bold bg-surface-container-lowest/90 backdrop-blur-xs px-3 py-1 rounded-full shadow-sm">
                  {listing.listing_type === 'free' ? 'Free' : listing.listing_type === 'exchange' ? 'Exchange' : `₹${listing.price}`}
                </span>
                {listing.is_demo && (
                  <span className="font-label-sm text-xs font-bold text-amber-800 bg-amber-100/95 dark:bg-amber-950/90 dark:text-amber-300 border border-amber-300 px-2.5 py-1 rounded-full shadow-sm">
                    Sample
                  </span>
                )}
              </div>
            </div>

            <div className="p-space-md sm:p-space-lg space-y-4">
              <div>
                <span className="font-label-sm text-xs text-secondary uppercase tracking-wider block font-semibold">
                  {category?.name || 'Recyclable Material'}
                </span>
                <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight mt-1">
                  {listing.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-on-surface-variant font-body-sm text-xs mt-2">
                  <span className="flex items-center gap-1 font-medium text-primary">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    {distanceKm !== null ? `${distanceKm} km • ` : ''}
                    {listing.locality ? `${listing.locality}, ` : ''}{listing.district}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-outline">
                    <Calendar className="w-3.5 h-3.5" /> Listed on {new Date(listing.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Material Specs */}
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 p-3 bg-surface-container rounded-lg border border-outline-variant/40">
                <div>
                  <span className="font-label-sm text-xs text-outline block">Quantity</span>
                  <span className="font-heading font-bold text-sm text-primary">{listing.quantity} {listing.unit}</span>
                </div>
                <div>
                  <span className="font-label-sm text-xs text-outline block">Condition</span>
                  <span className="font-heading font-semibold text-sm text-on-surface capitalize">{listing.condition}</span>
                </div>
                <div>
                  <span className="font-label-sm text-xs text-outline block">Listing Type</span>
                  <span className="font-heading font-semibold text-sm text-on-surface capitalize">
                    {listing.listing_type === 'free' ? 'Free' : listing.listing_type === 'exchange' ? 'Exchange' : 'For Sale'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-heading font-semibold text-base text-primary mb-1">
                  Details
                </h3>
                <p className="font-body text-sm text-on-surface-variant leading-relaxed">
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
                <span className="font-label-sm text-xs text-outline uppercase tracking-wider font-semibold">
                  Your Listing
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                  Active
                </span>
              </div>
              <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
                You created this listing. Requests from people nearby will appear here and in your exchanges page.
              </p>

              {/* Incoming proposals quick access */}
              {incomingRequests.length > 0 && (
                <div className="p-3 bg-surface-container rounded-lg space-y-2 border border-outline-variant/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary">
                      {incomingRequests.length} Request{incomingRequests.length > 1 ? 's' : ''} Received
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-[#25D366]" />
                      WhatsApp
                    </span>
                  </div>
                  <div className="space-y-2">
                    {incomingRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="flex items-center justify-between gap-2 text-xs bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/40">
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-on-surface truncate">
                            {req.requester?.full_name || 'Buyer'}
                          </p>
                          <p className="text-[10px] text-on-surface-variant">
                            {req.requested_quantity} {listing.unit} • <span className="capitalize font-medium">{req.status}</span>
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate('/exchanges')}
                        >
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                {isAiGeneratedImage(listing) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    fullWidth
                    disabled={isRegeneratingImage}
                    onClick={async () => {
                      if (!listing || !currentUser || listing.user_id !== currentUser.id) return;
                      setIsRegeneratingImage(true);
                      try {
                        const res = await generateListingImage({
                          title: listing.title,
                          material_type: listing.material_type,
                          category_slug: listing.category?.slug,
                          category_id: listing.category_id,
                          description: listing.description,
                          listing_id: listing.id,
                          user_id: currentUser.id,
                        });

                        if (res.image_url) {
                          await updateListing(listing.id, {
                            images: [res.image_url],
                            is_ai_image: true,
                          });
                          if (directListing) {
                            setDirectListing({
                              ...directListing,
                              images: [res.image_url],
                              is_ai_image: true,
                            });
                          }
                        }
                      } catch (err: any) {
                        alert(err.message || 'Failed to regenerate image');
                      } finally {
                        setIsRegeneratingImage(false);
                      }
                    }}
                    icon={<Sparkles className={`w-4 h-4 text-secondary ${isRegeneratingImage ? 'animate-spin' : ''}`} />}
                  >
                    {isRegeneratingImage ? 'Regenerating Photo...' : 'Regenerate Photo'}
                  </Button>
                )}

                <Button
                  variant="secondary"
                  fullWidth
                  onClick={() => navigate('/exchanges')}
                >
                  View Requests
                </Button>
                <button
                  type="button"
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to remove this listing?')) {
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
              <h3 className="font-heading font-semibold text-base text-primary">
                Request this Item
              </h3>

              {!currentUser && (
                <div className="p-3 bg-secondary-container/40 rounded-lg text-xs text-primary flex items-center justify-between border border-primary/20">
                  <span>Sign in to request this item and earn EcoPoints.</span>
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
                    <span>Request Sent</span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    {successMessage}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
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
                      <Repeat className="w-4 h-4 text-secondary" /> Active Request
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize bg-secondary-container text-primary">
                      {existingRequest.status}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    You have requested <strong>{existingRequest.requested_quantity} {listing.unit}</strong>. When the owner accepts, you can coordinate pickup on WhatsApp.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => navigate('/exchanges')}
                    >
                      View Request
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleRequestSubmit} className="space-y-3">
                  <Input
                    label={`Quantity (${listing.unit}) *`}
                    type="number"
                    min={1}
                    max={listing.quantity}
                    value={requestedQuantity}
                    onChange={(e) => setRequestedQuantity(Number(e.target.value))}
                    required
                  />

                  <div>
                    <label className="block font-label-md text-xs text-on-surface mb-1 font-semibold">
                      Intended Use *
                    </label>
                    <select
                      value={proposedAction}
                      onChange={(e) => setProposedAction(e.target.value)}
                      className="w-full bg-surface-container-lowest text-on-surface font-body-md text-xs rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
                    >
                      <option value="Composting & organic soil amendment">Composting & soil amendment</option>
                      <option value="Direct reuse or packaging">Reuse or packaging</option>
                      <option value="Mechanical recycling at registered centre">Recycling</option>
                      <option value="Artisanal upcycling / crafts">Upcycling / crafts</option>
                      <option value="Bio-gas generation / animal feed">Animal feed / biogas</option>
                    </select>
                  </div>

                  <Textarea
                    label="Message (optional)"
                    placeholder="e.g. Can pick up this weekend near your location..."
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
                    {submitting ? 'Sending Request...' : 'Send Request'}
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
