import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Store, Sale, Purchase, InventoryItem, Requirement, SupabaseConfig, Supplier, PurchaseOrder, CustomerOrder, MasterCrop } from '../types';

// Default master crops/inventory reference
const DEFAULT_MASTER_CROPS: MasterCrop[] = [
  { id: 'mc-1', vegetableName: 'Tomatoes (Tamatar)', costPrice: 25, sellingPrice: 35, category: 'Vegetable', minStockThreshold: 40 },
  { id: 'mc-2', vegetableName: 'Potatoes (Aloo)', costPrice: 15, sellingPrice: 22, category: 'Vegetable', minStockThreshold: 50 },
  { id: 'mc-3', vegetableName: 'Onions (Pyaj)', costPrice: 22, sellingPrice: 30, category: 'Vegetable', minStockThreshold: 45 },
  { id: 'mc-4', vegetableName: 'Spinach (Palak)', costPrice: 18, sellingPrice: 25, category: 'Vegetable', minStockThreshold: 20 },
  { id: 'mc-5', vegetableName: 'Cauliflower (Phool Gobhi)', costPrice: 30, sellingPrice: 45, category: 'Vegetable', minStockThreshold: 15 },
  { id: 'mc-6', vegetableName: 'Mangoes (Aam)', costPrice: 80, sellingPrice: 110, category: 'Fruit', minStockThreshold: 30 },
  { id: 'mc-7', vegetableName: 'Bananas (Kela)', costPrice: 25, sellingPrice: 35, category: 'Fruit', minStockThreshold: 40 },
  { id: 'mc-8', vegetableName: 'Apples (Seb)', costPrice: 90, sellingPrice: 130, category: 'Fruit', minStockThreshold: 25 },
  { id: 'mc-9', vegetableName: 'Garlic (Lahsun)', costPrice: 120, sellingPrice: 180, category: 'Herbs', minStockThreshold: 10 },
  { id: 'mc-10', vegetableName: 'Ginger (Adrak)', costPrice: 60, sellingPrice: 90, category: 'Herbs', minStockThreshold: 15 },
  { id: 'mc-11', vegetableName: 'Lemon (Nimbu)', costPrice: 40, sellingPrice: 60, category: 'Herbs', minStockThreshold: 10 },
  { id: 'mc-12', vegetableName: 'Coriander (Dhania)', costPrice: 15, sellingPrice: 25, category: 'Herbs', minStockThreshold: 10 },
  { id: 'mc-13', vegetableName: 'Green Chili (Hari Mirch)', costPrice: 35, sellingPrice: 50, category: 'Herbs', minStockThreshold: 10 }
];

// Default initial data for Demo Purposes if localstorage is empty
const DEFAULT_STORES: Store[] = [
  {
    id: 'store-1',
    name: "Farmer's Gate - Mumbai Bandra",
    location: "Bandra West, Link Road, Mumbai",
    whatsappNumber: "919876543210",
    isActive: true,
    createdAt: new Date().toISOString(),
    password: "bandra123"
  },
  {
    id: 'store-2',
    name: "Farmer's Gate - Delhi Karol Bagh",
    location: "Karol Bagh Metro Stn, New Delhi",
    whatsappNumber: "919876543211",
    isActive: true,
    createdAt: new Date().toISOString(),
    password: "karol123"
  },
  {
    id: 'store-3',
    name: "Farmer's Gate - Bangalore Indiranagar",
    location: "100 Feet Rd, Indiranagar, Bangalore",
    whatsappNumber: "919876543212",
    isActive: true,
    createdAt: new Date().toISOString(),
    password: "indira123"
  }
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  // Store 1 Inventory (Mumbai Bandra)
  { id: 'inv-1-1', storeId: 'store-1', vegetableName: 'Tomatoes (Tamatar)', quantity: 145, minStockThreshold: 40, costPrice: 25, sellingPrice: 35, lastUpdated: new Date().toISOString() },
  { id: 'inv-1-2', storeId: 'store-1', vegetableName: 'Potatoes (Aloo)', quantity: 220, minStockThreshold: 50, costPrice: 15, sellingPrice: 22, lastUpdated: new Date().toISOString() },
  { id: 'inv-1-3', storeId: 'store-1', vegetableName: 'Onions (Pyaj)', quantity: 18, minStockThreshold: 45, costPrice: 22, sellingPrice: 30, lastUpdated: new Date().toISOString() }, // Low Stock!
  { id: 'inv-1-4', storeId: 'store-1', vegetableName: 'Spinach (Palak)', quantity: 0, minStockThreshold: 20, costPrice: 18, sellingPrice: 25, lastUpdated: new Date().toISOString() }, // Out of stock!
  { id: 'inv-1-5', storeId: 'store-1', vegetableName: 'Cauliflower (Phool Gobhi)', quantity: 65, minStockThreshold: 15, costPrice: 30, sellingPrice: 45, lastUpdated: new Date().toISOString() },
  { id: 'inv-1-6', storeId: 'store-1', vegetableName: 'Mangoes (Aam)', quantity: 120, minStockThreshold: 30, costPrice: 80, sellingPrice: 110, lastUpdated: new Date().toISOString() },
  { id: 'inv-1-7', storeId: 'store-1', vegetableName: 'Bananas (Kela)', quantity: 180, minStockThreshold: 40, costPrice: 25, sellingPrice: 35, lastUpdated: new Date().toISOString() },
  { id: 'inv-1-8', storeId: 'store-1', vegetableName: 'Apples (Seb)', quantity: 95, minStockThreshold: 25, costPrice: 90, sellingPrice: 130, lastUpdated: new Date().toISOString() },

  // Store 2 Inventory (Delhi Karol Bagh)
  { id: 'inv-2-1', storeId: 'store-2', vegetableName: 'Tomatoes (Tamatar)', quantity: 55, minStockThreshold: 40, costPrice: 25, sellingPrice: 35, lastUpdated: new Date().toISOString() },
  { id: 'inv-2-2', storeId: 'store-2', vegetableName: 'Potatoes (Aloo)', quantity: 185, minStockThreshold: 50, costPrice: 15, sellingPrice: 22, lastUpdated: new Date().toISOString() },
  { id: 'inv-2-3', storeId: 'store-2', vegetableName: 'Onions (Pyaj)', quantity: 160, minStockThreshold: 45, costPrice: 22, sellingPrice: 30, lastUpdated: new Date().toISOString() },
  { id: 'inv-2-4', storeId: 'store-2', vegetableName: 'Mangoes (Aam)', quantity: 45, minStockThreshold: 30, costPrice: 80, sellingPrice: 110, lastUpdated: new Date().toISOString() },
  { id: 'inv-2-5', storeId: 'store-2', vegetableName: 'Apples (Seb)', quantity: 60, minStockThreshold: 25, costPrice: 90, sellingPrice: 130, lastUpdated: new Date().toISOString() },

  // Store 3 Inventory (Bangalore Indiranagar)
  { id: 'inv-3-1', storeId: 'store-3', vegetableName: 'Tomatoes (Tamatar)', quantity: 90, minStockThreshold: 40, costPrice: 25, sellingPrice: 35, lastUpdated: new Date().toISOString() },
  { id: 'inv-3-2', storeId: 'store-3', vegetableName: 'Potatoes (Aloo)', quantity: 140, minStockThreshold: 50, costPrice: 15, sellingPrice: 22, lastUpdated: new Date().toISOString() },
  { id: 'inv-3-3', storeId: 'store-3', vegetableName: 'Bananas (Kela)', quantity: 190, minStockThreshold: 40, costPrice: 25, sellingPrice: 35, lastUpdated: new Date().toISOString() },
  { id: 'inv-3-4', storeId: 'store-3', vegetableName: 'Spinach (Palak)', quantity: 75, minStockThreshold: 20, costPrice: 18, sellingPrice: 25, lastUpdated: new Date().toISOString() }
];

