import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Sparkles,
  Navigation,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Edit3,
  X,
  Loader2,
  Save,
} from 'lucide-react';
import { useData, resolveCategoryId } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation, KERALA_DISTRICT_COORDS, findNearestDistrict } from '../../hooks/useGeolocation';
import { LocationAutocomplete } from '../../components/ui/LocationAutocomplete';
import { LocationSuggestion, reverseGeocodeCoordinates } from '../../services/geocoding';
import { WastePhotoUploader } from '../../components/marketplace/WastePhotoUploader';
import { cleanupListingPhotos } from '../../services/listingImageStorage';
import { ListingPricing, ScanPrefillData, WasteListing } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Input';

interface CreateListingPageProps {
  isEdit?: boolean;
}

export const CreateListingPage: React.FC<CreateListingPageProps> = ({ isEdit: isEditProp }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string }>();
  const { categories, addListing, updateListing, listings, allMarketplaceListings, pendingScanPrefill, setPendingScanPrefill } = useData();
  const { currentUser } = useAuth();
  const { district: geoDistrict, locality: geoLocality, coords } = useGeolocation();

  const isEdit = Boolean(isEditProp || params.id || location.pathname.endsWith('/edit'));
  const editListingId = params.id;

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);

  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [description, setDescription] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unit, setUnit] = useState('kg');
  const [listingType, setListingType] = useState<ListingPricing>('free');
  const [price, setPrice] = useState<number>(0);
  const [condition, setCondition] = useState('clean/dry');

  // Location State
  const [selectedLocation, setSelectedLocation] = useState<LocationSuggestion | null>(null);
  const [district, setDistrict] = useState(currentUser?.district || geoDistrict || '');
  const [locality, setLocality] = useState(geoLocality || '');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Kerala');
  const [pincode, setPincode] = useState('');
  const [formattedAddress, setFormattedAddress] = useState('');
  const [landmarkAddress, setLandmarkAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(coords?.latitude || null);
  const [longitude, setLongitude] = useState<number | null>(coords?.longitude || null);
  const [locationSource, setLocationSource] = useState<'current' | 'search' | 'manual' | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isEditingLocationDetails, setIsEditingLocationDetails] = useState(false);

  // Mandatory Waste Photographs State
  const [images, setImages] = useState<string[]>([]);
  const [newlyUploadedPaths, setNewlyUploadedPaths] = useState<string[]>([]);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  const [aiClassified, setAiClassified] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | undefined>(undefined);
  const [suggestedAction, setSuggestedAction] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [prefillApplied, setPrefillApplied] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const photoUploaderRef = useRef<HTMLDivElement>(null);

  // Populate data when in Edit Mode
  useEffect(() => {
    if (isEdit && editListingId && !initialLoadDone) {
      const allList = allMarketplaceListings || listings;
      const target = allList.find((l) => l.id === editListingId);

      if (target) {
        setTitle(target.title || '');
        setDescription(target.description || '');
        setMaterialType(target.material_type || '');
        setQuantity(Number(target.quantity) || 1);
        setUnit(target.unit || 'kg');
        setListingType(target.listing_type || 'free');
        setPrice(Number(target.price) || 0);
        setCondition(target.condition || 'clean/dry');
        setDistrict(target.district || '');
        setLocality(target.locality || '');
        setFormattedAddress(target.formatted_address || target.address || '');
        setLatitude(target.latitude);
        setLongitude(target.longitude);
        setImages(target.images && target.images.length > 0 ? target.images : []);

        const resolved = resolveCategoryId(target.category_id || (target as any).category?.slug, categories);
        if (resolved) setCategoryId(resolved);

        setInitialLoadDone(true);
      }
    }
  }, [isEdit, editListingId, listings, allMarketplaceListings, categories, initialLoadDone]);

  // Synchronize asynchronous GPS / district detection when available on mobile/desktop (create mode only)
  useEffect(() => {
    if (!isEdit && locationSource === null && coords && latitude === null && longitude === null) {
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      if (geoDistrict && !district) setDistrict(geoDistrict);
      if (geoLocality && !locality) setLocality(geoLocality);
      setLocationSource('current');
    }
  }, [isEdit, coords, geoDistrict, geoLocality, locationSource, latitude, longitude, district, locality]);

  // Multi-tier scan data ingestion (for new listings coming from Waste Scanner)
  useEffect(() => {
    if (isEdit) return;

    let scanData: ScanPrefillData | null = null;

    if (location.state && (location.state as any).prefillScan) {
      scanData = (location.state as any).prefillScan;
    } else if (pendingScanPrefill) {
      scanData = pendingScanPrefill;
    } else {
      try {
        const stored = sessionStorage.getItem('greenloop_prefill_scan');
        if (stored) scanData = JSON.parse(stored);
      } catch (e) {
        console.warn('Could not parse sessionStorage scan prefill:', e);
      }
    }

    if (scanData && !prefillApplied) {
      setTitle(scanData.title || '');
      setDescription(scanData.description || '');
      setMaterialType(scanData.material_type || scanData.title || '');
      setAiClassified(true);
      if (scanData.ai_confidence !== undefined) setAiConfidence(scanData.ai_confidence);
      if (scanData.suggested_action) setSuggestedAction(scanData.suggested_action);

      // If scanner provided an authentic photo capture, populate it
      if (scanData.image_url) {
        setImages([scanData.image_url]);
      }

      const resolved = resolveCategoryId(scanData.category_slug, categories);
      if (resolved) setCategoryId(resolved);

      if (scanData.suggested_action === 'upcycling' || scanData.suggested_action === 'composting') {
        setListingType('free');
      }

      setPrefillApplied(true);
    }
  }, [isEdit, location.state, pendingScanPrefill, categories, prefillApplied]);

  // Option A: Use My Current Location (Browser GPS)
  const handleUseCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setLocationError('Browser geolocation is unsupported on your device.');
      return;
    }

    setIsDetectingGps(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLatitude(lat);
        setLongitude(lon);

        try {
          const rev = await reverseGeocodeCoordinates(lat, lon);
          setSelectedLocation(rev);
          const detectedDist = rev.district || findNearestDistrict(lat, lon);
          const detectedLoc = rev.locality || rev.name || detectedDist;
          setDistrict(detectedDist);
          setLocality(detectedLoc);
          setCity(rev.city || detectedLoc);
          setState(rev.state || 'Kerala');
          setPincode(rev.pincode);
          setFormattedAddress(rev.fullAddress || `${detectedLoc}, ${detectedDist}, Kerala`);
          setLocationSource('current');
        } catch (err) {
          const fallbackDist = findNearestDistrict(lat, lon);
          setDistrict(fallbackDist);
          setLocality(fallbackDist);
          setFormattedAddress(`${fallbackDist}, Kerala, India`);
          setLocationSource('current');
        } finally {
          setIsDetectingGps(false);
        }
      },
      (geoErr) => {
        setIsDetectingGps(false);
        if (geoErr.code === 1) {
          setLocationError('GPS permission was denied. You can search for your town/locality using Option B below.');
        } else if (geoErr.code === 2) {
          setLocationError('GPS signal is unavailable. Please search for your location using Option B below.');
        } else if (geoErr.code === 3) {
          setLocationError('Location request timed out. Please try again or search using Option B below.');
        } else {
          setLocationError('Could not retrieve current location. Please search for your location below.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };

  // Option B: Search for a Location (Autocomplete selection)
  const handleSelectAutocomplete = (suggestion: LocationSuggestion) => {
    setSelectedLocation(suggestion);
    setLatitude(suggestion.latitude);
    setLongitude(suggestion.longitude);
    const chosenDist = suggestion.district || findNearestDistrict(suggestion.latitude, suggestion.longitude);
    const chosenLoc = suggestion.locality || suggestion.name || chosenDist;
    setDistrict(chosenDist);
    setLocality(chosenLoc);
    setCity(suggestion.city || chosenLoc);
    setState(suggestion.state || 'Kerala');
    setPincode(suggestion.pincode);
    setFormattedAddress(suggestion.fullAddress || suggestion.label || `${chosenLoc}, ${chosenDist}, Kerala`);
    setLocationSource('search');
    setLocationError(null);
  };

  const handleClearLocation = () => {
    setSelectedLocation(null);
    setLatitude(null);
    setLongitude(null);
    setDistrict('');
    setLocality('');
    setCity('');
    setPincode('');
    setFormattedAddress('');
    setLocationSource(null);
  };

  const handleStoragePathAdded = (path: string) => {
    setNewlyUploadedPaths((prev) => [...prev, path]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError('Please sign in to publish or update a waste material listing.');
      return;
    }

    // SECTION 1 & 3: Validate mandatory waste photographs
    if (!images || images.length === 0) {
      setHasAttemptedSubmit(true);
      setError('Upload at least one photo of the waste material to continue.');
      if (photoUploaderRef.current) {
        photoUploaderRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    if (!title.trim() || !description.trim() || quantity <= 0) {
      setError('Please fill all required material fields.');
      return;
    }

    if (!district || !locality || latitude === null || longitude === null) {
      setError('Please provide a valid pickup location in Kerala using either "Use current location" or "Search town or locality".');
      return;
    }

    setSubmitting(true);

    const finalAddress = landmarkAddress.trim()
      ? `${landmarkAddress.trim()}, ${formattedAddress || locality}`
      : (formattedAddress || `${locality}, ${district}, Kerala`);

    try {
      if (isEdit && editListingId) {
        // Edit existing listing
        await updateListing(editListingId, {
          title: title.trim(),
          description: description.trim(),
          material_type: materialType || title,
          category_id: categoryId || categories[0]?.id || 'cat-plastics',
          quantity,
          unit,
          listing_type: listingType,
          price: listingType === 'sale' ? price : 0,
          condition,
          district: district.trim(),
          locality: locality.trim(),
          address: finalAddress,
          formatted_address: finalAddress,
          latitude,
          longitude,
          images,
          is_ai_image: false,
        });

        navigate(`/marketplace/${editListingId}`);
      } else {
        // Create new listing
        const newId = await addListing({
          user_id: currentUser.id,
          category_id: categoryId || categories[0]?.id || 'cat-plastics',
          title: title.trim(),
          description: description.trim(),
          material_type: materialType || title,
          quantity,
          unit,
          listing_type: listingType,
          price: listingType === 'sale' ? price : 0,
          condition,
          district: district.trim(),
          locality: locality.trim(),
          address: finalAddress,
          city: city || locality,
          state: state || 'Kerala',
          pincode: pincode || undefined,
          formatted_address: finalAddress,
          latitude,
          longitude,
          status: 'active',
          ai_classified: aiClassified,
          ai_confidence: aiConfidence,
          suggested_action: suggestedAction,
          images,
          is_ai_image: false,
        });

        // Clear prefill caches upon confirmed successful creation
        setPendingScanPrefill(null);
        try {
          sessionStorage.removeItem('greenloop_prefill_scan');
        } catch (_) {}

        navigate(`/marketplace/${newId}`);
      }
    } catch (err: any) {
      console.error('Listing submission error:', err);
      // Clean up orphaned uploaded files if listing creation fails
      if (!isEdit && newlyUploadedPaths.length > 0) {
        cleanupListingPhotos(newlyUploadedPaths);
      }
      setError(err?.message || 'Failed to save listing. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasSelectedLocation = latitude !== null && longitude !== null && Boolean(district && locality);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Top Header */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2.5">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gl-charcoal-muted hover:text-gl-forest transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{isEdit ? 'Back to Listing' : 'Back to Marketplace'}</span>
        </button>

        {!isEdit && (
          <Link to="/scanner">
            <Button variant="secondary" size="sm" icon={<Sparkles className="w-4 h-4 text-gl-forest" />} fullWidth className="xs:w-auto rounded-xl">
              Scan Material
            </Button>
          </Link>
        )}
      </div>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-medium text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md">
            {isEdit ? 'Edit Mode' : 'New Listing'}
          </span>
          {aiClassified && !isEdit && (
            <span className="text-[11px] font-medium text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#103D2A]" />
              Scanner Filled
            </span>
          )}
        </div>
        <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
          {isEdit ? 'Edit Material Listing' : 'Add a Listing'}
        </h1>
        <p className="font-sans text-xs sm:text-sm text-[#5C6E66]">
          {isEdit
            ? 'Update your material details or replace photographs for verified recycling partners.'
            : 'Share recyclable materials or reusable items with verified partners nearby.'}
        </p>

        {!currentUser && (
          <div className="mt-2 p-2.5 bg-[#F8F6EF] rounded-md text-xs text-[#5C6E66] flex items-center justify-between border border-[#E8E4DA]">
            <span>Sign in to link this listing to your account and earn EcoPoints.</span>
            <Link
              to="/login"
              state={{ from: location.pathname }}
              className="font-medium text-[#103D2A] underline hover:opacity-80 shrink-0 ml-2"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-7 space-y-5 bg-white border border-[#E8E4DA] rounded-xl shadow-subtle">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 text-rose-800 rounded-xl text-xs font-medium border border-rose-200 flex items-start gap-2.5 shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* 1. MANDATORY WASTE PHOTOGRAPH FIELD */}
          <div ref={photoUploaderRef} className="pb-2">
            <WastePhotoUploader
              images={images}
              onChange={(nextImages) => {
                setImages(nextImages);
                if (nextImages.length > 0 && error.includes('photo')) {
                  setError('');
                }
              }}
              userId={currentUser?.id || 'guest'}
              listingId={editListingId}
              isEdit={isEdit}
              hasAttemptedSubmit={hasAttemptedSubmit}
              onNewStoragePathAdded={handleStoragePathAdded}
            />
          </div>

          {/* Material Name, Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-4 border-t border-[#E8E4DA]">
            <Input
              label="Item Title *"
              required
              placeholder="e.g. Cardboard boxes, glass bottles, coconut husks"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Input
              label="Material (optional)"
              placeholder="e.g. Cardboard, PET Plastic, Metal"
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
            />

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Material Description */}
          <Textarea
            label="Description *"
            required
            rows={3}
            placeholder="Describe the condition, quantity, and any pickup details..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Quantity, Unit, Condition & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="Quantity *"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  required
                />
              </div>
              <div className="w-24">
                <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                  Unit
                </label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
                >
                  <option value="kg">kg</option>
                  <option value="pieces">pcs</option>
                  <option value="litres">L</option>
                  <option value="sacks">sacks</option>
                  <option value="boxes">boxes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
              >
                <option value="clean/dry">Clean & Dry</option>
                <option value="sorted">Sorted</option>
                <option value="washed">Washed</option>
                <option value="mixed">Mixed</option>
                <option value="raw/unprocessed">Raw / Unprocessed</option>
              </select>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                Pricing *
              </label>
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value as any)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
              >
                <option value="free">Free</option>
                <option value="exchange">Exchange</option>
                <option value="sale">For Sale (₹)</option>
              </select>
            </div>
          </div>

          {listingType === 'sale' && (
            <div className="max-w-xs">
              <Input
                label="Price (₹) *"
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          )}

          {/* Unified Location Picker */}
          <div className="pt-4 border-t border-gl-border space-y-4">
            <div>
              <h2 className="font-heading font-bold text-base text-gl-charcoal flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gl-forest" />
                <span>Pickup Location *</span>
              </h2>
              <p className="text-xs text-gl-charcoal-muted mt-0.5">
                Select your location so buyers nearby can find your listing.
              </p>
            </div>

            {locationError && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{locationError}</span>
              </div>
            )}

            {/* Location Search Bar with Current Location Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex-1">
                <LocationAutocomplete
                  onSelect={handleSelectAutocomplete}
                  selectedLocation={locationSource === 'search' ? selectedLocation : null}
                  placeholder="Search town or locality (e.g. Edappally, Aluva, Cheruvathur)..."
                  onClear={handleClearLocation}
                />
              </div>

              <Button
                type="button"
                variant={locationSource === 'current' ? 'primary' : 'outline'}
                size="md"
                onClick={handleUseCurrentLocation}
                disabled={isDetectingGps}
                icon={isDetectingGps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                className="shrink-0 rounded-xl"
              >
                {isDetectingGps
                  ? 'Locating...'
                  : locationSource === 'current'
                  ? 'Location Found'
                  : 'Use current location'}
              </Button>
            </div>

            {/* Selected Location Display */}
            {hasSelectedLocation && (
              <div className="p-3.5 rounded-xl border border-gl-border bg-gl-cream/50 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gl-charcoal font-semibold text-sm">
                      📍 {locality}, {district}
                    </span>
                    <span className="text-xs text-gl-charcoal-muted">
                      ({state})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEditingLocationDetails(!isEditingLocationDetails)}
                      className="text-xs font-semibold text-gl-forest hover:underline inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditingLocationDetails ? 'Done' : 'Edit'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="text-xs font-semibold text-gl-charcoal-muted hover:text-error inline-flex items-center gap-1"
                      title="Clear location"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-outline-variant/40">
                  <div className="sm:col-span-12">
                    <Input
                      label="Landmark / Directions (optional)"
                      placeholder="e.g. Near bus stand, Opp. post office"
                      value={landmarkAddress}
                      onChange={(e) => setLandmarkAddress(e.target.value)}
                    />
                  </div>

                  {isEditingLocationDetails && (
                    <>
                      <div className="sm:col-span-6">
                        <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                          District *
                        </label>
                        <select
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
                          required
                        >
                          <option value="">Select District</option>
                          {keralaDistricts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-6">
                        <Input
                          label="Locality / Town *"
                          value={locality}
                          onChange={(e) => setLocality(e.target.value)}
                          required
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gl-border flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              fullWidth
              className="sm:w-auto rounded-xl"
              disabled={submitting}
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              className="sm:w-auto rounded-xl"
              loading={submitting}
              disabled={submitting}
              icon={isEdit ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            >
              {submitting
                ? isEdit ? 'Updating...' : 'Publishing...'
                : isEdit ? 'Save Changes' : 'Publish Listing'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
