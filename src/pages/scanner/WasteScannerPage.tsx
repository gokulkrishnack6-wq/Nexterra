import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  RotateCw,
  FileCheck
} from 'lucide-react';
import { analyzeWasteImage } from '../../lib/gemini';
import { AIScanResult } from '../../types';

export const WasteScannerPage: React.FC = () => {
  const navigate = useNavigate();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Realistic test samples for demonstration
  const demoImages = [
    {
      title: 'Vegetable Peels',
      hint: 'vegetable kitchen food peel',
      url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Cardboard Boxes',
      hint: 'cardboard packaging boxes carton',
      url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Coconut Husks',
      hint: 'coconut husk agro biomass',
      url: 'https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'Secondary Cables',
      hint: 'electronic cables wiring circuits',
      url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
      triggerAnalysis(base64, file.type, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectDemoImage = (item: { title: string; hint: string; url: string }) => {
    setImagePreview(item.url);
    triggerAnalysis(item.url, 'image/jpeg', item.hint);
  };

  const triggerAnalysis = async (imgData: string, mime: string, nameHint: string) => {
    setAnalyzing(true);
    setScanResult(null);

    try {
      const result = await analyzeWasteImage(imgData, mime, nameHint);
      setScanResult(result);
    } catch (err) {
      console.error(err);
      alert('Error during waste analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConvertToListing = () => {
    if (!scanResult) return;

    sessionStorage.setItem('greenloop_prefill_scan', JSON.stringify({
      title: scanResult.detected_material,
      category_slug: scanResult.category_slug,
      description: `${scanResult.reasoning}\n\nEstimated batch weight: ${scanResult.estimated_weight_range}. Suitable for: ${scanResult.suggested_action}.`,
      suggested_action: scanResult.suggested_action,
      ai_classified: true,
      ai_confidence: scanResult.confidence,
      image_url: imagePreview,
    }));

    navigate('/marketplace/new');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Page Header */}
      <div className="max-w-xl space-y-1">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-forest">
          Material Scanner
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
          Not sure how to categorise your waste? Take a photo and let GreenLoop help identify it.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload / Camera */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-lg border border-[#E2E2D8] text-center space-y-4">
            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative aspect-[4/3] rounded-md overflow-hidden bg-cream border border-[#E2E2D8]">
                  <img
                    src={imagePreview}
                    alt="Scanned item"
                    className="w-full h-full object-cover"
                  />
                  {analyzing && (
                    <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center p-4 space-y-2">
                      <RotateCw className="w-5 h-5 text-forest animate-spin" />
                      <p className="text-xs font-medium text-charcoal">
                        Identifying material...
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzing}
                    className="flex-1 py-1.5 bg-cream hover:bg-[#EBEBE0] text-charcoal font-medium text-xs rounded border border-[#D5D5CA] transition-colors"
                  >
                    Replace Photo
                  </button>
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setScanResult(null);
                    }}
                    disabled={analyzing}
                    className="px-3 py-1.5 text-xs text-charcoal-muted hover:text-charcoal"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="py-10 cursor-pointer space-y-2 border-2 border-dashed border-[#D5D5CA] rounded-md hover:border-forest/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-md bg-cream border border-[#E2E2D8] flex items-center justify-center text-forest mx-auto">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-heading font-semibold text-xs text-charcoal">
                    Click to select or drop photo
                  </p>
                  <p className="text-[11px] text-charcoal-muted mt-0.5">
                    JPEG, PNG, WEBP (under 10MB)
                  </p>
                </div>
                <span className="inline-block bg-cream border border-[#D5D5CA] text-charcoal text-[11px] font-medium px-3 py-1 rounded">
                  Browse Files
                </span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Sample quick tests */}
          <div className="bg-white p-4 rounded-lg border border-[#E2E2D8] space-y-2 text-xs">
            <span className="font-medium text-charcoal block">Sample Test Materials:</span>
            <div className="grid grid-cols-2 gap-2">
              {demoImages.map((demo, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectDemoImage(demo)}
                  className="flex items-center gap-2 p-1.5 bg-cream hover:bg-[#EBEBE0] rounded border border-[#E2E2D8] text-left transition-colors"
                >
                  <img src={demo.url} alt="" className="w-7 h-7 rounded object-cover" />
                  <span className="text-[11px] font-medium text-charcoal truncate">
                    {demo.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostic Output */}
        <div className="md:col-span-7">
          {scanResult ? (
            <div className="bg-white rounded-lg border border-[#E2E2D8] p-6 space-y-5">
              <div className="pb-3 border-b border-[#F0F0E6]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-forest uppercase tracking-wider">
                    {scanResult.category_name}
                  </span>
                  <span className="text-xs text-charcoal-muted">
                    {scanResult.confidence}% confidence
                  </span>
                </div>
                <h3 className="font-heading font-bold text-lg text-charcoal mt-0.5">
                  {scanResult.detected_material}
                </h3>
              </div>

              {/* Recommendation */}
              <div className="p-3.5 bg-cream rounded-md border border-[#E2E2D8] space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-charcoal">Recommended Purpose:</span>
                  <span className="text-forest font-semibold capitalize">
                    {scanResult.suggested_action}
                  </span>
                </div>
                <p className="text-charcoal leading-relaxed pt-0.5">
                  {scanResult.reasoning}
                </p>
              </div>

              {/* Safety */}
              <div className="space-y-1.5 text-xs">
                <span className="font-medium text-charcoal flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-forest" />
                  <span>Handling & Safety Considerations:</span>
                </span>
                <ul className="space-y-1 text-charcoal-muted pl-5 list-disc">
                  {scanResult.safety_guidance.map((tip, idx) => (
                    <li key={idx} className="leading-relaxed">{tip}</li>
                  ))}
                </ul>
              </div>

              {/* Potential Recipients */}
              <div className="text-xs text-charcoal p-3 bg-cream rounded-md border border-[#E2E2D8]">
                <span className="font-medium">Potential Users: </span>
                <span className="text-charcoal-muted">{scanResult.potential_matches_summary}</span>
              </div>

              {/* Convert Action */}
              <div className="pt-2">
                <button
                  onClick={handleConvertToListing}
                  className="w-full py-2.5 bg-forest hover:bg-forest-dark text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Create Listing from this Scan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-[#E2E2D8] p-12 text-center text-xs space-y-2">
              <Camera className="w-8 h-8 text-charcoal-muted mx-auto" />
              <h3 className="font-heading font-semibold text-sm text-charcoal">
                Awaiting Material Photo
              </h3>
              <p className="text-charcoal-muted max-w-sm mx-auto leading-relaxed">
                Take a photograph or pick a sample on the left to see material classification and circular recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