const DEFAULT_SALES: Sale[] = [
  { id: 'sale-1', storeId: 'store-1', vegetableName: 'Tomatoes (Tamatar)', quantity: 10, pricePerKg: 35, totalPrice: 350, customerName: 'Rajesh Kumar', saleDate: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'sale-2', storeId: 'store-1', vegetableName: 'Potatoes (Aloo)', quantity: 20, pricePerKg: 22, totalPrice: 440, customerName: 'Amit Sharma', saleDate: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: 'sale-3', storeId: 'store-2', vegetableName: 'Tomatoes (Tamatar)', quantity: 5, pricePerKg: 35, totalPrice: 175, customerName: 'Priya Patel', saleDate: new Date(Date.now() - 3600000 * 6).toISOString() }
];

const DEFAULT_PURCHASES: Purchase[] = [
  { id: 'pur-1', storeId: 'store-1', vegetableName: 'Tomatoes (Tamatar)', quantity: 100, costPerKg: 25, totalCost: 2500, supplierName: 'Sardar Patel Veg Mandi', purchaseDate: new Date(Date.now() - 3600000 * 24).toISOString() },
  { id: 'pur-2', storeId: 'store-1', vegetableName: 'Onions (Pyaj)', quantity: 120, costPerKg: 22, totalCost: 2640, supplierName: 'Nashik Wholesale Farms', purchaseDate: new Date(Date.now() - 3600000 * 30).toISOString() }
];

const DEFAULT_REQUIREMENTS: Requirement[] = [
  { id: 'req-1', storeId: 'store-1', vegetableName: 'Spinach (Palak)', quantity: 50, status: 'Pending', priority: 'High', notes: 'Urgent customer demand, local stock is 0', createdAt: new Date(Date.now() - 3600000 * 1).toISOString() },
  { id: 'req-2', storeId: 'store-1', vegetableName: 'Onions (Pyaj)', quantity: 150, status: 'Pending', priority: 'Medium', notes: 'Running low on onions (18kg left)', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: 'req-3', storeId: 'store-2', vegetableName: 'Tomatoes (Tamatar)', quantity: 80, status: 'Ordered', priority: 'Low', notes: 'Restock for upcoming weekend rush', createdAt: new Date(Date.now() - 3600000 * 12).toISOString() }
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'sup-1',
    name: 'Sardar Patel Veg Mandi',
    contactName: 'Ramesh Patel',
    phone: '919811223344',
    email: 'orders@mandi.in',
    address: 'APMC Market Yard, Vashi, Navi Mumbai',
    paymentTerms: 'COD',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'sup-2',
    name: 'Nashik Wholesale Farms',
    contactName: 'Sanjay Shinde',
    phone: '919855667788',
    email: 'sanjay@nashikfarms.in',
    address: 'Pimpalgaon Baswant, Nashik, Maharashtra',
    paymentTerms: 'Net 15',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po-1',
    poNumber: 'PO-2026-001',
    supplierId: 'sup-1',
    supplierName: 'Sardar Patel Veg Mandi',
    storeId: 'store-1',
    orderDate: new Date(Date.now() - 3600000 * 24).toISOString(),
    items: [
      { vegetableName: 'Tomatoes (Tamatar)', quantity: 100, costPerKg: 25, totalCost: 2500 }
    ],
    status: 'Delivered',
    paymentStatus: 'Paid',
    totalAmount: 2500,
    paidAmount: 2500,
    notes: 'Premium greenhouse red tomatoes',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'po-2',
    poNumber: 'PO-2026-002',
    supplierId: 'sup-2',
    supplierName: 'Nashik Wholesale Farms',
    storeId: 'store-1',
    orderDate: new Date(Date.now() - 3600000 * 12).toISOString(),
    items: [
      { vegetableName: 'Onions (Pyaj)', quantity: 120, costPerKg: 22, totalCost: 2640 },
      { vegetableName: 'Potatoes (Aloo)', quantity: 100, costPerKg: 15, totalCost: 1500 }
    ],
    status: 'Sent',
    paymentStatus: 'Unpaid',
    totalAmount: 4140,
    paidAmount: 0,
    notes: 'Direct farm stock supply',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

const DEFAULT_CUSTOMER_ORDERS: CustomerOrder[] = [
  {
    id: 'co-1',
    orderNumber: 'FG-CUST-1001',
    storeId: 'store-1',
    customerName: 'Aishwarya Roy',
    customerPhone: '919833445566',
    customerAddress: 'Flat 502, Sea Breeze Apts, Bandra',
    items: [
      { vegetableName: 'Tomatoes (Tamatar)', quantity: 4, pricePerKg: 35, totalPrice: 140 },
      { vegetableName: 'Potatoes (Aloo)', quantity: 10, pricePerKg: 22, totalPrice: 220 }
    ],
    totalAmount: 360,
    status: 'Pending',
    paymentStatus: 'Unpaid',
    orderDate: new Date(Date.now() - 3600000 * 3).toISOString(),
    notes: 'Deliver fresh and washed crops.'
  }
];

let supabaseInstance: SupabaseClient | null = null;

// --- GLOBAL NETWORK CIRCUIT BREAKER & SERVER RESILIENCE ---
let isCircuitBroken = false;
let lastBrokenTime = 0;
const CIRCUIT_BREAKER_TIMEOUT = 1800; // 1.8 seconds timeout per remote request
const CIRCUIT_COOLDOWN = 30000; // 30 seconds bypass cooldown

export function checkCircuitState(): boolean {
  if (isCircuitBroken) {
    if (Date.now() - lastBrokenTime > CIRCUIT_COOLDOWN) {
      isCircuitBroken = false;
      console.log("🔄 Circuit breaker cooldown elapsed. Retrying database connectivity...");
      return false;
    }
    return true;
  }
  return false;
}

export function tripCircuit(): void {
  if (!isCircuitBroken) {
    isCircuitBroken = true;
    lastBrokenTime = Date.now();
    console.warn("⚠️ Remote third-party server query timed out or failed. Circuit breaker tripped! Falling back 100% to Offline Local Storage Cache.");
  }
}

export function resetCircuit(): void {
  isCircuitBroken = false;
  lastBrokenTime = 0;
  console.log("🏥 Circuit breaker manually reset. Remote connectivity restored.");
}

export function getCircuitBreakerDetails() {
  return {
    isBroken: isCircuitBroken,
    cooldownRemaining: isCircuitBroken ? Math.max(0, Math.ceil((CIRCUIT_COOLDOWN - (Date.now() - lastBrokenTime)) / 1000)) : 0,
    trippedAt: lastBrokenTime
  };
}

// Load Config
export function getSupabaseConfig(): SupabaseConfig {
  // Check for client-side environment variables first for instant third-party deployment
  const envUrl = typeof import.meta !== 'undefined' && (import.meta as any).env ? ((import.meta as any).env.VITE_SUPABASE_URL || '') : '';
  const envKey = typeof import.meta !== 'undefined' && (import.meta as any).env ? ((import.meta as any).env.VITE_SUPABASE_ANON_KEY || '') : '';

  const url = localStorage.getItem('supabase_url') || envUrl;
  const key = localStorage.getItem('supabase_key') || envKey;
  
  const isConnectedStored = localStorage.getItem('supabase_connected');
  // If there are environment variables and no explicit connection status stored, default to connected
  const isConnected = isConnectedStored === 'true' || (isConnectedStored === null && !!envUrl && !!envKey) || (!!url && !!key && isConnectedStored !== 'false');
  const forceOffline = localStorage.getItem('force_offline') === 'true';
  const circuitBroken = checkCircuitState();

  return {
    supabaseUrl: url,
    supabaseAnonKey: key,
    isConnected: isConnected && !!url && !!key && !forceOffline && !circuitBroken
  };
}

export function dbGetForceOffline(): boolean {
  return localStorage.getItem('force_offline') === 'true';
}

export function dbSetForceOffline(val: boolean): void {
  localStorage.setItem('force_offline', val ? 'true' : 'false');
}

export function handleSupabaseAuthError(e: any): void {
  if (!e) return;
  const errMsg = e.message || String(e);
  const isAuthError = 
    errMsg.includes('Invalid API key') || 
    errMsg.includes('invalid api key') || 
    errMsg.includes('JWT') || 
    errMsg.includes('PGRST111') ||
    errMsg.includes('apikey') ||
    (e.status === 401) ||
    (e.status === 403);

  if (isAuthError) {
    console.warn("🚨 Critical Supabase Authentication / API Key Error detected. Forcing Offline Mode to preserve local operations.");
    localStorage.setItem('supabase_connected', 'false');
    tripCircuit();
  }
}

// Initialize Supabase Client with a high-resiliency custom fetch and strict timeouts
export function initSupabase(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey, {
        global: {
          fetch: async (url, options) => {
            if (checkCircuitState()) {
              throw new Error("Circuit breaker is currently active. Bypassing fetch.");
            }

            const controller = new AbortController();
            const signal = controller.signal;
            
            let timeoutId = setTimeout(() => {
              controller.abort();
            }, CIRCUIT_BREAKER_TIMEOUT);

            try {
              const res = await fetch(url, { ...options, signal });
              clearTimeout(timeoutId);

              if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                  console.warn("🚨 Critical Supabase Authentication / API Key Error detected during fetch. Forcing Offline Mode.");
                  localStorage.setItem('supabase_connected', 'false');
                  tripCircuit();
                } else if (res.status >= 500) {
                  console.warn(`⚠️ Remote server error response status code: ${res.status}`);
                  tripCircuit();
                }
              }

              return res;
            } catch (err: any) {
              clearTimeout(timeoutId);
              const errMsg = err.message || '';
              // Trip if aborted (timeout) or has network fetch errors
              if (
                err.name === 'AbortError' || 
                errMsg.includes('failed to fetch') || 
                errMsg.includes('NetworkError') || 
                errMsg.includes('FetchError')
              ) {
                tripCircuit();
              }
              throw err;
            }
          }
        }
      });
      return supabaseInstance;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      supabaseInstance = null;
    }
  }
  return null;
}

