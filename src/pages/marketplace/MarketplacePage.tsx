import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, X, Sparkles, Filter, Navigation } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useGeolocation, KERALA_DISTRICT_COORDS, calculateDistanceKm } from '../../hooks/useGeolocation';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState, ListingCardSkeleton } from '../../components/ui/Skeleton';

export const MarketplacePage: React.FC = () => {
  const { listings, demoListings, allMarketplaceListings, categories, isLoading } = useData();
  const { coords, district: detectedDistrict } = useGeolocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const sourceListings = allMarketplaceListings && allMarketplaceListings.length > 0 ? allMarketplaceListings : listings;

  const selectedCategory = searchParams.get('category') || 'all';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Kerala');
  const [selectedPricing, setSelectedPricing] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'nearest' | 'newest' | 'quantity'>('nearest');
  const [onlyAiVerified, setOnlyAiVerified] = useState(false);

  const keralaDistricts = Object.keys(KERALA_DISTRICT_COORDS);

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
      // 1. Category Filter
      if (selectedCategory !== 'all') {
        const cat = categories.find((c) => c.slug === selectedCategory);
        if (cat && listing.category_id !== cat.id) return false;
      }

      // 2. District Filter
      if (selectedDistrict !== 'All Kerala' && listing.district !== selectedDistrict) {
        return false;
      }

      // 3. Pricing Filter
      if (selectedPricing !== 'all' && listing.listing_type !== selectedPricing) {
        return false;
      }

      // 4. Material Verified Filter
      if (onlyAiVerified && !listing.ai_classified) {
        return false;
      }

      // 5. Search Keyword
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = listing.title.toLowerCase().includes(query);
        const matchesDesc = listing.description?.toLowerCase().includes(query);
        const matchesLoc = listing.locality?.toLowerCase().includes(query);
        const matchesMaterial = listing.material_type?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesMaterial) return false;
      }

      return true;
    });

    const refCoords = coords || (selectedDistrict && selectedDistrict !== 'All Kerala' && KERALA_DISTRICT_COORDS[selectedDistrict]) || null;

    // Sort order
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
  }, [sourceListings, categories, selectedCategory, selectedDistrict, selectedPricing, onlyAiVerified, searchTerm, sortBy, coords]);

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

        <div className="flex items-center gap-2">
          <Link to="/smart-match">
            <Button variant="secondary" size="md" icon={<Sparkles className="w-4 h-4 text-primary" />}>
              Smart Match
            </Button>
          </Link>

          <Link to="/marketplace/new">
            <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
              List Material
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card variant="elevated" className="space-y-3 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Keyword Search */}
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-outline" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search materials (e.g. coconut husk, cartons, glass)..."
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
          <div className="sm:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-lg text-body-sm text-on-surface focus:outline-none transition-all"
            >
              <option value="nearest">Distance (Nearest to Me)</option>
              <option value="newest">Newest First</option>
              <option value="quantity">Quantity (High to Low)</option>
            </select>
          </div>
        </div>

        {/* Category Horizontal Scrolling Chips */}
        <div className="pt-2 border-t border-outline-variant/40 flex items-center gap-2 overflow-x-auto pb-1">
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
            const count = sourceListings.filter((l) => l.category_id === cat.id).length;
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

      {/* Loading Skeletons */}
      {isLoading ? (
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
          description="There are currently no listings matching your criteria. Be the first to list reusable materials in your district!"
          actionLabel="+ List Material Now"
          actionLink="/marketplace/new"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
};
