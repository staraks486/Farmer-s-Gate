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
  Info
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
  SupabaseConfig
} from '../types';
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
  dbSyncLocalCache
} from '../lib/supabase';

// Component imports
import Dashboard from './Dashboard';
import HeadOffice from './HeadOffice';
import StoreManager from './StoreManager';
import SupplierManager from './SupplierManager';
import AccountsManager from './AccountsManager';
import AdminPanel from './AdminPanel';

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
  quickDemoDataEnabled: true
};

export default function ManagementSuite() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'headoffice' | 'store' | 'suppliers' | 'accounts' | 'admin'>('dashboard');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);

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
  const [storefrontAds, setStorefrontAds] = useState<StorefrontAd[]>([]);
  const [cpanelSettings, setCpanelSettings] = useState<CpanelSettings>(DEFAULT_CPANEL_SETTINGS);
  const [dbConfig, setDbConfig] = useState<SupabaseConfig>({ supabaseUrl: '', supabaseAnonKey: '', isConnected: false });

  // UI state
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
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
      const config = getSupabaseConfig();

      setStores(fetchedStores);
      setSales(fetchedSales);
      setPurchases(fetchedPurchases);
      setInventory(fetchedInventory);
      setRequirements(fetchedRequirements);
      setSuppliers(fetchedSuppliers);
      setPurchaseOrders(fetchedPOs);
      setCustomerOrders(fetchedCOs);
      setMasterCrops(fetchedCrops);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
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

  // CRUD Handlers for Stores
  const handleAddStore = async (store: Store) => {
    await dbAddStore(store);
    await loadAllData();
  };

  const handleUpdateStore = async (store: Store) => {
    await dbUpdateStore(store);
    await loadAllData();
  };

  const handleDeleteStore = async (id: string) => {
    await dbDeleteStore(id);
    await loadAllData();
  };

  // CRUD Handlers for Requirements
  const handleAddRequirement = async (req: Requirement) => {
    await dbAddRequirement(req);
    await loadAllData();
  };

  const handleUpdateRequirementStatus = async (id: string, status: 'Pending' | 'Ordered' | 'Fulfilled') => {
    const req = requirements.find(r => r.id === id);
    if (req) {
      await dbUpdateRequirement({ ...req, status });
      await loadAllData();
    }
  };

  const handleDeleteRequirement = async (id: string) => {
    await dbDeleteRequirement(id);
    await loadAllData();
  };

  // Sales
  const handleAddSale = async (sale: Sale) => {
    await dbAddSale(sale);
    await loadAllData();
  };

  const handleDeleteSale = async (id: string) => {
    await dbDeleteSale(id);
    await loadAllData();
  };

  // Purchases
  const handleAddPurchase = async (p: Purchase) => {
    await dbAddPurchase(p);
    await loadAllData();
  };

  const handleDeletePurchase = async (id: string) => {
    await dbDeletePurchase(id);
    await loadAllData();
  };

  // Inventory
  const handleUpdateInventoryItem = async (item: InventoryItem) => {
    await dbAddOrUpdateInventoryItem(item);
    await loadAllData();
  };

  // Master Crops
  const handleUpdateMasterCrop = async (crop: MasterCrop) => {
    await dbAddOrUpdateMasterCrop(crop);
    await loadAllData();
  };

  const handleDeleteMasterCrop = async (id: string) => {
    await dbDeleteMasterCrop(id);
    await loadAllData();
  };

  // Suppliers
  const handleAddSupplier = async (s: Supplier) => {
    await dbAddSupplier(s);
    await loadAllData();
  };

  const handleUpdateSupplier = async (s: Supplier) => {
    await dbUpdateSupplier(s);
    await loadAllData();
  };

  const handleDeleteSupplier = async (id: string) => {
    await dbDeleteSupplier(id);
    await loadAllData();
  };

  // POs
  const handleAddPurchaseOrder = async (po: PurchaseOrder) => {
    await dbAddPurchaseOrder(po);
    await loadAllData();
  };

  const handleUpdatePurchaseOrder = async (po: PurchaseOrder) => {
    await dbUpdatePurchaseOrder(po);
    await loadAllData();
  };

  const handleDeletePurchaseOrder = async (id: string) => {
    await dbDeletePurchaseOrder(id);
    await loadAllData();
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

    await loadAllData();
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
  const tabs = [
    { id: 'dashboard', name: 'Executive Dashboard', icon: BarChart3 },
    { id: 'headoffice', name: 'HQ Supply Office', icon: Building2 },
    { id: 'store', name: 'Store POS & Retail', icon: StoreIcon },
    { id: 'suppliers', name: 'Supply Chain POs', icon: Truck },
    { id: 'accounts', name: 'Double Entry Ledger', icon: Receipt },
    { id: 'admin', name: 'HQ System Admin', icon: Sliders },
  ];

  return (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
      
      {/* Management Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-white shrink-0 flex flex-col border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-emerald-400">MANAGEMENT SUITE</h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase">FarmersGate Operations HQ</p>
          </div>
          <button 
            onClick={handleSync}
            disabled={syncing}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer text-slate-300"
            title="Sync cache with server"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-600 text-slate-950 font-extrabold shadow-md' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <IconComponent className={`h-4 w-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Sync Status Info */}
        <div className="p-3 bg-slate-950/60 border-t border-slate-800 shrink-0 text-[10px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold uppercase tracking-wider text-[9px]">Offline Resilience Active</span>
          </div>
          <p className="text-[9px] leading-relaxed">
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
            <Dashboard 
              stores={stores}
              sales={sales}
              purchases={purchases}
              inventory={inventory}
              role="Admin"
              onSelectStore={(st) => {
                setSelectedStore(st);
                setActiveTab('store');
              }}
            />
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
            />
          )}

          {activeTab === 'store' && (
            selectedStore ? (
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
                onAddRequirement={handleAddRequirement}
                onUpdateRequirementStatus={handleUpdateRequirementStatus}
                onDeleteRequirement={handleDeleteRequirement}
                cpanelSettings={cpanelSettings}
              />
            ) : (
              <div className="max-w-xl mx-auto py-12 text-center">
                <StoreIcon className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight">Active Retail Branch POS Desk</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-6 leading-relaxed">
                  Select an active retail outlet from the list below to access its local Point of Sale checkout counter and manual inventory ledgers.
                </p>
                <div className="grid grid-cols-1 gap-3 text-left">
                  {stores.map(st => (
                    <button
                      key={st.id}
                      onClick={() => setSelectedStore(st)}
                      className="w-full p-4 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all hover:shadow cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-800">{st.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">📍 {st.location}</p>
                      </div>
                      <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg font-black uppercase">
                        Select Branch 🏪
                      </span>
                    </button>
                  ))}
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
            />
          )}
        </div>
      </main>
    </div>
  );
}
