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
          className="inline-flex items-center gap-1.5 font-label-md text-xs text-on-surface-variant hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>

        <Link to="/ai-scanner">
          <Button variant="secondary" size="sm" icon={<Sparkles className="w-4 h-4 text-primary" />} fullWidth className="xs:w-auto">
            Auto-fill with Smart Scanner
          </Button>
        </Link>
      </div>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 mb-1">
          <Badge variant="brand">List Material</Badge>
          {aiClassified && (
            <Badge variant="active" icon={<Sparkles className="w-3 h-3" />}>
              Scanner Pre-Filled
            </Badge>
          )}
        </div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
          List Material for Circular Use
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Connect with nearby compost producers, terrace gardeners, upcyclers, or collection hubs across Kerala.
        </p>

        {!currentUser && (
          <div className="mt-2 p-3 bg-secondary-container/40 rounded-lg text-xs text-primary flex items-center justify-between border border-primary/20">
            <span>Listing as guest. Sign in to link this to your account and earn EcoPoints.</span>
            <Link
              to="/login"
              state={{ from: '/marketplace/new' }}
              className="font-bold underline hover:opacity-80 shrink-0 ml-2"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>

      <Card variant="elevated" className="p-6 sm:p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3.5 bg-error-container text-on-error-container rounded-lg text-body-sm font-medium border border-error/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{error}</span>
            </div>
          )}

          {/* Material Name, Type & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Material Title *"
              required
              placeholder="e.g. Dry Coconut Husks, Corrugated Cartons, Clean Glass Bottles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <Input
              label="Material / Composition"
              placeholder="e.g. PET Plastic #1, Coconut Coir, HDPE"
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
            />

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                Circular Category *
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
            label="Description & Condition Details *"
            required
            rows={3}
            placeholder="Describe the material condition, packaging, cleanliness, and any handling instructions for pickup..."
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
                Cleanliness / Condition *
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
              >
                <option value="clean/dry">Clean & Dry (Standard)</option>
                <option value="sorted">Separated & Sorted</option>
                <option value="washed">Washed / Sanitized</option>
                <option value="mixed">Mixed Recyclables</option>
                <option value="raw/unprocessed">Raw / Unprocessed</option>
              </select>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                Pricing / Exchange *
              </label>
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value as any)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
              >
                <option value="free">Free Donation (Recommended)</option>
                <option value="exchange">Barter Exchange</option>
                <option value="sale">Nominal Price (₹)</option>
              </select>
            </div>
          </div>

          {listingType === 'sale' && (
            <div className="max-w-xs">
              <Input
                label="Total Asking Price (₹) *"
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>
          )}

          {/* ========================================================================= */}
          {/* FEATURE 1: CLEARLY VISIBLE PICKUP LOCATION SELECTION SECTION              */}
          {/* ========================================================================= */}
          <div className="pt-4 border-t border-outline-variant/50 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <h2 className="font-heading font-bold text-title-md text-primary flex items-center gap-1.5">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span>Pickup Location in Kerala *</span>
                </h2>
                <p className="font-body-sm text-xs text-on-surface-variant">
                  Select your current GPS location or search for your town/locality. Coordinates are used to calculate distances for nearby users.
                </p>
              </div>

              {hasSelectedLocation && (
                <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full inline-flex items-center gap-1 self-start sm:self-auto">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  {latitude?.toFixed(4)}°N, {longitude?.toFixed(4)}°E
                </span>
              )}
            </div>

            {locationError && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 rounded-lg text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{locationError}</span>
              </div>
            )}

            {/* Selection Methods Grid: Option A & Option B */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Option A: Use My Current Location */}
              <div className="p-4 rounded-xl border border-outline-variant/70 bg-surface-container-low/50 hover:border-primary/40 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center">
                      A
                    </span>
                    <h3 className="font-semibold text-body-md text-on-surface">
                      Use My Current Location
                    </h3>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Automatically detect your precise GPS coordinates and reverse-geocode your Kerala locality and district.
                  </p>
                </div>

                <Button
                  type="button"
                  variant={locationSource === 'current' ? 'primary' : 'outline'}
                  size="md"
                  onClick={handleUseCurrentLocation}
                  disabled={isDetectingGps}
                  icon={isDetectingGps ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                  fullWidth
                >
                  {isDetectingGps
                    ? 'Detecting GPS Coordinates...'
                    : locationSource === 'current'
                    ? '✓ GPS Location Detected'
                    : 'Use My Current Location'}
                </Button>
              </div>

              {/* Option B: Search for a Location */}
              <div className="p-4 rounded-xl border border-outline-variant/70 bg-surface-container-low/50 hover:border-primary/40 transition-all flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full bg-primary-container text-on-primary font-bold text-xs flex items-center justify-center">
                      B
                    </span>
                    <h3 className="font-semibold text-body-md text-on-surface">
                      Search for a Location
                    </h3>
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">
                    Type your locality, village, town, or district in Kerala and select from autocomplete suggestions.
                  </p>
                </div>

                <LocationAutocomplete
                  onSelect={handleSelectAutocomplete}
                  selectedLocation={locationSource === 'search' ? selectedLocation : null}
                  placeholder="e.g. Cheruvathur, Kanhangad, Edappally, Aluva..."
                  onClear={handleClearLocation}
                />
              </div>
            </div>

            {/* Selected Location Summary Card */}
            {hasSelectedLocation && (
              <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-emerald-600 text-white shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-body-md text-emerald-950 dark:text-emerald-100">
                          {locality}, {district}
                        </span>
                        <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                          ({state}{pincode ? ` - ${pincode}` : ''})
                        </span>
                        <Badge variant="active">
                          {locationSource === 'current' ? 'GPS Detected' : 'Verified Autocomplete'}
                        </Badge>
                      </div>
                      <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 mt-0.5">
                        {formattedAddress || `${locality}, ${district}, Kerala`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsEditingLocationDetails(!isEditingLocationDetails)}
                      className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:underline inline-flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{isEditingLocationDetails ? 'Done Editing' : 'Edit Details'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleClearLocation}
                      className="text-xs font-semibold text-on-surface-variant hover:text-error inline-flex items-center gap-1"
                      title="Clear location"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Optional Landmark & Editable Fields */}
                <div className="pt-2 border-t border-emerald-200 dark:border-emerald-800/60 grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-12">
                    <Input
                      label="Pickup Landmark / Directions (Optional)"
                      placeholder="e.g. Near Municipal Bus Stand, Opp. Primary Health Centre, Gate No. 2"
                      value={landmarkAddress}
                      onChange={(e) => setLandmarkAddress(e.target.value)}
                      helperText="Public listings only display approximate locality. Exact residential street directions are only shared upon confirmed pickup."
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
                          <option value="">Select Kerala District</option>
                          {keralaDistricts.map((d) => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-6">
                        <Input
                          label="Ward / Locality Name *"
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
                    {isAiGeneratedImage({ images: [imageUrl], is_ai_image: isAiImage })
                      ? 'AI-Generated Illustrative Image'
                      : 'Material Photograph'}
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
                    alt="Material illustration"
                    className="w-20 h-20 rounded-lg object-cover border border-outline-variant/60 shrink-0"
                  />
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-semibold text-xs text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-secondary shrink-0" />
                      {isAiGeneratedImage({ images: [imageUrl], is_ai_image: isAiImage })
                        ? 'AI Illustrative Depiction'
                        : 'Attached Photograph'}
                    </span>
                    <span className="text-[11px] text-on-surface-variant leading-relaxed">
                      {isAiGeneratedImage({ images: [imageUrl], is_ai_image: isAiImage })
                        ? 'Realistic AI-generated depiction based on material name and circular category.'
                        : 'Optimized photograph attached for circular verification and discovery.'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Input
                  label="Photo Image URL (Optional)"
                  placeholder="https://... (or leave empty for automatic AI generation upon publishing)"
                  value={imageUrl}
                  onChange={(e) => {
                    setImageUrl(e.target.value);
                    setIsAiImage(false);
                  }}
                  helperText="Leave empty to automatically generate a realistic AI illustration upon publishing, or preview one below."
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
                        <span>Generating illustrative preview...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-secondary" />
                        <span>Preview AI Generated Image</span>
                      </>
                    )}
                  </button>
                  <span className="text-[11px] text-on-surface-variant">
                    (Automatically generated if left empty)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-outline-variant/40 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              fullWidth
              className="sm:w-auto"
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
              className="sm:w-auto"
              loading={submitting}
              disabled={submitting}
              icon={
                publishingStage === 'generating_image' ? (
                  <Sparkles className="w-4 h-4 text-tertiary-fixed animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )
              }
            >
              {publishingStage === 'generating_image'
                ? 'Generating listing image...'
                : publishingStage === 'publishing'
                ? 'Publishing Material Listing...'
                : submitting
                ? 'Publishing...'
                : 'Publish Material Listing'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