// Save config and test connection
export async function saveSupabaseConfig(url: string, key: string): Promise<{ success: boolean; message: string }> {
  if (!url || !key) {
    localStorage.removeItem('supabase_url');
    localStorage.removeItem('supabase_key');
    localStorage.setItem('supabase_connected', 'false');
    supabaseInstance = null;
    return { success: true, message: 'Supabase configuration cleared. Reverted to local storage.' };
  }

  try {
    const tempClient = createClient(url, key);
    // Simple test query on a standard table or auth to verify connection
    const { error } = await tempClient.from('stores').select('id').limit(1);
    
    // Note: If table does not exist but client successfully contacts Supabase, we might get a "relation does not exist" error, 
    // which still means connection is established but schema is missing.
    if (error) {
      const isTableMissing = error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation');
      if (!isTableMissing && error.code !== 'PGRST116') {
        throw error;
      }
    }

    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    localStorage.setItem('supabase_connected', 'true');
    supabaseInstance = tempClient;

    return { 
      success: true, 
      message: 'Supabase connected successfully! SQL tables can be initialized using the schema copy option.' 
    };
  } catch (error: any) {
    console.warn('Supabase connection test failed:', error);
    return { 
      success: false, 
      message: `Connection failed: ${error.message || 'Please check your URL and Anon Key.'}` 
    };
  }
}

// Seed Local Storage if empty
function initializeLocalStorage() {
  const isIndianSeeded = localStorage.getItem('indian_data_v2');
  if (!isIndianSeeded) {
    localStorage.removeItem('fg_stores');
    localStorage.removeItem('fg_inventory');
    localStorage.removeItem('fg_sales');
    localStorage.removeItem('fg_purchases');
    localStorage.removeItem('fg_requirements');
    localStorage.removeItem('fg_suppliers');
    localStorage.removeItem('fg_purchase_orders');
    localStorage.removeItem('fg_customer_orders');
    localStorage.removeItem('fg_master_crops');
    localStorage.setItem('indian_data_v2', 'true');
  }

  if (!localStorage.getItem('fg_master_crops')) {
    localStorage.setItem('fg_master_crops', JSON.stringify(DEFAULT_MASTER_CROPS));
  }
  if (!localStorage.getItem('fg_stores')) {
    localStorage.setItem('fg_stores', JSON.stringify(DEFAULT_STORES));
  }
  if (!localStorage.getItem('fg_inventory')) {
    localStorage.setItem('fg_inventory', JSON.stringify(DEFAULT_INVENTORY));
  }
  if (!localStorage.getItem('fg_sales')) {
    localStorage.setItem('fg_sales', JSON.stringify(DEFAULT_SALES));
  }
  if (!localStorage.getItem('fg_purchases')) {
    localStorage.setItem('fg_purchases', JSON.stringify(DEFAULT_PURCHASES));
  }
  if (!localStorage.getItem('fg_requirements')) {
    localStorage.setItem('fg_requirements', JSON.stringify(DEFAULT_REQUIREMENTS));
  }
  if (!localStorage.getItem('fg_suppliers')) {
    localStorage.setItem('fg_suppliers', JSON.stringify(DEFAULT_SUPPLIERS));
  }
  if (!localStorage.getItem('fg_purchase_orders')) {
    localStorage.setItem('fg_purchase_orders', JSON.stringify(DEFAULT_PURCHASE_ORDERS));
  }
  if (!localStorage.getItem('fg_customer_orders')) {
    localStorage.setItem('fg_customer_orders', JSON.stringify(DEFAULT_CUSTOMER_ORDERS));
  }
}

