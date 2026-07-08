import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  onSnapshot,
  getDocs,
  where
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';

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
    const docRef = await addDoc(colRef, {
      ...transfer,
      createdAt: new Date().toISOString()
    });
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
    const docRef = await addDoc(colRef, {
      ...waste,
      createdAt: new Date().toISOString()
    });
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
    const docRef = await addDoc(colRef, {
      ...msg,
      timestamp: new Date().toISOString()
    });
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
