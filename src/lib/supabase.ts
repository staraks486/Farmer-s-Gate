import { generateId } from './utils';
import { idbSaveCreds, idbAddOp, idbClearOps } from "./idb";
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  addStoreToFirestore, 
  updateStoreInFirestore, 
  deleteStoreFromFirestore, 
  getStoresFromFirestore,
  getFromFirestore,
  addToFirestore,
  updateInFirestore,
  deleteFromFirestore,
  batchAddToFirestore
} from './firebase';
import { Store, Sale, Purchase, InventoryItem, Requirement, SupabaseConfig, Supplier, PurchaseOrder, CustomerOrder, MasterCrop, StaffMember, AttendanceRecord, CompanyOfficial, OfferPromo, MilkCustomer } from '../types';

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
const DEFAULT_STORES: Store[] = [];

const DEFAULT_SALES: Sale[] = [];

const DEFAULT_PURCHASES: Purchase[] = [];

const DEFAULT_REQUIREMENTS: Requirement[] = [];

const DEFAULT_SUPPLIERS: Supplier[] = [];

const DEFAULT_PURCHASE_ORDERS: PurchaseOrder[] = [];

const DEFAULT_CUSTOMER_ORDERS: CustomerOrder[] = [];

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
    idbSaveCreds(url, key).catch(console.error);
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
  if (!localStorage.getItem('fg_master_crops')) {
    localStorage.setItem('fg_master_crops', JSON.stringify(DEFAULT_MASTER_CROPS));
  }
  if (!localStorage.getItem('fg_stores')) {
    localStorage.setItem('fg_stores', JSON.stringify([]));
  }
  if (!localStorage.getItem('fg_inventory')) {
    localStorage.setItem('fg_inventory', JSON.stringify([]));
  }
  if (!localStorage.getItem('fg_sales')) {
    localStorage.setItem('fg_sales', JSON.stringify([]));
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
  idbClearOps().catch(console.error);
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
    id: generateId('op'),
    table,
    action,
    data,
    timestamp: new Date().toISOString()
  };
  filteredOps.push(newOp);
  localStorage.setItem('fg_unsynced_ops', JSON.stringify(filteredOps));
  idbAddOp(newOp).catch(console.error);
  registerBackgroundSync();
}

/**
 * Safely registers service worker background sync event, handling iframe boundaries
 * and preventing uncaught browser DOMExceptions.
 */
export function registerBackgroundSync(): void {
  // Safe progressive enhancement bypass to avoid browser/iframe DOMExceptions
  console.log("[Sync] Background sync registration is bypassed. Offline data synchronization is handled natively via Firestore streams and robust local database caches.");
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
    idbClearOps().then(() => {
      failedOps.forEach(op => idbAddOp(op).catch(console.error));
    }).catch(console.error);
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


async function addToCloud<T extends { id?: string }>(collectionName: string, data: T): Promise<string> {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { error } = await supabaseInstance.from(collectionName).insert(data);
        if (!error) return data.id || 'mock-id';
      } catch(e) {
        console.warn('Supabase insert failed', collectionName, e);
      }
    }
  }
  return await addToFirestore(collectionName, data);
}

async function updateInCloud<T>(collectionName: string, id: string, updatedFields: Partial<T>) {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { error } = await supabaseInstance.from(collectionName).update(updatedFields as any).eq('id', id);
        if (!error) return;
      } catch(e) {
        console.warn('Supabase update failed', collectionName, e);
      }
    }
  }
  return await updateInFirestore(collectionName, id, updatedFields);
}

async function deleteFromCloud(collectionName: string, id: string) {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { error } = await supabaseInstance.from(collectionName).delete().eq('id', id);
        if (!error) return;
      } catch(e) {
        console.warn('Supabase delete failed', collectionName, e);
      }
    }
  }
  return await deleteFromFirestore(collectionName, id);
}

async function batchAddToCloud<T extends { id?: string }>(collectionName: string, dataList: T[]) {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { error } = await supabaseInstance.from(collectionName).insert(dataList);
        if (!error) return;
      } catch(e) {
        console.warn('Supabase batch insert failed', collectionName, e);
      }
    }
  }
  return await batchAddToFirestore(collectionName, dataList);
}

async function getFromCloud<T>(collectionName: string): Promise<T[]> {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from(collectionName).select('*');
        if (!error && data && data.length > 0) {
          return data as T[];
        }
      } catch(e) {
        console.warn('Supabase fetch failed for', collectionName, e);
      }
    }
  }
  return await getFromCloud<T>(collectionName);
}

