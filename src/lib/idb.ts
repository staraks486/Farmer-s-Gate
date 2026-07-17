export const DB_NAME = 'FGSyncDB';
export const STORE_OPS = 'unsynced_ops';
export const STORE_CREDS = 'credentials';

export function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_OPS)) {
        db.createObjectStore(STORE_OPS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CREDS)) {
        db.createObjectStore(STORE_CREDS, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveCreds(url: string, key: string) {
  const db = await openSyncDB();
  const tx = db.transaction(STORE_CREDS, 'readwrite');
  tx.objectStore(STORE_CREDS).put({ key: 'supabase_url', value: url });
  tx.objectStore(STORE_CREDS).put({ key: 'supabase_key', value: key });
  return new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
}

export async function idbAddOp(op: any) {
  const db = await openSyncDB();
  const tx = db.transaction(STORE_OPS, 'readwrite');
  tx.objectStore(STORE_OPS).put(op);
  return new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
}

export async function idbGetOps(): Promise<any[]> {
  const db = await openSyncDB();
  const tx = db.transaction(STORE_OPS, 'readonly');
  const request = tx.objectStore(STORE_OPS).getAll();
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result);
  });
}

export async function idbClearOps() {
  const db = await openSyncDB();
  const tx = db.transaction(STORE_OPS, 'readwrite');
  tx.objectStore(STORE_OPS).clear();
  return new Promise((resolve) => {
    tx.oncomplete = resolve;
  });
}
