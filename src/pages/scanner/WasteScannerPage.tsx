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
import { AIScanResult } from '../../types';
import { useData } from '../../contexts/DataContext';

export const WasteScannerPage: React.FC = () => {
  const navigate = useNavigate();
  const { categories } = useData();

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
      triggerAiScan(base64, mime);
    };
    reader.readAsDataURL(file);
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
      setErrorMsg(err.message || 'Failed to process image with AI service.');
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
  };

  const handleProceedToCreateListing = () => {
    if (!scanResult) return;

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

      {/* 1. TOP TELEMETRY & HEADER SECTION (Stitch 1:1) */}
      <div className="flex flex-col gap-space-sm mb-4">
        <div className="flex flex-wrap items-center justify-between gap-space-sm">
          {/* Honest Service Status Badge (Verified dynamically, no static claims) */}
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
                ? 'Edge Function: Live (Gemini Vision)'
                : backendStatus === 'checking'
                ? 'Checking Edge Function Deployment...'
                : 'Edge Function: Deployment Required'}
            </span>
            <span className="text-outline">•</span>
            <span>Multimodal Pixel Inspection</span>
          </div>

          <div className="flex items-center gap-1.5 text-secondary font-label-sm text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Kerala Circular Protocol Aligned</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-xs">
          <div className="max-w-3xl">
            <h1 className="font-heading font-bold text-2xl sm:text-3xl lg:text-headline-lg text-primary tracking-tight">
              AI Waste &amp; Material Scanner
            </h1>
            <p className="font-body-lg text-body-md text-on-surface-variant mt-1 leading-relaxed">
              Upload or capture photographs of unsegregated waste, industrial byproducts, or agricultural residues. The Gemini Vision model inspects physical material composition, purity grade, local circular reuse pathways, and pre-fills your marketplace listing.
            </p>
          </div>
          <div className="flex items-center gap-space-sm">
            <button
              onClick={() => navigate('/marketplace')}
              className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-xs font-semibold transition-colors shadow-sm border border-outline-variant/40"
              type="button"
            >
              <Recycle className="w-4 h-4 text-secondary" />
              <span>Browse Materials</span>
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
              <span className="font-heading font-bold text-error">AI Analysis Error</span>
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

          {/* Ingestion Mode Selector Tabs (Stitch 1:1) */}
          <div className="bg-surface-container-lowest rounded-xl p-1.5 border border-outline-variant/60 shadow-sm flex items-center justify-between gap-1">
            <button
              onClick={startCamera}
              className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-space-sm rounded-lg font-label-md text-xs transition-colors shadow-sm ${
                activeTab === 'live' || cameraActive
                  ? 'bg-primary-container text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
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
              className={`flex-1 inline-flex items-center justify-center gap-2 py-2 px-space-sm rounded-lg font-label-md text-xs transition-colors shadow-sm ${
                activeTab === 'upload' && !cameraActive
                  ? 'bg-primary-container text-on-primary font-semibold'
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
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
                      <span>Re-Analyze with Gemini</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Diagnostic Results & Conversion (5 Cols) */}
        <section className="lg:col-span-5 flex flex-col gap-space-md">

          {/* Card 1: Primary Material Identity Card */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/60 shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/40">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-container" />
                <h3 className="font-heading font-bold text-title-md text-primary">
                  Material Identification
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded-full font-label-sm text-[11px] font-semibold ${
                scanResult
                  ? 'bg-secondary-container text-on-secondary-container'
                  : 'bg-surface-container text-on-surface-variant'
              }`}>
                {scanResult ? `${scanResult.confidence.toFixed(1)}% Confidence` : 'Awaiting Image'}
              </span>
            </div>

            {scanResult ? (
              <div className="flex flex-col gap-space-sm pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-heading font-bold text-lg text-on-surface">
                      {scanResult.detected_material}
                    </span>
                    <span className="font-label-sm text-xs text-secondary font-medium">
                      Category: <strong className="text-primary">{scanResult.category_name}</strong>
                    </span>
                  </div>
                  <span className="font-label-sm text-xs font-semibold px-2 py-1 rounded-md bg-surface-container text-primary border border-outline-variant/40 shrink-0">
                    {scanResult.subcategory || scanResult.category_slug}
                  </span>
                </div>

                {/* Ambiguity or Clarity Notification */}
                {scanResult.is_ambiguous && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex flex-col">
                      <strong className="font-semibold">Photo Ambiguity Detected:</strong>
                      <span>{scanResult.ambiguity_reason}</span>
                    </div>
                  </div>
                )}

                {/* Discarded vs Commercial Product Observation */}
                {scanResult.product_vs_waste_notes && (
                  <div className="p-2.5 rounded-lg bg-surface-container-low text-xs text-on-surface-variant border border-outline-variant/40">
                    <strong className="text-primary font-medium">Condition Check: </strong>
                    {scanResult.product_vs_waste_notes}
                  </div>
                )}

                {/* Visible Physical Features */}
                {scanResult.visible_characteristics && scanResult.visible_characteristics.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="font-label-sm text-xs text-secondary uppercase tracking-wide font-semibold">
                      Observed Characteristics
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {scanResult.visible_characteristics.map((char, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-surface-container text-[11px] text-on-surface font-medium">
                          {char}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recyclability Score Gauge */}
                <div className="flex flex-col gap-1 pt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-secondary font-medium">Recyclability Score</span>
                    <span className="font-bold text-primary">{scanResult.recyclability_score} / 100</span>
                  </div>
                  <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-container h-full rounded-full transition-all duration-500"
                      style={{ width: `${scanResult.recyclability_score}%` }}
                    />
                  </div>
                </div>

                {/* Circular Pathways Guidance */}
                {scanResult.recycling_methods && scanResult.recycling_methods.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1">
                    <span className="font-label-sm text-xs text-secondary uppercase tracking-wide font-semibold">
                      Recommended Recovery Method
                    </span>
                    <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                      {scanResult.recycling_methods[0]}
                    </p>
                  </div>
                )}

                {/* Action Conversion Trigger */}
                <div className="pt-2 border-t border-outline-variant/40">
                  <button
                    onClick={handleProceedToCreateListing}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary-container text-on-primary font-label-md text-xs sm:text-sm font-semibold hover:bg-primary transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                    <span>Convert to Marketplace Listing</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-center gap-2 text-outline">
                <FileText className="w-8 h-8 opacity-40" />
                <span className="text-xs">No analysis performed yet.</span>
                <span className="text-[11px] text-zinc-400 max-w-xs">
                  Position your material in the reticle frame on the left and capture a photo.
                </span>
              </div>
            )}
          </div>

          {/* Card 2: Kerala Circular Resource Pathways (Stitch 1:1) */}
          <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/60 shadow-sm flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary-container" />
              <h4 className="font-heading font-bold text-title-md text-primary">
                Circular Value Channels
              </h4>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Materials scanned through GreenLoop are automatically evaluated for the three main decentralized disposal channels in Kerala:
            </p>

            <div className="flex flex-col gap-2 pt-1 text-xs">
              <div className="p-2.5 rounded-lg bg-surface-container-low flex items-start gap-2 border border-outline-variant/40">
                <Leaf className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <strong className="text-primary font-semibold">Agricultural Mulch &amp; Composting</strong>
                  <span className="text-on-surface-variant text-[11px]">For wet kitchen discards, coconut husks, coir pith, and garden foliage.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-container-low flex items-start gap-2 border border-outline-variant/40">
                <Recycle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <strong className="text-primary font-semibold">Haritha Karma Sena Aggregation</strong>
                  <span className="text-on-surface-variant text-[11px]">Clean segregated polymers, cardboard cartons, metal tins, and e-waste.</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-surface-container-low flex items-start gap-2 border border-outline-variant/40">
                <Factory className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex flex-col">
                  <strong className="text-primary font-semibold">Artisanal &amp; Upcycling Studios</strong>
                  <span className="text-on-surface-variant text-[11px]">Intact glass bottles, tailoring textile cutoffs, and wooden crates.</span>
                </div>
              </div>
            </div>
          </div>

        </section>

      </div>
    </div>
  );
};
