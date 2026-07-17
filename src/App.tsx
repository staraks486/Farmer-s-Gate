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
  FileText,
  Store as StoreIcon,
  Truck,
  Palette,
  Sliders,
  Lock,
  RefreshCw,
  Key,
  MessageSquare,
  Mic,
  Building2
} from 'lucide-react';
import CustomerHub from './components/CustomerHub';
import TransportModule from './components/TransportModule';
import PartnerPortal from './components/PartnerPortal';
import ManagementSuite from './components/ManagementSuite';
import ExecutivePortal from './components/ExecutivePortal';
import InternalChatDrawer from './components/InternalChatDrawer';
import PublicInvoicePage from './components/PublicInvoicePage';
import { LicenseModal } from './components/LicenseModal';
import { PaymentModal } from './components/PaymentModal';
import { SystemHealthIndicator } from './components/SystemHealthIndicator';
import { UpdateNotification } from './components/UpdateNotification';
import { OfflineRecoveryModal } from './components/OfflineRecoveryModal';
import { VoiceAssistant } from './components/VoiceAssistant';
import { getSavedLicense, isLicenseWallEnforced, validateLicenseKey, LicenseInfo, getLicenseExpiryDaysLeft } from './lib/license';
import { auth, seedProductsIfNeeded } from './lib/firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { getUserRole } from './types';
import { useData } from './contexts/DataContext';

