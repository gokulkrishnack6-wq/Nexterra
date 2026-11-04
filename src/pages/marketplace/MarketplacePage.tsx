import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, X, Sparkles } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { KERALA_DISTRICTS } from '../../lib/mockData';

export const MarketplacePage: React.FC = () => {
  const { listings, categories } = useData();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedCategory = searchParams.get('category') || 'all';
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('All Kerala');
  const [selectedPricing, setSelectedPricing] = useState<string>('all');
  const [onlyAiVerified, setOnlyAiVerified] = useState(false);

  const handleCategoryChange = (slug: string) => {
    if (slug === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
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

      // 4. AI Verified Filter
      if (onlyAiVerified && !listing.ai_classified) {
        return false;
      }

      // 5. Search Keyword
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = listing.title.toLowerCase().includes(query);
        const matchesDesc = listing.description.toLowerCase().includes(query);
        const matchesLoc = listing.locality.toLowerCase().includes(query);
        const matchesMaterial = listing.material_type.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesLoc && !matchesMaterial) return false;
      }

      return true;
    });
  }, [listings, categories, selectedCategory, selectedDistrict, selectedPricing, onlyAiVerified, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-forest">
            Explore Materials
          </h1>
          <p className="text-xs sm:text-sm text-charcoal-muted mt-0.5">
            Discover reusable, recyclable, and compostable resources available across Kerala.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/smart-match"
            className="inline-flex items-center gap-1.5 bg-cream hover:bg-[#EFEFE6] text-charcoal border border-[#D5D5CA] text-xs font-medium px-3.5 py-2 rounded-md transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-forest" />
            <span>Smart Match</span>
          </Link>

          <Link
            to="/marketplace/new"
            className="inline-flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white text-xs font-semibold px-4 py-2 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>List Material</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
          {/* Keyword Search */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-charcoal-muted absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cardboard, coconut husk, vegetable scraps, books..."
              className="w-full pl-9 pr-7 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal placeholder:text-charcoal-muted focus:outline-none focus:ring-1 focus:ring-forest"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-charcoal-muted hover:text-charcoal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* District */}
          <div className="sm:col-span-4">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full py-2 px-3 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
            >
              {KERALA_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district === 'All Kerala' ? 'All Kerala Districts' : district}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing */}
          <div className="sm:col-span-3">
            <select
              value={selectedPricing}
              onChange={(e) => setSelectedPricing(e.target.value)}
              className="w-full py-2 px-3 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
            >
              <option value="all">All Pricing Types</option>
              <option value="free">Free Only</option>
              <option value="exchange">Exchange</option>
              <option value="sale">Scrap Sale</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-forest text-white'
                : 'bg-cream text-charcoal hover:bg-[#EBEBE0]'
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-forest text-white'
                    : 'bg-cream text-charcoal hover:bg-[#EBEBE0]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count & Listings Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-charcoal-muted px-0.5">
          <span>Showing <strong className="text-charcoal">{filteredListings.length}</strong> available materials</span>
          {selectedDistrict !== 'All Kerala' && (
            <span>Filtered: {selectedDistrict}</span>
          )}
        </div>

        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-lg border border-[#E2E2D8] p-12 text-center max-w-md mx-auto space-y-3">
            <h3 className="font-heading font-semibold text-base text-charcoal">
              No matching listings found
            </h3>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              We couldn't find any materials matching your active filters. Try resetting filters or choosing All Kerala.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDistrict('All Kerala');
                setSelectedPricing('all');
                setOnlyAiVerified(false);
                handleCategoryChange('all');
              }}
              className="text-xs font-semibold text-forest underline hover:text-forest-dark"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