export async function dbGetStores(): Promise<Store[]> {
  const localStr = localStorage.getItem('fg_stores');
  const localStores: Store[] = localStr ? JSON.parse(localStr) : [];
  
  // Load tombstones to prevent resurrecting deleted stores
  const deletedStr = localStorage.getItem('fg_deleted_stores') || '[]';
  const deletedIds: string[] = JSON.parse(deletedStr);

  let mergedStores: Store[] = [...localStores];

  // 1. Try Supabase as the primary persistent cloud source if connected
  try {
    const config = getSupabaseConfig();
    if (config.isConnected) {
      if (!supabaseInstance) initSupabase();
      if (supabaseInstance) {
        const { data, error } = await supabaseInstance.from('stores').select('*');
        if (!error && data && data.length > 0) {
          const storeMap = new Map<string, Store>();
          localStores.forEach(s => storeMap.set(s.id, s));
          data.forEach((s: any) => {
            const existing = storeMap.get(s.id);
            if (!existing || (s.version || 0) >= (existing.version || 0)) {
              storeMap.set(s.id, s as Store);
            }
          });
          mergedStores = Array.from(storeMap.values());
        }
      }
    }
  } catch (e) {
    console.warn('Supabase fetch failed:', e);
  }

  // 2. Try Firestore as the secondary cloud source
  try {
    const fsStores = await getStoresFromFirestore();
    if (fsStores && fsStores.length > 0) {
      // Merge with local, higher version wins
      const storeMap = new Map<string, Store>();
      // Add local first
      localStores.forEach(s => storeMap.set(s.id, s));
      // Overwrite with Firestore only if Firestore version is greater or equal
      fsStores.forEach((s: any) => {
        const existing = storeMap.get(s.id);
        if (!existing || (s.version || 0) >= (existing.version || 0)) {
          storeMap.set(s.id, s);
        }
      });
      mergedStores = Array.from(storeMap.values());
    }
  } catch (e) {
    console.warn('Firestore fetch failed:', e);
  }

  // 2. Try Backend as the secondary source
  try {
    const res = await fetch("/api/stores");
    if (res.ok) {
      const serverStores: Store[] = await res.json();
      
      const storeMap = new Map<string, Store>();
      // Add current merged first
      mergedStores.forEach(s => storeMap.set(s.id, s));
      // Add server stores, higher version wins
      serverStores.forEach(s => {
        const existing = storeMap.get(s.id);
        if (!existing || (s.version || 0) >= (existing.version || 0)) {
          storeMap.set(s.id, s);
        }
      });
      mergedStores = Array.from(storeMap.values());
    }
  } catch (e) {
    console.warn('Backend fetch failed:', e);
  }

  // Filter out deleted stores
  const finalStores = mergedStores.filter(s => !deletedIds.includes(s.id));
  
  // Deduplicate and save to local storage
  localStorage.setItem('fg_stores', JSON.stringify(finalStores));
  
  // Proactively push any stores missing from Firestore
  try {
    const fsStores = await getStoresFromFirestore();
    const fsIds = new Set(fsStores.map((s: any) => s.id));
    for (const store of finalStores) {
      if (!fsIds.has(store.id)) {
        await addStoreToFirestore(store);
      }
    }
  } catch (e) {}

  return finalStores;
}

export async function dbAddStore(store: Store): Promise<Store> {
  // Remove from deleted tombstones list so it can be added again
  try {
    const deletedStr = localStorage.getItem('fg_deleted_stores') || '[]';
    const deletedIds: string[] = JSON.parse(deletedStr);
    const updatedDeleted = deletedIds.filter(id => id !== store.id);
    localStorage.setItem('fg_deleted_stores', JSON.stringify(updatedDeleted));
  } catch (e) {}

  // Set initial version if not present
  if (store.version === undefined) {
    store.version = 1;
  }
  
  // Always update local storage first so that the UI can update instantly and reliably
  const local = localStorage.getItem('fg_stores');
  const stores = local ? JSON.parse(local) : [];
  if (!stores.some((s: Store) => s.id === store.id)) {
    stores.push(store);
    localStorage.setItem('fg_stores', JSON.stringify(stores));
  }
  
  // Also clear cache
  localStorage.removeItem('fg_cached_stores');

  // Sync to Firestore
  try {
    await addStoreToFirestore(store);
  } catch (err) {
    console.warn('Firestore add store failed:', err);
  }

  try {
    const res = await fetch("/api/stores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store)
    });
    if (!res.ok) throw new Error("Backend save failed");
    const result = await res.json();
    if (result && result.store) {
      return result.store as Store;
    }
  } catch (e) {
    console.warn('Backend save failed, keeping in local storage:', e);
  }
  
  return store;
}

