import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, X, Sparkles, Filter, Navigation, LayoutGrid, Map, MapPin, CheckCircle2 } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useGeolocation, KERALA_DISTRICT_COORDS, calculateDistanceKm } from '../../hooks/useGeolocation';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { KeralaCircularMap } from '../../components/maps/KeralaCircularMap';
import { LocationAutocomplete } from '../../components/ui/LocationAutocomplete';
import { LocationSuggestion, reverseGeocodeCoordinates } from '../../services/geocoding';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState, ListingCardSkeleton } from '../../components/ui/Skeleton';

export const MarketplacePage: React.FC = () => {
  const { listings, demoListings, allMarketplaceListings, categories, isLoading, dataError, refreshData } = useData();
  const { coords: geoCoords, district: detectedDistrict } = useGeolocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Fresh data from Supabase on mount
  useEffect(() => {
    refreshData();
  }, []);

  const sourceListings = allMarketplaceListings && allMarketplaceListings.length > 0 ? allMarketplaceListings : listings;

  const selectedCategory = searchParams.get('category') || 'all';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Kerala');
  const [selectedRadius, setSelectedRadius] = useState<string>('all');
  const [selectedPricing, setSelectedPricing] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nearest' | 'newest' | 'quantity'>('nearest');
  const [onlyAiVerified, setOnlyAiVerified] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  // Custom reference location selected by user via search or GPS button
  const [customRefLocation, setCustomRefLocation] = useState<{
    name: string;
    locality?: string;
    district?: string;
    latitude: number;
    longitude: number;
    source: 'gps' | 'search';
  } | null>(null);
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);

  // Geographic reference point calculation:
  // 1. Explicit user custom search location or GPS click
  // 2. User browser geolocation coords
  // 3. Selected district center
  // 4. Default to Ernakulam (central Kerala)
  const refCoords = useMemo(() => {
    if (customRefLocation) {
      return { latitude: customRefLocation.latitude, longitude: customRefLocation.longitude };
    }
    if (selectedDistrict && selectedDistrict !== 'All Kerala' && KERALA_DISTRICT_COORDS[selectedDistrict]) {
      if (detectedDistrict?.toLowerCase() === selectedDistrict.toLowerCase() && geoCoords?.latitude && geoCoords?.longitude) {
        return { latitude: geoCoords.latitude, longitude: geoCoords.longitude };
      }
      return KERALA_DISTRICT_COORDS[selectedDistrict];
    }
    if (geoCoords && geoCoords.latitude && geoCoords.longitude) {
      return { latitude: geoCoords.latitude, longitude: geoCoords.longitude };
    }
    if (detectedDistrict && KERALA_DISTRICT_COORDS[detectedDistrict]) {
      return KERALA_DISTRICT_COORDS[detectedDistrict];
    }
    return KERALA_DISTRICT_COORDS['Ernakulam'];
  }, [customRefLocation, geoCoords, selectedDistrict, detectedDistrict]);

  const activeReferenceLabel = useMemo(() => {
    if (customRefLocation) {
      return `${customRefLocation.locality ? `${customRefLocation.locality}, ` : ''}${customRefLocation.district || customRefLocation.name}`;
    }
    if (geoCoords && geoCoords.latitude && geoCoords.longitude) {
      return detectedDistrict ? `${detectedDistrict} (GPS)` : 'Your GPS Location';
    }
    if (selectedDistrict !== 'All Kerala') {
      return selectedDistrict;
    }
    return 'Kerala (Central)';
  }, [customRefLocation, geoCoords, detectedDistrict, selectedDistrict]);

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsNotice('Geolocation is not supported by your browser.');
      return;
    }
    setIsDetectingGps(true);
    setGpsNotice(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        try {
          const rev = await reverseGeocodeCoordinates(lat, lon);
          setCustomRefLocation({
            name: rev.name,
            locality: rev.locality,
            district: rev.district,
            latitude: lat,
            longitude: lon,
            source: 'gps',
          });
        } catch {
          setCustomRefLocation({
            name: 'Current Location',
            latitude: lat,
            longitude: lon,
            source: 'gps',
          });
        } finally {
          setIsDetectingGps(false);
        }
      },
      (err) => {
        setIsDetectingGps(false);
        if (err.code === 1) {
          setGpsNotice('Location permission was denied. You can search for your town below.');
        } else {
          setGpsNotice('Could not retrieve GPS coordinates. Please search for your town below.');
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const handleSelectAutocomplete = (suggestion: LocationSuggestion) => {
    setCustomRefLocation({
      name: suggestion.name,
      locality: suggestion.locality,
      district: suggestion.district,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      source: 'search',
    });
    setGpsNotice(null);
  };

  const handleClearRefLocation = () => {
    setCustomRefLocation(null);
    setGpsNotice(null);
  };

  const handleCategoryChange = (slug: string) => {
    if (slug === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  const filteredListings = useMemo(() => {
    const list = sourceListings.filter((listing) => {
      // 1. Category Filter (supports slug, ID, or nested category)
      if (selectedCategory !== 'all') {
        const cat = categories.find((c) => c.slug === selectedCategory || c.id === selectedCategory);
        const catId = cat?.id;
        const catSlug = cat?.slug || selectedCategory;
        const matchesCategory =
          listing.category_id === selectedCategory ||
          listing.category_id === catId ||
          listing.category_id === catSlug ||
          listing.category?.slug === catSlug ||
          listing.category?.id === catId ||
          (typeof listing.category_id === 'string' && listing.category_id.includes(catSlug));
        if (!matchesCategory) return false;
      }

      // 2. District Filter (case-insensitive & trimmed)
      if (selectedDistrict !== 'All Kerala') {
        const listingDistrict = (listing.district || '').trim().toLowerCase();
        const targetDistrict = selectedDistrict.trim().toLowerCase();
        if (listingDistrict !== targetDistrict) {
          return false;
        }
      }

      // 3. Search Radius Filter (Haversine distance calculation from active reference point)
      if (selectedRadius !== 'all' && refCoords) {
        const maxRadius = parseFloat(selectedRadius);
        if (!isNaN(maxRadius) && listing.latitude && listing.longitude) {
          const dist = calculateDistanceKm(
            refCoords.latitude,
            refCoords.longitude,
            listing.latitude,
            listing.longitude
          );
          if (dist > maxRadius) return false;
        }
      }

      // 4. Pricing Filter
      if (selectedPricing !== 'all' && listing.listing_type !== selectedPricing) {
        return false;
      }

      // 5. Material Verified Filter
      if (onlyAiVerified && !listing.ai_classified) {
        return false;
      }

      // 6. Search Keyword (title, description, locality, district, material_type)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = listing.title.toLowerCase().includes(query);
        const matchesDesc = listing.description?.toLowerCase().includes(query);
        const matchesLoc = listing.locality?.toLowerCase().includes(query);
        const matchesDistrict = listing.district?.toLowerCase().includes(query);
        const matchesMaterial = listing.material_type?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesDistrict && !matchesMaterial) return false;
      }

      return true;
    });

    // Sort order: nearest first by default when refCoords exists
    return list.sort((a, b) => {
      if (sortBy === 'nearest' && refCoords) {
        const distA = a.latitude && a.longitude ? calculateDistanceKm(refCoords.latitude, refCoords.longitude, a.latitude, a.longitude) : 9999;
        const distB = b.latitude && b.longitude ? calculateDistanceKm(refCoords.latitude, refCoords.longitude, b.latitude, b.longitude) : 9999;
        return distA - distB;
      }
      if (sortBy === 'quantity') {
        return b.quantity - a.quantity;
      }
      // default: newest
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [sourceListings, categories, selectedCategory, selectedDistrict, selectedRadius, selectedPricing, onlyAiVerified, searchTerm, sortBy, refCoords]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-1 flex-wrap">
            <Badge variant="brand">Circular Marketplace</Badge>
            <span className="text-outline text-xs">•</span>
            <span className="font-label-sm text-label-sm text-secondary">
              {filteredListings.length} materials in Kerala circulation
            </span>
            {demoListings?.length > 0 && (
              <>
                <span className="text-outline text-xs">•</span>
                <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/80 px-2 py-0.5 rounded-full font-label-sm text-[11px] font-medium inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  4 Location-Adapted Sample Listings (Demo)
                </span>
              </>
            )}
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            Waste Marketplace
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            Discover reusable, recyclable, and compostable resources available across Kerala.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* View Mode Toggle: Grid vs Map */}
          <div className="inline-flex p-0.5 bg-surface-container rounded-lg border border-outline-variant">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-label-sm text-xs font-semibold transition-all ${
                viewMode === 'map'
                  ? 'bg-surface-container-lowest text-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              title="Map View"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
          </div>

          <Link to="/smart-match" className="flex-1 sm:flex-initial">
            <Button variant="secondary" size="md" icon={<Sparkles className="w-4 h-4 text-primary" />} fullWidth className="sm:w-auto">
              Smart Match
            </Button>
          </Link>

          <Link to="/marketplace/new" className="flex-1 sm:flex-initial">
            <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} fullWidth className="sm:w-auto">
              List Material
            </Button>
          </Link>
        </div>
      </div>

      {/* Sync Error Alert Banner */}
      {dataError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
          <span>{dataError}</span>
          <button
            onClick={() => refreshData()}
            className="underline font-semibold ml-2 hover:opacity-80 shrink-0"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card variant="elevated" className="space-y-3 p-4">
        {/* Row 1: Location Discovery & Reference Anchor */}
        <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-primary font-semibold shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="font-label-sm">Discovery Center:</span>
            </div>

            <div className="flex-1 max-w-sm">
              <LocationAutocomplete
                placeholder="Search town/locality (e.g. Cheruvathur, Kanhangad, Aluva)..."
                onSelect={handleSelectAutocomplete}
                initialValue={customRefLocation?.name || ''}
              />
            </div>

            <button
              onClick={handleUseGps}
              disabled={isDetectingGps}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant text-on-surface rounded-lg font-label-sm text-xs font-medium transition-colors shrink-0 disabled:opacity-50"
              title="Anchor discovery to current browser GPS location"
            >
              <Navigation className={`w-3.5 h-3.5 text-primary ${isDetectingGps ? 'animate-spin' : ''}`} />
              <span>{isDetectingGps ? 'Locating...' : 'Use My GPS'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-secondary-container text-primary rounded-full font-label-sm text-xs font-semibold border border-primary/20">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
              <span>Near: {activeReferenceLabel}</span>
              {customRefLocation && (
                <button
                  onClick={handleClearRefLocation}
                  className="ml-1 hover:text-error transition-colors"
                  title="Reset to default location"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {gpsNotice && (
          <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-lg border border-amber-300/60">
            {gpsNotice}
          </div>
        )}

        {/* Row 2: Standard Filtering & Sorting */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Keyword Search */}
          <div className="sm:col-span-3 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-outline" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search materials (e.g. bottles, cartons)..."
              className="w-full pl-9 pr-8 py-2 bg-surface-container-lowest border border-outline-variant hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-on-surface focus:outline-none transition-all placeholder:text-outline"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-outline hover:text-on-surface"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* District Select */}
          <div className="sm:col-span-3">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-on-surface focus:outline-none transition-all"
            >
              <option value="All Kerala">All Kerala (14 Districts)</option>
              {keralaDistricts.map((d) => (
                <option key={d} value={d}>
                  {d} {d === detectedDistrict ? '(Near You)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Nearby Search Radius (5 km, 10 km, 25 km, 50 km, All Kerala) */}
          <div className="sm:col-span-2">
            <select
              value={selectedRadius}
              onChange={(e) => setSelectedRadius(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-on-surface focus:outline-none transition-all"
              title="Search radius from your reference location or selected district"
            >
              <option value="all">All Kerala</option>
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
            </select>
          </div>

          {/* Pricing Select */}
          <div className="sm:col-span-2">
            <select
              value={selectedPricing}
              onChange={(e) => setSelectedPricing(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-on-surface focus:outline-none transition-all"
            >
              <option value="all">All Pricing</option>
              <option value="free">Free Only</option>
              <option value="exchange">Exchange / Barter</option>
              <option value="sale">Nominal Sale</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-on-surface focus:outline-none transition-all"
            >
              <option value="nearest">Nearest First</option>
              <option value="newest">Newest First</option>
              <option value="quantity">Quantity (High-Low)</option>
            </select>
          </div>
        </div>

        {/* Category Horizontal Scrolling Chips */}
        <div className="pt-2 border-t border-outline-variant/40 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`px-3 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/50'
            }`}
          >
            All Categories ({sourceListings.length})
          </button>

          {categories.map((cat) => {
            const count = sourceListings.filter(
              (l) =>
                l.category_id === cat.id ||
                l.category_id === cat.slug ||
                l.category?.slug === cat.slug ||
                l.category?.id === cat.id ||
                (typeof l.category_id === 'string' && l.category_id.includes(cat.slug))
            ).length;
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-3 py-1 rounded-full font-label-sm text-label-sm whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-primary-container text-on-primary font-semibold shadow-sm'
                    : 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/50'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* Main Content Area: Loading Skeletons, Empty State, Grid View, or Map View */}
      {isLoading && sourceListings.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <ListingCardSkeleton />
          <ListingCardSkeleton />
          <ListingCardSkeleton />
          <ListingCardSkeleton />
        </div>
      ) : filteredListings.length === 0 ? (
        <EmptyState
          icon={<Filter className="w-6 h-6" />}
          title="No Materials Found"
          description={`There are currently no listings matching your criteria within ${selectedRadius === 'all' ? 'Kerala' : `${selectedRadius} km`} of ${activeReferenceLabel}. Be the first to list reusable materials!`}
          actionLabel="+ List Material Now"
          actionLink="/marketplace/new"
        />
      ) : viewMode === 'map' ? (
        /* Map View */
        <div className="space-y-4">
          <KeralaCircularMap
            centres={[]}
            wasteBins={[]}
            listings={filteredListings}
            initialFilter="listings"
            referenceCoords={refCoords}
          />
          <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/60 text-xs text-on-surface-variant flex items-center justify-between">
            <span>Showing <strong>{filteredListings.length}</strong> active material locations on the Kerala map. Click any pin to view details.</span>
            <button
              onClick={() => setViewMode('grid')}
              className="text-primary font-semibold hover:underline inline-flex items-center gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Switch to Grid View</span>
            </button>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} referenceCoords={refCoords} />
          ))}
        </div>
      )}
    </div>
  );
};
