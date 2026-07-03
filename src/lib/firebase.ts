import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  addDoc, 
  updateDoc, 
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

const firebaseConfig = {
  apiKey: "AIzaSyDduigOVfEXfZnoN_xSz1Shcl3fV1gY6CE",
  authDomain: "gen-lang-client-0451793681.firebaseapp.com",
  projectId: "gen-lang-client-0451793681",
  storageBucket: "gen-lang-client-0451793681.firebasestorage.app",
  messagingSenderId: "652127387633",
  appId: "1:652127387633:web:9d8f2b5fe4af076ba24e50"
};

// Initialize App
const app = initializeApp(firebaseConfig);

// Initialize Firestore with custom databaseId
const db = initializeFirestore(app, {}, "ai-studio-farmersgate-c2c65696-e9aa-4472-aeb0-8b98e4aa7877");

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

// Seed products if not already initialized
export async function seedProductsIfNeeded() {
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
}

// Fetch all products from Firestore
export async function getProductsFromFirestore() {
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
  try {
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, { stock: newStock });
  } catch (err) {
    console.error('Error updating stock in firestore:', err);
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
}

export async function placeOrderInFirestore(order: FirebaseOrder) {
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
  try {
    const docRef = doc(db, 'orders', orderId);
    await updateDoc(docRef, { 
      status,
      ...extraFields
    });
  } catch (err) {
    console.error('Error updating order status in Firestore:', err);
    throw err;
  }
}

// Subscribe to real-time orders for administrative/rider portal
export function subscribeToOrders(callback: (orders: FirebaseOrder[]) => void) {
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
