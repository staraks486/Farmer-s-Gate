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
  Check,
  BarChart3,
  MapPin,
  X,
  Palette
} from 'lucide-react';
import CustomerHub from './components/CustomerHub';
import PartnerPortal from './components/PartnerPortal';
import ManagementSuite from './components/ManagementSuite';
import ExecutivePortal from './components/ExecutivePortal';
import FarmersGateLogo from './components/FarmersGateLogo';
import InternalChatDrawer from './components/InternalChatDrawer';
import PublicInvoicePage from './components/PublicInvoicePage';
import { auth, seedProductsIfNeeded } from './lib/firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { getUserRole } from './types';

export default function App() {
  const [desktopBg, setDesktopBg] = useState(() => {
    try {
      const saved = localStorage.getItem('fg_desktop_bg');
      return saved || 'green';
    } catch {
      return 'green';
    }
  });

  const [showBgPicker, setShowBgPicker] = useState(() => {
    try {
      const saved = localStorage.getItem('fg_show_bg_picker');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const changeDesktopBg = (bg: string) => {
    setDesktopBg(bg);
    localStorage.setItem('fg_desktop_bg', bg);
  };

  const closeBgPicker = () => {
    setShowBgPicker(false);
    localStorage.setItem('fg_show_bg_picker', 'false');
  };

  const bgClasses: Record<string, string> = {
    green: 'bg-[#f4fbf7]',
    cream: 'bg-[#faf6f0]',
    slate: 'bg-[#f1f5f9]',
    blue: 'bg-[#f0f9ff]',
    lavender: 'bg-[#faf5ff]',
    dark: 'bg-[#0b130f] dark-theme'
  };

  const selectedBgClass = bgClasses[desktopBg] || bgClasses.green;

  const [activePortal, setActivePortal] = useState<'customer' | 'partner' | 'management' | 'executive' | 'store_pos'>('customer');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appVersion, setAppVersion] = useState('v2.3.0');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const res = await fetch("/api/app-version");
        if (res.ok) {
          const data = await res.json();
          if (data && data.version) {
            setAppVersion(`v${data.version}`);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch app version from backend", e);
      }
    };
    fetchVersion();
    const interval = setInterval(fetchVersion, 5000);
    return () => clearInterval(interval);
  }, []);

  // Geofencing and Local Access Restrictor States & Helpers
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [isCheckingGeo, setIsCheckingGeo] = useState<boolean>(false);
  const [geoBlockError, setGeoBlockError] = useState<string>('');

  // Haversine formula to compute distance in km
  const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getLatestCpanelSettings = () => {
    try {
      const local = localStorage.getItem('farmersgate_cpanel_settings');
      return local ? JSON.parse(local) : null;
    } catch (e) {
      return null;
    }
  };

  const verifyLocation = (targetPortal: string, onVerified: (allowed: boolean, reason?: string) => void) => {
    const isRestricted = ['partner', 'management', 'executive', 'store_pos'].includes(targetPortal);
    if (!isRestricted) {
      onVerified(true);
      return;
    }

    const settings = getLatestCpanelSettings();
    if (!settings?.enableLocalAccessRestriction) {
      onVerified(true);
      return;
    }

    if (settings.simulatedLocalOnly) {
      onVerified(true);
      return;
    }

    const getLocationsToCheck = () => {
      const hq = { 
        name: settings.headOfficeName || "Bangalore Corporate HQ", 
        lat: Number(settings.headOfficeLat) || 12.9716, 
        lng: Number(settings.headOfficeLng) || 77.5946 
      };
      
      let dynamicStores: any[] = [];
      try {
        const saved = localStorage.getItem('fg_cached_stores');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            dynamicStores = parsed.map((s: any) => ({
              name: s.name,
              lat: Number(s.lat) || 12.9716,
              lng: Number(s.lng) || 77.5946
            }));
          }
        }
      } catch (e) {}

      if (dynamicStores.length > 0) {
        return [hq, ...dynamicStores];
      }

      return [
        hq,
        { name: "Whitefield Store", lat: 12.9698, lng: 77.7500 },
        { name: "Indiranagar Store", lat: 12.9719, lng: 77.6412 },
        { name: "Koramangala Store", lat: 12.9279, lng: 77.6271 },
        { name: "Jayanagar Store", lat: 12.9299, lng: 77.5824 },
        { name: "Sarjapur Store", lat: 12.9038, lng: 77.6806 },
        { name: "Hebbal Store", lat: 13.0354, lng: 77.5988 },
        { name: "Patiala Store", lat: 30.3398, lng: 76.3869 }
      ];
    };

    // Intercept with Geolocation Sandbox Simulation
    try {
      const sandboxStr = localStorage.getItem('farmersgate_geo_sandbox_settings');
      if (sandboxStr) {
        const sandbox = JSON.parse(sandboxStr);
        if (sandbox && sandbox.enabled && sandbox.mode !== 'real') {
          const coords = {
            lat: sandbox.mode === 'manual' ? Number(sandbox.manualLat) : Number(sandbox.presetLat),
            lng: sandbox.mode === 'manual' ? Number(sandbox.manualLng) : Number(sandbox.presetLng),
          };
          
          setIsCheckingGeo(true);
          setTimeout(() => {
            setUserLocation(prev => {
              if (prev && prev.lat === coords.lat && prev.lng === coords.lng) {
                return prev;
              }
              return coords;
            });
            setIsCheckingGeo(false);

            const locations = getLocationsToCheck();

            const radius = settings.allowedLocalRadiusKm || 10;
            let nearestDist = Infinity;
            let nearestName = "";

            for (const loc of locations) {
              const dist = getDistanceKm(coords.lat, coords.lng, loc.lat, loc.lng);
              if (dist < nearestDist) {
                nearestDist = dist;
                nearestName = loc.name;
              }
            }

            if (nearestDist <= radius) {
              onVerified(true);
            } else {
              onVerified(false, `[SANDBOX ACTIVE] Your simulated device is ${nearestDist.toFixed(1)} km away from the nearest physical branch (${nearestName}). Restricting access. Range must be within ${radius} km.`);
            }
          }, 200);
          return;
        }
      }
    } catch (e) {
      console.error('Error handling sandbox settings:', e);
    }

    // Try to get current position dynamically
    setIsCheckingGeo(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(prev => {
          if (prev && prev.lat === coords.lat && prev.lng === coords.lng) {
            return prev;
          }
          return coords;
        });
        setIsCheckingGeo(false);

        // Compute distance to branches
        const locations = getLocationsToCheck();

        const radius = settings.allowedLocalRadiusKm || 10;
        let nearestDist = Infinity;
        let nearestName = "";

        for (const loc of locations) {
          const dist = getDistanceKm(coords.lat, coords.lng, loc.lat, loc.lng);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestName = loc.name;
          }
        }

        if (nearestDist <= radius) {
          onVerified(true);
        } else {
          onVerified(false, `Your device is ${nearestDist.toFixed(1)} km away from the nearest physical branch (${nearestName}). Restricting to public storefront. Range must be within ${radius} km.`);
        }
      },
      (error) => {
        setIsCheckingGeo(false);
        console.warn('Geolocation failed or denied:', error);
        onVerified(false, "Location permission is required for local security verification. Other visitors can only access the standard public Shopper Store.");
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);

  const userRole = getUserRole(user?.email);

  const isAdmin = (fbUser: FirebaseUser | null) => {
    if (!fbUser) return false;
    return getUserRole(fbUser.email).role === 'admin';
  };

  const handleCorporateLogin = async (e?: React.FormEvent, customEmail?: string, isDemo = false) => {
    if (e) e.preventDefault();
    setAdminError('');
    setAdminLoggingIn(true);

    const email = customEmail ? customEmail : (isDemo ? 'admin@farmersgate.com' : adminEmail.trim().toLowerCase());
    const pass = isDemo ? 'farmersgate123' : (adminPassword || 'farmersgate123');

    if (!email) {
      setAdminError('Please fill in email.');
      setAdminLoggingIn(false);
      return;
    }

    const getRedirectionPortal = (role: any) => {
      if (activePortal === 'store_pos' || email === 'store_pos@farmersgate.com') {
        if (['admin', 'store_pos'].includes(role.role)) {
          return 'store_pos';
        }
      }
      return role.allowedPortals.includes('management') ? 'management' : (role.allowedPortals.includes('partner') ? 'partner' : 'customer');
    };

    try {
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      if (credential.user) {
        const roleInfo = getUserRole(email);
        localStorage.setItem(`fg_name_${credential.user.uid}`, roleInfo.label);
        localStorage.setItem(`fg_phone_${credential.user.uid}`, '+91 99999 99999');
        localStorage.setItem(`fg_address_${credential.user.uid}`, 'FarmersGate Corporate HQ, Sector 1, Bangalore');
        
        const targetPortal = getRedirectionPortal(roleInfo);
        setActivePortal(targetPortal);
        window.location.hash = targetPortal;
      }
    } catch (err: any) {
      const allowedDemoEmails = [
        'admin@farmersgate.com',
        'star.aks486@gmail.com',
        'system_admin@farmersgate.com',
        'supply_office@farmersgate.com',
        'ledger@farmersgate.com',
        'supply_chain@farmersgate.com',
        'store_pos@farmersgate.com',
        'partner@farmersgate.com',
        'staff@farmersgate.com'
      ];
      if (allowedDemoEmails.includes(email) && pass === 'farmersgate123') {
        try {
          const credential = await createUserWithEmailAndPassword(auth, email, pass);
          if (credential.user) {
            const roleInfo = getUserRole(email);
            localStorage.setItem(`fg_name_${credential.user.uid}`, roleInfo.label);
            localStorage.setItem(`fg_phone_${credential.user.uid}`, '+91 99999 99999');
            localStorage.setItem(`fg_address_${credential.user.uid}`, 'FarmersGate Corporate HQ, Sector 1, Bangalore');
            
            const targetPortal = getRedirectionPortal(roleInfo);
            setActivePortal(targetPortal);
            window.location.hash = targetPortal;
          }
        } catch (innerErr: any) {
          console.warn('Firebase corporate creation failed. Falling back to local Sandbox:', innerErr);
          const roleInfo = getUserRole(email);
          const mockUser = {
            uid: `mock_${roleInfo.role}_123`,
            email: email,
            displayName: roleInfo.label,
            emailVerified: true
          };
          localStorage.setItem('fg_mock_user', JSON.stringify(mockUser));
          localStorage.setItem(`fg_name_${mockUser.uid}`, roleInfo.label);
          localStorage.setItem(`fg_phone_${mockUser.uid}`, '+91 99999 99999');
          localStorage.setItem(`fg_address_${mockUser.uid}`, 'FarmersGate Corporate HQ, Sector 1, Bangalore');
          
          setUser(mockUser as any);
          const targetPortal = getRedirectionPortal(roleInfo);
          setActivePortal(targetPortal);
          window.location.hash = targetPortal;
        }
      } else {
        console.warn('Firebase login failed. Creating local Sandbox mock user.');
        const roleInfo = getUserRole(email);
        const mockUser = {
          uid: `mock_${roleInfo.role}_custom`,
          email: email,
          displayName: roleInfo.label,
          emailVerified: true
        };
        localStorage.setItem('fg_mock_user', JSON.stringify(mockUser));
        localStorage.setItem(`fg_name_${mockUser.uid}`, roleInfo.label);
        localStorage.setItem(`fg_phone_${mockUser.uid}`, '+91 90000 00000');
        localStorage.setItem(`fg_address_${mockUser.uid}`, 'FarmersGate HQ, Sector 1, Bangalore');
        
        setUser(mockUser as any);
        const targetPortal = getRedirectionPortal(roleInfo);
        setActivePortal(targetPortal);
        window.location.hash = targetPortal;
      }
    } finally {
      setAdminLoggingIn(false);
    }
  };
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
      let activeUser = fbUser;
      if (!activeUser) {
        const storedMock = localStorage.getItem('fg_mock_user');
        if (storedMock) {
          try {
            activeUser = JSON.parse(storedMock);
          } catch (e) {
            activeUser = null;
          }
        }
      }

      setUser(activeUser);
      // Auto-switch based on roles if they just logged in and aren't already on a specific portal/hash
      if (activeUser) {
        const hash = window.location.hash.toLowerCase();
        const params = new URLSearchParams(window.location.search);
        const portalParam = params.get('portal')?.toLowerCase();
        const isCurrentSpecific = ['partner', 'management', 'executive', 'store_pos'].includes(hash.replace('#', '')) || ['partner', 'management', 'executive', 'store_pos'].includes(portalParam || '');

        if (!isCurrentSpecific) {
          const email = activeUser.email?.toLowerCase();
          if (email === 'partner@farmersgate.com') {
            setActivePortal('partner');
            window.location.hash = 'partner';
          } else if (email === 'admin@farmersgate.com' || email === 'star.aks486@gmail.com') {
            setActivePortal('management');
            window.location.hash = 'management';
          } else if (email === 'demo_shopper@farmersgate.com') {
            setActivePortal('customer');
            window.location.hash = 'customer';
          }
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

      if (hash.startsWith('#invoice')) {
        const match = window.location.hash.match(/[?&]id=([^&]+)/i);
        if (match) {
          setInvoiceId(match[1]);
          return;
        }
      } else {
        setInvoiceId(null);
      }

      let targetPortal: 'customer' | 'partner' | 'management' | 'executive' | 'store_pos' | null = null;

      if (hash.startsWith('#customer') || portalParam === 'customer') {
        targetPortal = 'customer';
      } else if (hash.startsWith('#partner') || portalParam === 'partner') {
        targetPortal = 'partner';
      } else if (hash.startsWith('#management') || portalParam === 'management') {
        targetPortal = 'management';
      } else if (hash.startsWith('#executive') || portalParam === 'executive') {
        targetPortal = 'executive';
      } else if (hash.startsWith('#store_pos') || portalParam === 'store_pos') {
        targetPortal = 'store_pos';
      }

      if (targetPortal) {
        verifyLocation(targetPortal, (allowed, reason) => {
          if (allowed) {
            setActivePortal(targetPortal!);
            setGeoBlockError('');
          } else {
            setGeoBlockError(reason || 'Access restricted.');
            setActivePortal('customer');
            window.location.hash = 'customer';
          }
        });
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

  const changePortal = (portal: 'customer' | 'partner' | 'management' | 'executive' | 'store_pos') => {
    verifyLocation(portal, (allowed, reason) => {
      if (allowed) {
        setActivePortal(portal);
        window.location.hash = portal;
        setGeoBlockError('');
      } else {
        setGeoBlockError(reason || 'Access restricted.');
        setActivePortal('customer');
        window.location.hash = 'customer';
      }
    });
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-8 flex flex-col items-center"
            >
              <FarmersGateLogo variant="light" className="scale-125 my-2" />
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400 mt-4">
                Enterprise Retail & Supply Ecosystem
              </p>
            </motion.div>

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
                System Version {appVersion} • Secured with Firebase
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (invoiceId) {
    return (
      <PublicInvoicePage 
        invoiceId={invoiceId} 
        onClose={() => {
          setInvoiceId(null);
          window.location.hash = 'customer';
        }} 
      />
    );
  }

  return (
    <div className={`min-h-screen ${selectedBgClass} flex flex-col font-sans select-none antialiased text-slate-800 relative`}>
      
      {/* 📍 Geofencing Access Restriction Notification Toast */}
      {geoBlockError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-gradient-to-br from-slate-900 via-zinc-950 to-slate-950 text-white rounded-2xl p-4 shadow-2xl border border-red-500/30 flex items-start gap-3.5 ring-1 ring-red-500/15">
            <div className="p-2 bg-red-500/10 rounded-xl text-red-400 border border-red-500/20 shrink-0">
              <MapPin className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1 space-y-1 text-left">
              <h5 className="font-extrabold text-xs tracking-tight text-white uppercase flex items-center gap-1.5">
                <span>🔒 Geographic Access Security Restriction</span>
                <span className="bg-red-500/10 text-red-400 text-[8px] font-black px-2 py-0.5 rounded-full border border-red-500/20 animate-pulse">Restricted Area</span>
              </h5>
              <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                {geoBlockError}
              </p>
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const settings = getLatestCpanelSettings();
                    if (settings) {
                      settings.simulatedLocalOnly = true;
                      localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(settings));
                      setGeoBlockError('');
                      alert("Sandbox Local Simulation Enabled! You can now access all restricted corporate/retail portals.");
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-[9px] px-2.5 py-1.5 rounded-lg uppercase tracking-wide transition-all cursor-pointer"
                >
                  ⚡ Force Local Simulation
                </button>
                <button
                  type="button"
                  onClick={() => setGeoBlockError('')}
                  className="bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-extrabold text-[9px] px-2.5 py-1.5 rounded-lg uppercase tracking-wide transition-all cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Geofence Location Verification Loading Modal */}
      {isCheckingGeo && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-xs">
          <div className="max-w-xs text-center space-y-4">
            <div className="relative flex items-center justify-center animate-bounce">
              <div className="h-12 w-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin"></div>
              <MapPin className="h-5 w-5 text-emerald-400 absolute" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-white font-sans">Verifying Branch Proximity</h4>
              <p className="text-[10px] text-slate-400">Querying secure browser GPS coordinates to verify physical proximity near a FarmersGate branch...</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Dynamic Portal Selector Rail (Visible only in the management admin module to authorized staff) */}
      {activePortal === 'management' && (
        <div className="bg-emerald-950 text-white py-2 px-4 shadow-md shrink-0 border-b border-emerald-900/60">
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                {user ? `${userRole.label.toUpperCase()}` : "FARMERSGATE ECOSYSTEM"}
              </span>
              <p className="text-[11px] font-semibold text-emerald-200">
                {user 
                  ? `Authorized Access (${user.email}). Switch system modules:` 
                  : "Explore our integrated digital network modules:"}
              </p>
            </div>
            
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full pb-1 lg:pb-0 flex-nowrap">
              {(!user || userRole.allowedPortals.includes('customer')) && (
                <button 
                  onClick={() => changePortal('customer')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                    activePortal === 'customer' 
                      ? 'bg-emerald-50 text-slate-950 shadow font-extrabold' 
                      : 'text-slate-300 hover:bg-emerald-900'
                  }`}
                >
                  <ShoppingBag className="h-3 w-3" /> 🛍️ Shopper Store
                </button>
              )}
              {(!user || userRole.allowedPortals.includes('partner')) && (
                <button 
                  onClick={() => changePortal('partner')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                    activePortal === 'partner' 
                      ? 'bg-emerald-50 text-slate-950 shadow font-extrabold' 
                      : 'text-slate-300 hover:bg-emerald-900'
                  }`}
                >
                  <Package className="h-3 w-3" /> 📦 Staff Portal
                </button>
              )}
              {(!user || userRole.allowedPortals.includes('management')) && (
                <button 
                  onClick={() => changePortal('management')}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                    activePortal === 'management' 
                      ? 'bg-emerald-50 text-slate-950 shadow font-extrabold' 
                      : 'text-slate-300 hover:bg-emerald-900'
                  }`}
                >
                  <Briefcase className="h-3 w-3" /> 🏢 HQ Operations Hub
                </button>
              )}
              
              <button 
                onClick={() => changePortal('store_pos')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                  activePortal === 'store_pos' 
                    ? 'bg-emerald-50 text-slate-950 shadow font-extrabold' 
                    : 'text-slate-300 hover:bg-emerald-900'
                }`}
              >
                🏪 Store POS
              </button>
              
              <button 
                onClick={() => changePortal('executive')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                  activePortal === 'executive' 
                    ? 'bg-emerald-50 text-slate-950 shadow font-extrabold' 
                    : 'text-slate-300 hover:bg-emerald-900'
                }`}
              >
                <BarChart3 className="h-3 w-3" /> 📡 Executive Module
              </button>

              {!showBgPicker && (
                <button
                  onClick={() => setShowBgPicker(true)}
                  className="px-2.5 py-1 rounded bg-emerald-900 hover:bg-emerald-800 border border-emerald-800 text-[10px] text-emerald-300 font-bold uppercase transition cursor-pointer flex items-center gap-1"
                  title="Show Theme/Background Selector"
                >
                  <Palette className="h-3 w-3" /> Themes
                </button>
              )}
              
              {user && (
                <>
                  <div className="h-4 w-px bg-emerald-800 mx-1 hidden sm:block"></div>
                  <button
                    onClick={() => {
                      auth.signOut();
                      localStorage.removeItem('fg_mock_user');
                      setUser(null);
                      changePortal('customer');
                    }}
                    className="px-2.5 py-1 rounded bg-red-950 hover:bg-red-900 border border-red-800/80 text-[9px] text-red-300 font-bold uppercase transition cursor-pointer"
                    title="Sign out of current session"
                  >
                    Sign Out 🚪
                  </button>
                </>
              )}
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
              <CustomerHub changePortal={changePortal} appVersion={appVersion} />
            </motion.div>
          ) : activePortal === 'executive' ? (
            <motion.div
              key="executive-portal"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <ExecutivePortal appVersion={appVersion} />
            </motion.div>
          ) : activePortal === 'store_pos' ? (
            user && ['admin', 'store_pos'].includes(userRole.role) ? (
              <motion.div
                key="store-pos-portal"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <ManagementSuite user={user} isStorePosPortal={true} appVersion={appVersion} />
              </motion.div>
            ) : (
              <motion.div
                key="store-pos-auth"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex items-center justify-center p-6 bg-slate-950 text-white relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-30" />
                
                <div className="relative z-10 max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/20 mb-2">
                      <BarChart3 className="h-6 w-6 text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-black uppercase tracking-wider text-white font-sans">Store POS & Retail Desk</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      Dedicated Branch POS Terminal • Cashier Login
                    </p>
                  </div>

                  {adminError && (
                    <div className="p-3.5 bg-red-950/80 border border-red-800/50 rounded-xl text-red-400 text-xs font-bold">
                      ⚠ {adminError}
                    </div>
                  )}

                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                      🔑 Dedicated POS Bypass (Instant Login)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCorporateLogin(undefined, 'store_pos@farmersgate.com')}
                      className="w-full p-3 bg-pink-600/10 border border-pink-500/25 hover:bg-pink-600/20 text-white rounded-xl text-left cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div>
                        <span className="text-[10.5px] font-black uppercase tracking-wide block text-pink-400 group-hover:text-pink-300">Enter Cashier Terminal</span>
                        <span className="text-[8.5px] font-semibold text-slate-400 font-mono block">store_pos@farmersgate.com</span>
                      </div>
                      <span className="text-[10px] font-bold bg-pink-950 border border-pink-800 text-pink-400 px-2.5 py-1 rounded-lg uppercase">
                        Active POS 🏪
                      </span>
                    </button>
                  </div>

                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-slate-800"></div>
                    <span className="flex-shrink mx-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Or enter credentials</span>
                    <div className="flex-grow border-t border-slate-800"></div>
                  </div>

                  <form onSubmit={(e) => handleCorporateLogin(e, undefined, false)} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9.5px] font-black text-slate-400 block uppercase tracking-wider">Terminal Email</label>
                      <input 
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="store_pos@farmersgate.com"
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
            )
          ) : activePortal === 'partner' ? (
            user && ['admin', 'staff'].includes(userRole.role) ? (
              <motion.div
                key="partner-portal"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <PartnerPortal appVersion={appVersion} />
              </motion.div>
            ) : (
              <motion.div
                key="partner-auth"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex-1 flex items-center justify-center p-6 bg-slate-950 text-white relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-30" />
                
                <div className="relative z-10 max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
                  <div className="text-center space-y-2">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/20 mb-2">
                      <Package className="h-6 w-6 text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-black uppercase tracking-wider text-white">Staff Fulfillment Portal</h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                      Restricted Access • Partner Credentials Required
                    </p>
                  </div>

                  {adminError && (
                    <div className="p-3.5 bg-red-950/80 border border-red-800/50 rounded-xl text-red-400 text-xs font-bold">
                      ⚠ {adminError}
                    </div>
                  )}

                  <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                      🔑 Staff Bypass (Instant Login)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCorporateLogin(undefined, 'partner@farmersgate.com')}
                      className="w-full p-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-slate-950 rounded-xl text-left cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <span className="text-[10.5px] font-black uppercase tracking-wide block">Fulfillment Staff Login</span>
                        <span className="text-[8.5px] font-semibold text-slate-900/80 font-mono block">partner@farmersgate.com</span>
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

                  <form onSubmit={(e) => handleCorporateLogin(e, undefined, false)} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9.5px] font-black text-slate-400 block uppercase tracking-wider">Staff Email</label>
                      <input 
                        type="email"
                        value={adminEmail}
                        onChange={(e) => setAdminEmail(e.target.value)}
                        placeholder="partner@farmersgate.com"
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
            )
          ) : user && ['admin', 'supply_office', 'ledger', 'supply_chain', 'store_pos'].includes(userRole.role) ? (
            <motion.div
              key="management-suite"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <ManagementSuite user={user} appVersion={appVersion} />
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
                  <h2 className="text-lg font-black uppercase tracking-wider text-white">HQ Operations Hub</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                    Restricted Access • Corporate Credentials Required
                  </p>
                </div>

                {/* Executive Dashboard Shortcut (No Login) */}
                <div className="bg-emerald-950/40 border border-emerald-800/40 p-4 rounded-2xl space-y-2 text-center">
                  <div className="text-[10px] font-black uppercase text-emerald-400 tracking-wider flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Unauthenticated Access Available
                  </div>
                  <p className="text-[10px] text-slate-300 font-bold leading-normal">
                    Are you an executive visitor? Monitor all branch POS terminals, inventory status & live feeds without authentication.
                  </p>
                  <button
                    type="button"
                    onClick={() => changePortal('executive')}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    📡 Enter Executive Live Module
                  </button>
                </div>

                {adminError && (
                  <div className="p-3.5 bg-red-950/80 border border-red-800/50 rounded-xl text-red-400 text-xs font-bold">
                    ⚠ {adminError}
                  </div>
                )}

                {/* Quick Demo Access Panel with Multiple Roles */}
                <div className="bg-slate-950 border border-slate-800/85 rounded-2xl p-4 space-y-2.5">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">
                    🔑 Executive Bypass (Instant Login)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleCorporateLogin(undefined, 'admin@farmersgate.com')}
                      className="p-2 bg-emerald-600/10 border border-emerald-500/25 hover:bg-emerald-600/20 rounded-xl text-left cursor-pointer transition-all"
                    >
                      <span className="text-[9px] font-black uppercase text-emerald-400 block">System Admin</span>
                      <span className="text-[7.5px] font-bold text-slate-500 font-mono block truncate">admin@farmersgate.com</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCorporateLogin(undefined, 'supply_office@farmersgate.com')}
                      className="p-2 bg-blue-600/10 border border-blue-500/25 hover:bg-blue-600/20 rounded-xl text-left cursor-pointer transition-all"
                    >
                      <span className="text-[9px] font-black uppercase text-blue-400 block">Supply Office</span>
                      <span className="text-[7.5px] font-bold text-slate-500 font-mono block truncate">supply_office@farmersgate.com</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCorporateLogin(undefined, 'ledger@farmersgate.com')}
                      className="p-2 bg-amber-600/10 border border-amber-500/25 hover:bg-amber-600/20 rounded-xl text-left cursor-pointer transition-all"
                    >
                      <span className="text-[9px] font-black uppercase text-amber-400 block">Double Ledger</span>
                      <span className="text-[7.5px] font-bold text-slate-500 font-mono block truncate">ledger@farmersgate.com</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCorporateLogin(undefined, 'supply_chain@farmersgate.com')}
                      className="p-2 bg-purple-600/10 border border-purple-500/25 hover:bg-purple-600/20 rounded-xl text-left cursor-pointer transition-all"
                    >
                      <span className="text-[9px] font-black uppercase text-purple-400 block">Supply Chain</span>
                      <span className="text-[7.5px] font-bold text-slate-500 font-mono block truncate">supply_chain@farmersgate.com</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCorporateLogin(undefined, 'store_pos@farmersgate.com')}
                      className="p-2 bg-pink-600/10 border border-pink-500/25 hover:bg-pink-600/20 rounded-xl text-left cursor-pointer transition-all col-span-2"
                    >
                      <span className="text-[9px] font-black uppercase text-pink-400 block">Store POS & Retail</span>
                      <span className="text-[7.5px] font-bold text-slate-500 font-mono block text-center mt-0.5">store_pos@farmersgate.com</span>
                    </button>
                  </div>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-800"></div>
                  <span className="flex-shrink mx-4 text-[9px] text-slate-500 font-bold uppercase tracking-wider">Or enter credentials</span>
                  <div className="flex-grow border-t border-slate-800"></div>
                </div>

                <form onSubmit={(e) => handleCorporateLogin(e, undefined, false)} className="space-y-4">
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
              title="Return to home page / shopper storefront"
            >
              🏡 Home Page
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
            <a 
              href="#store_pos" 
              onClick={(e) => { e.preventDefault(); changePortal('store_pos'); }}
              className={`hover:text-emerald-600 transition flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                activePortal === 'store_pos' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold' 
                  : 'bg-slate-50 border-slate-150 text-slate-600'
              }`}
            >
              🏪 Store POS
            </a>
            <a 
              href="#executive" 
              onClick={(e) => { e.preventDefault(); changePortal('executive'); }}
              className={`hover:text-emerald-600 transition flex items-center gap-1 px-2.5 py-1 rounded-lg border ${
                activePortal === 'executive' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-extrabold' 
                  : 'bg-slate-50 border-slate-150 text-slate-600'
              }`}
            >
              📡 Executive Live
            </a>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center text-center">
            <span>Developer: <strong className="text-emerald-700 font-extrabold">Arvind Kumar Shukla</strong></span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono text-[9px]">{appVersion}</span>
            <span>© 2026 FarmersGate Tech Inc • Powered by Firebase</span>
          </div>
        </div>
      </footer>
      
      {/* Floating Internal Corporate Chat & File Sharing Network Widget */}
      {activePortal !== 'customer' && (
        <InternalChatDrawer />
      )}

      {/* Desktop Background Picker (Hidden on small screens) */}
      {showBgPicker && (
        <div className="hidden lg:flex fixed bottom-4 right-4 z-40 bg-white/95 backdrop-blur-md p-2.5 rounded-2xl border border-slate-200/80 shadow-lg items-center gap-2 pr-3.5 animate-in slide-in-from-bottom-4 duration-300">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 pl-1">🎨 Theme BG</span>
          <div className="flex gap-1.5 items-center">
            <button
              onClick={() => changeDesktopBg('green')}
              className={`w-5 h-5 rounded-full bg-[#f4fbf7] border-2 transition-all cursor-pointer ${desktopBg === 'green' ? 'border-emerald-500 scale-110 shadow-md' : 'border-slate-300 hover:scale-105'}`}
              title="Classic Green (Default)"
            />
            <button
              onClick={() => changeDesktopBg('cream')}
              className={`w-5 h-5 rounded-full bg-[#faf6f0] border-2 transition-all cursor-pointer ${desktopBg === 'cream' ? 'border-amber-500 scale-110 shadow-md' : 'border-slate-300 hover:scale-105'}`}
              title="Warm Cream"
            />
            <button
              onClick={() => changeDesktopBg('slate')}
              className={`w-5 h-5 rounded-full bg-[#f1f5f9] border-2 transition-all cursor-pointer ${desktopBg === 'slate' ? 'border-slate-500 scale-110 shadow-md' : 'border-slate-300 hover:scale-105'}`}
              title="Muted Slate"
            />
            <button
              onClick={() => changeDesktopBg('blue')}
              className={`w-5 h-5 rounded-full bg-[#f0f9ff] border-2 transition-all cursor-pointer ${desktopBg === 'blue' ? 'border-sky-500 scale-110 shadow-md' : 'border-slate-300 hover:scale-105'}`}
              title="Soft Sky Blue"
            />
            <button
              onClick={() => changeDesktopBg('lavender')}
              className={`w-5 h-5 rounded-full bg-[#faf5ff] border-2 transition-all cursor-pointer ${desktopBg === 'lavender' ? 'border-purple-500 scale-110 shadow-md' : 'border-slate-300 hover:scale-105'}`}
              title="Lavender Mist"
            />
            {/* Dark Theme Button */}
            <button
              onClick={() => changeDesktopBg('dark')}
              className={`w-5 h-5 rounded-full bg-[#0b130f] border-2 border-emerald-950 transition-all cursor-pointer ${desktopBg === 'dark' ? 'border-emerald-500 scale-110 shadow-md' : 'border-slate-300 hover:scale-105'}`}
              title="Dark Theme"
            />
          </div>
          
          <div className="h-4 w-px bg-slate-200 mx-0.5"></div>
          
          {/* Close button to hide background picker */}
          <button
            onClick={closeBgPicker}
            className="p-1 hover:bg-slate-100 rounded-full transition-all cursor-pointer text-slate-400 hover:text-slate-600 flex items-center justify-center"
            title="Hide Theme Panel"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
