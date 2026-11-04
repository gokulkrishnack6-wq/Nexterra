import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Sparkles, 
  ArrowLeft, 
  Image as ImageIcon, 
  MapPin, 
  Scale, 
  CheckCircle2, 
  Info 
} from 'lucide-react';
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-forest hover:text-forest-dark"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-sage/40 shadow-soft p-6 sm:p-8 space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-forest-dark">
              List Reusable / Recyclable Material
            </h1>
            {aiClassified && (
              <span className="bg-lime text-forest-dark font-extrabold text-xs px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> AI Pre-filled
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Provide details of your surplus waste batch so local farmers, gardeners, and recyclers can connect.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-forest-dark mb-1">
              Listing Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., 20kg Clean Vegetable Peels & Discarded Produce"
              className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-forest text-slate-800"
            />
          </div>

          {/* Category & Material Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                Waste Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-forest text-slate-800"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.is_organic ? 'Organic' : 'Inorganic'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                Specific Material Classification
              </label>
              <input
                type="text"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                placeholder="E.g., Pre-consumer potato & cabbage cutoffs"
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-forest text-slate-800"
              />
            </div>
          </div>

          {/* Quantity, Unit, Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-forest text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                Unit of Measurement
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-forest text-slate-800"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="sacks">Sacks / Bags</option>
                <option value="units">Individual Units</option>
                <option value="litres">Litres</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                Listing Type
              </label>
              <select
                value={listingType}
                onChange={(e) => setListingType(e.target.value as ListingPricing)}
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-forest text-slate-800"
              >
                <option value="free">Free Giveaway</option>
                <option value="exchange">Resource Barter / Exchange</option>
                <option value="sale">Nominal Scrap Sale</option>
              </select>
            </div>
          </div>

          {listingType === 'sale' && (
            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                Total Price (₹ INR)
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-forest text-slate-800"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-forest-dark mb-1">
              Detailed Description & Handling Notes *
            </label>
            <textarea
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mention how the material was collected, storage conditions, whether it is dry, sorted, or packaged in boxes/sacks."
              className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-forest text-slate-800 leading-relaxed"
            />
          </div>

          {/* Location in Kerala */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                District *
              </label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-forest text-slate-800"
              >
                {KERALA_DISTRICTS.filter((d) => d !== 'All Kerala').map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                Locality / Town *
              </label>
              <input
                type="text"
                required
                value={locality}
                onChange={(e) => setLocality(e.target.value)}
                placeholder="E.g., Perinthalmanna Town"
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-forest text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-forest-dark mb-1">
                Street / Landmark
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="E.g., Near Bypass Junction"
                className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-forest text-slate-800"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-xs font-bold text-forest-dark mb-1">
              Photograph URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/... (Defaults to category image if empty)"
              className="w-full px-3.5 py-2.5 bg-offwhite border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-forest text-slate-800"
            />
          </div>

          {/* Points Incentive Note */}
          <div className="p-3 bg-sage-light/50 border border-sage/60 rounded-xl flex items-center justify-between text-xs">
            <span className="text-forest-dark font-medium">
              🌿 Publishing this listing will credit <strong>+30 EcoPoints</strong> to your profile!
            </span>
            <span className="font-bold text-forest bg-white px-2.5 py-0.5 rounded shadow-sm">
              Reward Ready
            </span>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/marketplace')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-forest hover:bg-forest-dark text-white font-bold text-xs rounded-xl shadow-md hover:shadow-elevated transition-all flex items-center gap-2"
            >
              <PlusCircle className="w-4 h-4 text-lime" />
              <span>Publish Listing to GreenLoop</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
