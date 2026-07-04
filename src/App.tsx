import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Package, 
  HelpCircle, 
  Sparkles,
  Info,
  Briefcase,
  UserCheck,
  Sprout,
  ArrowRight,
  Check
} from 'lucide-react';
import CustomerHub from './components/CustomerHub';
import PartnerPortal from './components/PartnerPortal';
import ManagementSuite from './components/ManagementSuite';
import { auth, seedProductsIfNeeded } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [activePortal, setActivePortal] = useState<'customer' | 'partner' | 'management'>('customer');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);

  const statuses = [
    "Establishing secure connection to Firebase Firestore...",
    "Synchronizing multi-branch retail POS catalogs...",
    "Analyzing Double-Entry ledger transactions...",
    "Optimizing offline-resilient edge caches...",
    "FarmersGate Ecosystem is operational!"
  ];

  useEffect(() => {
    if (!showIntro) return;

    // Slow, premium, organic loading bar progress
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const step = Math.floor(Math.random() * 3) + 2; // slow, luxurious pacing
        const nextProgress = Math.min(prev + step, 100);
        
        const calculatedIndex = Math.min(
          Math.floor((nextProgress / 100) * statuses.length),
          statuses.length - 1
        );
        if (calculatedIndex !== statusIndex) {
          setStatusIndex(calculatedIndex);
        }

        return nextProgress;
      });
    }, 120);

    return () => clearInterval(timer);
  }, [showIntro, statusIndex]);

  // Clean, seamless auto-transition when loading completes
  useEffect(() => {
    if (progress === 100) {
      const delay = setTimeout(() => {
        setShowIntro(false);
      }, 900); // Elegant 900ms pause to show fully-loaded operational state
      return () => clearTimeout(delay);
    }
  }, [progress]);

  // Auto-seed Firestore on app startup
  useEffect(() => {
    seedProductsIfNeeded();
  }, []);

  // Monitor auth state to show role hints or personalized welcome
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      // Auto-switch to partner portal if they log in with the partner demo account
      if (fbUser && fbUser.email === 'partner@farmersgate.com') {
        setActivePortal('partner');
      }
    });
    return () => unsubscribe();
  }, []);

  if (showIntro) {
    return (
      <AnimatePresence>
        <motion.div 
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-950 text-white p-6 overflow-hidden select-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Animated decorative grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#022c22_1px,transparent_1px),linear-gradient(to_bottom,#022c22_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />

          <div className="relative z-10 max-w-sm w-full flex flex-col items-center text-center">
            {/* Pulsing Animated Emblem Container */}
            <motion.div 
              className="relative mb-8"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05, duration: 0.5, type: "spring" }}
            >
              {/* Outer glowing ring */}
              <motion.div 
                className="absolute -inset-4 rounded-full bg-emerald-500/10 blur-xl"
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              />
              
              {/* Spinning dotted ring */}
              <motion.div 
                className="absolute -inset-2 rounded-full border border-dashed border-emerald-500/20"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 16, ease: "linear" }}
              />

              {/* Inner solid ring */}
              <div className="h-20 w-20 rounded-full bg-emerald-950/90 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                <motion.div
                  animate={progress >= 100 ? { scale: [1, 1.1, 1], rotate: 360 } : { y: [0, -2, 0] }}
                  transition={progress >= 100 ? { duration: 0.4 } : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  {progress >= 100 ? (
                    <Check className="h-10 w-10 text-emerald-400 stroke-[3.5]" />
                  ) : (
                    <Sprout className="h-10 w-10 text-emerald-400" />
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Title & Brand */}
            <motion.h1 
              className="text-3xl font-black tracking-[0.25em] text-white uppercase font-sans mb-1.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              FARMERS<span className="text-emerald-400">GATE</span>
            </motion.h1>
            
            <motion.p 
              className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70 mb-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              Enterprise Retail & Supply Ecosystem
            </motion.p>

            {/* Progress Engine */}
            <div className="w-full px-2 mb-6">
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                <span className="text-left max-w-[220px] truncate transition-all duration-200">{statuses[statusIndex]}</span>
                <span className="text-emerald-400 font-mono text-[10px]">{progress}%</span>
              </div>
              
              <div className="h-1 w-full bg-slate-900/80 rounded-full overflow-hidden border border-slate-800/60 p-[0.5px]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full"
                  style={{ width: `${progress}%` }}
                  transition={{ ease: "easeInOut" }}
                />
              </div>
            </div>

            {/* Auto Launch Action Message */}
            <div className="h-10 w-full flex items-center justify-center">
              <AnimatePresence mode="wait">
                {progress >= 100 ? (
                  <motion.div
                    className="text-[10px] font-black text-emerald-400 tracking-widest uppercase flex items-center gap-1.5"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <span>Ecosystem Ready • Launching...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    className="text-[9px] font-bold text-slate-500 tracking-widest uppercase flex items-center gap-1.5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Synchronizing ledger...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Developer and Version Badge */}
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-1.5">
              <div className="inline-flex items-center gap-1.5 bg-slate-900/60 border border-slate-800/80 px-3 py-1.5 rounded-full">
                <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase">Developer:</span>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-wide">Arvind Kumar Shukla</span>
              </div>
              <div className="text-[9px] font-mono font-bold text-slate-600 uppercase tracking-widest">
                System Version v2.1.5 • Secured with Firebase
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased text-slate-800">
      
      {/* Dynamic Portal Selector Rail */}
      <div className="bg-slate-900 text-white py-2 px-4 shadow-md shrink-0 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
              LIVE ECOSYSTEM
            </span>
            <p className="text-[11px] font-semibold text-slate-300">
              FarmersGate Enterprise • Switch perspective instantly:
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <button 
              onClick={() => setActivePortal('customer')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                activePortal === 'customer' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="h-3 w-3" /> 🛍️ Shopper Store
            </button>
            <button 
              onClick={() => setActivePortal('partner')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                activePortal === 'partner' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Package className="h-3 w-3" /> 📦 Staff Portal
            </button>
            <button 
              onClick={() => setActivePortal('management')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                activePortal === 'management' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Briefcase className="h-3 w-3" /> 🏢 Management Suite
            </button>
            
            <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>
            
            <span className="text-[10px] text-emerald-400 font-extrabold tracking-tight uppercase flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> Dev: Arvind Kumar Shukla
            </span>
          </div>
        </div>
      </div>

      {/* Main app viewport with fade transition */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activePortal === 'customer' ? (
            <motion.div
              key="customer-hub"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <CustomerHub />
            </motion.div>
          ) : activePortal === 'partner' ? (
            <motion.div
              key="partner-portal"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <PartnerPortal />
            </motion.div>
          ) : (
            <motion.div
              key="management-suite"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <ManagementSuite />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating interactive hint with developer and version details */}
      <footer className="bg-white border-t border-slate-200/60 py-2.5 px-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider gap-2">
          <div className="flex items-center gap-1.5 flex-wrap justify-center text-center">
            <Info className="h-3.5 w-3.5 text-emerald-600 animate-pulse shrink-0" />
            <span>Simulate: Order as Shopper, dispatch in Staff Portal, or track ledger in Management Suite!</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center text-center">
            <span>Developer: <strong className="text-emerald-700 font-extrabold">Arvind Kumar Shukla</strong></span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono text-[9px]">v2.1.5</span>
            <span>© 2026 FarmersGate Tech Inc • Powered by Firebase</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
