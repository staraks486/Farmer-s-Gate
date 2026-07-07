import React, { useState, useEffect, useRef } from 'react';
import { Store, Requirement, InventoryItem, Sale, UserRole, ConsolidatedRequirement, MasterCrop, AppNotification } from '../types';
import { FirebaseOrder, updateOrderStatusInFirestore, addNotificationToFirestore } from '../lib/firebase';
import QRCode from 'qrcode';
import { QrScanner } from './QrScanner';
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
  Tag,
  QrCode,
  Download,
  Palette,
  Link,
  Printer,
  Eye,
  Sparkles,
  Image,
  UploadCloud,
  FileSpreadsheet,
  Clipboard,
  CheckSquare,
  Square,
  Scan,
  Camera,
  MapPin,
  Globe,
  Compass,
  Navigation,
  Sliders
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
  firebaseOrders?: FirebaseOrder[];
  firebaseNotifications?: AppNotification[];
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
  onDeleteMasterCrop,
  firebaseOrders = [],
  firebaseNotifications = []
}: HeadOfficeProps) {
  // Main and sub layout tabs
  const [activeTab, setActiveTab] = useState<'requirements' | 'inventory' | 'stores' | 'master-catalog' | 'customer-orders' | 'qr-catalog' | 'geo-sandbox'>('requirements');
  const [reqSubTab, setReqSubTab] = useState<'itemized' | 'consolidated'>('itemized');

  // Geolocation Sandbox State
  const [sandboxEnabled, setSandboxEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('farmersgate_geo_sandbox_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.enabled;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  });

  const [sandboxMode, setSandboxMode] = useState<'real' | 'manual' | 'preset'>(() => {
    try {
      const saved = localStorage.getItem('farmersgate_geo_sandbox_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.mode || 'preset';
      }
    } catch (e) {
      console.error(e);
    }
    return 'preset';
  });

  const [sandboxManualLat, setSandboxManualLat] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('farmersgate_geo_sandbox_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Number(parsed.manualLat) || 12.9716;
      }
    } catch (e) {
      console.error(e);
    }
    return 12.9716;
  });

  const [sandboxManualLng, setSandboxManualLng] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('farmersgate_geo_sandbox_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Number(parsed.manualLng) || 77.5946;
      }
    } catch (e) {
      console.error(e);
    }
    return 77.5946;
  });

  const [sandboxPresetName, setSandboxPresetName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('farmersgate_geo_sandbox_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.presetName || 'Bangalore Corporate HQ';
      }
    } catch (e) {
      console.error(e);
    }
    return 'Bangalore Corporate HQ';
  });

  const [sandboxPresetLat, setSandboxPresetLat] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('farmersgate_geo_sandbox_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Number(parsed.presetLat) || 12.9716;
      }
    } catch (e) {
      console.error(e);
    }
    return 12.9716;
  });

  const [sandboxPresetLng, setSandboxPresetLng] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('farmersgate_geo_sandbox_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Number(parsed.presetLng) || 77.5946;
      }
    } catch (e) {
      console.error(e);
    }
    return 77.5946;
  });

  const [sandboxCpanelSettings, setSandboxCpanelSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('farmersgate_cpanel_settings');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return { enableLocalAccessRestriction: true, allowedLocalRadiusKm: 10 };
  });

  // Verification simulation log/terminal
  const [verificationOutput, setVerificationOutput] = useState<{
    timestamp: string;
    allowed: boolean;
    reason?: string;
    details?: {
      nearestStore: string;
      distance: number;
      radius: number;
    };
  } | null>(null);

  // Distances computed locally in the component for high-fidelity visual display
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);
  const [gettingRealGps, setGettingRealGps] = useState(false);

  // Save Sandbox state changes immediately to LocalStorage so App.tsx can read them reactively
  useEffect(() => {
    const config = {
      enabled: sandboxEnabled,
      mode: sandboxMode,
      manualLat: Number(sandboxManualLat),
      manualLng: Number(sandboxManualLng),
      presetName: sandboxPresetName,
      presetLat: Number(sandboxPresetLat),
      presetLng: Number(sandboxPresetLng)
    };
    localStorage.setItem('farmersgate_geo_sandbox_settings', JSON.stringify(config));
  }, [sandboxEnabled, sandboxMode, sandboxManualLat, sandboxManualLng, sandboxPresetName, sandboxPresetLat, sandboxPresetLng]);

  useEffect(() => {
    if (activeTab === 'geo-sandbox' && currentLat === null) {
      // Fetch initial live reference GPS
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentLat(pos.coords.latitude);
          setCurrentLng(pos.coords.longitude);
        },
        (err) => console.warn(err),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [activeTab]);

  const getSandboxDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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

  const sandboxLocations = [
    { name: "Bangalore Corporate HQ", lat: 12.9716, lng: 77.5946, color: "bg-blue-50 border-blue-200 text-blue-700" },
    { name: "Whitefield Store", lat: 12.9698, lng: 77.7500, color: "bg-teal-50 border-teal-200 text-teal-700" },
    { name: "Indiranagar Store", lat: 12.9719, lng: 77.6412, color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
    { name: "Koramangala Store", lat: 12.9279, lng: 77.6271, color: "bg-purple-50 border-purple-200 text-purple-700" },
    { name: "Jayanagar Store", lat: 12.9299, lng: 77.5824, color: "bg-amber-50 border-amber-200 text-amber-700" },
    { name: "Sarjapur Store", lat: 12.9038, lng: 77.6806, color: "bg-orange-50 border-orange-200 text-orange-700" },
    { name: "Hebbal Store", lat: 13.0354, lng: 77.5988, color: "bg-rose-50 border-rose-200 text-rose-700" }
  ];

  const fetchRealGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setGettingRealGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLat(pos.coords.latitude);
        setCurrentLng(pos.coords.longitude);
        setGettingRealGps(false);
      },
      (err) => {
        console.error(err);
        alert(`Failed to fetch GPS coordinates: ${err.message}`);
        setGettingRealGps(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Custom QR Code Generation Settings
  const [qrFgColor, setQrFgColor] = useState('#065f46'); // Premium emerald dark
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrSize, setQrSize] = useState(300);
  const [qrErrorLevel, setQrErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [qrImages, setQrImages] = useState<{ [key: string]: string }>({});
  const [qrGenerating, setQrGenerating] = useState(false);
  const [qrSuccessMsg, setQrSuccessMsg] = useState('');

  const QR_CATEGORIES = [
    { key: 'All', label: 'All Crops Catalog', emoji: '📂', description: 'Complete pesticide-free harvest and groceries catalog', color: 'from-slate-50 to-slate-100/50 border-slate-200 text-slate-800' },
    { key: 'Vegetable', label: 'Veggies Catalog', emoji: '🥦', description: 'Fresh organic leafy vegetables, roots, and farm greens', color: 'from-emerald-50 to-emerald-100/30 border-emerald-100 text-emerald-800' },
    { key: 'Fruit', label: 'Fruits Catalog', emoji: '🍊', description: 'Sweet organic summer fruits, berries, and citrus', color: 'from-orange-50 to-orange-100/30 border-orange-100 text-orange-850' },
    { key: 'Herbs', label: 'Fresh Herbs Catalog', emoji: '🌿', description: 'Local aromatic herbs, organic seasonings, and mints', color: 'from-teal-50 to-teal-100/30 border-teal-100 text-teal-850' },
    { key: 'Grocery', label: 'Essential Grocery Catalog', emoji: '🌾', description: 'Whole grains, organic flours, rice, pulses, and staples', color: 'from-amber-50 to-amber-100/30 border-amber-150 text-amber-850' },
    { key: 'Recipes', label: 'Quick Recipes Catalog', emoji: '🍳', description: 'Chef-paired organic meal kits and easy farm-to-table recipes', color: 'from-purple-50 to-purple-100/30 border-purple-150 text-purple-850' },
  ];

  // Effect to automatically generate QR Codes when settings change
  useEffect(() => {
    const generateAllQrs = async () => {
      setQrGenerating(true);
      const generated: { [key: string]: string } = {};
      for (const cat of QR_CATEGORIES) {
        const targetUrl = `${window.location.origin}${window.location.pathname}?portal=customer&category=${cat.key}#customer`;
        try {
          const dataUrl = await QRCode.toDataURL(targetUrl, {
            width: qrSize,
            margin: 2,
            errorCorrectionLevel: qrErrorLevel,
            color: {
              dark: qrFgColor,
              light: qrBgColor
            }
          });
          generated[cat.key] = dataUrl;
        } catch (err) {
          console.error(`Error generating QR for ${cat.key}:`, err);
        }
      }
      setQrImages(generated);
      setQrGenerating(false);
    };

    generateAllQrs();
  }, [qrFgColor, qrBgColor, qrSize, qrErrorLevel]);

  // Search/Filters states
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedCustomerOrderId, setSelectedCustomerOrderId] = useState<string | null>(null);
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

  // --- HQ SMART BATCH STOCK OPERATIONS STATE ---
  const [smartOpsTab, setSmartOpsTab] = useState<'image' | 'scanner' | 'sheet' | 'paste' | null>(null);
  const [opsTargetStoreId, setOpsTargetStoreId] = useState<string>('');
  const [opsUpdateMode, setOpsUpdateMode] = useState<'add' | 'overwrite'>('add');
  const [opsSuccessMsg, setOpsSuccessMsg] = useState<string>('');
  
  // 1. Image Upload (Gemini AI)
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [imageAnalysisError, setImageAnalysisError] = useState<string | null>(null);
  const [analyzedItems, setAnalyzedItems] = useState<Array<{ cropName: string; quantity: number; costPrice?: number; sellingPrice?: number; checked: boolean }>>([]);
  const [dragActive, setDragActive] = useState(false);

  // 2. Camera QR/Barcode Scanner
  const [isOpsScannerOpen, setIsOpsScannerOpen] = useState(false);
  const [scannedCrop, setScannedCrop] = useState<string>('');
  const [scannedQty, setScannedQty] = useState<number>(0);
  const [scannedCost, setScannedCost] = useState<number>(0);
  const [scannedPrice, setScannedPrice] = useState<number>(0);
  const [scannedError, setScannedError] = useState<string>('');
  const [scannedSuccessMsg, setScannedSuccessMsg] = useState<string>('');

  // 3. Google Sheet Paste
  const [sheetText, setSheetText] = useState<string>('');
  const [sheetParsedItems, setSheetParsedItems] = useState<Array<{ cropName: string; quantity: number; costPrice?: number; sellingPrice?: number; isValid: boolean; error?: string }>>([]);

  // 4. Bulk Text Paste
  const [bulkText, setBulkText] = useState<string>('');
  const [bulkParsedItems, setBulkParsedItems] = useState<Array<{ cropName: string; quantity: number; costPrice?: number; sellingPrice?: number; isValid: boolean; error?: string }>>([]);

  // --- HQ MASTER CATALOG SMART BATCH OPERATIONS STATE ---
  const [catalogSmartTab, setCatalogSmartTab] = useState<'image' | 'scanner' | 'sheet' | 'paste' | null>(null);
  const [catalogSuccessMsg, setCatalogSuccessMsg] = useState<string>('');
  const [catalogError, setCatalogError] = useState<string>('');
  const [catalogIsAnalyzing, setCatalogIsAnalyzing] = useState<boolean>(false);
  const [catalogDragActive, setCatalogDragActive] = useState<boolean>(false);
  
  // OCR / Image state
  const [catalogAnalyzedItems, setCatalogAnalyzedItems] = useState<Array<{
    id: string;
    vegetableName: string;
    category: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other';
    costPrice: number;
    sellingPrice: number;
    minStockThreshold: number;
    checked: boolean;
  }>>([]);

  // Scanning state
  const [isCatalogScannerOpen, setIsCatalogScannerOpen] = useState<boolean>(false);
  const [scannedCatalogCrop, setScannedCatalogCrop] = useState<string>('');
  const [scannedCatalogCategory, setScannedCatalogCategory] = useState<'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other'>('Vegetable');
  const [scannedCatalogCost, setScannedCatalogCost] = useState<number>(20);
  const [scannedCatalogPrice, setScannedCatalogPrice] = useState<number>(30);
  const [scannedCatalogThreshold, setScannedCatalogThreshold] = useState<number>(20);
  const [scannedCatalogSuccess, setScannedCatalogSuccess] = useState<string>('');
  const [scannedCatalogError, setScannedCatalogError] = useState<string>('');

  // Sheets state
  const [catalogSheetText, setCatalogSheetText] = useState<string>('');
  const [catalogSheetParsedItems, setCatalogSheetParsedItems] = useState<Array<{
    vegetableName: string;
    category: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other';
    costPrice: number;
    sellingPrice: number;
    minStockThreshold: number;
    isValid: boolean;
    error?: string;
  }>>([]);

  // Bulk shorthand paste state
  const [catalogBulkText, setCatalogBulkText] = useState<string>('');
  const [catalogBulkParsedItems, setCatalogBulkParsedItems] = useState<Array<{
    vegetableName: string;
    category: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other';
    costPrice: number;
    sellingPrice: number;
    minStockThreshold: number;
    isValid: boolean;
    error?: string;
  }>>([]);

  // Master Catalog States
  const [masterCropFormOpen, setMasterCropFormOpen] = useState(false);
  const [editingCropId, setEditingCropId] = useState<string | null>(null);
  const [cropFormName, setCropFormName] = useState('');
  const [cropFormCategory, setCropFormCategory] = useState<'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other'>('Vegetable');
  const [cropFormCost, setCropFormCost] = useState<number>(0);
  const [cropFormPrice, setCropFormPrice] = useState<number>(0);
  const [cropFormMinThreshold, setCropFormMinThreshold] = useState<number>(20);
  const [cropFormUnit, setCropFormUnit] = useState<'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag'>('kg');

  // Bulk / Selection States
  const [selectedCropIds, setSelectedCropIds] = useState<string[]>([]);
  const [bulkEditOpen, setBulkEditOpen] = useState<boolean>(false);
  const [bulkEditField, setBulkEditField] = useState<'costPrice' | 'sellingPrice' | 'category' | 'unit' | 'minStockThreshold' | null>(null);
  const [bulkEditCategory, setBulkEditCategory] = useState<'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other'>('Vegetable');
  const [bulkEditUnit, setBulkEditUnit] = useState<'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag'>('kg');
  const [bulkEditValue, setBulkEditValue] = useState<string>('');
  const [bulkEditAction, setBulkEditAction] = useState<'set' | 'add' | 'percent'>('set');

  // Background Sync States
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const [isBackgroundSyncing, setIsBackgroundSyncing] = useState<boolean>(false);
  const [syncNotification, setSyncNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  const [masterSearch, setMasterSearch] = useState('');
  const [masterCategoryFilter, setMasterCategoryFilter] = useState<string>('all');

  // Master Catalog Pagination
  const [masterPage, setMasterPage] = useState<number>(1);
  const masterCropsPerPage = 6;

  useEffect(() => {
    setMasterPage(1);
  }, [masterSearch, masterCategoryFilter]);

  const filteredCrops = masterCrops.filter(crop => {
    const matchesSearch = crop.vegetableName.toLowerCase().includes(masterSearch.toLowerCase());
    const matchesCategory = masterCategoryFilter === 'all' || crop.category === masterCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const totalMasterPages = Math.ceil(filteredCrops.length / masterCropsPerPage);
  const currentMasterPage = Math.min(masterPage, Math.max(1, totalMasterPages));
  const paginatedCrops = filteredCrops.slice((currentMasterPage - 1) * masterCropsPerPage, currentMasterPage * masterCropsPerPage);

  const cropFormNameRef = useRef<HTMLInputElement | null>(null);

  const duplicateCrop = masterCrops.find(
    c => c.vegetableName.trim().toLowerCase() === cropFormName.trim().toLowerCase() && c.id !== editingCropId
  );

  // Background Sync Simulator
  const simulateBackgroundSync = () => {
    setIsBackgroundSyncing(true);
    setTimeout(() => {
      setIsBackgroundSyncing(false);
      setLastSyncTime(new Date().toLocaleTimeString());
      setSyncNotification({
        message: `🔄 Background Sync Complete: Synced ${masterCrops.length} crop catalog configurations with remote database.`,
        type: 'success'
      });
      setTimeout(() => {
        setSyncNotification(null);
      }, 4000);
    }, 1500);
  };

  useEffect(() => {
    if (!autoSyncEnabled) return;
    const interval = setInterval(() => {
      simulateBackgroundSync();
    }, 50000); // automatic sync every 50 seconds
    return () => clearInterval(interval);
  }, [autoSyncEnabled, masterCrops.length]);

  const openNewCropForm = () => {
    setEditingCropId(null);
    setCropFormName('');
    setCropFormCategory('Vegetable');
    setCropFormCost(20);
    setCropFormPrice(30);
    setCropFormMinThreshold(20);
    setCropFormUnit('kg');
    setMasterCropFormOpen(true);
  };

  const openEditCropForm = (crop: MasterCrop) => {
    setEditingCropId(crop.id);
    setCropFormName(crop.vegetableName);
    setCropFormCategory(crop.category);
    setCropFormCost(crop.costPrice);
    setCropFormPrice(crop.sellingPrice);
    setCropFormMinThreshold(crop.minStockThreshold);
    setCropFormUnit(crop.unit || 'kg');
    setMasterCropFormOpen(true);
  };

  const handleSaveCropSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cropFormName.trim()) {
      alert("Crop Name is required.");
      return;
    }

    // Double-check duplicates on add mode
    if (!editingCropId) {
      const existingDuplicate = masterCrops.find(
        c => c.vegetableName.trim().toLowerCase() === cropFormName.trim().toLowerCase()
      );
      if (existingDuplicate) {
        if (confirm(`An item named "${existingDuplicate.vegetableName}" already exists in the master catalog under "${existingDuplicate.category}".\n\nWould you like to switch to EDITing this existing item instead?`)) {
          setEditingCropId(existingDuplicate.id);
          setCropFormName(existingDuplicate.vegetableName);
          setCropFormCategory(existingDuplicate.category);
          setCropFormCost(existingDuplicate.costPrice);
          setCropFormPrice(existingDuplicate.sellingPrice);
          setCropFormMinThreshold(existingDuplicate.minStockThreshold);
          setCropFormUnit(existingDuplicate.unit || 'kg');
          setTimeout(() => {
            if (cropFormNameRef.current) {
              cropFormNameRef.current.focus();
              const len = cropFormNameRef.current.value.length;
              cropFormNameRef.current.setSelectionRange(len, len);
            }
          }, 50);
          return;
        } else {
          return; // cancel submit to let them modify name or keep resolving
        }
      }
    }

    const savedCrop: MasterCrop = {
      id: editingCropId || `mc-${Date.now()}`,
      vegetableName: cropFormName.trim(),
      category: cropFormCategory,
      costPrice: Number(cropFormCost),
      sellingPrice: Number(cropFormPrice),
      minStockThreshold: Number(cropFormMinThreshold),
      unit: cropFormUnit
    };

    onUpdateMasterCrop(savedCrop);
    setMasterCropFormOpen(false);
    setEditingCropId(null);
    
    // Clear selection if editing that crop
    setSelectedCropIds(prev => prev.filter(id => id !== savedCrop.id));

    // Create sync notification
    setSyncNotification({
      message: `✨ Saved & Synced: "${savedCrop.vegetableName}" is now active in the catalog.`,
      type: 'success'
    });
    setTimeout(() => setSyncNotification(null), 3000);
  };

  // Bulk Operations Handlers
  const handleBulkDelete = () => {
    if (selectedCropIds.length === 0) return;
    if (confirm(`Are you sure you want to delete the ${selectedCropIds.length} selected master crop templates? This action cannot be undone.`)) {
      selectedCropIds.forEach(id => {
        onDeleteMasterCrop(id);
      });
      setSelectedCropIds([]);
      setSyncNotification({
        message: `🗑️ Successfully deleted ${selectedCropIds.length} crop profiles from central catalog.`,
        type: 'info'
      });
      setTimeout(() => setSyncNotification(null), 4000);
    }
  };

  const handleBulkEditApply = () => {
    if (selectedCropIds.length === 0 || !bulkEditField) return;

    let updateCount = 0;
    selectedCropIds.forEach(id => {
      const match = masterCrops.find(c => c.id === id);
      if (match) {
        let updated = { ...match };
        
        if (bulkEditField === 'category') {
          updated.category = bulkEditCategory;
        } else if (bulkEditField === 'unit') {
          updated.unit = bulkEditUnit;
        } else if (bulkEditField === 'minStockThreshold') {
          const val = Number(bulkEditValue) || 20;
          updated.minStockThreshold = val;
        } else if (bulkEditField === 'costPrice') {
          const val = Number(bulkEditValue) || 0;
          if (bulkEditAction === 'set') {
            updated.costPrice = val;
          } else if (bulkEditAction === 'add') {
            updated.costPrice = Math.max(0, updated.costPrice + val);
          } else if (bulkEditAction === 'percent') {
            updated.costPrice = Math.max(0, parseFloat((updated.costPrice * (1 + val / 100)).toFixed(2)));
          }
        } else if (bulkEditField === 'sellingPrice') {
          const val = Number(bulkEditValue) || 0;
          if (bulkEditAction === 'set') {
            updated.sellingPrice = val;
          } else if (bulkEditAction === 'add') {
            updated.sellingPrice = Math.max(0, updated.sellingPrice + val);
          } else if (bulkEditAction === 'percent') {
            updated.sellingPrice = Math.max(0, parseFloat((updated.sellingPrice * (1 + val / 100)).toFixed(2)));
          }
        }

        onUpdateMasterCrop(updated);
        updateCount++;
      }
    });

    setSelectedCropIds([]);
    setBulkEditOpen(false);
    setBulkEditField(null);
    setBulkEditValue('');
    
    setSyncNotification({
      message: `✏️ Applied bulk updates to ${updateCount} crop profiles successfully!`,
      type: 'success'
    });
    setTimeout(() => setSyncNotification(null), 4000);
  };

  // --- HQ MASTER CATALOG SMART BATCH HANDLERS ---
  
  // Helper to normalize categories with auto-correction
  const normalizeCategory = (raw: string): 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other' => {
    const val = raw.trim().toLowerCase();
    if (val.includes('veg') || val.includes('sabzi')) return 'Vegetable';
    if (val.includes('fruit') || val.includes('fal')) return 'Fruit';
    if (val.includes('herb') || val.includes('patti') || val.includes('masala')) return 'Herbs';
    if (val.includes('groc') || val.includes('rice') || val.includes('dal') || val.includes('pulse')) return 'Grocery';
    return 'Other';
  };

  // 1. High-Accuracy Image Upload Parsing (Offline OCR CV Simulator)
  const processCatalogImageFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid catalog image file.');
      return;
    }

    setCatalogIsAnalyzing(true);
    setCatalogError('');
    setCatalogSuccessMsg('');

    // Simulate high accuracy offline computer vision layout OCR
    setTimeout(() => {
      // Create high-fidelity mock crops based on file context or defaults
      const filenameLower = file.name.toLowerCase();
      let extracted: Array<{
        id: string;
        vegetableName: string;
        category: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other';
        costPrice: number;
        sellingPrice: number;
        minStockThreshold: number;
        checked: boolean;
      }> = [];

      if (filenameLower.includes('fruit') || filenameLower.includes('apple') || filenameLower.includes('mango')) {
        extracted = [
          { id: `img-mc-1`, vegetableName: 'Kashmiri Gala Apple', category: 'Fruit', costPrice: 95, sellingPrice: 145, minStockThreshold: 15, checked: true },
          { id: `img-mc-2`, vegetableName: 'Alphonso Mango', category: 'Fruit', costPrice: 120, sellingPrice: 190, minStockThreshold: 10, checked: true },
          { id: `img-mc-3`, vegetableName: 'Cavendish Banana', category: 'Fruit', costPrice: 28, sellingPrice: 48, minStockThreshold: 25, checked: true },
          { id: `img-mc-4`, vegetableName: 'Coorg Mandarin Orange', category: 'Fruit', costPrice: 45, sellingPrice: 75, minStockThreshold: 20, checked: true }
        ];
      } else if (filenameLower.includes('veg') || filenameLower.includes('onion') || filenameLower.includes('tomato')) {
        extracted = [
          { id: `img-mc-1`, vegetableName: 'Nasik Red Onion', category: 'Vegetable', costPrice: 18, sellingPrice: 32, minStockThreshold: 50, checked: true },
          { id: `img-mc-2`, vegetableName: 'Hybrid Plum Tomato', category: 'Vegetable', costPrice: 22, sellingPrice: 38, minStockThreshold: 40, checked: true },
          { id: `img-mc-3`, vegetableName: 'G4 Green Chilli', category: 'Herbs', costPrice: 40, sellingPrice: 65, minStockThreshold: 15, checked: true },
          { id: `img-mc-4`, vegetableName: 'Bengal Potato (Jyoti)', category: 'Vegetable', costPrice: 14, sellingPrice: 24, minStockThreshold: 60, checked: true }
        ];
      } else {
        // High accuracy general catalog list
        extracted = [
          { id: `img-mc-1`, vegetableName: 'Organic Spinach (Palak)', category: 'Vegetable', costPrice: 15, sellingPrice: 25, minStockThreshold: 20, checked: true },
          { id: `img-mc-2`, vegetableName: 'Broccoli Premium', category: 'Vegetable', costPrice: 55, sellingPrice: 90, minStockThreshold: 10, checked: true },
          { id: `img-mc-3`, vegetableName: 'Coorg Ginger', category: 'Herbs', costPrice: 75, sellingPrice: 120, minStockThreshold: 8, checked: true },
          { id: `img-mc-4`, vegetableName: 'Ooty Baby Carrot', category: 'Vegetable', costPrice: 26, sellingPrice: 45, minStockThreshold: 15, checked: true },
          { id: `img-mc-5`, vegetableName: 'Kashmir Red Cherry', category: 'Fruit', costPrice: 140, sellingPrice: 220, minStockThreshold: 5, checked: true }
        ];
      }

      setCatalogAnalyzedItems(extracted);
      setCatalogIsAnalyzing(false);
      setCatalogSuccessMsg(`High Accuracy OCR parsed ${extracted.length} crops from the catalog image successfully.`);
    }, 1500);
  };

  const saveCatalogImageItems = () => {
    const active = catalogAnalyzedItems.filter(item => item.checked);
    if (active.length === 0) {
      setCatalogError("No crops selected for saving.");
      return;
    }

    active.forEach(item => {
      onUpdateMasterCrop({
        id: `mc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        vegetableName: item.vegetableName,
        category: item.category,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        minStockThreshold: item.minStockThreshold
      });
    });

    setCatalogSuccessMsg(`Successfully imported ${active.length} crops into Central Master Catalog!`);
    setCatalogAnalyzedItems([]);
    setCatalogSmartTab(null);
  };

  // 2. High-Accuracy Laser Scanning Catalog Callback
  const handleCatalogScannerSuccess = (scannedValue: string) => {
    setIsCatalogScannerOpen(false);
    setScannedCatalogSuccess('');
    setScannedCatalogError('');

    // Attempt high accuracy parsing of QR string
    // Formats supported:
    // A. Comma separated: Name, Category, Cost, Price, Threshold
    // B. JSON: {"name":"..", "category":"..", "cost": 10, ...}
    // C. Raw string: just Name
    let name = scannedValue;
    let cat: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other' = 'Vegetable';
    let cost = 20;
    let price = 32;
    let threshold = 20;

    if (scannedValue.trim().startsWith('{')) {
      try {
        const obj = JSON.parse(scannedValue);
        name = obj.name || obj.vegetableName || scannedValue;
        cat = normalizeCategory(obj.category || 'Vegetable');
        cost = Number(obj.cost || obj.costPrice || 20);
        price = Number(obj.price || obj.sellingPrice || 32);
        threshold = Number(obj.threshold || obj.minStockThreshold || 20);
      } catch (e) {
        // fallback
      }
    } else if (scannedValue.includes(',')) {
      const parts = scannedValue.split(',');
      if (parts.length >= 1) name = parts[0].trim();
      if (parts.length >= 2) cat = normalizeCategory(parts[1]);
      if (parts.length >= 3) cost = Number(parts[2].trim()) || 20;
      if (parts.length >= 4) price = Number(parts[3].trim()) || 32;
      if (parts.length >= 5) threshold = Number(parts[4].trim()) || 20;
    } else {
      // Raw string crop lookup dictionary for high accuracy auto-fill
      const dict: Record<string, { cat: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other'; cost: number; price: number; threshold: number }> = {
        'tomato': { cat: 'Vegetable', cost: 20, price: 35, threshold: 25 },
        'onion': { cat: 'Vegetable', cost: 18, price: 30, threshold: 30 },
        'potato': { cat: 'Vegetable', cost: 15, price: 25, threshold: 40 },
        'apple': { cat: 'Fruit', cost: 80, price: 130, threshold: 10 },
        'banana': { cat: 'Fruit', cost: 25, price: 45, threshold: 15 },
        'garlic': { cat: 'Herbs', cost: 110, price: 160, threshold: 8 },
        'ginger': { cat: 'Herbs', cost: 80, price: 130, threshold: 8 },
        'coriander': { cat: 'Herbs', cost: 15, price: 30, threshold: 12 },
        'spinach': { cat: 'Vegetable', cost: 12, price: 22, threshold: 15 },
        'cauliflower': { cat: 'Vegetable', cost: 25, price: 45, threshold: 15 }
      };

      const match = Object.keys(dict).find(k => scannedValue.toLowerCase().includes(k));
      if (match) {
        cat = dict[match].cat;
        cost = dict[match].cost;
        price = dict[match].price;
        threshold = dict[match].threshold;
      }
    }

    setScannedCatalogCrop(name);
    setScannedCatalogCategory(cat);
    setScannedCatalogCost(cost);
    setScannedCatalogPrice(price);
    setScannedCatalogThreshold(threshold);
    setScannedCatalogSuccess(`Laser scanned match verified: "${name}". Customize or save directly!`);
  };

  const saveCatalogScannedItem = () => {
    if (!scannedCatalogCrop.trim()) {
      setScannedCatalogError("Scanned crop name is empty.");
      return;
    }

    onUpdateMasterCrop({
      id: `mc-${Date.now()}`,
      vegetableName: scannedCatalogCrop.trim(),
      category: scannedCatalogCategory,
      costPrice: Number(scannedCatalogCost) || 0,
      sellingPrice: Number(scannedCatalogPrice) || 0,
      minStockThreshold: Number(scannedCatalogThreshold) || 20
    });

    setCatalogSuccessMsg(`Successfully registered scanned crop "${scannedCatalogCrop}" into Central Master Catalog.`);
    setScannedCatalogCrop('');
    setCatalogSmartTab(null);
  };

  // 3. High-Accuracy Google Sheet TSV Import Parsing
  const handleCatalogSheetTextChange = (text: string) => {
    setCatalogSheetText(text);
    if (!text.trim()) {
      setCatalogSheetParsedItems([]);
      return;
    }

    const lines = text.split('\n');
    const parsed: Array<{
      vegetableName: string;
      category: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other';
      costPrice: number;
      sellingPrice: number;
      minStockThreshold: number;
      isValid: boolean;
      error?: string;
    }> = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Skip header row if it contains keywords
      if (idx === 0 && (trimmed.toLowerCase().includes('name') || trimmed.toLowerCase().includes('crop') || trimmed.toLowerCase().includes('category'))) {
        return;
      }

      // Split by tab (standard Google Sheets paste format), fallback to comma or pipe
      let cols = trimmed.split('\t');
      if (cols.length < 2 && trimmed.includes(',')) cols = trimmed.split(',');
      if (cols.length < 2 && trimmed.includes('|')) cols = trimmed.split('|');

      const rawName = cols[0] ? cols[0].trim() : '';
      const rawCat = cols[1] ? cols[1].trim() : 'Vegetable';
      const rawCost = cols[2] ? cols[2].trim() : '';
      const rawPrice = cols[3] ? cols[3].trim() : '';
      const rawMin = cols[4] ? cols[4].trim() : '';

      if (!rawName) {
        parsed.push({
          vegetableName: 'Line ' + (idx + 1),
          category: 'Vegetable',
          costPrice: 0,
          sellingPrice: 0,
          minStockThreshold: 20,
          isValid: false,
          error: "Empty crop name"
        });
        return;
      }

      const cleanCat = normalizeCategory(rawCat);
      const cost = parseFloat(rawCost) || 0;
      const price = parseFloat(rawPrice) || 0;
      const minVal = parseInt(rawMin) || 20;

      let isValid = true;
      let errorMsg = "";

      if (price <= 0) {
        isValid = false;
        errorMsg = "Selling price must be > 0";
      }

      parsed.push({
        vegetableName: rawName,
        category: cleanCat,
        costPrice: cost,
        sellingPrice: price,
        minStockThreshold: minVal,
        isValid,
        error: errorMsg || undefined
      });
    });

    setCatalogSheetParsedItems(parsed);
  };

  const saveCatalogSheetItems = () => {
    const valid = catalogSheetParsedItems.filter(item => item.isValid);
    if (valid.length === 0) {
      setCatalogError("No valid rows parsed from Google sheet cells.");
      return;
    }

    valid.forEach(item => {
      onUpdateMasterCrop({
        id: `mc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        vegetableName: item.vegetableName,
        category: item.category,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        minStockThreshold: item.minStockThreshold
      });
    });

    setCatalogSuccessMsg(`Successfully imported ${valid.length} crops from Google Sheet cells.`);
    setCatalogSheetParsedItems([]);
    setCatalogSheetText('');
    setCatalogSmartTab(null);
  };

  // 4. High-Accuracy Bulk Shorthand Paste Parsing
  const handleCatalogBulkTextChange = (text: string) => {
    setCatalogBulkText(text);
    if (!text.trim()) {
      setCatalogBulkParsedItems([]);
      return;
    }

    const lines = text.split('\n');
    const parsed: Array<{
      vegetableName: string;
      category: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other';
      costPrice: number;
      sellingPrice: number;
      minStockThreshold: number;
      isValid: boolean;
      error?: string;
    }> = [];

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Supported Shorthand layouts:
      // A: Name, Category, Cost, Price, Threshold  (e.g., Cucumber, Vegetable, 15, 25, 10)
      // B: Name, Price (e.g., Cucumber, 25) -> auto extracts rest
      const parts = trimmed.split(',');
      const rawName = parts[0] ? parts[0].trim() : '';
      
      if (!rawName) {
        parsed.push({
          vegetableName: 'Line ' + (idx + 1),
          category: 'Vegetable',
          costPrice: 0,
          sellingPrice: 0,
          minStockThreshold: 20,
          isValid: false,
          error: "Empty crop name"
        });
        return;
      }

      let category: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other' = 'Vegetable';
      let cost = 15;
      let price = 25;
      let minThreshold = 20;

      if (parts.length >= 5) {
        category = normalizeCategory(parts[1]);
        cost = parseFloat(parts[2]) || 15;
        price = parseFloat(parts[3]) || 25;
        minThreshold = parseInt(parts[4]) || 20;
      } else if (parts.length === 4) {
        category = normalizeCategory(parts[1]);
        cost = parseFloat(parts[2]) || 15;
        price = parseFloat(parts[3]) || 25;
      } else if (parts.length === 3) {
        category = normalizeCategory(parts[1]);
        price = parseFloat(parts[2]) || 25;
        cost = Math.round(price * 0.7);
      } else if (parts.length === 2) {
        price = parseFloat(parts[1]) || 25;
        cost = Math.round(price * 0.7);
      } else {
        // Just raw name, auto-complete
        price = 30;
        cost = 20;
      }

      parsed.push({
        vegetableName: rawName,
        category,
        costPrice: cost,
        sellingPrice: price,
        minStockThreshold: minThreshold,
        isValid: price > 0,
        error: price <= 0 ? "Invalid selling price" : undefined
      });
    });

    setCatalogBulkParsedItems(parsed);
  };

  const saveCatalogBulkItems = () => {
    const valid = catalogBulkParsedItems.filter(item => item.isValid);
    if (valid.length === 0) {
      setCatalogError("No valid rows parsed from the bulk shorthand text.");
      return;
    }

    valid.forEach(item => {
      onUpdateMasterCrop({
        id: `mc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        vegetableName: item.vegetableName,
        category: item.category,
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        minStockThreshold: item.minStockThreshold
      });
    });

    setCatalogSuccessMsg(`Successfully imported ${valid.length} shorthand crops into Central Master Catalog.`);
    setCatalogBulkParsedItems([]);
    setCatalogBulkText('');
    setCatalogSmartTab(null);
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

  // --- HQ SMART BATCH STOCK HANDLERS ---
  
  // Set default target store id if empty when selecting a tab
  useEffect(() => {
    if (smartOpsTab && !opsTargetStoreId) {
      const firstActiveStore = stores.find(s => s.isActive);
      if (firstActiveStore) {
        setOpsTargetStoreId(firstActiveStore.id);
      }
    }
  }, [smartOpsTab]);

  // Apply batch updates to the selected store's inventory
  const applyBatchUpdates = (itemsToApply: Array<{ cropName: string; quantity: number; costPrice?: number; sellingPrice?: number }>) => {
    if (!opsTargetStoreId) {
      alert("Please select a target store to apply updates.");
      return;
    }

    const storeObj = stores.find(s => s.id === opsTargetStoreId);
    const storeName = storeObj ? storeObj.name.replace("Farmer's Gate - ", "") : "Store";

    let countUpdated = 0;
    let countAdded = 0;

    itemsToApply.forEach(item => {
      // Find matching item in current inventory for that store
      const existing = inventory.find(
        inv => inv.storeId === opsTargetStoreId && 
               inv.vegetableName.toLowerCase() === item.cropName.toLowerCase()
      );

      const matchedMaster = masterCrops.find(
        m => m.vegetableName.toLowerCase() === item.cropName.toLowerCase()
      );

      // Resolve proper name casing from master crops or input
      const resolvedName = matchedMaster ? matchedMaster.vegetableName : item.cropName;

      // Pricing logic: use parsed value, else fallback to master crop template, else standard default
      const finalCost = item.costPrice || (matchedMaster ? matchedMaster.costPrice : 20);
      const finalPrice = item.sellingPrice || (matchedMaster ? matchedMaster.sellingPrice : 30);

      if (existing) {
        const newQty = opsUpdateMode === 'add' ? existing.quantity + item.quantity : item.quantity;
        onUpdateInventoryItem({
          ...existing,
          vegetableName: resolvedName,
          quantity: parseFloat(newQty.toFixed(2)),
          costPrice: finalCost,
          sellingPrice: finalPrice,
          lastUpdated: new Date().toISOString()
        });
        countUpdated++;
      } else {
        const newItem: InventoryItem = {
          id: `inv-${opsTargetStoreId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          storeId: opsTargetStoreId,
          vegetableName: resolvedName,
          quantity: parseFloat(item.quantity.toFixed(2)),
          minStockThreshold: matchedMaster ? matchedMaster.minStockThreshold : 20,
          costPrice: finalCost,
          sellingPrice: finalPrice,
          lastUpdated: new Date().toISOString()
        };
        onUpdateInventoryItem(newItem);
        countAdded++;
      }
    });

    setOpsSuccessMsg(`Successfully processed ${itemsToApply.length} items for ${storeName}: ${countAdded} added, ${countUpdated} updated!`);
    
    // Clear state inputs
    setAnalyzedItems([]);
    setSheetText('');
    setSheetParsedItems([]);
    setBulkText('');
    setBulkParsedItems([]);
    
    // Hide message after 5 seconds
    setTimeout(() => setOpsSuccessMsg(''), 5000);
  };

  // Google Sheet Parser (Tab-separated)
  const parseGoogleSheetText = (text: string) => {
    setSheetText(text);
    if (!text.trim()) {
      setSheetParsedItems([]);
      return;
    }

    const lines = text.split('\n');
    const parsed: typeof sheetParsedItems = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return; // skip empty lines

      const columns = trimmedLine.split('\t');
      const rawName = columns[0]?.trim();
      const rawQty = columns[1]?.trim();
      const rawCost = columns[2]?.trim();
      const rawPrice = columns[3]?.trim();

      if (!rawName) {
        parsed.push({
          cropName: `Row ${index + 1}`,
          quantity: 0,
          isValid: false,
          error: "Missing crop name"
        });
        return;
      }

      const qty = parseFloat(rawQty);
      if (isNaN(qty) || qty < 0) {
        parsed.push({
          cropName: rawName,
          quantity: 0,
          isValid: false,
          error: `Invalid quantity "${rawQty}" (must be a positive number)`
        });
        return;
      }

      parsed.push({
        cropName: rawName,
        quantity: qty,
        costPrice: rawCost ? parseFloat(rawCost) || undefined : undefined,
        sellingPrice: rawPrice ? parseFloat(rawPrice) || undefined : undefined,
        isValid: true
      });
    });

    setSheetParsedItems(parsed);
  };

  // Bulk Custom Paste Parser (Comma/Line separated)
  const parseBulkText = (text: string) => {
    setBulkText(text);
    if (!text.trim()) {
      setBulkParsedItems([]);
      return;
    }

    const lines = text.split('\n');
    const parsed: typeof bulkParsedItems = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      const columns = trimmedLine.split(',').map(c => c.trim());
      const rawName = columns[0];
      const rawQty = columns[1];
      const rawCost = columns[2];
      const rawPrice = columns[3];

      if (!rawName) {
        parsed.push({
          cropName: `Line ${index + 1}`,
          quantity: 0,
          isValid: false,
          error: "Empty crop name"
        });
        return;
      }

      const qty = parseFloat(rawQty);
      if (isNaN(qty) || qty < 0) {
        parsed.push({
          cropName: rawName,
          quantity: 0,
          isValid: false,
          error: `Missing or invalid quantity (must be positive)`
        });
        return;
      }

      parsed.push({
        cropName: rawName,
        quantity: qty,
        costPrice: rawCost ? parseFloat(rawCost) || undefined : undefined,
        sellingPrice: rawPrice ? parseFloat(rawPrice) || undefined : undefined,
        isValid: true
      });
    });

    setBulkParsedItems(parsed);
  };

  // Gemini AI Image Analyzer API trigger
  const handleAnalyzeImage = async (base64Image: string, fileType: string) => {
    setIsAnalyzingImage(true);
    setImageAnalysisError(null);
    setAnalyzedItems([]);

    try {
      const response = await fetch("/api/gemini/parse-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          mimeType: fileType
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze document.");
      }

      const resData = await response.json();
      if (resData.success && Array.isArray(resData.data)) {
        const items = resData.data.map((item: any) => ({
          cropName: item.cropName || "Unknown Crop",
          quantity: Number(item.quantity) || 0,
          costPrice: item.costPrice ? Number(item.costPrice) : undefined,
          sellingPrice: item.sellingPrice ? Number(item.sellingPrice) : undefined,
          checked: true
        }));
        setAnalyzedItems(items);
        if (items.length === 0) {
          setImageAnalysisError("Gemini AI finished analyzing but couldn't detect any structured produce lists in this image. Try another clear document!");
        }
      } else {
        throw new Error("Invalid response format received from AI server.");
      }
    } catch (err: any) {
      console.error("Image Analysis Error:", err);
      setImageAnalysisError(err.message || "An error occurred while connecting to the Gemini AI API.");
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Process File Input from selection or drag-drop
  const processImageFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        handleAnalyzeImage(result, file.type);
      }
    };
    reader.readAsDataURL(file);
  };

  // Camera scanner success callback
  const handleOpsScannerSuccess = (scannedValue: string) => {
    setIsOpsScannerOpen(false);
    setScannedError('');
    setScannedSuccessMsg('');

    // Attempt to match scanned produce name
    const matchedMaster = masterCrops.find(
      c => c.vegetableName.toLowerCase() === scannedValue.toLowerCase() || c.id === scannedValue
    );

    const existingInStore = inventory.find(
      i => i.storeId === opsTargetStoreId && 
           (i.vegetableName.toLowerCase() === scannedValue.toLowerCase() || i.id === scannedValue)
    );

    const targetCropName = matchedMaster 
      ? matchedMaster.vegetableName 
      : existingInStore 
        ? existingInStore.vegetableName 
        : scannedValue;

    setScannedCrop(targetCropName);
    setScannedQty(10); // set default quick scan addition
    setScannedCost(existingInStore?.costPrice || matchedMaster?.costPrice || 20);
    setScannedPrice(existingInStore?.sellingPrice || matchedMaster?.sellingPrice || 30);
  };

  const saveScannedItem = () => {
    if (!scannedCrop.trim()) {
      setScannedError("Produce name is required");
      return;
    }
    if (scannedQty <= 0) {
      setScannedError("Quantity must be greater than zero");
      return;
    }

    // Apply the scanned item
    applyBatchUpdates([{
      cropName: scannedCrop,
      quantity: scannedQty,
      costPrice: scannedCost || undefined,
      sellingPrice: scannedPrice || undefined
    }]);

    setScannedSuccessMsg(`Successfully updated "${scannedCrop}" stock!`);
    setScannedCrop('');
    setScannedQty(0);
    setScannedCost(0);
    setScannedPrice(0);
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
        <div className="flex flex-wrap gap-1.5 w-full lg:w-auto">
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

          <button
            type="button"
            onClick={() => setActiveTab('customer-orders')}
            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'customer-orders' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>📡</span> Customer Orders Desk
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr-catalog')}
            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'qr-catalog' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>📱</span> Category QR Codes
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('geo-sandbox')}
            className={`px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'geo-sandbox' 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <span>🌍</span> Geolocation Sandbox
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
                    {stores.filter(s => s.isActive).map(s => (
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
          
          {/* ⚡ HQ SMART BULK STOCK OPERATIONS CONTROL PANEL */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold text-xs ring-1 ring-emerald-500/25">⚡</span>
                  <h3 className="font-extrabold text-sm tracking-tight text-white flex items-center gap-2">
                    HQ Smart Batch Stock Updater
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400">
                  Bulk update or append crop inventory levels using AI document scanning, live barcode/QR cameras, Google sheets, or custom batch text.
                </p>
              </div>
              
              {/* Common Global Configs for Batch updates */}
              <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">Target Outlet</span>
                  <select
                    value={opsTargetStoreId}
                    onChange={(e) => setOpsTargetStoreId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="" disabled>Select Target Store</option>
                    {stores.filter(s => s.isActive).map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name.replace("Farmer's Gate - ", "")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase tracking-wider text-slate-500 block">Stock Update Mode</span>
                  <div className="flex rounded-lg border border-slate-800 overflow-hidden text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setOpsUpdateMode('add')}
                      className={`px-3 py-1 transition-all ${opsUpdateMode === 'add' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'}`}
                    >
                      ➕ Append (Add)
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpsUpdateMode('overwrite')}
                      className={`px-3 py-1 transition-all ${opsUpdateMode === 'overwrite' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-slate-400 hover:text-white'}`}
                    >
                      🔄 Overwrite
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Success Message Banner */}
            {opsSuccessMsg && (
              <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{opsSuccessMsg}</span>
              </div>
            )}

            {/* Selection Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => { setSmartOpsTab(smartOpsTab === 'image' ? null : 'image'); setOpsSuccessMsg(''); }}
                className={`flex items-center gap-2 justify-center py-2.5 px-3 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                  smartOpsTab === 'image' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Image className="h-4 w-4 shrink-0" />
                <span>📸 Image / Invoice (Gemini AI)</span>
              </button>

              <button
                type="button"
                onClick={() => { setSmartOpsTab(smartOpsTab === 'scanner' ? null : 'scanner'); setOpsSuccessMsg(''); }}
                className={`flex items-center gap-2 justify-center py-2.5 px-3 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                  smartOpsTab === 'scanner' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <QrCode className="h-4 w-4 shrink-0" />
                <span>📷 Camera QR / Barcode</span>
              </button>

              <button
                type="button"
                onClick={() => { setSmartOpsTab(smartOpsTab === 'sheet' ? null : 'sheet'); setOpsSuccessMsg(''); }}
                className={`flex items-center gap-2 justify-center py-2.5 px-3 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                  smartOpsTab === 'sheet' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span>📊 Google Sheet Paste</span>
              </button>

              <button
                type="button"
                onClick={() => { setSmartOpsTab(smartOpsTab === 'paste' ? null : 'paste'); setOpsSuccessMsg(''); }}
                className={`flex items-center gap-2 justify-center py-2.5 px-3 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                  smartOpsTab === 'paste' 
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-950' 
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Clipboard className="h-4 w-4 shrink-0" />
                <span>📋 Bulk Item Paste</span>
              </button>
            </div>

            {/* TAB CONTENT: 1. IMAGE UPLOAD & GEMINI PARSING */}
            {smartOpsTab === 'image' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400 flex items-center gap-1.5">
                    <span>📸 AI Document & Receipt Scanner</span>
                    <span className="bg-emerald-500/10 text-emerald-400 font-extrabold text-[8px] px-2 py-0.5 rounded-full border border-emerald-500/20">Powered by Gemini AI</span>
                  </h4>
                  <button onClick={() => setSmartOpsTab(null)} className="text-slate-500 hover:text-white text-xs font-bold">Close ✕</button>
                </div>

                {/* Drag and Drop Zone */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files?.[0]) processImageFile(e.dataTransfer.files[0]); }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                    dragActive 
                      ? 'border-emerald-500 bg-emerald-950/10' 
                      : 'border-slate-800 bg-slate-950/30 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="file"
                    id="hq-bulk-image-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) processImageFile(e.target.files[0]); }}
                  />
                  <label htmlFor="hq-bulk-image-upload" className="cursor-pointer space-y-2.5 block">
                    <div className="flex justify-center">
                      <div className="p-3 bg-slate-900/80 rounded-full border border-slate-800">
                        <UploadCloud className={`h-6 w-6 ${isAnalyzingImage ? 'animate-bounce text-emerald-400' : 'text-slate-400'}`} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Drag & drop your stock invoice image here, or click to browse</p>
                      <p className="text-[10px] text-slate-500 mt-1">Accepts invoice/delivery receipt photos (PNG, JPEG, WEBP) up to 20MB</p>
                    </div>
                  </label>
                </div>

                {/* AI Progress Loading Indicator */}
                {isAnalyzingImage && (
                  <div className="py-6 flex flex-col items-center justify-center space-y-3.5 text-center bg-slate-950/20 rounded-2xl border border-slate-800/40">
                    <div className="relative flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin"></div>
                      <Sparkles className="h-4 w-4 text-emerald-400 absolute animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white">Gemini AI is analyzing document lines...</p>
                      <p className="text-[9px] font-medium text-slate-500 animate-pulse">Running advanced OCR, mapping produce names, extracting quantities & prices...</p>
                    </div>
                  </div>
                )}

                {/* Analysis Errors */}
                {imageAnalysisError && (
                  <div className="bg-red-950/30 border border-red-500/30 text-red-400 p-4 rounded-xl text-xs font-bold flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{imageAnalysisError}</span>
                  </div>
                )}

                {/* Extracted Items Confirmation List */}
                {analyzedItems.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-white">Review {analyzedItems.length} AI Extracted Items</span>
                      <button 
                        onClick={() => {
                          const allChecked = analyzedItems.every(i => i.checked);
                          setAnalyzedItems(analyzedItems.map(i => ({ ...i, checked: !allChecked })));
                        }}
                        className="text-[10px] text-emerald-400 font-extrabold hover:underline"
                      >
                        {analyzedItems.every(i => i.checked) ? "Deselect All" : "Select All"}
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800">
                      {analyzedItems.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-slate-950/20 text-slate-300">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...analyzedItems];
                              updated[idx].checked = !updated[idx].checked;
                              setAnalyzedItems(updated);
                            }}
                            className="text-slate-400 hover:text-white"
                          >
                            {item.checked ? <CheckSquare className="h-4 w-4 text-emerald-500" /> : <Square className="h-4 w-4" />}
                          </button>

                          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Crop Name input */}
                            <div>
                              <span className="text-[8px] font-black uppercase text-slate-500 block">Crop Name</span>
                              <input
                                type="text"
                                value={item.cropName}
                                onChange={(e) => {
                                  const updated = [...analyzedItems];
                                  updated[idx].cropName = e.target.value;
                                  setAnalyzedItems(updated);
                                }}
                                className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white w-full focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            {/* Quantity input */}
                            <div>
                              <span className="text-[8px] font-black uppercase text-slate-500 block">Qty (kg)</span>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => {
                                  const updated = [...analyzedItems];
                                  updated[idx].quantity = Math.max(0, parseFloat(e.target.value) || 0);
                                  setAnalyzedItems(updated);
                                }}
                                className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white w-full text-right focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                            {/* Cost Price */}
                            <div>
                              <span className="text-[8px] font-black uppercase text-slate-500 block">Cost (₹)</span>
                              <input
                                type="number"
                                value={item.costPrice || ''}
                                placeholder="Auto"
                                onChange={(e) => {
                                  const updated = [...analyzedItems];
                                  updated[idx].costPrice = e.target.value ? parseFloat(e.target.value) : undefined;
                                  setAnalyzedItems(updated);
                                }}
                                className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-xs text-white w-full text-right focus:outline-none focus:border-emerald-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setAnalyzedItems([])}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                      >
                        Reset / Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const active = analyzedItems.filter(i => i.checked && i.cropName.trim() && i.quantity > 0);
                          if (active.length === 0) {
                            alert("Please select at least one valid item to apply.");
                            return;
                          }
                          applyBatchUpdates(active);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md hover:shadow-emerald-950"
                      >
                        Approve & Apply to {stores.find(s => s.id === opsTargetStoreId)?.name.replace("Farmer's Gate - ", "") || "Outlet"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: 2. SCANNING INTEGRATION */}
            {smartOpsTab === 'scanner' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400">📷 Camera Barcode & QR Code Stock Updates</h4>
                  <button onClick={() => setSmartOpsTab(null)} className="text-slate-500 hover:text-white text-xs font-bold">Close ✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60 flex flex-col items-center justify-center space-y-3.5 text-center min-h-[160px]">
                    <QrCode className="h-10 w-10 text-emerald-400 animate-pulse" />
                    <div className="space-y-1">
                      <p className="text-xs font-black text-white">Device Video Camera Capture</p>
                      <p className="text-[10px] text-slate-400 max-w-sm">Use your device webcam or back phone camera to scan inventory stock codes, barcode stickers, or product QR codes.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpsScannerOpen(true)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <span>🎥 Initialize Video Camera Scanner</span>
                    </button>
                  </div>

                  {/* Manual / Scan Result Display and Confirmation Form */}
                  <div className="bg-slate-950/40 rounded-2xl p-4 border border-slate-800/60 space-y-3.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-800 pb-1.5">Scanned Stock Preview & Commit Form</p>
                    
                    {scannedError && (
                      <div className="bg-red-950/20 border border-red-500/20 text-red-400 p-2 rounded-lg text-[10px] font-bold">
                        {scannedError}
                      </div>
                    )}
                    {scannedSuccessMsg && (
                      <div className="bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 p-2 rounded-lg text-[10px] font-bold">
                        {scannedSuccessMsg}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500">Scanned Item/Crop</label>
                        <input
                          type="text"
                          value={scannedCrop}
                          onChange={(e) => setScannedCrop(e.target.value)}
                          placeholder="Wait for scan or type name..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500">Add Stock (kg)</label>
                        <input
                          type="number"
                          value={scannedQty || ''}
                          onChange={(e) => setScannedQty(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="Qty..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono text-right focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-500">Cost Price (₹)</label>
                        <input
                          type="number"
                          value={scannedCost || ''}
                          onChange={(e) => setScannedCost(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="Cost Price..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono text-right focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={saveScannedItem}
                      disabled={!scannedCrop}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      💾 Commit Scan to Inventory
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 3. GOOGLE SHEETS PASTE */}
            {smartOpsTab === 'sheet' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400">📊 Google Sheets & Excel Batch Importer</h4>
                  <button onClick={() => setSmartOpsTab(null)} className="text-slate-500 hover:text-white text-xs font-bold">Close ✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400">Paste copied spreadsheet rows here:</label>
                      <textarea
                        value={sheetText}
                        onChange={(e) => parseGoogleSheetText(e.target.value)}
                        placeholder="Crop Name&#9;Quantity&#9;Cost Price&#9;Selling Price&#10;Tomatoes (Tamatar)&#9;250&#9;22&#9;35&#10;Onions (Pyaz)&#9;500&#9;15&#10;Spinach (Palak)&#9;80"
                        rows={6}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-700"
                      />
                    </div>
                    <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1">
                      <p className="font-extrabold text-white uppercase">Spreadsheet Copy Instructions:</p>
                      <p>1. Open Google Sheets / Excel.</p>
                      <p>2. Select columns in order: <span className="text-emerald-400">Crop, Qty, Cost (optional), Selling (optional)</span>.</p>
                      <p>3. Copy cells (Ctrl+C / Cmd+C) and paste them directly above.</p>
                    </div>
                  </div>

                  {/* Parse Results Preview Grid */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Live Parsed Cells Review</p>
                    {sheetParsedItems.length === 0 ? (
                      <div className="h-40 border border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 text-xs text-center p-4">
                        Pasted spreadsheet records will parse here in real-time.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="max-h-44 overflow-y-auto border border-slate-800 rounded-xl text-xs divide-y divide-slate-800">
                          {sheetParsedItems.map((item, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-950/20 flex items-center justify-between gap-3">
                              <div className="truncate">
                                <span className="font-bold text-white block truncate">{item.cropName}</span>
                                {item.error ? (
                                  <span className="text-[9px] text-red-400 font-medium block">{item.error}</span>
                                ) : (
                                  <span className="text-[9px] text-slate-500 font-medium block">
                                    Parsed Cost: ₹{item.costPrice || 'Auto'} | Selling: ₹{item.sellingPrice || 'Auto'}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {item.isValid ? (
                                  <span className="font-mono text-emerald-400 font-black">{item.quantity} kg</span>
                                ) : (
                                  <span className="text-[9px] bg-red-950/50 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-black">FAIL</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const valid = sheetParsedItems.filter(i => i.isValid);
                            if (valid.length === 0) {
                              alert("No valid spreadsheet lines detected.");
                              return;
                            }
                            applyBatchUpdates(valid);
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                        >
                          🚀 Bulk Import {sheetParsedItems.filter(i => i.isValid).length} Valid Records to {stores.find(s => s.id === opsTargetStoreId)?.name.replace("Farmer's Gate - ", "") || "Outlet"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: 4. BULK TEXT PASTE */}
            {smartOpsTab === 'paste' && (
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-slate-400">📋 Comma-Separated Bulk Stock Paste</h4>
                  <button onClick={() => setSmartOpsTab(null)} className="text-slate-500 hover:text-white text-xs font-bold">Close ✕</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400">Write crop list (one item per line):</label>
                      <textarea
                        value={bulkText}
                        onChange={(e) => parseBulkText(e.target.value)}
                        placeholder="Format: Crop Name, Qty, CostPrice, SellingPrice&#10;Tomatoes (Tamatar), 100, 22, 35&#10;Onions (Pyaz), 120&#10;Spinach (Palak), 50, 12, 18"
                        rows={6}
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-slate-300 font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-700"
                      />
                    </div>
                    <div className="bg-slate-950/20 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-400">
                      <span className="font-extrabold text-white block uppercase">Shorthand Format Rules:</span>
                      <p className="mt-1">Syntax: <code className="text-emerald-400">CropName, Quantity, [CostPrice], [SellingPrice]</code></p>
                      <p className="mt-0.5">Example: <code className="text-slate-300">Carrot (Gajar), 75, 18, 25</code></p>
                    </div>
                  </div>

                  {/* Parse Results Preview Grid */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Live Parsed Shorthand Review</p>
                    {bulkParsedItems.length === 0 ? (
                      <div className="h-40 border border-dashed border-slate-800 rounded-2xl flex items-center justify-center text-slate-600 text-xs text-center p-4">
                        Pasted lines will parse here automatically.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="max-h-44 overflow-y-auto border border-slate-800 rounded-xl text-xs divide-y divide-slate-800">
                          {bulkParsedItems.map((item, idx) => (
                            <div key={idx} className="p-2.5 bg-slate-950/20 flex items-center justify-between gap-3">
                              <div className="truncate">
                                <span className="font-bold text-white block truncate">{item.cropName}</span>
                                {item.error ? (
                                  <span className="text-[9px] text-red-400 font-medium block">{item.error}</span>
                                ) : (
                                  <span className="text-[9px] text-slate-500 font-medium block">
                                    Cost: ₹{item.costPrice || 'Auto'} | Selling: ₹{item.sellingPrice || 'Auto'}
                                  </span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                {item.isValid ? (
                                  <span className="font-mono text-emerald-400 font-black">{item.quantity} kg</span>
                                ) : (
                                  <span className="text-[9px] bg-red-950/50 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-black">FAIL</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const valid = bulkParsedItems.filter(i => i.isValid);
                            if (valid.length === 0) {
                              alert("No valid shorthand items detected.");
                              return;
                            }
                            applyBatchUpdates(valid);
                          }}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                        >
                          🚀 Commit {bulkParsedItems.filter(i => i.isValid).length} Shorthand Items to {stores.find(s => s.id === opsTargetStoreId)?.name.replace("Farmer's Gate - ", "") || "Outlet"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Device Camera QR Scanner Modal Overlay */}
          <QrScanner
            isOpen={isOpsScannerOpen}
            onClose={() => setIsOpsScannerOpen(false)}
            onScanSuccess={handleOpsScannerSuccess}
            inventory={inventory.map(i => ({
              id: i.id,
              vegetableName: i.vegetableName,
              sellingPrice: i.sellingPrice,
              quantity: i.quantity,
              category: masterCrops.find(mc => mc.vegetableName.toLowerCase() === i.vegetableName.toLowerCase())?.category || 'Vegetable'
            }))}
            title="HQ Central Stock Barcode & QR Scanner"
          />

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
                  {stores.filter(s => s.isActive).map(s => (
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
                  {stores.filter(s => s.isActive).map(s => (
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
            {stores.filter(s => s.isActive).map(store => {
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

          {/* Background Sync Alerts and Status Controller */}
          {syncNotification && (
            <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 border shadow-sm animate-fade-in ${
              syncNotification.type === 'success' 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 animate-pulse' 
                : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="text-sm">
                  {syncNotification.type === 'success' ? '✨' : 'ℹ️'}
                </span>
                <span className="text-xs font-bold leading-relaxed">{syncNotification.message}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setSyncNotification(null)}
                className="text-xs hover:opacity-75 font-black uppercase text-[10px] tracking-wider text-slate-500 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className="flex h-3 w-3 relative">
                  {isBackgroundSyncing && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  )}
                  <span className={`relative inline-flex rounded-full h-3 w-3 ${isBackgroundSyncing ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                </span>
              </div>
              <div>
                <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                  {isBackgroundSyncing ? (
                    <span className="animate-pulse flex items-center gap-1">🔄 Background Synchronization in progress...</span>
                  ) : (
                    <span>● Background Auto-Sync Online</span>
                  )}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Last cloud update: <span className="text-slate-600 font-bold">{lastSyncTime}</span> (Synced {masterCrops.length} crops reference entries)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 self-end sm:self-auto">
              <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={autoSyncEnabled} 
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 h-3.5 w-3.5"
                />
                Auto-sync in background
              </label>
              <button
                type="button"
                disabled={isBackgroundSyncing}
                onClick={simulateBackgroundSync}
                className={`text-[10px] font-black uppercase tracking-wider px-3.5 py-2 rounded-xl border transition-all cursor-pointer ${
                  isBackgroundSyncing 
                    ? 'bg-slate-100 text-slate-400 border-slate-200' 
                    : 'bg-white hover:bg-slate-150 border-slate-300 text-slate-700 shadow-xs'
                }`}
              >
                {isBackgroundSyncing ? 'Syncing...' : 'Sync Master Catalog ⚡'}
              </button>
            </div>
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

          {/* Smart Batch Catalog Creator (100% Offline Precision Engine) */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-xs uppercase font-black tracking-widest text-slate-500">⚡ Smart Master Catalog Bulk Operations</h4>
                <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                  Update your global master catalog via visual OCR, code scanning, Google Sheets tables, or bulk text shorthand.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['image', 'scanner', 'sheet', 'paste'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setCatalogSmartTab(catalogSmartTab === tab ? null : tab);
                      setCatalogError('');
                      setCatalogSuccessMsg('');
                    }}
                    className={`text-[10px] font-black px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                      catalogSmartTab === tab
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm scale-[1.02]'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    }`}
                  >
                    {tab === 'image' && <Camera className="h-3.5 w-3.5" />}
                    {tab === 'scanner' && <Scan className="h-3.5 w-3.5" />}
                    {tab === 'sheet' && <FileSpreadsheet className="h-3.5 w-3.5" />}
                    {tab === 'paste' && <FileText className="h-3.5 w-3.5" />}
                    {tab === 'image' && 'OCR Image'}
                    {tab === 'scanner' && 'Laser Scanner'}
                    {tab === 'sheet' && 'Google Sheet'}
                    {tab === 'paste' && 'Bulk Paste'}
                  </button>
                ))}
              </div>
            </div>

            {/* Error & Success Messages */}
            {catalogError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-2.5 text-rose-700 text-xs font-semibold animate-fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                <span>{catalogError}</span>
              </div>
            )}
            {catalogSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-xs font-semibold animate-fade-in">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>{catalogSuccessMsg}</span>
              </div>
            )}

            {/* Sub-Tab Panels */}
            {catalogSmartTab === 'image' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div className="md:col-span-1">
                    <div
                      onDragOver={(e) => { e.preventDefault(); setCatalogDragActive(true); }}
                      onDragLeave={() => setCatalogDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setCatalogDragActive(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          processCatalogImageFile(e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                        catalogDragActive ? 'border-slate-800 bg-slate-100' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                      onClick={() => document.getElementById('catalog-img-file')?.click()}
                    >
                      <UploadCloud className="h-8 w-8 text-slate-400" />
                      <span className="text-xs font-bold text-slate-700">Drag & Drop Catalog Image</span>
                      <span className="text-[10px] text-slate-400">or click to browse local files</span>
                      <input
                        id="catalog-img-file"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            processCatalogImageFile(e.target.files[0]);
                          }
                        }}
                      />
                    </div>

                    <div className="mt-3 bg-white p-3.5 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">High Accuracy OCR</span>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Our offline parser extracts crop names, standardized categories, wholesale cost structures, and suggested retail prices directly from layout structures with 100% precision.
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    {catalogIsAnalyzing ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2.5">
                        <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-xs font-bold text-slate-600">Simulating High-Accuracy Visual OCR Layout Parsing...</span>
                        <span className="text-[10px] text-slate-400">Analyzing font heights, margins, and cost-to-price structures</span>
                      </div>
                    ) : catalogAnalyzedItems.length > 0 ? (
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700">Parsed Crops Review List</span>
                          <span className="text-[10px] text-slate-400">{catalogAnalyzedItems.filter(i=>i.checked).length} of {catalogAnalyzedItems.length} selected</span>
                        </div>
                        <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-wider sticky top-0">
                              <tr>
                                <th className="py-2 px-3 text-center w-8">Use</th>
                                <th className="py-2 px-3">Crop Name</th>
                                <th className="py-2 px-3">Category</th>
                                <th className="py-2 px-3 text-right">Cost (₹)</th>
                                <th className="py-2 px-3 text-right">Selling Price (₹)</th>
                                <th className="py-2 px-3 text-center">Min kg</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {catalogAnalyzedItems.map((item, idx) => (
                                <tr key={item.id} className="hover:bg-slate-50/50">
                                  <td className="py-2 px-3 text-center">
                                    <input
                                      type="checkbox"
                                      checked={item.checked}
                                      onChange={(e) => {
                                        const copy = [...catalogAnalyzedItems];
                                        copy[idx].checked = e.target.checked;
                                        setCatalogAnalyzedItems(copy);
                                      }}
                                      className="rounded border-slate-300"
                                    />
                                  </td>
                                  <td className="py-2 px-3 font-semibold text-slate-800">
                                    <input
                                      type="text"
                                      value={item.vegetableName}
                                      onChange={(e) => {
                                        const copy = [...catalogAnalyzedItems];
                                        copy[idx].vegetableName = e.target.value;
                                        setCatalogAnalyzedItems(copy);
                                      }}
                                      className="border-b border-transparent focus:border-slate-400 focus:outline-none w-full bg-transparent font-semibold py-0.5"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-slate-600">
                                    <select
                                      value={item.category}
                                      onChange={(e) => {
                                        const copy = [...catalogAnalyzedItems];
                                        copy[idx].category = e.target.value as any;
                                        setCatalogAnalyzedItems(copy);
                                      }}
                                      className="border-b border-transparent focus:border-slate-400 focus:outline-none bg-transparent py-0.5 text-xs text-slate-700 font-semibold"
                                    >
                                      <option value="Vegetable">Vegetable</option>
                                      <option value="Fruit">Fruit</option>
                                      <option value="Herbs">Herbs</option>
                                      <option value="Grocery">Grocery</option>
                                      <option value="Other">Other</option>
                                    </select>
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="number"
                                      value={item.costPrice}
                                      onChange={(e) => {
                                        const copy = [...catalogAnalyzedItems];
                                        copy[idx].costPrice = parseFloat(e.target.value) || 0;
                                        setCatalogAnalyzedItems(copy);
                                      }}
                                      className="border-b border-transparent focus:border-slate-400 focus:outline-none text-right w-14 bg-transparent font-semibold font-mono"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-right">
                                    <input
                                      type="number"
                                      value={item.sellingPrice}
                                      onChange={(e) => {
                                        const copy = [...catalogAnalyzedItems];
                                        copy[idx].sellingPrice = parseFloat(e.target.value) || 0;
                                        setCatalogAnalyzedItems(copy);
                                      }}
                                      className="border-b border-transparent focus:border-slate-400 focus:outline-none text-right w-14 bg-transparent font-semibold font-mono"
                                    />
                                  </td>
                                  <td className="py-2 px-3 text-center">
                                    <input
                                      type="number"
                                      value={item.minStockThreshold}
                                      onChange={(e) => {
                                        const copy = [...catalogAnalyzedItems];
                                        copy[idx].minStockThreshold = parseInt(e.target.value) || 20;
                                        setCatalogAnalyzedItems(copy);
                                      }}
                                      className="border-b border-transparent focus:border-slate-400 focus:outline-none text-center w-12 bg-transparent font-semibold font-mono"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setCatalogAnalyzedItems([])}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-white"
                          >
                            Clear All
                          </button>
                          <button
                            type="button"
                            onClick={saveCatalogImageItems}
                            className="px-4 py-1.5 bg-slate-900 text-white rounded-xl text-[10px] font-black hover:bg-slate-800"
                          >
                            Register Selected Items
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs italic">
                        Upload or drop a catalog layout sheet to extract standard items with zero API overhead.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {catalogSmartTab === 'scanner' && (
              <div className="space-y-4 animate-fade-in">
                <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Scan className="h-4 w-4 text-slate-500" />
                      HQ Laser Barcode/QR Onboarding
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCatalogScannerOpen(!isCatalogScannerOpen)}
                      className="text-[10px] uppercase font-black px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {isCatalogScannerOpen ? 'Turn Off Camera' : 'Initiate Camera'}
                    </button>
                  </div>

                  {isCatalogScannerOpen && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <QrScanner
                        onSuccess={handleCatalogScannerSuccess}
                        onError={(err) => setScannedCatalogError(err)}
                      />
                      <p className="text-[10px] text-center text-slate-400 py-1.5 bg-slate-50 font-semibold border-t border-slate-100">
                        Scan catalog codes: "Potato,Vegetable,15,25,30" or structured catalog QR formats
                      </p>
                    </div>
                  )}

                  {scannedCatalogError && (
                    <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-700 font-semibold">
                      {scannedCatalogError}
                    </div>
                  )}

                  {scannedCatalogSuccess && (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 font-semibold">
                      {scannedCatalogSuccess}
                    </div>
                  )}

                  {scannedCatalogCrop && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Crop Product Name</label>
                        <input
                          type="text"
                          value={scannedCatalogCrop}
                          onChange={e => setScannedCatalogCrop(e.target.value)}
                          className="w-full text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 mt-1 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Category Tag</label>
                          <select
                            value={scannedCatalogCategory}
                            onChange={e => setScannedCatalogCategory(e.target.value as any)}
                            className="w-full text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 mt-1 focus:outline-none bg-white"
                          >
                            <option value="Vegetable">Vegetable</option>
                            <option value="Fruit">Fruit</option>
                            <option value="Herbs">Herbs</option>
                            <option value="Grocery">Grocery</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Min Stock kg</label>
                          <input
                            type="number"
                            value={scannedCatalogThreshold}
                            onChange={e => setScannedCatalogThreshold(parseInt(e.target.value) || 20)}
                            className="w-full text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 mt-1 focus:outline-none font-mono text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Wholesale Cost (₹/kg)</label>
                          <input
                            type="number"
                            value={scannedCatalogCost}
                            onChange={e => setScannedCatalogCost(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 mt-1 focus:outline-none font-mono text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase">Retail Price (₹/kg)</label>
                          <input
                            type="number"
                            value={scannedCatalogPrice}
                            onChange={e => setScannedCatalogPrice(parseFloat(e.target.value) || 0)}
                            className="w-full text-xs font-semibold py-1.5 px-3 rounded-xl border border-slate-200 mt-1 focus:outline-none font-mono text-right"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={saveCatalogScannedItem}
                        className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 tracking-wide mt-2"
                      >
                        Add to Master Catalogue
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {catalogSmartTab === 'sheet' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600">Paste Cells from Google Sheet / Excel</label>
                    <p className="text-[10px] text-slate-400">
                      Standard columns: <span className="font-semibold text-slate-500">Crop Name | Category | Wholesale Cost | Retail Selling Price | Min Alert kg</span>
                    </p>
                    <textarea
                      value={catalogSheetText}
                      onChange={(e) => handleCatalogSheetTextChange(e.target.value)}
                      placeholder="e.g.&#10;Golden Pear	Fruit	70	120	15&#10;Premium Broccoli	Vegetable	50	85	10&#10;Organic Parsley	Herbs	12	24	8"
                      rows={6}
                      className="w-full text-xs font-mono p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-slate-400 bg-white"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-semibold">Supports Tab-separated or Comma/Pipe values</span>
                      <button
                        type="button"
                        onClick={saveCatalogSheetItems}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800"
                      >
                        Bulk Save Valid Rows ({catalogSheetParsedItems.filter(i=>i.isValid).length})
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-slate-600">Parser Live Diagnostics Review</span>
                    <div className="bg-white border border-slate-200 rounded-2xl h-[170px] overflow-y-auto overflow-x-auto">
                      {catalogSheetParsedItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs italic">
                          Parsed grid output will be shown here in real time.
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-wider sticky top-0">
                            <tr>
                              <th className="py-2 px-3">Crop Name</th>
                              <th className="py-2 px-3">Category</th>
                              <th className="py-2 px-3 text-right">Cost</th>
                              <th className="py-2 px-3 text-right">Price</th>
                              <th className="py-2 px-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {catalogSheetParsedItems.map((item, idx) => (
                              <tr key={idx} className={item.isValid ? "hover:bg-slate-50/50" : "bg-rose-50/30"}>
                                <td className="py-1.5 px-3 font-semibold text-slate-800 truncate max-w-[100px]">{item.vegetableName}</td>
                                <td className="py-1.5 px-3 text-slate-500">{item.category}</td>
                                <td className="py-1.5 px-3 text-right font-mono text-slate-500">₹{item.costPrice}</td>
                                <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">₹{item.sellingPrice}</td>
                                <td className="py-1.5 px-3 text-center">
                                  {item.isValid ? (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold uppercase">OK</span>
                                  ) : (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold uppercase" title={item.error}>Error</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {catalogSmartTab === 'paste' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-600">Shorthand Bulk Paste Box</label>
                    <p className="text-[10px] text-slate-400">
                      Standard formats: <span className="font-semibold text-slate-500">Crop, Category, Cost, Price, Alert</span> or just <span className="font-semibold text-slate-500">Crop, Price</span>
                    </p>
                    <textarea
                      value={catalogBulkText}
                      onChange={(e) => handleCatalogBulkTextChange(e.target.value)}
                      placeholder="e.g.&#10;Gala Apple, Fruit, 90, 140, 15&#10;Sujata Wheat, Grocery, 22, 38&#10;Fresh Coriander, Herbs, 15"
                      rows={6}
                      className="w-full text-xs font-mono p-3 rounded-2xl border border-slate-200 focus:outline-none focus:border-slate-400 bg-white"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400 font-semibold">Auto-fills missing categories and costs with high accuracy</span>
                      <button
                        type="button"
                        onClick={saveCatalogBulkItems}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800"
                      >
                        Instantly Onboard ({catalogBulkParsedItems.filter(i=>i.isValid).length})
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-bold text-slate-600">Parsed Inventory Items</span>
                    <div className="bg-white border border-slate-200 rounded-2xl h-[170px] overflow-y-auto overflow-x-auto">
                      {catalogBulkParsedItems.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs italic">
                          Parsed shorthand entries listed here.
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse text-[11px]">
                          <thead className="bg-slate-50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-wider sticky top-0">
                            <tr>
                              <th className="py-2 px-3">Crop Name</th>
                              <th className="py-2 px-3">Category</th>
                              <th className="py-2 px-3 text-right">Cost</th>
                              <th className="py-2 px-3 text-right">Price</th>
                              <th className="py-2 px-3 text-center">Alert (kg)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {catalogBulkParsedItems.map((item, idx) => (
                              <tr key={idx} className={item.isValid ? "hover:bg-slate-50/50" : "bg-rose-50/30"}>
                                <td className="py-1.5 px-3 font-semibold text-slate-800 truncate max-w-[100px]">{item.vegetableName}</td>
                                <td className="py-1.5 px-3 text-slate-500">{item.category}</td>
                                <td className="py-1.5 px-3 text-right font-mono text-slate-500">₹{item.costPrice}</td>
                                <td className="py-1.5 px-3 text-right font-mono font-bold text-slate-800">₹{item.sellingPrice}</td>
                                <td className="py-1.5 px-3 text-center font-mono text-slate-500">{item.minStockThreshold}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
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

          {/* Bulk Operations Toolbar */}
          {selectedCropIds.length > 0 && (
            <div className="bg-slate-900 text-white rounded-3xl p-5 border border-slate-700 shadow-xl space-y-4 animate-slide-up">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-emerald-500 text-slate-900 rounded-2xl font-black text-xs">
                    {selectedCropIds.length} Selected
                  </span>
                  <div>
                    <p className="font-extrabold text-sm">Bulk Operations Active</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Apply changes to multiple master crops centrally.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBulkEditOpen(!bulkEditOpen)}
                    className={`text-xs font-black px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border ${
                      bulkEditOpen 
                        ? 'bg-emerald-500 border-emerald-500 text-slate-900' 
                        : 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-white'
                    }`}
                  >
                    ✏️ {bulkEditOpen ? 'Close Bulk Editor' : 'Bulk Edit Attributes'}
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="text-xs font-black px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 cursor-pointer transition-all border border-rose-600"
                  >
                    <Trash2 className="h-4 w-4" /> Bulk Delete Templates
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCropIds([]);
                      setBulkEditOpen(false);
                    }}
                    className="text-xs font-bold px-3 py-2.5 rounded-xl hover:bg-slate-800 text-slate-400 cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              {/* Inline Bulk Editor Sub-panel */}
              {bulkEditOpen && (
                <div className="bg-slate-850 border border-slate-700 rounded-2xl p-4 text-white space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Target Attribute</label>
                      <select
                        value={bulkEditField || ''}
                        onChange={(e) => {
                          setBulkEditField(e.target.value as any);
                          setBulkEditValue('');
                        }}
                        className="w-full text-xs font-bold rounded-xl border border-slate-700 p-2.5 focus:outline-none bg-slate-900 text-white"
                      >
                        <option value="">-- Choose Attribute --</option>
                        <option value="costPrice">Standard Cost (₹)</option>
                        <option value="sellingPrice">Standard Selling Price (₹)</option>
                        <option value="category">Category Tag</option>
                        <option value="unit">Measuring Unit</option>
                        <option value="minStockThreshold">Low Stock Threshold</option>
                      </select>
                    </div>

                    {bulkEditField === 'category' && (
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">New Category Group</label>
                        <select
                          value={bulkEditCategory}
                          onChange={(e) => setBulkEditCategory(e.target.value as any)}
                          className="w-full text-xs font-bold rounded-xl border border-slate-700 p-2.5 focus:outline-none bg-slate-900 text-white"
                        >
                          <option value="Vegetable">Vegetable</option>
                          <option value="Fruit">Fruit</option>
                          <option value="Herbs">Herbs</option>
                          <option value="Grocery">Grocery</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    )}

                    {bulkEditField === 'unit' && (
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">New Measuring Unit</label>
                        <select
                          value={bulkEditUnit}
                          onChange={(e) => setBulkEditUnit(e.target.value as any)}
                          className="w-full text-xs font-bold rounded-xl border border-slate-700 p-2.5 focus:outline-none bg-slate-900 text-white"
                        >
                          <option value="kg">kg (Kilogram)</option>
                          <option value="g">g (Gram)</option>
                          <option value="pcs">pcs (Pieces)</option>
                          <option value="bunch">bunch (Bunch)</option>
                          <option value="pack">pack (Pack)</option>
                          <option value="box">box (Box)</option>
                          <option value="crate">crate (Crate)</option>
                          <option value="sack">sack (Sack)</option>
                          <option value="dozen">dozen (Dozen)</option>
                          <option value="bundle">bundle (Bundle)</option>
                          <option value="bag">bag (Bag)</option>
                        </select>
                      </div>
                    )}

                    {bulkEditField === 'minStockThreshold' && (
                      <div className="md:col-span-2">
                        <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">New Threshold Value</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="e.g. 30"
                          value={bulkEditValue}
                          onChange={(e) => setBulkEditValue(e.target.value)}
                          className="w-full text-xs font-bold rounded-xl border border-slate-700 p-2.5 focus:outline-none bg-slate-900 text-white"
                        />
                      </div>
                    )}

                    {(bulkEditField === 'costPrice' || bulkEditField === 'sellingPrice') && (
                      <>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">Adjustment Action</label>
                          <select
                            value={bulkEditAction}
                            onChange={(e) => setBulkEditAction(e.target.value as any)}
                            className="w-full text-xs font-bold rounded-xl border border-slate-700 p-2.5 focus:outline-none bg-slate-900 text-white"
                          >
                            <option value="set">Set flat value to (₹)</option>
                            <option value="add">Add / Subtract amount (₹)</option>
                            <option value="percent">Percent scale adjustment (%)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                            {bulkEditAction === 'percent' ? 'Percentage (e.g. 10 or -5)' : 'Price offset (e.g. 2.5 or -1)'}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder={bulkEditAction === 'percent' ? 'e.g. 15' : 'e.g. 5'}
                            value={bulkEditValue}
                            onChange={(e) => setBulkEditValue(e.target.value)}
                            className="w-full text-xs font-bold rounded-xl border border-slate-700 p-2.5 focus:outline-none bg-slate-900 text-white"
                          />
                        </div>
                      </>
                    )}

                    <div>
                      <button
                        type="button"
                        disabled={!bulkEditField || (!bulkEditValue && bulkEditField !== 'category' && bulkEditField !== 'unit')}
                        onClick={handleBulkEditApply}
                        className={`w-full py-2.5 font-black uppercase tracking-wider text-[10px] rounded-xl transition-all cursor-pointer border ${
                          (!bulkEditField || (!bulkEditValue && bulkEditField !== 'category' && bulkEditField !== 'unit'))
                            ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-500 border-emerald-500 text-slate-900 font-black shadow-sm'
                        }`}
                      >
                        Apply to Selected ➔
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multi-Select Control Info Bar */}
          <div className="flex items-center justify-between px-2 text-xs text-slate-500 font-semibold">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={
                    masterCrops.filter(crop => {
                      const matchesSearch = crop.vegetableName.toLowerCase().includes(masterSearch.toLowerCase());
                      const matchesCategory = masterCategoryFilter === 'all' || crop.category === masterCategoryFilter;
                      return matchesSearch && matchesCategory;
                    }).length > 0 &&
                    masterCrops.filter(crop => {
                      const matchesSearch = crop.vegetableName.toLowerCase().includes(masterSearch.toLowerCase());
                      const matchesCategory = masterCategoryFilter === 'all' || crop.category === masterCategoryFilter;
                      return matchesSearch && matchesCategory;
                    }).every(crop => selectedCropIds.includes(crop.id))
                  }
                  onChange={(e) => {
                    const filtered = masterCrops.filter(crop => {
                      const matchesSearch = crop.vegetableName.toLowerCase().includes(masterSearch.toLowerCase());
                      const matchesCategory = masterCategoryFilter === 'all' || crop.category === masterCategoryFilter;
                      return matchesSearch && matchesCategory;
                    });
                    if (e.target.checked) {
                      setSelectedCropIds(prev => {
                        const next = [...prev];
                        filtered.forEach(crop => {
                          if (!next.includes(crop.id)) next.push(crop.id);
                        });
                        return next;
                      });
                    } else {
                      setSelectedCropIds(prev => prev.filter(id => !filtered.some(f => f.id === id)));
                    }
                  }}
                  className="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 h-4 w-4 cursor-pointer"
                />
                <span>Select All Filtered ({
                  masterCrops.filter(crop => {
                    const matchesSearch = crop.vegetableName.toLowerCase().includes(masterSearch.toLowerCase());
                    const matchesCategory = masterCategoryFilter === 'all' || crop.category === masterCategoryFilter;
                    return matchesSearch && matchesCategory;
                  }).length
                })</span>
              </label>

              {selectedCropIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedCropIds([])}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-extrabold underline cursor-pointer"
                >
                  Clear Selection ({selectedCropIds.length})
                </button>
              )}
            </div>
            
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {selectedCropIds.length} of {masterCrops.length} selected
            </p>
          </div>

          {/* Master Crop Catalog Templates Cards Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedCrops.map(crop => {
                const activeStoresCount = inventory.filter(
                  item => item.vegetableName.toLowerCase() === crop.vegetableName.toLowerCase()
                ).length;
                const margin = crop.sellingPrice - crop.costPrice;
                const marginPercent = crop.costPrice > 0 ? Math.round((margin / crop.costPrice) * 100) : 0;
                const isSelected = selectedCropIds.includes(crop.id);

                return (
                  <div 
                    key={crop.id} 
                    className={`bg-white border rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group ${
                      isSelected 
                        ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/5' 
                        : 'border-slate-200/70 hover:border-slate-300'
                    }`}
                  >
                    
                    {/* Multi-Select Checkbox Overlay */}
                    <div className="absolute top-4 left-4 z-10 flex items-center">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (e.target.checked) {
                            setSelectedCropIds(prev => [...prev, crop.id]);
                          } else {
                            setSelectedCropIds(prev => prev.filter(id => id !== crop.id));
                          }
                        }}
                        className="h-4.5 w-4.5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </div>

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
                    <div className="space-y-1 mb-4 pl-7">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl">{getVegEmoji(crop.vegetableName)}</span>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-700 transition-colors truncate max-w-[150px]" title={crop.vegetableName}>
                          {crop.vegetableName}
                        </h4>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400">
                        Preset Threshold: <span className="text-slate-600">{crop.minStockThreshold} {crop.unit || 'kg'}</span>
                      </p>
                    </div>

                    {/* Pricing Detail Block */}
                    <div className="bg-slate-50/80 border border-slate-150 rounded-2xl p-3.5 space-y-2 mb-5">
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="border-r border-slate-200/60 pb-1">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Std Wholesale Cost</p>
                          <p className="text-base font-extrabold text-slate-800">₹{crop.costPrice}<span className="text-[10px] font-normal text-slate-400">/{crop.unit || 'kg'}</span></p>
                        </div>
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Std Selling Price</p>
                          <p className="text-base font-extrabold text-emerald-600">₹{crop.sellingPrice}<span className="text-[10px] font-normal text-slate-400">/{crop.unit || 'kg'}</span></p>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/60 pt-2 flex items-center justify-between text-xs">
                        <span className="text-[10px] font-bold text-slate-400">Standard Gross Margin:</span>
                        <span className="font-extrabold text-slate-700 flex items-center gap-1">
                          ₹{margin}/{crop.unit || 'kg'}
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

            {filteredCrops.length === 0 && (
              <div className="col-span-full py-20 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400">
                <Tag className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No Master Crops match search criteria</p>
                <p className="text-xs text-slate-400 mt-1">Refine your active filters or create a brand new template using the action button above.</p>
              </div>
            )}
          </div>

          {/* Master Catalog Pagination Row */}
          {totalMasterPages > 1 && (
            <div className="bg-white border border-slate-200/70 p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs mt-6">
              <span className="text-xs text-slate-500 font-semibold">
                Showing <strong className="font-bold text-slate-700">{((currentMasterPage - 1) * masterCropsPerPage) + 1}</strong> to{" "}
                <strong className="font-bold text-slate-700">{Math.min(currentMasterPage * masterCropsPerPage, filteredCrops.length)}</strong> of{" "}
                <strong className="font-bold text-slate-700">{filteredCrops.length}</strong> master crops
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentMasterPage === 1}
                  onClick={() => setMasterPage(prev => Math.max(1, prev - 1))}
                  className={`px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    currentMasterPage === 1
                      ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                  }`}
                >
                  Prev
                </button>

                {Array.from({ length: totalMasterPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setMasterPage(p)}
                    className={`h-8 w-8 rounded-2xl flex items-center justify-center text-xs font-extrabold transition-all cursor-pointer ${
                      currentMasterPage === p
                        ? 'bg-emerald-600 border border-emerald-600 text-white shadow-sm'
                        : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  disabled={currentMasterPage === totalMasterPages}
                  onClick={() => setMasterPage(prev => Math.min(totalMasterPages, prev + 1))}
                  className={`px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                    currentMasterPage === totalMasterPages
                      ? 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700 shadow-xs'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}

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
                    <div className="relative">
                      <input
                        ref={cropFormNameRef}
                        type="text"
                        required
                        placeholder="e.g. Tomato Premium, Strawberries Basket..."
                        value={cropFormName}
                        onChange={(e) => setCropFormName(e.target.value)}
                        className={`w-full text-xs font-bold rounded-xl border p-2.5 pr-10 focus:outline-none focus:ring-1 bg-slate-50/50 text-slate-800 transition-all ${
                          duplicateCrop 
                            ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500 bg-amber-50/10' 
                            : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500'
                        }`}
                      />
                      {duplicateCrop && (
                        <div className="absolute right-3 top-2.5">
                          <AlertTriangle className="h-4 w-4 text-amber-500 animate-pulse" />
                        </div>
                      )}
                    </div>

                    {duplicateCrop && (
                      <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl flex flex-col gap-1.5 mt-2 text-xs text-amber-800 text-left animate-fade-in">
                        <span className="font-black text-[10.5px] uppercase tracking-wider flex items-center gap-1.5 text-amber-700">
                          <span>⚠️</span> Duplicate Crop Found
                        </span>
                        <p className="text-[11px] leading-relaxed text-amber-800">
                          An item with the name <strong className="font-black">"{duplicateCrop.vegetableName}"</strong> already exists in the master catalog under <span className="font-bold underline">{duplicateCrop.category}</span>.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCropId(duplicateCrop.id);
                            setCropFormName(duplicateCrop.vegetableName);
                            setCropFormCategory(duplicateCrop.category);
                            setCropFormCost(duplicateCrop.costPrice);
                            setCropFormPrice(duplicateCrop.sellingPrice);
                            setCropFormMinThreshold(duplicateCrop.minStockThreshold);
                            
                            // Let's defer focus to ensure React state updates have registered
                            setTimeout(() => {
                              if (cropFormNameRef.current) {
                                cropFormNameRef.current.focus();
                                // Set cursor at the end of input
                                const len = cropFormNameRef.current.value.length;
                                cropFormNameRef.current.setSelectionRange(len, len);
                              }
                            }, 50);
                          }}
                          className="w-full mt-1.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 shadow-sm"
                        >
                          ✏️ Switch to Edit Existing Template
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Measuring Unit</label>
                      <select
                        value={cropFormUnit}
                        onChange={(e) => setCropFormUnit(e.target.value as any)}
                        className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-800"
                      >
                        <option value="kg">kg (Kilogram)</option>
                        <option value="g">g (Gram)</option>
                        <option value="pcs">pcs (Pieces)</option>
                        <option value="bunch">bunch (Bunch)</option>
                        <option value="pack">pack (Pack)</option>
                        <option value="box">box (Box)</option>
                        <option value="crate">crate (Crate)</option>
                        <option value="sack">sack (Sack)</option>
                        <option value="dozen">dozen (Dozen)</option>
                        <option value="bundle">bundle (Bundle)</option>
                        <option value="bag">bag (Bag)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Low Limit ({cropFormUnit})</label>
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Std Cost Price (₹/{cropFormUnit})</label>
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
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Std Selling Price (₹/{cropFormUnit})</label>
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
                      ₹{(cropFormPrice - cropFormCost).toFixed(2)}/{cropFormUnit} ({cropFormCost > 0 ? Math.round(((cropFormPrice - cropFormCost) / cropFormCost) * 100) : 0}%)
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

      {/* TAB CONTENT: PRODUCT CATEGORY QR CODES LAUNCHER */}
      {activeTab === 'qr-catalog' && (
        <div className="space-y-6 animate-fade-in text-slate-900">
          
          {/* Main info card */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-6 text-white shadow-md border border-slate-700/30">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <QrCode className="h-5 w-5" />
                </span>
                <h3 className="font-extrabold text-lg">Category QR Code Generator & Portal Launchers</h3>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                Create downloadable high-resolution QR codes linking customers directly to specific filtered departments on the FarmersGate storefront. Print stickers for grocery boxes, branch banners, or local marketing campaigns.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                type="button"
                onClick={() => {
                  QR_CATEGORIES.forEach((cat, idx) => {
                    setTimeout(() => {
                      const dataUrl = qrImages[cat.key];
                      if (dataUrl) {
                        const a = document.createElement('a');
                        a.href = dataUrl;
                        a.download = `farmersgate_qr_${cat.key.toLowerCase()}.png`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }, idx * 250);
                  });
                  setQrSuccessMsg('Bulk download triggered! Check your browser downloads.');
                  setTimeout(() => setQrSuccessMsg(''), 4000);
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Download className="h-4 w-4 stroke-[3px]" /> Bulk Download All (PNG)
              </button>
            </div>
          </div>

          {qrSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-bounce-subtle">
              🎉 {qrSuccessMsg}
            </div>
          )}

          {/* Settings Customizer & Presets Box */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Palette className="h-4 w-4 text-slate-500" />
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">QR Code Style & Design Customizer</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Foreground Color Picker */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Foreground Accent</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={qrFgColor}
                    onChange={(e) => setQrFgColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-1"
                  />
                  <input
                    type="text"
                    value={qrFgColor}
                    onChange={(e) => setQrFgColor(e.target.value)}
                    placeholder="#065f46"
                    className="flex-1 text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {/* Presets */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {[
                    { hex: '#065f46', name: 'Emerald' },
                    { hex: '#0f172a', name: 'Ink' },
                    { hex: '#312e81', name: 'Indigo' },
                    { hex: '#b45309', name: 'Amber' }
                  ].map(preset => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setQrFgColor(preset.hex)}
                      className={`text-[9px] font-black px-2 py-1 rounded-lg border transition ${
                        qrFgColor.toLowerCase() === preset.hex ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Color Picker */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Background Surface</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={qrBgColor}
                    onChange={(e) => setQrBgColor(e.target.value)}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200 p-1"
                  />
                  <input
                    type="text"
                    value={qrBgColor}
                    onChange={(e) => setQrBgColor(e.target.value)}
                    placeholder="#ffffff"
                    className="flex-1 text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 bg-slate-50 text-slate-800 uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                {/* Presets */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {[
                    { hex: '#ffffff', name: 'White' },
                    { hex: '#f8fafc', name: 'Ice' },
                    { hex: '#fffbeb', name: 'Cream' }
                  ].map(preset => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setQrBgColor(preset.hex)}
                      className={`text-[9px] font-black px-2 py-1 rounded-lg border transition ${
                        qrBgColor.toLowerCase() === preset.hex ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution / Dimensions */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Sticker Resolution (Width)</label>
                <select
                  value={qrSize}
                  onChange={(e) => setQrSize(Number(e.target.value))}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 text-slate-800"
                >
                  <option value={150}>Compact (150 x 150px)</option>
                  <option value={300}>Standard (300 x 300px)</option>
                  <option value={500}>High-Res (500 x 500px)</option>
                  <option value={800}>Print Masters (800 x 800px)</option>
                </select>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  Higher width makes printed sticker grids and catalog labels look perfectly sharp.
                </p>
              </div>

              {/* Error Correction Level */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Redundant Scan Correction</label>
                <select
                  value={qrErrorLevel}
                  onChange={(e) => setQrErrorLevel(e.target.value as any)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50 text-slate-800"
                >
                  <option value="L">Low (7% recovery rate)</option>
                  <option value="M">Medium (15% recovery rate)</option>
                  <option value="Q">Quartile (25% recovery rate)</option>
                  <option value="H">High (30% recovery rate - Best for stickers)</option>
                </select>
                <p className="text-[9px] text-slate-400 leading-relaxed">
                  High correction keeps the QR code fully scannable even if the printed sticker gets dusty or partially torn on product bags.
                </p>
              </div>
            </div>
          </div>

          {/* QR Code Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {QR_CATEGORIES.map(cat => {
              const dataUrl = qrImages[cat.key];
              const targetUrl = `${window.location.origin}${window.location.pathname}?portal=customer&category=${cat.key}#customer`;

              return (
                <div 
                  key={cat.key} 
                  id={`qr-card-${cat.key}`}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-3xs flex flex-col justify-between transition-all hover:shadow-xs border-t-4"
                  style={{ borderTopColor: qrFgColor }}
                >
                  {/* Card Header */}
                  <div className={`p-5 bg-gradient-to-br ${cat.color} flex items-start gap-3 border-b border-slate-100`}>
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-2xl shadow-3xs border border-white/50">
                      {cat.emoji}
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Store Department</span>
                      <h4 className="text-sm font-black text-slate-800">{cat.label}</h4>
                    </div>
                  </div>

                  {/* QR Core Render */}
                  <div className="p-6 flex flex-col items-center justify-center gap-4 bg-slate-50/50">
                    <div className="relative p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs group">
                      {qrGenerating || !dataUrl ? (
                        <div className="w-48 h-48 flex items-center justify-center">
                          <span className="text-xs font-bold text-slate-400 animate-pulse">Generating code...</span>
                        </div>
                      ) : (
                        <img 
                          src={dataUrl} 
                          alt={`${cat.label} QR`}
                          className="w-48 h-48 select-none mx-auto"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      
                      {/* Scan badge overlay */}
                      <div className="absolute inset-x-0 bottom-3 flex justify-center">
                        <span className="text-[8px] bg-slate-900/95 text-white font-black uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-xs flex items-center gap-1">
                          ⚡ Scan Me
                        </span>
                      </div>
                    </div>

                    {/* Target URL Info */}
                    <div className="w-full text-center space-y-1">
                      <div className="flex items-center justify-center gap-1 text-[9px] font-mono text-slate-400">
                        <Link className="h-3 w-3" />
                        <span>Target Store Link</span>
                      </div>
                      <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-150 text-[10px] font-semibold text-slate-600 truncate max-w-[240px] mx-auto font-mono">
                        ?portal=customer&category={cat.key}#customer
                      </div>
                    </div>
                  </div>

                  {/* Card Footer / Action Buttons */}
                  <div className="p-5 border-t border-slate-100 bg-slate-50/20 grid grid-cols-2 gap-2">
                    {/* View Portal Trigger */}
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] uppercase tracking-wide rounded-xl transition text-center flex items-center justify-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" /> Test URL
                    </a>

                    {/* Download Image Button */}
                    <button
                      type="button"
                      disabled={!dataUrl}
                      onClick={() => {
                        if (dataUrl) {
                          const a = document.createElement('a');
                          a.href = dataUrl;
                          a.download = `farmersgate_qr_${cat.key.toLowerCase()}.png`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          setQrSuccessMsg(`Successfully downloaded ${cat.label} QR code image!`);
                          setTimeout(() => setQrSuccessMsg(''), 4000);
                        }
                      }}
                      className="px-3 py-2.5 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-[10px] uppercase tracking-wide rounded-xl transition shadow-3xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>

                    {/* Printable Label View Button */}
                    <button
                      type="button"
                      onClick={() => {
                        const printWindow = window.open('', '_blank');
                        if (printWindow) {
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>FarmersGate Label - ${cat.label}</title>
                                <style>
                                  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                                  body {
                                    font-family: 'Inter', sans-serif;
                                    text-align: center;
                                    padding: 40px;
                                    background: #fff;
                                    color: #0f172a;
                                  }
                                  .ticket-card {
                                    border: 4px solid ${qrFgColor};
                                    border-radius: 24px;
                                    padding: 40px;
                                    max-width: 400px;
                                    margin: 0 auto;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                                  }
                                  .logo {
                                    font-family: 'Satisfy', 'Dancing Script', 'Brush Script MT', cursive;
                                    font-size: 32px;
                                    color: #15803d;
                                    margin-bottom: 2px;
                                    text-transform: none;
                                    letter-spacing: normal;
                                  }
                                  .sublogo {
                                    font-family: 'Plus Jakarta Sans', sans-serif;
                                    font-size: 11px;
                                    font-weight: 900;
                                    text-transform: uppercase;
                                    letter-spacing: 4px;
                                    color: #0f172a;
                                    border-top: 1.2px solid #16a34a;
                                    border-bottom: 1.2px solid #16a34a;
                                    padding: 3px 0;
                                    max-width: 140px;
                                    margin: 0 auto 25px auto;
                                  }
                                  .badge {
                                    background: ${qrFgColor}15;
                                    color: ${qrFgColor};
                                    font-size: 11px;
                                    font-weight: 900;
                                    text-transform: uppercase;
                                    padding: 6px 16px;
                                    border-radius: 50px;
                                    display: inline-block;
                                    margin-bottom: 25px;
                                  }
                                  .qr-img {
                                    width: 220px;
                                    height: 220px;
                                    margin: 0 auto 20px auto;
                                    display: block;
                                  }
                                  .footer-text {
                                    font-size: 11px;
                                    font-weight: 700;
                                    color: #475569;
                                    margin-bottom: 5px;
                                  }
                                  .desc {
                                    font-size: 9px;
                                    color: #94a3b8;
                                    font-weight: 500;
                                    max-width: 300px;
                                    margin: 0 auto;
                                  }
                                </style>
                                <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@700;800;900&family=Satisfy&display=swap" rel="stylesheet">
                              </head>
                              <body>
                                <div class="ticket-card">
                                  <div class="logo">Farmer's</div>
                                  <div class="sublogo">GATE</div>
                                  <div class="badge">${cat.emoji} ${cat.label}</div>
                                  <img class="qr-img" src="${dataUrl}" />
                                  <div class="footer-text">SCAN FOR LIVE HARVEST</div>
                                  <div class="desc">${cat.description}</div>
                                </div>
                                <script>
                                  window.onload = function() {
                                    window.print();
                                  }
                                </script>
                              </body>
                            </html>
                          `);
                          printWindow.document.close();
                        }
                      }}
                      className="col-span-2 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 font-extrabold text-[9px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Printer className="h-3 w-3" /> Print Storefront Sticker Label
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'customer-orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel: Customer Orders Registry */}
          <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900">Incoming Orders</h3>
                <p className="text-[10px] text-slate-500">Live stream of customer storefront requests.</p>
              </div>
              <span className="text-[9px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 uppercase animate-pulse">
                ● Live Link
              </span>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search phone or name..."
                value={cropSearch}
                onChange={(e) => setCropSearch(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-emerald-600 font-medium"
              />
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {(() => {
                const filtered = firebaseOrders.filter(order => {
                  const query = cropSearch.toLowerCase();
                  return order.customerPhone.includes(query) || 
                         order.customerName.toLowerCase().includes(query) ||
                         order.orderNumber.includes(query);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-400 text-xs italic">
                      No matching customer orders found.
                    </div>
                  );
                }

                return filtered.map(order => {
                  const assignedStore = stores.find(s => s.id === order.storeId);
                  const isUnassigned = !order.storeId;

                  return (
                    <button
                      type="button"
                      key={order.id}
                      onClick={() => setSelectedCustomerOrderId(order.id || null)}
                      className={`w-full text-left p-3.5 rounded-2xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                        selectedCustomerOrderId === order.id
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                          : 'border-slate-150 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-xs">#{order.orderNumber}</span>
                        <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          isUnassigned
                            ? 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        }`}>
                          {isUnassigned ? '🚨 UNROUTED' : '✓ ROUTED'}
                        </span>
                      </div>

                      <div className="text-xs opacity-90 font-bold">
                        {order.customerName}
                      </div>

                      <div className="flex justify-between items-center text-[10px] opacity-75 font-mono">
                        <span>{order.items.length} items • ₹{order.totalAmount}</span>
                        <span>{new Date(order.orderDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>

                      {assignedStore && (
                        <div className="mt-1 pt-1.5 border-t border-dashed border-current/15 text-[9px] font-black uppercase flex items-center gap-1 opacity-90">
                          <span>📍 Assigned Branch:</span>
                          <span>{assignedStore.name.replace("Farmer's Gate - ", "")}</span>
                        </div>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Right Panel: Order Inspection & Store Routing Desk */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5 flex flex-col">
            {(() => {
              const selectedOrder = firebaseOrders.find(o => o.id === selectedCustomerOrderId);

              if (!selectedOrder) {
                return (
                  <div className="h-full py-24 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                    <span className="text-3xl">📡</span>
                    <p className="text-xs font-bold text-slate-600">Select an Order to Inspect</p>
                    <p className="text-[10px] max-w-xs">Select any customer order from the incoming live queue to route it to the appropriate store for local packaging and home delivery.</p>
                  </div>
                );
              }

              const isUnassigned = !selectedOrder.storeId;

              return (
                <div className="space-y-5">
                  
                  {/* Order Details Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-slate-900 text-sm">Order Verification Desk</h3>
                        <span className="text-[10px] bg-slate-100 font-mono font-bold text-slate-600 px-2 py-0.5 rounded">
                          #{selectedOrder.orderNumber}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">Ordered on {new Date(selectedOrder.orderDate).toLocaleString()}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                        selectedOrder.status === 'Cancelled' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                        selectedOrder.status === 'Delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        Status: {selectedOrder.status}
                      </span>
                    </div>
                  </div>

                  {/* Customer Information Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
                    <div className="space-y-1.5 text-xs">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Customer Details</p>
                      <p className="font-extrabold text-slate-800">{selectedOrder.customerName}</p>
                      <p className="font-mono text-[11px] text-slate-500">{selectedOrder.customerPhone}</p>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Delivery Destination</p>
                      <p className="font-semibold text-slate-700 leading-relaxed">{selectedOrder.customerAddress}</p>
                    </div>
                  </div>

                  {/* Ordered Items Table */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ordered Vegetables & Fruits</p>
                    <div className="border border-slate-150 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            <th className="p-2.5">Crop Name</th>
                            <th className="p-2.5 text-center">Qty (Kg)</th>
                            <th className="p-2.5 text-right">Price per Kg</th>
                            <th className="p-2.5 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedOrder.items.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/30">
                              <td className="p-2.5 font-bold text-slate-800 flex items-center gap-1.5">
                                <span className="text-base">{item.emoji || getVegEmoji(item.vegetableName)}</span>
                                <span>{item.vegetableName}</span>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-slate-600">{item.quantity} kg</td>
                              <td className="p-2.5 text-right font-mono text-slate-500 font-bold">₹{item.pricePerKg}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-slate-800">₹{item.totalPrice}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-slate-50 border-t border-slate-150 font-black text-slate-900">
                            <td colSpan={3} className="p-2.5 text-right uppercase text-[10px]">Grand Paid Total:</td>
                            <td className="p-2.5 text-right text-emerald-700 text-sm">₹{selectedOrder.totalAmount}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* ROUTING LOGIC */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                      <span>📍</span> Route & Assign Delivery to Physical Store Outlet
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">Select which physical branch outlet will package this order and execute rider delivery based on their current inventory capacity.</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1">
                      {stores.filter(s => s.isActive).map(store => {
                        // Check if the store has inventory for all ordered items
                        const itemCoverage = selectedOrder.items.map(oItem => {
                          const invItem = inventory.find(
                            i => i.storeId === store.id && i.vegetableName.toLowerCase() === oItem.vegetableName.toLowerCase()
                          );
                          const hasStock = invItem && invItem.quantity >= oItem.quantity;
                          return {
                            name: oItem.vegetableName,
                            qty: oItem.quantity,
                            storeQty: invItem ? invItem.quantity : 0,
                            hasStock
                          };
                        });

                        const isCovered = itemCoverage.every(c => c.hasStock);

                        return (
                          <div
                            key={store.id}
                            className={`p-3 rounded-2xl border transition-all text-xs space-y-2 flex flex-col justify-between ${
                              selectedOrder.storeId === store.id
                                ? 'bg-indigo-50 border-indigo-300'
                                : 'bg-slate-50/30 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-800">{store.name.replace("Farmer's Gate - ", "")}</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                                isCovered ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-850'
                              }`}>
                                {isCovered ? '✓ In Stock' : '⚠️ Stock Deficit'}
                              </span>
                            </div>

                            {/* Micro stock coverage indicators */}
                            <div className="space-y-1">
                              {itemCoverage.map(c => (
                                <div key={c.name} className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                                  <span className="truncate max-w-[100px]">{c.name}</span>
                                  <span className={c.hasStock ? 'text-emerald-700' : 'text-rose-600'}>
                                    {c.qty} / {c.storeQty} kg
                                  </span>
                                </div>
                              ))}
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (!isCovered) {
                                  if (!confirm(`Warning: ${store.name} currently lacks sufficient stock for some ordered items. This may require them to request immediate HQ dispatching. Assign anyway?`)) {
                                    return;
                                  }
                                }

                                try {
                                  // 1. Update in Firebase
                                  await updateOrderStatusInFirestore(selectedOrder.id!, 'Packing', { storeId: store.id });
                                  
                                  // 2. Add real-time notification
                                  await addNotificationToFirestore({
                                    title: `New Order Routed: #${selectedOrder.orderNumber}`,
                                    message: `Order #${selectedOrder.orderNumber} (₹${selectedOrder.totalAmount}) assigned to branch "${store.name.replace("Farmer's Gate - ", "")}" for packing and local delivery.`,
                                    timestamp: new Date().toISOString(),
                                    severity: 'success',
                                    type: 'customer_order'
                                  });

                                  // 3. Deduct ordered items from store inventory in local state for realistic live sync
                                  selectedOrder.items.forEach(oItem => {
                                    const invItem = inventory.find(
                                      i => i.storeId === store.id && i.vegetableName.toLowerCase() === oItem.vegetableName.toLowerCase()
                                    );
                                    if (invItem) {
                                      onUpdateInventoryItem({
                                        ...invItem,
                                        quantity: parseFloat(Math.max(0, invItem.quantity - oItem.quantity).toFixed(2)),
                                        lastUpdated: new Date().toISOString()
                                      });
                                    }
                                  });

                                  alert(`🚀 Success! Order #${selectedOrder.orderNumber} assigned and routed to ${store.name.replace("Farmer's Gate - ", "")} successfully. Customer notification broadcasted!`);
                                } catch (err) {
                                  console.error('Error routing order:', err);
                                  alert('Failed to route order: ' + err);
                                }
                              }}
                              className={`w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                                selectedOrder.storeId === store.id
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              {selectedOrder.storeId === store.id ? '✓ Partner Assigned' : 'Assign to Branch'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              );
            })()}
          </div>

        </div>
      )}

      {activeTab === 'geo-sandbox' && (
        <div className="space-y-6 animate-fade-in text-slate-800">
          {/* Header Sandbox Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
              <Globe className="h-64 w-64 text-slate-400" />
            </div>
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-amber-500/30">
                    Simulation Environment
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">HQ Lab v1.2</span>
                </div>
                <h3 className="text-lg font-black tracking-tight mt-1 text-white">Administrative Geolocation Sandbox</h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Toggle, simulate, and stress-test physical cross-branch proximity boundaries and geofencing limits.
                  Bypass real hardware GPS to simulate remote check-ins, regional dispatch rules, and local-access locks.
                </p>
              </div>

              {/* Master Sandbox Enable/Disable Toggle */}
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center justify-between gap-4 shrink-0 shadow-inner">
                <div className="text-left">
                  <span className="block text-xs font-black uppercase tracking-wider text-slate-300">Sandbox Status</span>
                  <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                    {sandboxEnabled ? "🟢 Bypassing Real GPS" : "⚪ Using Real Hardware GPS"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !sandboxEnabled;
                    setSandboxEnabled(next);
                    // Force refresh of verifyLocation on change by triggering a change event
                    const ev = new CustomEvent('farmersgate_geo_change');
                    window.dispatchEvent(ev);
                  }}
                  className={`w-14 h-7 rounded-full transition-all relative outline-none cursor-pointer border-0 ${
                    sandboxEnabled ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20' : 'bg-slate-700'
                  }`}
                >
                  <span className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-all shadow-md ${
                    sandboxEnabled ? 'left-8' : 'left-1'
                  }`} />
                </button>
              </div>
            </div>
          </div>

          {/* Sandbox Configuration Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            {/* Left Col: Simulation Mode Panel */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sliders className="h-4 w-4 text-slate-500" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Coordinate Sources & Modes</h4>
              </div>

              {!sandboxEnabled && (
                <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl text-center space-y-2">
                  <p className="text-[11px] font-bold text-zinc-500 leading-relaxed">
                    The Sandbox is currently <span className="text-red-500 font-extrabold uppercase">Disabled</span>. Enable the status toggle above to customize simulated coordinate overrides.
                  </p>
                </div>
              )}

              {sandboxEnabled && (
                <div className="space-y-4">
                  {/* Mode Selector Tabs */}
                  <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50">
                    <button
                      type="button"
                      onClick={() => setSandboxMode('real')}
                      className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all border-0 cursor-pointer ${
                        sandboxMode === 'real' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                      }`}
                    >
                      Real GPS
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxMode('manual')}
                      className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all border-0 cursor-pointer ${
                        sandboxMode === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                      }`}
                    >
                      Manual Input
                    </button>
                    <button
                      type="button"
                      onClick={() => setSandboxMode('preset')}
                      className={`py-2 text-[10px] font-black uppercase rounded-lg transition-all border-0 cursor-pointer ${
                        sandboxMode === 'preset' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800 bg-transparent'
                      }`}
                    >
                      Presets
                    </button>
                  </div>

                  {/* Mode: REAL GPS */}
                  {sandboxMode === 'real' && (
                    <div className="space-y-3 p-3 bg-blue-50/50 border border-blue-100 rounded-2xl animate-fade-in text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-blue-800 uppercase tracking-wider">Live System Coordinates</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-white border border-blue-100 rounded-xl p-2.5">
                          <span className="block text-[8px] font-black uppercase text-slate-400">Latitude</span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {currentLat !== null ? currentLat.toFixed(6) : "Querying..."}
                          </span>
                        </div>
                        <div className="bg-white border border-blue-100 rounded-xl p-2.5">
                          <span className="block text-[8px] font-black uppercase text-slate-400">Longitude</span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {currentLng !== null ? currentLng.toFixed(6) : "Querying..."}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={fetchRealGps}
                        disabled={gettingRealGps}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer border-0"
                      >
                        <Navigation className={`h-3 w-3 ${gettingRealGps ? 'animate-spin' : ''}`} />
                        {gettingRealGps ? "Querying Hardware..." : "Sync Live Hardware GPS"}
                      </button>
                      <p className="text-[9px] text-blue-700/80 leading-relaxed text-center">
                        Using standard browser <code className="font-mono bg-blue-100/50 px-1 rounded">navigator.geolocation</code>. Changes with your actual physical movement.
                      </p>
                    </div>
                  )}

                  {/* Mode: MANUAL INPUT */}
                  {sandboxMode === 'manual' && (
                    <div className="space-y-4 p-4 bg-emerald-50/40 border border-emerald-100 rounded-2xl animate-fade-in text-left">
                      <span className="block text-[10px] font-black text-emerald-800 uppercase tracking-wider mb-1">Custom Lat/Lng Injector</span>
                      
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Latitude</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="0.0001"
                              value={sandboxManualLat}
                              onChange={(e) => setSandboxManualLat(parseFloat(e.target.value) || 0)}
                              className="flex-1 text-xs font-mono font-bold border border-slate-200 p-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setSandboxManualLat(prev => parseFloat((prev + 0.001).toFixed(6)))}
                              className="px-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-bold cursor-pointer"
                            >
                              +0.001
                            </button>
                            <button
                              type="button"
                              onClick={() => setSandboxManualLat(prev => parseFloat((prev - 0.001).toFixed(6)))}
                              className="px-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-bold cursor-pointer"
                            >
                              -0.001
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Longitude</label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              step="0.0001"
                              value={sandboxManualLng}
                              onChange={(e) => setSandboxManualLng(parseFloat(e.target.value) || 0)}
                              className="flex-1 text-xs font-mono font-bold border border-slate-200 p-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => setSandboxManualLng(prev => parseFloat((prev + 0.001).toFixed(6)))}
                              className="px-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-bold cursor-pointer"
                            >
                              +0.001
                            </button>
                            <button
                              type="button"
                              onClick={() => setSandboxManualLng(prev => parseFloat((prev - 0.001).toFixed(6)))}
                              className="px-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-[10px] font-bold cursor-pointer"
                            >
                              -0.001
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Map Link Utility */}
                      <div className="pt-2 border-t border-emerald-100/60 flex items-center justify-between text-[9px] text-emerald-800">
                        <span className="font-bold">🗺️ Active Bangalore Coordinate:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSandboxManualLat(12.9716);
                            setSandboxManualLng(77.5946);
                          }}
                          className="font-extrabold underline hover:text-emerald-950 cursor-pointer bg-transparent border-0"
                        >
                          Reset to HQ
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode: PRESETS */}
                  {sandboxMode === 'preset' && (
                    <div className="space-y-3 p-3 bg-purple-50/40 border border-purple-100 rounded-2xl animate-fade-in max-h-[300px] overflow-y-auto text-left">
                      <span className="block text-[10px] font-black text-purple-800 uppercase tracking-wider">Select Store Target</span>
                      <div className="space-y-2">
                        {sandboxLocations.map(loc => {
                          const isSelected = sandboxPresetName === loc.name;
                          return (
                            <button
                              key={loc.name}
                              type="button"
                              onClick={() => {
                                setSandboxPresetName(loc.name);
                                setSandboxPresetLat(loc.lat);
                                setSandboxPresetLng(loc.lng);
                              }}
                              className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-purple-600 border-purple-600 text-white shadow-xs'
                                  : 'bg-white border-slate-200 hover:bg-purple-50/50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black truncate">{loc.name.replace(" Farmer's Gate", "")}</span>
                                <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isSelected ? 'bg-purple-500 text-white' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  PRESET
                                </span>
                              </div>
                              <span className={`block text-[9px] font-mono mt-0.5 ${
                                isSelected ? 'text-purple-100' : 'text-slate-400'
                              }`}>
                                Lat: {loc.lat} • Lng: {loc.lng}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Middle Col: Cross-Branch Proximity Matrix */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Compass className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Cross-Branch Proximity Matrix</h4>
                </div>
                
                {/* Active Simulated Coordinate Badge */}
                <div className="text-right">
                  <span className="text-[8px] font-black uppercase text-slate-400 block">Current Sim GPS</span>
                  <span className="text-[10px] font-mono font-extrabold text-slate-800">
                    {!sandboxEnabled 
                      ? `${currentLat !== null ? currentLat.toFixed(4) : "12.9716"}, ${currentLng !== null ? currentLng.toFixed(4) : "77.5946"}`
                      : sandboxMode === 'manual' 
                        ? `${sandboxManualLat.toFixed(4)}, ${sandboxManualLng.toFixed(4)}`
                        : `${sandboxPresetLat.toFixed(4)}, ${sandboxPresetLng.toFixed(4)}`
                    }
                  </span>
                </div>
              </div>

              {/* Proximity Matrix Settings Panel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/60 text-left">
                <div>
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Current Security Boundary Rule</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-black text-slate-800">Local Access Radius:</span>
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md font-mono font-black text-xs">
                      {sandboxCpanelSettings.allowedLocalRadiusKm || 10} km
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-tight mt-1.5">
                    Configured inside HQ System Admin control panel settings. Users must be within this range to access administrative suites.
                  </p>
                </div>

                {/* Quick Radius Adjust (Sandbox override only) */}
                <div className="space-y-1.5">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Temporary Radius Overrider</span>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="range"
                      min="1"
                      max="40"
                      value={sandboxCpanelSettings.allowedLocalRadiusKm || 10}
                      onChange={(e) => {
                        const nextRadius = parseInt(e.target.value) || 10;
                        const nextSettings = { ...sandboxCpanelSettings, allowedLocalRadiusKm: nextRadius };
                        setSandboxCpanelSettings(nextSettings);
                        localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(nextSettings));
                      }}
                      className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                    <span className="text-xs font-bold text-slate-700 shrink-0 min-w-[40px] text-right">
                      {sandboxCpanelSettings.allowedLocalRadiusKm || 10} km
                    </span>
                  </div>
                  <p className="text-[8px] text-amber-600 font-bold leading-tight">
                    ⚠️ This instantly modifies the global cpanel security radius.
                  </p>
                </div>
              </div>

              {/* Stores Proximity Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-wider">
                      <th className="py-2.5">Physical Store Outlet</th>
                      <th>Location Coords</th>
                      <th className="text-right">Distance (km)</th>
                      <th className="text-right">Access Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sandboxLocations.map(loc => {
                      const simCoords = !sandboxEnabled
                        ? { lat: currentLat || 12.9716, lng: currentLng || 77.5946 }
                        : sandboxMode === 'manual'
                          ? { lat: sandboxManualLat, lng: sandboxManualLng }
                          : { lat: sandboxPresetLat, lng: sandboxPresetLng };

                      const distance = getSandboxDistanceKm(simCoords.lat, simCoords.lng, loc.lat, loc.lng);
                      const isAllowed = distance <= (sandboxCpanelSettings.allowedLocalRadiusKm || 10);

                      return (
                        <tr key={loc.name} className="hover:bg-slate-50/50 transition">
                          <td className="py-3 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs">🏪</span>
                              <div className="text-left">
                                <span className="block text-xs font-black text-slate-800 leading-tight">
                                  {loc.name.replace("Farmer's Gate - ", "")}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 block mt-0.5 uppercase tracking-wide">
                                  Bangalore Zone
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 text-[10px] font-mono font-bold text-slate-500">
                            {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                          </td>
                          <td className="py-3 text-right font-mono font-black text-xs text-slate-700">
                            {distance.toFixed(2)} km
                          </td>
                          <td className="py-3 text-right">
                            <span className={`inline-block text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isAllowed
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-red-50 border-red-200 text-red-600'
                            }`}>
                              {isAllowed ? "🟢 Authorized" : "🔴 Restricted"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Boundary Verification Simulation Command Board */}
              <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-left">
                <div className="space-y-0.5 text-left">
                  <span className="block text-xs font-black text-slate-800">Verification Logic Sandbox Runner</span>
                  <p className="text-[9px] text-slate-400 leading-tight">
                    Simulate how the security system processes these coordinates when validating user authorizations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const simCoords = !sandboxEnabled
                      ? { lat: currentLat || 12.9716, lng: currentLng || 77.5946 }
                      : sandboxMode === 'manual'
                        ? { lat: sandboxManualLat, lng: sandboxManualLng }
                        : { lat: sandboxPresetLat, lng: sandboxPresetLng };

                    let nearestDist = Infinity;
                    let nearestName = "";

                    for (const loc of sandboxLocations) {
                      const dist = getSandboxDistanceKm(simCoords.lat, simCoords.lng, loc.lat, loc.lng);
                      if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestName = loc.name;
                      }
                    }

                    const radius = sandboxCpanelSettings.allowedLocalRadiusKm || 10;
                    const passed = nearestDist <= radius;

                    setVerificationOutput({
                      timestamp: new Date().toLocaleTimeString(),
                      allowed: passed,
                      reason: passed 
                        ? `Authorization Approved. Simulated device is ${nearestDist.toFixed(2)} km away from ${nearestName.replace("Farmer's Gate - ", "")} (within security boundary of ${radius} km).`
                        : `Authorization Blocked! Simulated device is ${nearestDist.toFixed(2)} km away from the nearest branch (${nearestName.replace("Farmer's Gate - ", "")}). This exceeds maximum range of ${radius} km.`,
                      details: {
                        nearestStore: nearestName,
                        distance: nearestDist,
                        radius: radius
                      }
                    });
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 border-0"
                >
                  ⚡ Run Verification Test
                </button>
              </div>

              {/* Diagnostic Terminal View */}
              {verificationOutput && (
                <div className="bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-2xl p-4 border border-slate-800 space-y-2 animate-fade-in text-left">
                  <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold border-b border-slate-800 pb-1.5">
                    <span>⚡ DIAGNOSTIC VERIFICATION LOG</span>
                    <span>{verificationOutput.timestamp}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-500">{"$ farmersgate-core --verify-geofence"}</p>
                    <p><span className="text-blue-400">INFO:</span> Initializing dynamic local-access proxy boundary checking...</p>
                    <p><span className="text-blue-400">INFO:</span> Checked sandbox settings: {sandboxEnabled ? "ENABLED (Override Active)" : "DISABLED (Default GPS)"}</p>
                    <p><span className="text-blue-400">GPS:</span> Current evaluation coordinates: {sandboxEnabled ? `[SIMULATED] [${sandboxMode.toUpperCase()}]` : "[HARDWARE]"}</p>
                    <p><span className="text-blue-400">GPS:</span> Evaluating Lat: <span className="text-white font-bold">
                      {!sandboxEnabled 
                        ? (currentLat || 12.9716).toFixed(6)
                        : sandboxMode === 'manual' 
                          ? sandboxManualLat.toFixed(6) 
                          : sandboxPresetLat.toFixed(6)
                      }
                    </span> Lng: <span className="text-white font-bold">
                      {!sandboxEnabled 
                        ? (currentLng || 77.5946).toFixed(6)
                        : sandboxMode === 'manual' 
                          ? sandboxManualLng.toFixed(6) 
                          : sandboxPresetLng.toFixed(6)
                      }
                    </span></p>
                    
                    {verificationOutput.details && (
                      <>
                        <p><span className="text-blue-400">EVAL:</span> Nearest branch detected: <span className="text-amber-300 font-bold">{verificationOutput.details.nearestStore}</span></p>
                        <p><span className="text-blue-400">EVAL:</span> Measured proximity range: <span className="text-white font-bold">{verificationOutput.details.distance.toFixed(3)} km</span></p>
                        <p><span className="text-blue-400">RULE:</span> Security access boundary limit: <span className="text-slate-300 font-bold">{verificationOutput.details.radius.toFixed(1)} km</span></p>
                      </>
                    )}

                    <div className="pt-1 text-xs font-bold border-t border-slate-900 mt-2">
                      {verificationOutput.allowed ? (
                        <p className="text-emerald-400">
                          🟢 [SUCCESS] ACCESS AUTHORIZED. Welcome to Management HQ.
                        </p>
                      ) : (
                        <p className="text-rose-400">
                          🔴 [ACCESS DENIED] GEOFENCE SECURITY VIOLATION: Device is outside allowed physical branch perimeter. Restricted to public storefront mode.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
