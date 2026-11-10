import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  X,
  Compass,
  Building2,
  MapPin,
  Package,
  Trash2,
  Recycle,
  Navigation,
  Loader2,
} from 'lucide-react';
import {
  MapSearchSuggestion,
  generateMapSearchSuggestions,
} from '../../services/mapSearchService';
import { WasteLocation, WasteListing } from '../../types';

interface MapSearchAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
  onSelectSuggestion: (suggestion: MapSearchSuggestion) => void;
  wasteLocations: WasteLocation[];
  activeListings: WasteListing[];
  currentDistrict?: string;
  placeholder?: string;
}

export const MapSearchAutocomplete: React.FC<MapSearchAutocompleteProps> = ({
  value,
  onChange,
  onClear,
  onSelectSuggestion,
  wasteLocations,
  activeListings,
  currentDistrict,
  placeholder = 'Search bins, materials or recycling centres by place, municipality, district, pincode, or material...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<MapSearchSuggestion[]>([]);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Generate suggestions whenever value changes
  useEffect(() => {
    if (value.trim().length >= 2) {
      const results = generateMapSearchSuggestions(
        value,
        wasteLocations,
        activeListings,
        currentDistrict
      );
      setSuggestions(results);
      setFocusedIndex(-1);
    } else {
      setSuggestions([]);
      setIsOpen(false);
      setFocusedIndex(-1);
    }
  }, [value, wasteLocations, activeListings, currentDistrict]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const handleSelect = (item: MapSearchSuggestion) => {
    setIsOpen(false);
    setSuggestions([]);
    onSelectSuggestion(item);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        handleSelect(suggestions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  const getSuggestionIcon = (type: MapSearchSuggestion['type']) => {
    switch (type) {
      case 'district':
        return (
          <div className="w-7 h-7 rounded-lg bg-[#E8EFE9] text-[#103D2A] flex items-center justify-center shrink-0 border border-[#C8D6C9]">
            <Compass className="w-4 h-4" />
          </div>
        );
      case 'municipality':
        return (
          <div className="w-7 h-7 rounded-lg bg-[#E8EFE9] text-[#103D2A] flex items-center justify-center shrink-0 border border-[#C8D6C9]">
            <Building2 className="w-4 h-4" />
          </div>
        );
      case 'material':
        return (
          <div className="w-7 h-7 rounded-lg bg-[#287A45] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Package className="w-4 h-4" />
          </div>
        );
      case 'public_bin':
        return (
          <div className="w-7 h-7 rounded-full bg-[#2563A6] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Trash2 className="w-3.5 h-3.5" />
          </div>
        );
      case 'collection_centre':
        return (
          <div className="w-7 h-7 rounded-md bg-[#B66A20] text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Recycle className="w-3.5 h-3.5" />
          </div>
        );
      case 'pincode':
        return (
          <div className="w-7 h-7 rounded-lg bg-[#FAF8F2] text-[#103D2A] flex items-center justify-center shrink-0 border border-[#E0D9CC]">
            <Navigation className="w-4 h-4" />
          </div>
        );
      case 'place':
      default:
        return (
          <div className="w-7 h-7 rounded-lg bg-[#FAF8F2] text-[#103D2A] flex items-center justify-center shrink-0 border border-[#E0D9CC]">
            <MapPin className="w-4 h-4" />
          </div>
        );
    }
  };

  const getBadgeStyle = (type: MapSearchSuggestion['type']) => {
    switch (type) {
      case 'material':
        return 'bg-emerald-50 text-[#287A45] border-emerald-200';
      case 'public_bin':
        return 'bg-blue-50 text-[#2563A6] border-blue-200';
      case 'collection_centre':
        return 'bg-amber-50 text-[#B66A20] border-amber-200';
      case 'district':
        return 'bg-[#E8EFE9] text-[#103D2A] border-[#C8D6C9]';
      case 'municipality':
        return 'bg-[#E8EFE9] text-[#103D2A] border-[#C8D6C9]';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Bar Input */}
      <div className="relative w-full">
        <Search className="w-4 h-4 text-[#68736B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search map locations, materials, districts and facilities"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="w-full pl-10 pr-9 py-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs sm:text-sm text-[#18251F] placeholder:text-[#8C938D] focus:outline-none focus:border-[#103D2A] focus:ring-2 focus:ring-[#103D2A]/15 transition-all shadow-2xs"
        />

        {value && (
          <button
            type="button"
            onClick={() => {
              onClear();
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#68736B] hover:text-[#18251F] transition-colors rounded-md"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1.5 z-[1000] bg-[#FFFEFA] border border-[#E6E0D5] rounded-xl shadow-xl overflow-hidden divide-y divide-[#EFECE4] max-h-84 overflow-y-auto overscroll-contain animate-in fade-in duration-100"
        >
          {suggestions.map((item, index) => {
            const isFocused = focusedIndex === index;

            return (
              <div
                key={item.id}
                role="option"
                aria-selected={isFocused}
                onMouseEnter={() => setFocusedIndex(index)}
                onClick={() => handleSelect(item)}
                className={`flex items-center justify-between p-3 gap-3 cursor-pointer transition-colors ${
                  isFocused ? 'bg-[#F4F9F5] text-[#103D2A]' : 'hover:bg-[#FAF8F2] text-[#18251F]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getSuggestionIcon(item.type)}

                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-semibold text-xs sm:text-sm truncate leading-snug">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#68736B] truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${getBadgeStyle(
                    item.type
                  )}`}
                >
                  {item.categoryLabel}
                </span>
              </div>
            );
          })}

          <div className="p-2 bg-[#FAF8F2] text-center text-[10.5px] text-[#7A857D] flex items-center justify-between px-3">
            <span>Use ↑ ↓ keys to navigate, Enter to select</span>
            <span>Esc to close</span>
          </div>
        </div>
      )}

      {/* Empty State when typing 2+ chars with 0 matches */}
      {isOpen && value.trim().length >= 2 && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[1000] bg-[#FFFEFA] border border-[#E6E0D5] rounded-xl shadow-lg p-4 text-center text-xs text-[#68736B]">
          <p className="font-semibold text-[#18251F]">No matching locations or materials found</p>
          <p className="text-[11px] text-[#7A857D] mt-0.5">
            Try searching for a Kerala municipality, district, material (e.g. &apos;plastic&apos;, &apos;cardboard&apos;) or facility name.
          </p>
        </div>
      )}
    </div>
  );
};

