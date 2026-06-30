export interface Store {
  id: string;
  name: string;
  location: string;
  whatsappNumber: string;
  isActive: boolean;
  createdAt: string;
  password?: string;
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
  saleDate: string;
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
}

export interface AppNotification {
  id: string;
  type: 'low_stock' | 'requirement' | 'customer_order' | 'sale' | 'purchase_order';
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
  whatsappMessageTemplate: string;
  enableCustomerOrderReview: boolean;
  enableMultipleRegisters: boolean;
  quickDemoDataEnabled: boolean;
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