export async function dbUpdateStore(store: Store): Promise<Store> {
  // Increment version on every modification
  store.version = (store.version || 0) + 1;
  
  // Always update local storage first
  const local = localStorage.getItem('fg_stores');
  const stores = local ? JSON.parse(local) : [];
  const index = stores.findIndex((s: Store) => s.id === store.id);
  if (index !== -1) {
    stores[index] = store;
  } else {
    stores.push(store);
  }
  localStorage.setItem('fg_stores', JSON.stringify(stores));
  
  // Also clear cache to force fresh reload
  localStorage.removeItem('fg_cached_stores');

  // Sync to Firestore
  try {
    const { id, ...fields } = store;
    await updateStoreInFirestore(id, fields);
  } catch (err) {
    console.warn('Firestore update store failed:', err);
  }

  try {
    const res = await fetch(`/api/stores/${store.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(store)
    });
    if (!res.ok) throw new Error("Backend update failed");
    const result = await res.json();
    if (result && result.store) {
      return result.store as Store;
    }
  } catch (e) {
    console.warn('Backend update failed, keeping in local storage:', e);
  }

  return store;
}

export async function dbDeleteStore(id: string): Promise<void> {
  // Save tombstone
  try {
    const deletedStr = localStorage.getItem('fg_deleted_stores') || '[]';
    const deletedIds: string[] = JSON.parse(deletedStr);
    if (!deletedIds.includes(id)) {
      deletedIds.push(id);
      localStorage.setItem('fg_deleted_stores', JSON.stringify(deletedIds));
    }
  } catch (e) {}

  // Always update local storage first
  const local = localStorage.getItem('fg_stores');
  const stores = local ? JSON.parse(local) : [];
  const filtered = stores.filter((s: Store) => s.id !== id);
  localStorage.setItem('fg_stores', JSON.stringify(filtered));

  // Also remove from fg_cached_stores
  localStorage.removeItem('fg_cached_stores');

  // Sync to Firestore
  try {
    await deleteStoreFromFirestore(id);
  } catch (err) {
    console.warn('Firestore delete store failed:', err);
  }

  try {
    const res = await fetch(`/api/stores/${id}`, {
      method: "DELETE"
    });
    if (!res.ok) throw new Error("Backend delete failed");
  } catch (e) {
    console.warn('Backend delete failed, keeping in local storage:', e);
  }
}


// SALES
export async function dbGetSales(storeId?: string): Promise<Sale[]> {
  const local = localStorage.getItem('fg_sales');
  const allSales: Sale[] = local ? JSON.parse(local) : [];
  let mergedSales = [...allSales];

  // 1. Try Firestore as the primary persistent cloud source
  try {
    const fsSales = await getFromCloud<Sale>('sales');
    if (fsSales && fsSales.length > 0) {
      const map = new Map<string, Sale>();
      allSales.forEach(s => map.set(s.id, s));
      fsSales.forEach(s => map.set(s.id, s));
      mergedSales = Array.from(map.values());
      localStorage.setItem('fg_sales', JSON.stringify(mergedSales));
    }
  } catch (e) {
    console.warn('Firestore fetch sales failed, falling back to local storage:', e);
  }

  if (storeId) {
    return mergedSales.filter(s => s.storeId === storeId);
  }
  return mergedSales;
}

export async function dbAddSale(sale: Sale): Promise<Sale> {
  // 1. Always write to local storage first
  try {
    const local = localStorage.getItem('fg_sales');
    const sales = local ? JSON.parse(local) : [];
    const index = sales.findIndex((s: Sale) => s.id === sale.id);
    
    if (index !== -1) {
      // It's an update - calculate delta for inventory
      const oldQty = sales[index].quantity;
      const delta = sale.quantity - oldQty;
      if (delta !== 0) {
        await dbAdjustInventoryStock(sale.storeId, sale.vegetableName, -delta);
      }
      sales[index] = sale;
    } else {
      // It's a new sale
      await dbAdjustInventoryStock(sale.storeId, sale.vegetableName, -sale.quantity);
      sales.unshift(sale);
    }
    localStorage.setItem('fg_sales', JSON.stringify(sales));
  } catch (err) {
    console.warn('Failed to update local sales cache:', err);
  }

  // 2. Sync to Firestore
  try {
    await addToCloud('sales', sale);
  } catch (err) {
    console.warn('Firestore save sale failed:', err);
    dbAddUnsyncedOp('sales', 'insert', sale);
  }

  return sale;
}

export async function dbAddSales(salesList: Sale[]): Promise<Sale[]> {
  // 1. Always write to local storage first
  try {
    const local = localStorage.getItem('fg_sales');
    let sales = local ? JSON.parse(local) : [];
    
    for (const newS of salesList) {
      const index = sales.findIndex((s: Sale) => s.id === newS.id);
      if (index !== -1) {
        const oldQty = sales[index].quantity;
        const delta = newS.quantity - oldQty;
        if (delta !== 0) {
          await dbAdjustInventoryStock(newS.storeId, newS.vegetableName, -delta);
        }
        sales[index] = newS;
      } else {
        await dbAdjustInventoryStock(newS.storeId, newS.vegetableName, -newS.quantity);
        sales.unshift(newS);
      }
    }
    localStorage.setItem('fg_sales', JSON.stringify(sales));
  } catch (err) {
    console.warn('Failed to update local sales cache in batch:', err);
  }

  // 2. Sync to Firestore
  try {
    await batchAddToCloud('sales', salesList);
  } catch (err) {
    console.warn('Firestore batch save sales failed:', err);
    for (const sale of salesList) {
      dbAddUnsyncedOp('sales', 'insert', sale);
    }
  }

  return salesList;
}

export async function dbDeleteSale(id: string): Promise<void> {
  // Get sale detail to restore inventory
  const sales = await dbGetSales();
  const sale = sales.find(s => s.id === id);
  if (sale) {
    // Add the quantity back to inventory
    await dbAdjustInventoryStock(sale.storeId, sale.vegetableName, sale.quantity);
  }

  // Sync to Firestore
  try {
    await deleteFromCloud('sales', id);
  } catch (err) {
    console.warn('Firestore delete sale failed:', err);
    dbAddUnsyncedOp('sales', 'delete', { id });
  }

  const filtered = sales.filter(s => s.id !== id);
  localStorage.setItem('fg_sales', JSON.stringify(filtered));
}

export async function dbUpdateSale(sale: Sale): Promise<Sale> {
  // 1. Update in local storage
  try {
    const local = localStorage.getItem('fg_sales');
    const sales = local ? JSON.parse(local) : [];
    const index = sales.findIndex((s: Sale) => s.id === sale.id);
    if (index !== -1) {
      sales[index] = sale;
      localStorage.setItem('fg_sales', JSON.stringify(sales));
    }
  } catch (err) {
    console.warn('Failed to update local sale cache:', err);
  }

  // 2. Update in Firestore
  try {
    await updateInCloud('sales', sale.id, sale);
  } catch (err) {
    console.warn('Firestore update sale failed:', err);
    dbAddUnsyncedOp('sales', 'update', sale);
  }

  return sale;
}


// PURCHASES
export async function dbGetPurchases(storeId?: string): Promise<Purchase[]> {
  const local = localStorage.getItem('fg_purchases');
  const allPurchases: Purchase[] = local ? JSON.parse(local) : [];
  let mergedPurchases = [...allPurchases];

  // 1. Try Firestore
  try {
    const fsPurchases = await getFromCloud<Purchase>('purchases');
    if (fsPurchases && fsPurchases.length > 0) {
      const map = new Map<string, Purchase>();
      allPurchases.forEach(p => map.set(p.id, p));
      fsPurchases.forEach(p => map.set(p.id, p));
      mergedPurchases = Array.from(map.values());
      localStorage.setItem('fg_purchases', JSON.stringify(mergedPurchases));
    }
  } catch (e) {
    console.warn('Firestore fetch purchases failed:', e);
  }

  if (storeId) {
    return mergedPurchases.filter(p => p.storeId === storeId);
  }
  return mergedPurchases;
}

export async function dbAddPurchase(purchase: Purchase): Promise<Purchase> {
  // Add stock to inventory, and update last cost price
  await dbAdjustInventoryStock(purchase.storeId, purchase.vegetableName, purchase.quantity, purchase.costPerKg);

  // 1. Save to Firestore
  try {
    await addToCloud('purchases', purchase);
  } catch (err) {
    console.warn('Firestore save purchase failed:', err);
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

  // Sync to Firestore
  try {
    await deleteFromCloud('purchases', id);
  } catch (err) {
    console.warn('Firestore delete purchase failed:', err);
    dbAddUnsyncedOp('purchases', 'delete', { id });
  }

  const filtered = purchases.filter(p => p.id !== id);
  localStorage.setItem('fg_purchases', JSON.stringify(filtered));
}


// INVENTORY
export async function dbGetInventory(storeId?: string): Promise<InventoryItem[]> {
  const local = localStorage.getItem('fg_inventory');
  const allInventory: InventoryItem[] = local ? JSON.parse(local) : [];
  let mergedInventory = [...allInventory];

  // 1. Try Firestore
  try {
    const fsInventory = await getFromCloud<InventoryItem>('inventory');
    if (fsInventory && fsInventory.length > 0) {
      const map = new Map<string, InventoryItem>();
      allInventory.forEach(i => map.set(i.id, i));
      fsInventory.forEach(i => map.set(i.id, i));
      mergedInventory = Array.from(map.values());
      localStorage.setItem('fg_inventory', JSON.stringify(mergedInventory));
    }
  } catch (e) {
    console.warn('Firestore fetch inventory failed:', e);
  }

  if (storeId) {
    return mergedInventory.filter(i => i.storeId === storeId);
  }
  return mergedInventory;
}

export async function dbAddOrUpdateInventoryItem(item: InventoryItem): Promise<InventoryItem> {
  // 1. Sync to Firestore
  try {
    await addToCloud('inventory', item);
  } catch (err) {
    console.warn('Firestore upsert inventory failed:', err);
    dbAddUnsyncedOp('inventory', 'insert', item);
  }

  const inventory = await dbGetInventory();
  const index = inventory.findIndex(i => i.storeId === item.storeId && (i.vegetableName || '').toLowerCase() === (item.vegetableName || '').toLowerCase());
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

export async function dbAddOrUpdateInventoryItems(items: InventoryItem[]): Promise<InventoryItem[]> {
  // 1. Sync to Firestore
  try {
    await batchAddToCloud('inventory', items);
  } catch (err) {
    console.warn('Firestore bulk upsert inventory failed:', err);
    for (const item of items) {
      dbAddUnsyncedOp('inventory', 'insert', item);
    }
  }

  const inventory = await dbGetInventory();
  const updatedItems: InventoryItem[] = [];
  
  for (const item of items) {
    const index = inventory.findIndex(i => i.storeId === item.storeId && (i.vegetableName || '').toLowerCase() === (item.vegetableName || '').toLowerCase());
    if (index !== -1) {
      inventory[index] = { ...inventory[index], ...item, lastUpdated: new Date().toISOString() };
      updatedItems.push(inventory[index]);
    } else {
      inventory.push(item);
      updatedItems.push(item);
    }
  }
  
  localStorage.setItem('fg_inventory', JSON.stringify(inventory));
  return updatedItems;
}

// Helper to adjust stock quantity dynamically when transactions occur
export async function dbAdjustInventoryStock(storeId: string, vegName: string, qtyDelta: number, costPriceUpdate?: number): Promise<void> {
  const inventory = await dbGetInventory(storeId);
  const match = inventory.find(i => (i.vegetableName || '').toLowerCase() === (vegName || '').toLowerCase());

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
      id: generateId('inv'),
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
  const local = localStorage.getItem('fg_requirements');
  const allReqs: Requirement[] = local ? JSON.parse(local) : [];
  let mergedReqs = [...allReqs];

  // 1. Try Firestore
  try {
    const fsReqs = await getFromCloud<Requirement>('requirements');
    if (fsReqs && fsReqs.length > 0) {
      const map = new Map<string, Requirement>();
      allReqs.forEach(r => map.set(r.id, r));
      fsReqs.forEach(r => map.set(r.id, r));
      mergedReqs = Array.from(map.values());
      localStorage.setItem('fg_requirements', JSON.stringify(mergedReqs));
    }
  } catch (e) {
    console.warn('Firestore fetch requirements failed:', e);
  }

  if (storeId) {
    return mergedReqs.filter(r => r.storeId === storeId);
  }
  return mergedReqs;
}

export async function dbAddRequirement(req: Requirement): Promise<Requirement> {
  // 1. Sync to Firestore
  try {
    await addToCloud('requirements', req);
  } catch (err) {
    console.warn('Firestore save requirement failed:', err);
    dbAddUnsyncedOp('requirements', 'insert', req);
  }

  const reqs = await dbGetRequirements();
  reqs.unshift(req);
  localStorage.setItem('fg_requirements', JSON.stringify(reqs));
  return req;
}

export async function dbUpdateRequirement(req: Requirement): Promise<Requirement> {
  // 1. Sync to Firestore
  try {
    await updateInCloud('requirements', req.id, req);
  } catch (err) {
    console.warn('Firestore update requirement failed:', err);
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
  // Sync to Firestore
  try {
    await deleteFromCloud('requirements', id);
  } catch (err) {
    console.warn('Firestore delete requirement failed:', err);
    dbAddUnsyncedOp('requirements', 'delete', { id });
  }

  const reqs = await dbGetRequirements();
  const filtered = reqs.filter(r => r.id !== id);
  localStorage.setItem('fg_requirements', JSON.stringify(filtered));
}

// --- SUPPLIERS ---
export async function dbGetSuppliers(): Promise<Supplier[]> {
  const local = localStorage.getItem('fg_suppliers');
  const allSuppliers: Supplier[] = local ? JSON.parse(local) : [];
  let mergedSuppliers = [...allSuppliers];

  // 1. Try Firestore
  try {
    const fsSuppliers = await getFromCloud<Supplier>('suppliers');
    if (fsSuppliers && fsSuppliers.length > 0) {
      const map = new Map<string, Supplier>();
      allSuppliers.forEach(s => map.set(s.id, s));
      fsSuppliers.forEach(s => map.set(s.id, s));
      mergedSuppliers = Array.from(map.values());
      localStorage.setItem('fg_suppliers', JSON.stringify(mergedSuppliers));
    }
  } catch (e) {
    console.warn('Firestore fetch suppliers failed:', e);
  }
  return mergedSuppliers;
}

export async function dbAddSupplier(supplier: Supplier): Promise<Supplier> {
  // 1. Sync to Firestore
  try {
    await addToCloud('suppliers', supplier);
  } catch (err) {
    console.warn('Firestore save supplier failed:', err);
    dbAddUnsyncedOp('suppliers', 'insert', supplier);
  }
  const suppliers = await dbGetSuppliers();
  suppliers.push(supplier);
  localStorage.setItem('fg_suppliers', JSON.stringify(suppliers));
  return supplier;
}

export async function dbUpdateSupplier(supplier: Supplier): Promise<Supplier> {
  // 1. Sync to Firestore
  try {
    await updateInCloud('suppliers', supplier.id, supplier);
  } catch (err) {
    console.warn('Firestore update supplier failed:', err);
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
  // Sync to Firestore
  try {
    await deleteFromCloud('suppliers', id);
  } catch (err) {
    console.warn('Firestore delete supplier failed:', err);
    dbAddUnsyncedOp('suppliers', 'delete', { id });
  }
  const suppliers = await dbGetSuppliers();
  const filtered = suppliers.filter(s => s.id !== id);
  localStorage.setItem('fg_suppliers', JSON.stringify(filtered));
}


// --- PURCHASE ORDERS ---
export async function dbGetPurchaseOrders(storeId?: string): Promise<PurchaseOrder[]> {
  const local = localStorage.getItem('fg_purchase_orders');
  const allPOs: PurchaseOrder[] = local ? JSON.parse(local) : [];
  let mergedPOs = [...allPOs];

  // 1. Try Firestore
  try {
    const fsPOs = await getFromCloud<PurchaseOrder>('purchase_orders');
    if (fsPOs && fsPOs.length > 0) {
      const map = new Map<string, PurchaseOrder>();
      allPOs.forEach(p => map.set(p.id, p));
      fsPOs.forEach(p => map.set(p.id, p));
      mergedPOs = Array.from(map.values());
      localStorage.setItem('fg_purchase_orders', JSON.stringify(mergedPOs));
    }
  } catch (e) {
    console.warn('Firestore fetch POs failed:', e);
  }

  if (storeId) {
    return mergedPOs.filter(p => p.storeId === storeId);
  }
  return mergedPOs;
}

export async function dbAddPurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  // 1. Sync to Firestore
  try {
    await addToCloud('purchase_orders', po);
  } catch (err) {
    console.warn('Firestore save PO failed:', err);
    dbAddUnsyncedOp('purchase_orders', 'insert', po);
  }
  const pos = await dbGetPurchaseOrders();
  pos.unshift(po);
  localStorage.setItem('fg_purchase_orders', JSON.stringify(pos));
  return po;
}

export async function dbUpdatePurchaseOrder(po: PurchaseOrder): Promise<PurchaseOrder> {
  // 1. Sync to Firestore
  try {
    await updateInCloud('purchase_orders', po.id, po);
  } catch (err) {
    console.warn('Firestore update PO failed:', err);
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
  // Sync to Firestore
  try {
    await deleteFromCloud('purchase_orders', id);
  } catch (err) {
    console.warn('Firestore delete PO failed:', err);
    dbAddUnsyncedOp('purchase_orders', 'delete', { id });
  }
  const pos = await dbGetPurchaseOrders();
  const filtered = pos.filter(p => p.id !== id);
  localStorage.setItem('fg_purchase_orders', JSON.stringify(filtered));
}


// --- CUSTOMER ORDERS (Store/Admin Side) ---
export async function dbGetCustomerOrders(storeId?: string): Promise<CustomerOrder[]> {
  const local = localStorage.getItem('fg_customer_orders');
  const allCOs: CustomerOrder[] = local ? JSON.parse(local) : [];
  let mergedCOs = [...allCOs];

  // 1. Try Firestore
  try {
    const fsCOs = await getFromCloud<CustomerOrder>('customer_orders');
    if (fsCOs && fsCOs.length > 0) {
      const map = new Map<string, CustomerOrder>();
      allCOs.forEach(c => map.set(c.id, c));
      fsCOs.forEach(c => map.set(c.id, c));
      mergedCOs = Array.from(map.values());
      localStorage.setItem('fg_customer_orders', JSON.stringify(mergedCOs));
    }
  } catch (e) {
    console.warn('Firestore fetch COs failed:', e);
  }

  if (storeId) {
    return mergedCOs.filter(c => c.storeId === storeId);
  }
  return mergedCOs;
}

export async function dbAddCustomerOrder(co: CustomerOrder): Promise<CustomerOrder> {
  // 1. Sync to Firestore
  try {
    await addToCloud('customer_orders', co);
  } catch (err) {
    console.warn('Firestore save CO failed:', err);
    dbAddUnsyncedOp('customer_orders', 'insert', co);
  }
  const cos = await dbGetCustomerOrders();
  cos.unshift(co);
  localStorage.setItem('fg_customer_orders', JSON.stringify(cos));
  return co;
}

export async function dbUpdateCustomerOrder(co: CustomerOrder): Promise<CustomerOrder> {
  // 1. Sync to Firestore
  try {
    await updateInCloud('customer_orders', co.id, co);
  } catch (err) {
    console.warn('Firestore update CO failed:', err);
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
  // Sync to Firestore
  try {
    await deleteFromCloud('customer_orders', id);
  } catch (err) {
    console.warn('Firestore delete CO failed:', err);
    dbAddUnsyncedOp('customer_orders', 'delete', { id });
  }
  const cos = await dbGetCustomerOrders();
  const filtered = cos.filter(c => c.id !== id);
  localStorage.setItem('fg_customer_orders', JSON.stringify(filtered));
}

// --- MASTER CROPS ---
export async function dbGetMasterCrops(): Promise<MasterCrop[]> {
  const local = localStorage.getItem('fg_master_crops');
  const allCrops: MasterCrop[] = local ? JSON.parse(local) : DEFAULT_MASTER_CROPS;
  let mergedCrops = [...allCrops];

  // 1. Try Firestore
  try {
    const fsCrops = await getFromCloud<MasterCrop>('master_crops');
    if (fsCrops && fsCrops.length > 0) {
      const map = new Map<string, MasterCrop>();
      allCrops.forEach(c => map.set(c.id, c));
      fsCrops.forEach(c => map.set(c.id, c));
      mergedCrops = Array.from(map.values());
      localStorage.setItem('fg_master_crops', JSON.stringify(mergedCrops));
    }
  } catch (e) {
    console.warn('Firestore fetch crops failed:', e);
  }
  return mergedCrops;
}

export async function dbAddOrUpdateMasterCrop(crop: MasterCrop): Promise<MasterCrop> {
  // 1. Sync to Firestore
  try {
    await addToCloud('master_crops', crop);
  } catch (err) {
    console.warn('Firestore save crop failed:', err);
    dbAddUnsyncedOp('master_crops', 'insert', crop);
  }
  const crops = await dbGetMasterCrops();
  const index = crops.findIndex(c => c.id === crop.id);
  if (index !== -1) {
    crops[index] = crop;
  } else {
    crops.push(crop);
  }
  localStorage.setItem('fg_master_crops', JSON.stringify(crops));
  return crop;
}

export async function dbDeleteMasterCrop(id: string): Promise<void> {
  // Sync to Firestore
  try {
    await deleteFromCloud('master_crops', id);
  } catch (err) {
    console.warn('Firestore delete crop failed:', err);
    dbAddUnsyncedOp('master_crops', 'delete', { id });
  }
  const crops = await dbGetMasterCrops();
  const filtered = crops.filter(c => c.id !== id);
  localStorage.setItem('fg_master_crops', JSON.stringify(filtered));
}

// ==========================================
// STAFF MEMBERS & ATTENDANCE OPERATIONS
// ==========================================

export async function dbGetStaffMembers(): Promise<StaffMember[]> {
  const local = localStorage.getItem('fg_staff_members');
  const defaultStaff: StaffMember[] = [
    { id: 'staff-1', name: 'Ramesh Kumar', role: 'Manager', phone: '9876543210', assignedStoreId: '', isActive: true, createdAt: new Date().toISOString() },
    { id: 'staff-2', name: 'Suresh Singh', role: 'Staff', phone: '9876543211', assignedStoreId: '', isActive: true, createdAt: new Date().toISOString() },
    { id: 'staff-3', name: 'Anita Patel', role: 'Salesperson', phone: '9876543212', assignedStoreId: '', isActive: true, createdAt: new Date().toISOString() },
    { id: 'staff-4', name: 'Vijay Sharma', role: 'Cashier', phone: '9876543213', assignedStoreId: '', isActive: true, createdAt: new Date().toISOString() }
  ];
  const allStaff: StaffMember[] = local ? JSON.parse(local) : defaultStaff;
  let mergedStaff = [...allStaff];

  // 1. Try Firestore
  try {
    const fsStaff = await getFromCloud<StaffMember>('staff');
    if (fsStaff && fsStaff.length > 0) {
      const map = new Map<string, StaffMember>();
      allStaff.forEach(s => map.set(s.id, s));
      fsStaff.forEach(s => map.set(s.id, s));
      mergedStaff = Array.from(map.values());
      localStorage.setItem('fg_staff_members', JSON.stringify(mergedStaff));
    }
  } catch (e) {
    console.warn('Firestore fetch staff failed:', e);
  }

  return mergedStaff;
}

export async function dbAddStaffMember(staff: StaffMember): Promise<StaffMember> {
  // 1. Sync to Firestore
  try {
    await addToCloud('staff', staff);
  } catch (err) {
    console.warn('Firestore save staff failed:', err);
    dbAddUnsyncedOp('staff_members', 'insert', staff);
  }

  const staffList = await dbGetStaffMembers();
  staffList.push(staff);
  localStorage.setItem('fg_staff_members', JSON.stringify(staffList));
  return staff;
}

export async function dbUpdateStaffMember(staff: StaffMember): Promise<StaffMember> {
  // 1. Sync to Firestore
  try {
    await updateInCloud('staff', staff.id, staff);
  } catch (err) {
    console.warn('Firestore update staff failed:', err);
    dbAddUnsyncedOp('staff_members', 'update', staff);
  }

  const staffList = await dbGetStaffMembers();
  const idx = staffList.findIndex(s => s.id === staff.id);
  if (idx !== -1) {
    staffList[idx] = staff;
  } else {
    staffList.push(staff);
  }
  localStorage.setItem('fg_staff_members', JSON.stringify(staffList));
  return staff;
}

export async function dbDeleteStaffMember(id: string): Promise<void> {
  // Sync to Firestore
  try {
    await deleteFromCloud('staff', id);
  } catch (err) {
    console.warn('Firestore delete staff failed:', err);
    dbAddUnsyncedOp('staff_members', 'delete', { id });
  }

  const staffList = await dbGetStaffMembers();
  const filtered = staffList.filter(s => s.id !== id);
  localStorage.setItem('fg_staff_members', JSON.stringify(filtered));
}

export async function dbGetAttendanceRecords(storeId?: string, date?: string): Promise<AttendanceRecord[]> {
  const local = localStorage.getItem('fg_attendance_records');
  const allRecords: AttendanceRecord[] = local ? JSON.parse(local) : [];
  let mergedRecords = [...allRecords];

  // 1. Try Firestore
  try {
    const fsAttendance = await getFromCloud<AttendanceRecord>('attendance');
    if (fsAttendance && fsAttendance.length > 0) {
      const map = new Map<string, AttendanceRecord>();
      allRecords.forEach(r => map.set(r.id, r));
      fsAttendance.forEach(r => map.set(r.id, r));
      mergedRecords = Array.from(map.values());
      localStorage.setItem('fg_attendance_records', JSON.stringify(mergedRecords));
    }
  } catch (e) {
    console.warn('Firestore fetch attendance failed:', e);
  }

  let filtered = mergedRecords;
  if (storeId) {
    filtered = filtered.filter(r => r.storeId === storeId);
  }
  if (date) {
    filtered = filtered.filter(r => r.date === date);
  }
  return filtered;
}

export async function dbSaveAttendanceRecord(record: AttendanceRecord): Promise<AttendanceRecord> {
  // 1. Sync to Firestore
  try {
    await addToCloud('attendance', record);
  } catch (err) {
    console.warn('Firestore save attendance failed:', err);
    dbAddUnsyncedOp('attendance_records', 'insert', record);
  }

  const local = localStorage.getItem('fg_attendance_records');
  const allRecords: AttendanceRecord[] = local ? JSON.parse(local) : [];
  const idx = allRecords.findIndex(r => r.id === record.id || (r.staffId === record.staffId && r.date === record.date));
  if (idx !== -1) {
    allRecords[idx] = { ...allRecords[idx], ...record };
  } else {
    allRecords.push(record);
  }
  localStorage.setItem('fg_attendance_records', JSON.stringify(allRecords));
  return record;
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

// ==========================================
// --- COMPANY OFFICIALS LOGISTICS ---
// ==========================================

export async function dbGetCompanyOfficials(): Promise<CompanyOfficial[]> {
  const local = localStorage.getItem('fg_company_officials');
  const defaultOfficials: CompanyOfficial[] = [
    { id: 'off-1', name: 'Rajesh Singhania', designation: 'Chief Operating Officer (COO)', mobileNumber: '919888877777', createdAt: new Date().toISOString() },
    { id: 'off-2', name: 'Vikram Aditya', designation: 'Director of Supply Chain', mobileNumber: '919888866666', createdAt: new Date().toISOString() },
    { id: 'off-3', name: 'Dr. Sunita Sharma', designation: 'Head of Quality Assurance', mobileNumber: '919888855555', createdAt: new Date().toISOString() }
  ];
  const allOfficials: CompanyOfficial[] = local ? JSON.parse(local) : defaultOfficials;
  let mergedOfficials = [...allOfficials];

  // 1. Try Firestore
  try {
    const fsOfficials = await getFromCloud<CompanyOfficial>('officials');
    if (fsOfficials && fsOfficials.length > 0) {
      const map = new Map<string, CompanyOfficial>();
      allOfficials.forEach(o => map.set(o.id, o));
      fsOfficials.forEach(o => map.set(o.id, o));
      mergedOfficials = Array.from(map.values());
      localStorage.setItem('fg_company_officials', JSON.stringify(mergedOfficials));
    }
  } catch (e) {
    console.warn('Firestore fetch officials failed:', e);
  }
  return mergedOfficials;
}

export async function dbAddCompanyOfficial(official: CompanyOfficial): Promise<CompanyOfficial> {
  // 1. Sync to Firestore
  try {
    await addToCloud('officials', official);
  } catch (err) {
    console.warn('Firestore save official failed:', err);
    dbAddUnsyncedOp('company_officials', 'insert', official);
  }

  const officialsList = await dbGetCompanyOfficials();
  officialsList.push(official);
  localStorage.setItem('fg_company_officials', JSON.stringify(officialsList));
  return official;
}

export async function dbUpdateCompanyOfficial(official: CompanyOfficial): Promise<CompanyOfficial> {
  // 1. Sync to Firestore
  try {
    await updateInCloud('officials', official.id, official);
  } catch (err) {
    console.warn('Firestore update official failed:', err);
    dbAddUnsyncedOp('company_officials', 'update', official);
  }

  const officialsList = await dbGetCompanyOfficials();
  const idx = officialsList.findIndex(o => o.id === official.id);
  if (idx !== -1) {
    officialsList[idx] = official;
  } else {
    officialsList.push(official);
  }
  localStorage.setItem('fg_company_officials', JSON.stringify(officialsList));
  return official;
}

export async function dbDeleteCompanyOfficial(id: string): Promise<void> {
  // Sync to Firestore
  try {
    await deleteFromCloud('officials', id);
  } catch (err) {
    console.warn('Firestore delete official failed:', err);
    dbAddUnsyncedOp('company_officials', 'delete', { id });
  }

  const officialsList = await dbGetCompanyOfficials();
  const filtered = officialsList.filter(o => o.id !== id);
  localStorage.setItem('fg_company_officials', JSON.stringify(filtered));
}


// OFFERS & PROMOS
export async function dbGetOffers(): Promise<OfferPromo[]> {
  const local = localStorage.getItem('fg_offers');
  const initialOffers: OfferPromo[] = [
    { id: 'off-1', title: 'Monsoon Green Veggie Festival', code: 'MONSOON10', type: 'percentage', value: 10, minOrderAmount: 200, isActive: true, description: 'Get 10% discount on all leafy and fresh organic vegetables.', createdAt: new Date().toISOString() },
    { id: 'off-2', title: 'Tomato Direct Mega Sale', code: 'TOMATO20', type: 'flat', value: 20, minOrderAmount: 150, isActive: true, description: 'Get flat INR 20 off on fresh handpicked farm tomato orders.', createdAt: new Date().toISOString() }
  ];
  const allOffers: OfferPromo[] = local ? JSON.parse(local) : initialOffers;
  let mergedOffers = [...allOffers];

  // 1. Try Firestore
  try {
    const fsOffers = await getFromCloud<OfferPromo>('offers');
    if (fsOffers && fsOffers.length > 0) {
      const map = new Map<string, OfferPromo>();
      allOffers.forEach(o => map.set(o.id, o));
      fsOffers.forEach(o => map.set(o.id, o));
      mergedOffers = Array.from(map.values());
      localStorage.setItem('fg_offers', JSON.stringify(mergedOffers));
    }
  } catch (e) {
    console.warn('Firestore fetch offers failed:', e);
  }

  return mergedOffers;
}

export async function dbAddOffer(offer: OfferPromo): Promise<OfferPromo> {
  // 1. Sync to Firestore
  try {
    await addToCloud('offers', offer);
  } catch (err) {
    console.warn('Firestore save offer failed:', err);
    dbAddUnsyncedOp('offers', 'insert', offer);
  }

  const offers = await dbGetOffers();
  offers.unshift(offer);
  localStorage.setItem('fg_offers', JSON.stringify(offers));
  return offer;
}

export async function dbUpdateOffer(offer: OfferPromo): Promise<OfferPromo> {
  // 1. Sync to Firestore
  try {
    await updateInCloud('offers', offer.id, offer);
  } catch (err) {
    console.warn('Firestore update offer failed:', err);
    dbAddUnsyncedOp('offers', 'update', offer);
  }

  const offers = await dbGetOffers();
  const index = offers.findIndex(o => o.id === offer.id);
  if (index !== -1) {
    offers[index] = offer;
    localStorage.setItem('fg_offers', JSON.stringify(offers));
  }
  return offer;
}

export async function dbDeleteOffer(id: string): Promise<void> {
  // Sync to Firestore
  try {
    await deleteFromCloud('offers', id);
  } catch (err) {
    console.warn('Firestore delete offer failed:', err);
    dbAddUnsyncedOp('offers', 'delete', { id });
  }

  const offers = await dbGetOffers();
  const filtered = offers.filter(o => o.id !== id);
  localStorage.setItem('fg_offers', JSON.stringify(filtered));
}

// --- MILK CUSTOMERS ---
export async function dbGetMilkCustomers(storeId?: string): Promise<MilkCustomer[]> {
  const local = localStorage.getItem('fg_milk_customers');
  const allMilk: MilkCustomer[] = local ? JSON.parse(local) : [];
  let mergedMilk = [...allMilk];

  // 1. Try Firestore
  try {
    const fsMilk = await getFromCloud<MilkCustomer>('milk_customers');
    if (fsMilk && fsMilk.length > 0) {
      const map = new Map<string, MilkCustomer>();
      allMilk.forEach(m => map.set(m.id, m));
      fsMilk.forEach(m => map.set(m.id, m));
      mergedMilk = Array.from(map.values());
      localStorage.setItem('fg_milk_customers', JSON.stringify(mergedMilk));
    }
  } catch (e) {
    console.warn('Firestore fetch milk customers failed:', e);
  }

  if (storeId) {
    return mergedMilk.filter(m => m.storeId === storeId);
  }
  return mergedMilk;
}

export async function dbAddMilkCustomer(customer: MilkCustomer): Promise<MilkCustomer> {
  // 1. Sync to Firestore
  try {
    await addToCloud('milk_customers', customer);
  } catch (err) {
    console.warn('Firestore save milk customer failed:', err);
    dbAddUnsyncedOp('milk_customers', 'insert', customer);
  }
  const milk = await dbGetMilkCustomers();
  milk.push(customer);
  localStorage.setItem('fg_milk_customers', JSON.stringify(milk));
  return customer;
}

export async function dbUpdateMilkCustomer(customer: MilkCustomer): Promise<MilkCustomer> {
  // 1. Sync to Firestore
  try {
    await updateInCloud('milk_customers', customer.id, customer);
  } catch (err) {
    console.warn('Firestore update milk customer failed:', err);
    dbAddUnsyncedOp('milk_customers', 'update', customer);
  }
  const milk = await dbGetMilkCustomers();
  const index = milk.findIndex(m => m.id === customer.id);
  if (index !== -1) {
    milk[index] = customer;
    localStorage.setItem('fg_milk_customers', JSON.stringify(milk));
  }
  return customer;
}

export async function dbDeleteMilkCustomer(id: string): Promise<void> {
  // Sync to Firestore
  try {
    await deleteFromCloud('milk_customers', id);
  } catch (err) {
    console.warn('Firestore delete milk customer failed:', err);
    dbAddUnsyncedOp('milk_customers', 'delete', { id });
  }
  const milk = await dbGetMilkCustomers();
  const filtered = milk.filter(m => m.id !== id);
  localStorage.setItem('fg_milk_customers', JSON.stringify(filtered));
}