initializeLocalStorage();

// Initialize client if configured
initSupabase();

// --- OFFLINE QUEUE & SYNCHRONIZATION ENGINE ---
export interface UnsyncedOp {
  id: string;
  table: string;
  action: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: string;
}

export function dbGetUnsyncedOps(): UnsyncedOp[] {
  const local = localStorage.getItem('fg_unsynced_ops');
  return local ? JSON.parse(local) : [];
}

export function dbGetUnsyncedOpsCount(): number {
  return dbGetUnsyncedOps().length;
}

export function dbClearUnsyncedOps(): void {
  localStorage.removeItem('fg_unsynced_ops');
}

export function dbAddUnsyncedOp(table: string, action: 'insert' | 'update' | 'delete', data: any): void {
  const ops = dbGetUnsyncedOps();
  // Filter out any duplicate pending operations on the same primary key to keep the queue minimal and efficient
  let filteredOps = ops;
  if (data && data.id) {
    if (action === 'delete') {
      // If we are deleting a record, we can drop any pending inserts/updates for it
      filteredOps = ops.filter(op => !(op.table === table && op.data && op.data.id === data.id));
    } else if (action === 'update' || action === 'insert') {
      // If we are updating/inserting, we can remove any prior insert/update of this same record to avoid redundancy
      filteredOps = ops.filter(op => !(op.table === table && op.data && op.data.id === data.id && (op.action === 'insert' || op.action === 'update')));
    }
  }
  
  const newOp: UnsyncedOp = {
    id: `op-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    table,
    action,
    data,
    timestamp: new Date().toISOString()
  };
  filteredOps.push(newOp);
  localStorage.setItem('fg_unsynced_ops', JSON.stringify(filteredOps));
}

async function ensureDependentEntitiesExist(table: string, data: any) {
  if (!supabaseInstance) return;

  // 1. Check for storeId and proactively upsert matching store from localStorage
  if (data && typeof data === 'object' && 'storeId' in data && data.storeId) {
    try {
      const localStoresStr = localStorage.getItem('fg_stores');
      if (localStoresStr) {
        const localStores = JSON.parse(localStoresStr);
        const matchingStore = localStores.find((s: any) => s.id === data.storeId);
        if (matchingStore) {
          await supabaseInstance.from('stores').upsert(matchingStore);
        }
      }
    } catch (e) {
      console.warn(`Failed to auto-ensure store ${data.storeId} exists:`, e);
    }
  }

  // 2. Check for supplierId and proactively upsert matching supplier from localStorage
  if (data && typeof data === 'object' && 'supplierId' in data && data.supplierId) {
    try {
      const localSuppliersStr = localStorage.getItem('fg_suppliers');
      if (localSuppliersStr) {
        const localSuppliers = JSON.parse(localSuppliersStr);
        const matchingSupplier = localSuppliers.find((s: any) => s.id === data.supplierId);
        if (matchingSupplier) {
          await supabaseInstance.from('suppliers').upsert(matchingSupplier);
        }
      }
    } catch (e) {
      console.warn(`Failed to auto-ensure supplier ${data.supplierId} exists:`, e);
    }
  }
}

export async function dbSyncLocalCache(): Promise<{ success: boolean; syncedCount: number; message: string }> {
  const config = getSupabaseConfig();
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    return { success: false, syncedCount: 0, message: "Supabase not configured in settings." };
  }
  
  if (!config.isConnected) {
    return { success: false, syncedCount: 0, message: "Supabase is offline or connection is suspended." };
  }
  
  if (!supabaseInstance) {
    initSupabase();
  }
  
  if (!supabaseInstance) {
    return { success: false, syncedCount: 0, message: "Unable to connect to Supabase backend client." };
  }

  const ops = dbGetUnsyncedOps();
  if (ops.length === 0) {
    return { success: true, syncedCount: 0, message: "Everything is already synchronized!" };
  }

  let syncedCount = 0;
  const failedOps: UnsyncedOp[] = [];

  for (const op of ops) {
    try {
      const { table, action, data } = op;
      
      if (action === 'insert' || action === 'update') {
        await ensureDependentEntitiesExist(table, data);
        const { error } = await supabaseInstance.from(table).upsert(data);
        if (error) throw error;
      } else if (action === 'delete') {
        const { error } = await supabaseInstance.from(table).delete().eq('id', data.id);
        if (error) throw error;
      }
      
      syncedCount++;
    } catch (e: any) {
      console.warn(`Sync failed for operation on ${op.table}: ${e?.message || JSON.stringify(e) || e}`, e);
      handleSupabaseAuthError(e);
      failedOps.push(op);
    }
  }

  if (failedOps.length > 0) {
    localStorage.setItem('fg_unsynced_ops', JSON.stringify(failedOps));
    return {
      success: false,
      syncedCount,
      message: `Synced ${syncedCount} items, but ${failedOps.length} failed. Please verify credentials or schema.`
    };
  } else {
    dbClearUnsyncedOps();
    return {
      success: true,
      syncedCount,
      message: `Successfully pushed all ${syncedCount} offline operations to Supabase!`
    };
  }
}

// --- DATABASE OPERATIONS WRAPPER ---

// STORES
export async function dbGetStores(): Promise<Store[]> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('stores')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Store[];
    } catch (e) {
      console.warn('Supabase fetch failed, falling back to local storage:', e);
    }
  }
  const local = localStorage.getItem('fg_stores');
  return local ? JSON.parse(local) : [];
}

export async function dbAddStore(store: Store): Promise<Store> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('stores')
        .insert([store])
        .select()
        .single();
      if (error) throw error;
      return data as Store;
    } catch (e) {
      console.warn('Supabase save failed, writing to local storage:', e);
      dbAddUnsyncedOp('stores', 'insert', store);
    }
  } else {
    dbAddUnsyncedOp('stores', 'insert', store);
  }
  
  const stores = await dbGetStores();
  stores.push(store);
  localStorage.setItem('fg_stores', JSON.stringify(stores));
  return store;
}

export async function dbUpdateStore(store: Store): Promise<Store> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('stores')
        .update(store)
        .eq('id', store.id)
        .select()
        .single();
      if (error) throw error;
      return data as Store;
    } catch (e) {
      console.warn('Supabase update failed, falling back to local storage:', e);
      dbAddUnsyncedOp('stores', 'update', store);
    }
  } else {
    dbAddUnsyncedOp('stores', 'update', store);
  }

  const stores = await dbGetStores();
  const index = stores.findIndex(s => s.id === store.id);
  if (index !== -1) {
    stores[index] = store;
    localStorage.setItem('fg_stores', JSON.stringify(stores));
  }
  return store;
}

export async function dbDeleteStore(id: string): Promise<void> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { error } = await supabaseInstance
        .from('stores')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Supabase delete failed, writing to local storage:', e);
      dbAddUnsyncedOp('stores', 'delete', { id });
    }
  } else {
    dbAddUnsyncedOp('stores', 'delete', { id });
  }

  const stores = await dbGetStores();
  const filtered = stores.filter(s => s.id !== id);
  localStorage.setItem('fg_stores', JSON.stringify(filtered));
}


// SALES
export async function dbGetSales(storeId?: string): Promise<Sale[]> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      let query = supabaseInstance.from('sales').select('*');
      if (storeId) {
        query = query.eq('storeId', storeId);
      }
      const { data, error } = await query.order('saleDate', { ascending: false });
      if (error) throw error;
      return data as Sale[];
    } catch (e) {
      console.warn('Supabase fetch sales failed, falling back to local storage:', e);
    }
  }

  const local = localStorage.getItem('fg_sales');
  const allSales: Sale[] = local ? JSON.parse(local) : [];
  if (storeId) {
    return allSales.filter(s => s.storeId === storeId);
  }
  return allSales;
}

export async function dbAddSale(sale: Sale): Promise<Sale> {
  // Deduct stock from inventory first
  await dbAdjustInventoryStock(sale.storeId, sale.vegetableName, -sale.quantity);

  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('sales')
        .insert([sale])
        .select()
        .single();
      if (error) throw error;
      return data as Sale;
    } catch (e) {
      console.warn('Supabase save sale failed, writing to local storage:', e);
      dbAddUnsyncedOp('sales', 'insert', sale);
    }
  } else {
    dbAddUnsyncedOp('sales', 'insert', sale);
  }

  const sales = await dbGetSales();
  sales.unshift(sale);
  localStorage.setItem('fg_sales', JSON.stringify(sales));
  return sale;
}

export async function dbDeleteSale(id: string): Promise<void> {
  // Get sale detail to restore inventory
  const sales = await dbGetSales();
  const sale = sales.find(s => s.id === id);
  if (sale) {
    // Add the quantity back to inventory
    await dbAdjustInventoryStock(sale.storeId, sale.vegetableName, sale.quantity);
  }

  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { error } = await supabaseInstance
        .from('sales')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Supabase delete sale failed, writing to local storage:', e);
      dbAddUnsyncedOp('sales', 'delete', { id });
    }
  } else {
    dbAddUnsyncedOp('sales', 'delete', { id });
  }

  const filtered = sales.filter(s => s.id !== id);
  localStorage.setItem('fg_sales', JSON.stringify(filtered));
}


// PURCHASES
export async function dbGetPurchases(storeId?: string): Promise<Purchase[]> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      let query = supabaseInstance.from('purchases').select('*');
      if (storeId) {
        query = query.eq('storeId', storeId);
      }
      const { data, error } = await query.order('purchaseDate', { ascending: false });
      if (error) throw error;
      return data as Purchase[];
    } catch (e) {
      console.warn('Supabase fetch purchases failed, falling back to local storage:', e);
    }
  }

  const local = localStorage.getItem('fg_purchases');
  const allPurchases: Purchase[] = local ? JSON.parse(local) : [];
  if (storeId) {
    return allPurchases.filter(p => p.storeId === storeId);
  }
  return allPurchases;
}

export async function dbAddPurchase(purchase: Purchase): Promise<Purchase> {
  // Add stock to inventory, and update last cost price
  await dbAdjustInventoryStock(purchase.storeId, purchase.vegetableName, purchase.quantity, purchase.costPerKg);

  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('purchases')
        .insert([purchase])
        .select()
        .single();
      if (error) throw error;
      return data as Purchase;
    } catch (e) {
      console.warn('Supabase save purchase failed, writing to local storage:', e);
      dbAddUnsyncedOp('purchases', 'insert', purchase);
    }
  } else {
    dbAddUnsyncedOp('purchases', 'insert', purchase);
  }

  const purchases = await dbGetPurchases();
  purchases.unshift(purchase);
  localStorage.setItem('fg_purchases', JSON.stringify(purchases));
  return purchase;
}

export async function dbDeletePurchase(id: string): Promise<void> {
  // Get purchase detail to deduct stock
  const purchases = await dbGetPurchases();
  const purchase = purchases.find(p => p.id === id);
  if (purchase) {
    // Deduct the inventory stock back
    await dbAdjustInventoryStock(purchase.storeId, purchase.vegetableName, -purchase.quantity);
  }

  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { error } = await supabaseInstance
        .from('purchases')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Supabase delete purchase failed, writing to local storage:', e);
      dbAddUnsyncedOp('purchases', 'delete', { id });
    }
  } else {
    dbAddUnsyncedOp('purchases', 'delete', { id });
  }

  const filtered = purchases.filter(p => p.id !== id);
  localStorage.setItem('fg_purchases', JSON.stringify(filtered));
}


// INVENTORY
export async function dbGetInventory(storeId?: string): Promise<InventoryItem[]> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      let query = supabaseInstance.from('inventory').select('*');
      if (storeId) {
        query = query.eq('storeId', storeId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as InventoryItem[];
    } catch (e) {
      console.warn('Supabase fetch inventory failed, falling back to local storage:', e);
    }
  }

  const local = localStorage.getItem('fg_inventory');
  const allInventory: InventoryItem[] = local ? JSON.parse(local) : [];
  if (storeId) {
    return allInventory.filter(i => i.storeId === storeId);
  }
  return allInventory;
}

export async function dbAddOrUpdateInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('inventory')
        .upsert(item)
        .select()
        .single();
      if (error) throw error;
      return data as InventoryItem;
    } catch (e) {
      console.warn('Supabase upsert inventory failed, writing to local storage:', e);
      dbAddUnsyncedOp('inventory', 'insert', item);
    }
  } else {
    dbAddUnsyncedOp('inventory', 'insert', item);
  }

  const inventory = await dbGetInventory();
  const index = inventory.findIndex(i => i.storeId === item.storeId && i.vegetableName.toLowerCase() === item.vegetableName.toLowerCase());
  if (index !== -1) {
    inventory[index] = { ...inventory[index], ...item, lastUpdated: new Date().toISOString() };
    localStorage.setItem('fg_inventory', JSON.stringify(inventory));
    return inventory[index];
  } else {
    inventory.push(item);
    localStorage.setItem('fg_inventory', JSON.stringify(inventory));
    return item;
  }
}

// Helper to adjust stock quantity dynamically when transactions occur
export async function dbAdjustInventoryStock(storeId: string, vegName: string, qtyDelta: number, costPriceUpdate?: number): Promise<void> {
  const inventory = await dbGetInventory(storeId);
  const match = inventory.find(i => i.vegetableName.toLowerCase() === vegName.toLowerCase());

  if (match) {
    const updatedQty = Math.max(0, match.quantity + qtyDelta);
    const updatedItem: InventoryItem = {
      ...match,
      quantity: updatedQty,
      lastUpdated: new Date().toISOString()
    };
    if (costPriceUpdate !== undefined) {
      updatedItem.costPrice = costPriceUpdate;
      // Intelligently set a selling price (e.g. 35% margin) if not customized
      if (match.sellingPrice === 0 || match.sellingPrice < costPriceUpdate) {
        updatedItem.sellingPrice = parseFloat((costPriceUpdate * 1.35).toFixed(2));
      }
    }
    await dbAddOrUpdateInventoryItem(updatedItem);
  } else {
    // If it doesn't exist, create a new item in the inventory!
    const newItem: InventoryItem = {
      id: `inv-${storeId}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      storeId,
      vegetableName: vegName,
      quantity: Math.max(0, qtyDelta),
      minStockThreshold: 15,
      costPrice: costPriceUpdate || 1.0,
      sellingPrice: parseFloat(((costPriceUpdate || 1.0) * 1.35).toFixed(2)),
      lastUpdated: new Date().toISOString()
    };
    await dbAddOrUpdateInventoryItem(newItem);
  }
}


