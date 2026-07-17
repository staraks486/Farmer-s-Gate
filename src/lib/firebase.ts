import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  getDocFromServer,
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { AppNotification } from '../types';

// Firestore error operation types for diagnostic tracking

export const stripUndefined = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  return Object.keys(obj).reduce((acc: any, key) => {
    if (obj[key] !== undefined) acc[key] = stripUndefined(obj[key]);
    return acc;
  }, {});
};


export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  timestamp?: string;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Shared error log for UI diagnostics
export let firestoreErrorLog: FirestoreErrorInfo[] = [];

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path,
    timestamp: new Date().toISOString()
  };
  
  // Keep only the last 10 errors
  firestoreErrorLog = [errInfo, ...firestoreErrorLog].slice(0, 10);
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

import firebaseConfigRaw from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigRaw.apiKey || "AIzaSyDduigOVfEXfZnoN_xSz1Shcl3fV1gY6CE",
  authDomain: firebaseConfigRaw.authDomain || "gen-lang-client-0451793681.firebaseapp.com",
  projectId: firebaseConfigRaw.projectId || "gen-lang-client-0451793681",
  storageBucket: firebaseConfigRaw.storageBucket || "gen-lang-client-0451793681.firebasestorage.app",
  messagingSenderId: firebaseConfigRaw.messagingSenderId || "652127387633",
  appId: firebaseConfigRaw.appId || "1:652127387633:web:9d8f2b5fe4af076ba24e50"
};

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with experimentalForceLongPolling for robust iframe connectivity.
// Connecting to the default database (or database specified in config) guarantees connectivity on all links.
const databaseId = firebaseConfigRaw.firestoreDatabaseId || '(default)';
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, databaseId);

// Enable offline persistence (Multi-tab preferred)
enableMultiTabIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Multiple tabs open, multi-tab persistence precondition check.');
    } else {
      // Fallback to single-tab persistence if multi-tab fails or is unimplemented
      enableIndexedDbPersistence(db).catch((singleErr) => {
        console.warn('Offline persistence fallback failure:', singleErr);
      });
    }
  });

// Validate Connection to Firestore (Critical Constraint from Skill)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    } else {
      console.warn("Firestore connection check info:", error);
    }
  }
}
testConnection();


// Initialize Auth
const auth = getAuth(app);

export { app, db, auth };

// Seed Data for Fruits and Vegetables (Zepto-like instant catalog)
export const DEFAULT_PRODUCE = [
  { id: 'v1', vegetableName: 'Premium Potato (A-Grade)', sellingPrice: 48, costPrice: 32, category: 'Vegetable', stock: 120, unit: 'kg', emoji: '🥔', minStockThreshold: 15 },
  { id: 'v2', vegetableName: 'Organic Red Onions', sellingPrice: 38, costPrice: 24, category: 'Vegetable', stock: 150, unit: 'kg', emoji: '🧅', minStockThreshold: 20 },
  { id: 'v3', vegetableName: 'Hybrid Vine Tomatoes', sellingPrice: 55, costPrice: 35, category: 'Vegetable', stock: 95, unit: 'kg', emoji: '🍅', minStockThreshold: 15 },
  { id: 'v4', vegetableName: 'Fresh Baby Spinach Bunch', sellingPrice: 28, costPrice: 15, category: 'Herbs', stock: 40, unit: 'bunch', emoji: '🥬', minStockThreshold: 10 },
  { id: 'v5', vegetableName: 'Spicy Green Chilis', sellingPrice: 18, costPrice: 8, category: 'Herbs', stock: 50, unit: 'g', emoji: '🌶️', minStockThreshold: 5 },
  { id: 'v6', vegetableName: 'Organic Mint Leaves', sellingPrice: 22, costPrice: 10, category: 'Herbs', stock: 35, unit: 'bunch', emoji: '🌱', minStockThreshold: 8 },
  { id: 'v7', vegetableName: 'Shimla Crisp Capsicum', sellingPrice: 85, costPrice: 55, category: 'Vegetable', stock: 60, unit: 'kg', emoji: '🫑', minStockThreshold: 12 },
  { id: 'v8', vegetableName: 'Sweet Royal Gala Apples', sellingPrice: 180, costPrice: 120, category: 'Fruit', stock: 80, unit: 'kg', emoji: '🍎', minStockThreshold: 15 },
  { id: 'v9', vegetableName: 'Robusta Banana (Semi-Ripe)', sellingPrice: 45, costPrice: 28, category: 'Fruit', stock: 110, unit: 'dozen', emoji: '🍌', minStockThreshold: 20 },
  { id: 'v10', vegetableName: 'Premium Alphonso Mangoes', sellingPrice: 399, costPrice: 260, category: 'Fruit', stock: 30, unit: 'box', emoji: '🥭', minStockThreshold: 5 },
  { id: 'v11', vegetableName: 'Farm Fresh Paneer Block', sellingPrice: 95, costPrice: 70, category: 'Grocery', stock: 45, unit: 'pack', emoji: '🧀', minStockThreshold: 10 },
  { id: 'v12', vegetableName: 'Organic Honey (Raw Sourced)', sellingPrice: 240, costPrice: 170, category: 'Grocery', stock: 25, unit: 'pcs', emoji: '🍯', minStockThreshold: 5 }
];

