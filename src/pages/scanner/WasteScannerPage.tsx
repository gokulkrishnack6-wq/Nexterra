import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Upload, 
  Check, 
  ArrowRight, 
  RotateCw,
  Sparkles,
  AlertCircle,
  X,
  RefreshCw,
  Key,
  ShieldAlert,
  CheckCircle2,
  SlidersHorizontal,
  Eye
} from 'lucide-react';
import { analyzeWasteImage, isGeminiConfigured, getGeminiApiKey, setGeminiSessionKey } from '../../lib/gemini';
import { AIScanResult } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { useData } from '../../contexts/DataContext';

export const WasteScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories } = useData();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editable fields for user correction
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [detectedMaterialName, setDetectedMaterialName] = useState<string>('');

  // Live Camera Viewfinder State
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // API Key Setting Modal
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [hasKey, setHasKey] = useState(isGeminiConfigured());

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setHasKey(isGeminiConfigured());
  }, []);

  // Cleanup webcam stream when leaving or closing
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    setImagePreview(null);
    setScanResult(null);

    // If mobile device, fallback to native camera input
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && cameraInputRef.current) {
      cameraInputRef.current.click();
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      // Fallback to camera input tag
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        setErrorMsg('Camera access was denied or is unavailable. Please upload a file instead.');
      }
    }
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setImagePreview(dataUrl);
      setImageMime('image/jpeg');
      stopCameraStream();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setScanResult(null);
    stopCameraStream();

    const mime = file.type || 'image/jpeg';
    setImageMime(mime);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setScanResult(null);
    setErrorMsg(null);
    stopCameraStream();
  };

  const handleRunScan = async () => {
    if (!imagePreview) return;
    setErrorMsg(null);
    setAnalyzing(true);
    setScanResult(null);

    try {
      const result = await analyzeWasteImage(imagePreview, imageMime);
      setScanResult(result);
      setDetectedMaterialName(result.detected_material);
      setSelectedCategory(result.category_slug);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process image with AI service.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveApiKey = () => {
    setGeminiSessionKey(apiKeyInput);
    setHasKey(isGeminiConfigured());
    setShowKeyModal(false);
    setErrorMsg(null);
  };

  const handleProceedToCreateListing = () => {
    if (!scanResult) return;

    // Use confirmed or manually adjusted category
    const finalCategorySlug = selectedCategory || scanResult.category_slug;
    const finalMaterialName = detectedMaterialName || scanResult.detected_material;

    sessionStorage.setItem('greenloop_prefill_scan', JSON.stringify({
      title: finalMaterialName,
      category_slug: finalCategorySlug,
      description: `${scanResult.reasoning}\n\nIdentified Characteristics: ${(scanResult.visible_characteristics || []).join(', ')}.\nEstimated Weight: ${scanResult.estimated_weight_range}.\nRecommended Action: ${scanResult.suggested_action}.`,
      suggested_action: scanResult.suggested_action,
      ai_classified: true,
      ai_confidence: scanResult.confidence,
      image_url: imagePreview,
    }));

    navigate('/marketplace/new');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 mb-1">
            <Badge variant="brand">Multimodal Computer Vision</Badge>
            <span className="text-outline text-xs">•</span>
            <span className="font-label-sm text-label-sm text-secondary">
              Real-time Pixel Analysis
            </span>
          </div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
            AI Waste Material Scanner
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xl">
            Take a photo or upload an image of discarded material. The AI inspects physical features, checks clarity, estimates recyclability, and guides circular recovery.
          </p>
        </div>

        {/* API Key Status Pill / Setting */}
        <button
          onClick={() => setShowKeyModal(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-label-md transition-colors self-start sm:self-auto bg-surface-container hover:bg-surface-container-high border-outline-variant text-on-surface"
        >
          <Key className="w-3.5 h-3.5 text-primary" />
          <span>{hasKey ? 'Gemini API Configured' : 'Configure Gemini API Key'}</span>
        </button>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm">
          <Card variant="elevated" className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-outline-variant/60 pb-3">
              <h3 className="font-heading font-semibold text-title-md text-primary">
                Gemini Vision API Configuration
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="text-outline hover:text-on-surface">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="font-body-sm text-body-sm text-on-surface-variant">
              To perform real visual classification, provide a Google Gemini API Key. You can get a free key from <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-primary underline font-medium">Google AI Studio</a>.
            </p>

            <div className="space-y-1">
              <label className="font-label-md text-xs text-on-surface block">Gemini API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-mono text-xs focus:outline-none focus:border-primary-container"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowKeyModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveApiKey}>
                Save Key
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Scanner Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Col (5 cols): Camera Viewfinder / Preview Container */}
        <div className="md:col-span-5 space-y-4">
          <Card variant="elevated" className="p-4 space-y-4">
            {/* Live Camera Viewfinder */}
            {cameraActive && (
              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={captureCameraSnapshot}
                    icon={<Camera className="w-4 h-4" />}
                  >
                    Snap Photo
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={stopCameraStream}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Static Image Preview */}
            {!cameraActive && imagePreview && (
              <div className="space-y-3">
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-surface-container border border-outline-variant/60">
                  <img
                    src={imagePreview}
                    alt="Captured material preview"
                    className="w-full h-full object-cover"
                  />
                  {analyzing && (
                    <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm flex flex-col items-center justify-center text-on-primary p-4 space-y-2">
                      <RotateCw className="w-8 h-8 animate-spin text-tertiary-fixed" />
                      <span className="font-heading font-semibold text-sm">Analyzing Visual Characteristics...</span>
                      <span className="text-[11px] text-on-primary-container text-center">
                        Inspecting texture, color, polymer markers & clarity
                      </span>
                    </div>
                  )}
                </div>

                {/* Pre-scan Action Buttons */}
                {!analyzing && (
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="primary"
                      fullWidth
                      size="md"
                      onClick={handleRunScan}
                      icon={<Sparkles className="w-4 h-4 text-tertiary-fixed" />}
                    >
                      {scanResult ? 'Re-scan with AI' : 'Run Genuine AI Analysis'}
                    </Button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        fullWidth
                        size="sm"
                        onClick={startCamera}
                        icon={<RefreshCw className="w-3.5 h-3.5" />}
                      >
                        Retake Photo
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveImage}
                        icon={<X className="w-3.5 h-3.5" />}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Empty State / Photo Selection Trigger */}
            {!cameraActive && !imagePreview && (
              <div className="py-12 px-4 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-surface-container text-primary flex items-center justify-center mx-auto">
                  <Camera className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-heading font-semibold text-body-md text-primary">
                    Capture or Upload Waste Material
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant max-w-xs mx-auto">
                    Take a clear, well-lit photo of the discarded item. Works with camera or files.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <Button
                    variant="primary"
                    fullWidth
                    size="md"
                    onClick={startCamera}
                    icon={<Camera className="w-4 h-4" />}
                  >
                    Open Camera
                  </Button>
                  <Button
                    variant="secondary"
                    fullWidth
                    size="md"
                    onClick={() => fileInputRef.current?.click()}
                    icon={<Upload className="w-4 h-4" />}
                  >
                    Upload from Gallery / Files
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Right Col (7 cols): Genuine Analysis Results */}
        <div className="md:col-span-7 space-y-4">
          
          {/* Error Message Display */}
          {errorMsg && (
            <div className="p-4 bg-error-container text-on-error-container rounded-xl border border-error/30 text-body-sm space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>AI Service Notice</span>
              </div>
              <p className="text-xs leading-relaxed">{errorMsg}</p>
              {!hasKey && (
                <Button
                  size="sm"
                  variant="subtle"
                  onClick={() => setShowKeyModal(true)}
                  className="mt-2 text-xs"
                >
                  Configure Gemini API Key Now
                </Button>
              )}
            </div>
          )}

          {/* Initial Instructions placeholder */}
          {!scanResult && !analyzing && !errorMsg && (
            <Card variant="flat" className="py-16 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center mx-auto text-outline">
                <Eye className="w-6 h-6 text-surface-tint" />
              </div>
              <h3 className="font-heading font-semibold text-title-md text-primary">
                Awaiting Photo Input
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm mx-auto">
                Capture a photo using your camera or upload an image to receive genuine multimodal material identification.
              </p>
            </Card>
          )}

          {/* Scan Results View */}
          {scanResult && (
            <Card variant="elevated" className="p-6 space-y-5">
              
              {/* Ambiguity Warning Banner if image was blurry or uncertain */}
              {scanResult.is_ambiguous && (
                <div className="p-3.5 bg-secondary-container/60 text-on-secondary-container rounded-lg border border-secondary/30 flex items-start gap-2.5 text-xs">
                  <ShieldAlert className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Image Ambiguity Detected</span>
                    <span>{scanResult.ambiguity_reason || 'The image appears blurry or contains multiple mixed items. You can manually adjust the category below.'}</span>
                  </div>
                </div>
              )}

              {/* Title & Category Header */}
              <div className="flex items-start justify-between gap-3 border-b border-outline-variant/50 pb-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-label-sm text-xs font-bold text-primary bg-tertiary-fixed px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      {Math.round(scanResult.confidence)}% Confidence
                    </span>
                    {scanResult.subcategory && (
                      <span className="font-label-sm text-xs text-outline bg-surface-container px-2 py-0.5 rounded-full">
                        {scanResult.subcategory}
                      </span>
                    )}
                  </div>

                  <h2 className="font-heading font-bold text-2xl text-primary mt-1">
                    {scanResult.detected_material}
                  </h2>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-label-sm text-[10px] text-outline uppercase block">Recyclability</span>
                  <span className="font-heading font-bold text-2xl text-primary">
                    {scanResult.recyclability_score}/100
                  </span>
                </div>
              </div>

              {/* Manual Category Correction Dropdown */}
              <div className="p-3 bg-surface-container rounded-lg border border-outline-variant/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-label-md font-semibold text-on-surface">
                    Assigned Category (Verify or Correct Manually):
                  </label>
                  <span className="text-outline text-[11px]">User editable</span>
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg border border-outline-variant py-2 px-3 focus:outline-none focus:border-primary-container"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Visible Characteristics Observed */}
              {scanResult.visible_characteristics && scanResult.visible_characteristics.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-label-sm text-xs text-outline uppercase tracking-wider block font-semibold">
                    Visible Characteristics Detected
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {scanResult.visible_characteristics.map((trait, idx) => (
                      <span key={idx} className="font-body-sm text-xs bg-surface-container-low text-on-surface px-2.5 py-1 rounded-md border border-outline-variant/40">
                        • {trait}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reasoning & Circular Destination */}
              <div className="p-3.5 bg-surface-container-low rounded-lg border border-outline-variant/40 space-y-1">
                <span className="font-label-sm text-xs text-outline uppercase tracking-wider block font-semibold">
                  Circular Pathway Recommendation
                </span>
                <span className="font-heading font-bold text-title-md text-primary capitalize block">
                  {scanResult.suggested_action.replace('_', ' ')}
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  {scanResult.reasoning}
                </p>
              </div>

              {/* Safety & Handling Warnings */}
              {scanResult.safety_guidance && scanResult.safety_guidance.length > 0 && (
                <div className="space-y-1.5">
                  <span className="font-label-sm text-xs text-outline uppercase tracking-wider block font-semibold">
                    Safety & Handling Protocol
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

              {/* Pre-fill into Listing CTA */}
              <div className="pt-4 border-t border-outline-variant/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="font-body-sm text-xs text-outline">
                  Est. Batch Range: {scanResult.estimated_weight_range}
                </span>

                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleProceedToCreateListing}
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  Create Listing with this Information
                </Button>
              </div>

            </Card>
          )}

        </div>

      </div>
    </div>
  );
};
