import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  getDocs,
  where,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { MilkCustomer } from '../types';


// Helper to strip undefined values which Firestore doesn't support
export const stripUndefined = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(stripUndefined);
  return Object.keys(obj).reduce((acc: any, key) => {
    if (obj[key] !== undefined) acc[key] = stripUndefined(obj[key]);
    return acc;
  }, {});
};

// Interfaces
export interface StockTransfer {
  id?: string;
  challanId: string;
  senderStoreId: string;
  senderStoreName: string;
  receiverStoreId: string;
  receiverStoreName: string;
  itemName: string;
  quantity: number;
  approxValue: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  approvedAt?: string;
  receiveMessage?: string;
}

export interface StockWaste {
  id?: string;
  storeId: string;
  storeName: string;
  itemName: string;
  quantity: number;
  approxValue: number;
  reason: string;
  createdAt: string;
  photoUrl?: string;
}

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  receiverName?: string;
  chatId?: string; // e.g. "User A_User B" sorted
  message: string;
  timestamp: string;
  fileName?: string;
  fileType?: string;
  fileData?: string; // Base64 encoded file data
}

// 1. Stock Transfers
export async function sendStockTransfer(transfer: Omit<StockTransfer, 'id'>) {
  const path = 'transfers';
  try {
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, stripUndefined({
      ...transfer,
      createdAt: new Date().toISOString()
    }));
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function updateStockTransferStatus(
  transferId: string, 
  status: 'Approved' | 'Rejected', 
  receiveMessage?: string
) {
  const path = `transfers/${transferId}`;
  try {
    const docRef = doc(db, 'transfers', transferId);
    const updateData: Partial<StockTransfer> = {
      status,
      approvedAt: new Date().toISOString()
    };
    if (receiveMessage !== undefined) {
      updateData.receiveMessage = receiveMessage;
    }
    await updateDoc(docRef, updateData);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export function subscribeToTransfers(callback: (transfers: StockTransfer[]) => void) {
  const path = 'transfers';
  const colRef = collection(db, path);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const list: StockTransfer[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data() as StockTransfer, id: docSnap.id });
    });
    callback(list);
  }, (err) => {
    console.error('Error subscribing to transfers:', err);
  });
}

// 2. Stock Waste
export async function logStockWaste(waste: Omit<StockWaste, 'id'>) {
  const path = 'waste';
  try {
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, stripUndefined({
      ...waste,
      createdAt: new Date().toISOString()
    }));
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeToWaste(callback: (waste: StockWaste[]) => void) {
  const path = 'waste';
  const colRef = collection(db, path);
  const q = query(colRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const list: StockWaste[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data() as StockWaste, id: docSnap.id });
    });
    callback(list);
  }, (err) => {
    console.error('Error subscribing to waste logs:', err);
  });
}

// 3. Internal Chat Messages
export async function sendChatMessage(msg: Omit<ChatMessage, 'id'>) {
  const path = 'internal_chat';
  try {
    const colRef = collection(db, path);
    const docRef = await addDoc(colRef, stripUndefined({
      ...msg,
      timestamp: new Date().toISOString()
    }));
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeToChatMessages(callback: (messages: ChatMessage[]) => void) {
  const path = 'internal_chat';
  const colRef = collection(db, path);
  const q = query(colRef, orderBy('timestamp', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const list: ChatMessage[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data() as ChatMessage, id: docSnap.id });
    });
    callback(list);
  }, (err) => {
    console.error('Error subscribing to internal chat:', err);
  });
}

// 4. Real-time Milk Customer Sync helpers
export interface MilkDeletionRequest {
  id: string;
  userId: string;
  userName: string;
  userMobile: string;
  storeId: string;
  date: string;
}

export async function saveMilkDeletionRequest(req: MilkDeletionRequest) {
  const path = `milk_deletion_requests/${req.id}`;
  try {
    const docRef = doc(db, 'milk_deletion_requests', req.id);
    await setDoc(docRef, stripUndefined(req));
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteMilkDeletionRequest(reqId: string) {
  const path = `milk_deletion_requests/${reqId}`;
  try {
    const docRef = doc(db, 'milk_deletion_requests', reqId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeToMilkDeletionRequests(callback: (requests: MilkDeletionRequest[]) => void) {
  const path = 'milk_deletion_requests';
  const colRef = collection(db, path);
  
  return onSnapshot(colRef, (snapshot) => {
    const list: MilkDeletionRequest[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...docSnap.data() as MilkDeletionRequest, id: docSnap.id });
    });
    callback(list);
  }, (err) => {
    console.error('Error subscribing to milk deletion requests:', err);
  });
}

export async function saveMilkCustomerToDb(customer: MilkCustomer) {
  const path = `milk_customers/${customer.id}`;
  try {
    const docRef = doc(db, 'milk_customers', customer.id);
    
    const cleanCustomer = stripUndefined(customer);
    await setDoc(docRef, cleanCustomer);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteMilkCustomerFromDb(customerId: string) {
  const path = `milk_customers/${customerId}`;
  try {
    const docRef = doc(db, 'milk_customers', customerId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export function subscribeToMilkCustomers(callback: (customers: MilkCustomer[]) => void) {
  const path = 'milk_customers';
  const colRef = collection(db, path);
  
  return onSnapshot(colRef, (snapshot) => {
    const list: MilkCustomer[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({ ...data, id: docSnap.id } as MilkCustomer);
    });
    callback(list);
  }, (err) => {
    console.error('Error subscribing to milk customers:', err);
  });
}

