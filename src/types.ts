export interface FuelLog {
  id: string;
  vehicleId: string;
  fuelIntake: number; // liters
  cost: number;
  date: string; // YYYY-MM-DD
  odometer: number; // current mileage
}

export interface Store {
  id: string;
  name: string;
  storeCode?: string;
  location: string;
  whatsappNumber: string;
  isActive: boolean;
  createdAt: string;
  password?: string;
  lat?: number;
  lng?: number;
  googleMapsUrl?: string;
  version?: number;
}

export interface Sale {
  id: string;
  storeId: string;
  vegetableName: string;
  quantity: number; // in kg or unit
  unit?: 'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag';
  pricePerKg: number;
  totalPrice: number;
  customerName?: string;
  salespersonName?: string;
  saleDate: string;
  paymentMode?: 'Cash' | 'Card' | 'UPI';
  billId?: string;
  status?: 'Active' | 'Cancelled';
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Manager' | 'Staff' | 'Cashier' | 'Salesperson';
  phone: string;
  assignedStoreId: string; // The store they are currently assigned/sifted to
  isActive: boolean;
  createdAt: string;
}

export interface AttendancePunch {
  id: string;
  type: 'In' | 'Out';
  time: string; // HH:MM
  timestamp: string; // ISO string
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  staffRole: string;
  storeId: string; // The store they are present on
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Leave' | 'Absent';
  timeIn?: string; // HH:MM
  timeOut?: string; // HH:MM
  lastUpdated: string;
  punches?: AttendancePunch[];
}

export interface Purchase {
  id: string;
  storeId: string;
  vegetableName: string;
  quantity: number; // in kg
  costPerKg: number;
  totalCost: number;
  supplierName?: string;
  purchaseDate: string;
}

export interface InventoryItem {
  id: string;
  storeId: string;
  vegetableName: string;
  quantity: number; // in kg (current stock level)
  minStockThreshold: number; // for low stock alerts (default e.g. 15kg)
  costPrice: number; // last cost price
  sellingPrice: number; // current selling price
  lastUpdated: string;
}

export interface Requirement {
  id: string;
  storeId: string;
  vegetableName: string;
  quantity: number; // in kg
  status: 'Pending' | 'Ordered' | 'Fulfilled';
  priority: 'Low' | 'Medium' | 'High';
  notes?: string;
  createdAt: string;
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConnected: boolean;
}

export interface ConsolidatedRequirement {
  vegetableName: string;
  totalQuantity: number;
  storesBreakdown: {
    storeName: string;
    quantity: number;
    status: 'Pending' | 'Ordered' | 'Fulfilled';
    requirementId: string;
    storeId?: string;
  }[];
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone: string;
  email: string;
  address?: string;
  paymentTerms: string;
  isActive: boolean;
  createdAt: string;
}

export interface PurchaseOrderItem {
  vegetableName: string;
  quantity: number;
  costPerKg: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  storeId: string;
  orderDate: string;
  items: PurchaseOrderItem[];
  status: 'Draft' | 'Sent' | 'Delivered' | 'Cancelled';
  paymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid';
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  createdAt: string;
}

export interface CustomerOrderItem {
  vegetableName: string;
  quantity: number;
  pricePerKg: number;
  totalPrice: number;
}

export interface CustomerOrder {
  id: string;
  orderNumber: string;
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: CustomerOrderItem[];
  totalAmount: number;
  status: 'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Cancelled';
  paymentStatus: 'Unpaid' | 'Paid';
  orderDate: string;
  notes?: string;
}

export type UserRole = 'Admin' | 'Store Manager' | 'Employee';

export interface AccountEntry {
  id: string;
  storeId?: string;
  type: 'Revenue' | 'Expense';
  category: 'Sales' | 'Purchase' | 'Rent' | 'Electricity' | 'Wages' | 'Other Expense' | 'Other Revenue';
  amount: number;
  description: string;
  entryDate: string;
}

export interface MasterCrop {
  id: string;
  vegetableName: string;
  costPrice: number;
  sellingPrice: number;
  category: 'Vegetable' | 'Fruit' | 'Herbs' | 'Grocery' | 'Other';
  minStockThreshold: number;
  unit?: 'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag';
}

export interface AppNotification {
  id: string;
  type: 'low_stock' | 'requirement' | 'customer_order' | 'sale' | 'purchase_order' | 'new_product';
  title: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  linkToView?: 'store' | 'headoffice' | 'customer-hub' | 'suppliers' | 'dashboard';
  meta?: {
    storeId?: string;
  };
}

export interface TerminalActivityLog {
  id: string;
  timestamp: string;
  action: 'login' | 'logout';
  terminalId: string;
  terminalName: string;
  role: string;
}