export function isFirebaseSyncEnabled(): boolean {
  // Respect emergency offline mode set via the Recovery prompt or sync settings
  const isForceOffline = localStorage.getItem('fg_force_offline') === 'true';
  if (isForceOffline) return false;

  try {
    const raw = localStorage.getItem('farmersgate_cpanel_settings');
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings.enableFirebaseSync === false) {
        return false;
      }
    }
  } catch (err) {}

  // Otherwise, default to true to ensure data integrity across all environments
  return true;
}

// Seed products if not already initialized
export async function seedProductsIfNeeded() {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const colRef = collection(db, 'products');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      console.log('Seeding initial products collection into Firestore...');
      for (const item of DEFAULT_PRODUCE) {
        await setDoc(doc(db, 'products', item.id), item);
      }
    }
  } catch (error) {
    console.error('Error seeding products:', error);
  }

  // Also seed initial store if missing so ManagementSuite has it
  try {
    const storesRef = collection(db, 'stores');
    const storeSnap = await getDocs(storesRef);
    if (storeSnap.empty) {
      console.log('Seeding initial store into Firestore...');
      const defaultStore = {
        id: "HQ-001",
        name: "Farmer's Gate - HQ",
        location: "FarmersGate HQ",
        whatsappNumber: "+1234567890",
        isActive: true,
        createdAt: new Date().toISOString(),
        lat: 12.9716,
        lng: 77.5946,
        version: 1
      };
      await setDoc(doc(db, 'stores', defaultStore.id), defaultStore);
    }
  } catch (error) {
    console.error('Error seeding initial store:', error);
  }
}

// Fetch all products from Firestore
export async function getProductsFromFirestore() {
  if (!isFirebaseSyncEnabled()) return DEFAULT_PRODUCE;
  try {
    const colRef = collection(db, 'products');
    const snapshot = await getDocs(colRef);
    const list: any[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id });
    });
    return list.length > 0 ? list : DEFAULT_PRODUCE;
  } catch (err) {
    console.error('Error getting products from firestore:', err);
    return DEFAULT_PRODUCE;
  }
}

// Update product stock in Firestore
export async function updateProductStockInFirestore(productId: string, newStock: number) {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, stripUndefined({ stock: newStock }));
  } catch (err) {
    console.error('Error updating stock in firestore:', err);
  }
}

// Update complete product details in Firestore
export async function updateProductInFirestore(productId: string, updatedFields: Partial<any>) {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, stripUndefined(updatedFields));
  } catch (err) {
    console.error('Error updating product in firestore:', err);
    throw err;
  }
}

export async function updateSettings(settings: any) {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, stripUndefined(settings), { merge: true });
  } catch (err) {
    console.error('Error updating settings in Firestore:', err);
    throw err;
  }
}

export async function saveGithubConfig(token: string, user: any) {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, 'settings', 'github_config');
    await setDoc(docRef, stripUndefined({ token, user, updatedAt: new Date().toISOString() }));
  } catch (err) {
    console.error('Error saving github config to Firestore:', err);
    throw err;
  }
}

