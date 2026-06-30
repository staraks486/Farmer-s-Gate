import React, { useEffect, useRef, useState } from 'react';
import { Camera, X, RefreshCw, Sparkles, Check, AlertCircle, Eye, Info, QrCode, Leaf, Volume2, VolumeX, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react';
import jsQR from 'jsqr';

interface CropItem {
  id: string;
  vegetableName: string;
  sellingPrice: number;
  quantity: number;
}

interface QrScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedValue: string) => void;
  inventory: CropItem[];
  title?: string;
}

export const QrScanner: React.FC<QrScannerProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  inventory,
  title = "QR & Barcode Scanner"
}) => {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // High-fidelity scan status system
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'warning'>('idle');
  const [scannedResult, setScannedResult] = useState<string>('');
  const [muteSounds, setMuteSounds] = useState(false);
  const [activeMode, setActiveMode] = useState<'camera' | 'simulator'>('camera');
  const [searchFilter, setSearchFilter] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  // Sound Engine
  const playAudioFeedback = (isSuccess: boolean) => {
    if (muteSounds) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (isSuccess) {
        // High-fidelity organic success double chime
        const frequencies = [523.25, 659.25, 783.99]; // C5 -> E5 -> G5
        frequencies.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.08);
          
          gain.gain.setValueAtTime(0, audioCtx.currentTime + idx * 0.08);
          gain.gain.linearRampToValueAtTime(0.06, audioCtx.currentTime + idx * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.08 + 0.2);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start(audioCtx.currentTime + idx * 0.08);
          osc.stop(audioCtx.currentTime + idx * 0.08 + 0.2);
        });
      } else {
        // Heavy low warning double buzz
        const times = [0, 0.15];
        times.forEach((startTime) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160.00, audioCtx.currentTime + startTime); // Low G3 buzzy
          
          gain.gain.setValueAtTime(0, audioCtx.currentTime + startTime);
          gain.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + startTime + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTime + 0.25);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start(audioCtx.currentTime + startTime);
          osc.stop(audioCtx.currentTime + startTime + 0.25);
        });
      }
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  // Start real camera
  const startCamera = async () => {
    setCameraError(null);
    setScanStatus('idle');
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play().catch(err => {
          console.error("Video play failed:", err);
        });
      }
      setHasCamera(true);
      setCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setHasCamera(false);
      setCameraActive(false);
      setCameraError(err.message || 'Camera blocked or not available. Please allow access.');
      setActiveMode('simulator'); // fallback gracefully so they are never stuck
    }
  };

  // Stop real camera
  const stopCamera = () => {
    setCameraActive(false);
    if (scanTimerRef.current) {
      cancelAnimationFrame(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Switch modes
  const handleModeChange = (mode: 'camera' | 'simulator') => {
    setActiveMode(mode);
    setScanStatus('idle');
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  // Main QR code scanning loop
  useEffect(() => {
    if (!cameraActive || activeMode !== 'camera' || scanStatus !== 'idle') return;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          // Draw video onto offscreen canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Grab pixel data
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Scan with jsQR
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert'
          });

          if (code && code.data) {
            handleCodeDecoded(code.data);
            return; // stop scanning loop on success/warning trigger
          }
        }
      }

      // Continue loop
      scanTimerRef.current = requestAnimationFrame(scanFrame);
    };

    scanTimerRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (scanTimerRef.current) {
        cancelAnimationFrame(scanTimerRef.current);
      }
    };
  }, [cameraActive, activeMode, scanStatus]);

  // Handle Scan Outcome (Checks database catalog for match)
  const handleCodeDecoded = (scannedValue: string) => {
    const isMatched = inventory.some(
      item => item.vegetableName.toLowerCase() === scannedValue.toLowerCase() || item.id === scannedValue
    );

    setScannedResult(scannedValue);

    if (isMatched) {
      // Play crisp success sound & highlight green
      playAudioFeedback(true);
      setScanStatus('success');
      
      setTimeout(() => {
        onScanSuccess(scannedValue);
        setScanStatus('idle');
      }, 900);
    } else {
      // Unrecognized Crop! Trigger warning vibration sound & interactive resolve panel
      playAudioFeedback(false);
      setScanStatus('warning');
    }
  };

  // Resolution controls for warnings
  const handleForceAccept = () => {
    onScanSuccess(scannedResult);
    setScanStatus('idle');
  };

  const handleSimulateItemScan = (item: CropItem) => {
    handleCodeDecoded(item.vegetableName);
  };

  const handleSimulateCustomText = (text: string) => {
    if (!text.trim()) return;
    handleCodeDecoded(text.trim());
  };

  // Start/Stop camera on open
  useEffect(() => {
    if (isOpen) {
      if (activeMode === 'camera') {
        startCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      {/* Dynamic Keyframe Injection to provide extremely polished animations without layout files */}
      <style>{`
        @keyframes scan-laser {
          0% { top: 5%; opacity: 0.3; }
          50% { top: 95%; opacity: 1; }
          100% { top: 5%; opacity: 0.3; }
        }
        @keyframes target-bracket {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @keyframes organic-float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(4deg); }
        }
        @keyframes shake-warning {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-8px); }
          30%, 60%, 90% { transform: translateX(8px); }
        }
        @keyframes scale-success {
          0% { transform: scale(0.9); opacity: 0; }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-laser { animation: scan-laser 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        .animate-bracket { animation: target-bracket 2s ease-in-out infinite; }
        .animate-float { animation: organic-float 3s ease-in-out infinite; }
        .animate-shake { animation: shake-warning 0.5s ease-in-out; }
        .animate-success-pop { animation: scale-success 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
      `}</style>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-scale-in">
        
        {/* Advanced Organic Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white flex items-center justify-between shadow-md relative">
          <div className="absolute top-0 right-1/4 w-32 h-12 bg-white/5 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl border border-white/15 shadow-inner">
              <QrCode className="h-5.5 w-5.5 text-emerald-100 animate-pulse" />
            </div>
            <div className="text-left">
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight flex items-center gap-1.5">
                {title}
                <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-500/30 border border-emerald-400/20 px-2 py-0.5 rounded-full text-emerald-100">
                  v2.0 PRO
                </span>
              </h3>
              <p className="text-[10px] text-emerald-100/90 font-medium">Automatic agricultural produce recognition</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Mute toggle */}
            <button
              type="button"
              onClick={() => setMuteSounds(!muteSounds)}
              className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title={muteSounds ? "Unmute Sound Feedback" : "Mute Sound Feedback"}
            >
              {muteSounds ? <VolumeX className="h-4.5 w-4.5 text-rose-300" /> : <Volume2 className="h-4.5 w-4.5" />}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-xl h-8 w-8 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="h-4.5 w-4.5 font-bold" />
            </button>
          </div>
        </div>

        {/* High-End Mode Tab Bar */}
        <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/70 p-1.5">
          <button
            type="button"
            onClick={() => handleModeChange('camera')}
            className={`py-2.5 text-xs font-bold transition-all rounded-xl flex items-center justify-center gap-2 ${
              activeMode === 'camera'
                ? 'bg-white text-emerald-800 shadow-sm border-b-2 border-emerald-600 font-black'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <Camera className="h-4 w-4" />
            Live Viewfinder
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('simulator')}
            className={`py-2.5 text-xs font-bold transition-all rounded-xl flex items-center justify-center gap-2 ${
              activeMode === 'simulator'
                ? 'bg-white text-emerald-800 shadow-sm border-b-2 border-emerald-600 font-black'
                : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Smart Barcode Emulator
          </button>
        </div>

        {/* Content Box */}
        <div className="p-5 flex-1 overflow-y-auto max-h-[460px]">
          
          {/* STATE A: MATCH SUCCESS ANIMATED BANNER */}
          {scanStatus === 'success' && (
            <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center space-y-2.5 animate-success-pop shadow-sm">
              <div className="inline-flex items-center justify-center h-10 w-10 bg-emerald-500 text-white rounded-full mx-auto shadow-md shadow-emerald-200">
                <Check className="h-5 w-5 stroke-[3.5] animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h4 className="font-extrabold text-xs uppercase tracking-widest text-emerald-700">Crop Recognized Successfully</h4>
                <p className="text-base font-black font-mono text-emerald-950">"{scannedResult}"</p>
              </div>
              <div className="text-[10px] text-emerald-600 font-bold bg-white/70 py-1 px-3 rounded-full inline-block border border-emerald-100">
                ₹ Auto-matching ledger unit price details...
              </div>
            </div>
          )}

          {/* STATE B: CODE UNRECOGNIZED / WARNING RESOLUTION PANEL */}
          {scanStatus === 'warning' && (
            <div className="mb-5 bg-amber-50 border-2 border-amber-300 text-amber-900 p-5 rounded-2xl text-center space-y-3 animate-shake shadow-md">
              <div className="inline-flex items-center justify-center h-11 w-11 bg-amber-500 text-white rounded-full mx-auto shadow-md shadow-amber-200">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-xs uppercase tracking-wider text-amber-800">Produce Code Unregistered</h4>
                <p className="text-sm font-black font-mono text-amber-950 bg-amber-100/50 py-1 px-2.5 rounded-lg inline-block">
                  "{scannedResult}"
                </p>
                <p className="text-[10px] text-amber-700 font-semibold max-w-xs mx-auto leading-relaxed">
                  This barcode is successfully decoded but does not match any current vegetable name in your stock ledger.
                </p>
              </div>

              <div className="flex gap-2 justify-center pt-1.5">
                <button
                  type="button"
                  onClick={() => setScanStatus('idle')}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-extrabold px-3 py-2 rounded-xl text-[10px] uppercase cursor-pointer"
                >
                  Rescan Again
                </button>
                <button
                  type="button"
                  onClick={handleForceAccept}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-sm cursor-pointer transition-all hover:scale-[1.01]"
                >
                  Accept & Use Anyway
                </button>
              </div>
            </div>
          )}

          {/* VIEWPORT 1: LIVE CAMERA VIEWFINDER */}
          {activeMode === 'camera' && scanStatus !== 'warning' && (
            <div className="space-y-4">
              
              {/* Camera Frame Box with vignette boundaries */}
              <div className="relative aspect-video rounded-2xl bg-slate-950 border-2 border-slate-900 overflow-hidden shadow-2xl flex items-center justify-center">
                
                {/* Advanced Vignette Overlays to center gaze on scanned region */}
                <div className="absolute inset-0 bg-black/45 pointer-events-none z-10" />
                
                {/* Center target boundary hole */}
                <div className="absolute w-44 h-44 sm:w-52 sm:h-52 z-10 pointer-events-none flex items-center justify-center" style={{ boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)' }}>
                  
                  {/* The Target Square Container with dynamic colors */}
                  <div className={`w-full h-full border-2 rounded-3xl relative transition-all duration-300 ${
                    scanStatus === 'success' ? 'border-emerald-500 bg-emerald-500/20' : 'border-emerald-400/80'
                  }`}>
                    
                    {/* Floating targeting helper */}
                    <div className="absolute -top-7 left-1/2 transform -translate-x-1/2 bg-slate-900/90 text-emerald-400 font-black text-[9px] uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-500/20 whitespace-nowrap shadow-md">
                      SCAN AGRI-BARCODE
                    </div>

                    {/* Sweep Laser line effect - hide when matched */}
                    {scanStatus !== 'success' && (
                      <div className="absolute left-1 right-1 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_rgba(52,211,153,0.8)] opacity-90 animate-laser" />
                    )}
                    
                    {/* Organic decorative leaves or corner guides */}
                    <div className="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl animate-bracket" />
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl animate-bracket" />
                    <div className="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl animate-bracket" />
                    <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-xl animate-bracket" />

                    {/* Central Watermark target or success checkmark feedback */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      {scanStatus === 'success' ? (
                        <div className="bg-emerald-500 text-white rounded-full p-4 shadow-xl shadow-emerald-500/40 animate-success-pop flex items-center justify-center">
                          <Check className="h-10 w-10 stroke-[4.5]" />
                        </div>
                      ) : (
                        <div className="opacity-15">
                          <Leaf className="h-14 w-14 text-emerald-400 animate-float" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hidden Offscreen Canvas for Pixel Analysis */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Real Live Video */}
                {cameraActive && (
                  <video 
                    ref={videoRef}
                    className="w-full h-full object-cover transform scale-x-100"
                    muted
                    playsInline
                  />
                )}

                {/* Loading / Blocked / Fallback Panel */}
                {!cameraActive && (
                  <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                    <div className="p-3 bg-rose-500/10 rounded-full text-rose-400 border border-rose-500/20 animate-pulse">
                      <AlertCircle className="h-8 w-8" />
                    </div>
                    {cameraError ? (
                      <div className="space-y-1.5">
                        <p className="text-xs text-rose-300 font-black uppercase tracking-wider">Camera Feed Inaccessible</p>
                        <p className="text-[10px] text-slate-400 max-w-xs">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => handleModeChange('simulator')}
                          className="mt-1 bg-white/10 hover:bg-white/20 border border-white/10 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg transition-all"
                        >
                          Use Barcode Emulator instead
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-xs text-slate-300 font-bold">Initializing camera device...</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase font-black tracking-wider px-3 py-1.5 rounded-lg transition-all"
                        >
                          Allow Camera Access
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Informative Guidance */}
              <div className="bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl flex items-start gap-3">
                <Leaf className="h-4.5 w-4.5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-left">
                  <span className="block text-xs font-extrabold text-slate-700">Premium Optical recognition</span>
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Point your camera directly at printed agricultural crop tags or organic QR codes. The scanner decodes instantly and cross-references your current outlet's stock levels.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* VIEWPORT 2: SMART SIMULATOR */}
          {activeMode === 'simulator' && scanStatus !== 'warning' && (
            <div className="space-y-4 text-left">
              
              <div className="bg-zinc-50 rounded-2xl p-3 border border-zinc-200/60 flex items-start gap-2.5">
                <Sparkles className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-extrabold text-zinc-800 uppercase tracking-wide">
                    Live Barcode Simulator
                  </h4>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Test your store's sales or ledger flow instantly without needing a physical camera. Click any crop tag below to simulate a laser gun beep scan.
                  </p>
                </div>
              </div>

              {/* Search filter for simulation items */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter vegetable items..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/30"
                />
              </div>

              {/* Grid lists */}
              <div className="grid grid-cols-2 gap-2 max-h-[175px] overflow-y-auto pr-1">
                {inventory
                  .filter(item => item.vegetableName.toLowerCase().includes(searchFilter.toLowerCase()))
                  .map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSimulateItemScan(item)}
                      className="p-2.5 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 rounded-xl transition-all flex items-center gap-2.5 text-left shadow-2xs cursor-pointer bg-white group"
                    >
                      <div className="h-9 w-9 bg-slate-50 rounded-lg flex items-center justify-center font-mono font-bold text-xs text-slate-500 border border-slate-200 shrink-0 group-hover:bg-white transition-colors">
                        <QrCode className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-xs font-black text-slate-800 truncate leading-tight">
                          {item.vegetableName}
                        </span>
                        <span className="block text-[9px] font-bold text-slate-400 mt-0.5">
                          ₹{item.sellingPrice.toFixed(0)}/kg • stock: {item.quantity.toFixed(0)}kg
                        </span>
                      </div>
                    </button>
                  ))}

                {inventory.length === 0 && (
                  <p className="col-span-2 text-center py-6 text-xs text-slate-400 font-semibold">
                    No crops found in stock ledger to simulate.
                  </p>
                )}
              </div>

              {/* Custom manual inject */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wide">
                    Or simulate custom scanned values
                  </h4>
                  <p className="text-[9px] text-slate-400">
                    Submit customized crop names (e.g., "Apple" or unregistered barcode "CARROT-99") to test warning loops:
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="manual-sim-input"
                    placeholder="e.g. Garlic, Mint, CABBAGE-5..."
                    className="flex-1 text-xs font-bold px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = document.getElementById('manual-sim-input') as HTMLInputElement;
                        handleSimulateCustomText(input.value);
                        input.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById('manual-sim-input') as HTMLInputElement;
                      handleSimulateCustomText(input.value);
                      input.value = '';
                    }}
                    className="bg-emerald-700 hover:bg-emerald-600 text-white font-extrabold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer shrink-0 shadow-sm"
                  >
                    Simulate Gun
                  </button>
                </div>
              </div>

              {/* Printable sheet sample */}
              <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                <h5 className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                  <Eye className="h-3 w-3" /> printable test codes
                </h5>
                <div className="flex gap-3 overflow-x-auto pb-1 text-center select-none">
                  {['Tomato', 'Potato', 'Onion', 'Apple', 'Banana'].map((crop) => (
                    <div key={crop} className="bg-white p-2 rounded-xl border border-slate-200 shadow-3xs shrink-0 flex flex-col items-center gap-1.5">
                      <svg width="40" height="40" viewBox="0 0 100 100" className="text-slate-800">
                        <rect x="0" y="0" width="25" height="25" fill="currentColor" />
                        <rect x="5" y="5" width="15" height="15" fill="white" />
                        <rect x="8" y="8" width="9" height="9" fill="currentColor" />
                        <rect x="75" y="0" width="25" height="25" fill="currentColor" />
                        <rect x="80" y="5" width="15" height="15" fill="white" />
                        <rect x="83" y="8" width="9" height="9" fill="currentColor" />
                        <rect x="0" y="75" width="25" height="25" fill="currentColor" />
                        <rect x="5" y="80" width="15" height="15" fill="white" />
                        <rect x="8" y="83" width="9" height="9" fill="currentColor" />
                        <rect x="35" y="35" width="10" height="10" fill="currentColor" />
                        <rect x="55" y="35" width="10" height="10" fill="currentColor" />
                        <rect x="45" y="45" width="10" height="10" fill="currentColor" />
                        <rect x="35" y="55" width="10" height="10" fill="currentColor" />
                        <rect x="55" y="55" width="10" height="10" fill="currentColor" />
                        <rect x="85" y="85" width="15" height="15" fill="currentColor" />
                      </svg>
                      <span className="font-mono text-[9px] font-bold text-slate-700">{crop}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* High-fidelity Footer with statuses */}
        <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-400">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide">
              SYSTEM ON • DECODER READY
            </span>
          </div>
          <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full tracking-wider border border-emerald-100 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> Auto-Decrypted
          </span>
        </div>

      </div>
    </div>
  );
};
