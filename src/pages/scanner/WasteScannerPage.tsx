import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ScanLine, 
  UploadCloud, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  Camera, 
  Recycle,
  Lightbulb,
  FileCheck
} from 'lucide-react';
import { analyzeWasteImage } from '../../lib/gemini';
import { AIScanResult } from '../../types';
import { useData } from '../../contexts/DataContext';

export const WasteScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories } = useData();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preset demo test images to make testing instantaneous for judges
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
      title: 'E-Waste & Cables',
      hint: 'electronic cables wiring circuits',
      url: 'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
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
    setFileName(item.hint);
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

    // Save scan context into sessionStorage so CreateListingPage can auto-populate
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-1.5 bg-lime/30 text-forest-dark border border-lime/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-forest" /> Powered by Google Gemini Vision
        </div>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-forest-dark">
          AI Waste Diagnostic Scanner
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Upload or snap a photograph of your discards. GreenLoop's multimodal AI classifies the material, 
          evaluates its circular value, provides safety tips, and converts it into a verified listing.
        </p>
      </div>

      {/* Upload & Scanner Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload / Camera */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-3xl border-2 border-dashed border-sage/60 hover:border-forest transition-colors shadow-soft text-center">
            {imagePreview ? (
              <div className="space-y-4">
                <div className="relative h-64 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
                  <img
                    src={imagePreview}
                    alt="Scanned item"
                    className="w-full h-full object-cover"
                  />
                  {analyzing && (
                    <div className="absolute inset-0 bg-forest/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 space-y-3">
                      <RefreshCw className="w-8 h-8 text-lime animate-spin" />
                      <p className="text-xs font-bold text-lime tracking-wide">
                        Gemini Neural Classification in Progress...
                      </p>
                      <p className="text-[11px] text-sage-light/80 text-center">
                        Analyzing polymer composition, moisture content, and optimal circular pathways...
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={analyzing}
                    className="flex-1 py-2 bg-offwhite hover:bg-slate-100 text-forest font-semibold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Another</span>
                  </button>
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setScanResult(null);
                    }}
                    disabled={analyzing}
                    className="px-3 py-2 text-slate-500 hover:text-red-500 text-xs font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="py-12 cursor-pointer space-y-3"
              >
                <div className="w-16 h-16 rounded-2xl bg-sage-light text-forest flex items-center justify-center mx-auto shadow-sm">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-heading font-bold text-sm text-forest-dark">
                    Click to upload waste photo
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    JPEG, PNG, WEBP (Max 10MB)
                  </p>
                </div>
                <span className="inline-block bg-forest text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm">
                  Browse Device Files
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

          {/* Quick Demo Samples for instant evaluation */}
          <div className="bg-white p-4 rounded-2xl border border-sage/40 shadow-soft space-y-2">
            <p className="text-xs font-bold text-forest-dark flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-forest" /> Quick Test Samples (TERRACODE Demo):
            </p>
            <div className="grid grid-cols-2 gap-2">
              {demoImages.map((demo, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectDemoImage(demo)}
                  className="flex items-center gap-2 p-1.5 bg-offwhite hover:bg-sage-light/60 rounded-xl border border-slate-200 text-left transition-colors"
                >
                  <img src={demo.url} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  <span className="text-[11px] font-medium text-slate-700 truncate">
                    {demo.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Scan Diagnostic Result */}
        <div className="lg:col-span-7">
          {scanResult ? (
            <div className="bg-white rounded-3xl border border-sage/50 shadow-elevated p-6 space-y-6">
              {/* Header Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold text-forest uppercase tracking-wider block">
                    {scanResult.category_name}
                  </span>
                  <h3 className="font-heading font-extrabold text-2xl text-forest-dark mt-0.5">
                    {scanResult.detected_material}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="bg-forest text-lime font-black px-3 py-1 rounded-xl text-xs flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-lime" />
                    <span>{scanResult.confidence}% Confidence</span>
                  </div>
                </div>
              </div>

              {/* Recommended Action Card */}
              <div className="p-4 bg-lime/20 border border-lime/40 rounded-2xl flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-forest text-lime flex items-center justify-center shrink-0 shadow-sm">
                  <Recycle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase text-forest-dark tracking-wide">
                      Recommended Circular Action:
                    </span>
                    <span className="bg-forest text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                      {scanResult.suggested_action}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {scanResult.reasoning}
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-offwhite rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-400 block font-medium">Recyclability Index</span>
                  <span className="font-heading font-black text-xl text-forest-dark">
                    {scanResult.recyclability_score} / 100
                  </span>
                </div>
                <div className="p-3 bg-offwhite rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-400 block font-medium">Estimated Weight Range</span>
                  <span className="font-heading font-black text-xl text-forest-dark">
                    {scanResult.estimated_weight_range}
                  </span>
                </div>
              </div>

              {/* Safety Guidance */}
              <div>
                <h4 className="text-xs font-bold text-forest-dark flex items-center gap-1.5 mb-2">
                  <ShieldCheck className="w-4 h-4 text-forest" />
                  <span>Mandatory Handling & Safety Guidance</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 bg-offwhite p-3.5 rounded-xl border border-slate-200">
                  {scanResult.safety_guidance.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-forest font-bold shrink-0">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Environmental Tips */}
              <div>
                <h4 className="text-xs font-bold text-forest-dark flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Circular Value & Ecological Dividend</span>
                </h4>
                <ul className="space-y-1.5 text-xs text-slate-600 bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/50">
                  {scanResult.circular_value_tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-700 font-bold shrink-0">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Potential Recipients Preview */}
              <div className="text-xs text-slate-600 flex items-center gap-2 p-3 bg-sage-light/30 rounded-xl border border-sage/50">
                <CheckCircle2 className="w-4 h-4 text-forest shrink-0" />
                <span><strong>Target Recipients:</strong> {scanResult.potential_matches_summary}</span>
              </div>

              {/* Primary 1-Click Convert to Listing Button */}
              <div className="pt-2">
                <button
                  onClick={handleConvertToListing}
                  className="w-full py-3.5 bg-forest hover:bg-forest-dark text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-elevated transition-all flex items-center justify-center gap-2 group"
                >
                  <FileCheck className="w-4 h-4 text-lime" />
                  <span>Convert Scan Results into Marketplace Listing</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  Pre-fills all AI parameters and redirects to the creation form.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-sage/40 p-12 text-center shadow-soft flex flex-col items-center justify-center min-h-[420px] space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-sage-light text-forest flex items-center justify-center">
                <ScanLine className="w-7 h-7" />
              </div>
              <h3 className="font-heading font-bold text-base text-forest-dark">
                Awaiting Image Input
              </h3>
              <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                Upload a photograph from your device or pick one of the sample batches on the left to see Gemini AI classify materials and generate circular matches.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