export interface CpanelSettings {
  currencySymbol: string;
  defaultTaxRate: number; // e.g., 0, 5, 12, 18 percent
  allowNegativeStockCheckout: boolean;
  autoReorderThresholdPercent: number; // percentage threshold to auto-reorder from HQ
  alertSoundEnabled: boolean;
  audioNotificationEnabled: boolean;
  whatsappMessageTemplate: string;
  enableCustomerOrderReview: boolean;
  enableMultipleRegisters: boolean;
  quickDemoDataEnabled: boolean;
  disableLoadingIntro?: boolean;
  introSpeedSeconds?: number;
  enableLocalAccessRestriction?: boolean;
  allowedLocalRadiusKm?: number;
  simulatedLocalOnly?: boolean;
  headOfficeName?: string;
  headOfficeLocation?: string;
  headOfficeLat?: number;
  headOfficeLng?: number;
  activeCity?: string;
  companyLogo?: string;
  maintenanceModeEnabled?: boolean;
  maintenanceAnnouncementText?: string;
  enablePromoCodeCart?: boolean;
  minimumOrderValue?: number;
  loyaltyPointsPercentage?: number;
  enableDigitalInvoicingOnly?: boolean;
  enableFirebaseSync?: boolean;
  appName?: string;
  customerModuleName?: string;
  partnerModuleName?: string;
  managementModuleName?: string;
  ledgerModuleName?: string;
  supplyChainModuleName?: string;
  storePosModuleName?: string;
  enableDataChangeAuth?: boolean;
  dataChangeAuthPin?: string;
}

export interface StorefrontAd {
  id: string;
  title: string;
  subtitle: string;
  discountBadge?: string;
  imageUrl?: string;
  isActive: boolean;
  tagline?: string;
  actionText?: string;
}

export interface CompanyOfficial {
  id: string;
  name: string;
  designation: string;
  mobileNumber: string;
  createdAt: string;
}

export interface OfferPromo {
  id: string;
  title: string;
  code: string;
  type: 'percentage' | 'flat';
  value: number;
  minOrderAmount: number;
  isActive: boolean;
  description: string;
  createdAt: string;
}

export interface AppUserRole {
  role: 'admin' | 'supply_office' | 'ledger' | 'supply_chain' | 'store_pos' | 'staff' | 'customer';
  label: string;
  allowedPortals: ('customer' | 'partner' | 'management' | 'transport')[];
  allowedTabs?: ('dashboard' | 'headoffice' | 'store' | 'suppliers' | 'accounts' | 'staff' | 'admin' | 'customers' | 'customer-directory' | 'transport')[];
}

export function getUserRole(email: string | null | undefined): AppUserRole {
  if (!email) {
    return {
      role: 'customer',
      label: 'Shopper',
      allowedPortals: ['customer']
    };
  }
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail === 'admin@farmersgate.com' || cleanEmail === 'star.aks486@gmail.com' || cleanEmail === 'system_admin@farmersgate.com') {
    return {
      role: 'admin',
      label: 'HQ System Admin',
      allowedPortals: ['customer', 'partner', 'management', 'transport'],
      allowedTabs: ['dashboard', 'headoffice', 'store', 'suppliers', 'accounts', 'staff', 'admin', 'transport']
    };
  }
  if (cleanEmail === 'supply_office@farmersgate.com') {
    return {
      role: 'supply_office',
      label: 'Supply Office Executive',
      allowedPortals: ['management', 'transport'],
      allowedTabs: ['headoffice', 'transport']
    };
  }
  if (cleanEmail === 'ledger@farmersgate.com') {
    return {
      role: 'ledger',
      label: 'Double Entry Accountant',
      allowedPortals: ['management'],
      allowedTabs: ['accounts']
    };
  }
  if (cleanEmail === 'supply_chain@farmersgate.com') {
    return {
      role: 'supply_chain',
      label: 'Supply Chain Coordinator',
      allowedPortals: ['management'],
      allowedTabs: ['suppliers']
    };
  }
  if (cleanEmail === 'store_pos@farmersgate.com') {
    return {
      role: 'store_pos',
      label: 'Store POS Cashier',
      allowedPortals: ['management'],
      allowedTabs: ['store']
    };
  }
  if (cleanEmail === 'partner@farmersgate.com' || cleanEmail === 'staff@farmersgate.com') {
    return {
      role: 'staff',
      label: 'Fulfillment & Field Rider',
      allowedPortals: ['partner']
    };
  }
  
  // Default to standard customer/shopper
  return {
    role: 'customer',
    label: 'Shopper',
    allowedPortals: ['customer']
  };
}

export interface MilkCustomer {
  id: string;
  name: string;
  mobile: string;
  address: string;
  milkType: 'Cow' | 'Buffalo' | 'Both';
  quantity: number; // fallback or combined total
  price: number; // fallback or combined average
  cowQuantity?: number;
  cowPrice?: number;
  buffaloQuantity?: number;
  buffaloPrice?: number;
  createdAt: string;
  takenDaily?: boolean;
  storeId?: string;
  milkTakenLogs?: {
    quantity?: number; // fallback
    date: string;
    cowQuantityTaken: number;
    buffaloQuantityTaken: number;
    cowPrice: number;
    buffaloPrice: number;
    totalAmount: number;
    billId?: string;
    isCancelled?: boolean;
  }[];
}


