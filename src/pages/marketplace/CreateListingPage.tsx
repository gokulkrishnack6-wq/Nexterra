import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Sparkles, Navigation, AlertCircle } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGeolocation, KERALA_DISTRICT_COORDS } from '../../hooks/useGeolocation';
import { ListingPricing } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Input, Textarea } from '../../components/ui/Input';

export const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories, addListing } = useData();
  const { currentUser } = useAuth();
  const { district: geoDistrict, locality: geoLocality, coords, detectLocation, loading: geoLoading } = useGeolocation();

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
  const [district, setDistrict] = useState(currentUser?.district || geoDistrict || '');
  const [locality, setLocality] = useState(geoLocality || '');
  const [address, setAddress] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [aiClassified, setAiClassified] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | undefined>(undefined);
  const [suggestedAction, setSuggestedAction] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Check for pre-filled scan from Material Scanner
  useEffect(() => {
    const prefill = sessionStorage.getItem('greenloop_prefill_scan');
    if (prefill) {
      try {
        const data = JSON.parse(prefill);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setMaterialType(data.title || '');
        setAiClassified(true);
        setAiConfidence(data.ai_confidence);
        setSuggestedAction(data.suggested_action);
        if (data.image_url) setImageUrl(data.image_url);

        const matchedCat = categories.find((c) => c.slug === data.category_slug);
        if (matchedCat) setCategoryId(matchedCat.id);

        sessionStorage.removeItem('greenloop_prefill_scan');
      } catch (e) {
        console.error(e);
      }
    }
  }, [categories]);

  // Sync with detected district if not manually set
  useEffect(() => {
    if (geoDistrict && !district) {
      setDistrict(geoDistrict);
    }
    if (geoLocality && !locality) {
      setLocality(geoLocality);
    }
  }, [geoDistrict, geoLocality]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!district) {
      setError('Please select a Kerala district for pickup.');
      return;
    }

    if (!title || !description || quantity <= 0) {
      setError('Please fill all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const fallbackCoords = KERALA_DISTRICT_COORDS[district] || KERALA_DISTRICT_COORDS['Ernakulam'];
      const lat = coords ? coords.latitude : fallbackCoords.latitude;
      const lon = coords ? coords.longitude : fallbackCoords.longitude;

      const newId = addListing({
        user_id: currentUser ? currentUser.id : 'guest-user',
        category_id: categoryId || categories[0]?.id || 'cat-plastics',
        title,
        description,
        material_type: materialType || title,
        quantity,
        unit,
        listing_type: listingType,
        price: listingType === 'sale' ? price : 0,
        condition,
        district,
        locality: locality || district,
        address: address || '',
        latitude: lat,
        longitude: lon,
        status: 'active',
        ai_classified: aiClassified,
        ai_confidence: aiConfidence,
        suggested_action: suggestedAction,
        images: imageUrl ? [imageUrl] : [
          'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80'
        ],
      });

      navigate(`/marketplace/${newId}`);
    } catch (err: any) {
      setError(err?.message || 'Failed to create listing. Please try again.');
      setSubmitting(false);
    }
  };

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
          Connect with nearby compost producers, terrace gardeners, upcyclers, or collection hubs.
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
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-error-container text-on-error-container rounded-lg text-body-sm font-medium border border-error/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-error" />
              <span>{error}</span>
            </div>
          )}

          {/* Material Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Material Title *"
              required
              placeholder="e.g. Dry Coconut Husks, Corrugated Cartons, Clean Glass Bottles"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                Waste Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <Textarea
            label="Detailed Description & Condition *"
            required
            rows={3}
            placeholder="Describe quality, storage condition (dry/wet, clean), origin..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          {/* Quantity, Unit & Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Available Quantity *"
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                Standard Unit *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="units">Units / Pieces</option>
                <option value="sacks">Gunny Sacks</option>
                <option value="litres">Litres</option>
              </select>
            </div>

            <div>
              <label className="block font-label-md text-label-md text-on-surface mb-1 font-semibold">
                Pricing Mode *
              </label>
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value as ListingPricing)}
                className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant hover:border-outline focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 py-2.5 px-3 transition-all"
              >
                <option value="free">Free Donation (Recommended)</option>
                <option value="exchange">Barter Exchange</option>
                <option value="sale">Nominal Price (₹)</option>
              </select>
            </div>
          </div>

          {/* If nominal sale, show price field */}
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

          {/* Location Fields */}
          <div className="pt-2 border-t border-outline-variant/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-heading font-semibold text-title-md text-primary block">
                Pickup Location in Kerala
              </span>
              <button
                type="button"
                onClick={detectLocation}
                disabled={geoLoading}
                className="text-xs text-primary inline-flex items-center gap-1 hover:underline font-medium"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{geoLoading ? 'Detecting...' : 'Use My GPS Location'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
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

              <Input
                label="Ward / Locality *"
                placeholder="e.g. Kadavanthra, Panampilly Nagar"
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                required
              />

              <Input
                label="Pickup Landmark *"
                placeholder="e.g. Near Market Road Junction"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Optional Photo URL */}
          <div>
            <Input
              label="Photo Image URL (Optional)"
              placeholder="https://... (or leave empty for default material photo)"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              helperText="Paste an image link or use the Waste Scanner to snap a photo directly."
            />
          </div>

          <div className="pt-4 border-t border-outline-variant/40 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              fullWidth
              className="sm:w-auto"
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
              icon={<Plus className="w-4 h-4" />}
            >
              {submitting ? 'Publishing...' : 'Publish Material Listing'}
            </Button>
          </div>

        </form>
      </Card>
    </div>
  );
};
