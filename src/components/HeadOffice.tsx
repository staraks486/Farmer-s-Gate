import React, { useState } from 'react';
import { Store, Requirement, InventoryItem, Sale, UserRole, ConsolidatedRequirement, MasterCrop } from '../types';
import { 
  Building2, 
  TrendingUp, 
  Package, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  X, 
  Send, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  Plus, 
  ArrowRight,
  Filter,
  DollarSign,
  AlertCircle,
  Layers,
  Table,
  Phone,
  Calendar,
  Coins,
  Shield,
  Activity,
  FileText,
  MessageSquare,
  Edit,
  Trash2,
  Tag
} from 'lucide-react';

interface HeadOfficeProps {
  stores: Store[];
  requirements: Requirement[];
  inventory: InventoryItem[];
  sales: Sale[];
  role: UserRole;
  onUpdateRequirementStatus: (id: string, status: 'Pending' | 'Ordered' | 'Fulfilled') => void;
  onDeleteRequirement: (id: string) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
  masterCrops: MasterCrop[];
  onUpdateMasterCrop: (crop: MasterCrop) => void;
  onDeleteMasterCrop: (id: string) => void;
}

export default function HeadOffice({
  stores,
  requirements,
  inventory,
  sales,
  role,
  onUpdateRequirementStatus,
  onDeleteRequirement,
  onUpdateInventoryItem,
  masterCrops = [],
  onUpdateMasterCrop,
  onDeleteMasterCrop
}: HeadOfficeProps) {
  // Main and sub layout tabs
  const [activeTab, setActiveTab] = useState<'requirements' | 'inventory' | 'stores' | 'master-catalog'>('requirements');
  const [reqSubTab, setReqSubTab] = useState<'itemized' | 'consolidated'>('itemized');

  // Search/Filters states
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [requirementFilter, setRequirementFilter] = useState<'all' | 'Pending' | 'Ordered' | 'Fulfilled'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Low' | 'Medium' | 'High'>('all');
  const [cropSearch, setCropSearch] = useState('');

  // Inventory tab states
  const [inventoryStoreFilter, setInventoryStoreFilter] = useState<string>('all');
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryStockStatusFilter, setInventoryStockStatusFilter] = useState<'all' | 'low' | 'normal'>('all');

  // Custom direct distribution form states
  const [distStoreId, setDistStoreId] = useState('');
  const [distCropName, setDistCropName] = useState('Tomatoes (Tamatar)');
  const [distQty, setDistQty] = useState<number>(50);
  const [distCost, setDistCost] = useState<number>(20);
  const [distPrice, setDistPrice] = useState<number>(30);
  const [distSuccessMsg, setDistSuccessMsg] = useState('');

  // Editing state for inventory items
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editInvName, setEditInvName] = useState<string>('');
  const [editInvQty, setEditInvQty] = useState<number>(0);
  const [editInvCost, setEditInvCost] = useState<number>(0);
  const [editInvPrice, setEditInvPrice] = useState<number>(0);
  const [editInvThreshold, setEditInvThreshold] = useState<number>(20);

  const startEditingItem = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setEditInvName(item.vegetableName);
    setEditInvQty(item.quantity);
    setEditInvCost(item.costPrice);
    setEditInvPrice(item.sellingPrice);
    setEditInvThreshold(item.minStockThreshold);
  };

  const saveEditingItem = (item: InventoryItem) => {
    onUpdateInventoryItem({
      ...item,
      vegetableName: editInvName,
      quantity: editInvQty,
      costPrice: editInvCost,
      sellingPrice: editInvPrice,
      minStockThreshold: editInvThreshold,
      lastUpdated: new Date().toISOString()
    });
    setEditingItemId(null);
  };

  // Master Catalog States
  const [masterCropFormOpen, setMasterCropFormOpen] = useState(false);
  const [editingCropId, setEditingCropId] = useState<string | null>(null);
  const [cropFormName, setCropFormName] = useState('');
  const [cropFormCategory, setCropFormCategory] = useState<'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other'>('Vegetable');
  const [cropFormCost, setCropFormCost] = useState<number>(0);
  const [cropFormPrice, setCropFormPrice] = useState<number>(0);
  const [cropFormMinThreshold, setCropFormMinThreshold] = useState<number>(20);

  const [masterSearch, setMasterSearch] = useState('');
  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>('all');

  const openNewCropForm = () => {
    setEditingCropId(null);
    setCropFormName('');
    setCropFormCategory('Vegetable');
    setCropFormCost(20);
    setCropFormPrice(30);
    setCropFormMinThreshold(20);
    setMasterCropFormOpen(true);
  };

  const openEditCropForm = (crop: MasterCrop) => {
    setEditingCropId(crop.id);
    setCropFormName(crop.vegetableName);
    setCropFormCategory(crop.category);
    setCropFormCost(crop.costPrice);
    setCropFormPrice(crop.sellingPrice);
    setCropFormMinThreshold(crop.minStockThreshold);
    setMasterCropFormOpen(true);
  };

  const handleSaveCropSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropFormName.trim()) {
      alert("Crop Name is required.");
      return;
    }

    const savedCrop: MasterCrop = {
      id: editingCropId || `mc-${Date.now()}`,
      vegetableName: cropFormName.trim(),
      category: cropFormCategory,
      costPrice: Number(cropFormCost),
      sellingPrice: Number(cropFormPrice),
      minStockThreshold: Number(cropFormMinThreshold)
    };

    onUpdateMasterCrop(savedCrop);
    setMasterCropFormOpen(false);
    setEditingCropId(null);
    alert(`Success! Master Crop "${savedCrop.vegetableName}" template saved.`);
  };

  const handlePushPricingToStores = (crop: MasterCrop) => {
    // Find all inventory items in the network matching this crop name
    const affectedItems = inventory.filter(
      item => item.vegetableName.toLowerCase() === crop.vegetableName.toLowerCase()
    );

    if (affectedItems.length === 0) {
      alert(`There are currently no active store inventories tracking "${crop.vegetableName}". This Master template will automatically apply when new stock requirements or dispatches are raised.`);
      return;
    }

    if (confirm(`This will instantly synchronize cost price (₹${crop.costPrice}), selling price (₹${crop.sellingPrice}), and safety threshold (${crop.minStockThreshold}kg) for "${crop.vegetableName}" across ${affectedItems.length} active stores. Continue?`)) {
      affectedItems.forEach(item => {
        onUpdateInventoryItem({
          ...item,
          costPrice: crop.costPrice,
          sellingPrice: crop.sellingPrice,
          minStockThreshold: crop.minStockThreshold,
          lastUpdated: new Date().toISOString()
        });
      });
      alert(`⚡ Master pricing synchronized across all ${affectedItems.length} live outlets successfully!`);
    }
  };

  // 1. Store Abbreviation Helper: generates an elegant 3-letter abbreviation for each store
  const getStoreAbbreviation = (name: string): string => {
    const clean = name.replace("Farmer's Gate - ", "").trim();
    if (clean.length <= 4) return clean.toUpperCase();
    
    // If there are spaces, take first letter of each word (up to 3-4 letters)
    const words = clean.split(/\s+/);
    if (words.length > 1) {
      return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
    }
    // Otherwise take first 3 letters
    return clean.slice(0, 3).toUpperCase();
  };

  // 2. Vegetable Emojis
  const getVegEmoji = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('tomato')) return '🍅';
    if (n.includes('potato')) return '🥔';
    if (n.includes('onion')) return '🧅';
    if (n.includes('spinach') || n.includes('palak')) return '🥬';
    if (n.includes('cauliflower') || n.includes('gobhi')) return '🥦';
    if (n.includes('mango') || n.includes('aam')) return '🥭';
    if (n.includes('banana') || n.includes('kela')) return '🍌';
    if (n.includes('apple') || n.includes('seb')) return '🍎';
    if (n.includes('carrot') || n.includes('gajar')) return '🥕';
    if (n.includes('coriander') || n.includes('dhaniya')) return '🌿';
    if (n.includes('chili') || n.includes('mirch')) return '🌶️';
    if (n.includes('garlic') || n.includes('lahsun')) return '🧄';
    if (n.includes('ginger') || n.includes('adrak')) return '🫚';
    return '🌱';
  };

  // 3. Stats Calculations
  const totalStoresCount = stores.length;
  const activeStoresCount = stores.filter(s => s.isActive).length;
  const pendingReqs = requirements.filter(r => r.status === 'Pending');
  const totalPendingReqsCount = pendingReqs.length;
  const totalInventoryKg = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalNetworkRevenue = sales.reduce((sum, s) => sum + s.totalPrice, 0);

  // Group and Consolidate Requirements from all stores
  const getConsolidatedRequirements = (): ConsolidatedRequirement[] => {
    const grouped: { [key: string]: { totalQty: number; breakdowns: any[] } } = {};

    requirements.forEach(req => {
      // Skip fulfilled requirements in consolidation
      if (req.status === 'Fulfilled') return;

      const veg = req.vegetableName;
      if (!grouped[veg]) {
        grouped[veg] = { totalQty: 0, breakdowns: [] };
      }

      grouped[veg].totalQty += req.quantity;
      
      const storeObj = stores.find(s => s.id === req.storeId);
      grouped[veg].breakdowns.push({
        storeName: storeObj ? storeObj.name.replace("Farmer's Gate - ", "") : 'Unknown Outlet',
        quantity: req.quantity,
        status: req.status,
        requirementId: req.id,
        storeId: req.storeId
      });
    });

    return Object.keys(grouped).map(vegName => ({
      vegetableName: vegName,
      totalQuantity: parseFloat(grouped[vegName].totalQty.toFixed(2)),
      storesBreakdown: grouped[vegName].breakdowns
    })).sort((a, b) => b.totalQuantity - a.totalQuantity);
  };

  const consolidatedReqs = getConsolidatedRequirements();

  // Filtered raw requirements list
  const filteredRequirements = requirements.filter(r => {
    const matchesStatus = requirementFilter === 'all' || r.status === requirementFilter;
    const matchesPriority = priorityFilter === 'all' || r.priority === priorityFilter;
    const matchesSearch = r.vegetableName.toLowerCase().includes(cropSearch.toLowerCase());
    return matchesStatus && matchesPriority && matchesSearch;
  });

  // Filtered live global inventory list
  const filteredInventory = inventory.filter(item => {
    const matchesStore = inventoryStoreFilter === 'all' || item.storeId === inventoryStoreFilter;
    const matchesSearch = item.vegetableName.toLowerCase().includes(inventorySearch.toLowerCase());
    const isLow = item.quantity <= item.minStockThreshold;
    const matchesStatus = inventoryStockStatusFilter === 'all' || 
                          (inventoryStockStatusFilter === 'low' && isLow) || 
                          (inventoryStockStatusFilter === 'normal' && !isLow);
    return matchesStore && matchesSearch && matchesStatus;
  });

  // Calculate stats per store
  const getLowStockCount = (storeId: string) => {
    return inventory.filter(item => item.storeId === storeId && item.quantity <= item.minStockThreshold).length;
  };

  const getStoreStockValue = (storeId: string) => {
    return inventory.filter(item => item.storeId === storeId)
                    .reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
  };

  const getStoreSalesTotal = (storeId: string) => {
    return sales.filter(s => s.storeId === storeId).reduce((sum, s) => sum + s.totalPrice, 0);
  };

  const getStoreSalesVolume = (storeId: string) => {
    return sales.filter(s => s.storeId === storeId).reduce((sum, s) => sum + s.quantity, 0);
  };

  const getStoreSalesCount = (storeId: string) => {
    return sales.filter(s => s.storeId === storeId).length;
  };

  // 4. HQ Dispatch Fulfill Action
  const handleDispatchRequirement = (req: Requirement) => {
    const existingItem = inventory.find(
      item => item.storeId === req.storeId && item.vegetableName.toLowerCase() === req.vegetableName.toLowerCase()
    );

    let updatedItem: InventoryItem;

    if (existingItem) {
      updatedItem = {
        ...existingItem,
        quantity: parseFloat((existingItem.quantity + req.quantity).toFixed(2)),
        lastUpdated: new Date().toISOString()
      };
    } else {
      const pricingReference = inventory.find(
        item => item.vegetableName.toLowerCase() === req.vegetableName.toLowerCase()
      );
      
      updatedItem = {
        id: `inv-${req.storeId}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        storeId: req.storeId,
        vegetableName: req.vegetableName,
        quantity: req.quantity,
        minStockThreshold: 20,
        costPrice: pricingReference ? pricingReference.costPrice : 25,
        sellingPrice: pricingReference ? pricingReference.sellingPrice : 35,
        lastUpdated: new Date().toISOString()
      };
    }

    onUpdateInventoryItem(updatedItem);
    onUpdateRequirementStatus(req.id, 'Fulfilled');

    const sName = stores.find(s => s.id === req.storeId)?.name.replace("Farmer's Gate - ", "") || 'Outlet';
    alert(`⚡ HQ Dispatch Success!\nSent ${req.quantity} kg of ${req.vegetableName} directly to ${sName}'s live storefront cash registers.`);
  };

  // Direct injection form handler
  const handleDirectDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!distStoreId) {
      alert("Please select a target outlet store.");
      return;
    }

    const existingItem = inventory.find(
      item => item.storeId === distStoreId && item.vegetableName.toLowerCase() === distCropName.toLowerCase()
    );

    let updatedItem: InventoryItem;

    if (existingItem) {
      updatedItem = {
        ...existingItem,
        quantity: parseFloat((existingItem.quantity + distQty).toFixed(2)),
        costPrice: distCost > 0 ? distCost : existingItem.costPrice,
        sellingPrice: distPrice > 0 ? distPrice : existingItem.sellingPrice,
        lastUpdated: new Date().toISOString()
      };
    } else {
      updatedItem = {
        id: `inv-${distStoreId}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
        storeId: distStoreId,
        vegetableName: distCropName,
        quantity: distQty,
        minStockThreshold: 20,
        costPrice: distCost,
        sellingPrice: distPrice,
        lastUpdated: new Date().toISOString()
      };
    }

    onUpdateInventoryItem(updatedItem);

    const targetStoreName = stores.find(s => s.id === distStoreId)?.name.replace("Farmer's Gate - ", "") || 'Store';
    setDistSuccessMsg(`Allocated & dispatched ${distQty} kg of ${distCropName} directly to ${targetStoreName}!`);
    setTimeout(() => setDistSuccessMsg(''), 5000);

    setDistQty(50);
  };

  const getWhatsAppConsolidatedMessage = (): string => {
    let msg = `*FARMER'S GATE CONSOLIDATED SUPPLY ORDER*\n`;
    msg += `HQ Logged on: ${new Date().toLocaleDateString()}\n`;
    msg += `=============================\n\n`;
    consolidatedReqs.forEach(cr => {
      msg += `• *${cr.vegetableName}*: Total ${cr.totalQuantity} kg\n`;
      cr.storesBreakdown.forEach(b => {
        const abb = getStoreAbbreviation(stores.find(s => s.id === b.storeId)?.name || b.storeName);
        msg += `   └ [${abb}] ${b.storeName}: ${b.quantity} kg (${b.status})\n`;
      });
      msg += `\n`;
    });
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  };

  // Safeguard role access: only Admin or Store Manager should view HQ
  if (role !== 'Admin' && role !== 'Store Manager') {
    return (
      <div className="py-12 text-center max-w-lg mx-auto">
        <div className="bg-white border rounded-3xl p-8 shadow-sm space-y-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center text-2xl mx-auto">
            ⚠️
          </div>
          <h3 className="text-base font-black text-slate-900">Access Denied</h3>
          <p className="text-xs text-slate-500">
            Head Office central administration views are limited to **Administrator** or **Store Manager** roles only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Central Command Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        {/* Decorative ambient background accents */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-60 h-60 bg-emerald-600/5 rounded-full blur-2xl -ml-20 -mb-20"></div>

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/20 border border-emerald-500/30 text-[10px] text-emerald-400 font-extrabold tracking-wider uppercase">
              🏢 CENTRAL COMMAND HQ
            </div>
            <h2 className="text-2xl font-black tracking-tight">Farmer's Gate Head Office</h2>
            <p className="text-xs text-slate-400 max-w-xl">
              Control all stores, examine live local inventories, consolidate procurement requirements, and handle instant dispatches from this unified, responsive HQ panel.
            </p>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl flex items-center gap-4 shrink-0 shadow-inner">
            <div className="h-10 w-10 bg-emerald-500 rounded-xl flex items-center justify-center text-2xl">
              🏪
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Operational Outlets</p>
              <p className="text-lg font-black text-emerald-400">{activeStoresCount} <span className="text-xs font-normal text-slate-400">/ {totalStoresCount} Active</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Network Overview Grid Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pending Requirements</p>
            <p className="text-2xl font-black text-amber-600">{totalPendingReqsCount}</p>
            <span className="text-[10px] text-slate-400 font-medium">Require HQ dispatching</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 text-xl">
            ⏳
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Consolidation</p>
            <p className="text-2xl font-black text-slate-900">{consolidatedReqs.length} <span className="text-xs font-normal text-slate-400">crops</span></p>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
              <Layers className="h-3 w-3" /> Grouped by product
            </span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
            📦
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Live Network Stock</p>
            <p className="text-2xl font-black text-slate-900">{totalInventoryKg.toLocaleString()} <span className="text-xs font-normal text-slate-400">kg</span></p>
            <span className="text-[10px] text-slate-500 font-medium">Monitored from Head Office</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 text-xl">
            🥬
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div className="space-y-1">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Network Cumulative Revenue</p>
            <p className="text-2xl font-black text-emerald-600">₹{totalNetworkRevenue.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-600 font-bold">Sum of all branch billing</span>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
            ₹
          </div>
        </div>

      </div>

      {/* Main Multi-Tab Navigation Hub */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('requirements')}
            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'requirements' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>📥</span> Dispatch Requirements
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'inventory' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🥬</span> Outlet Inventories
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('stores')}
            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'stores' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🏬</span> Outlet Branches
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('master-catalog')}
            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'master-catalog' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🏷️</span> Master Catalog
          </button>
        </div>

        <div className="flex items-center gap-2 px-2 shrink-0">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-mono text-slate-500 font-extrabold uppercase tracking-wide">
            HQ Live Monitoring Active
          </span>
        </div>
      </div>

      {/* Sub Split Screen Layout dependent on activeTab */}
      {activeTab === 'requirements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel: Direct HQ Allocation Action Console */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                <Send className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Direct HQ Allocation</h3>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed">
                Manually push emergency supply quantities directly into any outlet. If the crop is new to that store, a fresh stock slot is created.
              </p>

              <form onSubmit={handleDirectDispatchSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-450">Destination Store</label>
                  <select
                    required
                    value={distStoreId}
                    onChange={(e) => setDistStoreId(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-55/60 text-slate-700"
                  >
                    <option value="">-- Choose Store --</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>
                        [{getStoreAbbreviation(s.name)}] {s.name.replace("Farmer's Gate - ", "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-450">Crop Vegetable Selection</label>
                  <select
                    required
                    value={distCropName}
                    onChange={(e) => setDistCropName(e.target.value)}
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-55/60 text-slate-700"
                  >
                    <option value="Tomatoes (Tamatar)">🍅 Tomatoes (Tamatar)</option>
                    <option value="Potatoes (Aloo)">🥔 Potatoes (Aloo)</option>
                    <option value="Onions (Pyaj)">🧅 Onions (Pyaj)</option>
                    <option value="Spinach (Palak)">🥬 Spinach (Palak)</option>
                    <option value="Cauliflower (Phool Gobhi)">🥦 Cauliflower (Phool Gobhi)</option>
                    <option value="Mangoes (Aam)">🥭 Mangoes (Aam)</option>
                    <option value="Bananas (Kela)">🍌 Bananas (Kela)</option>
                    <option value="Apples (Seb)">🍎 Apples (Seb)</option>
                    <option value="Carrots (Gajar)">🥕 Carrots (Gajar)</option>
                    <option value="Coriander (Dhaniya)">🌿 Coriander (Dhaniya)</option>
                    <option value="Chili (Mirch)">🌶️ Chili (Mirch)</option>
                    <option value="Garlic (Lahsun)">🧄 Garlic (Lahsun)</option>
                    <option value="Ginger (Adrak)">🫚 Ginger (Adrak)</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Qty (kg)</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={distQty}
                      onChange={(e) => setDistQty(Math.max(0.01, parseFloat(e.target.value) || 0))}
                      className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-2 focus:outline-none bg-slate-50/50 text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Cost (₹/kg)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={distCost}
                      onChange={(e) => setDistCost(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-2 focus:outline-none bg-slate-50/50 text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Price (₹/kg)</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={distPrice}
                      onChange={(e) => setDistPrice(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-2 focus:outline-none bg-slate-50/50 text-center"
                    />
                  </div>
                </div>

                {distSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-extrabold text-center animate-pulse">
                    {distSuccessMsg}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-xl transition-all uppercase tracking-wide cursor-pointer"
                >
                  Confirm & Dispatch Stock
                </button>
              </form>
            </div>

            <div className="bg-slate-55 rounded-3xl p-5 border border-slate-200 space-y-3.5 bg-white shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-emerald-600" />
                <h4 className="font-extrabold text-xs text-slate-900 uppercase">Procurement Helper</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Requirement filings raised by branch outlet managers appear here. Click <strong>DISPATCH</strong> to push the required volume directly to their localized digital inventory database instantly.
              </p>
            </div>
          </div>

          {/* Right Panel: Requirements Tabs & Action lists */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
              
              {/* Requirements view switcher sub tab */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <h3 className="font-extrabold text-sm text-slate-900">Branch Stock Requirements</h3>
                  <p className="text-[11px] text-slate-400">Monitor individual outlet supply requirements or view aggregate consolidated volumes across all branches.</p>
                </div>

                <div className="bg-slate-100 p-1 rounded-xl grid grid-cols-2 gap-1 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setReqSubTab('itemized')}
                    className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      reqSubTab === 'itemized' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Itemized Requests ({requirements.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setReqSubTab('consolidated')}
                    className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      reqSubTab === 'consolidated' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Consolidated ({consolidatedReqs.length})
                  </button>
                </div>
              </div>

              {/* Sub-tab view: Itemized Requests */}
              {reqSubTab === 'itemized' && (
                <div className="space-y-4">
                  {/* Filter and search bar controls */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Search Crop</span>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search crop..."
                          value={cropSearch}
                          onChange={(e) => setCropSearch(e.target.value)}
                          className="w-full pl-8 pr-2 py-1.5 rounded-lg border border-slate-250 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Status Filter</span>
                      <div className="grid grid-cols-4 gap-0.5 bg-slate-200 p-0.5 rounded-lg">
                        {(['all', 'Pending', 'Ordered', 'Fulfilled'] as const).map(f => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => setRequirementFilter(f)}
                            className={`text-[9px] font-extrabold py-1 rounded transition-all cursor-pointer text-center truncate ${
                              requirementFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {f === 'all' ? 'All' : f}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Priority Filter</span>
                      <div className="grid grid-cols-4 gap-0.5 bg-slate-200 p-0.5 rounded-lg">
                        {(['all', 'High', 'Medium', 'Low'] as const).map(p => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setPriorityFilter(p)}
                            className={`text-[9px] font-extrabold py-1 rounded transition-all cursor-pointer text-center truncate ${
                              priorityFilter === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            {p === 'all' ? 'All' : p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* List of requirements with Store Abbreviation badge and detail */}
                  <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                    {filteredRequirements.map(req => {
                      const requestingStore = stores.find(s => s.id === req.storeId);
                      const storeName = requestingStore ? requestingStore.name.replace("Farmer's Gate - ", "") : 'Unknown Store';
                      const storeAbbr = requestingStore ? getStoreAbbreviation(requestingStore.name) : 'UNK';
                      const emoji = getVegEmoji(req.vegetableName);
                      
                      return (
                        <div 
                          key={req.id} 
                          className={`border rounded-2xl p-4 transition-all relative overflow-hidden bg-white hover:border-emerald-500/25 ${
                            req.status === 'Pending' 
                              ? 'border-slate-200/80 bg-white shadow-sm' 
                              : req.status === 'Ordered' 
                                ? 'border-amber-200 bg-amber-50/10' 
                                : 'border-emerald-100 bg-emerald-50/5'
                          }`}
                        >
                          {/* Corner priority ribbon accent */}
                          <div className={`absolute top-0 right-0 h-1 px-4 text-[8px] font-black tracking-widest text-white uppercase flex items-center justify-center rounded-bl ${
                            req.priority === 'High' ? 'bg-rose-500' : req.priority === 'Medium' ? 'bg-amber-500' : 'bg-slate-400'
                          }`}>
                            {req.priority}
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                            
                            {/* Left: Info details */}
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                                {emoji}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="font-extrabold text-xs sm:text-sm text-slate-900">{req.vegetableName}</h4>
                                  
                                  {/* Store Abbreviation display tag */}
                                  <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded flex items-center gap-1 shadow-sm" title={`Store Abbreviation: ${storeAbbr}`}>
                                    🏢 {storeAbbr}
                                  </span>
                                  <span className="text-[10px] font-semibold text-slate-500">
                                    {storeName}
                                  </span>
                                </div>
                                
                                <p className="text-xs font-black text-slate-850">
                                  Requested Volume: <span className="text-emerald-700 underline font-black">{req.quantity} kg</span>
                                </p>
                                
                                {req.notes && (
                                  <p className="text-[10px] text-slate-500 italic mt-1 bg-slate-50 p-1.5 rounded border border-slate-100 max-w-md">
                                    📝 Notes: "{req.notes}"
                                  </p>
                                )}
                                
                                <p className="text-[9px] text-slate-400 font-medium">
                                  Filed on: {new Date(req.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {/* Right: Actions and Status Pills */}
                            <div className="flex items-center gap-2 sm:self-center self-end">
                              
                              {/* Status Label badge */}
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border tracking-wider shrink-0 ${
                                req.status === 'Pending' 
                                  ? 'bg-amber-50 text-amber-700 border-amber-200' 
                                  : req.status === 'Ordered' 
                                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`}>
                                {req.status === 'Pending' ? '⌛ Pending HQ' : req.status === 'Ordered' ? '🚚 Sourced' : '✓ Stock Fulfilled'}
                              </span>

                              {/* Interactive Buttons for Head Office */}
                              {req.status === 'Pending' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDispatchRequirement(req)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                                    title="Instantly dispatch stock to branch inventory"
                                  >
                                    <Check className="h-3.5 w-3.5" /> DISPATCH
                                  </button>
                                  <button
                                    onClick={() => onUpdateRequirementStatus(req.id, 'Ordered')}
                                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] px-2 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
                                    title="Mark as Ordered from suppliers"
                                  >
                                    MARK SOURCED
                                  </button>
                                  <button
                                    onClick={() => {
                                      if(confirm("Are you sure you want to remove this requirement?")) {
                                        onDeleteRequirement(req.id);
                                      }
                                    }}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
                                    title="Decline/Delete Requirement"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}

                              {req.status === 'Ordered' && (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDispatchRequirement(req)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                                    title="Approve and dispatch actual stock to branch inventory"
                                  >
                                    <Check className="h-3.5 w-3.5" /> DISPATCH NOW
                                  </button>
                                  <button
                                    onClick={() => {
                                      if(confirm("Are you sure you want to delete this file?")) {
                                        onDeleteRequirement(req.id);
                                      }
                                    }}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 p-1.5 rounded-lg cursor-pointer"
                                    title="Decline/Delete"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}

                              {req.status === 'Fulfilled' && (
                                <button
                                  disabled
                                  className="bg-slate-100 text-slate-400 border border-slate-200 text-[10px] font-bold px-2 py-1 rounded-lg cursor-not-allowed uppercase"
                                >
                                  DISPATCHED
                                </button>
                              )}

                            </div>

                          </div>
                        </div>
                      );
                    })}

                    {filteredRequirements.length === 0 && (
                      <div className="py-12 border border-dashed border-slate-200 rounded-3xl text-center">
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">No matching requirements found</p>
                        <p className="text-[11px] text-slate-400 mt-1">Adjust filters or search criteria above.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-tab view: Consolidated Requirements of all stores */}
              {reqSubTab === 'consolidated' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    <div className="space-y-0.5">
                      <p className="text-xs font-black text-slate-900 uppercase">Consolidated Crop Orders</p>
                      <p className="text-[10px] text-slate-500">All pending or sourcing branch requirements grouped together for wholesale bulk orders.</p>
                    </div>
                    
                    {consolidatedReqs.length > 0 && (
                      <a
                        href={getWhatsAppConsolidatedMessage()}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> SHARE WHOLESALE FILE
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                    {consolidatedReqs.map((cr, idx) => {
                      const vegEmoji = getVegEmoji(cr.vegetableName);
                      return (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl">{vegEmoji}</span>
                                <h4 className="font-extrabold text-sm text-slate-900">{cr.vegetableName}</h4>
                              </div>
                              <span className="text-xs bg-emerald-50 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full border border-emerald-100">
                                Total {cr.totalQuantity} kg
                              </span>
                            </div>

                            {/* Detailed stores breakdown with abbreviations */}
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                              <p className="font-black text-[9px] uppercase tracking-wider text-slate-400 border-b border-slate-200/50 pb-1 mb-1.5">
                                Branch Outlet Breakdown:
                              </p>
                              {cr.storesBreakdown.map((b, bIdx) => {
                                const targetStore = stores.find(s => s.id === b.storeId);
                                const storeAbbr = getStoreAbbreviation(targetStore ? targetStore.name : b.storeName);
                                return (
                                  <div key={bIdx} className="flex items-center justify-between text-slate-650">
                                    <span className="flex items-center gap-1.5">
                                      <span className="bg-slate-200 text-slate-800 text-[9px] font-black px-1.5 py-0.5 rounded">
                                        {storeAbbr}
                                      </span>
                                      <span className="font-medium truncate max-w-[100px]">{b.storeName}</span>
                                    </span>
                                    <span className="font-mono font-bold text-slate-800 flex items-center gap-2">
                                      {b.quantity} kg 
                                      <span className={`text-[8px] uppercase px-1.5 py-0.2 rounded-full ${
                                        b.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {b.status}
                                      </span>
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {cr.storesBreakdown.length} outlets waiting
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => {
                                // Dispatch each pending/ordered requirement in the list sequentially
                                if(confirm(`Are you sure you want to approve and dispatch bulk stock across all ${cr.storesBreakdown.length} requesting outlets?`)) {
                                  cr.storesBreakdown.forEach(b => {
                                    const reqToDispatch = requirements.find(r => r.id === b.requirementId);
                                    if (reqToDispatch && reqToDispatch.status !== 'Fulfilled') {
                                      handleDispatchRequirement(reqToDispatch);
                                    }
                                  });
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1"
                            >
                              <Check className="h-3 w-3" /> DISPATCH ALL
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {consolidatedReqs.length === 0 && (
                      <div className="col-span-2 py-12 border border-dashed border-slate-200 rounded-3xl text-center">
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-wider">No active requirements to consolidate</p>
                        <p className="text-[11px] text-slate-400 mt-1">All branch outlet requirements are currently fulfilled.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      )}

      {/* --- INVENTORY OPTION: Show All Stores Inventory --- */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Inventory search and filter parameters */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-emerald-600" />
                <h3 className="font-extrabold text-sm text-slate-900">All Stores Stock Inventory Monitor</h3>
              </div>
              <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full">
                {filteredInventory.length} slots tracked across the network
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Store Select Filter */}
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Filter By Outlet</span>
                <select
                  value={inventoryStoreFilter}
                  onChange={(e) => setInventoryStoreFilter(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-700"
                >
                  <option value="all">All Stores Combined</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>
                      [{getStoreAbbreviation(s.name)}] {s.name.replace("Farmer's Gate - ", "")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Crop Search Filter */}
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Search Crop Name</span>
                <div className="relative">
                  <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search e.g. Tomatoes..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              {/* Alert status filter */}
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Alert Status Filter</span>
                <div className="grid grid-cols-3 gap-0.5 bg-slate-200 p-0.5 rounded-lg h-[38px] items-center">
                  {(['all', 'low', 'normal'] as const).map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setInventoryStockStatusFilter(st)}
                      className={`text-[9px] font-extrabold py-1.5 rounded transition-all cursor-pointer text-center truncate ${
                        inventoryStockStatusFilter === st ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {st === 'all' ? 'All' : st === 'low' ? '⚠️ Low' : '✓ Good'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dispatch quick trigger helper */}
              <div className="space-y-1 self-end">
                <button
                  type="button"
                  onClick={() => {
                    setInventoryStoreFilter('all');
                    setInventorySearch('');
                    setInventoryStockStatusFilter('low');
                  }}
                  className="w-full h-[38px] text-[10px] font-black uppercase bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <AlertTriangle className="h-3.5 w-3.5" /> Show Low Stocks
                </button>
              </div>

            </div>

            {/* Inventory table/grid layout */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase tracking-wider text-[10px] border-b border-slate-200">
                      <th className="p-3.5">Store / Code</th>
                      <th className="p-3.5">Crop Vegetable</th>
                      <th className="p-3.5 text-right">Available Qty</th>
                      <th className="p-3.5 text-right">Cost Price</th>
                      <th className="p-3.5 text-right">Selling Price</th>
                      <th className="p-3.5 text-right">Total Stock Value</th>
                      <th className="p-3.5 text-center">Stock Safety Status</th>
                      <th className="p-3.5 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium">
                    {filteredInventory.map((item, index) => {
                      const targetStore = stores.find(s => s.id === item.storeId);
                      const storeName = targetStore ? targetStore.name.replace("Farmer's Gate - ", "") : 'Unknown';
                      const storeAbbr = targetStore ? getStoreAbbreviation(targetStore.name) : 'UNK';
                      const isLow = item.quantity <= item.minStockThreshold;
                      const stockVal = item.quantity * item.costPrice;
                      
                      if (editingItemId === item.id) {
                        return (
                          <tr key={item.id} className="bg-emerald-55/20 border-2 border-emerald-550">
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="bg-slate-900 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow-sm">
                                  {storeAbbr}
                                </span>
                                <span className="font-semibold text-slate-700">{storeName}</span>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <input
                                type="text"
                                value={editInvName}
                                onChange={(e) => setEditInvName(e.target.value)}
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-xs font-semibold focus:outline-none focus:border-emerald-500 bg-white"
                              />
                            </td>
                            <td className="p-3.5 text-right">
                              <input
                                type="number"
                                step="0.1"
                                value={editInvQty}
                                onChange={(e) => setEditInvQty(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-20 text-right rounded border border-zinc-200 px-2 py-1 text-xs font-mono focus:outline-none focus:border-emerald-500 bg-white"
                              />
                            </td>
                            <td className="p-3.5 text-right">
                              <input
                                type="number"
                                step="0.1"
                                value={editInvCost}
                                onChange={(e) => setEditInvCost(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-16 text-right rounded border border-zinc-200 px-2 py-1 text-xs font-mono focus:outline-none focus:border-emerald-500 bg-white"
                              />
                            </td>
                            <td className="p-3.5 text-right">
                              <input
                                type="number"
                                step="0.1"
                                value={editInvPrice}
                                onChange={(e) => setEditInvPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                className="w-16 text-right rounded border border-zinc-200 px-2 py-1 text-xs font-mono focus:outline-none focus:border-emerald-500 bg-white"
                              />
                            </td>
                            <td className="p-3.5 text-right font-mono text-slate-950 font-black">
                              ₹{(editInvQty * editInvCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex items-center gap-1.5 justify-center">
                                <span className="text-[10px] text-zinc-400 font-bold uppercase">Thresh:</span>
                                <input
                                  type="number"
                                  value={editInvThreshold}
                                  onChange={(e) => setEditInvThreshold(Math.max(0, parseInt(e.target.value) || 0))}
                                  className="w-14 text-center rounded border border-zinc-200 px-1 py-0.5 text-xs font-mono focus:outline-none bg-white"
                                />
                              </div>
                            </td>
                            <td className="p-3.5 text-center">
                              <div className="flex gap-1.5 justify-center">
                                <button
                                  type="button"
                                  onClick={() => saveEditingItem(item)}
                                  className="text-[10px] font-black uppercase bg-emerald-600 hover:bg-emerald-700 text-white rounded px-2 py-1 cursor-pointer shadow-sm"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItemId(null)}
                                  className="text-[10px] font-black uppercase bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-300 rounded px-2 py-1 cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      
                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/50 ${index % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className="bg-slate-900 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow-sm">
                                {storeAbbr}
                              </span>
                              <span className="font-semibold text-slate-700">{storeName}</span>
                            </div>
                          </td>
                          <td className="p-3.5 font-bold text-slate-900">
                            <span className="mr-1.5">{getVegEmoji(item.vegetableName)}</span>
                            {item.vegetableName}
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-slate-800 text-sm">
                            {item.quantity.toLocaleString()} kg
                          </td>
                          <td className="p-3.5 text-right font-mono text-slate-500">
                            ₹{item.costPrice.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-right font-mono text-emerald-600 font-bold">
                            ₹{item.sellingPrice.toFixed(2)}
                          </td>
                          <td className="p-3.5 text-right font-mono font-black text-slate-900">
                            ₹{stockVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="p-3.5 text-center">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-black uppercase rounded-full">
                                <AlertTriangle className="h-3 w-3 animate-bounce" /> Low Stock ({item.minStockThreshold}kg limit)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase rounded-full">
                                <CheckCircle className="h-3 w-3" /> Safety Secure
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <button
                                type="button"
                                onClick={() => startEditingItem(item)}
                                className="text-[10px] font-black uppercase bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded px-2.5 py-1 cursor-pointer transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // Prepopulate distribution form at the bottom
                                  setDistStoreId(item.storeId);
                                  setDistCropName(item.vegetableName);
                                  setDistQty(50);
                                  setDistCost(item.costPrice);
                                  setDistPrice(item.sellingPrice);
                                  // Scroll or focus alert message
                                  alert(`Prepopulated direct dispatch form below with emergency stock variables for ${item.vegetableName} destined for store branch [ ${storeAbbr} ]!`);
                                }}
                                className="text-[10px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded px-2.5 py-1 cursor-pointer transition-colors"
                              >
                                ⚡ Allocate
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredInventory.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-12 text-center text-slate-400 italic">
                          No matching inventory items found. Adjust parameters above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Allocation form section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Send className="h-5 w-5 text-emerald-600" />
              <h3 className="font-extrabold text-sm text-slate-900">HQ Stock Allocation & Emergency Replenishment Form</h3>
            </div>
            
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
              Fill up this direct form or click <strong>"⚡ ALLOCATE STOCK"</strong> in the live table above to instantly inject bulk crates into target branch outlets.
            </p>

            <form onSubmit={handleDirectDispatchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Destination Store</span>
                <select
                  required
                  value={distStoreId}
                  onChange={(e) => setDistStoreId(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-700"
                >
                  <option value="">-- Select Store --</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>
                      [{getStoreAbbreviation(s.name)}] {s.name.replace("Farmer's Gate - ", "")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Crop Select</span>
                <select
                  required
                  value={distCropName}
                  onChange={(e) => setDistCropName(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-700"
                >
                  <option value="Tomatoes (Tamatar)">🍅 Tomatoes (Tamatar)</option>
                  <option value="Potatoes (Aloo)">🥔 Potatoes (Aloo)</option>
                  <option value="Onions (Pyaj)">🧅 Onions (Pyaj)</option>
                  <option value="Spinach (Palak)">🥬 Spinach (Palak)</option>
                  <option value="Cauliflower (Phool Gobhi)">🥦 Cauliflower (Phool Gobhi)</option>
                  <option value="Mangoes (Aam)">🥭 Mangoes (Aam)</option>
                  <option value="Bananas (Kela)">🍌 Bananas (Kela)</option>
                  <option value="Apples (Seb)">🍎 Apples (Seb)</option>
                  <option value="Carrots (Gajar)">🥕 Carrots (Gajar)</option>
                  <option value="Coriander (Dhaniya)">🌿 Coriander (Dhaniya)</option>
                  <option value="Chili (Mirch)">🌶️ Chili (Mirch)</option>
                  <option value="Garlic (Lahsun)">🧄 Garlic (Lahsun)</option>
                  <option value="Ginger (Adrak)">🫚 Ginger (Adrak)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-1.5 lg:col-span-2">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Qty (kg)</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={distQty}
                    onChange={(e) => setDistQty(Math.max(0.01, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-2 focus:outline-none bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Cost (₹/kg)</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={distCost}
                    onChange={(e) => setDistCost(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-2 focus:outline-none bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Price (₹/kg)</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={distPrice}
                    onChange={(e) => setDistPrice(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-2 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2.5 rounded-xl uppercase tracking-wide cursor-pointer h-[38px] flex items-center justify-center gap-1"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>

            {distSuccessMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-800 font-extrabold text-center animate-pulse">
                {distSuccessMsg}
              </div>
            )}
          </div>

        </div>
      )}

      {/* --- STORE DIRECTORY OPTION: Complete details of each store --- */}
      {activeTab === 'stores' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-2">
            <h3 className="font-extrabold text-sm text-slate-900">Branch Outlets - Master Profile Directory</h3>
            <p className="text-[11px] text-slate-500">
              Review extensive, complete database fields, real-time local statistics, low-stock warnings lists, and cumulative sales records for each operational outlet in the network.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stores.map(store => {
              const abbr = getStoreAbbreviation(store.name);
              const cleanName = store.name.replace("Farmer's Gate - ", "");
              const items = inventory.filter(item => item.storeId === store.id);
              const storeLowStock = items.filter(item => item.quantity <= item.minStockThreshold);
              const cumulativeVal = getStoreStockValue(store.id);
              const rev = getStoreSalesTotal(store.id);
              const vol = getStoreSalesVolume(store.id);
              const count = getStoreSalesCount(store.id);
              const avgPrice = count > 0 ? (rev / vol) : 0;
              
              return (
                <div key={store.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                  
                  {/* Card Header Profile Banner */}
                  <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm bg-emerald-600 font-black px-2 py-0.5 rounded tracking-wide text-white shadow-sm">
                          {abbr}
                        </span>
                        <h4 className="font-black text-sm tracking-tight">{cleanName}</h4>
                      </div>
                      <p className="text-[10px] text-slate-400">Database ID: {store.id}</p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                      store.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {store.isActive ? '● ACTIVE LIVE' : 'OFFLINE'}
                    </span>
                  </div>

                  {/* Complete Store Profiles metadata detail table */}
                  <div className="p-5 space-y-4 flex-1">
                    
                    {/* Basic details */}
                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Branch Location</p>
                        <p className="font-extrabold text-slate-850 flex items-center gap-1 text-[11px]">
                          📍 {store.location || 'Not Specified'}
                        </p>
                      </div>

                      <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">Creation Date</p>
                        <p className="font-extrabold text-slate-850 flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" /> {new Date(store.createdAt).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 col-span-2">
                        <p className="text-[8px] font-black uppercase tracking-wider text-slate-400">WhatsApp Contact Number</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="font-mono font-black text-slate-800 text-[11px] flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-emerald-600" /> {store.whatsappNumber || 'No phone logged'}
                          </p>
                          {store.whatsappNumber && (
                            <a 
                              href={`https://wa.me/${store.whatsappNumber}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-[9px] font-black text-slate-900 bg-white border border-slate-350 hover:bg-slate-50 px-2 py-0.5 rounded shadow-sm flex items-center gap-1"
                            >
                              💬 CHAT MANAGER
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Financial Statistics breakdown */}
                    <div className="space-y-1.5 pt-2">
                      <p className="font-black text-[9px] uppercase tracking-wider text-slate-400">Live Financial & Auditing Analytics</p>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="border border-slate-150 p-2 rounded-xl bg-white">
                          <span className="text-[8px] uppercase text-slate-400 block font-bold">Stock Value</span>
                          <span className="font-black text-slate-850">₹{cumulativeVal.toLocaleString()}</span>
                        </div>
                        <div className="border border-slate-150 p-2 rounded-xl bg-white">
                          <span className="text-[8px] uppercase text-slate-400 block font-bold">Total Sales</span>
                          <span className="font-black text-emerald-600">₹{rev.toLocaleString()}</span>
                        </div>
                        <td className="border border-slate-150 p-2 rounded-xl bg-white flex flex-col justify-center">
                          <span className="text-[8px] uppercase text-slate-400 block font-bold">Total Volume</span>
                          <span className="font-black text-slate-800">{vol.toLocaleString()} kg</span>
                        </td>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono mt-1 px-1">
                        <div>Avg Selling Price: <strong>₹{avgPrice.toFixed(2)}/kg</strong></div>
                        <div className="text-right">Total invoices: <strong>{count} sales</strong></div>
                      </div>
                    </div>

                    {/* Low Stock Alerts for this specific store */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-[9px] uppercase tracking-wider text-slate-400">Stock Safety Checklist</p>
                        <span className={`text-[9px] font-extrabold px-2 py-0.2 rounded-full ${
                          storeLowStock.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {storeLowStock.length} items low
                        </span>
                      </div>

                      {storeLowStock.length > 0 ? (
                        <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100 space-y-1.5 max-h-[140px] overflow-y-auto">
                          {storeLowStock.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-[11px] font-semibold text-rose-800">
                              <span className="flex items-center gap-1.5">
                                <span>{getVegEmoji(item.vegetableName)}</span>
                                <span>{item.vegetableName}</span>
                              </span>
                              <span className="font-mono text-[10px] font-bold">
                                {item.quantity} kg <span className="text-rose-400 font-normal">/ min {item.minStockThreshold}kg</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-emerald-50/30 p-2.5 rounded-2xl border border-emerald-100 text-[11px] text-emerald-800 font-extrabold flex items-center gap-1.5 justify-center">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Perfect Balance! No crop items under threshold.
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Card Actions Footer */}
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                      Total Items Tracked: {items.length} crops
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('inventory');
                        setInventoryStoreFilter(store.id);
                        setInventorySearch('');
                        setInventoryStockStatusFilter('all');
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      Inspect Store Inventory ➔
                    </button>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB CONTENT: MASTER PRICE CATALOG TEMPLATES */}
      {activeTab === 'master-catalog' && (
        <div className="space-y-6 animate-fade-in text-slate-900">
          
          {/* Main info card */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-md border border-slate-700/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <Tag className="h-5 w-5" />
                </span>
                <h3 className="font-extrabold text-lg">Central Master Inventory Catalog & Presets</h3>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                Define standardized crops, reference category tags, wholesale cost templates, and uniform customer prices. Sync updates instantly to all live outlet cash registers across the nation.
              </p>
            </div>
            <button
              type="button"
              onClick={openNewCropForm}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 self-start md:self-auto"
            >
              <Plus className="h-4 w-4 stroke-[3px]" /> Add Standard Crop
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Catalog Templates</p>
                <h4 className="text-xl font-extrabold text-slate-800">{masterCrops.length} Crops</h4>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Gross Margin</p>
                <h4 className="text-xl font-extrabold text-slate-800">
                  {masterCrops.length > 0
                    ? `₹${(masterCrops.reduce((sum, c) => sum + (c.sellingPrice - c.costPrice), 0) / masterCrops.length).toFixed(1)}/kg`
                    : '₹0/kg'
                  }
                </h4>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Store Outlets Linked</p>
                <h4 className="text-xl font-extrabold text-slate-800">{stores.length} Branches</h4>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Inventory Slots</p>
                <h4 className="text-xl font-extrabold text-slate-800">{inventory.length} Placements</h4>
              </div>
            </div>
          </div>

          {/* Master Catalog Search & Filters Row */}
          <div className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search standard crop profiles e.g. Onion, Mango..."
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-emerald-500 bg-slate-50/40 text-slate-800 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category:</span>
              <div className="flex flex-wrap gap-1">
                {(['all', 'Vegetable', 'Fruit', 'Herbs', 'Grocery', 'Other'] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMasterCategoryFilter(cat)}
                    className={`text-[10px] font-extrabold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      masterCategoryFilter === cat
                        ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Master Crop Catalog Templates Cards Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {masterCrops
              .filter(crop => {
                const matchesSearch = crop.vegetableName.toLowerCase().includes(masterSearch.toLowerCase());
                const matchesCategory = masterCategoryFilter === 'all' || crop.category === masterCategoryFilter;
                return matchesSearch && matchesCategory;
              })
              .map(crop => {
                const activeStoresCount = inventory.filter(
                  item => item.vegetableName.toLowerCase() === crop.vegetableName.toLowerCase()
                ).length;
                const margin = crop.sellingPrice - crop.costPrice;
                const marginPercent = crop.costPrice > 0 ? Math.round((margin / crop.costPrice) * 100) : 0;

                return (
                  <div key={crop.id} className="bg-white border border-slate-200/70 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-md transition-all relative overflow-hidden group">
                    
                    {/* Corner badge for category */}
                    <span className={`absolute top-0 right-0 text-[9px] font-black uppercase px-4 py-1.5 rounded-bl-2xl tracking-wider ${
                      crop.category === 'Vegetable' 
                        ? 'bg-emerald-50 text-emerald-700 border-l border-b border-emerald-100' 
                        : crop.category === 'Fruit' 
                        ? 'bg-amber-50 text-amber-700 border-l border-b border-amber-100' 
                        : crop.category === 'Herbs' 
                        ? 'bg-teal-50 text-teal-700 border-l border-b border-teal-100'
                        : 'bg-purple-50 text-purple-700 border-l border-b border-purple-100'
                    }`}>
                      {crop.category}
                    </span>

                    {/* Header */}
                    <div className="space-y-1 mb-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">{getVegEmoji(crop.vegetableName)}</span>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">{crop.vegetableName}</h4>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">
                        Preset Threshold: <span className="text-slate-600">{crop.minStockThreshold} kg</span>
                      </p>
                    </div>

                    {/* Pricing Detail Block */}
                    <div className="bg-slate-50/80 border border-slate-150 rounded-2xl p-3.5 space-y-2 mb-5">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="border-r border-slate-200/60 pb-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Std Wholesale Cost</p>
                          <p className="text-base font-extrabold text-slate-800">₹{crop.costPrice}<span className="text-[10px] font-normal text-slate-400">/kg</span></p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Std Selling Price</p>
                          <p className="text-base font-extrabold text-emerald-600">₹{crop.sellingPrice}<span className="text-[10px] font-normal text-slate-400">/kg</span></p>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/60 pt-2 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-slate-400">Standard Gross Margin:</span>
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">
                          ₹{margin}/kg
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md font-black">+{marginPercent}%</span>
                        </span>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="border-t border-slate-100 pt-4 flex items-center justify-between gap-1 mt-auto">
                      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-slate-300" />
                        <span>In {activeStoresCount} Stores</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditCropForm(crop)}
                          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                          title="Edit Master Template"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePushPricingToStores(crop)}
                          className="bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 hover:border-emerald-200 font-extrabold text-[10px] px-2.5 py-1.5 rounded-xl transition-all cursor-pointer"
                          title="Push standard pricing config to active branch levels"
                        >
                          Push to Stores ⚡
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete the Master Template for "${crop.vegetableName}"?`)) {
                              onDeleteMasterCrop(crop.id);
                            }
                          }}
                          className="p-2 hover:bg-rose-50 rounded-xl text-rose-400 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                          title="Delete Template Profile"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}

            {masterCrops.filter(crop => {
              const matchesSearch = crop.vegetableName.toLowerCase().includes(masterSearch.toLowerCase());
              const matchesCategory = masterCategoryFilter === 'all' || crop.category === masterCategoryFilter;
              return matchesSearch && matchesCategory;
            }).length === 0 && (
              <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
                <Tag className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Master Crops match search criteria</p>
                <p className="text-xs text-slate-400 mt-1">Refine your active filters or create a brand new template using the action button above.</p>
              </div>
            )}
          </div>

          {/* MASTER CROP MODAL / OVERLAY FORM */}
          {masterCropFormOpen && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-slide-up text-slate-800">
                
                {/* Modal Header */}
                <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm">{editingCropId ? '✏️ Edit Catalog Master Template' : '✨ Register New Crop Template'}</h3>
                    <p className="text-[10px] text-slate-300 mt-0.5">Define master cost and selling rules centrally</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMasterCropFormOpen(false);
                      setEditingCropId(null);
                    }}
                    className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSaveCropSubmit} className="p-6 space-y-4">
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Crop Vegetable Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tomato Premium, Strawberries Basket..."
                      value={cropFormName}
                      onChange={(e) => setCropFormName(e.target.value)}
                      className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Category Group</label>
                      <select
                        value={cropFormCategory}
                        onChange={(e) => setCropFormCategory(e.target.value as any)}
                        className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-800"
                      >
                        <option value="Vegetable">Vegetable</option>
                        <option value="Fruit">Fruit</option>
                        <option value="Herbs">Herbs</option>
                        <option value="Grocery">Grocery</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Stock Low Threshold (kg)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={cropFormMinThreshold}
                        onChange={(e) => setCropFormMinThreshold(Number(e.target.value))}
                        className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Std Cost Price (₹/kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={cropFormCost}
                        onChange={(e) => setCropFormCost(Number(e.target.value))}
                        className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-800"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Std Selling Price (₹/kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={cropFormPrice}
                        onChange={(e) => setCropFormPrice(Number(e.target.value))}
                        className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-800"
                      />
                    </div>
                  </div>

                  {/* Calculated summary inside modal */}
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-800">Target Profit Margin:</span>
                    <span className="font-extrabold text-emerald-900">
                      ₹{(cropFormPrice - cropFormCost).toFixed(2)}/kg ({cropFormCost > 0 ? Math.round(((cropFormPrice - cropFormCost) / cropFormCost) * 100) : 0}%)
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMasterCropFormOpen(false);
                        setEditingCropId(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-xs font-black bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-md transition-all cursor-pointer"
                    >
                      Save Template Profile
                    </button>
                  </div>

                </form>

              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