export async function getGithubConfig() {
  if (!isFirebaseSyncEnabled()) return null;
  try {
    const docRef = doc(db, 'settings', 'github_config');
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    console.error('Error getting github config from Firestore:', err);
    return null;
  }
}

export async function removeGithubConfig() {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, 'settings', 'github_config');
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error removing github config from Firestore:', err);
    throw err;
  }
}

// Update storefront ads in Firestore
export async function updateStorefrontAds(ads: any[]) {
  if (!isFirebaseSyncEnabled()) return;
  try {
    // We'll store ads in a separate collection or a single doc.
    // Given the current structure, let's use storefront_ads collection with fixed IDs
    for (const ad of ads) {
      const adId = ad.id || String(Date.now());
      await setDoc(doc(db, 'storefront_ads', adId), stripUndefined(ad));
    }
  } catch (err) {
    console.error('Error updating storefront ads in Firestore:', err);
    throw err;
  }
}

// Add a new product to Firestore
export async function addProductToFirestore(product: any) {
  if (!isFirebaseSyncEnabled()) return product.id || 'mock-id';
  try {
    const colRef = collection(db, 'products');
    const docRef = await addDoc(colRef, stripUndefined(product));
    return docRef.id;
  } catch (err) {
    console.error('Error adding product to firestore:', err);
    throw err;
  }
}

// Delete a product from Firestore
export async function deleteProductFromFirestore(productId: string) {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting product from firestore:', err);
    throw err;
  }
}

// --- Store Management in Firestore ---

export async function addStoreToFirestore(store: any) {
  if (!isFirebaseSyncEnabled()) return store.id;
  const path = 'stores';
  try {
    const docRef = doc(db, path, store.id);
    await setDoc(docRef, stripUndefined(store));
    return store.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateStoreInFirestore(storeId: string, updatedFields: Partial<any>) {
  if (!isFirebaseSyncEnabled()) return;
  const path = 'stores';
  try {
    const docRef = doc(db, path, storeId);
    await setDoc(docRef, stripUndefined(updatedFields), { merge: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteStoreFromFirestore(storeId: string) {
  if (!isFirebaseSyncEnabled()) return;
  const path = 'stores';
  try {
    const docRef = doc(db, path, storeId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Generic Firestore Helpers ---

export async function getFromFirestore<T>(collectionName: string): Promise<T[]> {
  if (!isFirebaseSyncEnabled()) return [];
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const list: T[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data() as T, id: docSnap.id });
    });
    return list;
  } catch (err) {
    console.error(`Error getting ${collectionName} from firestore:`, err);
    return [];
  }
}

export async function addToFirestore<T extends { id?: string }>(collectionName: string, data: T): Promise<string> {
  if (!isFirebaseSyncEnabled()) return data.id || 'mock-id';
  try {
    const colRef = collection(db, collectionName);
    if (data.id) {
      await setDoc(doc(db, collectionName, data.id), stripUndefined(data));
      return data.id;
    } else {
      const docRef = await addDoc(colRef, stripUndefined(data));
      return docRef.id;
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, collectionName);
    throw err;
  }
}

export async function updateInFirestore<T>(collectionName: string, id: string, updatedFields: Partial<T>) {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, stripUndefined(updatedFields));
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, collectionName);
    throw err;
  }
}

export async function deleteFromFirestore(collectionName: string, id: string) {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, collectionName, id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, collectionName);
    throw err;
  }
}

export async function batchAddToFirestore<T extends { id?: string }>(collectionName: string, dataList: T[]) {
  if (!isFirebaseSyncEnabled()) return;
  // Firestore batch limit is 500, but we'll do them sequentially for simplicity or use a loop
  for (const item of dataList) {
    await addToFirestore(collectionName, item);
  }
}

export async function getStoresFromFirestore() {
  if (!isFirebaseSyncEnabled()) return [];
  const path = 'stores';
  try {
    const colRef = collection(db, path);
    const snapshot = await getDocs(colRef);
    const list: any[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data(), id: docSnap.id });
    });
    return list;
  } catch (err) {
    console.error('Error getting stores from firestore:', err);
    return [];
  }
}

