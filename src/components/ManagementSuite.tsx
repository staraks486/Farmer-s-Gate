import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
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
  HelpCircle
} from 'lucide-react';
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
  CompanyOfficial
} from '../types';
import { 
  subscribeToOrders, 
  subscribeToNotifications, 
  addNotificationToFirestore, 
  updateOrderStatusInFirestore,
  FirebaseOrder
} from '../lib/firebase';
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
  dbDeleteCompanyOfficial
} from '../lib/supabase';

// Component imports
import Dashboard from './Dashboard';
import HeadOffice from './HeadOffice';
import StoreManager from './StoreManager';
import SupplierManager from './SupplierManager';
import AccountsManager from './AccountsManager';
import AdminPanel from './AdminPanel';
import ExecutivePortal from './ExecutivePortal';
import StaffAttendanceManager from './StaffAttendanceManager';

const DEFAULT_CPANEL_SETTINGS: CpanelSettings = {
  currencySymbol: '₹',
  defaultTaxRate: 0,
  allowNegativeStockCheckout: true,
  autoReorderThresholdPercent: 20,
  alertSoundEnabled: true,
  audioNotificationEnabled: true,
  whatsappMessageTemplate: 'Dear {customer_name}, Your order of {order_summary} is ready!',
  enableCustomerOrderReview: true,
  enableMultipleRegisters: true,
  quickDemoDataEnabled: true,
  disableLoadingIntro: false,
  introSpeedSeconds: 4,
  enableLocalAccessRestriction: false,
  allowedLocalRadiusKm: 10,
  simulatedLocalOnly: false,
  headOfficeName: 'Bangalore Corporate HQ',
  headOfficeLocation: 'FarmersGate Corporate HQ, Sector 1, Bangalore',
  headOfficeLat: 12.9716,
  headOfficeLng: 77.5946,
  activeCity: 'Bengaluru'
};

