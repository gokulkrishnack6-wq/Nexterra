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
  Repeat,
  Clock
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-5 text-left">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#E8E4DA] pb-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs text-[#5C6E66] hover:text-[#103D2A] font-medium transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Marketplace</span>
        </button>

        <button
          onClick={() => toggleFavourite(listing.id)}
          className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors shadow-subtle ${
            isFav 
              ? 'bg-white text-red-600 border-red-200' 
              : 'bg-white text-[#5C6E66] border-[#DCD6CB] hover:text-[#1C2826]'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-600 text-red-600' : ''}`} />
          <span>{isFav ? 'Saved' : 'Save Material'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col (7 cols): Images & Description */}
        <div className="lg:col-span-7 space-y-5">
          {listing.status === 'reserved' && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3 text-xs text-amber-950">
              <Clock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-sans font-medium text-xs text-amber-900">Exchange in Progress</h4>
                <p className="mt-0.5 text-amber-800 leading-relaxed">
                  This material batch has an accepted exchange request and is currently reserved for pickup. It remains visible in the marketplace until handover verification is completed.
                </p>
              </div>
            </div>
          )}

          {listing.is_demo && (
            <div className="bg-[#F8F6EF] border border-[#E8E4DA] rounded-lg p-3 flex items-center gap-2 text-xs text-[#5C6E66]">
              <span className="font-medium text-[11px] bg-[#E8EFE9] text-[#103D2A] px-2 py-0.5 rounded-md">Sample</span>
              <span>Demonstration listing illustrating material lifecycle on GreenLoop.</span>
            </div>
          )}

          <div className="bg-white rounded-lg border border-[#E8E4DA] overflow-hidden shadow-subtle">
            <div className="aspect-[16/10] w-full bg-[#F4F1EA] overflow-hidden relative">
              <img
                src={images[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                <span className="text-xs text-[#103D2A] font-medium bg-white/95 px-2.5 py-1 rounded-md shadow-subtle border border-[#E8E4DA]">
                  {listing.listing_type === 'free' ? 'Free' : listing.listing_type === 'exchange' ? 'Exchange' : `₹${listing.price}`}
                </span>
                {listing.is_demo && (
                  <span className="text-xs font-medium text-[#5C6E66] bg-white/95 border border-[#E8E4DA] px-2.5 py-1 rounded-md shadow-subtle">
                    Sample Stream
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-4">
              <div>
                <span className="text-[11px] text-[#103D2A] font-medium bg-[#E8EFE9] px-2 py-0.5 rounded-md w-fit inline-block">
                  {category?.name || 'Recyclable Material'}
                </span>
                <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight mt-2">
                  {listing.title}
                </h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[#5C6E66] font-sans text-xs mt-2">
                  <span className="flex items-center gap-1 font-medium text-[#103D2A]">
                    <MapPin className="w-3.5 h-3.5 text-[#103D2A]" />
                    {distanceKm !== null ? `${distanceKm} km • ` : ''}
                    {listing.locality ? `${listing.locality}, ` : ''}{listing.district}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#7B8B83]" /> Listed on {new Date(listing.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Material Specs */}
              <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 p-3.5 bg-[#F8F6EF] rounded-lg border border-[#E8E4DA]">
                <div>
                  <span className="text-xs text-[#5C6E66] block font-normal">Quantity</span>
                  <span className="font-sans font-medium text-sm text-[#103D2A]">{listing.quantity} {listing.unit}</span>
                </div>
                <div>
                  <span className="text-xs text-[#5C6E66] block font-normal">Condition</span>
                  <span className="font-sans font-medium text-sm text-[#1C2826] capitalize">{listing.condition}</span>
                </div>
                <div>
                  <span className="text-xs text-[#5C6E66] block font-normal">Listing Type</span>
                  <span className="font-sans font-medium text-sm text-[#1C2826] capitalize">
                    {listing.listing_type === 'free' ? 'Free' : listing.listing_type === 'exchange' ? 'Exchange' : 'For Sale'}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="font-sans font-medium text-sm text-[#1C2826] mb-1">
                  Material Details
                </h3>
                <p className="font-sans text-xs text-[#5C6E66] leading-relaxed">
                  {listing.description}
                </p>
              </div>

              {/* Circular Guidance if present */}
              {listing.suggested_action && (
                <div className="p-3.5 rounded-lg bg-[#E8EFE9] border border-[#C8D6C9] flex items-start gap-3">
                  <div className="p-1.5 rounded-md bg-white text-[#103D2A] mt-0.5 shadow-subtle">
                    <Sparkles className="w-3.5 h-3.5 text-[#103D2A]" />
                  </div>
                  <div>
                    <span className="font-sans font-medium text-xs text-[#103D2A] block">
                      Circular Action
                    </span>
                    <p className="font-sans text-xs text-[#5C6E66] mt-0.5">
                      Suggested: <strong className="capitalize text-[#1C2826] font-medium">{listing.suggested_action.replace('_', ' ')}</strong>
                      {listing.ai_confidence ? ` • Confidence ${Math.round(listing.ai_confidence * 100)}%` : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col (5 cols): Seller Card & Request Form */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Generator Info */}
          <div className="bg-white rounded-lg border border-[#E8E4DA] shadow-subtle p-4 space-y-3">
            <div className="flex items-center gap-3">
              {listing.user?.avatar_url ? (
                <img
                  src={listing.user.avatar_url}
                  alt={ownerName}
                  className="w-10 h-10 rounded-md object-cover ring-1 ring-[#E8E4DA]"
                />
              ) : (
                <div className="w-10 h-10 rounded-md bg-[#103D2A] text-white font-medium text-sm flex items-center justify-center">
                  {ownerInitial}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-sans font-medium text-sm text-[#1C2826]">
                    {ownerName}
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                </div>
                <span className="text-xs text-[#5C6E66] block capitalize">
                  {listing.user?.role || 'Community Member'} • {listing.district}
                </span>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#E8E4DA] flex items-center justify-between text-xs text-[#5C6E66]">
              <span>Location:</span>
              <span className="font-medium text-[#103D2A]">{listing.locality ? `${listing.locality}, ` : ''}{listing.district}</span>
            </div>
          </div>

          {/* Request Form or Owner Controls */}
          {isOwner ? (
            <div className="bg-white rounded-lg border border-[#E8E4DA] shadow-subtle p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5C6E66] font-medium">
                  Your Listing
                </span>
                <span className="px-2 py-0.5 rounded-md bg-[#E8EFE9] text-[#103D2A] text-xs font-medium">
                  Active
                </span>
              </div>
              <p className="text-xs text-[#5C6E66] leading-relaxed">
                You created this listing. Requests from people nearby will appear here and in your exchanges page.
              </p>

              {/* Incoming proposals quick access */}
              {incomingRequests.length > 0 && (
                <div className="p-3 bg-[#F8F6EF] rounded-md space-y-2 border border-[#E8E4DA]">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#103D2A]">
                      {incomingRequests.length} Request{incomingRequests.length > 1 ? 's' : ''} Received
                    </span>
                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <MessageCircle className="w-3 h-3 text-[#25D366]" />
                      WhatsApp
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {incomingRequests.slice(0, 3).map((req) => (
                      <div key={req.id} className="flex items-center justify-between gap-2 text-xs bg-white p-2 rounded-md border border-[#E8E4DA]">
                        <div className="min-w-0 pr-2">
                          <p className="font-medium text-[#1C2826] truncate">
                            {req.requester?.full_name || 'Buyer'}
                          </p>
                          <p className="text-[11px] text-[#5C6E66]">
                            {req.requested_quantity} {listing.unit} • <span className="capitalize">{req.status}</span>
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
                    icon={<Sparkles className={`w-3.5 h-3.5 text-[#103D2A] ${isRegeneratingImage ? 'animate-spin' : ''}`} />}
                  >
                    {isRegeneratingImage ? 'Regenerating Photo...' : 'Regenerate Photo'}
                  </Button>
                )}

                <Button
                  variant="secondary"
                  size="sm"
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
                  className="w-full py-1.5 px-3 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors"
                >
                  Delete Listing
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E8E4DA] shadow-subtle p-4 sm:p-5 space-y-3.5">
              <h3 className="font-sans font-medium text-sm text-[#103D2A]">
                Request this Item
              </h3>

              {!currentUser && (
                <div className="p-2.5 bg-[#F8F6EF] rounded-md text-xs text-[#5C6E66] flex items-center justify-between border border-[#E8E4DA]">
                  <span>Sign in to request this item and coordinate pickup.</span>
                  <Link
                    to="/login"
                    state={{ from: `/marketplace/${listing.id}` }}
                    className="font-medium text-[#103D2A] underline hover:opacity-80 shrink-0 ml-2"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {successMessage ? (
                <div className="p-3.5 bg-[#E8EFE9] text-[#103D2A] rounded-md text-xs font-medium border border-[#C8D6C9] space-y-2">
                  <div className="flex items-center gap-1.5 font-medium text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>Request Sent</span>
                  </div>
                  <p className="text-xs text-[#5C6E66] leading-relaxed">
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
                existingRequest.status === 'accepted' ? (
                  <div className="p-3.5 bg-[#E8EFE9] rounded-md border border-[#C8D6C9] text-[#103D2A] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-[#103D2A] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Request Accepted
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#25D366] text-white">
                        Accepted
                      </span>
                    </div>
                    <p className="text-xs text-[#5C6E66] leading-relaxed">
                      Your request has been accepted. Coordinate pickup on WhatsApp and provide your verification code at handover.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      onClick={() => navigate('/exchanges')}
                      className="w-full"
                    >
                      Open Exchange &amp; WhatsApp
                    </Button>
                  </div>
                ) : (
                  <div className="p-3.5 bg-[#F8F6EF] rounded-md border border-[#E8E4DA] space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-[#103D2A] flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 text-[#103D2A]" /> Active Request
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md capitalize bg-[#E8EFE9] text-[#103D2A]">
                        {existingRequest.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#5C6E66] leading-relaxed">
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
                )
              ) : listing.status === 'reserved' ? (
                <div className="p-3.5 bg-amber-50/80 rounded-md border border-amber-200 text-amber-950 space-y-2">
                  <div className="flex items-center gap-1.5 font-medium text-xs text-amber-900">
                    <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Material Batch Reserved</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    This material batch is currently reserved for an in-progress exchange. If the exchange is not completed, it will become available for requests again.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/marketplace')}
                    className="w-full text-xs"
                  >
                    Browse Other Materials
                  </Button>
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
                    <label className="block text-xs text-[#1C2826] mb-1 font-medium">
                      Intended Use *
                    </label>
                    <select
                      value={proposedAction}
                      onChange={(e) => setProposedAction(e.target.value)}
                      className="w-full bg-white text-[#1C2826] text-xs rounded-md border border-[#DCD6CB] hover:border-[#103D2A] focus:outline-none focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 py-1.5 px-2.5 transition-all"
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
                    size="md"
                    loading={submitting}
                    icon={<Send className="w-3.5 h-3.5" />}
                  >
                    {submitting ? 'Sending Request...' : 'Send Request'}
                  </Button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
