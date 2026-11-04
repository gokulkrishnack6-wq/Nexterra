import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { KERALA_DISTRICTS } from '../../lib/mockData';
import { ListingPricing } from '../../types';

export const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories, addListing } = useData();
  const { currentUser } = useAuth();

  // Form State
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [description, setDescription] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [quantity, setQuantity] = useState<number>(15);
  const [unit, setUnit] = useState('kg');
  const [listingType, setListingType] = useState<ListingPricing>('free');
  const [price, setPrice] = useState<number>(0);
  const [condition, setCondition] = useState('clean/dry');
  const [district, setDistrict] = useState(currentUser.district || 'Malappuram');
  const [locality, setLocality] = useState('Perinthalmanna');
  const [address, setAddress] = useState('Near Town Hall');
  const [imageUrl, setImageUrl] = useState('');
  const [aiClassified, setAiClassified] = useState(false);
  const [aiConfidence, setAiConfidence] = useState<number | undefined>(undefined);
  const [suggestedAction, setSuggestedAction] = useState<string | undefined>(undefined);

  // Check for pre-filled scan from AI Scanner
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description || quantity <= 0) {
      alert('Please fill all required fields');
      return;
    }

    const newId = addListing({
      user_id: currentUser.id,
      category_id: categoryId,
      title,
      description,
      material_type: materialType || title,
      quantity,
      unit,
      listing_type: listingType,
      price: listingType === 'sale' ? price : 0,
      condition,
      district,
      locality,
      address,
      latitude: currentUser.latitude || 10.9760,
      longitude: currentUser.longitude || 76.2254,
      status: 'active',
      ai_classified: aiClassified,
      ai_confidence: aiConfidence,
      suggested_action: suggestedAction,
      images: imageUrl ? [imageUrl] : [
        'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80'
      ],
    });

    navigate(`/marketplace/${newId}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-xs font-medium text-charcoal-muted hover:text-forest"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-[#E2E2D8] p-6 sm:p-8 space-y-6">
        <div className="border-b border-[#F0F0E6] pb-4">
          <h1 className="font-heading font-bold text-xl sm:text-2xl text-forest">
            List Material
          </h1>
          <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
            Provide details of materials you have available for collection across Kerala.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-xs">
          {/* Title */}
          <div>
            <label className="block font-medium text-charcoal mb-1">
              Material Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 20kg Clean Vegetable Peels & Discarded Produce"
              className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          {/* Category & Material Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-charcoal mb-1">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-charcoal mb-1">
                Material Classification
              </label>
              <input
                type="text"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                placeholder="e.g. Kitchen vegetable pre-consumer cutoffs"
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          {/* Quantity, Unit, Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-charcoal mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>

            <div>
              <label className="block font-medium text-charcoal mb-1">
                Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="sacks">Sacks / Bags</option>
                <option value="units">Individual Units</option>
                <option value="litres">Litres</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-charcoal mb-1">
                Pricing Type
              </label>
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value as ListingPricing)}
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              >
                <option value="free">Free Giveaway</option>
                <option value="exchange">Resource Exchange / Barter</option>
                <option value="sale">Scrap Sale</option>
              </select>
            </div>
          </div>

          {listingType === 'sale' && (
            <div>
              <label className="block font-medium text-charcoal mb-1">
                Price (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block font-medium text-charcoal mb-1">
              Description & Storage Condition *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="State how the item was stored, cleanliness, packaging, or any collection details."
              className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest leading-relaxed"
            />
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-charcoal mb-1">
                District *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              >
                {KERALA_DISTRICTS.filter((d) => d !== 'All Kerala').map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-charcoal mb-1">
                Locality / Town *
              </label>
              <input
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="e.g. Perinthalmanna Town"
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>

            <div>
              <label className="block font-medium text-charcoal mb-1">
                Street / Landmark
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Near Bypass Junction"
                className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block font-medium text-charcoal mb-1">
              Photograph URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://... (Uses category default if left empty)"
              className="w-full px-3 py-2 bg-cream border border-[#D5D5CA] rounded-md text-xs text-charcoal focus:outline-none focus:ring-1 focus:ring-forest"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F0F0E6]">
            <button
              type="button"
              onClick={() => navigate('/marketplace')}
              className="px-4 py-2 text-xs font-medium text-charcoal-muted hover:text-charcoal"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-forest hover:bg-forest-dark text-white font-semibold text-xs rounded-md transition-colors"
            >
              Publish Material
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
