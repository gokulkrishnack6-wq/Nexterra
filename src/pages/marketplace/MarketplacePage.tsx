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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DA] pb-5">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl lg:text-[34px] text-[#18251F] tracking-tight">
            Waste Marketplace
          </h1>
          <p className="font-sans text-sm text-[#6F776F] mt-1">
            Browse recyclable and reusable materials available across Kerala.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* View Mode Toggle: Grid vs Map */}
          <div className="inline-flex p-1 bg-[#F8F6EF] rounded-xl border border-[#E8E4DA]">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-[#103D2A] shadow-xs'
                  : 'text-[#6F776F] hover:text-[#18251F]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'map'
                  ? 'bg-white text-[#103D2A] shadow-xs'
                  : 'text-[#6F776F] hover:text-[#18251F]'
              }`}
              title="Map View"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
          </div>

          <Link to="/smart-match" className="flex-1 sm:flex-initial">
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#F8F6EF] text-[#18251F] border border-[#E8E4DA] rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-[0.98]">
              <Sparkles className="w-4 h-4 text-[#315F3B]" />
              <span>Smart Matches</span>
            </button>
          </Link>

          <Link to="/marketplace/new" className="flex-1 sm:flex-initial">
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#103D2A] hover:bg-[#08291D] text-white rounded-xl text-sm font-semibold shadow-xs transition-all active:scale-[0.98]">
              <Plus className="w-4 h-4 text-white" />
              <span>Add Listing</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Sync Error Alert Banner */}
      {dataError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <span>{dataError}</span>
          <button
            onClick={() => refreshData()}
            className="underline font-semibold ml-2 hover:opacity-80 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-gl-border rounded-2xl p-4 sm:p-5 shadow-card space-y-4">
        {/* Row 1: Location Filter */}
        <div className="p-3 bg-gl-cream/60 rounded-xl border border-gl-border/70 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1.5 text-gl-forest font-semibold shrink-0">
              <MapPin className="w-4 h-4 text-gl-forest" />
              <span className="font-sans">Location:</span>
            </div>

            <div className="flex-1 max-w-sm">
              <LocationAutocomplete
                placeholder="Search town or locality..."
                onSelect={handleSelectAutocomplete}
                initialValue={customRefLocation?.name || ''}
              />
            </div>

            <button
              onClick={handleUseGps}
              disabled={isDetectingGps}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-gl-cream border border-gl-border text-gl-charcoal rounded-xl text-xs font-semibold transition-colors shrink-0 disabled:opacity-50 shadow-xs"
              title="Use current location"
            >
              <Navigation className={`w-3.5 h-3.5 text-gl-forest ${isDetectingGps ? 'animate-spin' : ''}`} />
              <span>{isDetectingGps ? 'Locating...' : 'Use current location'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gl-sage-light text-gl-forest rounded-full text-xs font-semibold border border-gl-sage/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-gl-fresh" />
              <span>Near: {activeReferenceLabel}</span>
              {customRefLocation && (
                <button
                  onClick={handleClearRefLocation}
                  className="ml-1 hover:text-red-500 transition-colors"
                  title="Reset location"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {gpsNotice && (
          <div className="text-xs text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
            {gpsNotice}
          </div>
        )}

        {/* Row 2: Standard Filtering & Sorting */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Keyword Search */}
          <div className="sm:col-span-3 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gl-charcoal-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search materials (e.g. bottles, cartons)..."
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-gl-border hover:border-gl-sage focus:border-gl-forest focus:ring-2 focus:ring-gl-forest/20 rounded-xl text-xs text-gl-charcoal focus:outline-none transition-all placeholder:text-gl-charcoal-muted"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-gl-charcoal-muted hover:text-gl-charcoal"
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
              className="w-full px-3 py-2.5 bg-white border border-gl-border hover:border-gl-sage focus:border-gl-forest focus:ring-2 focus:ring-gl-forest/20 rounded-xl text-xs text-gl-charcoal focus:outline-none transition-all"
            >
              <option value="All Kerala">All Kerala</option>
              {keralaDistricts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Nearby Search Radius */}
          <div className="sm:col-span-2">
            <select
              value={selectedRadius}
              onChange={(e) => setSelectedRadius(e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-gl-border hover:border-gl-sage focus:border-gl-forest focus:ring-2 focus:ring-gl-forest/20 rounded-xl text-xs text-gl-charcoal focus:outline-none transition-all"
              title="Search radius"
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
              className="w-full px-3 py-2.5 bg-white border border-gl-border hover:border-gl-sage focus:border-gl-forest focus:ring-2 focus:ring-gl-forest/20 rounded-xl text-xs text-gl-charcoal focus:outline-none transition-all"
            >
              <option value="all">All Types</option>
              <option value="free">Free Only</option>
              <option value="exchange">Exchange</option>
              <option value="sale">For Sale</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 bg-white border border-gl-border hover:border-gl-sage focus:border-gl-forest focus:ring-2 focus:ring-gl-forest/20 rounded-xl text-xs text-gl-charcoal focus:outline-none transition-all"
            >
              <option value="nearest">Nearest First</option>
              <option value="newest">Newest First</option>
              <option value="quantity">Quantity (High-Low)</option>
            </select>
          </div>
        </div>

        {/* Category Horizontal Scrolling Chips */}
        <div className="pt-2 border-t border-gl-border/70 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all font-semibold ${
              selectedCategory === 'all'
                ? 'bg-gl-forest text-white shadow-xs'
                : 'bg-gl-cream hover:bg-gl-cream/80 text-gl-charcoal border border-gl-border'
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
                className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-gl-forest text-white font-semibold shadow-xs'
                    : 'bg-gl-cream hover:bg-gl-cream/80 text-gl-charcoal border border-gl-border font-medium'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

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
          title="No Listings Found"
          description="No listings match your current filters. Try changing your search or location."
          actionLabel="Add a Listing"
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
          <div className="p-3.5 bg-gl-cream/70 rounded-xl border border-gl-border text-xs text-gl-charcoal-muted flex items-center justify-between">
            <span>Showing <strong>{filteredListings.length}</strong> listings on the map. Click any pin to view details.</span>
            <button
              onClick={() => setViewMode('grid')}
              className="text-gl-forest font-semibold hover:underline inline-flex items-center gap-1"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
          </div>
        </div>
      ) : (
        /* Grid View (Three listing columns on large desktop screens) */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} referenceCoords={refCoords} />
          ))}
        </div>
      )}
    </div>
  );
};
