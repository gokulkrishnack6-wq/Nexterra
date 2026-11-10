import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Upload,
  Check,
  ArrowRight,
  Sparkles,
  AlertCircle,
  X,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  CheckCircle2,
  Eye,
  AlertTriangle,
  Layers,
  Recycle,
  Lightbulb,
  ShieldCheck,
  Maximize2,
  Zap,
  Leaf,
  Factory,
  ChevronRight,
  TrendingUp,
  Sliders,
  FileText,
  Clock,
  Loader2,
  ScanLine
} from 'lucide-react';
import { analyzeWasteImage } from '../../lib/gemini';
import { AIScanResult, ScanPrefillData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { compressImage } from '../../utils/imageCompressor';

export const WasteScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories, setPendingScanPrefill } = useData();

  const [activeTab, setActiveTab] = useState<'live' | 'upload' | 'batch'>('upload');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [analyzing, setAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<AIScanResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Backend Edge Function status
  const [backendStatus, setBackendStatus] = useState<'checking' | 'ready' | 'pending'>('checking');

  // Editable fields for user correction
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [detectedMaterialName, setDetectedMaterialName] = useState<string>('');

  // Live Camera Viewfinder State
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Probe backend Edge Function deployment health
  useEffect(() => {
    let isMounted = true;
    async function probeBackend() {
      try {
        const res = await fetch('https://czytsaajiicpivjkrbey.supabase.co/functions/v1/analyze-waste-image', {
          method: 'OPTIONS',
        });
        if (isMounted) {
          if (res.ok || res.status === 200 || res.status === 204) {
            setBackendStatus('ready');
          } else {
            setBackendStatus('pending');
          }
        }
      } catch (_) {
        if (isMounted) setBackendStatus('pending');
      }
    }
    probeBackend();
    return () => { isMounted = false; };
  }, []);

  // Cleanup webcam stream when leaving or switching
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
      setActiveTab('live');
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      if (cameraInputRef.current) {
        cameraInputRef.current.click();
      } else {
        setErrorMsg('Camera access was denied or is unavailable. Please upload a photograph instead.');
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
      triggerAiScan(dataUrl, 'image/jpeg');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setScanResult(null);
    stopCameraStream();

    try {
      // Downsample and compress image client-side to prevent mobile memory crashes
      // and ensure high-speed upload to Gemini vision function
      const compressed = await compressImage(file, 1200, 1200, 0.82);
      setImagePreview(compressed.dataUrl);
      setImageMime(compressed.mimeType);
      triggerAiScan(compressed.dataUrl, compressed.mimeType);
    } catch (err: any) {
      console.warn('Image compression fallback:', err);
      const mime = file.type || 'image/jpeg';
      setImageMime(mime);

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImagePreview(base64);
        triggerAiScan(base64, mime);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAiScan = async (base64Img: string, mime: string) => {
    setErrorMsg(null);
    setAnalyzing(true);
    setScanResult(null);

    try {
      const result = await analyzeWasteImage(base64Img, mime);
      setScanResult(result);
      setDetectedMaterialName(result.detected_material);
      setSelectedCategory(result.category_slug);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to process image with material analysis service.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setScanResult(null);
    setErrorMsg(null);
    stopCameraStream();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleProceedToCreateListing = () => {
    if (!scanResult) return;

    const finalCategorySlug = selectedCategory || scanResult.category_slug;
    const finalMaterialName = detectedMaterialName || scanResult.detected_material;
    const finalMaterialType = scanResult.subcategory || detectedMaterialName || scanResult.detected_material;

    // Structured description formatting
    const descriptionParts: string[] = [];
    if (scanResult.reasoning) {
      descriptionParts.push(scanResult.reasoning);
    }
    if (scanResult.visible_characteristics && scanResult.visible_characteristics.length > 0) {
      descriptionParts.push(`Identified Characteristics: ${scanResult.visible_characteristics.join(', ')}.`);
    }
    if (scanResult.recycling_methods && scanResult.recycling_methods.length > 0) {
      descriptionParts.push(`Recommended Circular Recovery: ${scanResult.recycling_methods[0]}.`);
    }
    if (scanResult.estimated_weight_range) {
      descriptionParts.push(`Estimated Quantity / Weight: ${scanResult.estimated_weight_range}.`);
    }
    if (scanResult.suggested_action) {
      descriptionParts.push(`Suggested Action: ${scanResult.suggested_action}.`);
    }

    const formattedDescription = descriptionParts.join('\n\n');

    const prefillPayload: ScanPrefillData = {
      title: finalMaterialName,
      material_type: finalMaterialType,
      category_slug: finalCategorySlug,
      category_name: categories.find((c) => c.slug === finalCategorySlug)?.name || scanResult.category_name,
      subcategory: scanResult.subcategory,
      description: formattedDescription,
      suggested_action: scanResult.suggested_action,
      recycling_method: scanResult.recycling_methods?.[0],
      ai_classified: true,
      ai_confidence: scanResult.confidence,
      recyclability_score: scanResult.recyclability_score,
      image_url: imagePreview || undefined,
    };

    // 1. Shared state in DataContext (in-memory React tree, 100% reliable across SPA navigation)
    setPendingScanPrefill(prefillPayload);

    // 2. Safe sessionStorage with quota-safe try-catch
    try {
      sessionStorage.setItem('greenloop_prefill_scan', JSON.stringify(prefillPayload));
    } catch (storageErr) {
      console.warn('SessionStorage quota exceeded or disabled, trying text-only payload:', storageErr);
      try {
        const textOnlyPayload = { ...prefillPayload, image_url: undefined };
        sessionStorage.setItem('greenloop_prefill_scan', JSON.stringify(textOnlyPayload));
      } catch (_) {}
    }

    // 3. React Router navigation state
    navigate('/marketplace/new', { state: { prefillScan: prefillPayload } });
  };

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto pb-space-xl text-left font-body-md text-on-surface antialiased">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. TOP HEADER SECTION */}
      <div className="flex flex-col gap-space-sm mb-4">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-xs border border-outline-variant/40">
            <span className={`w-2 h-2 rounded-full ${
              backendStatus === 'ready'
                ? 'bg-green-600 ring-2 ring-green-600/20'
                : backendStatus === 'checking'
                ? 'bg-blue-500 animate-pulse'
                : 'bg-amber-500 animate-pulse'
            }`} />
            <span className="font-semibold text-primary">
              {backendStatus === 'ready'
                ? 'Scanner: Ready'
                : backendStatus === 'checking'
                ? 'Connecting Scanner...'
                : 'Scanner: Offline'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-secondary font-label-sm text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>AI Material Detection</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E8E4DA] pb-5">
          <div className="max-w-3xl">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl lg:text-[34px] text-[#18251F] tracking-tight">
              Waste Scanner
            </h1>
            <p className="font-sans text-sm text-[#6F776F] mt-1 leading-relaxed">
              Take or upload a photo to identify recyclable materials and pre-fill your marketplace listing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/marketplace')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F8F6EF] text-[#18251F] font-semibold text-xs transition-colors shadow-xs border border-[#E8E4DA]"
              type="button"
            >
              <Recycle className="w-4 h-4 text-[#103D2A]" />
              <span>Browse Marketplace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Deployment Alert Box if not deployed */}
      {backendStatus === 'pending' && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-heading font-bold text-sm text-amber-900">
              Supabase Edge Function Not Deployed
            </span>
            <p className="text-amber-800 leading-relaxed">
              The backend function <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">analyze-waste-image</code> is not deployed to Supabase project <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-semibold">czytsaajiicpivjkrbey</code> yet. Image scans will report that the service is awaiting deployment until Supabase authentication is completed.
            </p>
          </div>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMsg && (
        <div className="mb-4 p-4 rounded-xl bg-error-container/40 border border-error/30 text-on-error-container text-xs flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-error shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-heading font-bold text-error">Material Analysis Error</span>
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="p-1 hover:bg-error-container rounded text-error"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. MAIN 12-COLUMN RESPONSIVE WORKSPACE: Viewport (7 cols) + Diagnostic Output (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">

        {/* LEFT COLUMN: Diagnostic Capture & Active Viewport (7 Cols) */}
        <section className="lg:col-span-7 flex flex-col gap-space-md">

          {/* Ingestion Mode Selector Tabs */}
          <div className="bg-white rounded-xl p-1.5 border border-gl-border shadow-2xs flex items-center justify-between gap-1">
            <button
              onClick={startCamera}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs transition-colors shadow-2xs ${
                activeTab === 'live' || cameraActive
                  ? 'bg-gl-forest text-white font-semibold'
                  : 'text-gl-charcoal-muted hover:bg-gl-cream hover:text-gl-charcoal'
              }`}
              type="button"
            >
              <Camera className="w-4 h-4" />
              <span>Camera Stream</span>
            </button>

            <button
              onClick={() => {
                stopCameraStream();
                setActiveTab('upload');
                fileInputRef.current?.click();
              }}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs transition-colors shadow-2xs ${
                activeTab === 'upload' && !cameraActive
                  ? 'bg-gl-forest text-white font-semibold'
                  : 'text-gl-charcoal-muted hover:bg-gl-cream hover:text-gl-charcoal'
              }`}
              type="button"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Photo</span>
            </button>
          </div>

          {/* CIRCULARNET HUD VIEWFINDER CONTAINER (Stitch 1:1) */}
          <div className="relative w-full aspect-[4/3] rounded-2xl bg-[#03150D] overflow-hidden shadow-2xl border border-primary-container/40 flex items-center justify-center">

            {/* Background Reticle Grid Lines */}
            <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#174d36_1px,transparent_1px)] [background-size:24px_24px]" />

            {/* Corner Bracket Reticles (Stitch HUD) */}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-2 border-l-2 border-primary-fixed pointer-events-none z-20" />
            <div className="absolute top-4 right-4 w-7 h-7 border-t-2 border-r-2 border-primary-fixed pointer-events-none z-20" />
            <div className="absolute bottom-4 left-4 w-7 h-7 border-b-2 border-l-2 border-primary-fixed pointer-events-none z-20" />
            <div className="absolute bottom-4 right-4 w-7 h-7 border-b-2 border-r-2 border-primary-fixed pointer-events-none z-20" />

            {/* Viewfinder Content: Live Camera or Static Image Preview */}
            {cameraActive ? (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : imagePreview ? (
              <img
                src={imagePreview}
                alt="Captured material for circular analysis"
                className="w-full h-full object-contain bg-black/40"
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
                <div className="w-16 h-16 rounded-2xl bg-surface-container/10 border border-primary-container/30 flex items-center justify-center text-primary-fixed shadow-inner">
                  <ScanLine className="w-8 h-8 animate-pulse text-secondary-fixed" />
                </div>
                <div className="flex flex-col gap-1 max-w-sm">
                  <span className="font-heading font-semibold text-sm text-surface-bright">
                    Viewfinder Idle
                  </span>
                  <span className="font-body-sm text-xs text-on-surface-variant text-zinc-400">
                    Click "Camera Stream" or "Upload Photo" to position waste material within the reticle brackets.
                  </span>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={startCamera}
                    className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-4 h-4" /> Start Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-surface-container-high text-primary text-xs font-semibold hover:bg-surface-container transition-colors flex items-center gap-1.5"
                  >
                    <Upload className="w-4 h-4" /> Browse File
                  </button>
                </div>
              </div>
            )}

            {/* Animated Laser Scanning Line during analysis */}
            {analyzing && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-tertiary-fixed to-transparent shadow-[0_0_15px_#ccef7e] z-30 animate-bounce top-1/3" />
            )}

            {/* Scanning HUD Telemetry Overlay */}
            {imagePreview && !analyzing && (
              <div className="absolute top-4 inset-x-4 flex justify-between items-center z-20 pointer-events-none">
                <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white font-mono text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
                  <span>FRAME LOCKED</span>
                </div>
                <div className="bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-white font-mono text-[11px]">
                  <span>RES: 1280x720</span>
                </div>
              </div>
            )}

            {/* Live Camera Bottom Action Controls */}
            {cameraActive && (
              <div className="absolute bottom-5 inset-x-0 flex items-center justify-center gap-4 z-20">
                <button
                  onClick={stopCameraStream}
                  className="px-4 py-2 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium hover:bg-black/80 transition-all border border-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={captureCameraSnapshot}
                  className="w-16 h-16 rounded-full bg-white border-4 border-primary-container p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-2xl"
                  aria-label="Capture photograph"
                >
                  <div className="w-full h-full rounded-full bg-primary-container" />
                </button>
              </div>
            )}
          </div>

          {/* Action Bar Below Viewfinder */}
          {imagePreview && !cameraActive && (
            <div className="bg-surface-container-lowest p-space-sm rounded-xl border border-outline-variant/60 shadow-sm flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-error text-xs font-medium transition-colors flex items-center gap-1"
                >
                  <X className="w-4 h-4" /> Retake / Clear
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => triggerAiScan(imagePreview, imageMime)}
                  disabled={analyzing}
                  className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {analyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Inspecting Pixels...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-tertiary-fixed" />
                      <span>Re-Analyze Material</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Diagnostic Results & Conversion (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-4">

          {/* Card 1: Primary Material Identity Card */}
          <div className="bg-white rounded-2xl p-6 border border-gl-border shadow-card flex flex-col gap-3">
            <div className="flex items-center justify-between pb-2 border-b border-gl-border">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gl-forest" />
                <h3 className="font-heading font-bold text-base text-gl-charcoal">
                  Material Identification
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                scanResult
                  ? 'bg-gl-sage-light text-gl-dark border border-gl-sage'
                  : 'bg-gl-cream text-gl-charcoal-muted border border-gl-border'
              }`}>
                {scanResult ? `${scanResult.confidence.toFixed(1)}% Confidence` : 'Awaiting Image'}
              </span>
            </div>

            {scanResult ? (
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-heading font-bold text-lg text-gl-charcoal">
                      {detectedMaterialName || scanResult.detected_material}
                    </span>
                    <span className="text-xs text-gl-charcoal-muted font-medium">
                      Category: <strong className="text-gl-forest">{
                        categories.find((c) => c.slug === selectedCategory)?.name || scanResult.category_name
                      }</strong>
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gl-sage-light text-gl-dark border border-gl-sage shrink-0">
                    {scanResult.subcategory || selectedCategory}
                  </span>
                </div>

                {/* Editable Material Name & Category Confirmation */}
                <div className="bg-gl-cream/60 rounded-xl p-3.5 border border-gl-border flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gl-charcoal flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-gl-fresh" />
                      Confirm or Correct Material Classification
                    </span>
                    <span className="text-[11px] text-gl-charcoal-muted">Editable</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-gl-charcoal mb-1">
                        Material Title
                      </label>
                      <input
                        type="text"
                        value={detectedMaterialName}
                        onChange={(e) => setDetectedMaterialName(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gl-border text-gl-charcoal text-xs focus:ring-2 focus:ring-gl-forest/20 focus:border-gl-forest focus:outline-none"
                        placeholder="Material title..."
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gl-charcoal mb-1">
                        Waste Category
                      </label>
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gl-border text-gl-charcoal text-xs focus:ring-2 focus:ring-gl-forest/20 focus:border-gl-forest focus:outline-none"
                      >
                        <option value="plastics">Plastics (PET bottles, HDPE, PP)</option>
                        <option value="metals">Metals (Aluminium cans, scrap iron)</option>
                        <option value="paper">Paper &amp; Cardboard</option>
                        <option value="organic">Organic &amp; Food Waste</option>
                        <option value="agricultural">Coconut &amp; Agricultural Residue</option>
                        <option value="glass">Glass Bottles &amp; Cullet</option>
                        <option value="e-waste">Electronic Waste</option>
                        <option value="textiles">Textiles &amp; Fabrics</option>
                        <option value="other">Other Circular Materials</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Ambiguity or Clarity Notification */}
                {scanResult.is_ambiguous && (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <strong className="font-semibold">Photo Ambiguity Detected:</strong>
                      <span>{scanResult.ambiguity_reason}</span>
                    </div>
                  </div>
                )}

                {/* Discarded vs Commercial Product Observation */}
                {scanResult.product_vs_waste_notes && (
                  <div className="p-2.5 rounded-xl bg-gl-cream/50 text-xs text-gl-charcoal-muted border border-gl-border">
                    <strong className="text-gl-charcoal font-medium">Condition Check: </strong>
                    {scanResult.product_vs_waste_notes}
                  </div>
                )}

                {/* Visible Physical Features */}
                {scanResult.visible_characteristics && scanResult.visible_characteristics.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gl-charcoal-muted uppercase tracking-wide font-semibold">
                      Observed Characteristics
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {scanResult.visible_characteristics.map((char, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-gl-cream text-[11px] text-gl-charcoal font-medium border border-gl-border">
                          {char}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recyclability Score Gauge */}
                <div className="flex flex-col gap-1 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gl-charcoal-muted font-medium">Recyclability Score</span>
                    <span className="font-bold text-gl-forest">{scanResult.recyclability_score} / 100</span>
                  </div>
                  <div className="w-full bg-gl-cream h-2.5 rounded-full overflow-hidden border border-gl-border">
                    <div
                      className="bg-gl-forest h-full rounded-full transition-all duration-500"
                      style={{ width: `${scanResult.recyclability_score}%` }}
                    />
                  </div>
                </div>

                {/* Circular Pathways Guidance */}
                {scanResult.recycling_methods && scanResult.recycling_methods.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="text-xs text-gl-charcoal-muted uppercase tracking-wide font-semibold">
                      Recommended Recovery Method
                    </span>
                    <p className="text-xs text-gl-charcoal leading-relaxed">
                      {scanResult.recycling_methods[0]}
                    </p>
                  </div>
                )}

                {/* Action Conversion Trigger */}
                <div className="pt-2 border-t border-gl-border">
                  <button
                    type="button"
                    onClick={handleProceedToCreateListing}
                    className="w-full py-2.5 px-4 rounded-xl bg-gl-forest text-white text-xs sm:text-sm font-semibold hover:bg-gl-dark active:scale-[0.99] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Convert to Marketplace Listing</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-gl-charcoal-muted">
                <FileText className="w-8 h-8 opacity-40 text-gl-charcoal-muted" />
                <span className="text-xs font-medium">No analysis performed yet.</span>
                <span className="text-[11px] text-gl-charcoal-muted max-w-xs">
                  Position your material in the reticle frame on the left and capture a photo.
                </span>
              </div>
            )}
          </div>

          {/* Card 2: Kerala Circular Resource Pathways */}
          <div className="bg-white rounded-2xl p-6 border border-gl-border shadow-card flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gl-forest" />
              <h4 className="font-heading font-bold text-base text-gl-charcoal">
                Circular Value Channels
              </h4>
            </div>

            <p className="text-xs text-gl-charcoal-muted leading-relaxed">
              Materials scanned through GreenLoop are automatically evaluated for the three main decentralized disposal channels in Kerala:
            </p>

            <div className="flex flex-col gap-2 pt-1 text-xs">
              <div className="p-3 rounded-xl bg-gl-cream/50 flex items-start gap-2.5 border border-gl-border">
                <Leaf className="w-4 h-4 text-gl-forest shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <strong className="text-gl-charcoal font-semibold">Agricultural Mulch &amp; Composting</strong>
                  <span className="text-gl-charcoal-muted text-[11px]">For wet kitchen discards, coconut husks, coir pith, and garden foliage.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gl-cream/50 flex items-start gap-2.5 border border-gl-border">
                <Recycle className="w-4 h-4 text-gl-forest shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <strong className="text-gl-charcoal font-semibold">Haritha Karma Sena Aggregation</strong>
                  <span className="text-gl-charcoal-muted text-[11px]">Clean segregated polymers, cardboard cartons, metal tins, and e-waste.</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-gl-cream/50 flex items-start gap-2.5 border border-gl-border">
                <Factory className="w-4 h-4 text-gl-forest shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <strong className="text-gl-charcoal font-semibold">Artisanal &amp; Upcycling Studios</strong>
                  <span className="text-gl-charcoal-muted text-[11px]">Intact glass bottles, tailoring textile cutoffs, and wooden crates.</span>
                </div>
              </div>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};
