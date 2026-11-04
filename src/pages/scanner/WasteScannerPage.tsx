import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  Check, 
  ArrowRight, 
  ShieldCheck, 
  RotateCw,
  FileCheck,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { analyzeWasteImage } from '../../lib/gemini';
import { AIScanResult } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Page Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-1.5 mb-1">
          <Badge variant="brand">AI Circular Diagnostic</Badge>
          <span className="text-outline text-xs">•</span>
          <span className="font-label-sm text-label-sm text-secondary">
            Gemini Multimodal Vision Engine
          </span>
        </div>
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
          AI Waste Scanner
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xl">
          Upload or photograph any waste item. The AI classifies its material type, estimates recyclability, provides safe handling guidance, and converts it into a listing.
        </p>
      </div>

      {/* Main Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Col (5 cols): Camera / File Upload Box */}
        <div className="md:col-span-5 space-y-4">
          <Card variant="elevated" className="space-y-4 text-center p-6 border-dashed border-2 border-outline-variant hover:border-primary-container transition-colors">
            {imagePreview ? (
              <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-container">
                <img
                  src={imagePreview}
                  alt="Scanned item"
                  className="w-full h-full object-cover"
                />
                {analyzing && (
                  <div className="absolute inset-0 bg-primary/75 backdrop-blur-sm flex flex-col items-center justify-center text-on-primary p-4 space-y-2">
                    <RotateCw className="w-8 h-8 animate-spin text-tertiary-fixed" />
                    <span className="font-heading font-semibold text-sm">Classifying Material...</span>
                    <span className="text-[11px] text-on-primary-container text-center">
                      Gemini Vision analyzing circular potential
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-surface-container text-primary flex items-center justify-center mx-auto">
                  <Camera className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="font-heading font-semibold text-sm text-primary">
                    Upload or snap a waste photo
                  </p>
                  <p className="text-xs text-on-surface-variant">
                    PNG, JPG, or WEBP up to 10MB
                  </p>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="flex gap-2">
              <Button
                variant="primary"
                fullWidth
                size="md"
                onClick={() => fileInputRef.current?.click()}
                icon={<Upload className="w-4 h-4" />}
              >
                {imagePreview ? 'Upload Different Photo' : 'Select Photo'}
              </Button>
            </div>
          </Card>

          {/* Demonstration Quick Picks */}
          <div className="space-y-2">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block font-semibold">
              Or test with sample discards:
            </span>
            <div className="grid grid-cols-2 gap-2">
              {demoImages.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleSelectDemoImage(item)}
                  className="flex items-center gap-2 p-2 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/50 text-left transition-colors"
                >
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-8 h-8 rounded object-cover shrink-0"
                  />
                  <span className="text-xs font-semibold text-primary truncate">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col (7 cols): Analysis Results */}
        <div className="md:col-span-7 space-y-4">
          {!scanResult && !analyzing && (
            <Card variant="flat" className="py-16 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center mx-auto text-outline">
                <Sparkles className="w-5 h-5 text-surface-tint" />
              </div>
              <h3 className="font-heading font-semibold text-title-md text-primary">
                Awaiting Material Scan
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto">
                Select a photo on the left or try one of the Kerala test samples to view instant AI circular insights.
              </p>
            </Card>
          )}

          {scanResult && (
            <Card variant="elevated" className="space-y-5 p-6 border border-outline-variant/70 shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant/40 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 font-label-sm text-label-sm text-primary font-bold bg-tertiary-fixed px-2.5 py-0.5 rounded-full mb-1">
                    <Sparkles className="w-3 h-3" />
                    {Math.round(scanResult.confidence * 100)}% Confidence Score
                  </div>
                  <h2 className="font-heading font-bold text-2xl text-primary">
                    {scanResult.detected_material}
                  </h2>
                  <span className="font-label-sm text-xs text-secondary font-semibold">
                    Category: {scanResult.category_name}
                  </span>
                </div>

                <div className="text-right">
                  <span className="font-label-sm text-[10px] text-outline block uppercase">Recyclability</span>
                  <span className="font-heading font-bold text-xl text-primary">
                    {scanResult.recyclability_score}/100
                  </span>
                </div>
              </div>

              {/* Action Recommendation */}
              <div className="p-3.5 bg-surface-container rounded-lg border border-outline-variant/40 space-y-1">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block font-semibold">
                  Recommended Circular Destination
                </span>
                <span className="font-heading font-bold text-title-md text-primary capitalize block">
                  {scanResult.suggested_action.replace('_', ' ')}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {scanResult.reasoning}
                </p>
              </div>

              {/* Safe Handling Guidance */}
              {scanResult.safety_guidance && scanResult.safety_guidance.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider block font-semibold">
                    Handling & Storage Protocol
                  </span>
                  <ul className="space-y-1 text-body-sm text-on-surface-variant">
                    {scanResult.safety_guidance.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-surface-tint shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action CTA: Turn into Listing */}
              <div className="pt-3 border-t border-outline-variant/40 flex items-center justify-between gap-3">
                <span className="font-body-sm text-body-sm text-outline">
                  Est. Batch: {scanResult.estimated_weight_range}
                </span>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleConvertToListing}
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  List This Material Now
                </Button>
              </div>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
};