// REQUIREMENTS
export async function dbGetRequirements(storeId?: string): Promise<Requirement[]> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      let query = supabaseInstance.from('requirements').select('*');
      if (storeId) {
        query = query.eq('storeId', storeId);
      }
      const { data, error } = await query.order('createdAt', { ascending: false });
      if (error) throw error;
      return data as Requirement[];
    } catch (e) {
      console.warn('Supabase fetch requirements failed, falling back to local storage:', e);
    }
  }

  const local = localStorage.getItem('fg_requirements');
  const allReqs: Requirement[] = local ? JSON.parse(local) : [];
  if (storeId) {
    return allReqs.filter(r => r.storeId === storeId);
  }
  return allReqs;
}

export async function dbAddRequirement(req: Requirement): Promise<Requirement> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      await ensureDependentEntitiesExist('requirements', req);
      const { data, error } = await supabaseInstance
        .from('requirements')
        .insert([req])
        .select()
        .single();
      if (error) throw error;
      return data as Requirement;
    } catch (e) {
      console.warn('Supabase save requirement failed, writing to local storage:', e);
      dbAddUnsyncedOp('requirements', 'insert', req);
    }
  } else {
    dbAddUnsyncedOp('requirements', 'insert', req);
  }

  const reqs = await dbGetRequirements();
  reqs.unshift(req);
  localStorage.setItem('fg_requirements', JSON.stringify(reqs));
  return req;
}

