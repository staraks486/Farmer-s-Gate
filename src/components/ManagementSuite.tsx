import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  BarChart3,
  Menu,
  Building2,
  Store as StoreIcon,
  Truck,
  Receipt,
  Sliders,
  ArrowLeft,
  RefreshCw,
  LogOut,
  Info,
  Users,
  ExternalLink,
  Copy,
  Check,
  Lock,
  Unlock,
  KeyRound,
  ShieldAlert,
  HelpCircle,
  RotateCcw,
  Trash2,
  X,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import {
  Store,
  Sale,
  Purchase,
  InventoryItem,
  Requirement,
  Supplier,
  PurchaseOrder,
  CustomerOrder,
  MasterCrop,
  CpanelSettings,
  StorefrontAd,
  SupabaseConfig,
  AppNotification,
  getUserRole,
  StaffMember,
  AttendanceRecord,
  CompanyOfficial,
  OfferPromo,
} from "../types";
import {
  subscribeToOrders,
  subscribeToNotifications,
  addNotificationToFirestore,
  updateOrderStatusInFirestore,
  FirebaseOrder,
  updateSettings,
  updateStorefrontAds,
  firestoreErrorLog,
} from "../lib/firebase";
import { generateId, formatDate } from "../lib/utils";
import {
  dbGetStores,
  dbAddStore,
  dbUpdateStore,
  dbDeleteStore,
  dbGetSales,
  dbAddSale,
  dbAddSales,
  dbDeleteSale,
  dbUpdateSale,
  dbGetPurchases,
  dbAddPurchase,
  dbDeletePurchase,
  dbGetInventory,
  dbAddOrUpdateInventoryItem,
  dbAddOrUpdateInventoryItems,
  dbGetRequirements,
  dbAddRequirement,
  dbUpdateRequirement,
  dbDeleteRequirement,
  dbGetSuppliers,
  dbAddSupplier,
  dbUpdateSupplier,
  dbDeleteSupplier,
  dbGetPurchaseOrders,
  dbAddPurchaseOrder,
  dbUpdatePurchaseOrder,
  dbDeletePurchaseOrder,
  dbGetCustomerOrders,
  dbAddCustomerOrder,
  dbUpdateCustomerOrder,
  dbDeleteCustomerOrder,
  dbGetMasterCrops,
  dbAddOrUpdateMasterCrop,
  dbDeleteMasterCrop,
  getSupabaseConfig,
  saveSupabaseConfig,
  dbSyncLocalCache,
  dbGetStaffMembers,
  dbAddStaffMember,
  dbUpdateStaffMember,
  dbDeleteStaffMember,
  dbGetAttendanceRecords,
  dbSaveAttendanceRecord,
  dbGetCompanyOfficials,
  dbAddCompanyOfficial,
  dbUpdateCompanyOfficial,
  dbDeleteCompanyOfficial,
  dbGetOffers,
  dbAddOffer,
  dbUpdateOffer,
  dbDeleteOffer,
} from "../lib/supabase";

// Component imports
import Dashboard from "./Dashboard";
import HeadOffice from "./HeadOffice";
import StoreManager from "./StoreManager";
import SupplierManager from "./SupplierManager";
import AccountsManager from "./AccountsManager";
import AdminPanel from "./AdminPanel";
import TransportModule from "./TransportModule";
import ExecutivePortal from "./ExecutivePortal";
import StaffAttendanceManager from "./StaffAttendanceManager";
import CustomerMilkRegistry from "./CustomerMilkRegistry";
import { CustomerDirectory } from "./CustomerDirectory";
import { SystemHealthIndicator } from "./SystemHealthIndicator";
import { useData } from "../contexts/DataContext";

const DEFAULT_CPANEL_SETTINGS: CpanelSettings = {
  currencySymbol: "₹",
  defaultTaxRate: 0,
  allowNegativeStockCheckout: true,
  autoReorderThresholdPercent: 20,
  alertSoundEnabled: true,
  audioNotificationEnabled: true,
  whatsappMessageTemplate:
    "Dear {customer_name}, Your order of {order_summary} is ready!",
  enableCustomerOrderReview: true,
  enableMultipleRegisters: true,
  quickDemoDataEnabled: true,
  disableLoadingIntro: false,
  introSpeedSeconds: 4,
  enableLocalAccessRestriction: false,
  allowedLocalRadiusKm: 10,
  simulatedLocalOnly: false,
  headOfficeName: "Bangalore Corporate HQ",
  headOfficeLocation: "FarmersGate Corporate HQ, Sector 1, Bangalore",
  headOfficeLat: 12.9716,
  headOfficeLng: 77.5946,
  activeCity: "Bengaluru",
  maintenanceModeEnabled: false,
  maintenanceAnnouncementText:
    "Scheduled Server Optimization is currently in progress. Fresh delivery orders will resume shortly. Thank you for your patience!",
  enablePromoCodeCart: true,
  minimumOrderValue: 0,
  loyaltyPointsPercentage: 1,
  enableDigitalInvoicingOnly: false,
  enableDataChangeAuth: true,
  dataChangeAuthPin: "1234",
};