export default function ManagementSuite({ user, isStorePosPortal, appVersion }: { user: any; isStorePosPortal?: boolean; appVersion?: string }) {
  const roleInfo = getUserRole(user?.email);
  let allowedTabs = roleInfo.allowedTabs || ['dashboard', 'headoffice', 'store', 'suppliers', 'accounts', 'admin'];
  if (isStorePosPortal) {
    allowedTabs = ['store'];
  }
  const defaultTab = allowedTabs[0] || 'dashboard';

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'headoffice' | 'store' | 'suppliers' | 'accounts' | 'admin' | 'staff'>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [copiedStoreId, setCopiedStoreId] = useState<string | null>(null);
  const [unlockedStoreId, setUnlockedStoreId] = useState<string | null>(null);
  const [storePassword, setStorePassword] = useState<string>('');
  const [storeLoginError, setStoreLoginError] = useState<string | null>(null);

  // Database states
  const [stores, setStores] = useState<Store[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [masterCrops, setMasterCrops] = useState<MasterCrop[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [storefrontAds, setStorefrontAds] = useState<StorefrontAd[]>([]);
  const [officials, setOfficials] = useState<CompanyOfficial[]>([]);
  const [cpanelSettings, setCpanelSettings] = useState<CpanelSettings>(DEFAULT_CPANEL_SETTINGS);
  const [dbConfig, setDbConfig] = useState<SupabaseConfig>({ supabaseUrl: '', supabaseAnonKey: '', isConnected: false });

  // Real-time Firebase states
  const [firebaseOrders, setFirebaseOrders] = useState<FirebaseOrder[]>([]);
  const [firebaseNotifications, setFirebaseNotifications] = useState<AppNotification[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load all data
  const loadAllData = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setSyncing(true);
    }
    try {
      const fetchedStores = await dbGetStores();
      const fetchedSales = await dbGetSales();
      const fetchedPurchases = await dbGetPurchases();
      const fetchedInventory = await dbGetInventory();
      const fetchedRequirements = await dbGetRequirements();
      const fetchedSuppliers = await dbGetSuppliers();
      const fetchedPOs = await dbGetPurchaseOrders();
      const fetchedCOs = await dbGetCustomerOrders();
      const fetchedCrops = await dbGetMasterCrops();
      const fetchedStaff = await dbGetStaffMembers();
      const fetchedAttendance = await dbGetAttendanceRecords();
      const fetchedOfficials = await dbGetCompanyOfficials();
      const config = getSupabaseConfig();

      setStores(fetchedStores);
      try {
        localStorage.setItem('fg_cached_stores', JSON.stringify(fetchedStores));
      } catch (e) {}
      
      if (selectedStore) {
        const updatedSelected = fetchedStores.find(s => s.id === selectedStore.id);
        if (updatedSelected) {
          setSelectedStore(updatedSelected);
        }
      }

      if (isStorePosPortal && fetchedStores.length > 0) {
        const params = new URLSearchParams(window.location.search);
        const queryStoreId = params.get('storeId');
        const match = queryStoreId 
          ? fetchedStores.find(st => st.id === queryStoreId) 
          : fetchedStores.find(st => st.isActive) || fetchedStores[0];
        
        if (match) {
          setSelectedStore(match);
          setUnlockedStoreId(match.id);
        }
      }
      setSales(fetchedSales);
      setPurchases(fetchedPurchases);
      setInventory(fetchedInventory);
      setRequirements(fetchedRequirements);
      setSuppliers(fetchedSuppliers);
      setPurchaseOrders(fetchedPOs);
      setCustomerOrders(fetchedCOs);
      setMasterCrops(fetchedCrops);
      setStaff(fetchedStaff);
      setAttendance(fetchedAttendance);
      setOfficials(fetchedOfficials);
      setDbConfig(config);

      // Load settings and ads from localStorage if exist
      const localSettings = localStorage.getItem('farmersgate_cpanel_settings');
      if (localSettings) {
        setCpanelSettings(JSON.parse(localSettings));
      }
      const localAds = localStorage.getItem('farmersgate_storefront_ads');
      if (localAds) {
        setStorefrontAds(JSON.parse(localAds));
      } else {
        const defaultAds = [
          { id: 'ad-1', title: 'Monsoon Fresh Arrival', subtitle: 'Farm fresh leafy vegetables harvested today!', discountBadge: 'Flat 20% OFF', isActive: true },
          { id: 'ad-2', title: 'Organic Potato Deal', subtitle: 'Fresh high-yield chemical free potatoes from Nashik', discountBadge: 'Special Price', isActive: true }
        ];
        setStorefrontAds(defaultAds);
        localStorage.setItem('farmersgate_storefront_ads', JSON.stringify(defaultAds));
      }
    } catch (err) {
      console.error('Error loading management data', err);
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setSyncing(false);
      }
    }
  };

  useEffect(() => {
    const isInitial = stores.length === 0;
    loadAllData(!isInitial);
  }, [appVersion]);

  useEffect(() => {
    // Background auto-update every 8 seconds
    const intervalId = setInterval(() => {
      loadAllData(true);
    }, 8000);

    return () => {
      clearInterval(intervalId);
    };
  }, [selectedStore, isStorePosPortal]);

  useEffect(() => {
    const unsubOrders = subscribeToOrders((orders) => {
      setFirebaseOrders(orders);
    });

    const unsubNotifications = subscribeToNotifications((notifs) => {
      setFirebaseNotifications(notifs);
    });

    return () => {
      unsubOrders();
      unsubNotifications();
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    await dbSyncLocalCache();
    await loadAllData();
    setSyncing(false);
  };

  const handleResetToDemo = () => {
    if (confirm('Are you sure you want to reset all data to system defaults? This will overwrite manual changes.')) {
      localStorage.removeItem('supabase_stores');
      localStorage.removeItem('supabase_inventory');
      localStorage.removeItem('supabase_sales');
      localStorage.removeItem('supabase_purchases');
      localStorage.removeItem('supabase_requirements');
      localStorage.removeItem('supabase_suppliers');
      localStorage.removeItem('supabase_purchase_orders');
      localStorage.removeItem('supabase_master_crops');
      localStorage.removeItem('farmersgate_cpanel_settings');
      localStorage.removeItem('farmersgate_storefront_ads');
      loadAllData();
    }
  };

  const triggerDataUpdate = async (silent = false) => {
    await loadAllData(silent);
    try {
      fetch('/api/app-version/increment', { method: 'POST' })
        .then(res => res.json())
        .catch(err => console.warn(err));
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
    await dbDeleteStore(id);
    await triggerDataUpdate();
  };

  // CRUD Handlers for Requirements
  const handleAddRequirement = async (req: Requirement) => {
    await dbAddRequirement(req);
    await triggerDataUpdate();
  };

  const handleUpdateRequirementStatus = async (id: string, status: 'Pending' | 'Ordered' | 'Fulfilled') => {
    const req = requirements.find(r => r.id === id);
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
    await dbDeleteRequirement(id);
    await triggerDataUpdate();
  };

  // Sales
  const handleAddSale = async (sale: Sale) => {
    await dbAddSale(sale);
    await triggerDataUpdate();
  };

  const handleDeleteSale = async (id: string) => {
    await dbDeleteSale(id);
    await triggerDataUpdate();
  };

  // Purchases
  const handleAddPurchase = async (p: Purchase) => {
    await dbAddPurchase(p);
    await triggerDataUpdate();
  };

  const handleDeletePurchase = async (id: string) => {
    await dbDeletePurchase(id);
    await triggerDataUpdate();
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
    await dbDeleteMasterCrop(id);
    await triggerDataUpdate();
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
    await dbDeleteStaffMember(id);
    await triggerDataUpdate();
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
    await dbDeleteCompanyOfficial(id);
    await triggerDataUpdate();
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
    await dbDeleteSupplier(id);
    await triggerDataUpdate();
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
    await dbDeletePurchaseOrder(id);
    await triggerDataUpdate();
  };

  // Customer Orders
  const handleUpdateCustomerOrder = async (order: CustomerOrder) => {
    await dbUpdateCustomerOrder(order);
    await triggerDataUpdate();
  };

  const handleDeleteCustomerOrder = async (id: string) => {
    await dbDeleteCustomerOrder(id);
    await triggerDataUpdate();
  };

  const handleFulfillCustomerOrder = async (order: CustomerOrder) => {
    // 1. Mark order as 'Completed'
    const updatedOrder: CustomerOrder = {
      ...order,
      status: 'Completed'
    };
    await dbUpdateCustomerOrder(updatedOrder);

    // 2. Reduce the quantity from store inventory
    for (const item of order.items) {
      const existing = inventory.find(inv => inv.storeId === order.storeId && inv.vegetableName === item.vegetableName);
      if (existing) {
        const newQty = Math.max(0, Number(existing.quantity) - Number(item.quantity));
        await dbAddOrUpdateInventoryItem({
          ...existing,
          quantity: newQty,
          lastUpdated: new Date().toISOString()
        });
      }
    }

    // 3. Record a Sale Transaction for each item
    for (const item of order.items) {
      await dbAddSale({
        id: `sale-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        storeId: order.storeId,
        vegetableName: item.vegetableName,
        quantity: item.quantity,
        pricePerKg: item.pricePerKg,
        totalPrice: item.quantity * item.pricePerKg,
        saleDate: new Date().toISOString()
      });
    }

    await triggerDataUpdate();
  };

  const handleReceivePOInventory = async (po: PurchaseOrder) => {
    // Receive all items into the respective store inventory
    for (const item of po.items) {
      // Find matching inventory item for this store and vegetable
      const existing = inventory.find(inv => inv.storeId === po.storeId && inv.vegetableName === item.vegetableName);
      if (existing) {
        await dbAddOrUpdateInventoryItem({
          ...existing,
          quantity: Number(existing.quantity) + Number(item.quantity),
          costPrice: Number(item.costPerKg),
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Create new item
        await dbAddOrUpdateInventoryItem({
          id: `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          storeId: po.storeId,
          vegetableName: item.vegetableName,
          quantity: Number(item.quantity),
          minStockThreshold: 15,
          costPrice: Number(item.costPerKg),
          sellingPrice: Number(item.costPerKg) * 1.3,
          lastUpdated: new Date().toISOString()
        });
      }

      // Record a Purchase Transaction
      await dbAddPurchase({
        id: `pur-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        storeId: po.storeId,
        vegetableName: item.vegetableName,
        quantity: Number(item.quantity),
        costPerKg: Number(item.costPerKg),
        totalCost: Number(item.totalCost),
        supplierName: po.supplierName,
        purchaseDate: new Date().toISOString()
      });
    }

    // Mark PO as Delivered and Paid
    await dbUpdatePurchaseOrder({
      ...po,
      status: 'Delivered',
      paymentStatus: 'Paid',
      paidAmount: po.totalAmount
    });

    await triggerDataUpdate();
  };

  // Cpanel / Settings
  const handleUpdateCpanelSettings = (settings: CpanelSettings) => {
    setCpanelSettings(settings);
    localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(settings));
  };

  const handleUpdateStorefrontAds = (ads: StorefrontAd[]) => {
    setStorefrontAds(ads);
    localStorage.setItem('farmersgate_storefront_ads', JSON.stringify(ads));
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
        <p className="text-sm font-black text-slate-700 uppercase tracking-wider">Syncing Corporate Ledger & Catalog...</p>
        <p className="text-xs text-slate-400 mt-1">Connecting secure database credentials</p>
      </div>
    );
  }

  // Active navigation helper
  const allTabs = [
    { id: 'dashboard', name: 'Executive Dashboard', icon: BarChart3 },
    { id: 'headoffice', name: 'HQ Supply Office', icon: Building2 },
    { id: 'store', name: 'Store POS & Retail', icon: StoreIcon },
    { id: 'suppliers', name: 'Supply Chain POs', icon: Truck },
    { id: 'accounts', name: 'Double Entry Ledger', icon: Receipt },
    { id: 'staff', name: 'Staff & Attendance', icon: Users },
    { id: 'admin', name: 'HQ System Admin', icon: Sliders },
  ];

  const tabs = allTabs.filter(t => allowedTabs.includes(t.id as any));

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-emerald-50/10">
      
      {/* Management Sidebar */}
      <aside className="w-full md:w-64 bg-emerald-950 text-white shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-emerald-900/60">
        <div className="p-4 border-b border-emerald-900/60 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              HQ OPERATIONS
              <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="Live Auto-Sync Active (Background)" />
            </h2>
            <p className="text-[10px] text-emerald-300 font-semibold uppercase">FarmersGate HQ</p>
          </div>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 transition cursor-pointer text-slate-300"
            title="Sync cache with server"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Sidebar Nav - Highly responsive and touch friendly for all devices */}
        <nav className="flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto p-2 gap-1 md:space-y-1 shrink-0 md:shrink scrollbar-none">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id !== 'store') setSelectedStore(null);
                }}
                className={`flex-none md:flex-initial flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap md:w-full ${
                  isActive 
                    ? 'bg-emerald-600 text-slate-950 font-extrabold shadow-md' 
                    : 'text-slate-300 hover:bg-emerald-900/60 hover:text-white'
                }`}
              >
                <IconComponent className={`h-4 w-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Sync Status Info - Hidden on mobile to save precious screen real estate */}
        <div className="hidden md:block p-3 bg-emerald-950/80 border-t border-emerald-900/60 shrink-0 text-[10px] text-emerald-300 font-medium">
          <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold uppercase tracking-wider text-[9px]">Offline Resilience Active</span>
          </div>
          <p className="text-[9px] leading-relaxed text-emerald-400/85">
            Data is persisted in client localStorage & synchronized to cloud database automatically when online.
          </p>
        </div>
      </aside>

      {/* Management Active View Container */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
        
        {/* Dynamic header reflecting deep state */}
        <div className="bg-white border-b border-slate-200/60 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-2">
          <div>
            <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <span>{tabs.find(t => t.id === activeTab)?.name}</span>
              {selectedStore && (
                <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full font-black uppercase">
                  🏪 {selectedStore.name.replace("Farmer's Gate - ", "")}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-medium">
              {activeTab === 'dashboard' && 'Real-time multi-branch retail ledger & diagnostic systems.'}
              {activeTab === 'headoffice' && 'Centralized inventory requirements & master crop catalogs.'}
              {activeTab === 'store' && 'Manage cash registry registers, manual sales entries, and crop weights.'}
              {activeTab === 'suppliers' && 'Fulfill crop requirements by sending purchase requests directly to mandis.'}
              {activeTab === 'accounts' && 'Profit analysis ledger sheet reflecting cost of goods & miscellaneous bills.'}
              {activeTab === 'staff' && 'Manage employee rosters, cross-branch shifts, and log daily check-ins.'}
              {activeTab === 'admin' && 'Supabase & database connection parameters control board.'}
            </p>
          </div>

          {selectedStore && (
            <button
              onClick={() => setSelectedStore(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition cursor-pointer text-xs font-bold text-slate-600 flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Branch List
            </button>
          )}
        </div>

        {/* Core Screen Router */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'dashboard' && (
            <ExecutivePortal isAdmin={true} />
          )}

          {activeTab === 'headoffice' && (
            <HeadOffice 
              stores={stores}
              requirements={requirements}
              inventory={inventory}
              sales={sales}
              role="Admin"
              onUpdateRequirementStatus={handleUpdateRequirementStatus}
              onDeleteRequirement={handleDeleteRequirement}
              onUpdateInventoryItem={handleUpdateInventoryItem}
              masterCrops={masterCrops}
              onUpdateMasterCrop={handleUpdateMasterCrop}
              onDeleteMasterCrop={handleDeleteMasterCrop}
              firebaseOrders={firebaseOrders}
              firebaseNotifications={firebaseNotifications}
            />
          )}

          {activeTab === 'store' && (
            selectedStore ? (
              unlockedStoreId === selectedStore.id ? (
                <StoreManager 
                  store={selectedStore}
                  sales={sales.filter(s => s.storeId === selectedStore.id)}
                  purchases={purchases.filter(p => p.storeId === selectedStore.id)}
                  inventory={inventory.filter(i => i.storeId === selectedStore.id)}
                  requirements={requirements.filter(r => r.storeId === selectedStore.id)}
                  customerOrders={customerOrders.filter(co => co.storeId === selectedStore.id)}
                  role="Admin"
                  onAddSale={handleAddSale}
                  onDeleteSale={handleDeleteSale}
                  onAddPurchase={handleAddPurchase}
                  onDeletePurchase={handleDeletePurchase}
                  onUpdateInventoryItem={handleUpdateInventoryItem}
                  onUpdateInventoryItems={handleUpdateInventoryItems}
                  onAddRequirement={handleAddRequirement}
                  onUpdateRequirement={handleUpdateRequirement}
                  onUpdateRequirementStatus={handleUpdateRequirementStatus}
                  onDeleteRequirement={handleDeleteRequirement}
                  onFulfillCustomerOrder={handleFulfillCustomerOrder}
                  onUpdateCustomerOrder={handleUpdateCustomerOrder}
                  onDeleteCustomerOrder={handleDeleteCustomerOrder}
                  cpanelSettings={cpanelSettings}
                  staff={staff}
                  attendance={attendance}
                  onSaveAttendance={handleSaveAttendance}
                  onUpdateStaff={handleUpdateStaff}
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
                            setStorePassword('');
                            setStoreLoginError(null);
                          }}
                          className="h-12 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 text-slate-500 font-extrabold rounded-xl text-xs uppercase tracking-wider transition active:scale-95 flex items-center justify-center cursor-pointer select-none shadow-3xs"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStorePassword((prev) => prev + '0');
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
                              'st-1': 'mumbai123',
                              'st-2': 'pune123',
                              'st-3': 'bangalore123',
                              'st-4': 'delhi123',
                              'st-5': 'chennai123'
                            };
                            const isMatch = storePassword === 'pos123' || 
                              storePassword === selectedStore.password || 
                              storePassword === defaultPasswords[selectedStore.id] ||
                              storePassword === selectedStore.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '123';
                            
                            if (isMatch) {
                              setUnlockedStoreId(selectedStore.id);
                              setStorePassword('');
                              setStoreLoginError(null);
                            } else {
                              setStoreLoginError('Invalid security PIN code. Please try again.');
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
                            setStorePassword('');
                            setStoreLoginError(null);
                          }}
                          className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setStorePassword('pos123');
                          }}
                          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1"
                        >
                          <HelpCircle className="h-3.5 w-3.5" /> Use Test PIN
                        </button>
                      </div>

                      {/* Official testing link badge at the bottom of the card */}
                      <div className="border-t border-slate-150 pt-4 text-center">
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
                  {stores.filter(st => st.isActive).map(st => {
                    const separateLink = `${window.location.origin}${window.location.pathname}?portal=store_pos&storeId=${st.id}#store_pos`;
                    return (
                      <div
                        key={st.id}
                        className="w-full p-5 bg-white border border-slate-200/80 rounded-2xl shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-xs transition-all bg-gradient-to-r from-white to-slate-50/50"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-slate-800">{st.name}</span>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" title="Active Branch"></span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                            <span>📍 {st.location}</span>
                          </p>
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-150">
                              🟢 Secure POS Terminal
                            </span>
                            {st.whatsappNumber && (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded">
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
                  {stores.filter(st => st.isActive).length === 0 && (
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
            )
          )}

          {activeTab === 'suppliers' && (
            <SupplierManager 
              suppliers={suppliers}
              purchaseOrders={purchaseOrders}
              stores={stores}
              role="Admin"
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onAddPurchaseOrder={handleAddPurchaseOrder}
              onUpdatePurchaseOrder={handleUpdatePurchaseOrder}
              onDeletePurchaseOrder={handleDeletePurchaseOrder}
              onReceivePOInventory={handleReceivePOInventory}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsManager 
              stores={stores}
              sales={sales}
              purchases={purchases}
              role="Admin"
            />
          )}

          {activeTab === 'staff' && (
            <StaffAttendanceManager 
              stores={stores}
              sales={sales}
              staff={staff}
              attendance={attendance}
              onAddStaff={handleAddStaff}
              onUpdateStaff={handleUpdateStaff}
              onDeleteStaff={handleDeleteStaff}
              onSaveAttendance={handleSaveAttendance}
            />
          )}

          {activeTab === 'admin' && (
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
              onResetToDemoData={handleResetToDemo}
              storefrontAds={storefrontAds}
              onUpdateStorefrontAds={handleUpdateStorefrontAds}
              masterCrops={masterCrops}
              inventory={inventory}
              onUpdateMasterCrop={handleUpdateMasterCrop}
              onUpdateInventoryItem={handleUpdateInventoryItem}
              officials={officials}
              onAddOfficial={handleAddOfficial}
              onUpdateOfficial={handleUpdateOfficial}
              onDeleteOfficial={handleDeleteOfficial}
            />
          )}
        </div>
      </main>
    </div>
  );
}
