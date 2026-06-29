import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import StoreManager from './components/StoreManager';
import AdminPanel from './components/AdminPanel';
import SupplierManager from './components/SupplierManager';
import CustomerHub from './components/CustomerHub';
import HeadOffice from './components/HeadOffice';
import AccountsManager from './components/AccountsManager';
import { Store, Sale, Purchase, InventoryItem, Requirement, SupabaseConfig, Supplier, PurchaseOrder, CustomerOrder, UserRole, MasterCrop, AppNotification } from './types';
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
import { Sparkles, HelpCircle, Store as StoreIcon, RefreshCw, Layers, Shield, User, Users, ShoppingCart, Truck, Bell, BellRing, Settings2, CheckCheck, X } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeView, setActiveView] = useState<'dashboard' | 'store' | 'admin' | 'suppliers' | 'customer-hub' | 'headoffice' | 'accounts'>('dashboard');
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // User Role State (Simulator)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('Admin');

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

  // Load notification states from local storage on mount
  useEffect(() => {
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
  }, []);

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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans antialiased">
      
      {/* Mobile overlay for sidebar drawer */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-60 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-300 ease-in-out shrink-0
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
            onClick={() => {
              setActiveView('dashboard');
              setIsMobileMenuOpen(false);
            }}
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
              onClick={() => {
                setActiveView('headoffice');
                setIsMobileMenuOpen(false);
              }}
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
                  setActiveView('store');
                } else if (activeStores.length > 0) {
                  setSelectedStore(activeStores[0]);
                  setActiveView('store');
                } else {
                  setActiveView('admin');
                }
                setIsMobileMenuOpen(false);
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
                    setActiveView('store');
                    setIsMobileMenuOpen(false);
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
              onClick={() => {
                setActiveView('suppliers');
                setIsMobileMenuOpen(false);
              }}
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
              onClick={() => {
                setActiveView('accounts');
                setIsMobileMenuOpen(false);
              }}
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
            onClick={() => {
              setActiveView('customer-hub');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              activeView === 'customer-hub'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-900/10'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <span>🛒</span> Customer Storefront
          </button>

          {/* Global Settings - Admin only */}
          {currentUserRole === 'Admin' && (
            <>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 py-1 mt-6 mb-1">Admin Panel</div>
              
              <button
                onClick={() => {
                  setActiveView('admin');
                  setIsMobileMenuOpen(false);
                }}
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

        {/* Sidebar bottom role-simulator panel */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 shrink-0 space-y-2.5">
          <div className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
            <Shield className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
            <span>Active Role Simulator</span>
          </div>
          
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            {(['Admin', 'Store Manager', 'Employee'] as UserRole[]).map(role => (
              <button
                key={role}
                onClick={() => {
                  setCurrentUserRole(role);
                  // Safeguard views if changing roles puts them on a forbidden view
                  if (role === 'Employee' && (activeView === 'admin' || activeView === 'suppliers')) {
                    setActiveView('dashboard');
                  } else if (role === 'Store Manager' && activeView === 'admin') {
                    setActiveView('dashboard');
                  }
                }}
                className={`py-1 text-[9px] font-black rounded transition-all cursor-pointer text-center truncate ${
                  currentUserRole === role
                    ? 'bg-emerald-600 text-white font-extrabold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title={role}
              >
                {role === 'Store Manager' ? 'Manager' : role}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2.5 pt-1">
            <div className="w-7 h-7 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 border border-emerald-500/20">
              {currentUserRole === 'Admin' ? '👑' : currentUserRole === 'Store Manager' ? '💼' : '🌱'}
            </div>
            <div className="text-[10px] min-w-0">
              <p className="text-white font-bold truncate leading-tight">Simulator Mode</p>
              <p className="text-slate-500 text-[9px] truncate">
                Role: <span className="text-slate-300 font-bold">{currentUserRole}</span>
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
            <button 
              className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 focus:outline-none"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span className="text-xl">☰</span>
            </button>

            <div className="hidden sm:flex items-center gap-4">
              <span className="text-xs text-slate-500">
                Active Stores: <span className="font-bold text-slate-900">{activeStores.length}</span>
              </span>
              <span className="h-4 w-px bg-slate-200"></span>
              <span className="text-xs text-slate-500">
                Total Daily Revenue: <span className="font-bold text-emerald-600">₹{totalDailyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            
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
            {activeView === 'store' && selectedStore && (
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

      </div>
    </div>
  );
}