// Reset shopper products collection to default produce in Firestore
export async function resetShopperProductsInFirestore() {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const colRef = collection(db, 'products');
    const snapshot = await getDocs(colRef);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(docSnap.ref);
    }
    for (const item of DEFAULT_PRODUCE) {
      await setDoc(doc(db, 'products', item.id), item);
    }
  } catch (err) {
    console.error('Error resetting shopper products in firestore:', err);
    throw err;
  }
}

// Create custom order in Firestore
export interface FirebaseOrder {
  id?: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: Array<{
    id: string;
    vegetableName: string;
    quantity: number;
    pricePerKg: number;
    totalPrice: number;
    emoji: string;
  }>;
  totalAmount: number;
  discount: number;
  walletDebited: number;
  finalPaid: number;
  status: 'Pending' | 'Packing' | 'On The Way' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Unpaid' | 'Paid';
  orderDate: string;
  notes?: string;
  latitude: number;
  longitude: number;
  riderName?: string;
  riderPhone?: string;
  rating?: number;
  ratingComment?: string;
  storeId?: string;
}

export async function placeOrderInFirestore(order: FirebaseOrder) {
  if (!isFirebaseSyncEnabled()) return 'mock-order-id';
  try {
    const colRef = collection(db, 'orders');
    const docRef = await addDoc(colRef, {
      ...order,
      orderDate: new Date().toISOString()
    });
    return docRef.id;
  } catch (err) {
    console.error('Error placing order in Firestore:', err);
    throw err;
  }
}

// Update order status in Firestore
export async function updateOrderStatusInFirestore(orderId: string, status: FirebaseOrder['status'], extraFields: Partial<FirebaseOrder> = {}) {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, stripUndefined({ 
      status,
      ...extraFields
    }));
  } catch (err) {
    console.error('Error updating order status in Firestore:', err);
    throw err;
  }
}

// Rate order in Firestore
export async function rateOrderInFirestore(orderId: string, rating: number, ratingComment: string = '') {
  if (!isFirebaseSyncEnabled()) return;
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, stripUndefined({
      rating,
      ratingComment
    }));
  } catch (err) {
    console.error('Error rating order in Firestore:', err);
    throw err;
  }
}

// Subscribe to real-time orders for administrative/rider portal
export function subscribeToOrders(callback: (orders: FirebaseOrder[]) => void) {
  if (!isFirebaseSyncEnabled()) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, 'orders');
  // Order by date descending or status
  const q = query(colRef, orderBy('orderDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: FirebaseOrder[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data() as FirebaseOrder, id: docSnap.id });
    });
    callback(list);
  }, (err) => {
    console.error('Error in order subscription:', err);
  });
}

// Subscribe to a specific customer's orders using phone number
export function subscribeToCustomerOrders(phone: string, callback: (orders: FirebaseOrder[]) => void) {
  if (!isFirebaseSyncEnabled()) {
    callback([]);
    return () => {};
  }
  const colRef = collection(db, 'orders');
  const q = query(colRef, where('customerPhone', '==', phone), orderBy('orderDate', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: FirebaseOrder[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data() as FirebaseOrder, id: docSnap.id });
    });
    callback(list);
  }, (err) => {
    console.error('Error in customer order subscription:', err);
  });
}

// Add a central broadcast notification to all stores
export async function addNotificationToFirestore(notification: Omit<AppNotification, 'id'>) {
  if (!isFirebaseSyncEnabled()) return 'mock-notif-id';
  const path = 'notifications';
  try {
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, stripUndefined(notification));
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

// Subscribe to real-time broadcast notifications
export function subscribeToNotifications(callback: (notifications: AppNotification[]) => void) {
  if (!isFirebaseSyncEnabled()) {
    callback([]);
    return () => {};
  }
  const path = 'notifications';
  const colRef = collection(db, path);
  const q = query(colRef, orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: AppNotification[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data() as any, id: docSnap.id });
    });
    callback(list);
  }, (err) => {
    console.error('Error in notifications subscription:', err);
  });
}