export default function ManagementSuite({
  user,
  isStorePosPortal,
  appVersion,
}: {
  user: any;
  isStorePosPortal?: boolean;
  appVersion?: string;
}) {
  const roleInfo = getUserRole(user?.email);
  
  const allowedTabs: string[] = React.useMemo(() => {
    let tabsList: string[] = roleInfo.allowedTabs || [
      "dashboard",
      "headoffice",
      "store",
      "suppliers",
      "accounts",
      "admin",
      "transport",
    ];
    if (!isStorePosPortal && !tabsList.includes("customers")) {
      tabsList = [...tabsList, "customers", "customer-directory"];
    }
    if (!isStorePosPortal && !tabsList.includes("customer-directory")) {
      tabsList = [...tabsList, "customer-directory"];
    }
    if (isStorePosPortal) {
      tabsList = ["store"];
    }
    return tabsList;
  }, [roleInfo.allowedTabs, isStorePosPortal]);

  const defaultTab = allowedTabs[0] || "dashboard";

  // Navigation
  const [activeTab, setActiveTab] = useState<
    | "dashboard"
    | "headoffice"
    | "store"
    | "suppliers"
    | "accounts"
    | "admin"
    | "staff"
    | "customers"
    | "customer-directory"
    | "transport"
  >(() => {
    const hash = window.location.hash.toLowerCase();
    const cleanHash = hash.replace('#management/', '').replace('#', '');
    let tabToSet: any = defaultTab;
    const allPossibleTabs = ["dashboard", "headoffice", "store", "suppliers", "accounts", "admin", "staff", "customers", "customer-directory", "transport"];
    if (allPossibleTabs.includes(cleanHash) && allowedTabs.includes(cleanHash)) {
      tabToSet = cleanHash;
    } else if (hash === '#management/admin' || hash === '#admin') {
      tabToSet = 'admin';
    } else if (hash === '#transport') {
      tabToSet = 'transport';
    }
    return tabToSet;
  });

  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 60) {
      if (scrollTop > lastScrollTop) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
    } else {
      setShowHeader(true);
    }
    setLastScrollTop(scrollTop);
  };

  // Keep activeTab in sync with window hashchanges
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.toLowerCase();
      const cleanHash = hash.replace('#management/', '').replace('#', '');
      const allPossibleTabs = ["dashboard", "headoffice", "store", "suppliers", "accounts", "admin", "staff", "customers", "customer-directory", "transport"];
      
      if (allPossibleTabs.includes(cleanHash) && allowedTabs.includes(cleanHash)) {
        setActiveTab(cleanHash as any);
      } else if (hash === '#management/admin' || hash === '#admin') {
        if (allowedTabs.includes('admin')) setActiveTab('admin');
      } else if (hash === '#transport') {
        if (allowedTabs.includes('transport')) setActiveTab('transport');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [allowedTabs]);

  // Fallback if activeTab gets excluded from allowedTabs
  useEffect(() => {
    if (!allowedTabs.includes(activeTab as any)) {
      setActiveTab(defaultTab as any);
    }
  }, [allowedTabs, defaultTab, activeTab]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [copiedStoreId, setCopiedStoreId] = useState<string | null>(null);
  const [unlockedStoreId, setUnlockedStoreId] = useState<string | null>(null);
  const [storePassword, setStorePassword] = useState<string>("");
  const [storeLoginError, setStoreLoginError] = useState<string | null>(null);

  // Sync selectedStore to localStorage for internal chat identity alignment
  useEffect(() => {
    if (selectedStore) {
      localStorage.setItem('fg_selected_store_name', selectedStore.name);
      localStorage.setItem('fg_selected_store_id', selectedStore.id);
      window.dispatchEvent(new Event('fg_selected_store_changed'));
    } else {
      localStorage.removeItem('fg_selected_store_name');
      localStorage.removeItem('fg_selected_store_id');
      window.dispatchEvent(new Event('fg_selected_store_changed'));
    }
  }, [selectedStore]);

  // Unified Data Context (Real-time Firestore)
  const {
    stores,
    inventory,
    sales,
    purchases,
    requirements,
    suppliers,
    purchaseOrders,
    customerOrders,
    masterCrops,
    staff,
    attendance,
    officials,
    promos,
    milkCustomers,
    notifications,
    bills: syncedBills,
    cpanelSettings: syncedSettings,
    storefrontAds: syncedAds,
    loading: contextLoading,
    error: contextError
  } = useData();

  useEffect(() => {
    console.log('ManagementSuite: stores', stores);
    console.log('ManagementSuite: stores.length', stores.length);
  }, [stores]);

  // Derived states with local fallbacks if needed
  const cpanelSettings = syncedSettings || DEFAULT_CPANEL_SETTINGS;
  const bills = syncedBills;
  const storefrontAds = syncedAds.length > 0 ? syncedAds : [
    {
      id: "ad-1",
      title: "Monsoon Fresh Arrival",
      subtitle: "Farm fresh leafy vegetables harvested today!",
      discountBadge: "Flat 20% OFF",
      isActive: true,
    },
    {
      id: "ad-2",
      title: "Organic Potato Deal",
      subtitle: "Fresh high-yield chemical free potatoes from Nashik",
      discountBadge: "Special Price",
      isActive: true,
    },
  ];
  const offers = promos;
  const loading = contextLoading;

  const [dbConfig, setDbConfig] = useState<SupabaseConfig>({
    supabaseUrl: "",
    supabaseAnonKey: "",
    isConnected: false,
  });

  // Load config on mount
  useEffect(() => {
    setDbConfig(getSupabaseConfig());
  }, []);

  // Stock alerts sub-tab direction state
  const [hoSubTab, setHoSubTab] = useState<'requirements' | 'inventory' | 'stores' | 'master-catalog' | 'customer-orders' | 'qr-catalog' | 'geo-sandbox' | 'shopper-store' | 'offers' | 'ads' | 'settings' | undefined>(undefined);

  // Real-time Low Stock Toast Notification System state
  const [stockToasts, setStockToasts] = useState<Array<{
    id: string;
    itemId: string;
    vegetableName: string;
    storeName: string;
    quantity: number;
    minStockThreshold: number;
    timestamp: number;
    secondsLeft?: number;
  }>>([]);

  const prevInventoryRef = useRef<InventoryItem[]>([]);

  // Sound function mimicking web audio context chime tones
  const playAlertSound = () => {
    if (!cpanelSettings?.alertSoundEnabled && !cpanelSettings?.audioNotificationEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const startTime = audioCtx.currentTime;
      osc.frequency.setValueAtTime(440, startTime); // A4
      osc.frequency.setValueAtTime(659.25, startTime + 0.1); // E5
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.04, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    } catch (e) {
      console.warn("Failed to play alert sound:", e);
    }
  };

  const handleDismissStockToast = (id: string) => {
    setStockToasts(prev => prev.filter(t => t.id !== id));
  };

  // Real-time listener checker to detect inventory changes falling below predefined threshold
  useEffect(() => {
    if (!inventory || inventory.length === 0) return;
    
    // Initial sync load: set references first to prevent page load alert spam
    if (prevInventoryRef.current.length === 0) {
      prevInventoryRef.current = inventory;
      return;
    }
    
    const newToasts: typeof stockToasts = [];
    let shouldPlaySound = false;
    
    inventory.forEach(current => {
      const previous = prevInventoryRef.current.find(p => p.id === current.id);
      if (previous) {
        // If stock decreased or threshold was edited
        if (current.quantity < previous.quantity) {
          const isNowLow = current.quantity <= current.minStockThreshold;
          if (isNowLow) {
            const store = stores.find(s => s.id === current.storeId);
            const storeName = store ? store.name.replace("Farmer's Gate - ", "") : "Unknown Store";
            
            // Avoid duplicate triggers for the same quantity/item
            const isAlreadyAlerted = stockToasts.some(t => t.itemId === current.id && t.quantity === current.quantity);
            if (!isAlreadyAlerted) {
              newToasts.push({
                id: generateId('stock-alert'),
                itemId: current.id,
                vegetableName: current.vegetableName,
                storeName,
                quantity: current.quantity,
                minStockThreshold: current.minStockThreshold,
                timestamp: Date.now(),
                secondsLeft: 15
              });
              shouldPlaySound = true;
            }
          }
        }
      } else {
        // New item added below threshold
        if (current.quantity <= current.minStockThreshold) {
          const store = stores.find(s => s.id === current.storeId);
          const storeName = store ? store.name.replace("Farmer's Gate - ", "") : "Unknown Store";
          
          newToasts.push({
            id: generateId('stock-alert'),
            itemId: current.id,
            vegetableName: current.vegetableName,
            storeName,
            quantity: current.quantity,
            minStockThreshold: current.minStockThreshold,
            timestamp: Date.now(),
            secondsLeft: 15
          });
          shouldPlaySound = true;
        }
      }
    });
    
    if (newToasts.length > 0) {
      setStockToasts(prev => [...prev, ...newToasts]);
      if (shouldPlaySound) {
        playAlertSound();
      }
    }
    
    prevInventoryRef.current = inventory;
  }, [inventory, stores]);

  // Timer for active stock alerts to auto-dismiss and update remaining display time
  useEffect(() => {
    if (stockToasts.length === 0) return;

    const timer = setInterval(() => {
      setStockToasts((prev) => {
        return prev
          .map((t) => ({
            ...t,
            secondsLeft: (t.secondsLeft ?? 15) - 1,
          }))
          .filter((t) => t.secondsLeft > 0);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stockToasts]);

  // Undoable deletion states
  const [activeToasts, setActiveToasts] = useState<
    Array<{
      id: string;
      label: string;
      secondsLeft: number;
      onUndo: () => void;
      onConfirm: () => Promise<void> | void;
    }>
  >([]);

  // Security Data Change Authentication States
  const [secureActionPending, setSecureActionPending] = useState<{
    action: () => void;
    description: string;
  } | null>(null);
  const [securePinInput, setSecurePinInput] = useState('');
  const [securePinError, setSecurePinError] = useState('');

  const executeWithSecureAuth = (action: () => void, description: string) => {
    if (cpanelSettings?.enableDataChangeAuth) {
      setSecureActionPending({ action, description });
      setSecurePinInput('');
      setSecurePinError('');
    } else {
      action();
    }
  };

  const wrapSecure = <T extends (...args: any[]) => any>(
    fn: T,
    description: string
  ): ((...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>) => {
    return (...args: Parameters<T>) => {
      return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        executeWithSecureAuth(async () => {
          try {
            const res = await fn(...args);
            resolve(res);
          } catch (err) {
            reject(err);
          }
        }, description);
      });
    };
  };

  const handleVerifySecurePin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = cpanelSettings?.dataChangeAuthPin || '1234';
    if (securePinInput === correctPin) {
      if (secureActionPending) {
        secureActionPending.action();
      }
      setSecureActionPending(null);
      setSecurePinInput('');
      setSecurePinError('');
    } else {
      setSecurePinError('Invalid security PIN. Please try again.');
    }
  };

  useEffect(() => {
    if (activeToasts.length === 0) return;

    const timer = setInterval(() => {
      setActiveToasts((prev) => {
        const next = prev.map((t) => ({
          ...t,
          secondsLeft: t.secondsLeft - 1,
        }));

        // Trigger confirmations for tasks that hit 0 seconds
        next
          .filter((t) => t.secondsLeft <= 0)
          .forEach((t) => {
            try {
              t.onConfirm();
            } catch (err) {
              console.error("Confirmation error during deletion:", err);
            }
          });

        return next.filter((t) => t.secondsLeft > 0);
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeToasts]);

  const triggerUndoableDelete = (params: {
    label: string;
    onConfirm: () => Promise<void> | void;
    onUndo: () => void;
  }) => {
    const toastId = generateId('toast');
    setActiveToasts((prev) => [
      ...prev,
      {
        id: toastId,
        label: params.label,
        secondsLeft: 6,
        onUndo: params.onUndo,
        onConfirm: params.onConfirm,
      },
    ]);
  };

  // General Store Customers State
  const [generalCustomers, setGeneralCustomers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("fg_general_customers");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem(
      "fg_general_customers",
      JSON.stringify(generalCustomers),
    );
  }, [generalCustomers]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "fg_general_customers" && e.newValue) {
        try {
          setGeneralCustomers(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Real-time Firebase states
  const [firebaseOrders, setFirebaseOrders] = useState<FirebaseOrder[]>([]);
  const [firebaseNotifications, setFirebaseNotifications] = useState<
    AppNotification[]
  >([]);

  // UI state
  const [syncing, setSyncing] = useState(false);

  // POS Store selection logic
  useEffect(() => {
    if (isStorePosPortal && stores.length > 0 && !selectedStore) {
      const params = new URLSearchParams(window.location.search);
      const queryStoreId = params.get("storeId");
      if (queryStoreId) {
        const match = stores.find((st) => st.id === queryStoreId);
        if (match) {
          setSelectedStore(match);
          setUnlockedStoreId(match.id);
        }
      } else if (stores.length === 1) {
        setSelectedStore(stores[0]);
        setUnlockedStoreId(stores[0].id);
      }
    }
  }, [isStorePosPortal, stores, selectedStore]);

  // Update selected store if stores change
  useEffect(() => {
    if (selectedStore) {
      const updated = stores.find(s => s.id === selectedStore.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedStore)) {
        setSelectedStore(updated);
      }
    }
  }, [stores, selectedStore]);

  const handleSync = async () => {
    setSyncing(true);
    await dbSyncLocalCache();
    setSyncing(false);
  };

  const handleResetToDemo = () => {
    alert("Data reset is disabled to ensure persistence.");
    window.location.reload();
  };

  const triggerDataUpdate = async (silent = true) => {
    try {
      console.log("[Data Sync] Database mutations are automatically synchronized in real-time via Firestore streams.");
    } catch (e) {}
  };

  // CRUD Handlers for Stores
  const handleAddStore = async (store: Store) => {
    await dbAddStore(store);
    await triggerDataUpdate();
  };

  const handleUpdateStore = async (store: Store) => {
    await dbUpdateStore(store);
    await triggerDataUpdate();
  };

  const handleDeleteStore = async (id: string) => {
    const itemToDelete = stores.find((s) => s.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Store "${itemToDelete.name}"`,
      onConfirm: async () => {
        await dbDeleteStore(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  // CRUD Handlers for Requirements
  const handleAddRequirement = async (req: Requirement) => {
    await dbAddRequirement(req);
    await triggerDataUpdate();
  };

  const handleUpdateRequirementStatus = async (
    id: string,
    status: "Pending" | "Ordered" | "Fulfilled",
  ) => {
    const req = requirements.find((r) => r.id === id);
    if (req) {
      await dbUpdateRequirement({ ...req, status });
      await triggerDataUpdate();
    }
  };

  const handleUpdateRequirement = async (req: Requirement) => {
    await dbUpdateRequirement(req);
    await triggerDataUpdate();
  };

  const handleDeleteRequirement = async (id: string) => {
    const itemToDelete = requirements.find((r) => r.id === id);
    if (!itemToDelete) return;

    // Optimistically update state
    triggerUndoableDelete({
      label: `Requirement for "${itemToDelete.vegetableName}"`,
      onConfirm: async () => {
        await dbDeleteRequirement(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  // Sales
  const handleAddSale = async (sale: Sale | Sale[]) => {
    if (Array.isArray(sale)) {
      await dbAddSales(sale);
    } else {
      await dbAddSale(sale);
    }
    await triggerDataUpdate();
  };

  const handleDeleteSale = async (id: string) => {
    const itemToDelete = sales.find((s) => s.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Sale record of "${itemToDelete.vegetableName}" (₹${itemToDelete.totalAmount})`,
      onConfirm: async () => {
        await dbDeleteSale(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  const handleUpdateSale = async (sale: Sale) => {
    await dbUpdateSale(sale);
    await triggerDataUpdate();
  };

  // Purchases
  const handleAddPurchase = async (p: Purchase) => {
    await dbAddPurchase(p);
    await triggerDataUpdate();
  };

  const handleDeletePurchase = async (id: string) => {
    const itemToDelete = purchases.find((p) => p.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Purchase record of "${itemToDelete.vegetableName}"`,
      onConfirm: async () => {
        await dbDeletePurchase(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  // Inventory
  const handleUpdateInventoryItem = async (item: InventoryItem) => {
    await dbAddOrUpdateInventoryItem(item);
    await triggerDataUpdate(true);
  };

  const handleUpdateInventoryItems = async (items: InventoryItem[]) => {
    await dbAddOrUpdateInventoryItems(items);
    await triggerDataUpdate(true);
  };

  // Master Crops
  const handleUpdateMasterCrop = async (crop: MasterCrop) => {
    await dbAddOrUpdateMasterCrop(crop);
    await triggerDataUpdate();
  };

  const handleDeleteMasterCrop = async (id: string) => {
    const itemToDelete = masterCrops.find((c) => c.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Master Template "${itemToDelete.vegetableName}"`,
      onConfirm: async () => {
        await dbDeleteMasterCrop(id);
        await triggerDataUpdate();
      },
      onUndo: () => {
        // Undo is handled by not calling onConfirm (item stays in DB)
      },
    });
  };

  // Staff and Attendance Handlers
  const handleAddStaff = async (member: StaffMember) => {
    await dbAddStaffMember(member);
    await triggerDataUpdate();
  };

  const handleUpdateStaff = async (member: StaffMember) => {
    await dbUpdateStaffMember(member);
    await triggerDataUpdate();
  };

  const handleDeleteStaff = async (id: string) => {
    const itemToDelete = staff.find((s) => s.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Staff Member "${itemToDelete.name}"`,
      onConfirm: async () => {
        await dbDeleteStaffMember(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  const handleSaveAttendance = async (record: AttendanceRecord) => {
    await dbSaveAttendanceRecord(record);
    await triggerDataUpdate();
  };

  // Company Officials Handlers
  const handleAddOfficial = async (official: CompanyOfficial) => {
    await dbAddCompanyOfficial(official);
    await triggerDataUpdate();
  };

  const handleUpdateOfficial = async (official: CompanyOfficial) => {
    await dbUpdateCompanyOfficial(official);
    await triggerDataUpdate();
  };

  const handleDeleteOfficial = async (id: string) => {
    const itemToDelete = officials.find((o) => o.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Company Official "${itemToDelete.name}"`,
      onConfirm: async () => {
        await dbDeleteCompanyOfficial(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  // Offers Handlers
  const handleAddOffer = async (offer: OfferPromo) => {
    await dbAddOffer(offer);
    await triggerDataUpdate();
  };

  const handleUpdateOffer = async (offer: OfferPromo) => {
    await dbUpdateOffer(offer);
    await triggerDataUpdate();
  };

  const handleDeleteOffer = async (id: string) => {
    const itemToDelete = offers.find((o) => o.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Offer Promo "${itemToDelete.code}"`,
      onConfirm: async () => {
        await dbDeleteOffer(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  // Suppliers
  const handleAddSupplier = async (s: Supplier) => {
    await dbAddSupplier(s);
    await triggerDataUpdate();
  };

  const handleUpdateSupplier = async (s: Supplier) => {
    await dbUpdateSupplier(s);
    await triggerDataUpdate();
  };

  const handleDeleteSupplier = async (id: string) => {
    const itemToDelete = suppliers.find((s) => s.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Supplier "${itemToDelete.name}"`,
      onConfirm: async () => {
        await dbDeleteSupplier(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  // POs
  const handleAddPurchaseOrder = async (po: PurchaseOrder) => {
    await dbAddPurchaseOrder(po);
    await triggerDataUpdate();
  };

  const handleUpdatePurchaseOrder = async (po: PurchaseOrder) => {
    await dbUpdatePurchaseOrder(po);
    await triggerDataUpdate();
  };

  const handleDeletePurchaseOrder = async (id: string) => {
    const itemToDelete = purchaseOrders.find((po) => po.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Purchase Order #${itemToDelete.id}`,
      onConfirm: async () => {
        await dbDeletePurchaseOrder(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  // Customer Orders
  const handleUpdateCustomerOrder = async (order: CustomerOrder) => {
    await dbUpdateCustomerOrder(order);
    await triggerDataUpdate();
  };

  const handleDeleteCustomerOrder = async (id: string) => {
    const itemToDelete = customerOrders.find((co) => co.id === id);
    if (!itemToDelete) return;

    triggerUndoableDelete({
      label: `Customer Order for "${itemToDelete.customerName}"`,
      onConfirm: async () => {
        await dbDeleteCustomerOrder(id);
        await triggerDataUpdate();
      },
      onUndo: () => {},
    });
  };

  const handleFulfillCustomerOrder = async (order: CustomerOrder) => {
    // 1. Mark order as 'Completed'
    const updatedOrder: CustomerOrder = {
      ...order,
      status: "Completed",
    };
    await dbUpdateCustomerOrder(updatedOrder);

    // 2. Record Sale Transactions for each item (this automatically deducts weights from current stock in dbAddSales)
    const salesList: Sale[] = order.items.map((item, idx) => ({
      id: generateId('sale'),
      storeId: order.storeId,
      vegetableName: item.vegetableName,
      quantity: item.quantity,
      pricePerKg: item.pricePerKg,
      totalPrice: item.quantity * item.pricePerKg,
      saleDate: new Date().toISOString(),
    }));

    await dbAddSales(salesList);

    await triggerDataUpdate();
  };

  const handleReceivePOInventory = async (po: PurchaseOrder) => {
    // Receive all items into the respective store inventory
    for (const item of po.items) {
      // Find matching inventory item for this store and vegetable
      const existing = inventory.find(
        (inv) =>
          inv.storeId === po.storeId &&
          inv.vegetableName === item.vegetableName,
      );
      if (existing) {
        await dbAddOrUpdateInventoryItem({
          ...existing,
          quantity: Number(existing.quantity) + Number(item.quantity),
          costPrice: Number(item.costPerKg),
          lastUpdated: new Date().toISOString(),
        });
      } else {
        // Create new item
        await dbAddOrUpdateInventoryItem({
          id: generateId('inv'),
          storeId: po.storeId,
          vegetableName: item.vegetableName,
          quantity: Number(item.quantity),
          minStockThreshold: 15,
          costPrice: Number(item.costPerKg),
          sellingPrice: Number(item.costPerKg) * 1.3,
          lastUpdated: new Date().toISOString(),
        });
      }

      // Record a Purchase Transaction
      await dbAddPurchase({
        id: generateId('pur'),
        storeId: po.storeId,
        vegetableName: item.vegetableName,
        quantity: Number(item.quantity),
        costPerKg: Number(item.costPerKg),
        totalCost: Number(item.totalCost),
        supplierName: po.supplierName,
        purchaseDate: new Date().toISOString(),
      });
    }

    // Mark PO as Delivered and Paid
    await dbUpdatePurchaseOrder({
      ...po,
      status: "Delivered",
      paymentStatus: "Paid",
      paidAmount: po.totalAmount,
    });

    await triggerDataUpdate();
  };

  // Cpanel / Settings
  const handleUpdateCpanelSettings = async (settings: CpanelSettings) => {
    try {
      localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(settings));
      await updateSettings(settings);
    } catch (err) {
      console.error("Failed to update settings in Firestore:", err);
    }
  };

  const handleUpdateStorefrontAds = async (ads: StorefrontAd[]) => {
    try {
      await updateStorefrontAds(ads);
    } catch (err) {
      console.error("Failed to update ads in Firestore:", err);
    }
  };

  const handleSaveDbConfig = async (url: string, key: string) => {
    const res = await saveSupabaseConfig(url, key);
    const config = getSupabaseConfig();
    setDbConfig(config);
    return res;
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 bg-slate-50">
        <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-sm font-black text-slate-700 uppercase tracking-wider">
          Syncing Corporate Ledger & Catalog...
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Connecting secure database credentials
        </p>
      </div>
    );
  }

  // Active navigation helper
  const allTabs = [
    { id: "dashboard", name: "Executive Dashboard", icon: BarChart3 },
    { id: "headoffice", name: "HQ Supply Office", icon: Building2 },
    { id: "customers", name: "Milk User Ledger", icon: Users },

    { id: "customer-directory", name: "Customer Directory", icon: Users },
    { id: "store", name: "Store POS & Retail", icon: StoreIcon },
    { id: "suppliers", name: "Supply Chain POs", icon: Truck },
    { id: "accounts", name: "Double Entry Ledger", icon: Receipt },
    { id: "staff", name: "Staff & Attendance", icon: Users },
    { id: "admin", name: "HQ System Admin", icon: Sliders },
    { id: "transport", name: "Transport Fleet", icon: Truck },
    { id: "errors", name: "Operation Errors", icon: AlertTriangle },
  ];

  const tabs = allTabs.filter((t) => allowedTabs.includes(t.id as any));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const filteredStorePurchases = useMemo(() => {
    if (!selectedStore) return [];
    return purchases.filter((p) => p.storeId === selectedStore.id);
  }, [purchases, selectedStore?.id]);

  const filteredStoreRequirements = useMemo(() => {
    if (!selectedStore) return [];
    return requirements.filter((r) => r.storeId === selectedStore.id);
  }, [requirements, selectedStore?.id]);

  const filteredStoreCustomerOrders = useMemo(() => {
    if (!selectedStore) return [];
    return customerOrders.filter((co) => co.storeId === selectedStore.id);
  }, [customerOrders, selectedStore?.id]);

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-emerald-50/10">
      {/* Management Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 transition-opacity md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Management Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-72 bg-emerald-950 text-white flex flex-col border-r border-emerald-900/60 shadow-2xl md:shadow-none transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="p-4 border-b border-emerald-900/60 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              HQ OPERATIONS
              <span
                className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"
                title="Live Auto-Sync Active (Background)"
              />
            </h2>
            <p className="text-[10px] text-emerald-300 font-semibold uppercase">
              FarmersGate HQ
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="p-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 transition cursor-pointer text-slate-300"
              title="Sync cache with server"
            >
              <RefreshCw
                className={`h-5 w-5 ${syncing ? "animate-spin text-emerald-400" : ""}`}
              />
            </button>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-lg bg-emerald-900 hover:bg-emerald-800 transition cursor-pointer text-slate-300 md:hidden"
              title="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

          {/* Sidebar Nav */}
          <nav className="flex flex-col overflow-y-auto p-3 space-y-2 shrink scrollbar-none">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    if (tab.id !== "store") setSelectedStore(null);
                    setIsSidebarOpen(false); // Close immediately
                  }}
                  className={`flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap w-full ${
                    isActive
                      ? "bg-emerald-600 text-slate-950 shadow-lg"
                      : "text-slate-300 hover:bg-emerald-900/80 hover:text-white"
                  }`}
                >
                  <IconComponent
                    className={`h-5 w-5 ${isActive ? "text-slate-950" : "text-slate-400"}`}
                  />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>

        {/* Sync Status Info - Hidden on mobile to save precious screen real estate */}
        <div className="hidden md:block p-4 bg-emerald-950/80 border-t border-emerald-900/60 shrink-0 space-y-4">
          <SystemHealthIndicator />
          
          <div className="text-[10px] text-emerald-300 font-medium">
            <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-bold uppercase tracking-wider text-[9px]">
                Offline Resilience Active
              </span>
            </div>
            <p className="text-[9px] leading-relaxed text-emerald-400/85">
              Data is persisted in client localStorage & synchronized to cloud
              database automatically when online.
            </p>
          </div>
        </div>
      </aside>

      {/* Management Active View Container */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        {/* Dynamic header reflecting deep state */}
        <div className={`bg-white transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-2 ${
          showHeader 
            ? "max-h-32 opacity-100 border-b border-slate-200/60 px-6 py-4" 
            : "max-h-0 opacity-0 py-0 border-b-0 overflow-hidden"
        }`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                console.log('Sidebar toggle clicked');
                setIsSidebarOpen(true);
              }}
              className="p-2 -ml-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <span>{tabs.find((t) => t.id === activeTab)?.name}</span>
                {selectedStore && (
                  <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-black uppercase">
                    🏪 {selectedStore.name.replace("Farmer's Gate - ", "")}
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium hidden sm:block">
                {activeTab === "dashboard" &&
                  "Real-time multi-branch retail ledger & diagnostic systems."}
                {activeTab === "headoffice" &&
                  "Centralized inventory requirements & master crop catalogs."}
                {activeTab === "store" &&
                  "Manage cash registry registers, manual sales entries, and crop weights."}
                {activeTab === "suppliers" &&
                  "Fulfill crop requirements by sending purchase requests directly to mandis."}
                {activeTab === "accounts" &&
                  "Profit analysis ledger sheet reflecting cost of goods & miscellaneous bills."}
                {activeTab === "staff" &&
                  "Manage employee rosters, cross-branch shifts, and log daily check-ins."}
                {activeTab === "admin" &&
                  "Supabase & database connection parameters control board."}
                {activeTab === "customers" &&
                  "View and manage individual store milk records for all branches."}

                {activeTab === "customer-directory" &&
                  "HQ Customer Database, CRM profiles, WhatsApp sales totals, and loyalty point balances."}
                {activeTab === "transport" &&
                  "Manage delivery vehicles, driver assignments, and live transit status."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {selectedStore && (
              <button
                onClick={() => {
                  setSelectedStore(null);
                  setUnlockedStoreId(null);
                  setStorePassword("");
                  setStoreLoginError(null);
                  const url = new URL(window.location.href);
                  url.searchParams.delete("storeId");
                  window.history.pushState({}, "", url.toString());
                }}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-xs font-bold text-slate-600 flex items-center gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Branch List
              </button>
            )}
          </div>
        </div>

        {/* Core Screen Router */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "dashboard" && <ExecutivePortal isAdmin={true} />}

          {activeTab === "headoffice" && (
            <HeadOffice
              cpanelSettings={cpanelSettings}
              onUpdateCpanelSettings={wrapSecure(handleUpdateCpanelSettings, "Modify Global System Settings")}
              storefrontAds={storefrontAds}
              onUpdateStorefrontAds={wrapSecure(handleUpdateStorefrontAds, "Update Storefront Ads")}
              stores={stores}
              requirements={requirements}
              inventory={inventory}
              sales={sales}
              role="Admin"
              onUpdateRequirementStatus={wrapSecure(handleUpdateRequirementStatus, "Change Crop Requirement Status")}
              onDeleteRequirement={wrapSecure(handleDeleteRequirement, "Remove Crop Requirement")}
              onUpdateInventoryItem={wrapSecure(handleUpdateInventoryItem, "Update Inventory Record")}
              masterCrops={masterCrops}
              onUpdateMasterCrop={wrapSecure(handleUpdateMasterCrop, "Modify Master Crop Profile")}
              onDeleteMasterCrop={wrapSecure(handleDeleteMasterCrop, "Delete Master Crop Profile")}
              firebaseOrders={firebaseOrders}
              firebaseNotifications={firebaseNotifications}
              offers={offers}
              onAddOffer={wrapSecure(handleAddOffer, "Create Offer Promo Code")}
              onUpdateOffer={wrapSecure(handleUpdateOffer, "Modify Offer Promo Code")}
              onDeleteOffer={wrapSecure(handleDeleteOffer, "Delete Offer Promo Code")}
              defaultActiveSubTab={hoSubTab}
            />
          )}

          {activeTab === "customers" && (
            <CustomerMilkRegistry 
              requestSecureAction={executeWithSecureAuth} 
              sales={sales}
              onAddSale={wrapSecure(handleAddSale, "Manual Milk Delivery Sale Entry")}
              onDeleteSale={wrapSecure(handleDeleteSale, "Remove Milk Delivery Sale Entry")}
            />
          )}

          {activeTab === "customer-directory" && (
            <div className="flex-1 overflow-y-auto w-full">
              <CustomerDirectory
                generalCustomers={generalCustomers}
                setGeneralCustomers={setGeneralCustomers}
                storeBills={bills}
                storeId={selectedStore?.id}
              />
            </div>
          )}

          {activeTab === "store" &&
            (selectedStore ? (
              unlockedStoreId === selectedStore.id ? (
                <StoreManager
                  store={selectedStore}
                  sales={sales}
                  purchases={filteredStorePurchases}
                  inventory={inventory}
                  requirements={filteredStoreRequirements}
                  customerOrders={filteredStoreCustomerOrders}
                  role="Admin"
                  offers={offers}
                  onAddSale={wrapSecure(handleAddSale, "Record Store Sales Transaction")}
                  onDeleteSale={wrapSecure(handleDeleteSale, "Delete Store Sales Entry")}
                  onUpdateSale={wrapSecure(handleUpdateSale, "Update Store Sales Entry")}
                  onAddPurchase={wrapSecure(handleAddPurchase, "Record Store Crop Purchase")}
                  onDeletePurchase={wrapSecure(handleDeletePurchase, "Delete Crop Purchase Transaction")}
                  onUpdateInventoryItem={wrapSecure(handleUpdateInventoryItem, "Update Store Inventory Stock Level")}
                  onUpdateInventoryItems={wrapSecure(handleUpdateInventoryItems, "Bulk Adjust Store Inventory Stock Levels")}
                  onAddRequirement={wrapSecure(handleAddRequirement, "Raise New Crop Requirement Request")}
                  onUpdateRequirement={wrapSecure(handleUpdateRequirement, "Modify Crop Requirement Details")}
                  onUpdateRequirementStatus={wrapSecure(handleUpdateRequirementStatus, "Update Requirement Fulfillment Status")}
                  onDeleteRequirement={wrapSecure(handleDeleteRequirement, "Delete Crop Requirement Request")}
                  onFulfillCustomerOrder={wrapSecure(handleFulfillCustomerOrder, "Fulfill Customer Order & Record Sales")}
                  onUpdateCustomerOrder={wrapSecure(handleUpdateCustomerOrder, "Update Customer Order Status/Details")}
                  onDeleteCustomerOrder={wrapSecure(handleDeleteCustomerOrder, "Cancel/Delete Customer Order")}
                  cpanelSettings={cpanelSettings}
                  staff={staff}
                  attendance={attendance}
                  onSaveAttendance={wrapSecure(handleSaveAttendance, "Save Staff Attendance Checklist")}
                  onUpdateStaff={wrapSecure(handleUpdateStaff, "Modify Employee Shift/Profile Details")}
                  stores={stores}
                  masterCrops={masterCrops}
                />
              ) : (
                /* Beautiful, fully responsive secure branch login PIN register screen */
                <div className="max-w-md mx-auto py-8">
                  <div className="bg-white border border-slate-200/90 shadow-xl rounded-3xl overflow-hidden">
                    {/* Header with Lock Emblem */}
                    <div className="bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-6 text-center space-y-2">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-950 border border-emerald-500/20 mb-1">
                        <Lock className="h-6 w-6 text-emerald-400" />
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-emerald-200">
                        Secure Branch Login Gateway
                      </h3>
                      <p className="text-xs text-slate-300 font-bold">
                        {selectedStore.name}
                      </p>
                    </div>

                    {/* Login Form */}
                    <div className="p-6 space-y-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 block uppercase tracking-wider">
                          Enter Terminal Access PIN
                        </label>
                        <input
                          type="password"
                          value={storePassword}
                          onChange={(e) => {
                            setStorePassword(e.target.value);
                            setStoreLoginError(null);
                          }}
                          placeholder="••••••••"
                          className="w-full text-center text-lg font-black tracking-widest px-4 py-3 bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl outline-none transition"
                        />
                      </div>

                      {storeLoginError && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-semibold">
                          <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0" />
                          <span>{storeLoginError}</span>
                        </div>
                      )}

                      {/* Touch Virtual Keypad (0-9, Clear, Enter) - extremely adaptive for mobile devices */}
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              setStorePassword((prev) => prev + num);
                              setStoreLoginError(null);
                            }}
                            className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-sm transition active:scale-95 flex items-center justify-center cursor-pointer select-none shadow-3xs"
                          >
                            {num}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setStorePassword("");
                            setStoreLoginError(null);
                          }}
                          className="h-12 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 font-extrabold rounded-xl text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center cursor-pointer select-none shadow-3xs"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStorePassword((prev) => prev + "0");
                            setStoreLoginError(null);
                          }}
                          className="h-12 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold rounded-xl text-sm transition active:scale-95 flex items-center justify-center cursor-pointer select-none shadow-3xs"
                        >
                          0
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Check password
                            const defaultPasswords: Record<string, string> = {
                              "st-1": "mumbai123",
                              "st-2": "pune123",
                              "st-3": "bangalore123",
                              "st-4": "delhi123",
                              "st-5": "chennai123",
                            };
                            const isMatch =
                              storePassword === "pos123" ||
                              storePassword === selectedStore.password ||
                              storePassword ===
                                defaultPasswords[selectedStore.id] ||
                              storePassword ===
                                selectedStore.name
                                  .toLowerCase()
                                  .replace(/[^a-z0-9]/g, "") +
                                  "123";

                            if (isMatch) {
                              setUnlockedStoreId(selectedStore.id);
                              setStorePassword("");
                              setStoreLoginError(null);
                            } else {
                              setStoreLoginError(
                                "Invalid security PIN code. Please try again.",
                              );
                            }
                          }}
                          className="h-12 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center cursor-pointer select-none shadow-3xs"
                        >
                          Enter
                        </button>
                      </div>

                      <div className="flex gap-2 shrink-0 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStore(null);
                            setStorePassword("");
                            setStoreLoginError(null);
                          }}
                          className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStorePassword("pos123");
                          }}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <HelpCircle className="h-3.5 w-3.5" /> Use Test PIN
                        </button>
                      </div>

                      {/* Official testing link badge at the bottom of the card */}
                      <div className="border-t border-slate-200 pt-4 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          For Verified Testing & Audits
                        </p>
                        <a
                          href="https://farmersgate.com/official-branch-ledger-testing"
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="inline-flex mt-1.5 items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-emerald-800 hover:text-emerald-950 text-[10px] font-black uppercase tracking-wider rounded-full transition"
                        >
                          <span>Official Test Hub 🔗</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )
            ) : (
              /* Selection view: list of stores */
              <div className="max-w-2xl mx-auto py-4">
                <div className="grid grid-cols-1 gap-4 text-left">
                  {stores
                    .filter((st) => true) // Show all for debugging purposes
                    .map((st) => {
                      const separateLink = `${window.location.origin}${window.location.pathname}?portal=store_pos&storeId=${st.id}#store_pos`;
                      return (
                        <div
                          key={st.id}
                          className="w-full p-5 bg-white border border-slate-200/80 rounded-2xl shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-xs transition-all bg-gradient-to-r from-white to-slate-50/50"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-800">
                                {st.name}
                              </span>
                              {st.isActive && (
                                <span
                                  className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"
                                  title="Active Branch"
                                ></span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                              <span>📍 {st.location}</span>
                            </p>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                {st.isActive ? '🟢 Secure POS Terminal' : '⚪ Inactive Terminal'}
                              </span>
                              {st.whatsappNumber && (
                                <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                                  📞 {st.whatsappNumber}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => setSelectedStore(st)}
                              className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                            >
                              <span>Access Branch</span>
                              <span>🏪</span>
                            </button>

                            <a
                              href={separateLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 md:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-3xs cursor-pointer"
                            >
                              <span>POS Register URL</span>
                              <ExternalLink className="h-3.5 w-3.5 stroke-[2.5]" />
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(separateLink);
                                setCopiedStoreId(st.id);
                                setTimeout(() => setCopiedStoreId(null), 2000);
                              }}
                              className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-700 rounded-xl transition cursor-pointer flex items-center justify-center min-w-[38px]"
                              title="Copy separate direct URL"
                            >
                              {copiedStoreId === st.id ? (
                                <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  {stores.length === 0 && (
                    <div className="text-center py-6 text-slate-400 italic text-xs">
                      No active retail stores are currently online.
                    </div>
                  )}
                </div>

                {/* Persistent testing link placed at the bottom of the active selection view */}
                <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                    Official Test Manuals & Credentials Repository
                  </p>
                  <a
                    href="https://farmersgate.com/official-branch-ledger-testing"
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="inline-flex mt-2 items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-950 text-xs font-black uppercase tracking-wider rounded-full transition shadow-3xs"
                  >
                    <span>FarmersGate Official Test Suite 🔗</span>
                  </a>
                </div>
              </div>
            ))}

          {activeTab === "suppliers" && (
            <SupplierManager
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              stores={stores}
              role="Admin"
              onAddSupplier={wrapSecure(handleAddSupplier, "Add New Mandi Supplier Profile")}
              onUpdateSupplier={wrapSecure(handleUpdateSupplier, "Modify Supplier Details")}
              onDeleteSupplier={wrapSecure(handleDeleteSupplier, "Remove Supplier Profile")}
              onAddPurchaseOrder={wrapSecure(handleAddPurchaseOrder, "Create Bulk Mandi Purchase Order")}
              onUpdatePurchaseOrder={wrapSecure(handleUpdatePurchaseOrder, "Modify Purchase Order Details")}
              onDeletePurchaseOrder={wrapSecure(handleDeletePurchaseOrder, "Cancel/Delete Purchase Order")}
              onReceivePOInventory={wrapSecure(handleReceivePOInventory, "Receive PO Stock & Record Purchase Transaction")}
            />
          )}

          {activeTab === "accounts" && (
            <AccountsManager
              stores={stores}
              sales={sales}
              purchases={purchases}
              role="Admin"
            />
          )}

          {activeTab === "staff" && (
            <StaffAttendanceManager
              stores={stores}
              sales={sales}
              staff={staff}
              attendance={attendance}
              onAddStaff={wrapSecure(handleAddStaff, "Register New Employee Profile")}
              onUpdateStaff={wrapSecure(handleUpdateStaff, "Update Employee Profile")}
              onDeleteStaff={wrapSecure(handleDeleteStaff, "Terminate/Remove Staff Profile")}
              onSaveAttendance={wrapSecure(handleSaveAttendance, "Save Daily Staff Attendance Logs")}
            />
          )}

          {activeTab === "admin" && (
            <AdminPanel
              stores={stores}
              requirements={requirements}
              dbConfig={dbConfig}
              onAddStore={wrapSecure(handleAddStore, "Establish New Retail Outlet/Store Branch")}
              onUpdateStore={wrapSecure(handleUpdateStore, "Modify Retail Store Details")}
              onDeleteStore={wrapSecure(handleDeleteStore, "Decommission/Delete Store Branch")}
              onUpdateRequirementStatus={wrapSecure(handleUpdateRequirementStatus, "Update Crop Requirement Status")}
              onDeleteRequirement={wrapSecure(handleDeleteRequirement, "Delete Crop Requirement Record")}
              onSaveDbConfig={wrapSecure(handleSaveDbConfig, "Update Global Supabase Database Config")}
              cpanelSettings={cpanelSettings}
              onUpdateCpanelSettings={wrapSecure(handleUpdateCpanelSettings, "Modify Global System Settings")}
              onResetToDemoData={wrapSecure(handleResetToDemo, "Completely Reset Database to Clean Demo Data")}
              masterCrops={masterCrops}
              inventory={inventory}
              sales={sales}
              purchaseOrders={purchaseOrders}
              staff={staff}
              onUpdateMasterCrop={wrapSecure(handleUpdateMasterCrop, "Modify Master Crop Profile")}
              onUpdateInventoryItem={wrapSecure(handleUpdateInventoryItem, "Update Store Inventory Stock Level")}
              officials={officials}
              onAddOfficial={wrapSecure(handleAddOfficial, "Register Official/Observer Profile")}
              onUpdateOfficial={wrapSecure(handleUpdateOfficial, "Update Official Profile")}
              onDeleteOfficial={wrapSecure(handleDeleteOfficial, "Remove Official/Observer")}
              appVersion={appVersion}
            />
          )}

          {activeTab === "transport" && (
            <div className="p-4 md:p-6">
              <TransportModule />
            </div>
          )}
        </div>
      </main>

      {/* Floating Undo Toast Notifications Overlay */}
      <div
        id="undo-toast-container"
        className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
      >
        {activeToasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white px-4 py-3.5 rounded-xl shadow-xl border border-slate-700/80 flex flex-col gap-2 animate-slide-in-right relative overflow-hidden transition-all duration-300"
          >
            {/* Animated progress bar indicator */}
            <div
              className="absolute bottom-0 left-0 h-1 bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(toast.secondsLeft / 6) * 100}%` }}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-amber-500/15 text-amber-400 rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-100 leading-snug">
                    Deleted {toast.label}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Permanent removal in {toast.secondsLeft}s
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    toast.onUndo();
                    setActiveToasts((prev) =>
                      prev.filter((t) => t.id !== toast.id),
                    );
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all duration-150 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3 stroke-[3]" />
                  <span>Undo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toast.onConfirm();
                    setActiveToasts((prev) =>
                      prev.filter((t) => t.id !== toast.id),
                    );
                  }}
                  className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg transition cursor-pointer"
                  title="Permanently Delete Now"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Real-time Low Stock Alert Toasts overlay at the top-right */}
      <div
        id="stock-toast-container"
        className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full px-4 sm:px-0 pointer-events-none"
      >
        {stockToasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white/95 backdrop-blur-md text-slate-800 p-4 rounded-2xl shadow-xl border-l-4 border-l-rose-500 border-y border-r border-slate-200/80 flex flex-col gap-3 animate-slide-in-right relative overflow-hidden transition-all duration-300 shadow-rose-950/5"
          >
            {/* Animated progress bar indicator at the bottom */}
            <div
              className="absolute bottom-0 left-0 h-1 bg-rose-500 transition-all duration-1000 ease-linear"
              style={{ width: `${((toast.secondsLeft ?? 15) / 15) * 100}%` }}
            />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-rose-50 text-rose-500 rounded-xl mt-0.5 shrink-0">
                  <AlertTriangle className="h-4 w-4 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-rose-600 leading-none uppercase tracking-wider">
                      Low Stock Alert
                    </p>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                      Just Now
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-slate-900 leading-snug">
                    {toast.vegetableName}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Branch: <span className="font-extrabold text-slate-800">{toast.storeName}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Current stock level is only <span className="font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">{toast.quantity} kg</span>, falling below the safety limit of <span className="font-extrabold text-slate-700">{toast.minStockThreshold} kg</span>.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDismissStockToast(toast.id)}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleDismissStockToast(toast.id)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("headoffice");
                  setHoSubTab("inventory");
                  handleDismissStockToast(toast.id);
                  // Auto reset transit state
                  setTimeout(() => setHoSubTab(undefined), 100);
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shadow-sm shadow-rose-600/20 cursor-pointer"
              >
                <span>Inventory Control</span>
                <ArrowRight className="h-3 w-3 stroke-[3]" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Central Security PIN Authorization Overlay Modal */}
      {secureActionPending && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-left space-y-6">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-950/50 border border-red-500/20 text-red-400 rounded-2xl shrink-0">
                <ShieldAlert className="h-6 w-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-white tracking-tight font-sans">Security Authorization</h3>
                <p className="text-[11.5px] text-slate-400 leading-normal">
                  A sensitive data modification is requested:
                </p>
                <div className="bg-slate-950/80 border border-slate-800/60 rounded-xl px-3 py-2 mt-1">
                  <p className="text-xs font-mono font-bold text-red-400">
                    {secureActionPending.description}
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifySecurePin} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Enter Security PIN
                </label>
                <input
                  type="password"
                  required
                  maxLength={10}
                  value={securePinInput}
                  onChange={(e) => {
                    setSecurePinInput(e.target.value.replace(/[^\d]/g, ''));
                    setSecurePinError('');
                  }}
                  placeholder="••••"
                  autoFocus
                  className="w-full text-center tracking-[0.5em] font-mono text-xl py-3 px-4 bg-slate-950 border border-slate-800 focus:border-red-500 rounded-2xl text-white outline-none transition-all placeholder-slate-800"
                />
                
                {securePinError ? (
                  <p className="text-[11px] text-red-400 font-semibold">
                    ⚠ {securePinError}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Please provide the corporate/CPanel authorization PIN.
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSecureActionPending(null);
                    setSecurePinInput('');
                    setSecurePinError('');
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer text-center shadow-lg shadow-red-950/40"
                >
                  Authorize Lock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
