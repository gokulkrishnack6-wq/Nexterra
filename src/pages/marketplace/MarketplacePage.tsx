import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, X, Filter, LayoutGrid, Map } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useGeolocation, KERALA_DISTRICT_COORDS, calculateDistanceKm } from '../../hooks/useGeolocation';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { KeralaCircularMap } from '../../components/maps/KeralaCircularMap';
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

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);

  // Geographic reference point calculation:
  // 1. User browser geolocation coords
  // 2. Selected district center
  // 3. Fallback to Ernakulam (central Kerala)
  const refCoords = useMemo(() => {
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
  }, [geoCoords, selectedDistrict, detectedDistrict]);

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E4DA] pb-4">
        <div>
          <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
            Waste Marketplace
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#5C6E66] mt-0.5">
            Browse recyclable and reusable secondary materials available across Kerala.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* View Mode Toggle: Grid vs Map */}
          <div className="inline-flex p-0.5 bg-[#F8F6EF] rounded-md border border-[#E8E4DA]">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white text-[#103D2A] shadow-subtle'
                  : 'text-[#5C6E66] hover:text-[#1C2826]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-white text-[#103D2A] shadow-subtle'
                  : 'text-[#5C6E66] hover:text-[#1C2826]'
              }`}
              title="Map View"
            >
              <Map className="w-3.5 h-3.5" />
              <span>Map</span>
            </button>
          </div>

          <Link to="/marketplace/new" className="flex-1 sm:flex-initial">
            <button className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#103D2A] hover:bg-[#0A261A] text-white rounded-md text-xs font-medium shadow-subtle transition-colors">
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Add Listing</span>
            </button>
          </Link>
        </div>
      </div>

      {/* Sync Error Alert Banner */}
      {dataError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center justify-between">
          <span>{dataError}</span>
          <button
            onClick={() => refreshData()}
            className="underline font-medium ml-2 hover:opacity-80 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-[#E8E4DA] rounded-lg p-3 sm:p-3.5 shadow-subtle space-y-2.5">
        {/* Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
          {/* Keyword Search */}
          <div className="sm:col-span-4 relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#7B8B83]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search materials (e.g. cartons, glass)..."
              className="w-full pl-8 pr-7 py-1.5 bg-white border border-[#DCD6CB] focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 rounded-md text-xs text-[#1C2826] focus:outline-none transition-all placeholder:text-[#7B8B83]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-[#7B8B83] hover:text-[#1C2826]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* District Select */}
          <div className="sm:col-span-2">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#DCD6CB] focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 rounded-md text-xs text-[#1C2826] focus:outline-none transition-all"
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
              className="w-full px-2.5 py-1.5 bg-white border border-[#DCD6CB] focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 rounded-md text-xs text-[#1C2826] focus:outline-none transition-all"
              title="Search radius"
            >
              <option value="all">Any Distance</option>
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
              className="w-full px-2.5 py-1.5 bg-white border border-[#DCD6CB] focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 rounded-md text-xs text-[#1C2826] focus:outline-none transition-all"
            >
              <option value="all">All Types</option>
              <option value="free">Free</option>
              <option value="exchange">Exchange</option>
              <option value="sale">For Sale</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="sm:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border border-[#DCD6CB] focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 rounded-md text-xs text-[#1C2826] focus:outline-none transition-all"
            >
              <option value="nearest">Nearest First</option>
              <option value="newest">Newest First</option>
              <option value="quantity">Quantity (High-Low)</option>
            </select>
          </div>
        </div>

        {/* Category Horizontal Scrolling Chips */}
        <div className="pt-2 border-t border-[#E8E4DA] flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors font-medium ${
              selectedCategory === 'all'
                ? 'bg-[#103D2A] text-white shadow-subtle'
                : 'bg-white hover:bg-[#F8F6EF] text-[#5C6E66] border border-[#E8E4DA]'
            }`}
          >
            All Materials ({sourceListings.length})
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
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors font-medium ${
                  isSelected
                    ? 'bg-[#103D2A] text-white shadow-subtle'
                    : 'bg-white hover:bg-[#F8F6EF] text-[#5C6E66] border border-[#E8E4DA]'
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