export async function dbUpdateRequirement(req: Requirement): Promise<Requirement> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      await ensureDependentEntitiesExist('requirements', req);
      const { data, error } = await supabaseInstance
        .from('requirements')
        .update(req)
        .eq('id', req.id)
        .select()
        .single();
      if (error) throw error;
      return data as Requirement;
    } catch (e) {
      console.warn('Supabase update requirement failed, writing to local storage:', e);
      dbAddUnsyncedOp('requirements', 'update', req);
    }
  } else {
    dbAddUnsyncedOp('requirements', 'update', req);
  }

  const reqs = await dbGetRequirements();
  const index = reqs.findIndex(r => r.id === req.id);
  if (index !== -1) {
    reqs[index] = req;
    localStorage.setItem('fg_requirements', JSON.stringify(reqs));
  }
  return req;
}

export async function dbDeleteRequirement(id: string): Promise<void> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { error } = await supabaseInstance
        .from('requirements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Supabase delete requirement failed, writing to local storage:', e);
      dbAddUnsyncedOp('requirements', 'delete', { id });
    }
  } else {
    dbAddUnsyncedOp('requirements', 'delete', { id });
  }

  const reqs = await dbGetRequirements();
  const filtered = reqs.filter(r => r.id !== id);
  localStorage.setItem('fg_requirements', JSON.stringify(filtered));
}

// --- SUPPLIERS ---
export async function dbGetSuppliers(): Promise<Supplier[]> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('suppliers')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Supplier[];
    } catch (e) {
      console.warn('Supabase fetch suppliers failed, falling back to local storage:', e);
    }
  }
  const local = localStorage.getItem('fg_suppliers');
  return local ? JSON.parse(local) : [];
}

export async function dbAddSupplier(supplier: Supplier): Promise<Supplier> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('suppliers')
        .insert([supplier])
        .select()
        .single();
      if (error) throw error;
      return data as Supplier;
    } catch (e) {
      console.warn('Supabase save supplier failed, writing to local storage:', e);
      dbAddUnsyncedOp('suppliers', 'insert', supplier);
    }
  } else {
    dbAddUnsyncedOp('suppliers', 'insert', supplier);
  }
  const suppliers = await dbGetSuppliers();
  suppliers.push(supplier);
  localStorage.setItem('fg_suppliers', JSON.stringify(suppliers));
  return supplier;
}

export async function dbUpdateSupplier(supplier: Supplier): Promise<Supplier> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('suppliers')
        .update(supplier)
        .eq('id', supplier.id)
        .select()
        .single();
      if (error) throw error;
      return data as Supplier;
    } catch (e) {
      console.warn('Supabase update supplier failed, writing to local storage:', e);
      dbAddUnsyncedOp('suppliers', 'update', supplier);
    }
  } else {
    dbAddUnsyncedOp('suppliers', 'update', supplier);
  }
  const suppliers = await dbGetSuppliers();
  const index = suppliers.findIndex(s => s.id === supplier.id);
  if (index !== -1) {
    suppliers[index] = supplier;
    localStorage.setItem('fg_suppliers', JSON.stringify(suppliers));
  }
  return supplier;
}

export async function dbDeleteSupplier(id: string): Promise<void> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { error } = await supabaseInstance
        .from('suppliers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Supabase delete supplier failed, writing to local storage:', e);
      dbAddUnsyncedOp('suppliers', 'delete', { id });
    }
  } else {
    dbAddUnsyncedOp('suppliers', 'delete', { id });
  }
  const suppliers = await dbGetSuppliers();
  const filtered = suppliers.filter(s => s.id !== id);
  localStorage.setItem('fg_suppliers', JSON.stringify(filtered));
}