export default function App() {
  const { cpanelSettings: syncedSettings } = useData();
  
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

  const handleVoiceCommand = (command: string) => {
    if (command.includes('customer') || command.includes('home')) {
      changePortal('customer');
    } else if (command.includes('partner') || command.includes('staff')) {
      changePortal('partner');
    } else if (command.includes('management') || command.includes('admin') || command.includes('hq')) {
      changePortal('management');
      if (command.includes('admin')) {
        changePortal('management', 'admin');
      }
    } else if (command.includes('store') || command.includes('pos')) {
      changePortal('store_pos');
    } else if (command.includes('executive')) {
      changePortal('executive');
    } else if (command.includes('dark') || command.includes('night')) {
      changeDesktopBg('dark');
    } else if (command.includes('light') || command.includes('green')) {
      changeDesktopBg('green');
    } else if (command.includes('blue')) {
      changeDesktopBg('blue');
    }
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

  const cpanelSettings = syncedSettings;

  const [activePortal, setActivePortal] = useState<'customer' | 'partner' | 'management' | 'executive' | 'store_pos' | 'transport'>('customer');
  const [activeMobileWidget, setActiveMobileWidget] = useState<'chat' | 'voice'>('chat');
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [appVersion, setAppVersion] = useState('v2.3.0');
  const [newVersionAvailable, setNewVersionAvailable] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState<LicenseInfo>(() => getSavedLicense());
  const [isLicenseEnforced, setIsLicenseEnforced] = useState(() => isLicenseWallEnforced());
  const [isLicenseWarningDismissed, setIsLicenseWarningDismissed] = useState(false);

  // Background Auto Sync states
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<Date>(new Date());

  useEffect(() => {
    const syncInterval = setInterval(() => {
      setIsBackgroundSyncing(true);
      setTimeout(() => {
        setIsBackgroundSyncing(false);
        setLastSyncedTime(new Date());
      }, 1500);
    }, 15000); // Sync every 15 seconds

    return () => clearInterval(syncInterval);
  }, []);

  // Activation Wall states & handler
  const [activationWallKey, setActivationWallKey] = useState('');
  const [activationWallError, setActivationWallError] = useState('');
  const [activationWallSuccess, setActivationWallSuccess] = useState('');
  const [isActivatingWall, setIsActivatingWall] = useState(false);

  const handleWallActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivationWallError('');
    setActivationWallSuccess('');
    setIsActivatingWall(true);

    // Short processing delay for professional verification feel
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const result = validateLicenseKey(activationWallKey);
    if (result.isValid && result.plan && result.expires && result.licensee) {
      const newLicense: LicenseInfo = {
        key: activationWallKey.trim().toUpperCase(),
        licensee: result.licensee,
        plan: result.plan,
        expires: result.expires,
        activatedAt: new Date().toISOString().substring(0, 10),
        status: 'active'
      };

      localStorage.setItem('fg_license_info', JSON.stringify(newLicense));
      setLicenseInfo(newLicense);
      setActivationWallSuccess(`License successfully verified for ${result.licensee}! Unlocking...`);
      setActivationWallKey('');
      
      // Propagate the license info to Firestore to automatically sync with other devices in real-time!
      try {
        const rawSettings = localStorage.getItem('farmersgate_cpanel_settings') || '{}';
        const parsedSettings = JSON.parse(rawSettings);
        parsedSettings.licenseInfo = newLicense;
        localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(parsedSettings));
        import('./lib/firebase').then(({ updateSettings }) => {
          updateSettings(parsedSettings).catch(console.error);
        });
      } catch (e) {
        console.error("Failed to propagate license key to cloud sync:", e);
      }
      
      // Dispatch custom event to sync with other tabs/modals
      window.dispatchEvent(new Event('license-status-updated'));
    } else {
      setActivationWallError(result.error || 'Invalid software license key.');
    }
    setIsActivatingWall(false);
  };

  useEffect(() => {
    let currentVersion = '';
    const fetchVersion = async () => {
      try {
        const res = await fetch("/api/app-version");
        if (res.ok) {
          const data = await res.json();
          if (data && data.version) {
            const fetchedVersion = `v${data.version}`;
            if (!currentVersion) {
              currentVersion = fetchedVersion;
              setAppVersion(fetchedVersion);
            } else if (currentVersion !== fetchedVersion) {
              console.log('New version detected:', fetchedVersion);
              setNewVersionAvailable(fetchedVersion);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch app version from backend", e);
      }
    };
    fetchVersion();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchVersion();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen to license status changes across modules
  useEffect(() => {
    const handleLicenseUpdate = () => {
      setLicenseInfo(getSavedLicense());
      setIsLicenseEnforced(isLicenseWallEnforced());
      setIsLicenseWarningDismissed(false);
    };
    window.addEventListener('license-status-updated', handleLicenseUpdate);
    return () => window.removeEventListener('license-status-updated', handleLicenseUpdate);
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

  const verifyLocation = (targetPortal: string, onVerified: (allowed: boolean, reason?: string) => void) => {
    console.log(`[GeoCheck] Verifying location for portal: ${targetPortal}`);
    const isRestricted = ['partner', 'management', 'executive', 'store_pos', 'transport'].includes(targetPortal);
    if (!isRestricted) {
      onVerified(true);
      return;
    }

    // Admin Bypass: Admins can always access all portals regardless of location
    if (userRole.role === 'admin') {
      console.log(`[GeoCheck] Admin bypass granted for ${user?.email}`);
      onVerified(true);
      return;
    }

    const settings = syncedSettings;
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

      return [hq];
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

  const getDynamicRoleLabel = (email: string | null | undefined, defaultLabel: string) => {
    if (!email) return defaultLabel;
    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === 'ledger@farmersgate.com') {
      return cpanelSettings?.ledgerModuleName || defaultLabel;
    }
    if (cleanEmail === 'supply_chain@farmersgate.com') {
      return cpanelSettings?.supplyChainModuleName || defaultLabel;
    }
    if (cleanEmail === 'store_pos@farmersgate.com') {
      return cpanelSettings?.storePosModuleName || defaultLabel;
    }
    if (cleanEmail === 'partner@farmersgate.com' || cleanEmail === 'staff@farmersgate.com') {
      return cpanelSettings?.partnerModuleName || defaultLabel;
    }
    return defaultLabel;
  };

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
        const isCurrentSpecific = ['partner', 'management', 'executive', 'store_pos', 'transport'].includes(hash.replace('#', '')) || ['partner', 'management', 'executive', 'store_pos', 'transport'].includes(portalParam || '');

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
      } else if (hash.startsWith('#management') || hash.startsWith('#admin') || portalParam === 'management' || portalParam === 'admin') {
        targetPortal = 'management';
      } else if (hash.startsWith('#executive') || portalParam === 'executive') {
        targetPortal = 'executive';
      } else if (hash.startsWith('#store_pos') || portalParam === 'store_pos') {
        targetPortal = 'store_pos';
      }

      if (targetPortal) {
        console.log('App: Setting activePortal to', targetPortal);
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

    if (syncedSettings !== undefined) {
      handleHashAndParams();
    }
    
    window.addEventListener('hashchange', handleHashAndParams, false);
    window.addEventListener('popstate', handleHashAndParams, false);
    return () => {
      window.removeEventListener('hashchange', handleHashAndParams);
      window.removeEventListener('popstate', handleHashAndParams);
    };
  }, [syncedSettings]);

  const changePortal = (portal: 'customer' | 'partner' | 'management' | 'executive' | 'store_pos' | 'transport', customHash?: string) => {
    verifyLocation(portal, (allowed, reason) => {
      if (allowed) {
        setActivePortal(portal);
        window.location.hash = customHash || portal;
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
                    cpanelSettings?.companyLogo ? (
                      <img src={cpanelSettings.companyLogo} alt="Logo" className="object-contain h-10 w-10" />
                    ) : (
                      <Sprout className="h-10 w-10 text-emerald-400" />
                    )
                  )}
                </motion.div>
              </div>
            </motion.div>

            {/* Title & Brand */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="mb-8 flex flex-col items-center text-center px-4"
            >
              {cpanelSettings?.appName ? (
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{cpanelSettings.appName}</h1>
              ) : (
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Farmer's <span className="text-emerald-400">Gate</span></h1>
              )}
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

  // Enforce SaaS License Activation Wall
  if (isLicenseEnforced && licenseInfo.status !== 'active') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-4 font-sans select-none overflow-y-auto">
        {/* Ambient glow decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl text-white relative z-10 space-y-6 text-center"
        >
          <div className="flex flex-col items-center">
            {/* Lock Circle */}
            <div className="p-4 bg-red-500/10 text-red-500 rounded-full border border-red-500/20 mb-4 animate-bounce">
              <Lock className="h-8 w-8" />
            </div>

            <span className="bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-red-500/20 mb-3">
              License Activation Required
            </span>

            {cpanelSettings?.appName ? (
              <h2 className="text-2xl font-black tracking-tight text-white uppercase">{cpanelSettings.appName}</h2>
            ) : (
              <h2 className="text-2xl font-black tracking-tight text-white uppercase font-sans">Farmers<span className="text-emerald-400">Gate</span></h2>
            )}

            <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-xs">
              This copy of FarmersGate Management Suite is unregistered or unlicensed. Enter your commercial license key to unlock the enterprise system.
            </p>
          </div>

          <form onSubmit={handleWallActivate} className="space-y-4 text-left">
            {activationWallError && (
              <div className="text-xs font-semibold text-red-400 bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-center">
                ❌ {activationWallError}
              </div>
            )}
            {activationWallSuccess && (
              <div className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-3 text-center animate-pulse">
                ✅ {activationWallSuccess}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">
                Software License Key
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={activationWallKey}
                  onChange={(e) => setActivationWallKey(e.target.value)}
                  placeholder="FG-STD-20271231-STORENAME-HASH"
                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl text-xs font-mono tracking-wider font-bold text-white shadow-inner outline-none transition-all uppercase focus:ring-4 focus:ring-emerald-500/10"
                  required
                />
                <Key className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isActivatingWall || !activationWallKey.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-55 active:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-lg shadow-emerald-900/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isActivatingWall ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Verifying Cryptographic Checksum...
                </>
              ) : (
                'Unlock Enterprise Software'
              )}
            </button>
          </form>

          {/* Help details */}
          <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
            <p>Testing or Evaluating? Contact the administrator to get a valid key.</p>
            <p className="text-slate-400">
              For demo checkout, use: <code className="bg-slate-950 px-1.5 py-0.5 rounded text-slate-300 font-mono select-all">FG-ENT-LIFETIME-DEMO-A376</code>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const licenseExpiryDaysLeft = licenseInfo.status === 'active' 
    ? getLicenseExpiryDaysLeft(licenseInfo.expires) 
    : null;
  const isLicenseExpiringSoon = licenseExpiryDaysLeft !== null && licenseExpiryDaysLeft <= 30 && licenseExpiryDaysLeft >= 0;

  return (
    <div className={`min-h-screen ${selectedBgClass} flex flex-col font-sans select-none antialiased text-slate-800 relative`}>
       {/* 🔑 License Expiration Warning Banner */}
      {isLicenseExpiringSoon && !isLicenseWarningDismissed && (
        <div className="bg-amber-500 text-slate-950 px-4 py-3 shadow-md flex flex-col md:flex-row items-center justify-between gap-3 font-semibold text-xs border-b border-amber-600 shrink-0 z-40 animate-in fade-in slide-in-from-top duration-300">
          <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2.5 text-center md:text-left flex-col sm:flex-row">
              <span className="p-1.5 bg-slate-950/10 rounded-lg text-sm shrink-0">⚠️</span>
              <span className="leading-relaxed">
                Your <strong>{licenseInfo.plan} Edition</strong> license is expiring in <strong className="underline decoration-2">{licenseExpiryDaysLeft} {licenseExpiryDaysLeft === 1 ? 'day' : 'days'}</strong> (on {licenseInfo.expires}). Please renew soon to avoid service disruptions.
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1.5 whitespace-nowrap"
              >
                💳 Renew License
              </button>
              <button
                type="button"
                onClick={() => setShowLicenseModal(true)}
                className="bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer shadow-sm whitespace-nowrap"
              >
                Manage Key
              </button>
              <button
                type="button"
                onClick={() => setIsLicenseWarningDismissed(true)}
                className="text-slate-950/70 hover:text-slate-950 font-bold px-2.5 py-1 hover:bg-slate-950/5 rounded-lg transition-all cursor-pointer text-[11px]"
                title="Dismiss warning"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

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
                  onClick={async () => {
                    if (syncedSettings) {
                      const updated = { ...syncedSettings, simulatedLocalOnly: true };
                      try {
                        const { updateSettings } = await import('./lib/firebase');
                        await updateSettings(updated);
                        setGeoBlockError('');
                        alert("Sandbox Local Simulation Enabled via Cloud! You can now access all restricted corporate/retail portals.");
                      } catch (err) {
                        console.error(err);
                      }
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
                {user ? `${(getDynamicRoleLabel(user.email, userRole.label)).toUpperCase()}` : (cpanelSettings?.appName ? cpanelSettings.appName.toUpperCase() : "FARMERSGATE ECOSYSTEM")}
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
                  <ShoppingBag className="h-3 w-3" /> 🛍️ {cpanelSettings?.customerModuleName || "Shopper Store"}
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
                  <Package className="h-3 w-3" /> 📦 {cpanelSettings?.partnerModuleName || "Staff Portal"}
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
                  <Briefcase className="h-3 w-3" /> 🏢 {cpanelSettings?.managementModuleName || "HQ Operations Hub"}
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
                🏪 {cpanelSettings?.storePosModuleName || "Store POS"}
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
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-6 shrink-0 z-20 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.5)]">
        <div className="max-w-[1600px] mx-auto flex flex-col xl:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 flex-wrap justify-center text-center">
            <a 
              href="#customer" 
              onClick={(e) => { e.preventDefault(); changePortal('customer'); }}
              className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
                activePortal === 'customer' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
              title="Return to home page / shopper storefront"
            >
              <ShoppingBag className="h-3.5 w-3.5" /> Home Page
            </a>
            <a 
              href="#partner" 
              onClick={(e) => { e.preventDefault(); changePortal('partner'); }}
              className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
                activePortal === 'partner' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Package className="h-3.5 w-3.5" /> Staff Portal
            </a>
            <a 
              href="#management" 
              onClick={(e) => { e.preventDefault(); changePortal('management'); }}
              className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
                activePortal === 'management' && window.location.hash.toLowerCase() !== '#admin' && window.location.hash.toLowerCase() !== '#headoffice'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Briefcase className="h-3.5 w-3.5" /> Management HQ
            </a>
            <a 
              href="#headoffice" 
              onClick={(e) => { e.preventDefault(); changePortal('management', 'headoffice'); }}
              className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
                activePortal === 'management' && window.location.hash.toLowerCase() === '#headoffice'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" /> HQ Supply Office
            </a>
            <a 
              href="#admin" 
              onClick={(e) => { e.preventDefault(); changePortal('management', 'admin'); }}
              className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
                activePortal === 'management' && window.location.hash.toLowerCase() === '#admin'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" /> Admin Module
            </a>
            <a 
              href="#store_pos" 
              onClick={(e) => { e.preventDefault(); changePortal('store_pos'); }}
              className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
                activePortal === 'store_pos' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <StoreIcon className="h-3.5 w-3.5" /> Store POS
            </a>
            <a 
              href="#executive" 
              onClick={(e) => { e.preventDefault(); changePortal('executive'); }}
              className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
                activePortal === 'executive' 
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Executive Live
            </a>
            <a 
              href="#transport" 
              onClick={(e) => { e.preventDefault(); changePortal('management', 'transport'); }}
              className={`hover:text-emerald-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold tracking-wide uppercase ${
                activePortal === 'management' && window.location.hash.toLowerCase() === '#transport'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' 
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Truck className="h-3.5 w-3.5" /> Transport Live
            </a>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SystemHealthIndicator />
            {activePortal !== 'customer' && (
              <>
                <div className="h-4 w-px bg-slate-800 hidden sm:block" />
                <div className="flex items-center gap-2 select-none text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span className="relative flex h-2 w-2">
                    {isBackgroundSyncing ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </>
                    ) : (
                      <>
                        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-emerald-400/50 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </>
                    )}
                  </span>
                  <span>
                    Auto-Sync: <span className={isBackgroundSyncing ? 'text-amber-400 font-black' : 'text-emerald-400 font-black'}>{isBackgroundSyncing ? 'Syncing...' : 'Active'}</span>
                  </span>
                  <span className="text-[9px] text-slate-600 font-mono tracking-tight lowercase">
                    ({lastSyncedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              Powered by <strong className="text-slate-300 font-black">Firebase</strong>
            </span>
            <span className="bg-slate-800/80 text-slate-400 px-2.5 py-1 rounded-md border border-slate-700/50 font-mono text-[9px] shadow-inner">{appVersion}</span>
            <button 
              onClick={() => setShowLicenseModal(true)} 
              className="hover:text-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" /> License
            </button>
            <span>© 2026 FarmersGate Tech Inc</span>
          </div>
        </div>
      </footer>
      
      <LicenseModal isOpen={showLicenseModal} onClose={() => setShowLicenseModal(false)} onRenewClick={() => setShowPaymentModal(true)} />
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />

      {/* Unified Space-Saving Corporate Control Dock (Mobile & Desktop) */}
      {activePortal !== 'customer' && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center">
          {/* Swivel Action Control Dock */}
          <div className="relative flex items-center bg-slate-950/95 backdrop-blur-md border border-slate-800 rounded-full p-1 shadow-2xl shadow-emerald-950/40 select-none">
            {/* Tactile Sliding Highlight Backplate */}
            <div 
              className={`absolute top-1 bottom-1 w-10 rounded-full bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.5)] transition-all duration-300 ease-out ${
                activeMobileWidget === 'chat' ? 'left-1' : 'left-[45px]'
              }`} 
            />
            
            {/* Chat Tab Option */}
            <button
              onClick={() => {
                setActiveMobileWidget('chat');
                window.dispatchEvent(new Event('trigger-internal-chat'));
              }}
              className={`relative z-10 w-10 h-10 flex flex-col items-center justify-center rounded-full transition-all duration-300 active:scale-90 cursor-pointer ${
                activeMobileWidget === 'chat' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Launch Live Chat Drawer"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-[6.5px] font-black tracking-widest uppercase leading-none mt-0.5">Chat</span>
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500 border border-slate-950 animate-pulse" />
            </button>
            
            {/* Voice Tab Option */}
            <button
              onClick={() => {
                setActiveMobileWidget('voice');
                window.dispatchEvent(new Event('trigger-voice-assistant'));
              }}
              className={`relative z-10 w-10 h-10 flex flex-col items-center justify-center rounded-full transition-all duration-300 active:scale-90 cursor-pointer ${
                activeMobileWidget === 'voice' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
              title="Activate AI Voice Agent"
            >
              <Mic className="h-4 w-4" />
              <span className="text-[6.5px] font-black tracking-widest uppercase leading-none mt-0.5">Voice</span>
            </button>
          </div>
        </div>
      )}

      {/* Floating Internal Corporate Chat & File Sharing Network Widget */}
      {activePortal !== 'customer' && (
        <InternalChatDrawer isHiddenMobile={activeMobileWidget !== 'chat'} hideFloatingButton={true} />
      )}

      <UpdateNotification 
        isVisible={!!newVersionAvailable} 
        version={newVersionAvailable || ''}
        onUpdate={async () => {
          if ('serviceWorker' in navigator) {
            try {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            } catch (e) {
              console.warn('Failed to unregister Service Worker:', e);
            }
          }
          if ('caches' in window) {
            try {
              const keys = await caches.keys();
              await Promise.all(keys.map(key => caches.delete(key)));
            } catch (e) {
              console.warn('Failed to clear caches:', e);
            }
          }
          window.location.reload();
        }}
      />

      <OfflineRecoveryModal />

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

      {/* Voice Assistant */}
      <VoiceAssistant onCommand={handleVoiceCommand} isHiddenMobile={activeMobileWidget !== 'voice'} hideFloatingButton={true} />
    </div>
  );
}
