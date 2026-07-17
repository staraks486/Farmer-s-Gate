import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshotsInSync,
  clearIndexedDbPersistence,
  disableNetwork,
  enableNetwork
} from 'firebase/firestore';
import { db, addToFirestore, stripUndefined, FirebaseOrder } from '../lib/firebase';
import { 
  Store, 
  InventoryItem, 
  Sale, 
  Purchase, 
  Requirement, 
  Supplier, 
  PurchaseOrder, 
  CustomerOrder, 
  MasterCrop, 
  StaffMember, 
  AttendanceRecord, 
  CompanyOfficial, 
  OfferPromo,
  MilkCustomer,
  AppNotification,
  CpanelSettings,
  StorefrontAd
} from '../types';

interface DataContextType {
  stores: Store[];
  inventory: InventoryItem[];
  sales: Sale[];
  purchases: Purchase[];
  requirements: Requirement[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  customerOrders: CustomerOrder[];
  orders: FirebaseOrder[];
  masterCrops: MasterCrop[];
  staff: StaffMember[];
  attendance: AttendanceRecord[];
  officials: CompanyOfficial[];
  promos: OfferPromo[];
  milkCustomers: MilkCustomer[];
  notifications: AppNotification[];
  products: any[];
  bills: any[];
  cpanelSettings: CpanelSettings | null;
  storefrontAds: StorefrontAd[];
  loading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [orders, setOrders] = useState<FirebaseOrder[]>([]);
  const [masterCrops, setMasterCrops] = useState<MasterCrop[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [officials, setOfficials] = useState<CompanyOfficial[]>([]);
  const [promos, setPromos] = useState<OfferPromo[]>([]);
  const [milkCustomers, setMilkCustomers] = useState<MilkCustomer[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [cpanelSettings, setCpanelSettings] = useState<CpanelSettings | null>(null);
  const [storefrontAds, setStorefrontAds] = useState<StorefrontAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    const initializeData = async () => {
      localStorage.setItem('fg_last_sync_timestamp', Date.now().toString());

      const unsubSync = onSnapshotsInSync(db, () => {
        localStorage.setItem('fg_last_sync_timestamp', Date.now().toString());
      });
      unsubscribes.push(unsubSync);

      // Set up real-time listeners for all core collections
      syncCollection<Store>('stores', setStores);
      syncCollection<InventoryItem>('inventory', setInventory);
      syncCollection<Sale>('sales', setSales, 'saleDate');
      syncCollection<Purchase>('purchases', setPurchases, 'purchaseDate');
      syncCollection<Requirement>('requirements', setRequirements, 'createdAt');
      syncCollection<Supplier>('suppliers', setSuppliers);
      syncCollection<PurchaseOrder>('purchase_orders', setPurchaseOrders, 'orderDate');
      syncCollection<CustomerOrder>('customer_orders', setCustomerOrders, 'orderDate');
      syncCollection<FirebaseOrder>('orders', setOrders, 'orderDate');
      syncCollection<MasterCrop>('master_crops', setMasterCrops);
      syncCollection<StaffMember>('staff', setStaff);
      syncCollection<AttendanceRecord>('attendance', setAttendance, 'date');
      syncCollection<CompanyOfficial>('officials', setOfficials);
      syncCollection<OfferPromo>('promos', setPromos);
      syncCollection<MilkCustomer>('milk_customers', setMilkCustomers);
      syncCollection<AppNotification>('notifications', setNotifications, 'timestamp');
      syncCollection<any>('products', setProducts);
      syncCollection<any>('bills', setBills, 'timestamp');
      syncCollection<StorefrontAd>('storefront_ads', setStorefrontAds);
      
      // Sync global settings
      syncDocument<CpanelSettings>('settings', 'global', setCpanelSettings, (data) => {
        if (data) {
          localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(data));
          
          // Cross-device License Synchronization!
          if ((data as any).licenseInfo) {
            const firestoreLicense = (data as any).licenseInfo;
            const localLicenseStr = localStorage.getItem('fg_license_info');
            if (JSON.stringify(firestoreLicense) !== localLicenseStr) {
              localStorage.setItem('fg_license_info', JSON.stringify(firestoreLicense));
              window.dispatchEvent(new Event('license-status-updated'));
            }
          } else if (localStorage.getItem('fg_license_info')) {
            // If licenseInfo was removed in Firestore (deactivated), remove it locally too!
            localStorage.removeItem('fg_license_info');
            window.dispatchEvent(new Event('license-status-updated'));
          }
        }
      });
    };

    const syncCollection = <T,>(
      collectionName: string, 
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      orderField?: string
    ) => {
      try {
        const colRef = collection(db, collectionName);
        const q = orderField ? query(colRef, orderBy(orderField, 'desc')) : colRef;
        
        const unsub = onSnapshot(q, (snapshot) => {
          const items: T[] = [];
          snapshot.forEach((doc) => {
            items.push({ id: doc.id, ...doc.data() } as T);
          });
          setter(items);
        }, (err) => {
          console.error(`Error syncing ${collectionName}:`, err);
          setError(`Sync error: ${collectionName}`);
          
          // Fallback to local storage
          const localKey = 'fg_' + collectionName;
          const localData = localStorage.getItem(localKey);
          if (localData) {
            try {
              setter(JSON.parse(localData));
            } catch(e) {}
          } else if (collectionName === 'stores') {
             // specific fallback for stores so at least one is visible
             const hq = {
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
             setter([hq]);
          }
        });
        
        unsubscribes.push(unsub);
      } catch (err) {
        console.error(`Critical setup error for ${collectionName}:`, err);
      }
    };

    const syncDocument = <T,>(
      collectionName: string,
      docId: string,
      setter: React.Dispatch<React.SetStateAction<T | null>>,
      onUpdate?: (data: T | null) => void
    ) => {
      try {
        const docRef = doc(db, collectionName, docId);
        const unsub = onSnapshot(docRef, (docSnap) => {
          const data = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
          setter(data);
          if (onUpdate) onUpdate(data);
        }, (err) => {
          console.error(`Error syncing doc ${collectionName}/${docId}:`, err);
        });
        unsubscribes.push(unsub);
      } catch (err) {
        console.error(`Critical setup error for doc ${collectionName}/${docId}:`, err);
      }
    };

    // Initial load check
    setLoading(true);

    initializeData().finally(() => {
      setLoading(false);
    });

    // Migration logic: Push local data to Firestore if Firestore is empty
    const migrateLocalData = async () => {
      const collectionsToMigrate = [
        { key: 'fg_stores', name: 'stores' },
        { key: 'fg_inventory', name: 'inventory' },
        { key: 'fg_sales', name: 'sales' },
        { key: 'fg_purchases', name: 'purchases' },
        { key: 'fg_requirements', name: 'requirements' },
        { key: 'fg_suppliers', name: 'suppliers' },
        { key: 'fg_purchase_orders', name: 'purchase_orders' },
        { key: 'fg_customer_orders', name: 'customer_orders' },
        { key: 'fg_master_crops', name: 'master_crops' },
        { key: 'fg_staff', name: 'staff' },
        { key: 'fg_attendance', name: 'attendance' },
        { key: 'fg_officials', name: 'officials' },
        { key: 'fg_offers', name: 'promos' },
        { key: 'fg_milk_customers', name: 'milk_customers' },
        { key: 'fg_bills', name: 'bills' }
      ];

      for (const { key, name } of collectionsToMigrate) {
        try {
          const localDataRaw = localStorage.getItem(key);
          if (!localDataRaw) continue;

          const localData = JSON.parse(localDataRaw);
          if (!Array.isArray(localData) || localData.length === 0) continue;

          // Check if firestore collection has any data
          const colRef = collection(db, name);
          const snapshot = await getDocs(query(colRef, limit(1)));
          
          if (snapshot.empty) {
            console.log(`Migrating ${localData.length} items from ${key} to Firestore ${name}...`);
            // Collection is empty in cloud, push all local data
            for (const item of localData) {
              await addToFirestore(name, item);
            }
          }
        } catch (err) {
          console.error(`Migration failed for ${name}:`, err);
        }
      }
    };

    migrateLocalData();

    // Simulate loading completion after a short delay to allow first snapshots
    const timer = setTimeout(() => setLoading(false), 2000);

    return () => {
      unsubscribes.forEach(unsub => unsub());
      clearTimeout(timer);
    };
  }, []);

  const value = {
    stores,
    inventory,
    sales,
    purchases,
    requirements,
    suppliers,
    purchaseOrders,
    customerOrders,
    orders,
    masterCrops,
    staff,
    attendance,
    officials,
    promos,
    milkCustomers,
    notifications,
    products,
    bills,
    cpanelSettings,
    storefrontAds,
    loading,
    error
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};