// --- PURCHASE ORDERS ---
export async function dbGetPurchaseOrders(storeId?: string): Promise<PurchaseOrder[]> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      let query = supabaseInstance.from('purchase_orders').select('*');
      if (storeId) {
        query = query.eq('storeId', storeId);
      }
      const { data, error } = await query.order('orderDate', { ascending: false });
      if (error) throw error;
      return data as PurchaseOrder[];
    } catch (e) {
      console.warn('Supabase fetch purchase orders failed, falling back to local storage:', e);
    }
  }
  const local = localStorage.getItem('fg_purchase_orders');
  const allPO: PurchaseOrder[] = local ? JSON.parse(local) : [];
  if (storeId) {
    return allPO.filter(po => po.storeId === storeId);
  }
  return allPO;
}

export async function dbAddPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('purchase_orders')
        .insert([po])
        .select()
        .single();
      if (error) throw error;
      return data as PurchaseOrder;
    } catch (e) {
      console.warn('Supabase save PO failed, writing to local storage:', e);
      dbAddUnsyncedOp('purchase_orders', 'insert', po);
    }
  } else {
    dbAddUnsyncedOp('purchase_orders', 'insert', po);
  }
  const pos = await dbGetPurchaseOrders();
  pos.unshift(po);
  localStorage.setItem('fg_purchase_orders', JSON.stringify(pos));
  return po;
}

export async function dbUpdatePurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('purchase_orders')
        .update(po)
        .eq('id', po.id)
        .select()
        .single();
      if (error) throw error;
      return data as PurchaseOrder;
    } catch (e) {
      console.warn('Supabase update PO failed, writing to local storage:', e);
      dbAddUnsyncedOp('purchase_orders', 'update', po);
    }
  } else {
    dbAddUnsyncedOp('purchase_orders', 'update', po);
  }
  const pos = await dbGetPurchaseOrders();
  const index = pos.findIndex(p => p.id === po.id);
  if (index !== -1) {
    pos[index] = po;
    localStorage.setItem('fg_purchase_orders', JSON.stringify(pos));
  }
  return po;
}

export async function dbDeletePurchaseOrder(id: string): Promise<void> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { error } = await supabaseInstance
        .from('purchase_orders')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Supabase delete PO failed, writing to local storage:', e);
      dbAddUnsyncedOp('purchase_orders', 'delete', { id });
    }
  } else {
    dbAddUnsyncedOp('purchase_orders', 'delete', { id });
  }
  const pos = await dbGetPurchaseOrders();
  const filtered = pos.filter(p => p.id !== id);
  localStorage.setItem('fg_purchase_orders', JSON.stringify(filtered));
}

// --- CUSTOMER ORDERS ---
export async function dbGetCustomerOrders(storeId?: string): Promise<CustomerOrder[]> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      let query = supabaseInstance.from('customer_orders').select('*');
      if (storeId) {
        query = query.eq('storeId', storeId);
      }
      const { data, error } = await query.order('orderDate', { ascending: false });
      if (error) throw error;
      return data as CustomerOrder[];
    } catch (e) {
      console.warn('Supabase fetch customer orders failed, falling back to local storage:', e);
    }
  }
  const local = localStorage.getItem('fg_customer_orders');
  const allCO: CustomerOrder[] = local ? JSON.parse(local) : [];
  if (storeId) {
    return allCO.filter(co => co.storeId === storeId);
  }
  return allCO;
}

export async function dbAddCustomerOrder(co: CustomerOrder): Promise<CustomerOrder> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('customer_orders')
        .insert([co])
        .select()
        .single();
      if (error) throw error;
      return data as CustomerOrder;
    } catch (e) {
      console.warn('Supabase save customer order failed, writing to local storage:', e);
      dbAddUnsyncedOp('customer_orders', 'insert', co);
    }
  } else {
    dbAddUnsyncedOp('customer_orders', 'insert', co);
  }
  const cos = await dbGetCustomerOrders();
  cos.unshift(co);
  localStorage.setItem('fg_customer_orders', JSON.stringify(cos));
  return co;
}

export async function dbUpdateCustomerOrder(co: CustomerOrder): Promise<CustomerOrder> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('customer_orders')
        .update(co)
        .eq('id', co.id)
        .select()
        .single();
      if (error) throw error;
      return data as CustomerOrder;
    } catch (e) {
      console.warn('Supabase update customer order failed, writing to local storage:', e);
      dbAddUnsyncedOp('customer_orders', 'update', co);
    }
  } else {
    dbAddUnsyncedOp('customer_orders', 'update', co);
  }
  const cos = await dbGetCustomerOrders();
  const index = cos.findIndex(c => c.id === co.id);
  if (index !== -1) {
    cos[index] = co;
    localStorage.setItem('fg_customer_orders', JSON.stringify(cos));
  }
  return co;
}

export async function dbDeleteCustomerOrder(id: string): Promise<void> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { error } = await supabaseInstance
        .from('customer_orders')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Supabase delete customer order failed, writing to local storage:', e);
      dbAddUnsyncedOp('customer_orders', 'delete', { id });
    }
  } else {
    dbAddUnsyncedOp('customer_orders', 'delete', { id });
  }
  const cos = await dbGetCustomerOrders();
  const filtered = cos.filter(c => c.id !== id);
  localStorage.setItem('fg_customer_orders', JSON.stringify(filtered));
}

// --- MASTER CROPS ---
export async function dbGetMasterCrops(): Promise<MasterCrop[]> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('master_crops')
        .select('*')
        .order('vegetableName', { ascending: true });
      if (error) throw error;
      return data as MasterCrop[];
    } catch (e) {
      console.warn('Supabase fetch master crops failed, falling back to local storage:', e);
    }
  }
  const raw = localStorage.getItem('fg_master_crops');
  return raw ? JSON.parse(raw) : DEFAULT_MASTER_CROPS;
}

export async function dbAddOrUpdateMasterCrop(crop: MasterCrop): Promise<MasterCrop> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { data, error } = await supabaseInstance
        .from('master_crops')
        .upsert(crop)
        .select()
        .single();
      if (error) throw error;
      return data as MasterCrop;
    } catch (e) {
      console.warn('Supabase upsert master crop failed, writing to local storage:', e);
      dbAddUnsyncedOp('master_crops', 'insert', crop);
    }
  } else {
    dbAddUnsyncedOp('master_crops', 'insert', crop);
  }
  const crops = await dbGetMasterCrops();
  const idx = crops.findIndex(c => c.id === crop.id);
  if (idx !== -1) {
    crops[idx] = crop;
  } else {
    crops.push(crop);
  }
  localStorage.setItem('fg_master_crops', JSON.stringify(crops));
  return crop;
}

