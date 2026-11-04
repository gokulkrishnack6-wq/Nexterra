import React, { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Filter, PlusCircle, Sparkles, MapPin, SlidersHorizontal, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { ListingCard } from '../../components/marketplace/ListingCard';
import { KERALA_DISTRICTS } from '../../lib/mockData';
import { ListingPricing } from '../../types';

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-3xl text-forest-dark">
            Circular Waste Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Discover reusable biomass, post-consumer plastics, cardboard, and clean secondary resources in Kerala.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/smart-match"
            className="flex items-center gap-1.5 bg-lime hover:bg-lime-hover text-forest-dark font-bold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <Sparkles className="w-4 h-4 text-forest" />
            <span>Smart Match For Me</span>
          </Link>

          <Link
            to="/marketplace/new"
            className="flex items-center gap-1.5 bg-forest hover:bg-forest-dark text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4 text-lime" />
            <span>List Materials</span>
          </Link>
        </div>
      </div>

      {/* Search and Filter Panel */}
      <div className="bg-white p-4 rounded-2xl border border-sage/40 shadow-soft space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Keyword Search */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vegetable scraps, cardboard, HDPE, e-waste..."
              className="w-full pl-10 pr-4 py-2 bg-offwhite border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest text-slate-800"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* District Selector */}
          <div className="md:col-span-3">
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="w-full py-2 px-3 bg-offwhite border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest text-slate-800 font-medium"
            >
              {KERALA_DISTRICTS.map((district) => (
                <option key={district} value={district}>
                  {district === 'All Kerala' ? '📍 All Kerala Districts' : `📍 ${district}`}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Type Filter */}
          <div className="md:col-span-2">
            <select
              value={selectedPricing}
              onChange={(e) => setSelectedPricing(e.target.value)}
              className="w-full py-2 px-3 bg-offwhite border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest text-slate-800 font-medium"
            >
              <option value="all">All Types</option>
              <option value="free">Free Only</option>
              <option value="exchange">Exchange</option>
              <option value="sale">Sale</option>
            </select>
          </div>

          {/* AI Verified Toggle */}
          <div className="md:col-span-2 flex items-center justify-center">
            <button
              onClick={() => setOnlyAiVerified(!onlyAiVerified)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                onlyAiVerified
                  ? 'bg-forest text-lime border-forest'
                  : 'bg-offwhite text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Verified</span>
            </button>
          </div>
        </div>

        {/* Category Pills Slider */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <button
            onClick={() => handleCategoryChange('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === 'all'
                ? 'bg-forest text-white shadow-sm'
                : 'bg-offwhite text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Categories ({listings.length})
          </button>
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.slug)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-forest text-white shadow-sm'
                    : 'bg-offwhite text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Listings Grid */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-4 px-1">
          <span>
            Showing <strong className="text-forest-dark">{filteredListings.length}</strong> available batches
          </span>
          {selectedDistrict !== 'All Kerala' && (
            <span className="bg-sage-light text-forest px-2 py-0.5 rounded font-medium">
              Filtered by: {selectedDistrict}
            </span>
          )}
        </div>

        {filteredListings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-sage/40 p-12 text-center max-w-lg mx-auto shadow-soft space-y-3">
            <div className="w-12 h-12 rounded-full bg-sage-light text-forest flex items-center justify-center mx-auto">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-base text-forest-dark">
              No matching listings found
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              We couldn't find any listings matching your active filters. Try broadening your district or search keywords.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedDistrict('All Kerala');
                setSelectedPricing('all');
                setOnlyAiVerified(false);
                handleCategoryChange('all');
              }}
              className="mt-2 inline-flex items-center text-xs font-bold text-forest hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
