import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X, Loader2, Check } from 'lucide-react';
import { LocationSuggestion, searchLocationAutocomplete } from '../../services/geocoding';
import { useOutsideClick } from '../../hooks/useOutsideClick';

export interface LocationAutocompleteProps {
  onSelect: (location: LocationSuggestion) => void;
  selectedLocation?: LocationSuggestion | null;
  initialValue?: string;
  placeholder?: string;
  className?: string;
  keralaOnly?: boolean;
  required?: boolean;
  label?: string;
  error?: string;
  onClear?: () => void;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  onSelect,
  selectedLocation,
  initialValue = '',
  placeholder = 'Search locality, village, town, or district in Kerala...',
  className = '',
  keralaOnly = true,
  required = false,
  label,
  error,
  onClear,
}) => {
  const [inputValue, setInputValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [openAbove, setOpenAbove] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [searchError, setSearchError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close dropdown helper
  const closeDropdown = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  // Global outside-click and Escape key handler
  const containerRef = useOutsideClick<HTMLDivElement>(closeDropdown, {
    enabled: isOpen,
    onEscape: closeDropdown,
  });

  // Calculate viewport boundary collision to flip dropdown upwards if near bottom
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 240px below and more room above, flip dropdown above
      if (spaceBelow < 240 && spaceAbove > spaceBelow) {
        setOpenAbove(true);
      } else {
        setOpenAbove(false);
      }
    }
  }, [isOpen, suggestions.length]);

  // Sync internal input value with selected location prop or initial value
  useEffect(() => {
    if (selectedLocation) {
      setInputValue(selectedLocation.name || selectedLocation.label || selectedLocation.fullAddress);
    } else if (initialValue) {
      setInputValue(initialValue);
    }
  }, [selectedLocation, initialValue]);

  // Debounced search query handler (approx 350ms)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setFocusedIndex(-1); // DO NOT auto-select the first suggestion

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setSearchError(null);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await searchLocationAutocomplete(val, { limit: 6, keralaOnly });
        setSuggestions(results);
        setIsOpen(true);
      } catch (err: any) {
        setSearchError('Unable to load location suggestions.');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setInputValue(suggestion.name || suggestion.label);
    setSuggestions([]);
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearchError(null);
    onSelect(suggestion);
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setIsOpen(false);
    setFocusedIndex(-1);
    setSearchError(null);
    if (onClear) onClear();
    if (inputRef.current) inputRef.current.focus();
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[focusedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full text-left ${className}`}>
      {label && (
        <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
          {label} {required && <span className="text-error">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <MapPin className="w-4 h-4 text-primary absolute left-3 pointer-events-none shrink-0" />

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className={`w-full pl-9 pr-9 py-2.5 bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border transition-all placeholder:text-outline ${
            error
              ? 'border-error focus:border-error focus:ring-2 focus:ring-error/20'
              : 'border-outline-variant hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/20'
          }`}
        />

        <div className="absolute right-2.5 flex items-center gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
          {inputValue && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-error">{error}</p>}
      {searchError && <p className="mt-1 text-xs text-on-surface-variant">{searchError}</p>}

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 left-0 right-0 max-h-60 overflow-y-auto overscroll-contain bg-surface-container-lowest border border-outline-variant/80 rounded-xl shadow-xl divide-y divide-outline-variant/30 font-sans ${
            openAbove ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
        >
          {suggestions.length === 0 && !isLoading && (
            <div className="p-3 text-xs text-on-surface-variant text-center">
              No matching locations found in Kerala. Try typing another locality or district.
            </div>
          )}

          {suggestions.map((suggestion, index) => {
            const isFocused = index === focusedIndex;
            const isCurrentSelected =
              selectedLocation &&
              Math.abs(selectedLocation.latitude - suggestion.latitude) < 0.001 &&
              Math.abs(selectedLocation.longitude - suggestion.longitude) < 0.001;

            return (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`w-full px-3.5 py-2.5 text-left flex items-start gap-2.5 transition-colors ${
                  isFocused ? 'bg-primary-container/30 text-primary' : 'hover:bg-surface-container text-on-surface'
                }`}
              >
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-body-sm text-primary truncate">
                      {suggestion.name}
                    </span>
                    {isCurrentSelected && (
                      <span className="shrink-0 text-emerald-600 flex items-center gap-0.5 text-[10px] font-bold">
                        <Check className="w-3 h-3" /> Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant truncate">
                    {suggestion.label}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