export async function dbDeleteMasterCrop(id: string): Promise<void> {
  const config = getSupabaseConfig();
  if (config.isConnected && supabaseInstance) {
    try {
      const { error } = await supabaseInstance
        .from('master_crops')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return;
    } catch (e) {
      console.warn('Supabase delete master crop failed, writing to local storage:', e);
      dbAddUnsyncedOp('master_crops', 'delete', { id });
    }
  } else {
    dbAddUnsyncedOp('master_crops', 'delete', { id });
  }
  const crops = await dbGetMasterCrops();
  const filtered = crops.filter(c => c.id !== id);
  localStorage.setItem('fg_master_crops', JSON.stringify(filtered));
}

// Generate the SQL string that user can paste to initialize Supabase database
export function getSupabaseSQLSchema(): string {
  return `-- SQL DDL Script to create tables in Supabase for Farmer's Gate Store Manager.
-- Paste this script directly in your Supabase SQL Editor and run it!

-- 1. STORES Table
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  "whatsappNumber" TEXT,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 2. SALES Table
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  "storeId" TEXT REFERENCES stores(id) ON DELETE CASCADE,
  "vegetableName" TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  "pricePerKg" NUMERIC NOT NULL,
  "totalPrice" NUMERIC NOT NULL,
  "customerName" TEXT,
  "saleDate" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PURCHASES Table
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  "storeId" TEXT REFERENCES stores(id) ON DELETE CASCADE,
  "vegetableName" TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  "costPerKg" NUMERIC NOT NULL,
  "totalCost" NUMERIC NOT NULL,
  "supplierName" TEXT,
  "purchaseDate" TIMESTAMPTZ DEFAULT NOW()
);

-- 4. INVENTORY Table
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  "storeId" TEXT REFERENCES stores(id) ON DELETE CASCADE,
  "vegetableName" TEXT NOT NULL,
  quantity NUMERIC DEFAULT 0,
  "minStockThreshold" NUMERIC DEFAULT 15,
  "costPrice" NUMERIC DEFAULT 0,
  "sellingPrice" NUMERIC DEFAULT 0,
  "lastUpdated" TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE("storeId", "vegetableName")
);

-- 5. REQUIREMENTS Table
CREATE TABLE IF NOT EXISTS requirements (
  id TEXT PRIMARY KEY,
  "storeId" TEXT REFERENCES stores(id) ON DELETE CASCADE,
  "vegetableName" TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Ordered', 'Fulfilled')),
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SUPPLIERS Table
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "contactName" TEXT,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  address TEXT,
  "paymentTerms" TEXT NOT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PURCHASE_ORDERS Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  "poNumber" TEXT NOT NULL,
  "supplierId" TEXT REFERENCES suppliers(id) ON DELETE CASCADE,
  "supplierName" TEXT NOT NULL,
  "storeId" TEXT REFERENCES stores(id) ON DELETE CASCADE,
  "orderDate" TIMESTAMPTZ DEFAULT NOW(),
  items JSONB NOT NULL,
  status TEXT NOT NULL,
  "paymentStatus" TEXT NOT NULL,
  "totalAmount" NUMERIC NOT NULL,
  "paidAmount" NUMERIC NOT NULL,
  notes TEXT,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CUSTOMER_ORDERS Table
CREATE TABLE IF NOT EXISTS customer_orders (
  id TEXT PRIMARY KEY,
  "orderNumber" TEXT NOT NULL,
  "storeId" TEXT REFERENCES stores(id) ON DELETE CASCADE,
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT NOT NULL,
  "customerAddress" TEXT,
  items JSONB NOT NULL,
  "totalAmount" NUMERIC NOT NULL,
  status TEXT NOT NULL,
  "paymentStatus" TEXT NOT NULL,
  "orderDate" TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- 9. MASTER_CROPS Table
CREATE TABLE IF NOT EXISTS master_crops (
  id TEXT PRIMARY KEY,
  "vegetableName" TEXT NOT NULL UNIQUE,
  "costPrice" NUMERIC NOT NULL,
  "sellingPrice" NUMERIC NOT NULL,
  category TEXT NOT NULL,
  "minStockThreshold" INTEGER DEFAULT 20
);

-- Enable Row Level Security (RLS) on all tables or disable them for easy setup:
-- Alter table RLS commands if you want to set specific policies. For instant access, you can run:
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE requirements DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE master_crops DISABLE ROW LEVEL SECURITY;

`;
}

export interface SupabaseDiagnostics {
  connected: boolean;
  url: string;
  urlReachable: boolean;
  authValid: boolean;
  tables: {
    name: string;
    exists: boolean;
    rowCount: number;
    error?: string;
  }[];
  errorMessage?: string;
}

export async function dbRunDiagnostics(): Promise<SupabaseDiagnostics> {
  const config = getSupabaseConfig();
  const result: SupabaseDiagnostics = {
    connected: false,
    url: config.supabaseUrl,
    urlReachable: false,
    authValid: false,
    tables: []
  };

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    result.errorMessage = "Supabase URL and Anon Key are not configured.";
    return result;
  }

  // 1. Test URL Reachability via a direct REST health call
  try {
    const pingRes = await fetch(`${config.supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': config.supabaseAnonKey
      }
    });
    result.urlReachable = true;
  } catch (e: any) {
    result.urlReachable = false;
    result.errorMessage = `Unable to reach Supabase server. Network error: ${e.message || e}`;
    return result;
  }

  // 2. Test tables
  const tempClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
  result.authValid = true; // Assume valid unless we get a specific authentication error
  
  const tablesToTest = [
    'stores',
    'sales',
    'purchases',
    'inventory',
    'requirements',
    'suppliers',
    'purchase_orders',
    'customer_orders',
    'master_crops'
  ];

  let hasErrors = false;

  for (const tableName of tablesToTest) {
    try {
      const { error, count } = await tempClient
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .limit(1);

      if (error) {
        if (error.code === 'PGRST111' || error.message.includes('JWT') || error.message.includes('Invalid API key') || error.message.includes('invalid api key')) {
          result.authValid = false;
          result.tables.push({ name: tableName, exists: false, rowCount: 0, error: error.message });
          hasErrors = true;
        } else if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('relation')) {
          result.tables.push({ name: tableName, exists: false, rowCount: 0, error: 'Table does not exist. Please run the SQL schema setup script.' });
          hasErrors = true;
        } else {
          result.tables.push({ name: tableName, exists: false, rowCount: 0, error: error.message });
          hasErrors = true;
        }
      } else {
        result.tables.push({ name: tableName, exists: true, rowCount: count || 0 });
      }
    } catch (e: any) {
      result.tables.push({ name: tableName, exists: false, rowCount: 0, error: e.message || String(e) });
      hasErrors = true;
    }
  }

  result.connected = result.urlReachable && result.authValid && !hasErrors;
  return result;
}

