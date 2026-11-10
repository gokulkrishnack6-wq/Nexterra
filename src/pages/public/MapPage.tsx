import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Phone,
  Clock,
  MapPin,
  Trash2,
  Package,
  Recycle,
  Search,
  SlidersHorizontal,
  Navigation,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Flag,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  X,
  Compass,
  Filter,
  Info,
  Loader2,
  Building2,
  MapPinned
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation, calculateDistanceKm } from '../../hooks/useGeolocation';
import { KeralaWasteDiscoveryMap } from '../../components/maps/KeralaWasteDiscoveryMap';
import { MapSearchAutocomplete } from '../../components/maps/MapSearchAutocomplete';
import {
  MapSearchSuggestion,
  getDistrictBounds,
} from '../../services/mapSearchService';
import {
  KERALA_DISTRICTS,
  KERALA_MUNICIPAL_BODIES,
  getMunicipalitiesByDistrict,
  MunicipalBody
} from '../../data/keralaAdministrativeData';
import { WasteLocation, WasteListing, LocationFacilityType } from '../../types';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Skeleton';
import { Link } from 'react-router-dom';

type FilterCategoryType = 'all' | 'bins' | 'listings' | 'centres';

export const MapPage: React.FC = () => {
  const { wasteLocations, listings, allMarketplaceListings, addWasteLocation, reportWasteLocation } = useData();
  const { currentUser } = useAuth();
  const {
    coords: userCoords,
    district: userDistrict,
    detectLocation,
    loading: geoLoading,
  } = useGeolocation();

  // Active Geographic Selections
  const [selectedDistrict, setSelectedDistrict] = useState<string>(userDistrict || 'All Kerala');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('All Municipalities');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filtering State
  const [categoryFilter, setCategoryFilter] = useState<FilterCategoryType>('all');
  const [materialCategory, setMaterialCategory] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [freeOnly, setFreeOnly] = useState(false);

  // Map Navigation & Highlight State
  const [centerCoords, setCenterCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(10);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [fitBounds, setFitBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [activeMaterialFilter, setActiveMaterialFilter] = useState<string | null>(null);

  // Modals
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportingLocation, setReportingLocation] = useState<WasteLocation | null>(null);
  const [reportReason, setReportReason] = useState('Incorrect physical location / coordinates');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isReporting, setIsReporting] = useState(false);

  // Suggest Form State
  const [isPickingCoordsOnMap, setIsPickingCoordsOnMap] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [suggestName, setSuggestName] = useState('');
  const [suggestType, setSuggestType] = useState<'public_bin' | 'collection_centre'>('public_bin');
  const [suggestFacilityType, setSuggestFacilityType] = useState<LocationFacilityType>('segregated_smart_bin');
  const [suggestDistrict, setSuggestDistrict] = useState('Ernakulam');
  const [suggestMunicipality, setSuggestMunicipality] = useState('Kochi');
  const [suggestAddress, setSuggestAddress] = useState('');
  const [suggestPincode, setSuggestPincode] = useState('');
  const [suggestAcceptedCats, setSuggestAcceptedCats] = useState<string[]>(['Plastics', 'Paper & Cardboard']);
  const [suggestHours, setSuggestHours] = useState('');
  const [suggestContact, setSuggestContact] = useState('');
  const [suggestDescription, setSuggestDescription] = useState('');
  const [suggestPhotoUrl, setSuggestPhotoUrl] = useState('');
  const [suggestSourceInfo, setSuggestSourceInfo] = useState('Personal Observation / Local Resident');
  const [suggestSuccessMsg, setSuggestSuccessMsg] = useState<string | null>(null);
  const [suggestSubmitting, setSuggestSubmitting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  // Auto-sync initial district from user's geolocation if available
  useEffect(() => {
    if (userDistrict && selectedDistrict === 'All Kerala') {
      setSelectedDistrict(userDistrict);
    }
  }, [userDistrict]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim().toLowerCase());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Municipalities available under selected district
  const availableMunicipalities = useMemo(() => {
    return getMunicipalitiesByDistrict(selectedDistrict);
  }, [selectedDistrict]);

  // Reset municipality when district changes
  const handleDistrictChange = (districtName: string) => {
    setSelectedDistrict(districtName);
    setSelectedMunicipality('All Municipalities');
    setSelectedLocationId(null);
    setSelectedListingId(null);
    setActiveMaterialFilter(null);

    if (districtName === 'All Kerala') {
      setCenterCoords({ latitude: 10.2500, longitude: 76.3500 });
      setZoomLevel(8);
      setFitBounds(null);
    } else {
      const bounds = getDistrictBounds(districtName);
      if (bounds) {
        setFitBounds(bounds);
      } else {
        const dInfo = KERALA_DISTRICTS.find((d) => d.name === districtName);
        if (dInfo) {
          setCenterCoords({ latitude: dInfo.latitude, longitude: dInfo.longitude });
          setZoomLevel(11);
          setFitBounds(null);
        }
      }
    }
  };

  // Center map when municipality changes
  const handleMunicipalityChange = (municipalityName: string) => {
    setSelectedMunicipality(municipalityName);
    setSelectedLocationId(null);
    setSelectedListingId(null);
    setActiveMaterialFilter(null);
    setFitBounds(null);

    if (municipalityName === 'All Municipalities') {
      const bounds = getDistrictBounds(selectedDistrict);
      if (bounds) {
        setFitBounds(bounds);
      } else {
        const dInfo = KERALA_DISTRICTS.find((d) => d.name === selectedDistrict);
        if (dInfo) {
          setCenterCoords({ latitude: dInfo.latitude, longitude: dInfo.longitude });
          setZoomLevel(11);
        }
      }
    } else {
      const body = KERALA_MUNICIPAL_BODIES.find(
        (b) => b.name.toLowerCase() === municipalityName.toLowerCase()
      );
      if (body) {
        setCenterCoords({ latitude: body.latitude, longitude: body.longitude });
        setZoomLevel(13);
      }
    }
  };

  // Explicit "Use My Location" trigger
  const handleUseMyLocation = async () => {
    try {
      setFitBounds(null);
      await detectLocation({ force: true });
      if (userCoords) {
        setCenterCoords({ latitude: userCoords.latitude, longitude: userCoords.longitude });
        setZoomLevel(13);
        if (userDistrict) setSelectedDistrict(userDistrict);
      }
    } catch (e) {
      console.warn('Geolocation trigger notice:', e);
    }
  };

  // Autocomplete Suggestion Selection Handler
  const handleSelectSuggestion = useCallback((suggestion: MapSearchSuggestion) => {
    setSearchQuery(suggestion.title);

    if (suggestion.type === 'district') {
      setSelectedDistrict(suggestion.title);
      setSelectedMunicipality('All Municipalities');
      setActiveMaterialFilter(null);
      setSelectedLocationId(null);
      setSelectedListingId(null);
      if (suggestion.bounds) {
        setFitBounds(suggestion.bounds);
      } else if (suggestion.latitude && suggestion.longitude) {
        setCenterCoords({ latitude: suggestion.latitude, longitude: suggestion.longitude });
        setZoomLevel(11);
        setFitBounds(null);
      }
    } else if (suggestion.type === 'municipality') {
      if (suggestion.district) {
        setSelectedDistrict(suggestion.district);
      }
      setSelectedMunicipality(suggestion.title);
      setActiveMaterialFilter(null);
      setSelectedLocationId(null);
      setSelectedListingId(null);
      if (suggestion.latitude && suggestion.longitude) {
        setCenterCoords({ latitude: suggestion.latitude, longitude: suggestion.longitude });
        setZoomLevel(13);
        setFitBounds(null);
      }
    } else if (suggestion.type === 'place' || suggestion.type === 'pincode') {
      if (suggestion.district) {
        setSelectedDistrict(suggestion.district);
      }
      if (suggestion.municipality) {
        setSelectedMunicipality(suggestion.municipality);
      }
      setActiveMaterialFilter(null);
      if (suggestion.latitude && suggestion.longitude) {
        setCenterCoords({ latitude: suggestion.latitude, longitude: suggestion.longitude });
        setZoomLevel(14);
        setFitBounds(null);
      }
    } else if (suggestion.type === 'material') {
      setActiveMaterialFilter(suggestion.title);
      setCategoryFilter('listings');
      if (suggestion.bounds) {
        setFitBounds(suggestion.bounds);
      } else if (suggestion.latitude && suggestion.longitude) {
        setCenterCoords({ latitude: suggestion.latitude, longitude: suggestion.longitude });
        setZoomLevel(13);
        setFitBounds(null);
      }
    } else if (suggestion.type === 'public_bin' || suggestion.type === 'collection_centre') {
      if (suggestion.district) {
        setSelectedDistrict(suggestion.district);
      }
      if (suggestion.municipality) {
        setSelectedMunicipality(suggestion.municipality);
      }
      if (suggestion.locationId) {
        setSelectedLocationId(suggestion.locationId);
        setSelectedListingId(null);
        setTimeout(() => {
          const cardEl = document.getElementById(`result-loc-${suggestion.locationId}`);
          if (cardEl) {
            cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 300);
      }
      if (suggestion.latitude && suggestion.longitude) {
        setCenterCoords({ latitude: suggestion.latitude, longitude: suggestion.longitude });
        setZoomLevel(16);
        setFitBounds(null);
      }
    }
  }, []);

  // Clear search and reset map viewport without resetting chosen district unexpectedly
  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setActiveMaterialFilter(null);
    setFitBounds(null);
    if (selectedDistrict !== 'All Kerala') {
      const bounds = getDistrictBounds(selectedDistrict);
      if (bounds) {
        setFitBounds(bounds);
      } else {
        const dInfo = KERALA_DISTRICTS.find((d) => d.name === selectedDistrict);
        if (dInfo) {
          setCenterCoords({ latitude: dInfo.latitude, longitude: dInfo.longitude });
          setZoomLevel(11);
        }
      }
    } else {
      setCenterCoords({ latitude: 10.2500, longitude: 76.3500 });
      setZoomLevel(8);
    }
  }, [selectedDistrict]);

  // Active GreenLoop listings
  const activeListings = useMemo(() => {
    const list = allMarketplaceListings || listings;
    return list.filter((l) => (l.status === 'active' || l.status === 'reserved') && l.latitude && l.longitude);
  }, [allMarketplaceListings, listings]);

  // Filter Waste Locations
  const filteredLocations = useMemo(() => {
    return wasteLocations.filter((loc) => {
      // 1. District filter
      if (selectedDistrict !== 'All Kerala' && loc.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }

      // 2. Municipality filter
      if (
        selectedMunicipality !== 'All Municipalities' &&
        loc.municipality.toLowerCase() !== selectedMunicipality.toLowerCase()
      ) {
        return false;
      }

      // 3. Category type filter (bins vs centres)
      if (categoryFilter === 'bins' && loc.location_type !== 'public_bin') return false;
      if (categoryFilter === 'centres' && loc.location_type !== 'collection_centre') return false;
      if (categoryFilter === 'listings') return false; // Handled separately

      // 4. Verification filter
      if (verifiedOnly && loc.verification_status !== 'officially_verified') return false;

      // 5. Accepted material category filter
      if (materialCategory !== 'all') {
        const matLower = materialCategory.toLowerCase();
        const hasMat = loc.accepted_waste_categories?.some((cat) => cat.toLowerCase().includes(matLower));
        if (!hasMat) return false;
      }

      // 5b. Autocomplete material filter
      if (activeMaterialFilter) {
        const matLower = activeMaterialFilter.toLowerCase();
        const hasMat = loc.accepted_waste_categories?.some((cat) => cat.toLowerCase().includes(matLower));
        if (!hasMat) return false;
      }

      // 6. Text search query
      if (debouncedSearch && !activeMaterialFilter) {
        const matchName = loc.name.toLowerCase().includes(debouncedSearch);
        const matchAddress = loc.address.toLowerCase().includes(debouncedSearch);
        const matchDistrict = loc.district.toLowerCase().includes(debouncedSearch);
        const matchMun = loc.municipality.toLowerCase().includes(debouncedSearch);
        const matchPincode = loc.pincode ? loc.pincode.includes(debouncedSearch) : false;
        const matchMat = loc.accepted_waste_categories?.some((c) => c.toLowerCase().includes(debouncedSearch));
        if (!matchName && !matchAddress && !matchDistrict && !matchMun && !matchPincode && !matchMat) {
          return false;
        }
      }

      return true;
    });
  }, [wasteLocations, selectedDistrict, selectedMunicipality, categoryFilter, verifiedOnly, materialCategory, debouncedSearch, activeMaterialFilter]);

  // Filter GreenLoop Marketplace Listings
  const filteredListings = useMemo(() => {
    if (categoryFilter === 'bins' || categoryFilter === 'centres') {
      return [];
    }

    return activeListings.filter((list) => {
      // 1. District filter
      if (selectedDistrict !== 'All Kerala' && list.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }

      // 2. Municipality filter
      if (selectedMunicipality !== 'All Municipalities') {
        const listLocality = (list.locality || list.address || list.formatted_address || '').toLowerCase();
        if (!listLocality.includes(selectedMunicipality.toLowerCase())) {
          return false;
        }
      }

      // 3. Free only filter
      if (freeOnly && list.listing_type !== 'free') return false;

      // 4. Material category filter
      if (materialCategory !== 'all') {
        const catName = (list.category?.name || list.material_type || '').toLowerCase();
        if (!catName.includes(materialCategory.toLowerCase())) return false;
      }

      // 4b. Autocomplete active material filter
      if (activeMaterialFilter) {
        const query = activeMaterialFilter.toLowerCase();
        const matchTitle = list.title.toLowerCase().includes(query);
        const matchDesc = list.description ? list.description.toLowerCase().includes(query) : false;
        const matchCat = (list.category?.name || list.material_type || '').toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchCat) return false;
      }

      // 5. Text search query
      if (debouncedSearch && !activeMaterialFilter) {
        const matchTitle = list.title.toLowerCase().includes(debouncedSearch);
        const matchDesc = list.description ? list.description.toLowerCase().includes(debouncedSearch) : false;
        const matchMat = (list.material_type || '').toLowerCase().includes(debouncedSearch);
        const matchLoc = (list.formatted_address || list.district || '').toLowerCase().includes(debouncedSearch);
        if (!matchTitle && !matchDesc && !matchMat && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [activeListings, selectedDistrict, selectedMunicipality, categoryFilter, freeOnly, materialCategory, debouncedSearch, activeMaterialFilter]);

  // Geographic subset (district/municipality) before category filter
  const areaLocations = useMemo(() => {
    return wasteLocations.filter((loc) => {
      if (selectedDistrict !== 'All Kerala' && loc.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (
        selectedMunicipality !== 'All Municipalities' &&
        loc.municipality.toLowerCase() !== selectedMunicipality.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [wasteLocations, selectedDistrict, selectedMunicipality]);

  const areaListings = useMemo(() => {
    return activeListings.filter((list) => {
      if (selectedDistrict !== 'All Kerala' && list.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (selectedMunicipality !== 'All Municipalities') {
        const listLocality = (list.locality || list.address || list.formatted_address || '').toLowerCase();
        if (!listLocality.includes(selectedMunicipality.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [activeListings, selectedDistrict, selectedMunicipality]);

  // Dynamic counts for toolbar buttons
  const publicBinsCount = areaLocations.filter((l) => l.location_type === 'public_bin').length;
  const collectionCentresCount = areaLocations.filter((l) => l.location_type === 'collection_centre').length;
  const listingsCount = areaListings.length;
  const totalResultsCount = filteredLocations.length + filteredListings.length;

  // Selected municipality record count (for limited coverage detection)
  const isSpecificMunicipality = selectedMunicipality !== 'All Municipalities';
  const municipalityTotalCount = isSpecificMunicipality ? (areaLocations.length + areaListings.length) : 10;
  const isLimitedCoverage = isSpecificMunicipality && municipalityTotalCount < 10;

  // Calculate distance if userCoords available
  const sortedLocationsWithDistance = useMemo(() => {
    return filteredLocations
      .map((loc) => {
        const dist = userCoords
          ? calculateDistanceKm(userCoords.latitude, userCoords.longitude, loc.latitude, loc.longitude)
          : null;
        return { ...loc, distanceKm: dist };
      })
      .sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
        return 0;
      });
  }, [filteredLocations, userCoords]);

  const sortedListingsWithDistance = useMemo(() => {
    return filteredListings
      .map((list) => {
        const dist =
          userCoords && list.latitude && list.longitude
            ? calculateDistanceKm(userCoords.latitude, userCoords.longitude, list.latitude, list.longitude)
            : null;
        return { ...list, distanceKm: dist };
      })
      .sort((a, b) => {
        if (a.distanceKm !== null && b.distanceKm !== null) return a.distanceKm - b.distanceKm;
        return 0;
      });
  }, [filteredListings, userCoords]);

  // Handler when clicking a card in the results panel
  const handleSelectLocationCard = (loc: WasteLocation) => {
    setSelectedLocationId(loc.id);
    setSelectedListingId(null);
    setCenterCoords({ latitude: loc.latitude, longitude: loc.longitude });
    setZoomLevel(15);
  };

  const handleSelectListingCard = (listing: WasteListing) => {
    if (!listing.latitude || !listing.longitude) return;
    setSelectedListingId(listing.id);
    setSelectedLocationId(null);
    setCenterCoords({ latitude: listing.latitude, longitude: listing.longitude });
    setZoomLevel(15);
  };

  // Report Location Action
  const openReportModal = (loc: WasteLocation) => {
    setReportingLocation(loc);
    setReportReason('Incorrect physical location / coordinates');
    setReportDetails('');
    setReportSubmitted(false);
    setIsReportModalOpen(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingLocation) return;
    setIsReporting(true);
    try {
      await reportWasteLocation(reportingLocation.id, reportReason, reportDetails);
      setReportSubmitted(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportingLocation(null);
        setReportSubmitted(false);
      }, 1800);
    } catch (err: any) {
      alert(err?.message || 'Failed to submit report. Please sign in first.');
    } finally {
      setIsReporting(false);
    }
  };

  // Suggest Location Submission
  const handleOpenSuggestModal = () => {
    if (selectedDistrict !== 'All Kerala') setSuggestDistrict(selectedDistrict);
    if (selectedMunicipality !== 'All Municipalities') setSuggestMunicipality(selectedMunicipality);
    if (userCoords) {
      setPickedCoords({ latitude: userCoords.latitude, longitude: userCoords.longitude });
    }
    setSuggestError(null);
    setSuggestSuccessMsg(null);
    setIsSuggestModalOpen(true);
  };

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestError(null);

    if (!suggestName.trim() || !suggestAddress.trim()) {
      setSuggestError('Please provide a name and physical address for this location.');
      return;
    }

    if (!pickedCoords) {
      setSuggestError('Please select coordinates using either GPS or by clicking on the map.');
      return;
    }

    // Duplicate prevention using location proximity (~50 meters) and name matching
    const duplicate = wasteLocations.find((loc) => {
      const dist = calculateDistanceKm(
        pickedCoords.latitude,
        pickedCoords.longitude,
        loc.latitude,
        loc.longitude
      );
      const isNearby = dist < 0.05; // 50 meters
      const isSimilarName =
        loc.name.toLowerCase().includes(suggestName.trim().toLowerCase()) ||
        suggestName.trim().toLowerCase().includes(loc.name.toLowerCase());
      return isNearby && isSimilarName;
    });

    if (duplicate) {
      setSuggestError(
        `A similar location already exists nearby: "${duplicate.name}" (${duplicate.address}). Please check existing markers before adding duplicates.`
      );
      return;
    }

    setSuggestSubmitting(true);
    try {
      await addWasteLocation({
        name: suggestName.trim(),
        location_type: suggestType,
        facility_type: suggestFacilityType,
        accepted_waste_categories: suggestAcceptedCats,
        description: suggestDescription.trim() || `Community submitted ${suggestType.replace('_', ' ')}.`,
        address: suggestAddress.trim(),
        district: suggestDistrict,
        municipality: suggestMunicipality,
        pincode: suggestPincode.trim() || undefined,
        latitude: pickedCoords.latitude,
        longitude: pickedCoords.longitude,
        contact_number: suggestContact.trim() || undefined,
        opening_hours: suggestHours.trim() || undefined,
        photo_url: suggestPhotoUrl.trim() || undefined,
        source_information: suggestSourceInfo,
        source: 'community_submission',
        source_reference: `COMMUNITY-${Date.now()}`,
        verification_status: 'pending_verification',
      });

      setSuggestSuccessMsg(
        'Location submitted successfully! It has been recorded with "Pending Verification" status and will be reviewed.'
      );

      // Reset form
      setSuggestName('');
      setSuggestAddress('');
      setSuggestDescription('');
      setSuggestHours('');
      setSuggestContact('');
      setSuggestPhotoUrl('');

      setTimeout(() => {
        setIsSuggestModalOpen(false);
        setSuggestSuccessMsg(null);
      }, 2200);
    } catch (err: any) {
      setSuggestError(err?.message || 'Could not submit location.');
    } finally {
      setSuggestSubmitting(false);
    }
  };

  const toggleAcceptedCat = (cat: string) => {
    setSuggestAcceptedCats((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4 text-left">
      {/* 1. Header Bar with Title & Suggest CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#E8E4DA] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2.5 py-0.5 rounded-full">
              Kerala Circular Action Map
            </span>
            <span className="text-xs text-[#68736B]">14 Districts • 93 Cities &amp; Municipalities</span>
          </div>
          <h1 className="font-heading font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight mt-1">
            Kerala Waste Discovery Map
          </h1>
          <p className="font-sans text-xs sm:text-sm text-[#5C6E66] mt-0.5">
            Discover public waste bins, community waste listings, and official recycling collection facilities across Kerala.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleOpenSuggestModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#103D2A] hover:bg-[#0B3827] text-white text-xs font-semibold shadow-xs transition-colors w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add a Waste Location</span>
          </button>
        </div>
      </div>

      {/* 2. Search & Geographic Filtering Toolbar */}
      <div className="bg-[#FFFEFA] border border-[#E6E0D5] p-3.5 rounded-2xl shadow-xs space-y-3">
        {/* Top Autocomplete Search Bar */}
        <MapSearchAutocomplete
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={handleClearSearch}
          onSelectSuggestion={handleSelectSuggestion}
          wasteLocations={wasteLocations}
          activeListings={activeListings}
          currentDistrict={selectedDistrict !== 'All Kerala' ? selectedDistrict : undefined}
          placeholder="Search bins, materials or recycling centres by place, municipality, district, pincode, or material..."
        />

        {/* Geographic Selectors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
          {/* District Selector */}
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[#68736B] mb-1">
              Select District (14)
            </label>
            <div className="relative">
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="w-full appearance-none py-2 pl-3 pr-8 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs font-medium text-[#18251F] focus:outline-none focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 cursor-pointer"
              >
                <option value="All Kerala">All Kerala (Entire State)</option>
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#68736B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Municipality / Corporation Selector */}
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[#68736B] mb-1">
              Select City / Municipality
            </label>
            <div className="relative">
              <select
                value={selectedMunicipality}
                onChange={(e) => handleMunicipalityChange(e.target.value)}
                className="w-full appearance-none py-2 pl-3 pr-8 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs font-medium text-[#18251F] focus:outline-none focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 cursor-pointer"
              >
                <option value="All Municipalities">
                  {selectedDistrict === 'All Kerala' ? 'All Municipalities (93 ULBs)' : `All in ${selectedDistrict}`}
                </option>
                {availableMunicipalities.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} {m.type === 'corporation' ? '(Corp)' : '(Mun)'}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#68736B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Material Category Filter */}
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[#68736B] mb-1">
              Waste Material Category
            </label>
            <div className="relative">
              <select
                value={materialCategory}
                onChange={(e) => setMaterialCategory(e.target.value)}
                className="w-full appearance-none py-2 pl-3 pr-8 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs font-medium text-[#18251F] focus:outline-none focus:border-[#103D2A] focus:ring-1 focus:ring-[#103D2A]/20 cursor-pointer"
              >
                <option value="all">All Waste Materials</option>
                <option value="plastics">Plastics &amp; Bottles</option>
                <option value="paper">Paper &amp; Cardboard</option>
                <option value="glass">Glass Containers</option>
                <option value="metal">Metals &amp; Tins</option>
                <option value="e-waste">E-Waste &amp; Batteries</option>
                <option value="organic">Organic Bio-waste</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#68736B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Use My Location CTA */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={geoLoading}
              className="w-full py-2 px-3 bg-[#E8EFE9] hover:bg-[#D5E4D7] border border-[#C8D6C9] text-[#103D2A] rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
            >
              {geoLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Navigation className="w-3.5 h-3.5" />
              )}
              <span>Use My Location</span>
            </button>
          </div>
        </div>

        {/* 3 Marker Category Chips */}
        <div className="pt-2 border-t border-[#EFECE4] flex flex-wrap items-center justify-between gap-2">
          {/* Main 3 Marker Type Badges */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === 'all'
                  ? 'bg-[#103D2A] text-white shadow-2xs font-semibold'
                  : 'bg-[#F0ECE1] text-[#18251F] hover:bg-[#E4DFD3]'
              }`}
            >
              All Locations ({totalResultsCount})
            </button>

            {/* Blue: Public Waste Bins */}
            <button
              type="button"
              onClick={() => setCategoryFilter('bins')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                categoryFilter === 'bins'
                  ? 'bg-[#2563A6] text-white shadow-2xs font-semibold'
                  : 'bg-blue-50 text-[#2563A6] hover:bg-blue-100 border border-blue-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Public Waste Bins ({publicBinsCount})</span>
            </button>

            {/* Green: Available Waste Listings */}
            <button
              type="button"
              onClick={() => setCategoryFilter('listings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                categoryFilter === 'listings'
                  ? 'bg-[#287A45] text-white shadow-2xs font-semibold'
                  : 'bg-emerald-50 text-[#287A45] hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Waste Listings ({listingsCount})</span>
            </button>

            {/* Orange: Collection Centres */}
            <button
              type="button"
              onClick={() => setCategoryFilter('centres')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                categoryFilter === 'centres'
                  ? 'bg-[#B66A20] text-white shadow-2xs font-semibold'
                  : 'bg-amber-50 text-[#B66A20] hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <Recycle className="w-3.5 h-3.5" />
              <span>Collection Centres ({collectionCentresCount})</span>
            </button>
          </div>

          {/* Quick Toggles */}
          <div className="flex items-center gap-3 text-xs text-[#556059]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded border-[#D5DEC4] text-[#103D2A] focus:ring-[#103D2A]/20"
              />
              <span className="text-xs">Verified Only</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={freeOnly}
                onChange={(e) => setFreeOnly(e.target.checked)}
                className="rounded border-[#D5DEC4] text-[#103D2A] focus:ring-[#103D2A]/20"
              />
              <span className="text-xs">Free Materials Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Limited Coverage Notice (Prompt Section 1: "Clearly indicate limited coverage") */}
      {isLimitedCoverage && (
        <div className="bg-[#FFF9EA] border border-[#F3E1B9] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#7A5B0B]">
          <div className="flex items-start sm:items-center gap-2">
            <Info className="w-4 h-4 text-[#B66A20] shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Limited Coverage:</strong> Found {municipalityTotalCount} verified location{municipalityTotalCount === 1 ? '' : 's'} in {selectedMunicipality} Municipality. Help improve local coverage by suggesting public bins or collection facilities.
            </span>
          </div>
          <button
            type="button"
            onClick={handleOpenSuggestModal}
            className="px-3 py-1 bg-[#B66A20] hover:bg-[#9E5A17] text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs"
          >
            + Add a Waste Location in {selectedMunicipality}
          </button>
        </div>
      )}

      {/* 3. Main Desktop 70% Map / 30% Synchronized Results Area */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-start">
        {/* Map Column (70% on desktop: lg:col-span-7) */}
        <div className="lg:col-span-7 w-full">
          <KeralaWasteDiscoveryMap
            locations={filteredLocations}
            listings={filteredListings}
            selectedLocationId={selectedLocationId}
            selectedListingId={selectedListingId}
            onSelectLocation={handleSelectLocationCard}
            onSelectListing={handleSelectListingCard}
            onReportLocation={openReportModal}
            userCoords={userCoords}
            centerCoords={centerCoords}
            zoomLevel={zoomLevel}
            fitBounds={fitBounds}
            isPickingLocation={isPickingCoordsOnMap}
            pickedCoords={pickedCoords}
            onPickCoords={(coords) => {
              setPickedCoords(coords);
              setIsPickingCoordsOnMap(false);
            }}
            heightClass="h-[440px] sm:h-[540px] lg:h-[600px]"
          />
        </div>

        {/* Results & Information Panel (30% on desktop: lg:col-span-3) */}
        <div className="lg:col-span-3 w-full flex flex-col h-[440px] sm:h-[540px] lg:h-[655px] bg-[#FFFEFA] border border-[#E6E0D5] rounded-2xl shadow-xs overflow-hidden">
          {/* Panel Header */}
          <div className="p-3.5 bg-[#FAF8F2] border-b border-[#E6E0D5] flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-sm text-[#18251F]">
                Matching Locations
              </h2>
              <span className="text-[11px] text-[#68736B]">
                {totalResultsCount} point{totalResultsCount === 1 ? '' : 's'} found in current view
              </span>
            </div>

            <span className="text-[10px] font-mono font-medium text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-full">
              {selectedDistrict}
            </span>
          </div>

          {/* Active Material Filter Banner */}
          {activeMaterialFilter && (
            <div className="mx-2 mt-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <Package className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="truncate">Material: <strong>{activeMaterialFilter}</strong> ({filteredListings.length} matching)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveMaterialFilter(null);
                  setSearchQuery('');
                }}
                className="p-1 hover:bg-emerald-100 rounded text-emerald-800"
                title="Clear material filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Results Scrollable List */}
          <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-[#EFECE4] p-2 space-y-2">
            {totalResultsCount === 0 ? (
              <div className="py-12 px-4 text-center">
                <EmptyState
                  icon={activeMaterialFilter ? <Package className="w-8 h-8 text-[#8C938D]" /> : <Compass className="w-8 h-8 text-[#8C938D]" />}
                  title={activeMaterialFilter ? "No Material Listings Found" : "No Locations in View"}
                  description={
                    activeMaterialFilter
                      ? "No available listings found for this material in the selected area."
                      : "No waste bins or recycling centres matched your current filters. Try selecting 'All Kerala' or clearing search terms."
                  }
                />
                <button
                  type="button"
                  onClick={activeMaterialFilter ? () => { setActiveMaterialFilter(null); setSearchQuery(''); } : handleOpenSuggestModal}
                  className="mt-4 px-3.5 py-1.5 bg-[#103D2A] text-white rounded-xl text-xs font-semibold hover:bg-[#0B3827] transition-colors"
                >
                  {activeMaterialFilter ? 'Clear Material Filter' : '+ Add a Waste Location Here'}
                </button>
              </div>
            ) : (
              <>
                {/* 1. Public Bins & Collection Centres */}
                {sortedLocationsWithDistance.map((loc) => {
                  const isSelected = selectedLocationId === loc.id;
                  const isBin = loc.location_type === 'public_bin';

                  return (
                    <div
                      key={loc.id}
                      id={`result-loc-${loc.id}`}
                      onClick={() => handleSelectLocationCard(loc)}
                      className={`p-3 rounded-xl transition-all cursor-pointer border ${
                        isSelected
                          ? isBin
                            ? 'bg-blue-50/70 border-blue-400 shadow-xs ring-1 ring-blue-400'
                            : 'bg-amber-50/70 border-amber-400 shadow-xs ring-1 ring-amber-400'
                          : 'bg-white hover:bg-[#FAF8F2] border-[#E8E4DA]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span
                          className={`text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            isBin
                              ? 'bg-blue-100 text-[#2563A6]'
                              : 'bg-amber-100 text-[#B66A20]'
                          }`}
                        >
                          {isBin ? (
                            <>
                              <Trash2 className="w-3 h-3" /> Public Waste Bin
                            </>
                          ) : (
                            <>
                              <Recycle className="w-3 h-3" /> Collection Facility
                            </>
                          )}
                        </span>

                        {loc.distanceKm !== null && (
                          <span className="text-[10px] font-mono text-[#68736B] font-medium shrink-0">
                            {loc.distanceKm.toFixed(1)} km away
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-xs text-[#18251F] leading-snug mt-1.5 line-clamp-1">
                        {loc.name}
                      </h3>

                      <p className="text-[11px] text-[#556059] flex items-start gap-1 mt-1 line-clamp-2">
                        <MapPin className="w-3.5 h-3.5 text-[#103D2A] shrink-0 mt-0.5" />
                        <span>{loc.address}</span>
                      </p>

                      {/* Accepted Materials Preview */}
                      {loc.accepted_waste_categories && loc.accepted_waste_categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {loc.accepted_waste_categories.slice(0, 3).map((cat, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 bg-[#F0ECE1] text-[#18251F] rounded"
                            >
                              {cat}
                            </span>
                          ))}
                          {loc.accepted_waste_categories.length > 3 && (
                            <span className="text-[9px] text-[#68736B]">
                              +{loc.accepted_waste_categories.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="pt-2 mt-2 border-t border-[#EAE5D9] flex items-center justify-between text-[10.5px]">
                        <span
                          className={`font-medium ${
                            loc.verification_status === 'officially_verified'
                              ? 'text-emerald-700 flex items-center gap-0.5'
                              : 'text-gray-600'
                          }`}
                        >
                          {loc.verification_status === 'officially_verified' && (
                            <ShieldCheck className="w-3 h-3" />
                          )}
                          {loc.verification_status === 'officially_verified'
                            ? 'Verified Facility'
                            : 'Community Reported'}
                        </span>

                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${loc.latitude},${loc.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#103D2A] font-semibold hover:underline inline-flex items-center gap-0.5"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Directions</span>
                          </a>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openReportModal(loc);
                            }}
                            className="text-[#8C938D] hover:text-[#C74738]"
                            title="Report inaccurate information"
                          >
                            <Flag className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* 2. Available Waste Listings */}
                {sortedListingsWithDistance.map((list) => {
                  const isSelected = selectedListingId === list.id;

                  return (
                    <div
                      key={list.id}
                      id={`result-listing-${list.id}`}
                      onClick={() => handleSelectListingCard(list)}
                      className={`p-3 rounded-xl transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-emerald-50/70 border-emerald-400 shadow-xs ring-1 ring-emerald-400'
                          : 'bg-white hover:bg-[#FAF8F2] border-[#E8E4DA]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span className="bg-emerald-100 text-[#287A45] text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Package className="w-3 h-3" /> Available Waste
                        </span>

                        {list.distanceKm !== null && (
                          <span className="text-[10px] font-mono text-[#68736B] font-medium shrink-0">
                            {list.distanceKm.toFixed(1)} km away
                          </span>
                        )}
                      </div>

                      <div className="flex items-start gap-2.5 mt-2">
                        {list.images && list.images[0] && (
                          <img
                            src={list.images[0]}
                            alt={list.title}
                            className="w-12 h-12 rounded-lg object-cover bg-[#F0ECE1] shrink-0 border border-[#E0D9CC]"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-xs text-[#18251F] leading-snug line-clamp-1">
                            {list.title}
                          </h3>
                          <span className="text-[11px] text-[#68736B] block">
                            {list.quantity} {list.unit || 'kg'} • {list.listing_type === 'free' ? 'Free' : `₹${list.price}`}
                          </span>
                          <span className="text-[10px] text-[#8C938D] truncate block">
                            {list.formatted_address || list.district}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 mt-2 border-t border-[#EAE5D9] flex items-center justify-between">
                        <span className="text-[10px] text-[#68736B]">
                          Owner: <strong className="text-[#18251F] font-medium">{list.user?.full_name || 'Community Member'}</strong>
                        </span>

                        <Link
                          to={`/marketplace/${list.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-semibold text-[#103D2A] hover:underline inline-flex items-center gap-1"
                        >
                          <span>View Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* 4. MODAL: Add a Community Location */}
      <Modal
        isOpen={isSuggestModalOpen}
        onClose={() => setIsSuggestModalOpen(false)}
        title="Add a Waste Location"
        subtitle="Help map Kerala's circular infrastructure. Submissions enter our verification moderation queue."
        icon={<MapPinned className="w-5 h-5 text-[#103D2A]" />}
        maxWidth="xl"
      >
        <form onSubmit={handleSubmitSuggestion} className="space-y-4">
          {suggestSuccessMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{suggestSuccessMsg}</span>
            </div>
          )}

          {suggestError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{suggestError}</span>
            </div>
          )}

          {/* Type Choice */}
          <div>
            <label className="block text-xs font-semibold text-[#18251F] mb-1.5">
              Location Type *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setSuggestType('public_bin');
                  setSuggestFacilityType('segregated_smart_bin');
                }}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                  suggestType === 'public_bin'
                    ? 'bg-blue-50 border-[#2563A6] text-[#2563A6] font-semibold'
                    : 'bg-white border-[#E0D9CC] text-[#18251F]'
                }`}
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <div>
                  <span className="block font-medium">Public Waste Bin</span>
                  <span className="text-[10px] text-[#68736B] font-normal">Public &amp; transit disposal</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSuggestType('collection_centre');
                  setSuggestFacilityType('mcf');
                }}
                className={`p-2.5 rounded-xl border text-left text-xs transition-all flex items-center gap-2 ${
                  suggestType === 'collection_centre'
                    ? 'bg-amber-50 border-[#B66A20] text-[#B66A20] font-semibold'
                    : 'bg-white border-[#E0D9CC] text-[#18251F]'
                }`}
              >
                <Recycle className="w-4 h-4 shrink-0" />
                <div>
                  <span className="block font-medium">Collection Centre</span>
                  <span className="text-[10px] text-[#68736B] font-normal">MCF, RRF, Scrap Facility</span>
                </div>
              </button>
            </div>
          </div>

          {/* Location Name & Facility Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18251F] mb-1">
                Facility / Bin Name *
              </label>
              <input
                type="text"
                required
                value={suggestName}
                onChange={(e) => setSuggestName(e.target.value)}
                placeholder="e.g. Kozhikode Beach Segregated Smart Bin #2"
                className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251F] mb-1">
                Specific Facility Sub-type
              </label>
              <select
                value={suggestFacilityType}
                onChange={(e) => setSuggestFacilityType(e.target.value as LocationFacilityType)}
                className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
              >
                {suggestType === 'public_bin' ? (
                  <>
                    <option value="segregated_smart_bin">Segregated Twin/Triple Smart Bin</option>
                    <option value="public_litter_bin">Public Street Litter Bin</option>
                    <option value="e_waste_kiosk">Public E-Waste / Battery Drop Kiosk</option>
                  </>
                ) : (
                  <>
                    <option value="mcf">Material Collection Facility (MCF)</option>
                    <option value="rrf">Resource Recovery Facility (RRF)</option>
                    <option value="haritha_karma_sena_hub">Haritha Karma Sena Ward Depot</option>
                    <option value="scrap_recycling_centre">Authorized Scrap Recycler</option>
                    <option value="compost_station">Community Composting Facility</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* District & Municipality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18251F] mb-1">
                District *
              </label>
              <select
                value={suggestDistrict}
                onChange={(e) => {
                  setSuggestDistrict(e.target.value);
                  const muns = getMunicipalitiesByDistrict(e.target.value);
                  if (muns.length > 0) setSuggestMunicipality(muns[0].name);
                }}
                className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
              >
                {KERALA_DISTRICTS.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251F] mb-1">
                City / Municipality *
              </label>
              <select
                value={suggestMunicipality}
                onChange={(e) => setSuggestMunicipality(e.target.value)}
                className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
              >
                {getMunicipalitiesByDistrict(suggestDistrict).map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Address & Pincode */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#18251F] mb-1">
                Address / Street / Landmark *
              </label>
              <input
                type="text"
                required
                value={suggestAddress}
                onChange={(e) => setSuggestAddress(e.target.value)}
                placeholder="e.g. Near KSRTC Terminal Platform 2"
                className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251F] mb-1">
                PIN Code
              </label>
              <input
                type="text"
                value={suggestPincode}
                onChange={(e) => setSuggestPincode(e.target.value)}
                placeholder="e.g. 682001"
                className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
              />
            </div>
          </div>

          {/* Coordinate Picker Controls */}
          <div className="p-3 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#18251F]">
                Exact Geographic Coordinates *
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (userCoords) {
                      setPickedCoords({ latitude: userCoords.latitude, longitude: userCoords.longitude });
                    } else {
                      detectLocation({ force: true });
                    }
                  }}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D5DEC4] text-[11px] font-semibold text-[#103D2A] hover:bg-[#E8EFE9] transition-colors"
                >
                  Use Current GPS
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPickingCoordsOnMap(true);
                    setIsSuggestModalOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#103D2A] text-white text-[11px] font-semibold hover:bg-[#0B3827] transition-colors"
                >
                  Pick on Map
                </button>
              </div>
            </div>

            {pickedCoords ? (
              <p className="text-xs font-mono text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                Latitude: <strong>{pickedCoords.latitude.toFixed(6)}</strong> • Longitude: <strong>{pickedCoords.longitude.toFixed(6)}</strong>
              </p>
            ) : (
              <p className="text-[11px] text-[#68736B]">
                Click "Pick on Map" or "Use Current GPS" to set the exact pin coordinates.
              </p>
            )}
          </div>

          {/* Accepted Materials */}
          <div>
            <label className="block text-xs font-semibold text-[#18251F] mb-1.5">
              Accepted Waste Categories
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                'Plastics',
                'Paper & Cardboard',
                'Glass',
                'Metals',
                'E-Waste',
                'Organic Bio-waste',
                'General Litter'
              ].map((cat) => {
                const checked = suggestAcceptedCats.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleAcceptedCat(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      checked
                        ? 'bg-[#103D2A] text-white font-semibold'
                        : 'bg-[#F9F7F0] text-[#556059] border border-[#E0D9CC] hover:bg-[#EFECE4]'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Operating Hours & Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#18251F] mb-1">
                Operating Hours (if verified)
              </label>
              <input
                type="text"
                value={suggestHours}
                onChange={(e) => setSuggestHours(e.target.value)}
                placeholder="e.g. 9:00 AM - 5:00 PM (Mon-Sat) or 24/7"
                className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#18251F] mb-1">
                Contact Phone (optional)
              </label>
              <input
                type="text"
                value={suggestContact}
                onChange={(e) => setSuggestContact(e.target.value)}
                placeholder="e.g. 0471-2367800"
                className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
              />
            </div>
          </div>

          {/* Source of Information */}
          <div>
            <label className="block text-xs font-semibold text-[#18251F] mb-1">
              Source of Information
            </label>
            <select
              value={suggestSourceInfo}
              onChange={(e) => setSuggestSourceInfo(e.target.value)}
              className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
            >
              <option value="Personal Observation / Local Resident">Personal Observation / Local Resident</option>
              <option value="Municipal Notice / Official Signboard">Municipal Notice / Official Signboard</option>
              <option value="Haritha Karma Sena / Clean Kerala Point">Haritha Karma Sena / Clean Kerala Point</option>
              <option value="Local Shopkeeper / Merchant Association">Local Shopkeeper / Merchant Association</option>
              <option value="Government / LSGD Waste Directory">Government / LSGD Waste Directory</option>
            </select>
          </div>

          {/* Photograph Upload / URL */}
          <div>
            <label className="block text-xs font-semibold text-[#18251F] mb-1">
              Location Photograph (optional)
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={suggestPhotoUrl}
                onChange={(e) => setSuggestPhotoUrl(e.target.value)}
                placeholder="Paste image URL (e.g. https://... or take a photo)"
                className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
              />
              {suggestPhotoUrl && (
                <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#E0D9CC]">
                  <img
                    src={suggestPhotoUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setSuggestPhotoUrl('')}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#18251F] mb-1">
              Additional Details / Landmarks
            </label>
            <textarea
              rows={2}
              value={suggestDescription}
              onChange={(e) => setSuggestDescription(e.target.value)}
              placeholder="e.g. Installed outside railway counter by municipality last month."
              className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-[#EAE5D9] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsSuggestModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#68736B] hover:bg-[#F0ECE1] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={suggestSubmitting}
              className="px-5 py-2 rounded-xl bg-[#103D2A] hover:bg-[#0B3827] text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
            >
              {suggestSubmitting ? 'Submitting...' : 'Submit Location for Verification'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 5. MODAL: Report Incorrect Location */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report Location Issue"
        subtitle={`Flagging information for: ${reportingLocation?.name || 'Waste Location'}`}
        icon={<Flag className="w-5 h-5 text-[#C74738]" />}
        maxWidth="md"
      >
        <form onSubmit={handleSubmitReport} className="space-y-4">
          {reportSubmitted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs text-center space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
              <p className="font-bold">Thank you for reporting.</p>
              <p>Our moderators will review this location and verify its status.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#18251F] mb-1.5">
                  Reason for Reporting *
                </label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
                >
                  <option value="Incorrect physical location / coordinates">
                    Incorrect physical location / coordinates
                  </option>
                  <option value="Facility permanently closed or removed">
                    Facility permanently closed or removed
                  </option>
                  <option value="Incorrect accepted waste categories">
                    Incorrect accepted waste categories
                  </option>
                  <option value="Duplicate location entry">
                    Duplicate location entry
                  </option>
                  <option value="Private property / not accessible to public">
                    Private property / not accessible to public
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#18251F] mb-1">
                  Additional Details
                </label>
                <textarea
                  rows={3}
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Please describe what is incorrect or closed..."
                  className="w-full p-2.5 bg-[#F9F7F0] border border-[#E0D9CC] rounded-xl text-xs text-[#18251F] focus:outline-none focus:border-[#103D2A]"
                />
              </div>

              <div className="pt-2 border-t border-[#EAE5D9] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#68736B] hover:bg-[#F0ECE1] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReporting}
                  className="px-4 py-2 rounded-xl bg-[#C74738] hover:bg-[#B33C2F] text-white text-xs font-semibold transition-colors disabled:opacity-50 shadow-xs"
                >
                  {isReporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
};
