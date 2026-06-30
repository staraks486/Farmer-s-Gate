import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import StoreManager from './components/StoreManager';
import AdminPanel from './components/AdminPanel';
import SupplierManager from './components/SupplierManager';
import CustomerHub from './components/CustomerHub';
import HeadOffice from './components/HeadOffice';
import AccountsManager from './components/AccountsManager';
import { Store, Sale, Purchase, InventoryItem, Requirement, SupabaseConfig, Supplier, PurchaseOrder, CustomerOrder, UserRole, MasterCrop, AppNotification, CpanelSettings, TerminalActivityLog, StorefrontAd } from './types';
import { 
  dbGetStores, 
  dbAddStore, 
  dbUpdateStore, 
  dbDeleteStore, 
  dbGetSales, 
  dbAddSale, 
  dbDeleteSale, 
  dbGetPurchases, 
  dbAddPurchase, 
  dbDeletePurchase, 
  dbGetInventory, 
  dbAddOrUpdateInventoryItem, 
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
  initSupabase
} from './lib/supabase';
import { Sparkles, HelpCircle, Store as StoreIcon, RefreshCw, Layers, Shield, User, Users, ShoppingCart, Truck, Bell, BellRing, Settings2, CheckCheck, X, Link, Check } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeView, setActiveView] = useState<'dashboard' | 'store' | 'admin' | 'suppliers' | 'customer-hub' | 'headoffice' | 'accounts'>('accounts');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // User Role State (Simulator)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Admin');

  // Session Access State
  const [sessionAccessKey, setSessionAccessKey] = useState<string | null>(() => {
    return localStorage.getItem('fg_session_access_key');
  });

  // --- SECURE TERMINAL AUDIT STATES ---
  const [terminalLogs, setTerminalLogs] = useState<TerminalActivityLog[]>(() => {
    const stored = localStorage.getItem('fg_terminal_activity_logs');
    return stored ? JSON.parse(stored) : [];
  });
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Entities State
  const [stores, setStores] = useState<Store[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  
  // B2B Supplier / Customer entities
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [masterCrops, setMasterCrops] = useState<MasterCrop[]>([]);

  const [dbConfig, setDbConfig] = useState<SupabaseConfig>(getSupabaseConfig());
  const [loading, setLoading] = useState(true);
  const [unlockedStoreIds, setUnlockedStoreIds] = useState<string[]>([]);

  // --- STOREFRONT ADVERTISEMENTS ---
  const [storefrontAds, setStorefrontAds] = useState<StorefrontAd[]>(() => {
    const stored = localStorage.getItem('fg_storefront_ads');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Error parsing ads", e);
      }
    }
    return [
      {
        id: 'ad-1',
        title: 'Monsoon Crop Carnival 🥬',
        subtitle: 'Flat 20% OFF on all organic leafy vegetables harvested this morning. Direct from local smallholder farms.',
        discountBadge: '20% OFF',
        isActive: true,
        tagline: 'Fresh Leafy Veggies',
        actionText: 'Grab Deal'
      },
      {
        id: 'ad-2',
        title: 'Daily Potato & Onion Combo 🥔🧅',
        subtitle: 'Get a 5kg kitchen staples pack of fresh red onions and premium potatoes for just ₹149 only.',
        discountBadge: 'Super Saver ₹149',
        isActive: true,
        tagline: 'Kitchen Staples Combo',
        actionText: 'Add to Cart'
      },
      {
        id: 'ad-3',
        title: '10-Minute Lightning Delivery ⚡',
        subtitle: 'Fresh farm harvest dispatched within 10 minutes of your order placement. Zero compromise on freshness!',
        discountBadge: '10 MINS DELIVERY',
        isActive: true,
        tagline: 'Instant Fresh Delivery',
        actionText: 'Browse Store'
      }
    ];
  });

  const handleUpdateStorefrontAds = (updatedAds: StorefrontAd[]) => {
    setStorefrontAds(updatedAds);
    localStorage.setItem('fg_storefront_ads', JSON.stringify(updatedAds));
  };

  // --- CPANEL & SYSTEM PREFERENCES ---
  const [cpanelSettings, setCpanelSettings] = useState<CpanelSettings>({
    currencySymbol: '₹',
    defaultTaxRate: 5,
    allowNegativeStockCheckout: true,
    autoReorderThresholdPercent: 15,
    alertSoundEnabled: true,
    whatsappMessageTemplate: 'Hello {customer}, your billing summary for {amount} from {store} is confirmed!',
    enableCustomerOrderReview: true,
    enableMultipleRegisters: true,
    quickDemoDataEnabled: true
  });

  // --- NOTIFICATION ENGINE STATES ---
  const [notifyPreferences, setNotifyPreferences] = useState({
    lowStock: true,
    newRequirements: true,
    customerOrders: true,
    sales: true,
    purchaseOrders: true
  });

  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationsSubTab, setNotificationsSubTab] = useState<'all' | 'settings'>('all');

  // --- SECURE TERMINAL LOGGING ENGINE ---
  const logTerminalActivity = (action: 'login' | 'logout', key: string) => {
    let terminalName = 'Unknown Terminal';
    let role = 'Employee';
    if (key === 'admin') {
      terminalName = 'Full Admin Suite';
      role = 'Admin';
    } else if (key === 'accounts') {
      terminalName = 'Accounts & Finances';
      role = 'Store Manager';
    } else if (key === 'headoffice') {
      terminalName = 'Head Office HQ';
      role = 'Store Manager';
    } else if (key === 'suppliers') {
      terminalName = 'Suppliers & POs';
      role = 'Store Manager';
    } else if (key === 'customer-hub') {
      terminalName = 'Customer Storefront';
      role = 'Employee';
    } else if (key.startsWith('store-')) {
      const matchedStore = stores.find(s => s.id === key);
      terminalName = matchedStore ? `${matchedStore.name.replace("Farmer's Gate - ", "")} Outlet` : `${key} Outlet`;
      role = 'Store Manager';
    }

    const newLog: TerminalActivityLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      action,
      terminalId: key,
      terminalName,
      role
    };

    setTerminalLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('fg_terminal_activity_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleTerminalLogin = (input: string) => {
    setLoginError(null);
    const key = input.trim().toLowerCase();
    if (!key) return;

    // Check if matches admin
    if (key === 'admin') {
      setSessionAccessKey('admin');
      localStorage.setItem('fg_session_access_key', 'admin');
      setCurrentUserRole('Admin');
      setActiveView('dashboard');
      logTerminalActivity('login', 'admin');
      window.location.hash = '#/dashboard';
      return;
    }

    // Check if matches active modules
    const directModules = ['accounts', 'headoffice', 'suppliers', 'customer-hub'];
    if (directModules.includes(key)) {
      setSessionAccessKey(key);
      localStorage.setItem('fg_session_access_key', key);
      setCurrentUserRole(key === 'customer-hub' ? 'Employee' : 'Store Manager');
      setActiveView(key as any);
      logTerminalActivity('login', key);
      window.location.hash = `#/${key}`;
      return;
    }

    // Check if matches store ID or slug
    const matchedStore = stores.find(s => s.id.toLowerCase() === key || s.name.toLowerCase().includes(key));
    if (matchedStore) {
      setSessionAccessKey(matchedStore.id);
      localStorage.setItem('fg_session_access_key', matchedStore.id);
      setCurrentUserRole('Store Manager');
      setSelectedStore(matchedStore);
      setActiveView('store');
      logTerminalActivity('login', matchedStore.id);
      window.location.hash = `#/store?storeId=${matchedStore.id}`;
      return;
    }

    setLoginError(`Access Key "${input}" is not recognized as an authorized terminal ID.`);
  };

  // Sync session key to roles and views on mount/change
  useEffect(() => {
    if (!sessionAccessKey) return;

    if (sessionAccessKey === 'admin') {
      setCurrentUserRole('Admin');
    } else if (sessionAccessKey.startsWith('store-')) {
      setCurrentUserRole('Store Manager');
      setActiveView('store');
      if (stores.length > 0) {
        const found = stores.find(s => s.id === sessionAccessKey);
        if (found) {
          setSelectedStore(found);
        }
      }
    } else {
      // direct module keys: accounts, headoffice, suppliers, customer-hub
      setCurrentUserRole(sessionAccessKey === 'customer-hub' ? 'Employee' : 'Store Manager');
      setActiveView(sessionAccessKey as any);
    }
  }, [sessionAccessKey, stores]);

  // Load configuration and sync states on mount
  useEffect(() => {
    // 1. Notifications Configuration
    const savedPrefs = localStorage.getItem('fg_notification_prefs');
    if (savedPrefs) {
      try {
        setNotifyPreferences(JSON.parse(savedPrefs));
      } catch (e) {
        console.error(e);
      }
    }
    const savedDismissed = localStorage.getItem('fg_dismissed_notifications');
    if (savedDismissed) {
      try {
        setDismissedNotificationIds(JSON.parse(savedDismissed));
      } catch (e) {
        console.error(e);
      }
    }
    const savedRead = localStorage.getItem('fg_read_notifications');
    if (savedRead) {
      try {
        setReadNotificationIds(JSON.parse(savedRead));
      } catch (e) {
        console.error(e);
      }
    }

    // 2. CPanel Settings
    const savedCpanel = localStorage.getItem('fg_cpanel_settings');
    if (savedCpanel) {
      try {
        setCpanelSettings(JSON.parse(savedCpanel));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Hash-routing synchronization (Separate link for each module)
  useEffect(() => {
    const syncHashWithState = () => {
      // Direct session bypass for single-module locked mode
      if (sessionAccessKey && sessionAccessKey !== 'admin') {
        if (sessionAccessKey.startsWith('store-')) {
          setActiveView('store');
          const matchedStore = stores.find(s => s.id === sessionAccessKey);
          if (matchedStore) {
            setSelectedStore(matchedStore);
          }
          const expectedHash = `#/store?storeId=${sessionAccessKey}`;
          if (window.location.hash !== expectedHash) {
            window.location.hash = expectedHash;
          }
        } else {
          setActiveView(sessionAccessKey as any);
          const expectedHash = `#/${sessionAccessKey}`;
          if (window.location.hash !== expectedHash) {
            window.location.hash = expectedHash;
          }
        }
        return;
      }

      const fullHash = window.location.hash.slice(1); // remove '#'
      const [path, queryString] = fullHash.split('?');
      const cleanPath = path.replace(/^\//, '');

      const params = new URLSearchParams(queryString || '');
      const storeIdParam = params.get('storeId');

      const validViews = ['dashboard', 'store', 'admin', 'suppliers', 'customer-hub', 'headoffice', 'accounts'];
      if (validViews.includes(cleanPath)) {
        setActiveView(cleanPath as any);
        if (cleanPath === 'store' && storeIdParam && stores.length > 0) {
          const matchedStore = stores.find(s => s.id === storeIdParam);
          if (matchedStore) {
            setSelectedStore(matchedStore);
          }
        }
      } else {
        // default to current view if empty
        if (!window.location.hash) {
          window.location.hash = '#/accounts';
          setActiveView('accounts');
        }
      }
    };

    if (stores.length > 0) {
      syncHashWithState();
    } else {
      // Run once even without stores for default routing
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      const validViews = ['dashboard', 'store', 'admin', 'suppliers', 'customer-hub', 'headoffice', 'accounts'];
      if (validViews.includes(hash)) {
        setActiveView(hash as any);
      }
    }

    window.addEventListener('hashchange', syncHashWithState);
    return () => window.removeEventListener('hashchange', syncHashWithState);
  }, [stores, sessionAccessKey]);

  const navigateTo = (view: typeof activeView, storeId?: string) => {
    let hashStr = `#/${view}`;
    if (view === 'store' && storeId) {
      hashStr += `?storeId=${storeId}`;
    }
    window.location.hash = hashStr;
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const copyDirectLink = () => {
    let hashStr = `#/${activeView}`;
    if (activeView === 'store' && selectedStore) {
      hashStr += `?storeId=${selectedStore.id}`;
    }
    const fullUrl = `${window.location.origin}${window.location.pathname}${hashStr}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    
    // Play subtle visual/sound feedback
    if (cpanelSettings.alertSoundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // high chime
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (e) {}
    }
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleUpdateCpanelSettings = (newSettings: CpanelSettings) => {
    setCpanelSettings(newSettings);
    localStorage.setItem('fg_cpanel_settings', JSON.stringify(newSettings));
  };

  // High-fidelity Realistic Demo Data Generator
  const handleResetToDemoData = () => {
    const demoStores: Store[] = [
      { id: 'store-1', name: "Farmer's Gate - Downtown Plaza", location: 'Block C, Sector 12, Main Market', whatsappNumber: '919876543210', isActive: true, createdAt: new Date().toISOString() },
      { id: 'store-2', name: "Farmer's Gate - Suburb Green", location: 'Phase 2, Near Botanical Park', whatsappNumber: '919876543211', isActive: true, createdAt: new Date().toISOString(), password: '123' },
      { id: 'store-3', name: "Farmer's Gate - Farm Fresh Junction", location: 'GT Road Bypass, North Highway', whatsappNumber: '919876543212', isActive: true, createdAt: new Date().toISOString() }
    ];

    const demoMasterCrops: MasterCrop[] = [
      { id: 'crop-1', vegetableName: 'Potato (Alloo)', costPrice: 18, sellingPrice: 28, category: 'Vegetable', minStockThreshold: 100 },
      { id: 'crop-2', vegetableName: 'Tomato (Tamatar)', costPrice: 25, sellingPrice: 42, category: 'Vegetable', minStockThreshold: 80 },
      { id: 'crop-3', vegetableName: 'Onion (Pyaz)', costPrice: 22, sellingPrice: 35, category: 'Vegetable', minStockThreshold: 120 },
      { id: 'crop-4', vegetableName: 'Fresh Cauliflower', costPrice: 30, sellingPrice: 55, category: 'Vegetable', minStockThreshold: 40 },
      { id: 'crop-5', vegetableName: 'Alphonso Mangoes', costPrice: 120, sellingPrice: 220, category: 'Fruit', minStockThreshold: 50 },
      { id: 'crop-6', vegetableName: 'Shimla Apples', costPrice: 85, sellingPrice: 140, category: 'Fruit', minStockThreshold: 60 },
      { id: 'crop-7', vegetableName: 'Green Coriander Bunch', costPrice: 4, sellingPrice: 10, category: 'Herbs', minStockThreshold: 30 },
      { id: 'crop-8', vegetableName: 'Refined Sunflower Oil 1L', costPrice: 95, sellingPrice: 125, category: 'Grocery', minStockThreshold: 100 },
      { id: 'crop-9', vegetableName: 'Basmati Rice 5kg', costPrice: 340, sellingPrice: 499, category: 'Grocery', minStockThreshold: 20 }
    ];

    const demoInventory: InventoryItem[] = [];
    demoStores.forEach(s => {
      demoMasterCrops.forEach((c, idx) => {
        const qty = idx % 2 === 0 ? Math.floor(Math.random() * 200) + 40 : Math.floor(Math.random() * 25);
        demoInventory.push({
          id: `inv-${s.id}-${c.id}`,
          storeId: s.id,
          vegetableName: c.vegetableName,
          quantity: qty,
          minStockThreshold: c.minStockThreshold,
          costPrice: c.costPrice,
          sellingPrice: c.sellingPrice,
          lastUpdated: new Date().toISOString()
        });
      });
    });

    const demoRequirements: Requirement[] = [
      { id: 'req-1', storeId: 'store-1', vegetableName: 'Tomato (Tamatar)', quantity: 150, status: 'Pending', priority: 'High', createdAt: new Date().toISOString() },
      { id: 'req-2', storeId: 'store-2', vegetableName: 'Alphonso Mangoes', quantity: 80, status: 'Ordered', priority: 'Medium', createdAt: new Date().toISOString() },
      { id: 'req-3', storeId: 'store-3', vegetableName: 'Green Coriander Bunch', quantity: 200, status: 'Pending', priority: 'High', createdAt: new Date().toISOString() }
    ];

    const demoSuppliers: Supplier[] = [
      { id: 'sup-1', name: 'Sohan Lal & Sons Agro', contactName: 'Sohan Lal', phone: '918882221111', email: 'sohan@lalagro.com', address: 'Azadpur Wholesale Mandi, Delhi', paymentTerms: 'Net 15', isActive: true, createdAt: new Date().toISOString() },
      { id: 'sup-2', name: 'Himachal Orchard Farms', contactName: 'Ramesh Sharma', phone: '919991112222', email: 'ramesh@himachalorchards.com', address: 'Shimla Valley, HP', paymentTerms: 'Cash on Delivery', isActive: true, createdAt: new Date().toISOString() },
      { id: 'sup-3', name: 'Radhe Shyam FMCG Traders', contactName: 'Girish Kumar', phone: '917773334444', email: 'girish@radheshyam.com', address: 'Khari Baoli, Old Delhi', paymentTerms: 'Net 30', isActive: true, createdAt: new Date().toISOString() }
    ];

    const demoPOs: PurchaseOrder[] = [
      { 
        id: 'po-1', 
        poNumber: 'PO-2026-001', 
        supplierId: 'sup-1', 
        supplierName: 'Sohan Lal & Sons Agro',
        storeId: 'store-1',
        orderDate: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(), 
        items: [{ vegetableName: 'Tomato (Tamatar)', quantity: 500, costPerKg: 20, totalCost: 10000 }], 
        status: 'Delivered', 
        paymentStatus: 'Paid',
        totalAmount: 10000, 
        paidAmount: 10000,
        createdAt: new Date().toISOString()
      },
      { 
        id: 'po-2', 
        poNumber: 'PO-2026-002', 
        supplierId: 'sup-2', 
        supplierName: 'Himachal Orchard Farms',
        storeId: 'store-2',
        orderDate: new Date().toISOString(), 
        items: [{ vegetableName: 'Shimla Apples', quantity: 300, costPerKg: 80, totalCost: 24000 }], 
        status: 'Sent', 
        paymentStatus: 'Unpaid',
        totalAmount: 24000, 
        paidAmount: 0,
        createdAt: new Date().toISOString()
      }
    ];

    const demoCustOrders: CustomerOrder[] = [
      { 
        id: 'co-1', 
        orderNumber: 'CO-7701', 
        customerName: 'Amit Saxena', 
        customerPhone: '919812345678', 
        storeId: 'store-1', 
        customerAddress: 'C-42, Sector 5, Dwarka',
        items: [
          { vegetableName: 'Potato (Alloo)', quantity: 5, pricePerKg: 28, totalPrice: 140 }, 
          { vegetableName: 'Onion (Pyaz)', quantity: 3, pricePerKg: 35, totalPrice: 105 }
        ], 
        totalAmount: 245, 
        orderDate: new Date().toISOString(), 
        status: 'Pending',
        paymentStatus: 'Unpaid'
      },
      { 
        id: 'co-2', 
        orderNumber: 'CO-7702', 
        customerName: 'Preeti Sharma', 
        customerPhone: '919898765432', 
        storeId: 'store-2', 
        customerAddress: 'Apt 402, Lotus Residency',
        items: [
          { vegetableName: 'Basmati Rice 5kg', quantity: 1, pricePerKg: 499, totalPrice: 499 }
        ], 
        totalAmount: 499, 
        orderDate: new Date().toISOString(), 
        status: 'Processing',
        paymentStatus: 'Paid'
      }
    ];

    const demoSales: Sale[] = [];
    const dateOf = (daysAgo: number) => new Date(Date.now() - daysAgo * 24 * 3600 * 1000).toISOString();
    demoStores.forEach(s => {
      for(let d = 0; d < 5; d++) {
        demoSales.push({
          id: `sale-${s.id}-${d}-1`,
          storeId: s.id,
          vegetableName: 'Potato (Alloo)',
          quantity: Math.floor(Math.random() * 30) + 10,
          pricePerKg: 28,
          totalPrice: (Math.floor(Math.random() * 30) + 10) * 28,
          customerName: 'Cash Customer',
          saleDate: dateOf(d)
        });
        demoSales.push({
          id: `sale-${s.id}-${d}-2`,
          storeId: s.id,
          vegetableName: 'Tomato (Tamatar)',
          quantity: Math.floor(Math.random() * 15) + 5,
          pricePerKg: 42,
          totalPrice: (Math.floor(Math.random() * 15) + 5) * 42,
          customerName: 'Regular Customer',
          saleDate: dateOf(d)
        });
      }
    });

    const demoPurchases: Purchase[] = [
      { id: 'pur-1', storeId: 'store-1', vegetableName: 'Potato (Alloo)', quantity: 500, costPerKg: 18, totalCost: 9000, supplierName: 'Sohan Lal Mandi', purchaseDate: dateOf(3) },
      { id: 'pur-2', storeId: 'store-2', vegetableName: 'Tomato (Tamatar)', quantity: 300, costPerKg: 25, totalCost: 7500, supplierName: 'Sohan Lal Mandi', purchaseDate: dateOf(2) }
    ];

    // Update state and localStorage
    setStores(demoStores);
    setMasterCrops(demoMasterCrops);
    setInventory(demoInventory);
    setRequirements(demoRequirements);
    setSuppliers(demoSuppliers);
    setPurchaseOrders(demoPOs);
    setCustomerOrders(demoCustOrders);
    setSales(demoSales);
    setPurchases(demoPurchases);

    localStorage.setItem('fg_stores', JSON.stringify(demoStores));
    localStorage.setItem('fg_master_crops', JSON.stringify(demoMasterCrops));
    localStorage.setItem('fg_inventory', JSON.stringify(demoInventory));
    localStorage.setItem('fg_requirements', JSON.stringify(demoRequirements));
    localStorage.setItem('fg_suppliers', JSON.stringify(demoSuppliers));
    localStorage.setItem('fg_purchase_orders', JSON.stringify(demoPOs));
    localStorage.setItem('fg_customer_orders', JSON.stringify(demoCustOrders));
    localStorage.setItem('fg_sales', JSON.stringify(demoSales));
    localStorage.setItem('fg_purchases', JSON.stringify(demoPurchases));

    setSelectedStore(demoStores[0]);
    alert("🚀 Complete High-Fidelity Demo Data Loaded Successfully! All modules are now filled with high-quality datasets.");
  };

  const savePreferences = (newPrefs: typeof notifyPreferences) => {
    setNotifyPreferences(newPrefs);
    localStorage.setItem('fg_notification_prefs', JSON.stringify(newPrefs));
  };

  const handleDismissNotification = (id: string) => {
    const nextDismissed = [...dismissedNotificationIds, id];
    setDismissedNotificationIds(nextDismissed);
    localStorage.setItem('fg_dismissed_notifications', JSON.stringify(nextDismissed));
  };

  const handleMarkReadNotification = (id: string) => {
    if (!readNotificationIds.includes(id)) {
      const nextRead = [...readNotificationIds, id];
      setReadNotificationIds(nextRead);
      localStorage.setItem('fg_read_notifications', JSON.stringify(nextRead));
    }
  };

  const handleMarkAllAsRead = (notificationsList: AppNotification[]) => {
    const unreadIds = notificationsList.map(n => n.id).filter(id => !readNotificationIds.includes(id));
    const nextRead = [...readNotificationIds, ...unreadIds];
    setReadNotificationIds(nextRead);
    localStorage.setItem('fg_read_notifications', JSON.stringify(nextRead));
  };

  const handleClearAllNotifications = (notificationsList: AppNotification[]) => {
    const nextDismissed = [...dismissedNotificationIds, ...notificationsList.map(n => n.id)];
    setDismissedNotificationIds(nextDismissed);
    localStorage.setItem('fg_dismissed_notifications', JSON.stringify(nextDismissed));
  };

  // Dynamic notifications generator based on real DB values and Preferences
  const getAppNotifications = (): AppNotification[] => {
    const list: AppNotification[] = [];

    // 1. Low Stock Alerts
    if (notifyPreferences.lowStock) {
      inventory.forEach(item => {
        if (item.quantity <= item.minStockThreshold) {
          const storeName = stores.find(s => s.id === item.storeId)?.name.replace("Farmer's Gate - ", "") || 'Branch';
          const severity = item.quantity === 0 ? 'error' : 'warning';
          list.push({
            id: `lowstock-${item.id}`,
            type: 'low_stock',
            title: item.quantity === 0 ? `🚫 Out of Stock: ${item.vegetableName}` : `⚠️ Low Stock Alert: ${item.vegetableName}`,
            message: `${item.vegetableName} is at ${item.quantity} kg (Min Safety: ${item.minStockThreshold} kg) in ${storeName}.`,
            timestamp: item.lastUpdated || new Date().toISOString(),
            severity,
            linkToView: 'store',
            meta: { storeId: item.storeId }
          });
        }
      });
    }

    // 2. New Requirements (Restock Requests)
    if (notifyPreferences.newRequirements) {
      requirements.forEach(req => {
        if (req.status === 'Pending') {
          const storeName = stores.find(s => s.id === req.storeId)?.name.replace("Farmer's Gate - ", "") || 'Branch';
          list.push({
            id: `req-${req.id}`,
            type: 'requirement',
            title: `📋 Branch Request: ${req.vegetableName}`,
            message: `${storeName} requested ${req.quantity} kg of ${req.vegetableName} with ${req.priority} priority.`,
            timestamp: req.createdAt || new Date().toISOString(),
            severity: req.priority === 'High' ? 'warning' : 'info',
            linkToView: 'headoffice'
          });
        }
      });
    }

    // 3. Customer Orders (B2C storefront)
    if (notifyPreferences.customerOrders) {
      customerOrders.forEach(order => {
        if (order.status === 'Pending' || order.status === 'Processing') {
          const storeName = stores.find(s => s.id === order.storeId)?.name.replace("Farmer's Gate - ", "") || 'Branch';
          list.push({
            id: `custord-${order.id}`,
            type: 'customer_order',
            title: `🛒 New Customer Order #${order.orderNumber}`,
            message: `${order.customerName} ordered ${order.items.length} crops for ₹${order.totalAmount.toFixed(2)} at ${storeName}.`,
            timestamp: order.orderDate || new Date().toISOString(),
            severity: 'success',
            linkToView: 'store',
            meta: { storeId: order.storeId }
          });
        }
      });
    }

    // 4. Sales
    if (notifyPreferences.sales) {
      const sortedSales = [...sales].sort((a,b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
      sortedSales.slice(0, 5).forEach(sale => {
        const storeName = stores.find(s => s.id === sale.storeId)?.name.replace("Farmer's Gate - ", "") || 'Branch';
        list.push({
          id: `sale-${sale.id}`,
          type: 'sale',
          title: `💰 Crop Sale: ₹${sale.totalPrice.toFixed(2)}`,
          message: `Cleared ${sale.quantity} kg of ${sale.vegetableName} at ${storeName}.`,
          timestamp: sale.saleDate,
          severity: 'info',
          linkToView: 'dashboard'
        });
      });
    }

    // 5. Purchase Orders
    if (notifyPreferences.purchaseOrders) {
      const sortedPOs = [...purchaseOrders].sort((a,b) => new Date(b.createdAt || b.orderDate).getTime() - new Date(a.createdAt || a.orderDate).getTime());
      sortedPOs.slice(0, 5).forEach(po => {
        list.push({
          id: `po-${po.id}`,
          type: 'purchase_order',
          title: `🚚 PO #${po.poNumber} (${po.status})`,
          message: `PO for ${po.supplierName} total value ₹${po.totalAmount.toFixed(2)} is marked as ${po.status}.`,
          timestamp: po.createdAt || po.orderDate,
          severity: po.status === 'Sent' ? 'success' : 'info',
          linkToView: 'suppliers'
        });
      });
    }

    // Sort all by timestamp (newest first)
    return list
      .filter(n => !dismissedNotificationIds.includes(n.id))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const currentNotifications = getAppNotifications();
  const unreadCount = currentNotifications.filter(n => !readNotificationIds.includes(n.id)).length;

  // Load all data on mount or database configuration change
  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedStores = await dbGetStores();
      setStores(fetchedStores);

      // Default selected store to the first active one
      const activeStores = fetchedStores.filter(s => s.isActive);
      if (activeStores.length > 0 && !selectedStore) {
        setSelectedStore(activeStores[0]);
      }

      const fetchedSales = await dbGetSales();
      setSales(fetchedSales);

      const fetchedPurchases = await dbGetPurchases();
      setPurchases(fetchedPurchases);

      const fetchedInventory = await dbGetInventory();
      setInventory(fetchedInventory);

      const fetchedRequirements = await dbGetRequirements();
      setRequirements(fetchedRequirements);

      const fetchedSuppliers = await dbGetSuppliers();
      setSuppliers(fetchedSuppliers);

      const fetchedPOs = await dbGetPurchaseOrders();
      setPurchaseOrders(fetchedPOs);

      const fetchedCOs = await dbGetCustomerOrders();
      setCustomerOrders(fetchedCOs);

      const fetchedMasterCrops = await dbGetMasterCrops();
      setMasterCrops(fetchedMasterCrops);
    } catch (e) {
      console.error('Error loading database tables:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dbConfig.isConnected]);

  // --- BUSINESS HANDLERS ---

  // Stores
  const handleAddStore = async (newStore: Store) => {
    const saved = await dbAddStore(newStore);
    setStores(prev => [...prev, saved]);
    if (!selectedStore && saved.isActive) {
      setSelectedStore(saved);
    }
  };

  const handleUpdateStore = async (updatedStore: Store) => {
    const saved = await dbUpdateStore(updatedStore);
    setStores(prev => prev.map(s => s.id === saved.id ? saved : s));
    if (selectedStore?.id === saved.id) {
      setSelectedStore(saved);
    }
  };

  const handleDeleteStore = async (id: string) => {
    await dbDeleteStore(id);
    setStores(prev => prev.filter(s => s.id !== id));
    if (selectedStore?.id === id) {
      setSelectedStore(null);
    }
  };

  // Sales (Automatically modifies Inventory)
  const handleAddSale = async (newSale: Sale) => {
    const saved = await dbAddSale(newSale);
    setSales(prev => [saved, ...prev]);
    // Refresh inventory state because DB handler adjusted inventory stock
    const refreshedInv = await dbGetInventory();
    setInventory(refreshedInv);
  };

  const handleDeleteSale = async (id: string) => {
    await dbDeleteSale(id);
    setSales(prev => prev.filter(s => s.id !== id));
    const refreshedInv = await dbGetInventory();
    setInventory(refreshedInv);
  };

  // Purchases (Automatically modifies Inventory)
  const handleAddPurchase = async (newPurchase: Purchase) => {
    const saved = await dbAddPurchase(newPurchase);
    setPurchases(prev => [saved, ...prev]);
    const refreshedInv = await dbGetInventory();
    setInventory(refreshedInv);
  };

  const handleDeletePurchase = async (id: string) => {
    await dbDeletePurchase(id);
    setPurchases(prev => prev.filter(p => p.id !== id));
    const refreshedInv = await dbGetInventory();
    setInventory(refreshedInv);
  };

  // Inventory Custom Updates / Quick Adjusts
  const handleUpdateInventoryItem = async (item: InventoryItem) => {
    const saved = await dbAddOrUpdateInventoryItem(item);
    setInventory(prev => {
      const idx = prev.findIndex(i => i.id === saved.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
  };

  // Requirements / Procurement
  const handleAddRequirement = async (newReq: Requirement) => {
    const saved = await dbAddRequirement(newReq);
    setRequirements(prev => [saved, ...prev]);
  };

  const handleUpdateRequirementStatus = async (id: string, status: 'Pending' | 'Ordered' | 'Fulfilled') => {
    const req = requirements.find(r => r.id === id);
    if (req) {
      const updated = { ...req, status };
      const saved = await dbUpdateRequirement(updated);
      setRequirements(prev => prev.map(r => r.id === id ? saved : r));
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    await dbDeleteRequirement(id);
    setRequirements(prev => prev.filter(r => r.id !== id));
  };

  // Master Crops
  const handleUpdateMasterCrop = async (crop: MasterCrop) => {
    const saved = await dbAddOrUpdateMasterCrop(crop);
    setMasterCrops(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [...prev, saved];
    });
  };

  const handleDeleteMasterCrop = async (id: string) => {
    await dbDeleteMasterCrop(id);
    setMasterCrops(prev => prev.filter(c => c.id !== id));
  };

  // Supabase Config update
  const handleSaveDbConfig = async (url: string, key: string) => {
    const result = await saveSupabaseConfig(url, key);
    const updatedConfig = getSupabaseConfig();
    setDbConfig(updatedConfig);
    return result;
  };

  // --- NEW HANDLERS FOR SUPPLIERS, POs, AND CUSTOMER ORDERS ---
  const handleAddSupplier = async (newSup: Supplier) => {
    const saved = await dbAddSupplier(newSup);
    setSuppliers(prev => [...prev, saved]);
  };

  const handleUpdateSupplier = async (updatedSup: Supplier) => {
    const saved = await dbUpdateSupplier(updatedSup);
    setSuppliers(prev => prev.map(s => s.id === saved.id ? saved : s));
  };

  const handleDeleteSupplier = async (id: string) => {
    await dbDeleteSupplier(id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  const handleAddPurchaseOrder = async (newPO: PurchaseOrder) => {
    const saved = await dbAddPurchaseOrder(newPO);
    setPurchaseOrders(prev => [saved, ...prev]);
  };

  const handleUpdatePurchaseOrder = async (updatedPO: PurchaseOrder) => {
    const saved = await dbUpdatePurchaseOrder(updatedPO);
    setPurchaseOrders(prev => prev.map(p => p.id === saved.id ? saved : p));
  };

  const handleDeletePurchaseOrder = async (id: string) => {
    await dbDeletePurchaseOrder(id);
    setPurchaseOrders(prev => prev.filter(p => p.id !== id));
  };

  const handleReceivePOInventory = async (po: PurchaseOrder) => {
    // 1. Save the updated status of the PO to delivered
    const savedPO = await dbUpdatePurchaseOrder(po);
    setPurchaseOrders(prev => prev.map(p => p.id === savedPO.id ? savedPO : p));

    // 2. Add individual purchases for each item
    for (const item of po.items) {
      await dbAddPurchase({
        id: `pur-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        storeId: po.storeId,
        vegetableName: item.vegetableName,
        quantity: item.quantity,
        costPerKg: item.costPerKg,
        totalCost: item.totalCost,
        supplierName: po.supplierName,
        purchaseDate: new Date().toISOString()
      });
    }

    // 3. Refresh purchases and inventory
    const refreshedPurchases = await dbGetPurchases();
    setPurchases(refreshedPurchases);
    const refreshedInv = await dbGetInventory();
    setInventory(refreshedInv);
  };

  const handleAddCustomerOrder = async (newCO: CustomerOrder) => {
    const saved = await dbAddCustomerOrder(newCO);
    setCustomerOrders(prev => [saved, ...prev]);
  };

  const handleUpdateCustomerOrder = async (updatedCO: CustomerOrder) => {
    const saved = await dbUpdateCustomerOrder(updatedCO);
    setCustomerOrders(prev => prev.map(c => c.id === saved.id ? saved : c));
  };

  const handleDeleteCustomerOrder = async (id: string) => {
    await dbDeleteCustomerOrder(id);
    setCustomerOrders(prev => prev.filter(c => c.id !== id));
  };

  // Customer order fulfillment
  const handleFulfillCustomerOrder = async (co: CustomerOrder) => {
    // 1. Mark order status as completed
    const completedCO: CustomerOrder = { ...co, status: 'Completed', paymentStatus: 'Paid' };
    const savedCO = await dbUpdateCustomerOrder(completedCO);
    setCustomerOrders(prev => prev.map(c => c.id === savedCO.id ? savedCO : c));

    // 2. Add individual sales for each item in the order
    for (const item of co.items) {
      await dbAddSale({
        id: `sal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        storeId: co.storeId,
        vegetableName: item.vegetableName,
        quantity: item.quantity,
        pricePerKg: item.pricePerKg,
        totalPrice: item.totalPrice,
        customerName: co.customerName,
        saleDate: new Date().toISOString()
      });
    }

    // 3. Refresh sales and inventory
    const refreshedSales = await dbGetSales();
    setSales(refreshedSales);
    const refreshedInv = await dbGetInventory();
    setInventory(refreshedInv);
  };

  const activeStores = stores.filter(s => s.isActive);
  const totalDailyRevenue = sales.reduce((acc, curr) => acc + curr.totalPrice, 0);

  if (loading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center space-y-4 bg-slate-950 text-white font-sans">
        <RefreshCw className="h-10 w-10 text-emerald-500 animate-spin" />
        <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">Initializing Secure Terminal...</p>
      </div>
    );
  }

  if (!sessionAccessKey) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 p-4 font-sans text-slate-100 antialiased overflow-y-auto">
        {/* Modern, high-end Gateway screen */}
        <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"></div>
          
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl mx-auto border border-emerald-500/20 shadow-inner">
              🌾
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Farmer's Gate Terminal Hub</h2>
            <p className="text-xs text-slate-400">Secure crop supply & distribution management portal 🇮🇳</p>
          </div>

          {loginError && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-400 text-center font-bold">
              ⚠️ {loginError}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem('accessId') as HTMLInputElement)?.value;
              handleTerminalLogin(input);
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Secure Access Key / ID</label>
              <input
                name="accessId"
                type="text"
                required
                placeholder="Enter admin, accounts, suppliers or store ID..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                autoFocus
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-950/40 cursor-pointer transition-all uppercase tracking-wider text-center"
            >
              Sign In to Terminal
            </button>
          </form>

          {/* Directory Panel */}
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-bold">Interactive Module Directory (Click to launch)</p>
              <span className="text-[9px] text-emerald-400 font-bold bg-emerald-950 border border-emerald-900/40 px-1.5 py-0.5 rounded animate-pulse">⚡ Quick Access</span>
            </div>
            <div className="text-[11px] space-y-1.5 bg-slate-950/60 p-3 rounded-2xl border border-slate-800/50 max-h-72 overflow-y-auto scrollbar-thin">
              {/* Admin Link */}
              <button
                type="button"
                onClick={() => handleTerminalLogin('admin')}
                className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-emerald-500/30 hover:bg-emerald-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-emerald-400 font-bold bg-emerald-950 px-1.5 py-0.5 rounded text-[10px]">admin</span>
                  <span className="text-slate-300 font-bold">Full Admin Dashboard</span>
                </div>
                <span className="text-[9px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">Launch Portal ➔</span>
              </button>

              <div className="h-px bg-slate-800/40 my-1"></div>

              {/* Stores Links */}
              {stores.filter(s => s.isActive).map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleTerminalLogin(s.id)}
                  className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-indigo-500/30 hover:bg-indigo-950/20 transition-all text-left group"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-indigo-400 font-bold bg-indigo-950 px-1.5 py-0.5 rounded text-[10px]">{s.id}</span>
                    <span className="text-slate-300 font-bold">{s.name.replace("Farmer's Gate - ", "")} Outlet</span>
                  </div>
                  <span className="text-[9px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">Launch POS ➔</span>
                </button>
              ))}

              <div className="h-px bg-slate-800/40 my-1"></div>

              {/* Accounts Link */}
              <button
                type="button"
                onClick={() => handleTerminalLogin('accounts')}
                className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-teal-500/30 hover:bg-teal-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-teal-400 font-bold bg-teal-950 px-1.5 py-0.5 rounded text-[10px]">accounts</span>
                  <span className="text-slate-300 font-bold">Accounts & Finances Ledger</span>
                </div>
                <span className="text-[9px] text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">Launch Portal ➔</span>
              </button>

              {/* HQ HeadOffice Link */}
              <button
                type="button"
                onClick={() => handleTerminalLogin('headoffice')}
                className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-teal-500/30 hover:bg-teal-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-teal-400 font-bold bg-teal-950 px-1.5 py-0.5 rounded text-[10px]">headoffice</span>
                  <span className="text-slate-300 font-bold">HQ Crop Pricing & Controls</span>
                </div>
                <span className="text-[9px] text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">Launch Portal ➔</span>
              </button>

              {/* Suppliers Link */}
              <button
                type="button"
                onClick={() => handleTerminalLogin('suppliers')}
                className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-teal-500/30 hover:bg-teal-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-teal-400 font-bold bg-teal-950 px-1.5 py-0.5 rounded text-[10px]">suppliers</span>
                  <span className="text-slate-300 font-bold">B2B Suppliers Procurement</span>
                </div>
                <span className="text-[9px] text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">Launch Portal ➔</span>
              </button>

              {/* Customer Hub Link */}
              <button
                type="button"
                onClick={() => handleTerminalLogin('customer-hub')}
                className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-teal-500/30 hover:bg-teal-950/20 transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-teal-400 font-bold bg-teal-950 px-1.5 py-0.5 rounded text-[10px]">customer-hub</span>
                  <span className="text-slate-300 font-bold">Customer Storefront</span>
                </div>
                <span className="text-[9px] text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">Open Storefront ➔</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      
      {/* Mobile overlay for sidebar drawer */}
      {isMobileMenuOpen && sessionAccessKey === 'admin' && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`
        ${sessionAccessKey === 'admin' ? 'flex' : 'hidden md:hidden'}
        fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 text-slate-300 flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out shrink-0
        md:static md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded flex items-center justify-center text-white font-bold text-xl">F</div>
            <h1 className="font-bold text-white tracking-tight text-base">Farmer's Gate</h1>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white p-1"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto scrollbar-thin">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1 mb-1">Main Menu</div>
          
          <button
            onClick={() => navigateTo('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <span>📊</span> Dashboard
          </button>

          {/* Head Office - Visible to Admin and Store Manager */}
          {(currentUserRole === 'Admin' || currentUserRole === 'Store Manager') && (
            <button
              onClick={() => navigateTo('headoffice')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'headoffice'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span>🏢</span> Head Office (HQ)
              </div>
              {requirements.filter(r => r.status === 'Pending').length > 0 && (
                <span className="text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded">
                  {requirements.filter(r => r.status === 'Pending').length} reqs
                </span>
              )}
            </button>
          )}

          <div className="space-y-1">
            <button
              onClick={() => {
                if (selectedStore) {
                  navigateTo('store', selectedStore.id);
                } else if (activeStores.length > 0) {
                  setSelectedStore(activeStores[0]);
                  navigateTo('store', activeStores[0].id);
                } else {
                  navigateTo('admin');
                }
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'store'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <span>🏪</span> Store Manager
              </div>
              <span className="text-[10px] opacity-80 font-mono">({activeStores.length})</span>
            </button>
            
            {/* Show all active stores indented */}
            <div className="pl-4 py-1 space-y-1 border-l border-slate-800 ml-4">
              {activeStores.map(store => (
                <button
                  key={store.id}
                  onClick={() => {
                    setSelectedStore(store);
                    navigateTo('store', store.id);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1 rounded text-[11px] font-medium transition-all text-left cursor-pointer ${
                    activeView === 'store' && selectedStore?.id === store.id
                      ? 'text-emerald-400 font-extrabold bg-slate-800/80 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                  }`}
                >
                  <span className="text-[10px] shrink-0">📍</span>
                  <span className="truncate">{store.name.replace("Farmer's Gate - ", "")}</span>
                </button>
              ))}
              {activeStores.length === 0 && (
                <p className="text-[10px] text-slate-500 italic pl-2">No active outlets</p>
              )}
            </div>
          </div>

          {/* Supplier Management - Visible to Admin & Store Manager */}
          {(currentUserRole === 'Admin' || currentUserRole === 'Store Manager') && (
            <button
              onClick={() => navigateTo('suppliers')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'suppliers'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <span>🚚</span> Suppliers & POs
            </button>
          )}

          {/* Accounts Module - Visible to Admin & Store Manager */}
          {(currentUserRole === 'Admin' || currentUserRole === 'Store Manager') && (
            <button
              onClick={() => navigateTo('accounts')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeView === 'accounts'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <span>📒</span> Accounts & Finances
            </button>
          )}

          {/* Customer Storefront - Open to all users / simulator */}
          <button
            onClick={() => navigateTo('customer-hub')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'customer-hub'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <span>🛍️</span> Farmer's Gate Online
          </button>

          {/* Global Settings - Admin only */}
          {currentUserRole === 'Admin' && (
            <>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1 mt-6 mb-1">Admin Panel</div>
              
              <button
                onClick={() => navigateTo('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'admin'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <span>⚙️</span> Global Settings
              </button>
            </>
          )}
        </nav>

        {/* Professional User Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20 font-bold text-xs">
              👑
            </div>
            <div className="text-xs min-w-0">
              <p className="text-white font-bold truncate leading-tight">Admin Terminal</p>
              <p className="text-slate-500 text-[10px] truncate">
                Role: <span className="text-slate-300 font-bold">Administrator</span>
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col bg-slate-50 h-screen overflow-hidden">
        
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0">
          
          <div className="flex items-center gap-4">
            {/* Hamburger button on Mobile */}
            {sessionAccessKey === 'admin' && (
              <button 
                className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 focus:outline-none"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <span className="text-xl">☰</span>
              </button>
            )}

            {sessionAccessKey !== 'admin' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase bg-emerald-50 text-emerald-700 px-2.5 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5 shadow-sm animate-fade-in">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>
                    {sessionAccessKey.startsWith('store-') 
                      ? `${selectedStore?.name.replace("Farmer's Gate - ", "")} Portal` 
                      : `${sessionAccessKey.toUpperCase()} Portal`}
                  </span>
                </span>
              </div>
            )}

            {sessionAccessKey === 'admin' && (
              <div className="hidden sm:flex items-center gap-4">
                <span className="text-xs text-slate-500">
                  Active Stores: <span className="font-bold text-slate-900">{activeStores.length}</span>
                </span>
                <span className="h-4 w-px bg-slate-200"></span>
                <span className="text-xs text-slate-500">
                  Total Daily Revenue: <span className="font-bold text-emerald-600">{cpanelSettings.currencySymbol}{totalDailyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            
            {/* Quick Copy Link of Current Module */}
            <button
              onClick={copyDirectLink}
              title={`Copy shareable direct link for the ${activeView} module`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all border cursor-pointer ${
                copiedLink 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 shadow-sm' 
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Link className="h-3.5 w-3.5" />}
              <span className="hidden md:inline uppercase tracking-tight">
                {copiedLink ? 'Copied Link!' : 'Share Module Link'}
              </span>
            </button>

            {/* Supabase status indicator pill */}
            <div className="hidden md:flex items-center gap-1.5 rounded-full bg-slate-50 border border-slate-200 px-3 py-1 text-[10px] font-bold text-slate-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  dbConfig.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  dbConfig.isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
              </span>
              <span>{dbConfig.isConnected ? 'Supabase Connected' : 'Offline Cache Mode'}</span>
            </div>

            {/* Quick Active Store Switcher */}
            {sessionAccessKey === 'admin' && activeView === 'store' && selectedStore && (
              <div className="relative group">
                <button className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-sm hover:bg-slate-50">
                  <span>🏪</span>
                  <span className="max-w-[100px] truncate">{selectedStore.name.replace("Farmer's Gate - ", "")}</span>
                  <span className="text-[8px] text-slate-400 font-normal">▼</span>
                </button>
                <div className="absolute right-0 mt-1 hidden group-hover:block hover:block min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-md z-50">
                  <div className="px-2 py-1 text-[9px] font-bold tracking-wide text-slate-400 uppercase border-b border-slate-100 mb-1">
                    Switch Branch
                  </div>
                  {activeStores.length === 0 ? (
                    <button 
                      onClick={() => setActiveView('admin')}
                      className="w-full text-left px-2.5 py-1.5 rounded text-[11px] text-amber-600 hover:bg-amber-50 font-bold"
                    >
                      + Create Store
                    </button>
                  ) : (
                    activeStores.map(store => (
                      <button
                        key={store.id}
                        onClick={() => {
                          setSelectedStore(store);
                          setActiveView('store');
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] font-bold transition-all ${
                          selectedStore.id === store.id
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {store.name.replace("Farmer's Gate - ", "")}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Refresh Data triggers full state reload */}
            <button 
              onClick={loadData}
              className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">REFRESH DATA</span>
            </button>

             {/* Exit Secure Session Terminal */}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="bg-rose-50 text-rose-700 hover:bg-rose-100 px-3 py-1.5 rounded text-xs font-black border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer ml-1"
            >
              <span>🚪</span>
              <span className="hidden sm:inline">EXIT TERMINAL</span>
            </button>

          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-1 p-6 space-y-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin" />
              <p className="text-slate-500 font-semibold text-xs tracking-wider uppercase">Loading database records...</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-7xl mx-auto w-full animate-fade-in">
               {activeView === 'dashboard' && (
                <Dashboard
                  stores={stores}
                  sales={sales}
                  purchases={purchases}
                  inventory={inventory}
                  role={currentUserRole}
                  onSelectStore={(store) => {
                    setSelectedStore(store);
                    setActiveView('store');
                  }}
                  terminalLogs={terminalLogs}
                  onClearLogs={() => {
                    setTerminalLogs([]);
                    localStorage.removeItem('fg_terminal_activity_logs');
                  }}
                />
              )}

              {activeView === 'store' && (
                selectedStore ? (
                  selectedStore.password && !unlockedStoreIds.includes(selectedStore.id) ? (
                    <div className="py-12 px-4 max-w-md mx-auto">
                      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md text-center space-y-6">
                        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center text-3xl mx-auto border border-amber-100">
                          🔒
                        </div>
                        
                        <div className="space-y-1.5">
                          <h3 className="text-lg font-black text-slate-900">Enter Store Password</h3>
                          <p className="text-xs text-slate-500">
                            The outlet <span className="font-extrabold text-slate-800">{selectedStore.name.replace("Farmer's Gate - ", "")}</span> is password-protected.
                          </p>
                        </div>

                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const input = form.elements.namedItem('storePassword') as HTMLInputElement;
                            const passwordValue = input?.value || '';
                            
                            if (passwordValue === selectedStore.password) {
                              setUnlockedStoreIds(prev => [...prev, selectedStore.id]);
                            } else {
                              alert("Incorrect password. Please try again.");
                            }
                          }}
                          className="space-y-4"
                        >
                          <div className="space-y-1 text-left">
                            <label htmlFor="store-gate-pass" className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Security Password</label>
                            <input
                              id="store-gate-pass"
                              name="storePassword"
                              type="password"
                              required
                              placeholder="Enter store password..."
                              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50 text-slate-800"
                              autoFocus
                            />
                            {currentUserRole === 'Admin' && (
                              <p className="text-[10px] text-amber-600 font-bold mt-1.5">
                                👑 Admin Hint: Password is <span className="underline font-black">{selectedStore.password}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2.5 pt-2">
                            <button
                              type="button"
                              onClick={() => setActiveView('dashboard')}
                              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                            >
                              Dashboard
                            </button>
                            <button
                              type="submit"
                              className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-200 cursor-pointer"
                            >
                              Unlock Gate
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  ) : (
                    <StoreManager
                      store={selectedStore}
                      sales={sales}
                      purchases={purchases}
                      inventory={inventory}
                      requirements={requirements}
                      customerOrders={customerOrders}
                      role={currentUserRole}
                      onAddSale={handleAddSale}
                      onDeleteSale={handleDeleteSale}
                      onAddPurchase={handleAddPurchase}
                      onDeletePurchase={handleDeletePurchase}
                      onUpdateInventoryItem={handleUpdateInventoryItem}
                      onAddRequirement={handleAddRequirement}
                      onUpdateRequirementStatus={handleUpdateRequirementStatus}
                      onDeleteRequirement={handleDeleteRequirement}
                      onFulfillCustomerOrder={handleFulfillCustomerOrder}
                      onDeleteCustomerOrder={handleDeleteCustomerOrder}
                      cpanelSettings={cpanelSettings}
                    />
                  )
                ) : (
                  <div className="py-20 text-center rounded-xl bg-white border border-slate-200 shadow-sm p-8 max-w-md mx-auto">
                    <span className="text-4xl block mb-3">🏪</span>
                    <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">No Active Outlet selected</p>
                    <p className="text-xs text-slate-500 mt-2">Please register or activate a store branch in the Administrator panel to enable crop logging.</p>
                    <button 
                      onClick={() => setActiveView('admin')}
                      className="mt-5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-sm"
                    >
                      Go to Admin Panel
                    </button>
                  </div>
                )
              )}

              {activeView === 'suppliers' && (
                <SupplierManager
                  suppliers={suppliers}
                  purchaseOrders={purchaseOrders}
                  stores={stores}
                  role={currentUserRole}
                  onAddSupplier={handleAddSupplier}
                  onUpdateSupplier={handleUpdateSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onAddPurchaseOrder={handleAddPurchaseOrder}
                  onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
                  onDeletePurchaseOrder={handleDeletePurchaseOrder}
                  onReceivePOInventory={handleReceivePOInventory}
                />
              )}

              {activeView === 'customer-hub' && (
                <CustomerHub
                  stores={activeStores}
                  inventory={inventory}
                  customerOrders={customerOrders}
                  onPlaceOrder={handleAddCustomerOrder}
                  storefrontAds={storefrontAds}
                />
              )}

              {activeView === 'headoffice' && (
                <HeadOffice
                  stores={stores}
                  requirements={requirements}
                  inventory={inventory}
                  sales={sales}
                  role={currentUserRole}
                  onUpdateRequirementStatus={handleUpdateRequirementStatus}
                  onDeleteRequirement={handleDeleteRequirement}
                  onUpdateInventoryItem={handleUpdateInventoryItem}
                  masterCrops={masterCrops}
                  onUpdateMasterCrop={handleUpdateMasterCrop}
                  onDeleteMasterCrop={handleDeleteMasterCrop}
                />
              )}

              {activeView === 'accounts' && (
                <AccountsManager
                  stores={stores}
                  sales={sales}
                  purchases={purchases}
                  role={currentUserRole}
                />
              )}

              {activeView === 'admin' && (
                <AdminPanel
                  stores={stores}
                  requirements={requirements}
                  dbConfig={dbConfig}
                  onAddStore={handleAddStore}
                  onUpdateStore={handleUpdateStore}
                  onDeleteStore={handleDeleteStore}
                  onUpdateRequirementStatus={handleUpdateRequirementStatus}
                  onDeleteRequirement={handleDeleteRequirement}
                  onSaveDbConfig={handleSaveDbConfig}
                  cpanelSettings={cpanelSettings}
                  onUpdateCpanelSettings={handleUpdateCpanelSettings}
                  onResetToDemoData={handleResetToDemoData}
                  storefrontAds={storefrontAds}
                  onUpdateStorefrontAds={handleUpdateStorefrontAds}
                />
              )}
            </div>
          )}
        </main>

        {/* Unified High Density footer */}
        <footer className="border-t border-slate-200 bg-white py-3 px-6 md:px-8 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] font-bold text-slate-400">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-600 font-bold" />
              <span className="uppercase tracking-tight">SYSTEM STATUS</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${dbConfig.isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                {dbConfig.isConnected ? 'Supabase Connected' : 'Local Cache'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> WhatsApp API Ready
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Auto-Sync: Active
              </span>
            </div>
          </div>
        </footer>

        {/* Custom Session Logout Confirmation Modal (Works inside iframes without alerts) */}
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in font-sans">
            <div className="w-full max-w-sm bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-5 text-center">
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center text-3xl mx-auto border border-rose-100">
                🚪
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-900 tracking-tight">Confirm Session Log Out</h3>
                <p className="text-xs text-slate-500 font-medium">
                  Are you sure you want to end this secure terminal session and lock this workstation? This action will be audited.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 rounded-xl bg-slate-100 hover:bg-slate-200 py-3 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sessionAccessKey) {
                      logTerminalActivity('logout', sessionAccessKey);
                    }
                    setSessionAccessKey(null);
                    localStorage.removeItem('fg_session_access_key');
                    setShowLogoutConfirm(false);
                    window.location.hash = '#/';
                  }}
                  className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 py-3 text-xs font-bold text-white shadow-lg shadow-rose-950/20 transition-colors cursor-pointer"
                >
                  End Session
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

