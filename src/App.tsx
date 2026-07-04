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
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';

export default function App() {
  const [activePortal, setActivePortal] = useState<'customer' | 'partner' | 'management'>('customer');
  const [user, setUser] = useState<FirebaseUser | null>(null);

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);

  const isAdmin = (fbUser: FirebaseUser | null) => {
    if (!fbUser) return false;
    const email = fbUser.email?.toLowerCase();
    return email === 'admin@farmersgate.com' || email === 'star.aks486@gmail.com';
  };

  const handleAdminLogin = async (e?: React.FormEvent, isDemo = false) => {
    if (e) e.preventDefault();
    setAdminError('');
    setAdminLoggingIn(true);

    const email = isDemo ? 'admin@farmersgate.com' : adminEmail.trim().toLowerCase();
    const pass = isDemo ? 'farmersgate123' : adminPassword;

    if (!email || !pass) {
      setAdminError('Please fill in both email and password.');
      setAdminLoggingIn(false);
      return;
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      if (credential.user) {
        const name = 'HQ Admin Executive';
        const phone = '+91 99999 99999';
        const address = 'FarmersGate Corporate HQ, Sector 1, Bangalore';
        localStorage.setItem(`fg_name_${credential.user.uid}`, name);
        localStorage.setItem(`fg_phone_${credential.user.uid}`, phone);
        localStorage.setItem(`fg_address_${credential.user.uid}`, address);
        
        setActivePortal('management');
        window.location.hash = 'management';
      }
    } catch (err: any) {
      if ((email === 'admin@farmersgate.com' || email === 'star.aks486@gmail.com') && pass === 'farmersgate123') {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, pass);
          if (credential.user) {
            const name = 'HQ Admin Executive';
            const phone = '+91 99999 99999';
            const address = 'FarmersGate Corporate HQ, Sector 1, Bangalore';
            localStorage.setItem(`fg_name_${credential.user.uid}`, name);
            localStorage.setItem(`fg_phone_${credential.user.uid}`, phone);
            localStorage.setItem(`fg_address_${credential.user.uid}`, address);
            
            setActivePortal('management');
            window.location.hash = 'management';
          }
        } catch (innerErr: any) {
          setAdminError(innerErr.message || 'Failed to authenticate.');
        }
      } else {
        setAdminError(err.message || 'Invalid admin credentials.');
      }
    } finally {
      setAdminLoggingIn(false);
    }
  };
  const [showIntro, setShowIntro] = useState(() => {
    try {
      const localSettings = localStorage.getItem('farmersgate_cpanel_settings');
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        if (parsed && parsed.disableLoadingIntro) {
          return false;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return true;
  });
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

    let seconds = 4;
    try {
      const localSettings = localStorage.getItem('farmersgate_cpanel_settings');
      if (localSettings) {
        const parsed = JSON.parse(localSettings);
        if (parsed && typeof parsed.introSpeedSeconds === 'number') {
          seconds = parsed.introSpeedSeconds;
        }
      }
    } catch (e) {
      console.error(e);
    }

    const intervalMs = 50;
    const totalTicks = (seconds * 1000) / intervalMs;
    const stepPerTick = 100 / totalTicks;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        const variation = (Math.random() * 0.4 + 0.8); // slight organic variation
        const actualStep = stepPerTick * variation;
        const nextProgress = Math.min(prev + actualStep, 100);
        
        const calculatedIndex = Math.min(
          Math.floor((nextProgress / 100) * statuses.length),
          statuses.length - 1
        );
        if (calculatedIndex !== statusIndex) {
          setStatusIndex(calculatedIndex);
        }

        return nextProgress;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [showIntro, statusIndex]);

  // Clean, seamless auto-transition when loading completes
  useEffect(() => {
    if (progress >= 100) {
      const delay = setTimeout(() => {
        setShowIntro(false);
      }, 700); // Sleek 700ms pause to show completed operational status
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
      // Auto-switch based on roles if they just logged in
      if (fbUser) {
        if (fbUser.email === 'partner@farmersgate.com') {
          setActivePortal('partner');
          window.location.hash = 'partner';
        } else if (fbUser.email === 'admin@farmersgate.com' || fbUser.email === 'star.aks486@gmail.com') {
          setActivePortal('management');
          window.location.hash = 'management';
        } else if (fbUser.email === 'demo_shopper@farmersgate.com') {
          setActivePortal('customer');
          window.location.hash = 'customer';
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Listen for hash and search changes to support separate links for each module
  useEffect(() => {
    const handleHashAndParams = () => {
      const hash = window.location.hash.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      const portalParam = params.get('portal')?.toLowerCase();

      let targetPortal: 'customer' | 'partner' | 'management' | null = null;

      if (hash === '#customer' || portalParam === 'customer') {
        targetPortal = 'customer';
      } else if (hash === '#partner' || portalParam === 'partner') {
        targetPortal = 'partner';
      } else if (hash === '#management' || portalParam === 'management') {
        targetPortal = 'management';
      }

      if (targetPortal) {
        setActivePortal(targetPortal);
      }
    };

    handleHashAndParams();
    window.addEventListener('hashchange', handleHashAndParams, false);
    window.addEventListener('popstate', handleHashAndParams, false);
    return () => {
      window.removeEventListener('hashchange', handleHashAndParams);
      window.removeEventListener('popstate', handleHashAndParams);
    };
  }, []);

  const changePortal = (portal: 'customer' | 'partner' | 'management') => {
    setActivePortal(portal);
    window.location.hash = portal;
  };

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
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#022c22_1px,transparent_1px),linear-gradient(to_bottom,#022c22_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-[0.12]" />

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
                className="absolute -inset-2 rounded-full border border-dashed border-emerald-500/10"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
              />

              {/* Inner solid ring */}
              <div className="h-20 w-20 rounded-full bg-emerald-950/90 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                <motion.div
                  animate={Math.round(progress) >= 100 ? { scale: [1, 1.1, 1], rotate: 360 } : { y: [0, -2, 0] }}
                  transition={Math.round(progress) >= 100 ? { duration: 0.4 } : { repeat: Infinity, duration: 2, ease: "easeInOut" }}
                >
                  {Math.round(progress) >= 100 ? (
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

            {/* Elegant Minimalist Line Preloader (No technical background logging/process metrics shown) */}
            <div className="w-48 px-2 mt-4 mb-8">
              <div className="h-1 w-full bg-slate-900/85 rounded-full overflow-hidden relative border border-slate-800/50 p-[0.5px]">
                <motion.div 
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full absolute"
                  initial={{ left: "-100%", width: "50%" }}
                  animate={{ left: "150%" }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.8,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </div>

            {/* Clean Loading Label */}
            <div className="h-6 w-full flex items-center justify-center">
              <motion.div
                className="text-[10px] font-black text-emerald-400/80 tracking-widest uppercase flex items-center gap-2"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              >
                <span>Entering Corporate Portal</span>
              </motion.div>
            </div>

            {/* Developer and Version Badge at Footer of Intro Page */}
            <div className="absolute bottom-10 left-0 right-0 flex flex-col items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-emerald-950/40 border border-emerald-500/10 px-4 py-2 rounded-2xl shadow-sm backdrop-blur-xs">
                <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase">Developer:</span>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">Arvind Kumar Shukla</span>
              </div>
              <div className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest">
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
      
      {/* Dynamic Portal Selector Rail (Only visible to admin - allows seeing the whole system) */}
      {isAdmin(user) && (
        <div className="bg-slate-900 text-white py-2 px-4 shadow-md shrink-0 border-b border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                ADMIN SYSTEM LEVEL
              </span>
              <p className="text-[11px] font-semibold text-slate-300">
                You are logged in as HQ Admin. Switch system modules:
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 flex-wrap">
              <button 
                onClick={() => changePortal('customer')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                  activePortal === 'customer' 
                    ? 'bg-emerald-500 text-slate-950 shadow' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ShoppingBag className="h-3 w-3" /> 🛍️ Shopper Store
              </button>
              <button 
                onClick={() => changePortal('partner')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                  activePortal === 'partner' 
                    ? 'bg-emerald-500 text-slate-950 shadow' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Package className="h-3 w-3" /> 📦 Staff Portal
              </button>
              <button 
                onClick={() => changePortal('management')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                  activePortal === 'management' 
                    ? 'bg-emerald-500 text-slate-950 shadow' 
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Briefcase className="h-3 w-3" /> 🏢 Management Suite
              </button>
              
              <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>
              
              <button
                onClick={() => {
                  auth.signOut();
                  changePortal('customer');
                }}
                className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 border border-red-800/80 text-[9px] text-red-300 font-bold uppercase transition cursor-pointer"
                title="Sign out of HQ Admin session"
              >
                Sign Out 🚪
              </button>
            </div>
          </div>
        </div>
      )}

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
          ) : isAdmin(user) ? (
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
          ) : (
            <motion.div
              key="admin-auth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex items-center justify-center p-6 bg-slate-950 text-white relative overflow-hidden"
            >
              {/* Decorative background grid */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-30" />
              
              <div className="relative z-10 max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/20 mb-2">
                    <Briefcase className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-wider text-white">Management Suite</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    Restricted Access • Corporate Credentials Required
                  </p>
                </div>

                {adminError && (
                  <div className="p-3.5 bg-red-950/80 border border-red-800/50 rounded-xl text-red-400 text-xs font-bold">
                    ⚠ {adminError}
                  </div>
                )}

                {/* Quick Demo Access Panel */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                    🔑 Executive Bypass (Instant Login)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAdminLogin(undefined, true)}
                    className="w-full p-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 rounded-xl text-left cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10.5px] font-black uppercase tracking-wide block">Admin Demo Login</span>
                      <span className="text-[8.5px] font-semibold text-slate-900/80 font-mono block">admin@farmersgate.com</span>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-950 text-emerald-400 px-2 py-1 rounded-lg uppercase">
                      Instant ⚡
                    </span>
                  </button>
                </div>

                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Or enter credentials</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <form onSubmit={(e) => handleAdminLogin(e, false)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] font-black text-slate-400 block uppercase tracking-wider">Corporate Email</label>
                    <input 
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="admin@farmersgate.com"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-all font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9.5px] font-black text-slate-400 block uppercase tracking-wider">Access Token</label>
                    <input 
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 focus:border-emerald-500/50 rounded-xl text-xs text-white placeholder-slate-600 outline-none transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={adminLoggingIn}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all border border-slate-700/50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {adminLoggingIn ? 'Verifying access...' : 'Secure Authorization'}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer with separate links for each module and developer info */}
      <footer className="bg-white border-t border-slate-200/60 py-3 px-4 shrink-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider gap-3">
          {/* Module Links */}
          <div className="flex items-center gap-4 flex-wrap justify-center text-center">
            <span className="text-slate-500 font-black">🔗 Modules:</span>
            <a 
              href="#customer" 
              onClick={(e) => { e.preventDefault(); changePortal('customer'); }}
              className={`hover:text-emerald-600 transition flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                activePortal === 'customer' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold' 
                  : 'bg-slate-50 border-slate-150 text-slate-600'
              }`}
            >
              🛍️ Shopper Store
            </a>
            <a 
              href="#partner" 
              onClick={(e) => { e.preventDefault(); changePortal('partner'); }}
              className={`hover:text-emerald-600 transition flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                activePortal === 'partner' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold' 
                  : 'bg-slate-50 border-slate-150 text-slate-600'
              }`}
            >
              📦 Staff Portal
            </a>
            <a 
              href="#management" 
              onClick={(e) => { e.preventDefault(); changePortal('management'); }}
              className={`hover:text-emerald-600 transition flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                activePortal === 'management' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold' 
                  : 'bg-slate-50 border-slate-150 text-slate-600'
              }`}
            >
              🏢 Management HQ
            </a>
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
