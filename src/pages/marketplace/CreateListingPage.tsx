import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
} from 'lucide-react';
import { useData, resolveCategoryId } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation, KERALA_DISTRICT_COORDS, findNearestDistrict } from '../../hooks/useGeolocation';
import { LocationAutocomplete } from '../../components/ui/LocationAutocomplete';
import { LocationSuggestion, reverseGeocodeCoordinates } from '../../services/geocoding';
import { 
  generateListingImage, 
  isAiGeneratedImage, 
  CATEGORY_ILLUSTRATIVE_FALLBACKS,
  NEUTRAL_MATERIAL_PLACEHOLDER,
  matchCuratedItemFallback 
} from '../../services/imageGeneration';
import { ListingPricing, ScanPrefillData } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input, Textarea } from '../../components/ui/Input';

export const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { categories, addListing, pendingScanPrefill, setPendingScanPrefill } = useData();
  const { currentUser } = useAuth();
  const { district: geoDistrict, locality: geoLocality, coords } = useGeolocation();

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

  const [imageUrl, setImageUrl] = useState('');
  const [isAiImage, setIsAiImage] = useState(false);
  const [publishingStage, setPublishingStage] = useState<'idle' | 'generating_image' | 'publishing'>('idle');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [aiClassified, setAiClassified] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | undefined>(undefined);
  const [suggestedAction, setSuggestedAction] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [prefillApplied, setPrefillApplied] = useState(false);
  const latestJobIdRef = useRef<string>('');

  // Synchronize asynchronous GPS / district detection when available on mobile/desktop
  useEffect(() => {
    if (locationSource === null && coords && latitude === null && longitude === null) {
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
      if (geoDistrict && !district) setDistrict(geoDistrict);
      if (geoLocality && !locality) setLocality(geoLocality);
      setLocationSource('current');
    }
  }, [coords, geoDistrict, geoLocality, locationSource, latitude, longitude, district, locality]);

  // Robust multi-tier scan data ingestion:
  // 1. React Router route state (location.state.prefillScan)
  // 2. Shared React in-memory context state (pendingScanPrefill)
  // 3. Browser sessionStorage fallback (greenloop_prefill_scan)
  useEffect(() => {
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
      if (scanData.image_url) setImageUrl(scanData.image_url);

      const resolved = resolveCategoryId(scanData.category_slug, categories);
      if (resolved) setCategoryId(resolved);

      // Suggest circular pricing based on suggested recovery action
      if (scanData.suggested_action === 'upcycling' || scanData.suggested_action === 'composting') {
        setListingType('free');
      }

      setPrefillApplied(true);
    }
  }, [location.state, pendingScanPrefill, categories, prefillApplied]);

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

    // Manual trigger for previewing AI image before publishing
  const handleGenerateAiPreview = async () => {
    if (!title || !title.trim()) {
      setError('Please enter a Material Title before generating an AI illustration.');
      return;
    }
    setError('');
    const jobId = `preview-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    latestJobIdRef.current = jobId;
    setIsGeneratingPreview(true);
    try {
      const selectedCat = categories.find((c) => c.id === categoryId);
      const res = await generateListingImage({
        title: title.trim(),
        category_id: categoryId,
        category_slug: selectedCat?.slug || 'other',
        material_type: materialType || title,
        condition,
        description: description.trim(),
        job_id: jobId,
      });

      // Avoid stale React state and race conditions
      if (latestJobIdRef.current !== jobId) return;

      if (res.image_url) {
        setImageUrl(res.image_url);
        setIsAiImage(true);
      }
    } catch (e: any) {
      if (latestJobIdRef.current !== jobId) return;
      setError('Could not generate AI preview image. A neutral placeholder or matching circular asset will be used upon publishing.');
    } finally {
      if (latestJobIdRef.current === jobId) {
        setIsGeneratingPreview(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!currentUser) {
      setError('Please sign in to publish your material listing to the marketplace.');
      return;
    }

    if (!title || !description || quantity <= 0) {
      setError('Please fill all required material fields.');
      return;
    }

    // Strict location validation
    if (!district || !locality || latitude === null || longitude === null) {
      setError('Please provide a valid pickup location in Kerala using either "Use My Current Location" or "Search for a Location".');
      return;
    }

    setSubmitting(true);

    try {
      let finalImages: string[] = [];
      let listingIsAiImage = isAiImage;

      // FEATURE 1: Check whether user uploaded / provided an image
      if (imageUrl && imageUrl.trim()) {
        // User provided an image (uploaded photo, camera snapshot, or valid URL)
        // Never replace user uploaded image
        finalImages = [imageUrl.trim()];
      } else {
        // Automatically generate AI illustrative image
        setPublishingStage('generating_image');
        const selectedCat = categories.find((c) => c.id === categoryId);
        const jobId = `publish-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

        try {
          const aiImageResult = await generateListingImage({
            title: title.trim(),
            category_id: categoryId,
            category_slug: selectedCat?.slug || 'other',
            material_type: materialType || title,
            condition,
            description: description.trim(),
            user_id: currentUser.id,
            job_id: jobId,
          });

          if (aiImageResult.image_url) {
            finalImages = [aiImageResult.image_url];
            listingIsAiImage = true;
          } else {
            const itemFallback = matchCuratedItemFallback(title.trim(), materialType, description.trim());
            finalImages = [itemFallback?.imageUrl || CATEGORY_ILLUSTRATIVE_FALLBACKS[selectedCat?.slug || 'other'] || NEUTRAL_MATERIAL_PLACEHOLDER];
            listingIsAiImage = true;
          }
        } catch (genErr) {
          console.warn('AI image generation fallback during publishing:', genErr);
          const itemFallback = matchCuratedItemFallback(title.trim(), materialType, description.trim());
          finalImages = [itemFallback?.imageUrl || CATEGORY_ILLUSTRATIVE_FALLBACKS[selectedCat?.slug || 'other'] || NEUTRAL_MATERIAL_PLACEHOLDER];
          listingIsAiImage = true;
        }
      }

      setPublishingStage('publishing');

      const finalAddress = landmarkAddress.trim()
        ? `${landmarkAddress.trim()}, ${formattedAddress || locality}`
        : (formattedAddress || `${locality}, ${district}, Kerala`);

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
        images: finalImages,
        is_ai_image: listingIsAiImage,
      });

      // Clear prefill caches ONLY after confirmed successful insert in Supabase
      setPendingScanPrefill(null);
      try {
        sessionStorage.removeItem('greenloop_prefill_scan');
      } catch (_) {}

      navigate(`/marketplace/${newId}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create listing. Please try again.');
    } finally {
      setSubmitting(false);
      setPublishingStage('idle');
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
          <span>Back to Marketplace</span>
        </button>

        <Link to="/scanner">
          <Button variant="secondary" size="sm" icon={<Sparkles className="w-4 h-4 text-gl-forest" />} fullWidth className="xs:w-auto rounded-xl">
            Scan Material
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-medium text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md">New Listing</span>
          {aiClassified && (
            <span className="text-[11px] font-medium text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#103D2A]" />
              Scanner Filled
            </span>
          )}
        </div>
        <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
          Add a Listing
        </h1>
        <p className="font-sans text-xs sm:text-sm text-[#5C6E66]">
          Share recyclable materials or reusable items with verified partners nearby.
        </p>

        {!currentUser && (
          <div className="mt-2 p-2.5 bg-[#F8F6EF] rounded-md text-xs text-[#5C6E66] flex items-center justify-between border border-[#E8E4DA]">
            <span>Listing as guest. Sign in to link this to your account and earn EcoPoints.</span>
            <Link
              to="/login"
              state={{ from: '/marketplace/new' }}
              className="font-medium text-[#103D2A] underline hover:opacity-80 shrink-0 ml-2"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-7 space-y-5 bg-white border border-[#E8E4DA] rounded-lg shadow-subtle">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-800 rounded-md text-xs font-medium border border-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Material Name, Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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

          {/* Optional Photo or Scanned / AI Material Photograph */}
          <div>
            {imageUrl ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-label-md text-label-md text-on-surface font-semibold">
                    Photo Preview
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setImageUrl('');
                      setIsAiImage(false);
                    }}
                    className="text-xs font-semibold text-error hover:underline flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Remove photo
                  </button>
                </div>
                <div className="relative inline-flex items-center gap-3.5 p-3 rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xs">
                  <img
                    src={imageUrl}
                    alt="Material preview"
                    className="w-20 h-20 rounded-lg object-cover border border-outline-variant/60 shrink-0"
                  />
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-semibold text-xs text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-secondary shrink-0" />
                      Listing Photo
                    </span>
                    <span className="text-[11px] text-on-surface-variant leading-relaxed">
                      Photo will be displayed on the marketplace card and details page.
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Photo (optional)"
                  placeholder="https://... (or leave empty to auto-generate a photo)"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setIsAiImage(false);
                  }}
                  helperText="Leave empty to automatically generate a photo based on your item title, or preview one below."
                />

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleGenerateAiPreview}
                    disabled={isGeneratingPreview || !title.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-xs font-semibold border border-outline-variant/60 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingPreview ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Generating preview...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-secondary" />
                        <span>Generate Photo Preview</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-on-surface-variant">
                    (Auto-generated if left empty)
                  </span>
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
              icon={
                publishingStage === 'generating_image' ? (
                  <Sparkles className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )
              }
            >
              {publishingStage === 'generating_image'
                ? 'Generating photo...'
                : publishingStage === 'publishing'
                ? 'Publishing listing...'
                : submitting
                ? 'Publishing...'
                : 'Publish Listing'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
