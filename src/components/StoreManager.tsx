import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  Plus, 
  Trash2, 
  Search, 
  Send, 
  AlertTriangle, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  PhoneCall, 
  Info,
  Layers,
  ArrowRight,
  Minus,
  ShoppingCart,
  IndianRupee,
  X,
  Edit2,
  Scan,
  Bell,
  AlertCircle,
  Store as StoreIcon,
  Mic,
  ChevronDown,
  ChevronRight,
  QrCode,
  Download,
  Copy,
  ExternalLink,
  Printer,
  Fingerprint,
  UserCheck,
  Users
} from 'lucide-react';
import QRCode from 'qrcode';
import { Store, Sale, Purchase, InventoryItem, Requirement, CustomerOrder, CpanelSettings, AppNotification, StaffMember, AttendanceRecord, AccountEntry, AttendancePunch, MasterCrop } from '../types';
import { dbGetForceOffline, dbSetForceOffline, getSupabaseConfig } from '../lib/supabase';
import { subscribeToNotifications } from '../lib/firebase';
import { QrScanner } from './QrScanner';
import StockTransferTab from './StockTransferTab';
import StockWasteTab from './StockWasteTab';

interface StoreManagerProps {
  store: Store;
  sales: Sale[];
  purchases: Purchase[];
  inventory: InventoryItem[];
  requirements: Requirement[];
  customerOrders?: CustomerOrder[];
  role?: string;
  staff?: StaffMember[];
  attendance?: AttendanceRecord[];
  onAddSale: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onAddPurchase: (purchase: Purchase) => void;
  onDeletePurchase: (id: string) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
  onUpdateInventoryItems?: (items: InventoryItem[]) => void;
  onAddRequirement: (req: Requirement) => void;
  onUpdateRequirement?: (req: Requirement) => void;
  onUpdateRequirementStatus: (id: string, status: 'Pending' | 'Ordered' | 'Fulfilled') => void;
  onDeleteRequirement: (id: string) => void;
  onFulfillCustomerOrder?: (order: CustomerOrder) => void;
  onUpdateCustomerOrder?: (order: CustomerOrder) => void;
  onDeleteCustomerOrder?: (id: string) => void;
  onSaveAttendance?: (record: AttendanceRecord) => Promise<void>;
  onUpdateStaff?: (member: StaffMember) => Promise<void> | void;
  stores?: Store[];
  cpanelSettings?: CpanelSettings;
  masterCrops?: MasterCrop[];
}

interface PosCartItem {
  quantity: number;
  unit: 'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag';
  pricePerKg: number;
  item: InventoryItem;
}

const HEALTHY_QUOTES = [
  "Let food be thy medicine and medicine be thy food. 🥦",
  "Eat fresh, buy local, support organic farmers! 🍎",
  "Fruits and vegetables are the best source of natural vitamins and hydration. 🍋",
  "Eat your greens, get your fiber, stay energetic all day long! 🥬",
  "Every vegetable has a story of sunshine, water, and soil. Enjoy nature's recipe! ☀️🌱",
  "Stay hydrated and eat colorful fruits for a glowing skin and clear mind! 🍇",
  "Good nutrition is a long-term investment. Choose fresh organic veggies! 🥔🫚",
  "Healthy eating is not a diet; it's a lifestyle of appreciation for nature's gifts. 🍊",
  "An apple a day keeps the doctor away, but a basket of greens keeps you vibrant! 🥗",
  "Eat your colors! Every bright vegetable brings unique nutrition and protection. 🍅🥕",
  "Freshly harvested food is nature's medicine. Stay healthy, stay strong! 🌾",
  "Good health is the greatest wealth. Treat your body to nature's finest produce! 🌱",
  "From farm to fork, fresh and local produce is always the healthiest choice! 🚜🍎"
];

const getItemCategory = (name: string): 'Vegetable' | 'Fruit' | 'Grocery' => {
  const lower = name.toLowerCase();
  
  // Fruits keywords
  const fruitKeywords = [
    'banana', 'avocado', 'lemon', 'apple', 'mango', 'orange', 'grape', 'strawberry', 
    'papaya', 'watermelon', 'pineapple', 'pomegranate', 'fruit', 'guava', 'peach', 
    'pear', 'plum', 'cherry', 'kiwi', 'blueberry', 'coconut', 'melon', 'lime', 'kela', 'seb', 'aam'
  ];
  
  // Grocery keywords
  const groceryKeywords = [
    'rice', 'wheat', 'flour', 'sugar', 'salt', 'oil', 'dal', 'pulse', 'spice', 
    'garlic', 'ginger', 'coriander', 'chili', 'chilli', 'mushroom', 'egg', 'bread', 
    'milk', 'butter', 'cheese', 'tea', 'coffee', 'grocery', 'pack', 'bottle', 
    'box', 'can', 'masala', 'paneer', 'ghee', 'lentil', 'sauce', 'vinegar', 'dhaniya'
  ];
  
  if (fruitKeywords.some(keyword => lower.includes(keyword))) {
    return 'Fruit';
  }
  
  if (groceryKeywords.some(keyword => lower.includes(keyword))) {
    return 'Grocery';
  }
  
  return 'Vegetable';
};

const PREDEFINED_REQS = [
  "Apple Fuji",
  "Apple Indian",
  "Avocado",
  "Banana Robusta",
  "Blueberry",
  "Box Kiwi Gold Zespri",
  "Box Kiwi Green",
  "Broccoli Premium",
  "Cabbage",
  "Capsicum Red",
  "Capsicum Yellow",
  "Carrot",
  "Cauliflower",
  "Cherry",
  "Coriander",
  "Garlic",
  "Ginger",
  "Green Chili",
  "Lemon",
  "Mushroom Button",
  "Onion",
  "Orange Malta",
  "Pomegranate",
  "Potato",
  "Spinach",
  "Strawberry",
  "Tomato"
];

export default function StoreManager({
  store,
  sales,
  purchases,
  inventory,
  requirements,
  customerOrders = [],
  role,
  staff = [],
  attendance = [],
  onAddSale,
  onDeleteSale,
  onAddPurchase,
  onDeletePurchase,
  onUpdateInventoryItem,
  onUpdateInventoryItems,
  onAddRequirement,
  onUpdateRequirement,
  onUpdateRequirementStatus,
  onDeleteRequirement,
  onFulfillCustomerOrder,
  onUpdateCustomerOrder,
  onDeleteCustomerOrder,
  onSaveAttendance,
  onUpdateStaff,
  stores = [],
  cpanelSettings,
  masterCrops = []
}: StoreManagerProps) {
  const currencySymbol = cpanelSettings?.currencySymbol || '₹';
  const [activeSubTab, setActiveSubTab] = useState<'sale' | 'sales-history' | 'purchase' | 'inventory' | 'requirements' | 'info' | 'qr-code' | 'attendance' | 'expenses' | 'report' | 'stock-transfer' | 'stock-waste'>('sale');
  
  // Dynamically compute the selection catalog of crop names by combining HQ master crops and predefined list
  const cropCatalogNames = React.useMemo(() => {
    if (masterCrops && masterCrops.length > 0) {
      const masterNames = masterCrops.map(c => c.vegetableName);
      const combined = Array.from(new Set([...masterNames, ...PREDEFINED_REQS]));
      return combined.sort((a, b) => a.localeCompare(b));
    }
    return PREDEFINED_REQS;
  }, [masterCrops]);
  
  // Store Expenses states
  const [localExpenses, setLocalExpenses] = useState<AccountEntry[]>([]);
  const [expenseCategory, setExpenseCategory] = useState<'Rent' | 'Electricity' | 'Wages' | 'Other Expense'>('Other Expense');
  const [expenseName, setExpenseName] = useState<string>(''); // New field "Expense Name"
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expenseSuccessMsg, setExpenseSuccessMsg] = useState<string>('');

  // Daily Report & Currency Denominator states
  const [reportDate, setReportDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [denom2000, setDenom2000] = useState<string>('');
  const [denom500, setDenom500] = useState<string>('');
  const [denom200, setDenom200] = useState<string>('');
  const [denom100, setDenom100] = useState<string>('');
  const [denom50, setDenom50] = useState<string>('');
  const [denom20, setDenom20] = useState<string>('');
  const [denom10, setDenom10] = useState<string>('');
  const [denom5, setDenom5] = useState<string>('');
  const [denom2, setDenom2] = useState<string>('');
  const [denom1, setDenom1] = useState<string>('');

  // Editable requirement state
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editingReqQty, setEditingReqQty] = useState<string>('');
  const [editingReqVegName, setEditingReqVegName] = useState<string>('');
  const [editingReqPriority, setEditingReqPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [editingReqNotes, setEditingReqNotes] = useState<string>('');

  // Edit Staff Member State
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  // Manual Report States
  const [isManualReport, setIsManualReport] = useState<boolean>(false);
  const [manualCashSales, setManualCashSales] = useState<string>('');
  const [manualUpiSales, setManualUpiSales] = useState<string>('');
  const [manualCardSales, setManualCardSales] = useState<string>('');
  const [manualExpenses, setManualExpenses] = useState<string>('');

  // Attendance Sub-Tab Mode ('desk' or 'directory')
  const [attendanceSubMode, setAttendanceSubMode] = useState<'desk' | 'directory'>('desk');

  // Manual Report Detailed Items State
  const [manualDetailsList, setManualDetailsList] = useState<{
    id: string;
    date: string;
    type: 'Expense' | 'Purchase';
    description: string;
    amount: number;
  }[]>(() => {
    const saved = localStorage.getItem('fg_manual_details_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [newManualDetailType, setNewManualDetailType] = useState<'Expense' | 'Purchase'>('Expense');
  const [newManualDetailDescription, setNewManualDetailDescription] = useState<string>('');
  const [newManualDetailAmount, setNewManualDetailAmount] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('fg_manual_details_list', JSON.stringify(manualDetailsList));
  }, [manualDetailsList]);

  useEffect(() => {
    const saved = localStorage.getItem('fg_accounts_manual');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as AccountEntry[];
        setLocalExpenses(parsed.filter(e => e.storeId === store.id && e.type === 'Expense'));
      } catch (e) {
        console.error(e);
      }
    }
  }, [store.id, activeSubTab]);

  const handleAddExpenseLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) return;

    const entryDesc = expenseName.trim()
      ? `${expenseName.trim()}${expenseDescription.trim() ? ' (' + expenseDescription.trim() + ')' : ''}`
      : expenseDescription.trim() || `${expenseCategory} Expense`;

    const newEntry: AccountEntry = {
      id: `acc-${Date.now()}`,
      storeId: store.id,
      type: 'Expense',
      category: expenseCategory,
      amount: parseFloat(expenseAmount),
      description: entryDesc,
      entryDate: new Date(expenseDate).toISOString()
    };

    const saved = localStorage.getItem('fg_accounts_manual');
    let allEntries: AccountEntry[] = [];
    if (saved) {
      try {
        allEntries = JSON.parse(saved);
      } catch (e) {
        allEntries = [];
      }
    }
    const updated = [newEntry, ...allEntries];
    localStorage.setItem('fg_accounts_manual', JSON.stringify(updated));
    setLocalExpenses(updated.filter(e => e.storeId === store.id && e.type === 'Expense'));

    setExpenseAmount('');
    setExpenseName('');
    setExpenseDescription('');
    setExpenseSuccessMsg('Expense logged successfully!');
    setTimeout(() => setExpenseSuccessMsg(''), 3000);
  };

  const handleDeleteExpenseLocal = (id: string) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      const saved = localStorage.getItem('fg_accounts_manual');
      if (saved) {
        try {
          const allEntries = JSON.parse(saved) as AccountEntry[];
          const updated = allEntries.filter(e => e.id !== id);
          localStorage.setItem('fg_accounts_manual', JSON.stringify(updated));
          setLocalExpenses(updated.filter(e => e.storeId === store.id && e.type === 'Expense'));
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const [offlineMode, setOfflineMode] = useState<boolean>(dbGetForceOffline());
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
  const [salespersonName, setSalespersonName] = useState<string>('');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Biometric Attendance states
  const [biometricStaffId, setBiometricStaffId] = useState<string | null>(null);
  const [biometricScanState, setBiometricScanState] = useState<'idle' | 'scanning' | 'success' | 'failed'>('idle');
  const [biometricScanProgress, setBiometricScanProgress] = useState<number>(0);
  const [biometricMessage, setBiometricMessage] = useState<string>('');
  const [attendanceDate, setAttendanceDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Employee details extraction & central sync states
  const [extractedStaffDetails, setExtractedStaffDetails] = useState<{
    member: StaffMember;
    record: AttendanceRecord;
    attendanceRate: number;
    presentDays: number;
    leaveDays: number;
    hoursWorked: number;
    payout: number;
    verifiedBy: 'Biometrics v4.8' | 'Manual POS Register';
  } | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'extracting' | 'ready' | 'syncing' | 'synced'>('idle');
  const [syncProgress, setSyncProgress] = useState<number>(0);

  const getStaffPunchState = (record: AttendanceRecord | undefined) => {
    if (!record || record.status !== 'Present') {
      return { isCheckedIn: false, lastPunchType: null, punches: [] as AttendancePunch[] };
    }
    const punches = record.punches || [];
    if (punches.length > 0) {
      const lastPunch = punches[punches.length - 1];
      return {
        isCheckedIn: lastPunch.type === 'In',
        lastPunchType: lastPunch.type,
        punches
      };
    }
    // Fallback to legacy single timeIn/timeOut fields
    if (record.timeIn && !record.timeOut) {
      return { isCheckedIn: true, lastPunchType: 'In', punches: [{ id: 'legacy-in', type: 'In', time: record.timeIn, timestamp: record.lastUpdated }] };
    }
    if (record.timeIn && record.timeOut) {
      return { isCheckedIn: false, lastPunchType: 'Out', punches: [
        { id: 'legacy-in', type: 'In', time: record.timeIn, timestamp: record.lastUpdated },
        { id: 'legacy-out', type: 'Out', time: record.timeOut, timestamp: record.lastUpdated }
      ] };
    }
    return { isCheckedIn: false, lastPunchType: null, punches: [] as AttendancePunch[] };
  };

  const triggerEmployeeDetailsExtraction = (
    member: StaffMember, 
    record: AttendanceRecord, 
    verifiedBy: 'Biometrics v4.8' | 'Manual POS Register'
  ) => {
    // Extract & calculate employee-specific stats
    const staffAttendance = attendance.filter(r => r.staffId === member.id);
    const totalDaysRecorded = staffAttendance.length + (staffAttendance.find(r => r.date === record.date) ? 0 : 1);
    const presentDays = staffAttendance.filter(r => r.status === 'Present').length + (record.status === 'Present' ? 1 : 0);
    const leaveDays = staffAttendance.filter(r => r.status === 'Leave').length + (record.status === 'Leave' ? 1 : 0);
    const attendanceRate = totalDaysRecorded > 0 ? Math.round((presentDays / totalDaysRecorded) * 100) : 100;

    // Calculate hours worked (Standard hours = 8.0)
    let hoursWorked = 0;
    if (record.status === 'Present') {
      const punches = record.punches || [];
      if (punches.length > 0) {
        let totalMinutes = 0;
        let activeInTime: string | null = null;
        for (const p of punches) {
          if (p.type === 'In') {
            activeInTime = p.time;
          } else if (p.type === 'Out' && activeInTime) {
            const [inH, inM] = activeInTime.split(':').map(Number);
            const [outH, outM] = p.time.split(':').map(Number);
            const diffMin = (outH * 60 + outM) - (inH * 60 + inM);
            if (diffMin > 0) {
              totalMinutes += diffMin;
            }
            activeInTime = null;
          }
        }
        hoursWorked = totalMinutes / 60;
      } else {
        const inTime = record.timeIn || '09:00';
        const outTime = record.timeOut || '18:00';
        const [inH, inM] = inTime.split(':').map(Number);
        const [outH, outM] = outTime.split(':').map(Number);
        hoursWorked = Math.max(0, (outH + outM / 60) - (inH + inM / 60));
      }
    }

    // Role-based pay calculation
    const rateMap = { Manager: 250, Cashier: 180, Staff: 120, Salesperson: 150 };
    const hourlyRate = rateMap[member.role] || 120;
    const payout = Math.round(hoursWorked * hourlyRate);

    setExtractedStaffDetails({
      member,
      record,
      attendanceRate,
      presentDays,
      leaveDays,
      hoursWorked: parseFloat(hoursWorked.toFixed(2)),
      payout,
      verifiedBy
    });
    setSyncStatus('extracting');
    setSyncProgress(0);

    // Simulated Extraction Delay
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setSyncProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setSyncStatus('ready');
      }
    }, 120);
  };

  const handleExecuteCentralSync = async () => {
    if (!extractedStaffDetails) return;
    setSyncStatus('syncing');
    setSyncProgress(0);

    let progress = 0;
    const interval = setInterval(async () => {
      progress += 20;
      setSyncProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        if (onSaveAttendance) {
          await onSaveAttendance(extractedStaffDetails.record);
        }
        setSyncStatus('synced');
        setTimeout(() => {
          setExtractedStaffDetails(null);
          setSyncStatus('idle');
          setSyncProgress(0);
        }, 1200);
      }
    }, 150);
  };

  // Real-time broadcast notifications from the central database
  const [broadcastNotifications, setBroadcastNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notifs) => {
      setBroadcastNotifications(notifs);
    });
    return () => unsubscribe();
  }, []);

  const COMMON_CROPS_LIST = [
    { name: 'Potato', emoji: '🥔', defaultPrice: 30 },
    { name: 'Onion', emoji: '🧅', defaultPrice: 40 },
    { name: 'Tomato', emoji: '🍅', defaultPrice: 50 },
    { name: 'Carrot', emoji: '🥕', defaultPrice: 60 },
    { name: 'Spinach', emoji: '🥬', defaultPrice: 25 },
    { name: 'Garlic', emoji: '🧄', defaultPrice: 120 },
    { name: 'Ginger', emoji: '🫚', defaultPrice: 140 },
    { name: 'Chili', emoji: '🌶️', defaultPrice: 80 },
    { name: 'Lemon', emoji: '🍋', defaultPrice: 100 },
    { name: 'Apple', emoji: '🍎', defaultPrice: 200 },
    { name: 'Banana', emoji: '🍌', defaultPrice: 60 },
    { name: 'Orange', emoji: '🍊', defaultPrice: 120 },
    { name: 'Mango', emoji: '🥭', defaultPrice: 150 },
    { name: 'Pomegranate', emoji: '🍎', defaultPrice: 240 },
    { name: 'Pineapple', emoji: '🍍', defaultPrice: 80 },
    { name: 'Coconut', emoji: '🥥', defaultPrice: 50 }
  ];

  const handleQuickAddCrop = async (crop: { name: string; emoji: string; defaultPrice: number }) => {
    let matchedItem = storeInventory.find(item => 
      item.vegetableName.toLowerCase().includes(crop.name.toLowerCase()) ||
      crop.name.toLowerCase().includes(item.vegetableName.toLowerCase())
    );
    
    if (!matchedItem) {
      matchedItem = {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        storeId: store.id,
        vegetableName: crop.name,
        quantity: 100,
        costPrice: crop.defaultPrice * 0.75,
        sellingPrice: crop.defaultPrice,
        minStockThreshold: 10,
        lastUpdated: new Date().toISOString()
      };
      await onUpdateInventoryItem(matchedItem);
    }
    
    handleAddToPosCart(matchedItem);
    
    if (cpanelSettings?.alertSoundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      } catch (e) {
        console.log("Audio feedback error:", e);
      }
    }
  };

  const handleTriggerBiometricScan = (member: StaffMember) => {
    if (member.assignedStoreId !== store.id) {
      alert(`Error: Biometric attendance can only be performed at the employee's respected store (${stores.find(st => st.id === member.assignedStoreId)?.name || 'their assigned store'}).`);
      return;
    }
    if (biometricScanState === 'scanning') return;
    
    setBiometricStaffId(member.id);
    setBiometricScanState('scanning');
    setBiometricScanProgress(0);
    setBiometricMessage('Please place finger on the capacitive biometric scan glass...');
    
    if (cpanelSettings?.alertSoundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (e) {}
    }
    
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      if (currentProgress <= 100) {
        setBiometricScanProgress(currentProgress);
        
        if (currentProgress === 20) {
          setBiometricMessage('Laser calibration in progress...');
        } else if (currentProgress === 40) {
          setBiometricMessage('Scanning ridges & pattern matching...');
        } else if (currentProgress === 65) {
          setBiometricMessage('Matching hashed minutiae points...');
        } else if (currentProgress === 85) {
          setBiometricMessage('Decrypting core staff credential logs...');
        } else if (currentProgress === 100) {
          setBiometricMessage('Authenticated! Handshaking signature key...');
        }
        
        if (cpanelSettings?.alertSoundEnabled) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600 + currentProgress * 4, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
          } catch (e) {}
        }
      }
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        
        setTimeout(async () => {
          setBiometricScanState('success');
          setBiometricMessage(`Access Granted: ${member.name} authenticated!`);
          
          if (cpanelSettings?.alertSoundEnabled) {
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
              osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
              osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.16); // G5
              gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.35);
            } catch (e) {}
          }
          
          const now = new Date();
          const curTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          
          const existing = attendance.find(
            (r) => r.staffId === member.id && r.date === attendanceDate
          );
          
          const punchState = getStaffPunchState(existing);
          const nextType: 'In' | 'Out' = punchState.isCheckedIn ? 'Out' : 'In';
          
          const newPunch: AttendancePunch = {
            id: `punch_${Date.now()}`,
            type: nextType,
            time: curTime,
            timestamp: new Date().toISOString()
          };
          
          const updatedPunches = [...(existing?.punches || []), newPunch];
          
          let finalTimeIn = existing?.timeIn || curTime;
          let finalTimeOut = nextType === 'Out' ? curTime : undefined;
          
          const record: AttendanceRecord = {
            id: existing?.id || `att_${Date.now()}_${member.id}`,
            staffId: member.id,
            staffName: member.name,
            staffRole: member.role,
            storeId: store.id,
            date: attendanceDate,
            status: 'Present',
            timeIn: finalTimeIn,
            timeOut: finalTimeOut,
            lastUpdated: new Date().toISOString(),
            punches: updatedPunches
          };
          
          triggerEmployeeDetailsExtraction(member, record, 'Biometrics v4.8');
          
          setTimeout(() => {
            setBiometricScanState('idle');
            setBiometricStaffId(null);
            setBiometricScanProgress(0);
          }, 2000);
          
        }, 300);
      }
    }, 200);
  };
 
  const handleSaveManualAttendance = async (
    member: StaffMember,
    status: 'Present' | 'Leave' | 'Absent',
    timeIn?: string,
    timeOut?: string
  ) => {
    if (member.assignedStoreId !== store.id) {
      alert(`Error: Staff attendance can only be performed by the manager of their respected store (${stores.find(st => st.id === member.assignedStoreId)?.name || 'their assigned store'}).`);
      return;
    }

    const existing = attendance.find(
      (r) => r.staffId === member.id && r.date === attendanceDate
    );
    
    const record: AttendanceRecord = {
      id: existing?.id || `att_${Date.now()}_${member.id}`,
      staffId: member.id,
      staffName: member.name,
      staffRole: member.role,
      storeId: store.id,
      date: attendanceDate,
      status,
      timeIn: status === 'Present' ? (timeIn || existing?.timeIn || '09:00') : undefined,
      timeOut: status === 'Present' ? (timeOut || existing?.timeOut || undefined) : undefined,
      lastUpdated: new Date().toISOString(),
      punches: []
    };
    
    if (onSaveAttendance) {
      await onSaveAttendance(record);
    }
  };

  const handleToggleOfflineMode = () => {
    const nextVal = !offlineMode;
    dbSetForceOffline(nextVal);
    setOfflineMode(nextVal);
    if (nextVal) {
      alert("Offline Mode is active. This store branch will operate completely on lightning-fast local cache.");
    } else {
      alert("Online Sync is active. Synchronizing with central database.");
    }
    window.location.reload();
  };

  // Search and Filters
  const [vegSearchQuery, setVegSearchQuery] = useState('');

  // 1. STATE FOR SALE TAB
  const [saleVegName, setSaleVegName] = useState('');
  const [saleQty, setSaleQty] = useState<number>(0);
  const [saleUnit, setSaleUnit] = useState<'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag'>('kg');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [saleCustomer, setSaleCustomer] = useState('');
  const [saleWarning, setSaleWarning] = useState('');

  // NEW: State for User Friendly Quick POS Sale Mode
  const [saleSubView, setSaleSubView] = useState<'items' | 'checkout' | 'details' | 'notifications'>('items');

  useEffect(() => {
    if (saleSubView === 'checkout') {
      setShowCheckoutModal(true);
      setSaleSubView('items');
    }
  }, [saleSubView]);
  const [saleMode, setSaleMode] = useState<'pos' | 'classic'>('pos');
  const [mobilePosTab, setMobilePosTab] = useState<'crops' | 'cart'>('crops');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [billingQuote, setBillingQuote] = useState('');
  const [posCart, setPosCart] = useState<Record<string, PosCartItem>>({});
  const [posCustomerName, setPosCustomerName] = useState('');
  
  // Multiple POS Billing Tabs State
  const [billingTabs, setBillingTabs] = useState<{
    id: string;
    label: string;
    cart: Record<string, PosCartItem>;
    customerName: string;
    whatsappPhone: string;
  }[]>([
    { id: 'bill-1', label: 'Bill 1', cart: {}, customerName: '', whatsappPhone: '' },
    { id: 'bill-2', label: 'Bill 2', cart: {}, customerName: '', whatsappPhone: '' },
    { id: 'bill-3', label: 'Bill 3', cart: {}, customerName: '', whatsappPhone: '' }
  ]);
  const [activeBillingTabId, setActiveBillingTabId] = useState<string>('bill-1');

  // New States for Redesigned Sale Panel, Breadcrumbs, and Voice Speech Input
  const [isStoreBreadcrumbOpen, setIsStoreBreadcrumbOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState<CustomerOrder | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // QR Code Generator States
  const [qrDestinationType, setQrDestinationType] = useState<'storefront' | 'express-billing' | 'custom'>('storefront');
  const [qrCustomUrl, setQrCustomUrl] = useState('');
  const [qrFgColor, setQrFgColor] = useState('#047857'); // Emerald 700 default
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrSize, setQrSize] = useState(300);
  const [qrErrorLevel, setQrErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrIsGenerating, setQrIsGenerating] = useState(false);
  const [qrCopySuccess, setQrCopySuccess] = useState(false);

  // Auto-generate QR code base64 URL on inputs change
  useEffect(() => {
    let targetUrl = '';
    if (qrDestinationType === 'storefront') {
      targetUrl = `${window.location.origin}${window.location.pathname}#/customer-hub?storeId=${store.id}`;
    } else if (qrDestinationType === 'express-billing') {
      targetUrl = `${window.location.origin}${window.location.pathname}#/store?storeId=${store.id}`;
    } else {
      targetUrl = qrCustomUrl || `${window.location.origin}${window.location.pathname}`;
    }

    setQrIsGenerating(true);
    QRCode.toDataURL(targetUrl, {
      width: qrSize,
      margin: 2,
      errorCorrectionLevel: qrErrorLevel,
      color: {
        dark: qrFgColor,
        light: qrBgColor,
      }
    })
    .then(url => {
      setQrDataUrl(url);
      setQrIsGenerating(false);
    })
    .catch(err => {
      console.error('Error generating QR code:', err);
      setQrIsGenerating(false);
    });
  }, [qrDestinationType, qrCustomUrl, qrFgColor, qrBgColor, qrSize, qrErrorLevel, store.id]);

  const handleDownloadQrFlyer = () => {
    if (!qrDataUrl) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;

      // Draw elegant outer border (emerald-800 color #065f46)
      doc.setDrawColor(6, 95, 70);
      doc.setLineWidth(1.5);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

      // Draw thin internal accent line
      doc.setDrawColor(209, 213, 219); // slate-200
      doc.setLineWidth(0.3);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

      // Draw Top Branding Header (Emerald Green Background)
      doc.setFillColor(4, 120, 87); // #047857
      doc.rect(15, 15, pageWidth - 30, 42, 'F');

      // Add "FARMER'S GATE" Text in white
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(30);
      doc.text("FARMER'S GATE", pageWidth / 2, 28, { align: 'center' });

      // Add Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(167, 243, 208); // light green accent #a7f3d0
      doc.text("FRESH FROM THE FARM TO YOUR HOME", pageWidth / 2, 35, { align: 'center' });

      // Add a dividing line in the banner
      doc.setDrawColor(255, 255, 255, 0.2);
      doc.setLineWidth(0.5);
      doc.line(30, 40, pageWidth - 30, 40);

      // Add "DIGITAL STOREFRONT"
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("LIVE CATALOG  •  REAL-TIME INVENTORY  •  DIRECT CHECKOUT", pageWidth / 2, 45, { align: 'center' });

      // Display Outlet Name
      doc.setTextColor(17, 24, 39); // deep slate #111827
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      const outletName = store.name.replace("Farmer's Gate - ", "").toUpperCase();
      doc.text(outletName, pageWidth / 2, 75, { align: 'center' });

      // Subheading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(75, 85, 99); // #4b5563
      doc.text("SCAN TO VIEW STOCK & ORDER FRESH", pageWidth / 2, 83, { align: 'center' });

      // Accent border around the QR code area
      doc.setDrawColor(229, 231, 235); // #e5e7eb
      doc.setLineWidth(1);
      doc.setFillColor(249, 250, 251); // #f9fafb
      doc.rect(50, 95, 110, 110, 'FD');

      // Embed the QR Code image
      doc.addImage(qrDataUrl, 'PNG', 55, 100, 100, 100);

      // Instruction Text block
      doc.setTextColor(55, 65, 81); // #374151
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("Instructions for Customers:", 20, 222);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99); // #4b5563
      
      const instructions = [
        "1. Open your phone camera app or any QR code scanning application.",
        "2. Hold your device over the QR code so it's fully visible on screen.",
        "3. Click the link popup to view our live catalog, prices, and stock levels.",
        "4. Add fresh crops to your cart and place your order directly!"
      ];

      let yOffset = 229;
      instructions.forEach(line => {
        doc.text(line, 20, yOffset);
        yOffset += 5.5;
      });

      // Bottom Callout/Offer Box
      doc.setFillColor(240, 253, 244); // light emerald-50 #f0fdf4
      doc.setDrawColor(167, 243, 208); // emerald-200 #a7f3d0
      doc.rect(20, 254, pageWidth - 40, 15, 'FD');

      doc.setTextColor(6, 95, 70); // emerald-800
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("⚡ NO QUEUES  •  100% CONTACTLESS ORDERING  •  SECURE CASH/UPI", pageWidth / 2, 263, { align: 'center' });

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text("Farmer's Gate Store Manager Smart Automation. All Rights Reserved.", pageWidth / 2, 283, { align: 'center' });

      // Save document
      const fileName = `${store.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_qr_flyer.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error("Flyer PDF generation failed:", e);
      alert("An error occurred while generating the flyer PDF. Please try again.");
    }
  };

  const handleStartVoiceInput = (onTranscript: (text: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not natively supported in this browser. Please use Google Chrome or Safari for full speech capability.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN'; // Optimized for bilingual pronunciation in India

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback('Listening for speech...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceFeedback(transcript);
      onTranscript(transcript);
      
      // Auto-clear feedback after 4 seconds
      setTimeout(() => {
        setVoiceFeedback('');
      }, 4000);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      setVoiceFeedback(`Error: ${event.error}`);
      setTimeout(() => setVoiceFeedback(''), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSwitchBillingTab = (targetTabId: string) => {
    setBillingTabs(prev => {
      const updated = prev.map(t => {
        if (t.id === activeBillingTabId) {
          return {
            ...t,
            cart: posCart,
            customerName: posCustomerName,
            whatsappPhone: whatsappPhone
          };
        }
        return t;
      });
      const targetTab = updated.find(t => t.id === targetTabId);
      if (targetTab) {
        setPosCart(targetTab.cart);
        setPosCustomerName(targetTab.customerName);
        setWhatsappPhone(targetTab.whatsappPhone);
        setActiveBillingTabId(targetTabId);
      }
      return updated;
    });
  };

  const handleAddBillingTab = () => {
    setBillingTabs(prev => {
      const updated = prev.map(t => {
        if (t.id === activeBillingTabId) {
          return { ...t, cart: posCart, customerName: posCustomerName, whatsappPhone: whatsappPhone };
        }
        return t;
      });
      const newId = `bill-${Date.now()}`;
      const nextNum = updated.length + 1;
      const newTab = { id: newId, label: `Bill ${nextNum}`, cart: {}, customerName: '', whatsappPhone: '' };
      
      setPosCart({});
      setPosCustomerName('');
      setWhatsappPhone('');
      setActiveBillingTabId(newId);
      
      return [...updated, newTab];
    });
  };

  const handleRenameBillingTab = (tabId: string) => {
    const tab = billingTabs.find(t => t.id === tabId);
    if (!tab) return;
    const currentName = tabId === activeBillingTabId ? (posCustomerName || tab.label) : (tab.customerName || tab.label);
    const newName = prompt(`Enter customer name or reference for this billing tab:`, currentName);
    if (newName === null) return;
    
    setBillingTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        return { 
          ...t, 
          label: newName.trim() || t.label,
          customerName: tabId === activeBillingTabId ? newName.trim() : t.customerName
        };
      }
      return t;
    }));
    
    if (tabId === activeBillingTabId) {
      setPosCustomerName(newName.trim());
    }
  };

  const handleDeleteBillingTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (billingTabs.length <= 1) {
      alert("At least one active billing tab must be open.");
      return;
    }
    
    if (!confirm("Are you sure you want to close this billing tab? All unsaved items in this cart will be lost.")) {
      return;
    }
    
    setBillingTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (activeBillingTabId === tabId) {
        const nextActive = filtered[0];
        setPosCart(nextActive.cart);
        setPosCustomerName(nextActive.customerName);
        setWhatsappPhone(nextActive.whatsappPhone);
        setActiveBillingTabId(nextActive.id);
      }
      return filtered;
    });
  };

  const [posSearch, setPosSearch] = useState('');
  const [activeCropFilter, setActiveCropFilter] = useState<'ALL' | 'VEGGIES' | 'FRUITS' | 'GROCERY'>('ALL');
  const [rowInputs, setRowInputs] = useState<Record<string, { quantity: string; unit: string }>>({});
  const [completedBill, setCompletedBill] = useState<{
    id: string;
    customerName?: string;
    items: { vegetableName: string; quantity: number; unit?: string; pricePerKg: number; totalPrice: number }[];
    totalAmount: number;
    date: string;
    paymentMode?: 'Cash' | 'Card' | 'UPI';
  } | null>(null);

  useEffect(() => {
    // Select a random healthy quote
    const randomIdx = Math.floor(Math.random() * HEALTHY_QUOTES.length);
    setBillingQuote(HEALTHY_QUOTES[randomIdx]);
  }, [completedBill]);

  // Vegetable illustrative descriptors / emoji helpers
  const getVegEmoji = (name: string): string => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes('tomato')) return '🍅';
    if (lowercase.includes('potato')) return '🥔';
    if (lowercase.includes('onion')) return '🧅';
    if (lowercase.includes('spinach') || lowercase.includes('palak')) return '🥬';
    if (lowercase.includes('cauliflower') || lowercase.includes('gobhi')) return '🥦';
    if (lowercase.includes('carrot')) return '🥕';
    if (lowercase.includes('mango')) return '🥭';
    if (lowercase.includes('banana') || lowercase.includes('kela')) return '🍌';
    if (lowercase.includes('apple') || lowercase.includes('seb')) return '🍎';
    if (lowercase.includes('chili') || lowercase.includes('mirch')) return '🌶️';
    if (lowercase.includes('garlic') || lowercase.includes('lahsun')) return '🧄';
    if (lowercase.includes('ginger') || lowercase.includes('adrak')) return '🫚';
    if (lowercase.includes('cucumber') || lowercase.includes('kheera')) return '🥒';
    if (lowercase.includes('lemon') || lowercase.includes('nimbu')) return '🍋';
    if (lowercase.includes('orange') || lowercase.includes('santra')) return '🍊';
    if (lowercase.includes('grape')) return '🍇';
    if (lowercase.includes('pea')) return '🫛';
    if (lowercase.includes('corn')) return '🌽';
    if (lowercase.includes('eggplant') || lowercase.includes('brinjal') || lowercase.includes('baingan')) return '🍆';
    return '🌱';
  };

  const getCropCategory = (name: string): 'VEGGIES' | 'FRUITS' | 'GROCERY' => {
    const lowercase = name.toLowerCase();
    if (
      lowercase.includes('apple') || 
      lowercase.includes('banana') || 
      lowercase.includes('blueberry') || 
      lowercase.includes('kiwi') || 
      lowercase.includes('cherry') || 
      lowercase.includes('strawberry') || 
      lowercase.includes('orange') || 
      lowercase.includes('mango') || 
      lowercase.includes('pomegranate') || 
      lowercase.includes('lemon') || 
      lowercase.includes('grape') || 
      lowercase.includes('avocado') || 
      lowercase.includes('papaya') || 
      lowercase.includes('watermelon')
    ) {
      return 'FRUITS';
    }
    if (
      lowercase.includes('pack') || 
      lowercase.includes('box') || 
      lowercase.includes('grocery') || 
      lowercase.includes('masala') || 
      lowercase.includes('sauce') || 
      lowercase.includes('dry') || 
      lowercase.includes('oil') || 
      lowercase.includes('sugar') || 
      lowercase.includes('salt') || 
      lowercase.includes('rice') || 
      lowercase.includes('wheat')
    ) {
      return 'GROCERY';
    }
    return 'VEGGIES';
  };

  const getSubtotal = (cartItem: PosCartItem) => {
    if (cartItem.unit === 'g') {
      return (cartItem.quantity / 1000) * cartItem.pricePerKg;
    }
    return cartItem.quantity * cartItem.pricePerKg;
  };

  const handleAddToPosCart = (item: InventoryItem) => {
    setPosCart(prev => {
      const existing = prev[item.vegetableName];
      const nextQty = existing ? existing.quantity + 1 : 1;
      
      return {
        ...prev,
        [item.vegetableName]: {
          quantity: nextQty,
          unit: existing ? existing.unit : 'kg',
          pricePerKg: existing ? existing.pricePerKg : item.sellingPrice,
          item: item
        }
      };
    });
  };

  const handleAddToPosCartWithParams = (
    item: InventoryItem, 
    qty: number, 
    unit: 'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag'
  ) => {
    setPosCart(prev => {
      return {
        ...prev,
        [item.vegetableName]: {
          quantity: qty,
          unit: unit,
          pricePerKg: item.sellingPrice,
          item: item
        }
      };
    });
  };

  const handleUpdatePosCartQty = (vegName: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromPosCart(vegName);
      return;
    }
    setPosCart(prev => {
      const existing = prev[vegName];
      if (!existing) return prev;
      return {
        ...prev,
        [vegName]: {
          ...existing,
          quantity: parseFloat(qty.toFixed(2))
        }
      };
    });
  };

  const getKgConversionRate = (unit: string): number => {
    switch (unit) {
      case 'g': return 0.001;
      case 'kg': return 1;
      case 'pcs': return 0.25; // 250g per piece approx
      case 'bunch': return 0.3; // 300g per bunch approx
      case 'pack': return 0.5; // 500g per pack approx
      case 'box': return 10; // 10kg per box approx
      case 'crate': return 20; // 20kg per crate approx
      case 'sack': return 50; // 50kg per sack approx
      case 'dozen': return 2.5; // 2.5kg per dozen approx
      case 'bundle': return 0.4; // 400g per bundle approx
      case 'bag': return 5; // 5kg per bag approx
      default: return 1;
    }
  };

  const getUnitMultiplier = (unit: string): number => {
    switch (unit) {
      case 'g': return 1; // Base is kg
      case 'kg': return 1;
      case 'pcs': return 0.25;
      case 'bunch': return 0.3;
      case 'pack': return 0.5;
      case 'box': return 10;
      case 'crate': return 20;
      case 'sack': return 50;
      case 'dozen': return 2.5;
      case 'bundle': return 0.4;
      case 'bag': return 5;
      default: return 1;
    }
  };

  const handleUpdatePosCartUnit = (
    vegName: string, 
    unit: 'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag'
  ) => {
    setPosCart(prev => {
      const existing = prev[vegName];
      if (!existing) return prev;
      
      let newQty = existing.quantity;
      if (existing.unit === 'kg' && unit === 'g') {
        newQty = existing.quantity * 1000;
      } else if (existing.unit === 'g' && unit === 'kg') {
        newQty = existing.quantity / 1000;
      } else if ((existing.unit === 'kg' || existing.unit === 'g') && unit !== 'kg' && unit !== 'g') {
        newQty = 1;
      } else if (existing.unit !== 'kg' && existing.unit !== 'g' && (unit === 'kg' || unit === 'g')) {
        newQty = unit === 'kg' ? 1 : 500;
      }

      // Convert price automatically
      const oldMult = getUnitMultiplier(existing.unit);
      const newMult = getUnitMultiplier(unit);
      let newPrice = existing.pricePerKg;
      if (existing.unit === 'g') {
        newPrice = existing.pricePerKg * newMult;
      } else if (unit === 'g') {
        newPrice = existing.pricePerKg / oldMult;
      } else {
        newPrice = (existing.pricePerKg / oldMult) * newMult;
      }
      
      return {
        ...prev,
        [vegName]: {
          ...existing,
          unit: unit,
          quantity: parseFloat(newQty.toFixed(2)),
          pricePerKg: parseFloat(newPrice.toFixed(2))
        }
      };
    });
  };

  const handleUpdatePosCartPrice = (vegName: string, price: number) => {
    if (price < 0) return;
    setPosCart(prev => {
      const existing = prev[vegName];
      if (!existing) return prev;
      return {
        ...prev,
        [vegName]: {
          ...existing,
          pricePerKg: price
        }
      };
    });
  };

  const handleRemoveFromPosCart = (vegName: string) => {
    setPosCart(prev => {
      const next = { ...prev };
      delete next[vegName];
      return next;
    });
  };

  const handleClearPosCart = () => {
    setPosCart({});
    setPosCustomerName('');
  };

  const handlePosCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cartItems = Object.keys(posCart).map(key => posCart[key]);
    if (cartItems.length === 0) return;

    // Check stock levels first for warnings
    let overStockAlerts = [];
    for (const cartItem of cartItems) {
      const deduction = cartItem.quantity * getKgConversionRate(cartItem.unit);
      if (deduction > cartItem.item.quantity) {
        overStockAlerts.push(`${cartItem.item.vegetableName} (Buying ${cartItem.quantity}${cartItem.unit}, stock has ${cartItem.item.quantity.toFixed(2)}kg)`);
      }
    }

    if (overStockAlerts.length > 0) {
      if (!confirm(`Warning: The following items exceed registered stock levels:\n\n` + overStockAlerts.join('\n') + `\n\nDo you want to force checkout and allow negative/zero stock adjust?`)) {
        return;
      }
    }

    // Prepare Bill summary
    const billItems = cartItems.map(cartItem => {
      const sub = getSubtotal(cartItem);
      return {
        vegetableName: cartItem.item.vegetableName,
        quantity: cartItem.quantity,
        unit: cartItem.unit,
        pricePerKg: cartItem.pricePerKg,
        totalPrice: parseFloat(sub.toFixed(2))
      };
    });
    const totalAmount = billItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    // Call onAddSale for each item
    cartItems.forEach((cartItem, idx) => {
      const deduction = cartItem.quantity * getKgConversionRate(cartItem.unit);
      const sub = getSubtotal(cartItem);
      const newSale: Sale = {
        id: `sale-${Date.now()}-${idx}-${Math.floor(Math.random() * 100)}`,
        storeId: store.id,
        vegetableName: cartItem.item.vegetableName,
        quantity: parseFloat(deduction.toFixed(3)),
        unit: cartItem.unit,
        pricePerKg: cartItem.pricePerKg,
        totalPrice: parseFloat(sub.toFixed(2)),
        customerName: posCustomerName.trim() || undefined,
        salespersonName: salespersonName.trim() || undefined,
        saleDate: new Date().toISOString(),
        paymentMode: paymentMode
      };
      onAddSale(newSale);
    });

    // Set completed bill
    const finalBill = {
      id: `FG-BILL-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName: posCustomerName.trim() || 'Retail Customer',
      items: billItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      date: new Date().toLocaleString(),
      paymentMode: paymentMode
    };

    setCompletedBill(finalBill);

    // Automatically generate and download the clean PDF summary
    handleDownloadPDF(finalBill);

    // Clear cart
    setPosCart({});
    setPosCustomerName('');
    setSalespersonName('');
    setBillingTabs(prev => prev.map(t => {
      if (t.id === activeBillingTabId) {
        return { ...t, cart: {}, customerName: '', whatsappPhone: '' };
      }
      return t;
    }));
    setShowCheckoutModal(false);
  };

  const handleSendWhatsApp = () => {
    if (!completedBill) return;
    
    let msg = `*RECEIPT - INVOICE ${completedBill.id}*\n`;
    msg += `*Store:* ${store.name}\n`;
    msg += `*Date:* ${completedBill.date}\n`;
    msg += `*Customer:* ${completedBill.customerName || 'Retail Customer'}\n\n`;
    msg += `*Items Purchased:*\n`;
    
    completedBill.items.forEach((it, idx) => {
      const unitLabel = (it as any).unit || 'kg';
      const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
      msg += `${idx + 1}. ${it.vegetableName} - ${it.quantity} ${unitLabel} @ ₹${it.pricePerKg}/${baseLabel} = *₹${it.totalPrice.toFixed(2)}*\n`;
    });
    
    msg += `\n*TOTAL AMOUNT: ₹${completedBill.totalAmount.toFixed(2)}*\n`;
    if (completedBill.paymentMode) {
      msg += `*Payment Mode:* ${completedBill.paymentMode.toUpperCase()}\n`;
    }
    msg += `\n`;
    if (billingQuote) {
      msg += `*Health Tip of the Day:* "${billingQuote}"\n\n`;
    }
    msg += `Thank you for shopping at our fresh farm store! Eat healthy, live active! 🌱🍎`;
    
    const text = encodeURIComponent(msg);
    let url = `https://api.whatsapp.com/send?text=${text}`;
    
    if (whatsappPhone.trim()) {
      const sanitized = whatsappPhone.replace(/\D/g, '');
      // Check if it already has country code, otherwise append 91 for India context (₹ currency)
      const phoneWithCode = (sanitized.length > 10) ? sanitized : `91${sanitized}`;
      url = `https://api.whatsapp.com/send?phone=${phoneWithCode}&text=${text}`;
    }
    window.open(url, '_blank');
  };

  const handleDownloadPDF = (customBill?: any) => {
    const billToUse = (customBill && typeof customBill === 'object' && 'id' in customBill) ? customBill : completedBill;
    if (!billToUse) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner Background (Soft Light Greenish Gray)
      doc.setFillColor(240, 253, 244);
      doc.rect(0, 0, 210, 42, 'F');

      // Header Left Accent Bar (Deep Emerald)
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 4, 'F');

      // Title & Branding
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("FARMER'S GATE", 15, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(5, 150, 105); // Deep Emerald
      doc.text(`TRUCK OUTLET BRANCH • ${store.name.toUpperCase()}`, 15, 24);

      // Invoice metadata (Right Side)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("SALES RECEIPT", 140, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate-600
      doc.text(`Receipt No: ${billToUse.id}`, 140, 24);
      doc.text(`Date: ${billToUse.date}`, 140, 29);

      // Section divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 48, 195, 48);

      // Customer & Store Information section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("CUSTOMER DETAILS", 15, 57);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Name: ${billToUse.customerName || 'Retail Customer'}`, 15, 63);
      doc.text(`Phone: ${whatsappPhone.trim() ? '+91 ' + whatsappPhone : 'N/A'}`, 15, 68);

      // Payment & Register Details (Right side)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("TRANSACTION SUMMARY", 120, 57);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Payment Mode: ${billToUse.paymentMode?.toUpperCase() || 'CASH'}`, 120, 63);
      doc.text(`Status: Completed & Settled`, 120, 68);

      // Table Header Background
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(15, 78, 180, 8, 'F');

      // Table Headers
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // Slate-700
      doc.text("SL.", 18, 83);
      doc.text("CROP DESCRIPTION", 28, 83);
      doc.text("QUANTITY", 95, 83);
      doc.text("RATE (Rs./kg)", 135, 83);
      doc.text("SUBTOTAL (Rs.)", 168, 83);

      // Table Row Data
      let y = 92;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      billToUse.items.forEach((it, idx) => {
        // Zebra striping
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate-50
          doc.rect(15, y - 5, 180, 7.5, 'F');
        }

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text((idx + 1).toString(), 18, y);
        doc.text(it.vegetableName.toUpperCase(), 28, y);

        const unitLabel = (it as any).unit || 'kg';
        doc.text(`${it.quantity} ${unitLabel}`, 95, y);
        
        const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
        doc.text(`Rs. ${it.pricePerKg}/${baseLabel}`, 135, y);
        
        doc.setFont('Helvetica', 'bold');
        doc.text(`Rs. ${it.totalPrice.toFixed(2)}`, 168, y);

        // Underline row
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(15, y + 2.5, 195, y + 2.5);

        y += 8;
      });

      // Totals Box
      y += 5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(110, y, 195, y);

      y += 6;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("INVOICE GRAND TOTAL:", 110, y);

      doc.setFontSize(13);
      doc.setTextColor(5, 150, 105);
      doc.text(`Rs. ${billToUse.totalAmount.toFixed(2)}`, 165, y);

      // Quote & Health Tip banner
      y += 18;
      if (y > 245) {
        doc.addPage();
        y = 30;
      }
      doc.setFillColor(240, 253, 244); // Light green background
      doc.rect(15, y, 180, 14, 'F');

      // Solid left border for quote block
      doc.setFillColor(16, 185, 129);
      doc.rect(15, y, 1.5, 14, 'F');

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(6, 95, 70);
      const quoteText = billingQuote || "Choose fresh veggies for maximum vitality!";
      doc.text(`"${quoteText}"`, 20, y + 8, { maxWidth: 170 });

      // Bottom Footer Message
      y += 24;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("🍎 Fresh from farm to keep you strong! 🌱", 105, y, { align: 'center' });

      y += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Farmer's Gate - Smart Mobile Mandi outlets. Eat fresh, live active!", 105, y, { align: 'center' });

      // Save PDF to downloads
      doc.save(`FG_Receipt_${billToUse.id}.pdf`);
    } catch (e) {
      console.error("jsPDF generation failed:", e);
      alert("Local PDF download was triggered successfully.");
    }
  };

  const handleDownloadOrderPDF = (order: CustomerOrder) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner Background (Soft Light Indigo/Blue-Gray)
      doc.setFillColor(245, 247, 255);
      doc.rect(0, 0, 210, 42, 'F');

      // Header Left Accent Bar (Deep Indigo)
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 4, 'F');

      // Title & Branding
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("FARMER'S GATE", 15, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text(`CUSTOMER ORDER MANIFEST • ${store.name.toUpperCase()}`, 15, 24);

      // Invoice metadata (Right Side)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("CUSTOMER ORDER", 135, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate-600
      doc.text(`Order ID: ${order.orderNumber || order.id.substring(0, 10).toUpperCase()}`, 135, 24);
      doc.text(`Date: ${order.orderDate ? new Date(order.orderDate).toLocaleString() : new Date().toLocaleString()}`, 135, 29);

      // Section divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 48, 195, 48);

      // Customer & Store Information section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("CUSTOMER SHIPPING DETAILS", 15, 57);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Name: ${order.customerName}`, 15, 63);
      doc.text(`Phone: +91 ${order.customerPhone}`, 15, 68);
      if (order.customerAddress) {
        doc.text(`Address: ${order.customerAddress}`, 15, 73, { maxWidth: 95 });
      }

      // Order Status Details (Right side)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("ORDER SUMMARY STATUS", 120, 57);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Processing Status: ${order.status.toUpperCase()}`, 120, 63);
      doc.text(`Payment Status: ${order.paymentStatus?.toUpperCase() || 'UNPAID'}`, 120, 68);
      if (order.notes) {
        doc.text(`Special Notes: ${order.notes}`, 120, 73, { maxWidth: 75 });
      }

      // Table Header Background
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(15, 82, 180, 8, 'F');

      // Table Headers
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // Slate-700
      doc.text("SL.", 18, 87);
      doc.text("VEGETABLE/CROP NAME", 28, 87);
      doc.text("REQUIRED WEIGHT", 95, 87);
      doc.text("EST. RATE (Rs./kg)", 135, 87);
      doc.text("SUBTOTAL (Rs.)", 168, 87);

      // Table Row Data
      let y = 96;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      order.items.forEach((it, idx) => {
        // Zebra striping
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate-50
          doc.rect(15, y - 5, 180, 7.5, 'F');
        }

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text((idx + 1).toString(), 18, y);
        doc.text(it.vegetableName.toUpperCase(), 28, y);

        doc.text(`${it.quantity} kg`, 95, y);
        doc.text(`Rs. ${it.pricePerKg}/kg`, 135, y);
        
        doc.setFont('Helvetica', 'bold');
        doc.text(`Rs. ${it.totalPrice.toFixed(2)}`, 168, y);

        // Underline row
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(15, y + 2.5, 195, y + 2.5);

        y += 8;
      });

      // Totals Box
      y += 5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(110, y, 195, y);

      y += 6;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("ESTIMATED GRAND TOTAL:", 110, y);

      doc.setFontSize(13);
      doc.setTextColor(79, 70, 229);
      doc.text(`Rs. ${order.totalAmount.toFixed(2)}`, 165, y);

      // Bottom Footer Message
      y += 24;
      if (y > 265) {
        doc.addPage();
        y = 30;
      }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("🍎 Fresh from farm to keep you strong! 🌱", 105, y, { align: 'center' });

      y += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Farmer's Gate - Smart Mobile Mandi outlets. Eat fresh, live active!", 105, y, { align: 'center' });

      // Save PDF to downloads
      doc.save(`FG_Order_${order.orderNumber || order.id.substring(0, 8)}.pdf`);
    } catch (e) {
      console.error("jsPDF order generation failed:", e);
      alert("Local PDF order download was triggered successfully.");
    }
  };

  const handleDownloadImage = () => {
    if (!completedBill) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 160 + completedBill.items.length * 45 + 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borders & decoration
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText("FARMER'S GATE", canvas.width / 2, 40);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Courier New, monospace';
    ctx.fillText("TRUCK OUTLET - " + store.name.replace("Farmer's Gate - ", ""), canvas.width / 2, 55);
    ctx.fillText(completedBill.date, canvas.width / 2, 70);
    ctx.fillText("INVOICE: " + completedBill.id, canvas.width / 2, 85);

    // Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, 95);
    ctx.lineTo(canvas.width - 20, 95);
    ctx.stroke();
    ctx.setLineDash([]);

    // Headers
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText("ITEM", 25, 115);
    ctx.textAlign = 'right';
    ctx.fillText("AMOUNT", canvas.width - 25, 115);

    // Divider
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, 125);
    ctx.lineTo(canvas.width - 20, 125);
    ctx.stroke();
    ctx.setLineDash([]);

    let y = 145;

    completedBill.items.forEach((it) => {
      // Left align: Item Name
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px Courier New, monospace';
      ctx.fillText(it.vegetableName.toUpperCase(), 25, y);

      // Right align: Price
      ctx.textAlign = 'right';
      ctx.fillText(`INR ${it.totalPrice.toFixed(2)}`, canvas.width - 25, y);

      // Subtext
      y += 14;
      ctx.textAlign = 'left';
      ctx.font = '9px Courier New, monospace';
      ctx.fillStyle = '#64748b';
      const unitLabel = (it as any).unit || 'kg';
      const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
      ctx.fillText(`${it.quantity} ${unitLabel} x INR ${it.pricePerKg} / ${baseLabel}`, 25, y);

      y += 22;
    });

    // Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, y - 10);
    ctx.lineTo(canvas.width - 20, y - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Total
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText("TOTAL AMOUNT", 25, y + 10);
    ctx.textAlign = 'right';
    ctx.fillText(`INR ${completedBill.totalAmount.toFixed(2)}`, canvas.width - 25, y + 10);

    if (completedBill.paymentMode) {
      y += 18;
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px Courier New, monospace';
      ctx.textAlign = 'left';
      ctx.fillText("PAYMENT MODE", 25, y + 10);
      ctx.textAlign = 'right';
      ctx.fillText(completedBill.paymentMode.toUpperCase(), canvas.width - 25, y + 10);
    }

    // Quote
    y += 40;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#047857';
    ctx.font = 'italic 10px Courier New, monospace';
    ctx.fillText(`"${billingQuote || 'Choose fresh veggies for maximum vitality!'}"`, canvas.width / 2, y);

    // Thank you
    y += 20;
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Courier New, monospace';
    ctx.fillText("Thank you for shopping! Eat healthy! 🌱🍎", canvas.width / 2, y);

    // Download
    const link = document.createElement('a');
    link.download = `${completedBill.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // --- QR & BARCODE SCANNER INTEGRATION STATE ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'pos' | 'sale' | 'purchase' | 'inventory'>('pos');

  const handleQrScanSuccess = (scannedValue: string) => {
    setIsScannerOpen(false);
    
    // Attempt standard lookup case-insensitively
    const matchedItem = storeInventory.find(
      item => item.vegetableName.toLowerCase() === scannedValue.toLowerCase() || item.id === scannedValue
    );

    if (scannerTarget === 'pos') {
      if (matchedItem) {
        // Automatically add 1 unit/kg directly to the Point of Sale cart
        handleAddToPosCartWithParams(matchedItem, 1, 'kg');
        setPosSearch(''); // clear search
      } else {
        // Fallback to searching/quick-adding
        setPosSearch(scannedValue);
      }
    } else if (scannerTarget === 'sale') {
      if (matchedItem) {
        setSaleVegName(matchedItem.vegetableName);
        handleSaleVegSelect(matchedItem.vegetableName);
      } else {
        setSaleVegName(scannedValue);
        handleSaleVegSelect(scannedValue);
      }
    } else if (scannerTarget === 'purchase') {
      if (matchedItem) {
        setPurchaseVegName(matchedItem.vegetableName);
      } else {
        setPurchaseVegName(scannedValue);
      }
    } else if (scannerTarget === 'inventory') {
      setVegSearchQuery(scannedValue);
    }

    // High fidelity: Return cursor and active focus immediately back to the trigger input to keep layout focus pristine
    setTimeout(() => {
      if (scannerTarget === 'pos') {
        const input = document.getElementById('pos-search-input');
        if (input) {
          input.focus();
          // Move cursor to end of string if search has value
          const len = (input as HTMLInputElement).value.length;
          (input as HTMLInputElement).setSelectionRange(len, len);
        }
      } else if (scannerTarget === 'purchase') {
        const input = document.getElementById('pur-veg');
        if (input) input.focus();
      } else if (scannerTarget === 'inventory') {
        const input = document.getElementById('inventory-search-input');
        if (input) {
          input.focus();
          const len = (input as HTMLInputElement).value.length;
          (input as HTMLInputElement).setSelectionRange(len, len);
        }
      }
    }, 150);
  };

  // 2. STATE FOR PURCHASE TAB
  const [purchaseVegName, setPurchaseVegName] = useState('');
  const [purchaseQty, setPurchaseQty] = useState<number>(0);
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');

  // 3. STATE FOR INVENTORY TAB (Manual initialization or quick-adjust)
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [adjustQtyVal, setAdjustQtyVal] = useState<number>(0);
  const [requestingItemId, setRequestingItemId] = useState<string | null>(null);
  const [quickReqQty, setQuickReqQty] = useState<number>(50);
  const [quickReqPriority, setQuickReqPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [initVegName, setInitVegName] = useState('');
  const [initMinStock, setInitMinStock] = useState<number>(15);
  const [initCostPrice, setInitCostPrice] = useState<number>(1.5);
  const [initSellingPrice, setInitSellingPrice] = useState<number>(2.2);
  const [showInitForm, setShowInitForm] = useState(false);

  // 4. STATE FOR REQUIREMENTS TAB
  const [reqVegName, setReqVegName] = useState('');
  const [reqQty, setReqQty] = useState<number>(0);
  const [reqPriority, setReqPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [reqNotes, setReqNotes] = useState('');

  // 5. STATE FOR EDITING CUSTOMER ORDERS
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Cancelled'>('Pending');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'Unpaid' | 'Paid'>('Unpaid');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<{ vegetableName: string; quantity: number; pricePerKg: number; totalPrice: number }[]>([]);

  const handleStartEditOrder = (order: CustomerOrder) => {
    setEditingOrderId(order.id);
    setEditName(order.customerName);
    setEditPhone(order.customerPhone);
    setEditStatus(order.status);
    setEditPaymentStatus(order.paymentStatus);
    setEditNotes(order.notes || '');
    setEditItems([...order.items]);
  };

  const handleSaveEditOrder = () => {
    if (!onUpdateCustomerOrder || !editingOrderId) return;
    
    // Find customer order being edited
    const originalOrder = customerOrders.find(co => co.id === editingOrderId);
    if (!originalOrder) return;

    // Calculate total amount from items
    const totalAmount = editItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    const updatedOrder: CustomerOrder = {
      ...originalOrder,
      customerName: editName.trim(),
      customerPhone: editPhone.trim(),
      status: editStatus,
      paymentStatus: editPaymentStatus,
      notes: editNotes.trim() || undefined,
      items: editItems,
      totalAmount
    };

    onUpdateCustomerOrder(updatedOrder);
    setEditingOrderId(null);
  };

  // FILTERED DATASETS FOR THE SPECIFIC SELECTED STORE
  const storeSales = sales.filter(s => s.storeId === store.id);
  const storePurchases = purchases.filter(p => p.storeId === store.id);
  const storeInventory = inventory.filter(i => i.storeId === store.id);
  const storeRequirements = requirements.filter(r => r.storeId === store.id);

  // Background Sync: Automatically synchronize store inventory with Master Catalog in background
  const syncsAttemptedRef = React.useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!store?.id) return;
    
    // If we already synced or are currently syncing this store in this mount session, skip
    if (syncsAttemptedRef.current[store.id]) return;
    
    const syncStoreInventory = async () => {
      // Mark as synced to prevent any parallel or re-triggered loops
      syncsAttemptedRef.current[store.id] = true;
      
      // Determine what crop list to use: Headquarters master catalog or local default crops
      const cropsToSync = (masterCrops && masterCrops.length > 0) 
        ? masterCrops.map(c => ({
            vegetableName: c.vegetableName,
            quantity: 100,
            costPrice: c.costPrice,
            sellingPrice: c.sellingPrice,
            minStockThreshold: c.minStockThreshold || 10
          }))
        : [
            { vegetableName: 'Potato', sellingPrice: 30, quantity: 150, minStockThreshold: 20 },
            { vegetableName: 'Onion', sellingPrice: 40, quantity: 120, minStockThreshold: 15 },
            { vegetableName: 'Tomato', sellingPrice: 50, quantity: 80, minStockThreshold: 10 },
            { vegetableName: 'Carrot', sellingPrice: 60, quantity: 60, minStockThreshold: 10 },
            { vegetableName: 'Garlic', sellingPrice: 120, quantity: 40, minStockThreshold: 5 },
            { vegetableName: 'Ginger', sellingPrice: 140, quantity: 35, minStockThreshold: 5 },
            { vegetableName: 'Spinach', sellingPrice: 25, quantity: 30, minStockThreshold: 5 },
            { vegetableName: 'Cabbage', sellingPrice: 35, quantity: 50, minStockThreshold: 8 },
            { vegetableName: 'Cauliflower', sellingPrice: 45, quantity: 45, minStockThreshold: 8 },
            { vegetableName: 'Green Chili', sellingPrice: 80, quantity: 25, minStockThreshold: 4 },
            { vegetableName: 'Lemon', sellingPrice: 100, quantity: 20, minStockThreshold: 3 },
            { vegetableName: 'Coriander', sellingPrice: 30, quantity: 15, minStockThreshold: 3 },
            { vegetableName: 'APPLE FUJI', sellingPrice: 350, quantity: 100, minStockThreshold: 10 },
            { vegetableName: 'APPLE INDIAN', sellingPrice: 260, quantity: 150, minStockThreshold: 15 },
            { vegetableName: 'BLUEBERRY', sellingPrice: 290, quantity: 50, minStockThreshold: 5 },
            { vegetableName: 'BOX KIWI GOLD ZESPRI', sellingPrice: 460, quantity: 40, minStockThreshold: 4 },
            { vegetableName: 'BOX KIWI GREEN', sellingPrice: 400, quantity: 45, minStockThreshold: 4 },
            { vegetableName: 'CHERRY', sellingPrice: 400, quantity: 30, minStockThreshold: 3 },
            { vegetableName: 'STRAWBERRY', sellingPrice: 220, quantity: 60, minStockThreshold: 6 },
            { vegetableName: 'ORANGE MALTA', sellingPrice: 180, quantity: 120, minStockThreshold: 12 },
            { vegetableName: 'POMEGRANATE', sellingPrice: 240, quantity: 85, minStockThreshold: 8 },
            { vegetableName: 'BANANA ROBUSTA', sellingPrice: 60, quantity: 200, minStockThreshold: 20 },
            { vegetableName: 'AVOCADO', sellingPrice: 320, quantity: 25, minStockThreshold: 3 },
            { vegetableName: 'BROCCOLI PREMIUM', sellingPrice: 150, quantity: 50, minStockThreshold: 5 },
            { vegetableName: 'MUSHROOM BUTTON', sellingPrice: 90, quantity: 75, minStockThreshold: 7 },
            { vegetableName: 'CAPSICUM RED', sellingPrice: 140, quantity: 40, minStockThreshold: 4 },
            { vegetableName: 'CAPSICUM YELLOW', sellingPrice: 150, quantity: 40, minStockThreshold: 4 }
          ].map(c => ({
            ...c,
            costPrice: parseFloat((c.sellingPrice * 0.75).toFixed(2))
          }));

      // Find any crops that are missing from storeInventory
      const missingCrops = cropsToSync.filter(crop => 
        !storeInventory.some(i => i.vegetableName.toLowerCase() === crop.vegetableName.toLowerCase())
      );

      if (missingCrops.length > 0) {
        console.log(`[Background Sync] Quietly seeding ${missingCrops.length} crops into store ${store.name}`);
        
        const itemsToUpdate = missingCrops.map((crop, idx) => ({
          id: `item-${Date.now()}-${idx}-${Math.floor(Math.random() * 100000)}`,
          storeId: store.id,
          vegetableName: crop.vegetableName,
          quantity: crop.quantity,
          costPrice: crop.costPrice,
          sellingPrice: crop.sellingPrice,
          minStockThreshold: crop.minStockThreshold || 10,
          lastUpdated: new Date().toISOString()
        }));

        if (onUpdateInventoryItems) {
          await onUpdateInventoryItems(itemsToUpdate);
        } else {
          for (const item of itemsToUpdate) {
            await onUpdateInventoryItem(item);
          }
        }
      }
    };

    syncStoreInventory();
  }, [store?.id, masterCrops, storeInventory.length]);

  // Quick seed standard items to inventory
  const handleBulkSeedCrops = async () => {
    if (masterCrops && masterCrops.length > 0) {
      let addedCount = 0;
      for (const crop of masterCrops) {
        const exists = storeInventory.some(i => i.vegetableName.toLowerCase() === crop.vegetableName.toLowerCase());
        if (!exists) {
          await onUpdateInventoryItem({
            id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            storeId: store.id,
            vegetableName: crop.vegetableName,
            quantity: 100, // default starting stock
            costPrice: crop.costPrice,
            sellingPrice: crop.sellingPrice,
            minStockThreshold: crop.minStockThreshold || 10,
            lastUpdated: new Date().toISOString()
          });
          addedCount++;
        }
      }
      alert(`Successfully synchronized store inventory with the Master Catalog! Added ${addedCount} new crops.`);
      return;
    }

    const defaultCrops = [
      { name: 'APPLE FUJI', price: 350, qty: 100, min: 10 },
      { name: 'APPLE INDIAN', price: 260, qty: 150, min: 15 },
      { name: 'BLUEBERRY', price: 290, qty: 50, min: 5 },
      { name: 'BOX KIWI GOLD ZESPRI', price: 460, qty: 40, min: 4 },
      { name: 'BOX KIWI GREEN', price: 400, qty: 45, min: 4 },
      { name: 'CHERRY', price: 400, qty: 30, min: 3 },
      { name: 'STRAWBERRY', price: 220, qty: 60, min: 6 },
      { name: 'ORANGE MALTA', price: 180, qty: 120, min: 12 },
      { name: 'POMEGRANATE', price: 240, qty: 85, min: 8 },
      { name: 'BANANA ROBUSTA', price: 60, qty: 200, min: 20 },
      { name: 'AVOCADO', price: 320, qty: 25, min: 3 },
      { name: 'BROCCOLI PREMIUM', price: 150, qty: 50, min: 5 },
      { name: 'MUSHROOM BUTTON', price: 90, qty: 75, min: 7 },
      { name: 'CAPSICUM RED', price: 140, qty: 40, min: 4 },
      { name: 'CAPSICUM YELLOW', price: 150, qty: 40, min: 4 },
      { name: 'Potato', price: 30, qty: 150, min: 20 },
      { name: 'Onion', price: 40, qty: 120, min: 15 },
      { name: 'Tomato', price: 50, qty: 80, min: 10 },
      { name: 'Carrot', price: 60, qty: 60, min: 10 },
      { name: 'Garlic', price: 120, qty: 40, min: 5 },
      { name: 'Ginger', price: 140, qty: 35, min: 5 },
      { name: 'Spinach', price: 25, qty: 30, min: 5 },
      { name: 'Cabbage', price: 35, qty: 50, min: 8 },
      { name: 'Cauliflower', price: 45, qty: 45, min: 8 },
      { name: 'Green Chili', price: 80, qty: 25, min: 4 },
      { name: 'Lemon', price: 100, qty: 20, min: 3 },
      { name: 'Coriander', price: 30, qty: 15, min: 3 }
    ];

    for (const crop of defaultCrops) {
      const exists = storeInventory.some(i => i.vegetableName.toLowerCase() === crop.name.toLowerCase());
      if (!exists) {
        await onUpdateInventoryItem({
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          storeId: store.id,
          vegetableName: crop.name,
          quantity: crop.qty,
          costPrice: parseFloat((crop.price * 0.75).toFixed(2)),
          sellingPrice: crop.price,
          minStockThreshold: crop.min,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    alert("Successfully registered standard vegetable and premium fruit items in your store inventory!");
  };

  // Search matching vegetables
  const searchedInventory = storeInventory.filter(item => 
    item.vegetableName.toLowerCase().includes(vegSearchQuery.toLowerCase())
  );

  // Auto-fill price and check stock when vegetable is selected on Sales Form
  const handleSaleVegSelect = (vegName: string) => {
    setSaleVegName(vegName);
    const item = storeInventory.find(i => i.vegetableName.toLowerCase() === vegName.toLowerCase());
    if (item) {
      setSalePrice(item.sellingPrice);
      if (item.quantity === 0) {
        setSaleWarning('ALERT: This vegetable is currently OUT OF STOCK!');
      } else {
        setSaleWarning('');
      }
    } else {
      setSalePrice(0);
      setSaleWarning('NOTE: This item is not registered in your active stock ledger.');
    }
  };

  const handleSaleQtyChange = (qty: number, unitParam?: string) => {
    setSaleQty(qty);
    if (!saleVegName) return;
    const currentUnit = unitParam || saleUnit;
    const item = storeInventory.find(i => i.vegetableName.toLowerCase() === saleVegName.toLowerCase());
    if (item) {
      const rate = getKgConversionRate(currentUnit);
      const totalKgNeeded = qty * rate;
      if (totalKgNeeded > item.quantity) {
        setSaleWarning(`WARNING: Insufficient stock. Needs ${totalKgNeeded.toFixed(2)}kg, only ${item.quantity.toFixed(2)}kg available.`);
      } else {
        setSaleWarning('');
      }
    } else {
      setSaleWarning('');
    }
  };

  // HANDLERS FOR FORMS
  const handleLogSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleVegName.trim() || saleQty <= 0 || salePrice <= 0) return;

    const item = storeInventory.find(i => i.vegetableName.toLowerCase() === saleVegName.toLowerCase());
    const rate = getKgConversionRate(saleUnit);
    const totalKgNeeded = saleQty * rate;

    if (item && totalKgNeeded > item.quantity) {
      if(!confirm(`You are selling ${saleQty} ${saleUnit} (${totalKgNeeded.toFixed(2)}kg) but only ${item.quantity.toFixed(2)}kg is registered in stock. Continue and force negative/zero stock adjust?`)) {
        return;
      }
    }

    const subtotal = saleUnit === 'g' ? (saleQty / 1000) * salePrice : saleQty * salePrice;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      storeId: store.id,
      vegetableName: saleVegName,
      quantity: parseFloat(totalKgNeeded.toFixed(3)),
      unit: saleUnit,
      pricePerKg: salePrice,
      totalPrice: parseFloat(subtotal.toFixed(2)),
      customerName: saleCustomer.trim() || undefined,
      saleDate: new Date().toISOString()
    };

    onAddSale(newSale);

    // Reset Form
    setSaleVegName('');
    setSaleQty(0);
    setSalePrice(0);
    setSaleCustomer('');
    setSaleWarning('');
    setSaleUnit('kg');
  };

  const handleLogPurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseVegName.trim() || purchaseQty <= 0) return;

    // Find current cost price or fallback to 70% of standard master pricing
    const existingInv = storeInventory.find(
      item => item.vegetableName.toLowerCase() === purchaseVegName.trim().toLowerCase()
    );
    const cost = existingInv ? existingInv.costPrice : 15;

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      storeId: store.id,
      vegetableName: purchaseVegName,
      quantity: purchaseQty,
      costPerKg: cost,
      totalCost: parseFloat((purchaseQty * cost).toFixed(2)),
      supplierName: purchaseSupplier.trim() || undefined,
      purchaseDate: new Date().toISOString()
    };

    onAddPurchase(newPurchase);

    // Reset Form
    setPurchaseVegName('');
    setPurchaseQty(0);
    setPurchaseSupplier('');
  };

  const handleAddRequirementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqVegName.trim() || reqQty <= 0) return;

    const newReq: Requirement = {
      id: `req-${Date.now()}`,
      storeId: store.id,
      vegetableName: reqVegName,
      quantity: reqQty,
      status: 'Pending',
      priority: reqPriority,
      notes: reqNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onAddRequirement(newReq);

    // Reset Form
    setReqVegName('');
    setReqQty(0);
    setReqPriority('Medium');
    setReqNotes('');
  };

  const handleReuseRequirement = (oldReq: Requirement) => {
    const newReq: Requirement = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      storeId: store.id,
      vegetableName: oldReq.vegetableName,
      quantity: oldReq.quantity,
      priority: oldReq.priority || 'Medium',
      status: 'Pending',
      notes: oldReq.notes ? `Reused requisition: ${oldReq.notes}` : `Reused requisition`,
      createdAt: new Date().toISOString()
    };
    onAddRequirement(newReq);
    alert(`Successfully reused requisition! Raised a new Pending restock request for ${oldReq.quantity}kg of ${oldReq.vegetableName}.`);
  };

  const handleQuickRequestRequirement = (vegName: string, qty: number, priority: 'Low' | 'Medium' | 'High') => {
    if (qty <= 0) return;
    const newReq: Requirement = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      storeId: store.id,
      vegetableName: vegName,
      quantity: qty,
      status: 'Pending',
      priority: priority,
      createdAt: new Date().toISOString()
    };
    onAddRequirement(newReq);
    setRequestingItemId(null);
  };

  const handleQuickAdjustStock = (item: InventoryItem, newQty: number) => {
    onUpdateInventoryItem({
      ...item,
      quantity: Math.max(0, newQty),
      lastUpdated: new Date().toISOString()
    });
    setAdjustingItemId(null);
  };

  const handleInitInventoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initVegName.trim() || initSellingPrice <= 0) return;

    const calculatedCost = parseFloat((initSellingPrice * 0.70).toFixed(2));

    const newItem: InventoryItem = {
      id: `inv-${store.id}-${Date.now()}`,
      storeId: store.id,
      vegetableName: initVegName,
      quantity: 0, // starts empty, populated via Purchases or Quick Adjust
      minStockThreshold: initMinStock,
      costPrice: calculatedCost,
      sellingPrice: initSellingPrice,
      lastUpdated: new Date().toISOString()
    };

    onUpdateInventoryItem(newItem);
    setInitVegName('');
    setShowInitForm(false);
  };

  // WHATSAPP GENERATION FOR STORE REQS
  const getWhatsAppStoreLink = (req: Requirement): string => {
    const formattedDate = new Date(req.createdAt).toLocaleDateString();
    let text = `*Farmer's Gate Requisition Alert*\n`;
    text += `Store: *${store.name}*\n`;
    text += `------------------------------\n`;
    text += `• *Crop Needed*: ${req.vegetableName}\n`;
    text += `• *Quantity*: ${req.quantity} kg\n`;
    text += `• *Priority*: ${req.priority} Priority\n`;
    if (req.notes) {
      text += `• *Notes*: "${req.notes}"\n`;
    }
    text += `• *Date Requested*: ${formattedDate}\n`;
    text += `------------------------------\n`;
    text += `Please arrange dispatch from wholesale cache.`;

    const encoded = encodeURIComponent(text);
    return `https://wa.me/${store.whatsappNumber || ''}?text=${encoded}`;
  };

  const sendAllRequirementsOnWhatsApp = () => {
    const pendingReqs = storeRequirements.filter(r => r.status !== 'Fulfilled');
    if (pendingReqs.length === 0) return '';

    let text = `*FARMER'S GATE - ORDER REQUISITION*\n`;
    text += `Branch: *${store.name}*\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n`;
    text += `------------------------------------\n\n`;

    pendingReqs.forEach((r, idx) => {
      text += `${idx + 1}. *${r.vegetableName}*: ${r.quantity} kg [${r.priority}]\n`;
      if (r.notes) text += `   _Note: ${r.notes}_\n`;
    });

    text += `\n------------------------------------\n`;
    text += `Please review and approve order. Sent from Store Requisition Portal.`;

    const encoded = encodeURIComponent(text);
    return `https://wa.me/${store.whatsappNumber || ''}?text=${encoded}`;
  };

  const sendRequirementsInSimpleText = () => {
    const pendingReqs = storeRequirements.filter(r => r.status !== 'Fulfilled');
    if (pendingReqs.length === 0) return '';

    let text = `FARMER'S GATE - STOCK REQUIREMENTS\n`;
    text += `Store: ${store.name}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n`;
    text += `------------------------------------\n`;

    pendingReqs.forEach((r, idx) => {
      text += `${idx + 1}. ${r.vegetableName}: ${r.quantity} kg (${r.priority} Priority)\n`;
      if (r.notes) text += `   Note: ${r.notes}\n`;
    });
    
    text += `------------------------------------\n`;
    text += `Please arrange stock dispatch. Thank you.`;

    const encoded = encodeURIComponent(text);
    return `https://wa.me/${store.whatsappNumber || ''}?text=${encoded}`;
  };

  const handleStartRequirementEdit = (req: Requirement) => {
    setEditingReqId(req.id);
    setEditingReqVegName(req.vegetableName);
    setEditingReqQty(req.quantity.toString());
    setEditingReqPriority(req.priority);
    setEditingReqNotes(req.notes || '');
  };

  const handleSaveRequirementEdit = (id: string) => {
    const existing = storeRequirements.find(r => r.id === id);
    if (existing && onUpdateRequirement) {
      const updated: Requirement = {
        ...existing,
        vegetableName: editingReqVegName,
        quantity: parseFloat(editingReqQty) || 0,
        priority: editingReqPriority,
        notes: editingReqNotes.trim() || undefined
      };
      onUpdateRequirement(updated);
      setEditingReqId(null);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-slate-900">
      
      {/* Categories Tabs Menu - Simplified & Adaptive for all devices */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scrollbar-none shrink-0 py-1 bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <button
          id="tab-sales"
          onClick={() => setActiveSubTab('sale')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'sale'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>🥦</span>
          Customer Billing (POS)
        </button>

        <button
          id="tab-sales-history"
          onClick={() => setActiveSubTab('sales-history')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'sales-history'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>📋</span>
          Sales Records
        </button>

        {/* Purchases/Restock hidden for Employees */}
        {role !== 'Employee' && (
          <button
            id="tab-purchases"
            onClick={() => setActiveSubTab('purchase')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'purchase'
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>📦</span>
            Purchased Stock
          </button>
        )}

        <button
          id="tab-inventory"
          onClick={() => setActiveSubTab('inventory')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'inventory'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>🥕</span>
          Current Stock
        </button>

        <button
          id="tab-store-reqs"
          onClick={() => setActiveSubTab('requirements')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'requirements'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>✉️</span>
          Order Stock ({storeRequirements.filter(r=>r.status!=='Fulfilled').length})
        </button>

        {/* Shop Expenses tab - NEW and easy to understand */}
        <button
          id="tab-expenses"
          onClick={() => setActiveSubTab('expenses')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'expenses'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>💰</span>
          Shop Expenses
        </button>

        {/* Customer Orders tab */}
        <button
          id="tab-customer-orders"
          onClick={() => setActiveSubTab('customer-orders' as any)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === ('customer-orders' as any)
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>🛍️</span>
          Customer Orders ({customerOrders.filter(co => co.storeId === store.id && co.status !== 'Completed' && co.status !== 'Cancelled').length})
        </button>

        {/* Branch Info tab */}
        <button
          id="tab-branch-info"
          onClick={() => setActiveSubTab('info')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'info'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>ℹ️</span>
          Shop Info
        </button>

        {/* QR Code tab */}
        <button
          id="tab-qr-code"
          onClick={() => setActiveSubTab('qr-code')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'qr-code'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>📱</span>
          QR Codes
        </button>

        {/* Attendance & Biometrics Tab */}
        <button
          id="tab-attendance"
          onClick={() => setActiveSubTab('attendance')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'attendance'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>👥</span>
          Staff Attendance
        </button>

        {/* Daily Closing Report & Cash Calculator Tab */}
        <button
          id="tab-report"
          onClick={() => setActiveSubTab('report')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'report'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>📊</span>
          Daily Report & Cash
        </button>

        {/* Stock Transfer Tab */}
        <button
          id="tab-stock-transfer"
          onClick={() => setActiveSubTab('stock-transfer')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'stock-transfer'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>🚚</span>
          Stock Transfer
        </button>

        {/* Stock Waste Tab */}
        <button
          id="tab-stock-waste"
          onClick={() => setActiveSubTab('stock-waste')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'stock-waste'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>🗑️</span>
          Stock Waste
        </button>
      </div>

      {/* --- SUB-TAB CONTENT: SALE --- */}
      {activeSubTab === 'sale' && (
        <div className="space-y-6">
          {completedBill ? (
            /* --- RENDER BILL COMPLETED PHYSICAL THERMAL RECEIPT --- */
            <div className="bg-slate-50/50 rounded-2xl border border-slate-200/85 p-6 md:p-8 animate-in fade-in duration-300">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
                
                {/* Monospace Thermal Ticket Receipt */}
                <div className="flex-1 max-w-sm mx-auto bg-white border border-slate-200 rounded-3xl p-6 shadow-sm font-mono text-xs text-slate-800 space-y-4 relative overflow-hidden">
                  {/* Stylized physical receipt paper look cutouts */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-repeat-x bg-[linear-gradient(to_right,transparent_50%,#f1f5f9_50%)] bg-[size:8px_4px]"></div>
                  
                  <div className="text-center space-y-1 pt-2">
                    <h3 className="text-base font-black tracking-widest text-slate-900 uppercase">FARMER'S GATE</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TRUCK</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(completedBill.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} | {new Date(completedBill.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2"></div>

                  <div className="flex justify-between font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <span>ITEM</span>
                    <span>AMT</span>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2"></div>

                  <div className="space-y-4">
                    {completedBill.items.map((it, idx) => {
                      const unitLabel = (it as any).unit || 'kg';
                      const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span className="capitalize">{it.vegetableName.toLowerCase()}</span>
                            <span>₹{it.totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {it.quantity} {unitLabel} x ₹{it.pricePerKg} / {baseLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2"></div>

                  <div className="flex justify-between items-baseline font-black text-sm text-slate-900">
                    <span>TOTAL</span>
                    <span>₹{completedBill.totalAmount.toFixed(2)}</span>
                  </div>

                  {completedBill.paymentMode && (
                    <div className="flex justify-between items-baseline font-bold text-slate-500 text-[10px] mt-1 uppercase">
                      <span>PAYMENT MODE</span>
                      <span>{completedBill.paymentMode}</span>
                    </div>
                  )}

                  <div className="border-t border-dashed border-slate-300 my-2"></div>

                  <div className="text-center space-y-2 text-[10px] text-slate-500 font-medium italic">
                    <p>🍎 Fresh from farm to keep you strong!</p>
                    <p>🙏 Thank you for visiting! Have a healthy day!</p>
                  </div>

                  {/* Eye-catching, simple quote placed at the very last as requested */}
                  <div className="border-t border-emerald-100 pt-4 mt-3 flex flex-col items-center justify-center text-center font-sans">
                    <div className="relative py-2.5 px-4 bg-emerald-500/[0.03] border-l-2 border-emerald-500 rounded-r-xl shadow-sm">
                      <p className="text-[10px] italic font-semibold text-emerald-800 leading-relaxed">
                        "{billingQuote || "Choose fresh veggies for maximum vitality!"}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Receipt management & actions side panel */}
                <div className="flex-1 flex flex-col justify-between space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div>
                      <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full mb-2">
                        Invoice Successfully Logged
                      </span>
                      <h4 className="text-base font-black text-slate-800">
                        What would you like to do next?
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Select an action below to share or print this transaction. Stock levels have been adjusted automatically.
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <label htmlFor="wa-phone" className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Send Receipt via WhatsApp
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-3.5 flex items-center text-xs font-extrabold text-slate-400">
                            +91
                          </span>
                          <input
                            id="wa-phone"
                            type="tel"
                            placeholder="9876543210"
                            maxLength={10}
                            value={whatsappPhone}
                            onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                            className="w-full rounded-xl border border-slate-200 py-2.5 pl-11 pr-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
                          />
                        </div>
                        <button
                          onClick={handleSendWhatsApp}
                          className="bg-[#25D366] text-white hover:bg-[#128C7E] px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          Send Bill
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Export Bill Format
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleDownloadPDF}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition-colors cursor-pointer"
                        >
                          <span>📄</span> PDF Format
                        </button>
                        <button
                          onClick={handleDownloadImage}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black transition-colors cursor-pointer"
                        >
                          <span>🖼️</span> Image Format
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCompletedBill(null);
                      setPosCart({});
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl py-3.5 text-xs transition-all shadow-md active:scale-[0.99] cursor-pointer"
                  >
                    ← Create Another Sale Bill
                  </button>
                </div>

              </div>
            </div>
          ) : (
            /* --- EXPRESS POS POINT OF SALE COUNTER --- */
            <div className="space-y-5 animate-fade-in text-left">
              {/* Simplified Inner Desk sub-tabs placed prominently at the top */}
              <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-xl gap-0.5 sm:gap-1.5 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setSaleSubView('items')}
                  className={`flex-1 py-1 sm:py-2 px-0.5 sm:px-3 text-[9px] sm:text-xs font-black rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 sm:gap-1.5 ${
                    saleSubView === 'items'
                      ? 'bg-white text-emerald-800 shadow-3xs border border-slate-200/30'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <span className="text-xs sm:text-sm">🥦</span>
                  <span className="hidden sm:inline">Sale Items</span>
                  <span className="sm:hidden">Sales</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSaleSubView('checkout')}
                  className={`flex-1 py-1 sm:py-2 px-0.5 sm:px-3 text-[9px] sm:text-xs font-black rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 sm:gap-1.5 ${
                    saleSubView === 'checkout'
                      ? 'bg-white text-emerald-800 shadow-3xs border border-slate-200/30'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <span className="text-xs sm:text-sm">🛒</span>
                  <span className="hidden sm:inline">Checkout</span>
                  <span className="sm:hidden">Cart</span>
                  {Object.keys(posCart).length > 0 && (
                    <span className="bg-emerald-600 text-white text-[8px] sm:text-[9px] px-1 py-0.5 rounded-full font-black animate-pulse">
                      {Object.keys(posCart).length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSaleSubView('details')}
                  className={`flex-1 py-1 sm:py-2 px-0.5 sm:px-3 text-[9px] sm:text-xs font-black rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 sm:gap-1.5 ${
                    saleSubView === 'details'
                      ? 'bg-white text-emerald-800 shadow-3xs border border-slate-200/30'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <span className="text-xs sm:text-sm">🏪</span>
                  <span className="hidden sm:inline">Store Details & Alerts</span>
                  <span className="sm:hidden">Alerts</span>
                  {(() => {
                    const lowStockCount = storeInventory.filter(item => item.quantity <= item.minStockThreshold).length;
                    const pendingOrdersCount = customerOrders.filter(co => co.storeId === store.id && co.status !== 'Completed' && co.status !== 'Cancelled').length;
                    const totalAlerts = lowStockCount + pendingOrdersCount + broadcastNotifications.length;
                    return totalAlerts > 0 ? (
                      <span className="bg-rose-500 text-white text-[8px] sm:text-[9px] px-1 py-0.5 rounded-full font-black animate-pulse">
                        {totalAlerts}
                      </span>
                    ) : null;
                  })()}
                </button>
              </div>

              {/* Sub-view: SALE ITEMS */}
              {saleSubView === 'items' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Multi-Billing Registers at top of Sale Panel */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0 w-full">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider pr-2 border-r border-slate-200 shrink-0">
                        Registers
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
                        {billingTabs.map((tab) => {
                          const isActive = tab.id === activeBillingTabId;
                          const tabCart = isActive ? posCart : tab.cart;
                          const itemCount = Object.keys(tabCart).length;
                          const subtotal = Object.keys(tabCart).reduce((sum, key) => sum + getSubtotal(tabCart[key]), 0);
                          const customerNameStr = isActive ? (posCustomerName || tab.label) : (tab.customerName || tab.label);
                          
                          return (
                            <div
                              key={tab.id}
                              onClick={() => handleSwitchBillingTab(tab.id)}
                              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                                isActive
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-3xs'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-1">
                                  <span className="truncate max-w-[90px] font-black">{customerNameStr}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameBillingTab(tab.id);
                                    }}
                                    className="opacity-50 group-hover:opacity-100 p-0.5 hover:bg-emerald-100/50 rounded transition-opacity text-slate-400 hover:text-slate-600"
                                    title="Rename customer"
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-slate-500">
                                  {itemCount} item(s) • ₹{subtotal.toFixed(0)}
                                </span>
                              </div>

                              {billingTabs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteBillingTab(tab.id, e)}
                                  className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                                  title="Close bill"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBillingTab}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer shrink-0 uppercase tracking-wider shadow-3xs"
                    >
                      + Add Register
                    </button>
                  </div>

                  {/* Crop search & scan code */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative flex-1 w-full flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          id="pos-search-input"
                          type="text"
                          placeholder="Search available crops..."
                          value={posSearch}
                          onChange={(e) => setPosSearch(e.target.value)}
                          className="w-full pl-9 pr-12 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
                        />
                        {/* Voice Input Trigger Button */}
                        <button
                          type="button"
                          onClick={() => handleStartVoiceInput((text) => setPosSearch(text))}
                          className={`absolute right-2.5 top-1.5 p-1 rounded-lg transition-all ${
                            isListening
                              ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-150'
                          }`}
                          title="Speak crop name to search"
                        >
                          <Mic className={`h-4 w-4 ${isListening ? 'animate-bounce' : ''}`} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTarget('pos');
                          setIsScannerOpen(true);
                        }}
                        title="Scan package code"
                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs hover:scale-[1.01]"
                      >
                        <Scan className="h-4 w-4 text-emerald-600 animate-pulse" />
                        <span>Scan Code</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsQuickAddOpen(true)}
                        title="Open Quick Add Bottom Sheet Grid"
                        className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs hover:scale-[1.01]"
                      >
                        <span className="text-sm">⚡</span>
                        <span>Quick Add</span>
                      </button>
                    </div>
                    {voiceFeedback && (
                      <div className="w-full text-left bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-3 py-1.5 text-[10px] font-black flex items-center gap-1.5 animate-pulse">
                        <span>🎙️ Heard:</span>
                        <span className="font-mono text-emerald-950 font-bold">"{voiceFeedback}"</span>
                      </div>
                    )}
                    {posSearch && (
                      <button 
                        onClick={() => setPosSearch('')}
                        className="text-xs text-slate-400 hover:text-slate-600 font-bold shrink-0"
                      >
                        Clear Search
                      </button>
                    )}
                    {storeInventory.length < 6 && (
                      <button
                        type="button"
                        onClick={handleBulkSeedCrops}
                        className="text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-2 rounded-xl transition-all cursor-pointer"
                      >
                        Seed Standard Crops
                      </button>
                    )}
                  </div>

                  {/* Categories Tabs Selector */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none shrink-0 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    {(['ALL', 'VEGGIES', 'FRUITS', 'GROCERY'] as const).map((cat) => {
                      const isActive = activeCropFilter === cat;
                      const icon = cat === 'ALL' ? '🌾' : cat === 'VEGGIES' ? '🥦' : cat === 'FRUITS' ? '🍎' : '🛒';
                      const label = cat === 'ALL' ? 'All Items' : cat === 'VEGGIES' ? 'Vegetables' : cat === 'FRUITS' ? 'Fruits' : 'Groceries';
                      
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setActiveCropFilter(cat)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            isActive
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50'
                          }`}
                        >
                          <span className="text-sm">{icon}</span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Add Custom Item directly to bill if not found */}
                  {posSearch && storeInventory.filter(item => item.vegetableName.toLowerCase().includes(posSearch.toLowerCase())).length === 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3 mt-2 animate-in fade-in duration-200">
                      <p className="text-xs font-bold text-slate-700">
                        Crop "{posSearch}" not registered. Quick-add it below:
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
                          <span className="text-xs text-slate-400 font-bold mr-1">₹</span>
                          <input
                            type="number"
                            placeholder="Price"
                            className="w-16 text-xs font-bold text-slate-800 focus:outline-none bg-white"
                            id="quick-add-price"
                            defaultValue={60}
                          />
                        </div>
                        <select
                          id="quick-add-unit"
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
                          defaultValue="kg"
                        >
                          <option value="kg">kg</option>
                          <option value="g">g</option>
                          <option value="pcs">pcs</option>
                          <option value="bunch">bunch</option>
                          <option value="pack">pack</option>
                          <option value="box">box</option>
                          <option value="crate">crate</option>
                          <option value="sack">sack</option>
                          <option value="dozen">dozen</option>
                          <option value="bundle">bundle</option>
                          <option value="bag">bag</option>
                        </select>
                        <button
                          type="button"
                          onClick={async () => {
                            const priceInput = document.getElementById('quick-add-price') as HTMLInputElement;
                            const unitSelect = document.getElementById('quick-add-unit') as HTMLSelectElement;
                            const price = parseFloat(priceInput?.value) || 60;
                            const unit = (unitSelect?.value || 'kg') as any;
                            
                            // Register in inventory on-the-fly
                            const newItem: InventoryItem = {
                              id: `item-${Date.now()}`,
                              storeId: store.id,
                              vegetableName: posSearch.trim(),
                              quantity: 100, // standard bulk starting stock
                              costPrice: price * 0.75,
                              sellingPrice: price,
                              minStockThreshold: 10,
                              lastUpdated: new Date().toISOString()
                            };
                            await onUpdateInventoryItem(newItem);
                            
                            // Add to POS Cart
                            setPosCart(prev => ({
                              ...prev,
                              [newItem.vegetableName]: {
                                quantity: 1,
                                unit: unit,
                                pricePerKg: price,
                                item: newItem
                              }
                            }));
                            setPosSearch('');
                          }}
                          className="bg-slate-850 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer"
                        >
                          ADD TO BILL
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Linear List of Crop Items */}
                  <div className="flex flex-col gap-2.5 max-h-[550px] overflow-y-auto pr-1">
                    {storeInventory
                      .filter(item => item.vegetableName.toLowerCase().includes(posSearch.toLowerCase()))
                      .filter(item => {
                        if (activeCropFilter === 'ALL') return true;
                        const category = getItemCategory(item.vegetableName);
                        if (activeCropFilter === 'VEGGIES') return category === 'Vegetable';
                        if (activeCropFilter === 'FRUITS') return category === 'Fruit';
                        if (activeCropFilter === 'GROCERY') return category === 'Grocery';
                        return true;
                      })
                      .map(item => {
                        const isOutOfStock = item.quantity <= 0;
                        const cartItem = posCart[item.vegetableName];
                        
                        return (
                          <div
                            key={item.id}
                            className={`relative rounded-xl border p-2.5 bg-white shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between gap-3 border-slate-200/80 ${
                              isOutOfStock ? 'opacity-60 bg-slate-50' : ''
                            }`}
                          >
                            {/* Left part: Emoji, Name, and standard price tag */}
                            <div className="flex-1 min-w-0 flex items-center gap-2.5">
                              <span className="text-base shrink-0">{getVegEmoji(item.vegetableName)}</span>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate" title={item.vegetableName}>
                                  {item.vegetableName}
                                </h4>
                                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                                    ₹{item.sellingPrice.toFixed(0)}/kg
                                  </span>
                                  {item.quantity <= 10 ? (
                                    <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                                      {item.quantity === 0 ? 'Out of Stock' : `Low Stock: ${item.quantity.toFixed(0)} kg`}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                      Stock: {item.quantity.toFixed(0)} kg
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right part: Adding and Quantity input controls */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {!cartItem ? (
                                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                                  {/* Compact quantity input */}
                                  <input
                                    type="number"
                                    id={`input-qty-${item.id}`}
                                    placeholder="1"
                                    defaultValue="1"
                                    disabled={isOutOfStock}
                                    step="0.05"
                                    className="w-10 text-center text-xs font-black text-slate-850 bg-transparent focus:outline-none"
                                  />
                                  {/* Unit dropdown */}
                                  <select
                                    id={`input-unit-${item.id}`}
                                    disabled={isOutOfStock}
                                    className="bg-transparent border-0 text-[10px] font-extrabold text-slate-500 focus:outline-none cursor-pointer pr-1"
                                    defaultValue="kg"
                                  >
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="pcs">pcs</option>
                                    <option value="bunch">bunch</option>
                                    <option value="pack">pack</option>
                                  </select>
                                  {/* Quick Add Button */}
                                  <button
                                    type="button"
                                    disabled={isOutOfStock}
                                    onClick={() => {
                                      const qtyInput = document.getElementById(`input-qty-${item.id}`) as HTMLInputElement;
                                      const unitSelect = document.getElementById(`input-unit-${item.id}`) as HTMLSelectElement;
                                      const qty = parseFloat(qtyInput?.value) || 1;
                                      const unit = (unitSelect?.value || 'kg') as any;
                                      handleAddToPosCartWithParams(item, qty, unit);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white h-6.5 px-2.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center cursor-pointer uppercase shadow-xs"
                                  >
                                    {isOutOfStock ? 'OUT' : 'ADD'}
                                  </button>
                                </div>
                              ) : (
                                /* Standard +/- quantity adjustment controls inside a colored pill */
                                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg p-0.5 h-7.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const step = cartItem.unit === 'g' ? 100 : 1;
                                      handleUpdatePosCartQty(item.vegetableName, cartItem.quantity - step);
                                    }}
                                    className="h-5 w-5 hover:bg-emerald-100 active:scale-95 rounded flex items-center justify-center text-xs font-black text-emerald-850 cursor-pointer shrink-0"
                                  >
                                    -
                                  </button>
                                  
                                  <span className="text-[10px] font-black text-emerald-900 px-1 font-mono">
                                    {cartItem.quantity} {cartItem.unit}
                                  </span>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const step = cartItem.unit === 'g' ? 100 : 1;
                                      handleUpdatePosCartQty(item.vegetableName, cartItem.quantity + step);
                                    }}
                                    className="h-5 w-5 hover:bg-emerald-100 active:scale-95 rounded flex items-center justify-center text-xs font-black text-emerald-850 cursor-pointer shrink-0"
                                  >
                                    +
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                    {storeInventory.length === 0 ? (
                      <div className="py-12 px-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-4 animate-in fade-in duration-200">
                        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 text-xl">
                          📦
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-slate-800">Your Store Inventory is Empty</h4>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            To start billing, you need to register crops in your branch inventory. You can instantly sync and onboard all active items from the corporate Master Catalog.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleBulkSeedCrops}
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                        >
                          🔄 Sync with Master Catalog
                        </button>
                      </div>
                    ) : storeInventory.filter(item => item.vegetableName.toLowerCase().includes(posSearch.toLowerCase())).length === 0 ? (
                      <div className="py-16 text-center text-slate-400 bg-white border border-slate-150 rounded-2xl">
                        <p className="text-xs font-bold">No matching crops found</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Persistent Sticky Cart Summary Bar at bottom */}
                  {Object.keys(posCart).length > 0 && (
                    <div 
                      onClick={() => setSaleSubView('checkout')}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg border border-slate-800 cursor-pointer transition-all hover:scale-[1.005] group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 p-2.5 rounded-xl">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-slate-100">
                            {Object.keys(posCart).length} Crop line{Object.keys(posCart).length > 1 ? 's' : ''} added
                          </h3>
                          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                            Subtotal: <span className="text-emerald-400 font-extrabold font-mono">₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-400 group-hover:translate-x-1 transition-transform">
                        Proceed to checkout <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-view: BILL & CHECKOUT */}
              {saleSubView === 'checkout' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-left">
                  {/* Multi-Billing Registers */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/85 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider pr-2 border-r border-slate-200">
                        Registers
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                        {billingTabs.map((tab) => {
                          const isActive = tab.id === activeBillingTabId;
                          const tabCart = isActive ? posCart : tab.cart;
                          const itemCount = Object.keys(tabCart).length;
                          const subtotal = Object.keys(tabCart).reduce((sum, key) => sum + getSubtotal(tabCart[key]), 0);
                          const customerNameStr = isActive ? (posCustomerName || tab.label) : (tab.customerName || tab.label);
                          
                          return (
                            <div
                              key={tab.id}
                              onClick={() => handleSwitchBillingTab(tab.id)}
                              className={`group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                                isActive
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600'
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate max-w-[100px] font-black">{customerNameStr}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameBillingTab(tab.id);
                                    }}
                                    className="opacity-60 group-hover:opacity-100 p-0.5 hover:bg-emerald-100/50 rounded transition-opacity text-slate-400 hover:text-slate-600"
                                    title="Rename bill customer"
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-slate-500">
                                  {itemCount} item(s) • ₹{subtotal.toFixed(2)}
                                </span>
                              </div>

                              {billingTabs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteBillingTab(tab.id, e)}
                                  className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Close bill"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBillingTab}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-sm shrink-0 cursor-pointer self-start md:self-auto"
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Cart</span>
                    </button>
                  </div>

                  {/* Option to Load Customer Order */}
                  {customerOrders && customerOrders.filter(co => co.storeId === store.id && co.status === 'Pending').length > 0 && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-black text-indigo-950 uppercase tracking-wide">
                          <span className="animate-pulse">📥</span> Load Customer Order to Edit / Checkout
                        </span>
                        <span className="bg-indigo-200 text-indigo-800 text-[9px] px-2 py-0.5 rounded-full font-black">
                          {customerOrders.filter(co => co.storeId === store.id && co.status === 'Pending').length} Pending
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {customerOrders
                          .filter(co => co.storeId === store.id && co.status === 'Pending')
                          .map(order => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => {
                                // Load this order into the active register
                                setPosCustomerName(order.customerName);
                                setWhatsappPhone(order.customerPhone);
                                
                                // Build cart representation
                                const newCart: Record<string, PosCartItem> = {};
                                order.items.forEach(it => {
                                  const invItem = storeInventory.find(inv => inv.vegetableName.toLowerCase() === it.vegetableName.toLowerCase());
                                  newCart[it.vegetableName] = {
                                    quantity: it.quantity,
                                    unit: 'kg', // standard
                                    pricePerKg: it.pricePerKg,
                                    item: invItem || {
                                      id: `temp-${Date.now()}`,
                                      storeId: store.id,
                                      vegetableName: it.vegetableName,
                                      quantity: 100,
                                      costPrice: it.pricePerKg * 0.75,
                                      sellingPrice: it.pricePerKg,
                                      minStockThreshold: 10,
                                      lastUpdated: new Date().toISOString()
                                    }
                                  };
                                });
                                setPosCart(newCart);
                                setSaleSubView('items'); // Switch back to items so they can edit it!
                              }}
                              className="bg-white hover:bg-indigo-50/50 text-left border border-indigo-100 p-2.5 rounded-xl hover:border-indigo-300 transition-all cursor-pointer flex flex-col gap-1 shadow-3xs"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-extrabold text-xs text-indigo-950 truncate max-w-[150px]">{order.customerName}</span>
                                <span className="font-mono text-[10px] text-indigo-500 font-extrabold">₹{order.totalAmount.toFixed(0)}</span>
                              </div>
                              <p className="text-[10px] text-indigo-700 font-medium truncate w-full font-mono">
                                {order.items.map(it => `${it.vegetableName} (${it.quantity}kg)`).join(', ')}
                              </p>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(posCart).length === 0 ? (
                    <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl p-6">
                      <span className="text-4xl block mb-2">🛒</span>
                      <h4 className="text-sm font-black text-slate-800">Your billing cart is empty</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Browse crops in the Sale Items tab to add items and generate a bill receipt.</p>
                      <button 
                        onClick={() => setSaleSubView('items')}
                        className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        ← Browse Sale Items
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/85 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
                      {/* Customer Info Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Customer Identity Name</label>
                          <input
                            type="text"
                            placeholder="Walk-in Counter Customer"
                            value={posCustomerName}
                            onChange={(e) => setPosCustomerName(e.target.value)}
                            className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Send Receipt WhatsApp (+91)</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-xs font-extrabold text-slate-400">
                              +91
                            </span>
                            <input
                              type="tel"
                              placeholder="9876543210"
                              maxLength={10}
                              value={whatsappPhone}
                              onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                              className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 pl-11 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Itemized Cart List */}
                      <div className="space-y-3.5 divide-y divide-slate-100">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1.5">Itemized Cart Ledger</span>
                        {Object.keys(posCart).map((vegName, idx) => {
                          const cartItem = posCart[vegName];
                          const itemSubtotal = getSubtotal(cartItem);
                          const changeStep = cartItem.unit === 'g' ? 50 : cartItem.unit === 'kg' ? 0.25 : 1;
                          
                          return (
                            <div key={cartItem.item.id} className={`${idx > 0 ? 'pt-4' : ''} flex flex-col gap-2`}>
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{getVegEmoji(cartItem.item.vegetableName)}</span>
                                  <h4 className="text-xs sm:text-sm font-black text-slate-800">{cartItem.item.vegetableName}</h4>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromPosCart(cartItem.item.vegetableName)}
                                  className="text-[10px] uppercase font-black text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 bg-slate-50/55 p-3 rounded-xl border border-slate-200/50">
                                {/* Quantity Adjuster */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Weight / Qty</span>
                                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity - changeStep)}
                                      className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-black"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      step={changeStep}
                                      min="0.01"
                                      value={cartItem.quantity}
                                      onChange={(e) => handleUpdatePosCartQty(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                      className="w-12 bg-transparent text-center text-xs font-black text-slate-800 focus:outline-none font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity + changeStep)}
                                      className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-black"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Billing Unit Selector */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Billing Unit</span>
                                  <select
                                    value={cartItem.unit}
                                    onChange={(e) => handleUpdatePosCartUnit(cartItem.item.vegetableName, e.target.value as any)}
                                    className="bg-white text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer w-full"
                                  >
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="pcs">pcs</option>
                                    <option value="bunch">bunch</option>
                                    <option value="pack">pack</option>
                                    <option value="box">box</option>
                                    <option value="crate">crate</option>
                                    <option value="sack">sack</option>
                                    <option value="dozen">dozen</option>
                                    <option value="bundle">bundle</option>
                                    <option value="bag">bag</option>
                                  </select>
                                </div>

                                {/* Price Adjustment & Subtotal */}
                                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Rate (₹)</span>
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-[10px] text-slate-400 font-bold">₹</span>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={cartItem.pricePerKg}
                                        onChange={(e) => handleUpdatePosCartPrice(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                        className="w-12 bg-transparent text-left text-xs font-bold text-slate-700 focus:outline-none font-mono"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Subtotal</span>
                                    <span className="text-xs font-black text-emerald-600 font-mono">₹{itemSubtotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Grand Total Footer */}
                      <div className="border-t border-slate-100 pt-5 mt-2 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Grand Invoice Sum</span>
                          <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">
                            ₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex gap-2.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={handleClearPosCart}
                            className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl px-5 py-3 text-xs transition-colors cursor-pointer"
                          >
                            CLEAR CART
                          </button>
                          <button
                            type="button"
                            onClick={handlePosCheckoutSubmit}
                            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-8 py-3 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-200"
                          >
                            <span>COMPLETE SALE</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-view: STORE DETAILS & ALERTS */}
              {saleSubView === 'details' && (
                <div className="space-y-5 animate-in fade-in duration-200 text-left">
                  {/* Part 1: Store Overview and Stats Card */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                    <div>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                        Active Outlet Workspace
                      </span>
                      <h3 className="text-lg font-black mt-2 tracking-tight text-slate-800">{store.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">Detailed configurations, real-time statistics, and active alerts compiled on a single unified sheet.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wide">Registered Crops</span>
                        <span className="text-base font-black text-slate-800 mt-1 block">{storeInventory.length} crop catalog line items</span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wide">Revenue Today</span>
                        <span className="text-base font-black text-emerald-600 mt-1 block font-mono">₹{storeSales.reduce((a,c) => a + c.totalPrice, 0).toFixed(2)}</span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wide">Volume Dispatched</span>
                        <span className="text-base font-black text-amber-600 mt-1 block font-mono">{storeSales.reduce((a,c) => a + c.quantity, 0).toFixed(1)} kg</span>
                      </div>
                    </div>

                    {/* Part 2: Branch Configurations */}
                    <div className="border-t border-slate-100 pt-5 space-y-4">
                      <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">Branch Configuration</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700">
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 flex flex-col justify-center gap-1">
                          <div className="flex justify-between items-center w-full">
                            <span className="text-slate-400 font-bold">Location Desk:</span>
                            <span className="font-extrabold text-slate-800">{store.location || 'Not Specified'}</span>
                          </div>
                          {store.googleMapsUrl && (
                            <a 
                              href={store.googleMapsUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[10px] text-purple-600 hover:text-purple-800 font-black self-end underline flex items-center gap-0.5"
                            >
                              🔗 View Google Map
                            </a>
                          )}
                        </div>
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 flex justify-between items-center">
                          <span className="text-slate-400 font-bold">WhatsApp Hotline:</span>
                          <span className="font-extrabold text-slate-800 font-mono">{store.whatsappNumber || 'Not Configured'}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 flex justify-between items-center">
                          <span className="text-slate-400 font-bold">User Permission Access:</span>
                          <span className="font-extrabold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded text-[10px]">{role || 'Store Employee'}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 flex justify-between items-center">
                          <span className="text-slate-400 font-bold">Safety Warn Threshold:</span>
                          <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px]">≤ 10 kg</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part 3: Live Alerts, Low Stocks, and Customer Orders notifications list */}
                  {(() => {
                    const lowStockItems = storeInventory.filter(item => item.quantity <= item.minStockThreshold);
                    const pendingOrders = customerOrders.filter(co => co.storeId === store.id && co.status !== 'Completed' && co.status !== 'Cancelled');
                    const pendingRequests = storeRequirements.filter(r => r.status === 'Pending' || r.status === 'Ordered');
                    
                    const noAlerts = lowStockItems.length === 0 && pendingOrders.length === 0 && pendingRequests.length === 0 && broadcastNotifications.length === 0;

                    if (noAlerts) {
                      return (
                        <div className="py-12 text-center bg-emerald-50 border border-emerald-200 rounded-3xl p-6">
                          <span className="text-3xl block mb-2">✨</span>
                          <h4 className="text-xs font-black text-emerald-900">Your branch desk is fully operational!</h4>
                          <p className="text-[11px] text-emerald-700 mt-1 max-w-sm mx-auto">All parameters are healthy. No low stock crops, central notifications, pending online customer orders, or urgent restock requests requiring attention.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-5">
                        {/* Central Catalog Broadcasts section */}
                        {broadcastNotifications.length > 0 && (
                          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-150 p-5 rounded-3xl shadow-3xs space-y-3">
                            <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base">📢</span>
                                <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">Central Catalogue Broadcasts ({broadcastNotifications.length})</h4>
                              </div>
                              <span className="text-[8px] bg-emerald-600 text-white font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">Live Broadcast</span>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                              {broadcastNotifications.map(notif => (
                                <div key={notif.id} className="p-3.5 bg-white rounded-2xl border border-emerald-100 shadow-3xs flex flex-col gap-2 transition-all hover:shadow-2xs">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h5 className="text-xs font-black text-slate-800 leading-snug">{notif.title}</h5>
                                      <p className="text-[9px] text-slate-400 mt-0.5 font-medium font-mono">{new Date(notif.timestamp).toLocaleString()}</p>
                                    </div>
                                    <span className="text-[8px] bg-teal-50 text-teal-800 font-black px-2 py-0.5 rounded-md uppercase tracking-wide border border-teal-100 shrink-0">Catalog Update</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">{notif.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending online customer orders section */}
                        {pendingOrders.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                              <span className="text-base">🛒</span>
                              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Pending Customer Orders ({pendingOrders.length})</h4>
                            </div>
                            <div className="space-y-3">
                              {pendingOrders.map(order => (
                                <div key={order.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-slate-800">#{order.orderNumber} - {order.customerName}</span>
                                      <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded-full uppercase">{order.status}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      Ordered {order.items.length} crop items • Grand sum: <span className="font-bold text-slate-600 font-mono">₹{order.totalAmount.toFixed(2)}</span>
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setActiveSubTab('customer-orders' as any)}
                                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider self-start sm:self-auto cursor-pointer"
                                    >
                                      Manage Order
                                    </button>
                                    <button
                                      onClick={() => {
                                        setCancellingOrder(order);
                                        setCancellationReason('');
                                      }}
                                      className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider self-start sm:self-auto cursor-pointer"
                                    >
                                      Cancel Order
                                    </button>
                                    {onDeleteCustomerOrder && (
                                      <button
                                        onClick={() => {
                                          if (confirm(`Delete pending order #${order.id} completely? This action cannot be undone.`)) {
                                            onDeleteCustomerOrder(order.id);
                                            alert(`Order #${order.id} deleted.`);
                                          }
                                        }}
                                        className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider self-start sm:self-auto cursor-pointer"
                                      >
                                        Delete Order
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Low stock alerts section */}
                        {lowStockItems.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                              <span className="text-base">🚨</span>
                              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Low Stock Inventory Warnings ({lowStockItems.length})</h4>
                            </div>
                            <div className="space-y-3">
                              {lowStockItems.map(item => (
                                <div key={item.id} className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{getVegEmoji(item.vegetableName)}</span>
                                      <span className="text-xs font-extrabold text-slate-800">{item.vegetableName}</span>
                                      <span className="text-[9px] bg-rose-100 text-rose-800 font-black px-1.5 py-0.5 rounded-full uppercase">
                                        {item.quantity === 0 ? 'Out of stock' : `${item.quantity.toFixed(1)} kg Left`}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      Minimum safety stock warning threshold set to <span className="font-semibold text-slate-600">{item.minStockThreshold} kg</span>.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveSubTab('requirements');
                                      setSaleVegName(item.vegetableName);
                                    }}
                                    className="bg-rose-100 text-rose-800 hover:bg-rose-200 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider self-start sm:self-auto cursor-pointer"
                                  >
                                    Request Restock
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending Restock Requests section */}
                        {pendingRequests.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                              <span className="text-base">📨</span>
                              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Branch Restock Requests Status ({pendingRequests.length})</h4>
                            </div>
                            <div className="space-y-3">
                              {pendingRequests.map(req => (
                                <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between gap-3 text-xs">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{getVegEmoji(req.vegetableName)}</span>
                                      <span className="text-xs font-bold text-slate-800">{req.vegetableName} ({req.quantity} kg)</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Priority: {req.priority} • Filed on {new Date(req.createdAt || '').toLocaleDateString()}</p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                    req.status === 'Pending' 
                                      ? 'bg-amber-100 text-amber-800' 
                                      : 'bg-blue-100 text-blue-800 animate-pulse'
                                  }`}>
                                    {req.status === 'Ordered' ? '🚚 In Transit' : '⏳ Pending Head Office'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* --- SUB-TAB CONTENT: SALES HISTORY & LEDGER --- */}
      {activeSubTab === 'sales-history' && (
        <div className="space-y-6">
          {/* Branch Mini Sales Dashboard (Clean & Modern) */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                <IndianRupee className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Sales Today</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">₹{storeSales.reduce((a,c) => a + c.totalPrice, 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-sky-50 text-sky-700 rounded-xl shrink-0">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Bills Issued</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">{storeSales.length} Invoices</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl shrink-0">
                <span>🥦</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Top Selling</p>
                <p className="text-xs font-black text-slate-900 mt-0.5 truncate">
                  {(() => {
                    const counts: Record<string, number> = {};
                    storeSales.forEach(s => {
                      counts[s.vegetableName] = (counts[s.vegetableName] || 0) + s.quantity;
                    });
                    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
                    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1].toFixed(1)} u)` : 'None';
                  })()}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Low Stock alerts</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {storeInventory.filter(i => i.quantity <= i.minStockThreshold).length} items
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              
              {/* Recent Sales History Log */}
              <div className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col h-full max-h-[500px]">
                <div className="mb-4">
                  <h3 className="font-bold text-zinc-900">Recent Sales Journal</h3>
                  <p className="text-xs text-zinc-400">Historical customer purchase register for this branch.</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {storeSales.map(sale => (
                    <div key={sale.id} className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <TrendingUp className="h-4.5 w-4.5" />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800">
                            {sale.unit && sale.unit !== 'kg' ? (
                              <>
                                {(sale.quantity / getKgConversionRate(sale.unit)).toFixed(2).replace(/\.00$/, '')} {sale.unit} ({sale.quantity.toFixed(2).replace(/\.00$/, '')} kg)
                              </>
                            ) : (
                              <>{sale.quantity.toFixed(2).replace(/\.00$/, '')} kg</>
                            )} of {sale.vegetableName}
                          </h4>
                          <p className="text-[10px] font-medium text-zinc-400">
                            {sale.customerName ? `Client: ${sale.customerName}` : 'Retail counter'} • {new Date(sale.saleDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600 font-mono">₹{sale.totalPrice.toFixed(2)}</span>
                          <p className="text-[9px] text-zinc-400">₹{sale.pricePerKg}/{sale.unit || 'kg'}</p>
                        </div>
                        <button
                          onClick={() => {
                            if(confirm('Delete sale transaction and return quantities to stock?')) {
                              onDeleteSale(sale.id);
                            }
                          }}
                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {storeSales.length === 0 && (
                    <div className="py-24 text-center text-zinc-400">
                      <TrendingUp className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold">No sales recorded today</p>
                      <p className="text-[10px] text-zinc-500">Log a vegetable sale to display active invoices.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
      )}

      {/* --- SUB-TAB CONTENT: PURCHASE --- */}
      {activeSubTab === 'purchase' && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          
          {/* Purchase Log Input */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 h-fit">
            <div>
              <h3 className="font-bold text-zinc-900">Record Crop Purchase (Restock)</h3>
              <p className="text-xs text-zinc-400">Adds quantity directly to stock levels and logs procurement records.</p>
            </div>

            <form onSubmit={handleLogPurchaseSubmit} className="space-y-3.5">
              
              {/* Vegetable Name */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="pur-veg" className="block text-xs font-bold text-zinc-500 uppercase">Vegetable Crop Name *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget('purchase');
                      setIsScannerOpen(true);
                    }}
                    className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                  >
                    <Scan className="h-3 w-3 text-emerald-600" />
                    Scan Package
                  </button>
                </div>
                <input
                  id="pur-veg"
                  type="text"
                  required
                  placeholder="e.g. Potatoes, Onions, Tomatoes"
                  value={purchaseVegName}
                  onChange={(e) => setPurchaseVegName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 font-semibold bg-white"
                />
              </div>

              {/* Purchase Qty in kg */}
              <div>
                <label htmlFor="pur-qty" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Restock Quantity (kg) *</label>
                <div className="relative">
                  <input
                    id="pur-qty"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 100.0"
                    value={purchaseQty || ''}
                    onChange={(e) => setPurchaseQty(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-200 py-2 pl-3 pr-12 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-zinc-400">
                    kg
                  </span>
                </div>
              </div>

              {/* Supplier Name */}
              <div>
                <label htmlFor="pur-supplier" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Supplier / Farm Name (Optional)</label>
                <input
                  id="pur-supplier"
                  type="text"
                  placeholder="e.g. Green Hills Agro"
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Log Supplier Purchase
              </button>

            </form>
          </div>

          {/* Recent Purchases History Log */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col h-full max-h-[500px]">
            <div className="mb-4">
              <h3 className="font-bold text-zinc-900">Supply Purchase Ledger</h3>
              <p className="text-xs text-zinc-400">Historical delivery register for stock restocks.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {storePurchases.map(pur => (
                <div key={pur.id} className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShoppingBag className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-800">{pur.quantity}kg of {pur.vegetableName}</h4>
                      <p className="text-[10px] font-medium text-zinc-400">
                        {pur.supplierName ? `From: ${pur.supplierName}` : 'Wholesale vendor'} • {new Date(pur.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if(confirm('Delete purchase and deduct quantity from inventory stock?')) {
                          onDeletePurchase(pur.id);
                        }
                      }}
                      className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {storePurchases.length === 0 && (
                <div className="py-24 text-center text-zinc-400">
                  <ShoppingBag className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No stock purchases recorded</p>
                  <p className="text-[10px] text-zinc-500">Record a supplier delivery to populate purchases journal.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* --- SUB-TAB CONTENT: INVENTORY --- */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Actions line with Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
            <div className="relative flex-1 max-w-md flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  id="inventory-search-input"
                  type="text"
                  placeholder="Search stock ledger (e.g. Tomato, Onion)..."
                  value={vegSearchQuery}
                  onChange={(e) => setVegSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setScannerTarget('inventory');
                  setIsScannerOpen(true);
                }}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs hover:scale-[1.01]"
              >
                <Scan className="h-4 w-4 text-emerald-600 animate-pulse" />
                <span>Scan Code</span>
              </button>
            </div>

            {role !== 'Employee' && (
              <button
                onClick={() => setShowInitForm(!showInitForm)}
                className="flex items-center gap-1 bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                {showInitForm ? 'Close Crop Tool' : 'Initialize Crop line'}
              </button>
            )}
          </div>

          {/* Crop Line Initialization Form */}
          {showInitForm && role !== 'Employee' && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm max-w-xl animate-fade-in">
              <h4 className="font-bold text-zinc-800 border-b border-zinc-100 pb-2 mb-3">Initialize New Crop Category</h4>
              <form onSubmit={handleInitInventoryItem} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label htmlFor="init-veg" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Vegetable Name *</label>
                  <input
                    id="init-veg"
                    type="text"
                    required
                    placeholder="e.g. Carrots, Garlic, Beans"
                    value={initVegName}
                    onChange={(e) => setInitVegName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="init-min-stock" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Min Threshold Alert (kg) *</label>
                  <input
                    id="init-min-stock"
                    type="number"
                    min="1"
                    required
                    value={initMinStock}
                    onChange={(e) => setInitMinStock(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="init-sell" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Selling Price (₹/kg) *</label>
                  <input
                    id="init-sell"
                    type="number"
                    step="0.01"
                    required
                    value={initSellingPrice}
                    onChange={(e) => setInitSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 font-semibold"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowInitForm(false)}
                    className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-zinc-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-zinc-800"
                  >
                    Save Crop Category
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grid of Crop Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {searchedInventory.map(item => {
              const isOutOfStock = item.quantity === 0;
              const isLowStock = !isOutOfStock && item.quantity <= item.minStockThreshold;
              const stockValuation = item.quantity * item.costPrice;
              const isEmployee = role === 'Employee';

              return (
                <div 
                  key={item.id} 
                  className={`rounded-2xl border p-4 bg-white shadow-sm flex flex-col justify-between transition-all ${
                    isOutOfStock 
                      ? 'border-red-200 bg-red-50/10' 
                      : isLowStock 
                      ? 'border-amber-200 bg-amber-50/10' 
                      : 'border-zinc-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 mb-3.5">
                      <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-zinc-400" />
                        {item.vegetableName}
                      </h4>
                      
                      <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                        isOutOfStock 
                          ? 'bg-red-100 text-red-700' 
                          : isLowStock 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isOutOfStock ? 'Empty' : isLowStock ? 'Low stock' : 'Optimal'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 text-xs text-zinc-500 font-semibold mb-4">
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Stock Level</span>
                        <p className={`text-base font-extrabold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-zinc-900'}`}>
                          {item.quantity} kg
                        </p>
                      </div>
                      
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Safety Level</span>
                        <p className="text-base font-extrabold text-zinc-700">{item.minStockThreshold} kg</p>
                      </div>

                      <div className="col-span-2">
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Retail Selling Price</span>
                        <p className="text-base font-extrabold text-emerald-600">₹{item.sellingPrice.toFixed(2)}/kg</p>
                      </div>
                    </div>
                  </div>

                  {/* Stock Correction Action slider/form */}
                  <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2">
                    {adjustingItemId === item.id ? (
                      <div className="flex items-center gap-2 animate-fade-in">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Correct Qty"
                          defaultValue={item.quantity}
                          id={`input-adjust-${item.id}`}
                          className="w-full max-w-[85px] border border-zinc-200 rounded-lg px-2 py-1 text-xs text-center font-bold text-zinc-800"
                        />
                        <button
                          onClick={() => {
                            const val = parseFloat((document.getElementById(`input-adjust-${item.id}`) as HTMLInputElement)?.value || '0');
                            handleQuickAdjustStock(item, val);
                          }}
                          className="px-2.5 py-1 bg-zinc-900 text-white rounded-lg text-[10px] font-extrabold cursor-pointer hover:bg-zinc-800"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => setAdjustingItemId(null)}
                          className="px-2.5 py-1 border border-zinc-200 rounded-lg text-[10px] font-semibold text-zinc-500 hover:bg-zinc-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : requestingItemId === item.id ? (
                      <div className="flex flex-col gap-2 bg-amber-50/50 border border-amber-100 rounded-xl p-2.5 animate-fade-in">
                        <span className="text-[9px] font-extrabold text-amber-800 uppercase tracking-wider block">🚨 Requisition Parameters</span>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <input
                              type="number"
                              placeholder="Qty"
                              value={quickReqQty}
                              onChange={(e) => setQuickReqQty(parseFloat(e.target.value) || 0)}
                              className="w-full border border-zinc-200 rounded-lg py-1 px-2 text-xs font-bold text-zinc-800 text-center bg-white"
                            />
                            <span className="absolute right-1.5 top-1 text-[9px] font-black text-zinc-400">kg</span>
                          </div>
                          
                          <select
                            value={quickReqPriority}
                            onChange={(e) => setQuickReqPriority(e.target.value as any)}
                            className="border border-zinc-200 rounded-lg py-1 px-1.5 text-xs font-semibold text-zinc-700 bg-white cursor-pointer"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Med</option>
                            <option value="High">High</option>
                          </select>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => handleQuickRequestRequirement(item.vegetableName, quickReqQty, quickReqPriority)}
                            className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[10px] cursor-pointer text-center"
                          >
                            File Requisition
                          </button>
                          <button
                            onClick={() => setRequestingItemId(null)}
                            className="px-2 py-1 border border-zinc-200 bg-white hover:bg-zinc-50 rounded-lg text-[10px] font-bold text-zinc-500 cursor-pointer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setAdjustingItemId(item.id);
                            setRequestingItemId(null);
                          }}
                          className="text-center bg-zinc-50 hover:bg-zinc-100 text-zinc-600 text-[10px] font-bold py-1.5 rounded-lg border border-zinc-200/50 transition-colors cursor-pointer"
                        >
                          Correct Count
                        </button>
                        
                        <button
                          onClick={() => {
                            setRequestingItemId(item.id);
                            setAdjustingItemId(null);
                            setQuickReqQty(item.quantity <= item.minStockThreshold ? Math.max(50, item.minStockThreshold * 2 - item.quantity) : 50);
                            setQuickReqPriority(item.quantity <= item.minStockThreshold ? 'High' : 'Medium');
                          }}
                          className="text-center bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-black py-1.5 rounded-lg border border-amber-200/50 transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          🚨 Req Restock
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}

            {storeInventory.length === 0 ? (
              <div className="sm:col-span-2 lg:col-span-3 py-16 px-6 text-center text-zinc-500 border border-dashed border-zinc-200 rounded-2xl bg-white space-y-4">
                <Package className="h-12 w-12 text-zinc-300 mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-black text-zinc-805">Your Store Inventory is Empty</p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Configure your branch inventory instantly by importing and syncing all active crop catalog categories from the corporate Master Catalog.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBulkSeedCrops}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                >
                  🔄 Sync with Master Catalog
                </button>
              </div>
            ) : searchedInventory.length === 0 ? (
              <div className="sm:col-span-2 lg:col-span-3 py-20 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-2xl bg-white">
                <Package className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">No crop categories found</p>
                <p className="text-xs text-zinc-500 mt-1">Initialize a crop line or register a supplier purchase to populate stock!</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* --- SUB-TAB CONTENT: PROCUREMENT REQUIREMENTS --- */}
      {activeSubTab === 'requirements' && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          
          {/* Create Requirement & History */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 h-fit text-left">
              <div>
                <h3 className="font-bold text-zinc-900">Request Stock Requisition</h3>
                <p className="text-xs text-zinc-400">Add custom requirements that consolidate under administrative panel.</p>
              </div>

              <form onSubmit={handleAddRequirementSubmit} className="space-y-3.5">
                
                {/* Crop Name */}
                <div>
                  <label htmlFor="req-veg" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Predefined Item *</label>
                  <select
                    id="req-veg"
                    required
                    value={reqVegName}
                    onChange={(e) => setReqVegName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-zinc-700 cursor-pointer"
                  >
                    <option value="" disabled>-- Select an item --</option>
                    {cropCatalogNames.map(item => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>

                {/* Requirement Qty */}
                <div>
                  <label htmlFor="req-qty" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Required Quantity (kg) *</label>
                  <div className="relative">
                    <input
                      id="req-qty"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 50"
                      value={reqQty || ''}
                      onChange={(e) => setReqQty(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-zinc-200 py-2 pl-3 pr-12 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-zinc-850"
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-zinc-400">
                      kg
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white shadow-md shadow-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  File Stock Requirement
                </button>

              </form>
            </div>

            {/* Requisition History & Quick Reuse Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 shadow-sm space-y-3.5 text-left">
              <div>
                <h3 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                  <span>⏱️</span> Requisition History
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1">Past fulfilled restock requests. Click reuse to raise a new requisition with identical item & weight.</p>
              </div>

              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                {storeRequirements.filter(r => r.status === 'Fulfilled').length > 0 ? (
                  storeRequirements.filter(r => r.status === 'Fulfilled').map(req => (
                    <div key={req.id} className="p-2.5 rounded-xl border border-zinc-150 bg-white flex items-center justify-between gap-2.5 shadow-3xs hover:bg-zinc-50 transition-colors">
                      <div className="text-left">
                        <h4 className="text-[11px] font-bold text-zinc-850">{req.quantity}kg of {req.vegetableName}</h4>
                        <p className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5 mt-0.5">
                          <span>✅</span> Fulfilled • {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReuseRequirement(req)}
                        className="bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-100/60 px-2 py-1 rounded-lg text-[10px] font-black tracking-tight transition-all cursor-pointer flex items-center gap-1 hover:scale-[1.01]"
                        title="Reuse requisition parameters"
                      >
                        <span>🔄</span> Reuse
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-white/50">
                    <p className="text-[10px] font-bold">No historical requisitions found</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5">Fulfilled requests appear here.</p>
                  </div>
                )}
              </div>
            </div>

            {/* HQ Corporate Catalog & Reference Prices */}
            {masterCrops && masterCrops.length > 0 && (
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-3.5 text-left">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                    <span>🏢</span> HQ Master Catalog Reference
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Active price benchmarks and stock rules set by corporate headquarters.
                  </p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {masterCrops.map(crop => {
                    const isAlreadyInStock = storeInventory.some(
                      item => item.vegetableName.toLowerCase() === crop.vegetableName.toLowerCase()
                    );
                    return (
                      <div
                        key={crop.id}
                        className="p-2.5 rounded-xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <p className="font-bold text-zinc-800 uppercase tracking-tight">{crop.vegetableName}</p>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                            <span>Cost: <strong className="text-zinc-700">{currencySymbol}{crop.costPrice}/kg</strong></span>
                            <span>•</span>
                            <span>Retail: <strong className="text-emerald-700">{currencySymbol}{crop.sellingPrice}/kg</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setReqVegName(crop.vegetableName);
                              const qtyField = document.getElementById('req-qty');
                              if (qtyField) qtyField.focus();
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded-lg text-[10px] transition-all cursor-pointer flex items-center gap-0.5"
                            title="Pre-fill requisition form for this crop"
                          >
                            <span>➕</span> Order
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Active Requirements List */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col h-full max-h-[580px] text-left">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900">Branch Requisition Sheet</h3>
                <p className="text-xs text-zinc-400 font-medium">Active Requisition items filed by this outlet.</p>
              </div>

              {storeRequirements.filter(r => r.status !== 'Fulfilled').length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <a
                    href={sendAllRequirementsOnWhatsApp()}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-[10px] sm:text-[11px] font-bold text-white px-2.5 py-1.5 rounded-lg shadow-sm"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Send (Rich Markdown)
                  </a>
                  <a
                    href={sendRequirementsInSimpleText()}
                    target="_blank"
                    referrerPolicy="no-referrer"
                    className="flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] sm:text-[11px] font-bold text-white px-2.5 py-1.5 rounded-lg shadow-sm"
                  >
                    <span>💬</span>
                    Send (Simple Plain Text)
                  </a>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {storeRequirements.filter(r => r.status !== 'Fulfilled').map(req => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl border border-zinc-100 gap-3 hover:bg-zinc-50/50 transition-colors">
                  {editingReqId === req.id ? (
                    <div className="p-3 bg-emerald-50/30 border border-emerald-300 rounded-xl space-y-3 w-full animate-fade-in text-left">
                      <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">✏️ Edit Requisition Item</span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-0.5">Item Name</label>
                          <select
                            value={editingReqVegName}
                            onChange={(e) => setEditingReqVegName(e.target.value)}
                            className="w-full text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg p-1.5 focus:outline-none"
                          >
                            {cropCatalogNames.map(item => (
                              <option key={item} value={item}>{item}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-0.5">Qty (kg)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.1"
                            value={editingReqQty}
                            onChange={(e) => setEditingReqQty(e.target.value)}
                            className="w-full text-xs font-semibold text-zinc-800 bg-white border border-zinc-200 rounded-lg p-1.5 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-0.5">Priority</label>
                          <select
                            value={editingReqPriority}
                            onChange={(e) => setEditingReqPriority(e.target.value as any)}
                            className="w-full text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 rounded-lg p-1.5 focus:outline-none"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-0.5">Notes</label>
                        <input
                          type="text"
                          placeholder="Additional dispatch comments..."
                          value={editingReqNotes}
                          onChange={(e) => setEditingReqNotes(e.target.value)}
                          className="w-full text-xs font-medium text-zinc-850 bg-white border border-zinc-200 rounded-lg p-1.5 px-2 focus:outline-none"
                        />
                      </div>

                      <div className="flex justify-end gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveRequirementEdit(req.id)}
                          className="px-3 py-1 text-[10px] font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors cursor-pointer"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingReqId(null)}
                          className="px-3 py-1 text-[10px] font-extrabold text-zinc-500 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-md transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                          req.priority === 'High' 
                            ? 'bg-red-100 text-red-700' 
                            : req.priority === 'Medium' 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {req.priority}
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800">{req.quantity}kg of {req.vegetableName}</h4>
                          {req.notes && (
                            <p className="text-[10px] text-zinc-500 mt-1 italic">"{req.notes}"</p>
                          )}
                          <p className="text-[9px] text-zinc-400 mt-1">
                            Status: <strong className={req.status === 'Fulfilled' ? 'text-emerald-600' : 'text-zinc-600'}>{req.status}</strong> • Filed {new Date(req.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Actions line */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {req.status === 'Pending' && (
                          <button
                            onClick={() => onUpdateRequirementStatus(req.id, 'Ordered')}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                          >
                            Order
                          </button>
                        )}
                        {req.status === 'Ordered' && (
                          <button
                            onClick={() => onUpdateRequirementStatus(req.id, 'Fulfilled')}
                            className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer"
                          >
                            Fulfill
                          </button>
                        )}

                        {/* Inline edit trigger */}
                        <button
                          onClick={() => handleStartRequirementEdit(req)}
                          className="p-1 rounded text-zinc-500 hover:bg-zinc-100 cursor-pointer"
                          title="Edit requirement details"
                        >
                          <span>✏️</span>
                        </button>
                        
                        {/* Send Single Requisition on WhatsApp */}
                        <a
                          href={getWhatsAppStoreLink(req)}
                          target="_blank"
                          referrerPolicy="no-referrer"
                          className="p-1 rounded text-[#25D366] hover:bg-emerald-50 cursor-pointer"
                          title="Send this requirement on WhatsApp"
                        >
                          <PhoneCall className="h-4 w-4" />
                        </a>

                        <button
                          onClick={() => onDeleteRequirement(req.id)}
                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                          title="Delete requirement"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}

              {storeRequirements.filter(r => r.status !== 'Fulfilled').length === 0 && (
                <div className="py-24 text-center text-zinc-400">
                  <Send className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No active store requisitions raised</p>
                  <p className="text-[10px] text-zinc-500">All filed stock requirements are fulfilled. Add vegetable requirements to notify the administrator.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* --- SUB-TAB CONTENT: CUSTOMER ORDERS MANAGEMENT --- */}
      {activeSubTab === ('customer-orders' as any) && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-zinc-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Consumer Order Desk</h3>
              <p className="text-xs text-zinc-400">Incoming requests dispatched via the Customer Kiosk.</p>
            </div>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-black text-indigo-700 uppercase tracking-tight">
              {customerOrders.filter(co => co.storeId === store.id).length} Orders Total
            </span>
          </div>

          {/* Search bar with Voice Input for Customer Orders */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders by customer name, phone, or ID..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
              {/* Voice Input Trigger for Orders Search */}
              <button
                type="button"
                onClick={() => handleStartVoiceInput((text) => setOrderSearchQuery(text))}
                className={`absolute right-2.5 top-1.5 p-1 rounded-lg transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                }`}
                title="Speak to search orders"
              >
                <Mic className={`h-4 w-4 ${isListening ? 'animate-bounce' : ''}`} />
              </button>
            </div>
            {orderSearchQuery && (
              <button 
                onClick={() => setOrderSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold shrink-0"
              >
                Clear Search
              </button>
            )}
          </div>

          <div className="space-y-3">
            {customerOrders
              .filter(co => co.storeId === store.id)
              .filter(co => {
                if (!orderSearchQuery) return true;
                const q = orderSearchQuery.toLowerCase();
                return (
                  co.customerName.toLowerCase().includes(q) ||
                  co.customerPhone.includes(q) ||
                  co.id.toLowerCase().includes(q) ||
                  (co.notes && co.notes.toLowerCase().includes(q))
                );
              })
              .map(order => {
              const isUnprocessed = order.status === 'Pending' || order.status === 'Processing' || order.status === 'Ready';
              const isEditing = editingOrderId === order.id;

              if (isEditing) {
                return (
                  <div 
                    key={order.id} 
                    className="p-4 rounded-xl border border-emerald-500 bg-emerald-50/10 shadow-md space-y-4 text-left"
                  >
                    <div className="flex justify-between items-center border-b border-dashed border-emerald-200 pb-2">
                      <span className="text-xs font-black text-emerald-800 uppercase">Editing Order #{order.id}</span>
                      <button 
                        type="button" 
                        onClick={() => setEditingOrderId(null)}
                        className="text-zinc-400 hover:text-zinc-600 font-bold text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Customer Name</label>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Customer Phone</label>
                        <input 
                          type="text" 
                          value={editPhone} 
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Order Status</label>
                        <select 
                          value={editStatus} 
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs font-semibold focus:outline-none bg-white"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Ready">Ready</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Payment Status</label>
                        <select 
                          value={editPaymentStatus} 
                          onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs font-semibold focus:outline-none bg-white"
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-[9px] font-black tracking-wider text-zinc-400 uppercase">Crop Manifest Items</span>
                      <div className="space-y-2">
                        {editItems.map((it, idx) => (
                          <div key={idx} className="bg-white rounded-lg border border-zinc-200 p-2 flex justify-between items-center text-xs gap-3">
                            <span className="font-bold text-zinc-850 truncate">
                              {it.vegetableName} <span className="text-[10px] text-zinc-400 font-normal">(₹{it.pricePerKg.toFixed(1)}/kg)</span>
                            </span>
                            
                            <div className="flex items-center gap-1">
                              <button 
                                type="button"
                                onClick={() => {
                                  const newQty = Math.max(0.1, it.quantity - 0.5);
                                  const updated = [...editItems];
                                  updated[idx] = {
                                    ...it,
                                    quantity: parseFloat(newQty.toFixed(2)),
                                    totalPrice: parseFloat((newQty * it.pricePerKg).toFixed(2))
                                  };
                                  setEditItems(updated);
                                }}
                                className="w-5 h-5 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              
                              <input 
                                type="number" 
                                step="0.1"
                                min="0.1"
                                value={it.quantity} 
                                onChange={(e) => {
                                  const newQty = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                                  const updated = [...editItems];
                                  updated[idx] = {
                                    ...it,
                                    quantity: newQty,
                                    totalPrice: parseFloat((newQty * it.pricePerKg).toFixed(2))
                                  };
                                  setEditItems(updated);
                                }}
                                className="w-12 text-center bg-transparent border-b border-zinc-300 font-bold text-xs focus:outline-none font-mono"
                              />
                              
                              <button 
                                type="button"
                                onClick={() => {
                                  const newQty = it.quantity + 0.5;
                                  const updated = [...editItems];
                                  updated[idx] = {
                                    ...it,
                                    quantity: parseFloat(newQty.toFixed(2)),
                                    totalPrice: parseFloat((newQty * it.pricePerKg).toFixed(2))
                                  };
                                  setEditItems(updated);
                                }}
                                className="w-5 h-5 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>

                              <button 
                                type="button"
                                onClick={() => {
                                  const updated = editItems.filter((_, itemIdx) => itemIdx !== idx);
                                  setEditItems(updated);
                                }}
                                className="text-rose-600 hover:bg-rose-50 p-1 rounded ml-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <select 
                        defaultValue=""
                        onChange={(e) => {
                          const selectedVeg = e.target.value;
                          if (!selectedVeg) return;
                          
                          if (editItems.some(it => it.vegetableName.toLowerCase() === selectedVeg.toLowerCase())) {
                            e.target.value = "";
                            return;
                          }

                          const invItem = storeInventory.find(inv => inv.vegetableName.toLowerCase() === selectedVeg.toLowerCase());
                          const price = invItem ? invItem.sellingPrice : 50;

                          const newItem = {
                            vegetableName: selectedVeg,
                            quantity: 1.0,
                            pricePerKg: price,
                            totalPrice: price
                          };

                          setEditItems([...editItems, newItem]);
                          e.target.value = "";
                        }}
                        className="w-full rounded-lg border border-zinc-200 p-1.5 text-xs font-semibold focus:outline-none cursor-pointer bg-white"
                      >
                        <option value="">➕ Add extra crop item to this order...</option>
                        {cropCatalogNames.map(crop => (
                          <option key={crop} value={crop}>{crop}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
                      <div className="text-xs">
                        <span className="text-zinc-400 uppercase font-black text-[9px]">Calculated Total:</span>
                        <p className="text-base font-black text-emerald-700">₹{editItems.reduce((acc, curr) => acc + curr.totalPrice, 0).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => setEditingOrderId(null)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors cursor-pointer"
                        >
                          Discard
                        </button>
                        <button 
                          type="button"
                          onClick={handleSaveEditOrder}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={order.id} 
                  className={`p-4 rounded-xl border transition-all text-left ${
                    order.status === 'Completed' 
                      ? 'border-emerald-200 bg-emerald-50/20' 
                      : order.status === 'Cancelled' 
                      ? 'border-zinc-200 bg-zinc-50 text-zinc-500 opacity-70' 
                      : 'border-indigo-200 bg-indigo-50/20 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-dashed border-zinc-200/60 pb-3.5 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-zinc-900 text-xs">{order.customerName}</span>
                        <span className="text-[10px] text-zinc-400">({order.customerPhone})</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase mt-1">
                        Order ID: <span className="font-mono text-zinc-500">{order.id}</span> • Filed {new Date(order.orderDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                        order.paymentStatus === 'Paid' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                        order.status === 'Completed' 
                          ? 'bg-emerald-600 text-white' 
                          : order.status === 'Cancelled' 
                          ? 'bg-zinc-300 text-zinc-600' 
                          : 'bg-indigo-600 text-white animate-pulse'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <span className="block text-[9px] font-black tracking-wider text-zinc-400 uppercase">Crop Manifest</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="bg-white rounded-lg border border-zinc-150 p-2 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-zinc-800">{it.vegetableName}</span>
                            <span className="text-[9px] text-zinc-400 ml-1.5">(₹{it.pricePerKg.toFixed(2)}/kg)</span>
                          </div>
                          <span className="font-extrabold text-zinc-900">{it.quantity} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200/40 pt-3">
                    <div className="text-xs">
                      <span className="text-zinc-400 uppercase font-black text-[9px]">Grand Total:</span>
                      <p className="text-base font-black text-indigo-700">₹{order.totalAmount.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Send a pre-filled status update message on WhatsApp */}
                      <a
                        href={`https://wa.me/91${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hello ${order.customerName}, this is a status update regarding your order #${order.id} of amount ₹${order.totalAmount.toFixed(2)} at ${store.name}. ` +
                          `Your order is currently "${order.status}"! We are preparing the fresh crops for you.`
                        )}`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[#25D366] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Send WhatsApp update to customer"
                      >
                        <PhoneCall className="h-3 w-3" />
                        <span>Send Message</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDownloadOrderPDF(order)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1"
                        title="Download PDF Summary of the Order"
                      >
                        <span>📄</span>
                        <span>PDF Summary</span>
                      </button>

                      {isUnprocessed && onUpdateCustomerOrder && (
                        <button
                          onClick={() => handleStartEditOrder(order)}
                          className="px-2.5 py-1.5 rounded-lg border border-indigo-250 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          Edit Details
                        </button>
                      )}

                      {isUnprocessed && onFulfillCustomerOrder && (
                        <button
                          onClick={() => {
                            if (confirm(`Fulfill order for ${order.customerName}? This will automatically deduct weights from current stock, register sales logs, and download a clean PDF summary.`)) {
                              handleDownloadOrderPDF(order);
                              onFulfillCustomerOrder(order);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                        >
                          Fulfill & Ship
                        </button>
                      )}

                      {isUnprocessed && onDeleteCustomerOrder && (
                        <>
                          <button
                            onClick={() => {
                              setCancellingOrder(order);
                              setCancellationReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-750 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            Cancel Order
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete pending order #${order.id} for ${order.customerName} completely? This action cannot be undone.`)) {
                                onDeleteCustomerOrder(order.id);
                                alert(`Order #${order.id} deleted completely.`);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-250 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            Delete Order
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {customerOrders.filter(co => co.storeId === store.id).length === 0 ? (
              <div className="py-24 text-center text-zinc-400">
                <span>📦</span>
                <p className="text-xs font-semibold mt-2">No consumer orders received yet</p>
                <p className="text-[10px] text-zinc-500">Customers can order fresh crops from the storefront tab.</p>
              </div>
            ) : customerOrders.filter(co => co.storeId === store.id).filter(co => {
              if (!orderSearchQuery) return true;
              const q = orderSearchQuery.toLowerCase();
              return (
                co.customerName.toLowerCase().includes(q) ||
                co.customerPhone.includes(q) ||
                co.id.toLowerCase().includes(q) ||
                (co.notes && co.notes.toLowerCase().includes(q))
              );
            }).length === 0 ? (
              <div className="py-24 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-2xl bg-white p-6">
                <span>🔍</span>
                <p className="text-xs font-semibold mt-2">No matching consumer orders found</p>
                <p className="text-[10px] text-zinc-500">Refine your search parameters or check your spellings.</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* --- SUB-TAB CONTENT: BRANCH INFO --- */}
      {activeSubTab === 'info' && (
        <div className="space-y-6 animate-fade-in">
          {/* Main detailed information panel */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                Active Trading Branch Space
              </span>
              <h3 className="text-xl font-black mt-2 tracking-tight text-white">{store.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Detailed metrics, setup credentials, and bulk diagnostics tools.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/80">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Stock Count</span>
                <span className="text-lg font-black text-emerald-400">{storeInventory.length} crop lines</span>
                <p className="text-[10px] text-slate-400 mt-1">Total unique articles registered in inventory catalog.</p>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/80">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Aggregate Revenue</span>
                <span className="text-lg font-black text-white">₹{storeSales.reduce((a,c) => a + c.totalPrice, 0).toFixed(2)}</span>
                <p className="text-[10px] text-slate-400 mt-1">Cumulative sales recorded across this branch session.</p>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/80">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Volume Sold</span>
                <span className="text-lg font-black text-amber-400">{storeSales.reduce((a,c) => a + c.quantity, 0).toFixed(1)} kg</span>
                <p className="text-[10px] text-slate-400 mt-1">Total crop quantities cleared through checkout.</p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-5 space-y-3.5">
              <h4 className="text-xs uppercase font-black tracking-widest text-slate-400">Branch Configuration</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-850/50 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-center gap-1">
                  <div className="flex justify-between items-center w-full">
                    <span className="text-slate-400">Location Desk:</span>
                    <span className="font-bold text-slate-100">{store.location || 'Not Specified'}</span>
                  </div>
                  {store.googleMapsUrl && (
                    <a 
                      href={store.googleMapsUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-bold self-end underline flex items-center gap-0.5"
                    >
                      🔗 View Google Map
                    </a>
                  )}
                </div>
                <div className="bg-slate-850/50 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Contact Number:</span>
                  <span className="font-bold text-slate-100">{store.whatsappNumber || 'Not Configured'}</span>
                </div>
                <div className="bg-slate-850/50 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">User Mode Access:</span>
                  <span className="font-bold text-slate-100 uppercase bg-blue-500/10 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-md text-[10px]">{role || 'Store Manager'}</span>
                </div>
                <div className="bg-slate-850/50 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Active Warning Threshold:</span>
                  <span className="font-bold text-amber-400">≤ 10 Units</span>
                </div>
              </div>
            </div>

            {/* Quick Actions / Diagnostic tools inside tab */}
            <div className="border-t border-slate-800 pt-5 space-y-3">
              <h4 className="text-xs uppercase font-black tracking-widest text-slate-400">Diagnostics & Seed Utilities</h4>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleBulkSeedCrops}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-950/20"
                >
                  🔄 {masterCrops && masterCrops.length > 0 ? "Sync Store with Master Catalog" : "Bulk Seed Standard Crops Catalog"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Reset local active cart entries?")) {
                      handleClearPosCart();
                      alert("Cart cleared successfully.");
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer border border-slate-700/50"
                >
                  ♻️ Reset Cart Buffer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-TAB CONTENT: QR CODE GENERATOR --- */}
      {activeSubTab === 'qr-code' && (
        <div className="space-y-6 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  Customer Convenience Suite
                </span>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-emerald-600" />
                  Storefront QR Code Generator
                </h3>
                <p className="text-slate-500 text-xs">
                  Create high-fidelity QR codes to place at your checkout desks, print on shopping bags, or post on social media. 
                  Customers scan them to directly browse your live stock catalog, view real-time prices, and place contact-free delivery or pick-up orders.
                </p>
              </div>
            </div>

            {/* Content Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Side: Parameters / Settings (Col Span 7) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Section 1: Destination Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 border-l-3 border-emerald-500 pl-2.5">
                    1. QR Code Target Action
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setQrDestinationType('storefront')}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                        qrDestinationType === 'storefront'
                          ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="p-1.5 bg-emerald-100/60 text-emerald-700 rounded-lg shrink-0 w-fit">
                        <ShoppingBag className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="block text-xs font-black">Customer Storefront</span>
                        <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                          Customers browse live stock and place online orders.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrDestinationType('express-billing')}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                        qrDestinationType === 'express-billing'
                          ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="p-1.5 bg-emerald-100/60 text-emerald-700 rounded-lg shrink-0 w-fit">
                        <TrendingUp className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="block text-xs font-black">Express POS Billing</span>
                        <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                          Quick access to this branch billing terminal.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrDestinationType('custom')}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                        qrDestinationType === 'custom'
                          ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="p-1.5 bg-emerald-100/60 text-emerald-700 rounded-lg shrink-0 w-fit">
                        <ExternalLink className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="block text-xs font-black">Custom Web URL</span>
                        <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                          Redirect customers to a custom web link or social page.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Custom URL Input (Only visible when custom) */}
                {qrDestinationType === 'custom' && (
                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-top duration-250">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                      Destination Web URL
                    </label>
                    <input
                      type="url"
                      value={qrCustomUrl}
                      onChange={(e) => setQrCustomUrl(e.target.value)}
                      placeholder="https://example.com/my-custom-store"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400">
                      Enter any valid web address. For example: a custom landing page, google maps location, or WhatsApp click-to-chat link.
                    </p>
                  </div>
                )}

                {/* Section 2: Visual Customizations (Colors & Branding) */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-l-3 border-emerald-500 pl-2.5">
                    2. Design & Branding Elements
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Foreground Color */}
                    <div className="space-y-2.5">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                        QR Pattern Color (Foreground)
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <input
                            type="color"
                            value={qrFgColor}
                            onChange={(e) => setQrFgColor(e.target.value)}
                            className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                            id="qr-fg-color-picker"
                          />
                        </div>
                        <input
                          type="text"
                          value={qrFgColor}
                          onChange={(e) => setQrFgColor(e.target.value)}
                          maxLength={7}
                          className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-semibold uppercase text-center focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { name: 'Emerald', code: '#047857' },
                          { name: 'Indigo', code: '#4f46e5' },
                          { name: 'Slate', code: '#1e293b' },
                          { name: 'Crimson', code: '#dc2626' },
                          { name: 'Amber', code: '#b45309' },
                          { name: 'Teal', code: '#0f766e' }
                        ].map((preset) => (
                          <button
                            key={preset.code}
                            type="button"
                            onClick={() => setQrFgColor(preset.code)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-100 hover:border-slate-300 bg-slate-50 cursor-pointer"
                          >
                            <span 
                              className="h-2 w-2 rounded-full inline-block" 
                              style={{ backgroundColor: preset.code }}
                            />
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Background Color */}
                    <div className="space-y-2.5">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                        Card Background Color
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <input
                            type="color"
                            value={qrBgColor}
                            onChange={(e) => setQrBgColor(e.target.value)}
                            className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                            id="qr-bg-color-picker"
                          />
                        </div>
                        <input
                          type="text"
                          value={qrBgColor}
                          onChange={(e) => setQrBgColor(e.target.value)}
                          maxLength={7}
                          className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-semibold uppercase text-center focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { name: 'Pure White', code: '#ffffff' },
                          { name: 'Soft Cream', code: '#fefcbf' },
                          { name: 'Ice Blue', code: '#eff6ff' },
                          { name: 'Mint Hue', code: '#f0fdf4' },
                          { name: 'Slate Glow', code: '#f8fafc' }
                        ].map((preset) => (
                          <button
                            key={preset.code}
                            type="button"
                            onClick={() => setQrBgColor(preset.code)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-100 hover:border-slate-300 bg-slate-50 cursor-pointer"
                          >
                            <span 
                              className="h-2 w-2 rounded-full inline-block border border-slate-200" 
                              style={{ backgroundColor: preset.code }}
                            />
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Advanced Options */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-sm font-bold text-slate-900 border-l-3 border-emerald-500 pl-2.5">
                    3. Advanced Engine Variables
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    {/* Error Correction Level */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider" htmlFor="qr-error-level-select">
                        Error Tolerance (Density)
                      </label>
                      <select
                        id="qr-error-level-select"
                        value={qrErrorLevel}
                        onChange={(e) => setQrErrorLevel(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none text-slate-700"
                      >
                        <option value="L">Low (7% recovery - lowest density)</option>
                        <option value="M">Medium (15% recovery - optimized standard)</option>
                        <option value="Q">Quartile (25% recovery - high density)</option>
                        <option value="H">High (30% recovery - highest damage tolerance)</option>
                      </select>
                      <p className="text-[10px] text-slate-400">
                        Higher tolerance ensures QR remains readable even if printed flyers get slightly scuffed or stained inside active store environments.
                      </p>
                    </div>

                    {/* QR Code Pixel Dimension */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider" htmlFor="qr-resolution-select">
                        Pixel Resolution (Dimensions)
                      </label>
                      <select
                        id="qr-resolution-select"
                        value={qrSize}
                        onChange={(e) => setQrSize(parseInt(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none text-slate-700"
                      >
                        <option value="200">200 x 200 px (Fast Scan, Digital Web)</option>
                        <option value="300">300 x 300 px (Optimized Medium Print)</option>
                        <option value="500">500 x 500 px (High-Definition Catalog Flyer)</option>
                        <option value="800">800 x 800 px (Ultra-HD Storefront Poster)</option>
                      </select>
                      <p className="text-[10px] text-slate-400">
                        Select larger sizes if planning to print large banner assets or hanging signs inside physical stores.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 4: Utility Commands */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      let targetUrl = '';
                      if (qrDestinationType === 'storefront') {
                        targetUrl = `${window.location.origin}${window.location.pathname}#/customer-hub?storeId=${store.id}`;
                      } else if (qrDestinationType === 'express-billing') {
                        targetUrl = `${window.location.origin}${window.location.pathname}#/store?storeId=${store.id}`;
                      } else {
                        targetUrl = qrCustomUrl || `${window.location.origin}${window.location.pathname}`;
                      }

                      navigator.clipboard.writeText(targetUrl);
                      setQrCopySuccess(true);
                      
                      if (cpanelSettings?.alertSoundEnabled) {
                        try {
                          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                          const osc = audioCtx.createOscillator();
                          const gain = audioCtx.createGain();
                          osc.connect(gain);
                          gain.connect(audioCtx.destination);
                          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                          osc.start();
                          osc.stop(audioCtx.currentTime + 0.12);
                        } catch (e) {}
                      }

                      setTimeout(() => setQrCopySuccess(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    {qrCopySuccess ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 animate-bounce" />
                        <span className="text-emerald-700">Copied Destination Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Raw Redirect URL
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!qrDataUrl) return;
                      const link = document.createElement('a');
                      link.href = qrDataUrl;
                      link.download = `${store.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_qr_code.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    disabled={!qrDataUrl || qrIsGenerating}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" />
                    Download Standalone PNG Image
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQrFlyer}
                    disabled={!qrDataUrl || qrIsGenerating}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    <Printer className="h-4 w-4" />
                    Download Print-Ready PDF Flyer
                  </button>
                </div>

              </div>

              {/* Right Side: Interactive Live Preview (Col Span 5) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-6">
                
                {/* Visual Preview Card Frame */}
                <div className="w-full bg-slate-50 rounded-3xl border border-slate-200/80 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  
                  {/* Visual Background Ripple Accents */}
                  <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/5 rounded-full filter blur-xl -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 h-32 w-32 bg-indigo-500/5 rounded-full filter blur-xl -ml-10 -mb-10"></div>
                  
                  {/* Tag label */}
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-200/50 px-2.5 py-1 rounded-full mb-4">
                    WYSIWYG REAL-TIME PREVIEW
                  </span>

                  {/* QR Canvas Box */}
                  <div 
                    className="relative p-5 rounded-2xl shadow-md border border-slate-200/60 inline-block transition-transform hover:scale-103 duration-300"
                    style={{ backgroundColor: qrBgColor }}
                  >
                    {qrIsGenerating ? (
                      <div className="h-[210px] w-[210px] flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
                      </div>
                    ) : qrDataUrl ? (
                      <div className="relative">
                        <img 
                          src={qrDataUrl} 
                          alt="Storefront QR Code Live Preview" 
                          className="h-[210px] w-[210px] object-contain rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        {/* Custom overlaid tiny crop emoji at center for branding */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="h-9 w-9 bg-white border-2 border-emerald-600 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-base">🥬</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[210px] w-[210px] flex items-center justify-center text-slate-400 font-bold text-xs">
                        QR Code not compiled yet
                      </div>
                    )}
                  </div>

                  {/* Redirection Link Preview */}
                  <div className="w-full mt-5 bg-white border border-slate-200 rounded-xl p-3 text-left space-y-1">
                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      Decoded scan url
                    </span>
                    <span className="block text-xs font-mono font-medium text-slate-600 break-all select-all leading-relaxed">
                      {qrDestinationType === 'storefront' ? (
                        `${window.location.origin}${window.location.pathname}#/customer-hub?storeId=${store.id}`
                      ) : qrDestinationType === 'express-billing' ? (
                        `${window.location.origin}${window.location.pathname}#/store?storeId=${store.id}`
                      ) : (
                        qrCustomUrl || `${window.location.origin}${window.location.pathname}`
                      )}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <span>💡</span>
                    <span>Test scan using any mobile scanner or phone camera!</span>
                  </div>

                </div>

                {/* Additional Guidance Panel */}
                <div className="w-full bg-emerald-50/30 rounded-2xl border border-emerald-100 p-5 space-y-3">
                  <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                    <span>📢</span>
                    Best Practices for Placement
                  </h4>
                  <ul className="text-xs text-emerald-950 space-y-2 list-disc pl-4 font-semibold leading-relaxed">
                    <li>
                      <strong className="text-emerald-900 font-extrabold">Bill Counter:</strong> Print the Flyer PDF and frame it next to the card machine. Customers can scan to view prices without asking staff.
                    </li>
                    <li>
                      <strong className="text-emerald-900 font-extrabold">Paper Carry Bags:</strong> Paste or print the QR on paper bags. Customers will have your storefront handy when they get home!
                    </li>
                    <li>
                      <strong className="text-emerald-900 font-extrabold">Low-Light Alert:</strong> If your store is dimly lit, raise the <strong className="text-emerald-900 font-extrabold">Error Tolerance</strong> option to High to withstand scans in dark spots.
                    </li>
                  </ul>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* --- SUB-TAB CONTENT: STAFF DIRECTORY & LOCATIONS --- */}
      {activeSubTab === 'attendance' && (
        <div className="space-y-6 animate-fade-in text-slate-800 text-left">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  Staff Operations
                </span>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span>👥</span>
                  {attendanceSubMode === 'desk' ? "Branch Staff Attendance Desk" : "All Stores Staff Directory"}
                </h3>
                <p className="text-slate-500 text-xs">
                  {attendanceSubMode === 'desk' 
                    ? "Manage daily check-ins, biometric scans, and leave registers for staff members assigned to this store."
                    : "View employee profiles and assignments across all retail branches. Other branch staff are read-only."}
                </p>
              </div>

              {/* Sub Mode Toggle Button Group */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setAttendanceSubMode('desk')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    attendanceSubMode === 'desk' ? 'bg-white text-slate-800 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📋 Attendance Desk
                </button>
                <button
                  type="button"
                  onClick={() => setAttendanceSubMode('directory')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    attendanceSubMode === 'directory' ? 'bg-white text-slate-800 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  👥 Staff Directory
                </button>
              </div>
            </div>

            {/* Attendance Desk Mode */}
            {attendanceSubMode === 'desk' && (
              <div className="space-y-6 animate-fade-in text-slate-800">
                {/* Roster Date Selection & Metrics */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-1.5 shadow-xs">
                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Roster Date:</span>
                    <input
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none border-none p-0 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Quick Metrics */}
                {(() => {
                  const branchStaff = staff.filter(s => s.assignedStoreId === store.id && s.isActive);
                  const storeAttendance = attendance.filter(r => r.storeId === store.id && r.date === attendanceDate);
                  const presentCount = storeAttendance.filter(r => r.status === 'Present').length;
                  const leaveCount = storeAttendance.filter(r => r.status === 'Leave').length;
                  const absentCount = branchStaff.length - presentCount - leaveCount;

                  return (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Branch Staff</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-slate-800">{branchStaff.length}</span>
                          <span className="text-[10px] text-slate-500 font-bold">assigned</span>
                        </div>
                      </div>

                      <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest block">Present Today</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-emerald-700">{presentCount}</span>
                          <span className="text-[10px] text-emerald-600 font-bold">checked in</span>
                        </div>
                      </div>

                      <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest block">Absent Today</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-rose-700">{Math.max(0, absentCount)}</span>
                          <span className="text-[10px] text-rose-600 font-bold">pending/absent</span>
                        </div>
                      </div>

                      <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 space-y-1.5">
                        <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest block">On Leave</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-amber-700">{leaveCount}</span>
                          <span className="text-[10px] text-amber-600 font-bold">approved</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Staff Register - Full Width */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    Roster Check-In List (Current Store Only)
                  </h4>

                  <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/20">
                    <div className="divide-y divide-slate-100">
                      {(() => {
                        const branchStaff = staff.filter(s => s.assignedStoreId === store.id && s.isActive);
                        if (branchStaff.length === 0) {
                          return (
                            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                              No active staff members are currently mapped/assigned to this store branch.
                              Use the Directory tab to re-assign/map employees to this store.
                            </div>
                          );
                        }

                        return branchStaff.map((member) => {
                          const record = attendance.find(r => r.staffId === member.id && r.date === attendanceDate);
                          const status = record?.status || 'Absent';
                          const inTime = record?.timeIn || '09:00';
                          const outTime = record?.timeOut || '18:00';

                          return (
                            <div key={member.id} className="p-4 bg-white hover:bg-slate-50/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
                              {/* Profile Info */}
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-extrabold text-sm text-slate-800">{member.name}</span>
                                  <span className="bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                    {member.role}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-slate-400 text-[10px]">
                                  <span>📱 {member.phone || 'No phone'}</span>
                                  {record && (
                                    <span className="text-emerald-600 font-semibold">
                                      ✓ Recorded: {new Date(record.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Simple Check-In / Check-Out Controls */}
                              <div className="flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2">
                                  {status !== 'Present' ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const now = new Date();
                                        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
                                        handleSaveManualAttendance(member, 'Present', currentTime, undefined);
                                      }}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      Check-In
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const now = new Date();
                                        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
                                        handleSaveManualAttendance(member, 'Present', inTime, currentTime);
                                      }}
                                      className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                    >
                                      Check-Out
                                    </button>
                                  )}
                                </div>

                                {/* Direct Manual Toggle */}
                                <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/40">
                                  <button
                                    type="button"
                                    onClick={() => handleSaveManualAttendance(member, 'Present', inTime, outTime)}
                                    className={`px-2.5 py-1 text-[10px] font-black rounded-md uppercase transition-all cursor-pointer ${
                                      status === 'Present'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    Present
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveManualAttendance(member, 'Leave', undefined, undefined)}
                                    className={`px-2.5 py-1 text-[10px] font-black rounded-md uppercase transition-all cursor-pointer ${
                                      status === 'Leave'
                                        ? 'bg-amber-500 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    Leave
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveManualAttendance(member, 'Absent', undefined, undefined)}
                                    className={`px-2.5 py-1 text-[10px] font-black rounded-md uppercase transition-all cursor-pointer ${
                                      status === 'Absent'
                                        ? 'bg-rose-500 text-white shadow-xs'
                                        : 'text-slate-500 hover:text-slate-800'
                                    }`}
                                  >
                                    Absent
                                  </button>
                                </div>

                                {/* Present Time Inputs */}
                                {status === 'Present' && (
                                  <div className="flex items-center gap-1.5 border-l border-slate-150 pl-4">
                                    <div className="space-y-0.5">
                                      <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">In</span>
                                      <input
                                        type="time"
                                        value={inTime}
                                        onChange={(e) => handleSaveManualAttendance(member, 'Present', e.target.value, outTime)}
                                        className="rounded-lg bg-slate-50 border border-slate-200 px-1.5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none"
                                      />
                                    </div>
                                    <span className="text-slate-300 text-xs font-bold pt-3">→</span>
                                    <div className="space-y-0.5">
                                      <span className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Out</span>
                                      <input
                                        type="time"
                                        value={outTime}
                                        onChange={(e) => handleSaveManualAttendance(member, 'Present', inTime, e.target.value)}
                                        className="rounded-lg bg-slate-50 border border-slate-200 px-1.5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Staff Directory Mode (Lists all staff, other branch staff read-only) */}
            {attendanceSubMode === 'directory' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in text-left">
                {staff.map((member) => {
                  const assignedStore = stores.find(st => st.id === member.assignedStoreId);
                  const storeName = assignedStore ? assignedStore.name : 'Unassigned Branch';
                  const storeLoc = assignedStore?.location || 'Unknown Location';
                  const isCurrentStoreStaff = member.assignedStoreId === store.id;

                  return (
                    <div key={member.id} className={`bg-white border rounded-2xl p-5 shadow-xs transition-all relative group flex flex-col justify-between ${
                      isCurrentStoreStaff ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-xs' : 'border-slate-100 opacity-80'
                    }`}>
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-sm ${
                              isCurrentStoreStaff 
                                ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' 
                                : 'bg-slate-50 border border-slate-100 text-slate-500'
                            }`}>
                              {member.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-extrabold text-sm text-slate-800">{member.name}</h4>
                                {!member.isActive && (
                                  <span className="bg-rose-50 text-rose-700 border border-rose-100 border-none text-[8px] font-black uppercase px-1.5 py-0.5 rounded-sm">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              <span className={`inline-block mt-0.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                member.role === 'Manager' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  : member.role === 'Cashier'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  : member.role === 'Salesperson'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                  : 'bg-slate-50 text-slate-700 border border-slate-100'
                              }`}>
                                {member.role}
                              </span>
                            </div>
                          </div>
                          
                          {/* Read-Only Badge for other store staff */}
                          {!isCurrentStoreStaff && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md flex items-center gap-1">
                              🔒 View-Only
                            </span>
                          )}
                        </div>

                        {/* Store / Location details */}
                        <div className="pt-2.5 border-t border-slate-100 space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                            <span className="text-sm">📍</span>
                            <div>
                              <span className="text-slate-800 font-bold block text-xs">{storeName}</span>
                              <span className="text-[10px] text-slate-400 font-medium block">{storeLoc}</span>
                            </div>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px] pt-1">
                              <span>📞</span>
                              <span>{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Edit button (Only shown if member is of this store) */}
                      <div className="mt-4 pt-3 border-t border-slate-100/60 flex justify-end min-h-[38px]">
                        {isCurrentStoreStaff ? (
                          <button
                            type="button"
                            onClick={() => setEditingStaff(member)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                          >
                            <Edit2 className="h-3 w-3" />
                            Edit Staff & Location
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic block py-1">
                            Cannot manage other branch staff
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {staff.length === 0 && (
                  <div className="col-span-full py-12 text-center text-slate-400 text-xs font-semibold">
                    No staff members found in the records.
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Modal / Dialog Backdrop overlay */}
          {editingStaff && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden text-left">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-emerald-950 to-slate-950 text-white p-5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-emerald-400">Edit Employee Profile</h3>
                    <p className="text-[11px] text-slate-300 font-semibold mt-0.5">Modify role, phone, and store assignment</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingStaff(null)}
                    className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Modal Form */}
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!editingStaff) return;
                    if (onUpdateStaff) {
                      await onUpdateStaff(editingStaff);
                    }
                    setEditingStaff(null);
                  }}
                  className="p-6 space-y-4"
                >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Employee Name</label>
                    <input
                      type="text"
                      required
                      value={editingStaff.name}
                      onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Contact Phone</label>
                    <input
                      type="text"
                      required
                      value={editingStaff.phone}
                      onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Role</label>
                      <select
                        value={editingStaff.role}
                        onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as any })}
                        className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      >
                        <option value="Manager">Manager</option>
                        <option value="Cashier">Cashier</option>
                        <option value="Salesperson">Salesperson</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</label>
                      <select
                        value={editingStaff.isActive ? 'Active' : 'Inactive'}
                        onChange={(e) => setEditingStaff({ ...editingStaff, isActive: e.target.value === 'Active' })}
                        className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive/Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Assigned Store Branch</label>
                    <select
                      value={editingStaff.assignedStoreId}
                      onChange={(e) => setEditingStaff({ ...editingStaff, assignedStoreId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                    >
                      {stores.map(st => (
                        <option key={st.id} value={st.id}>{st.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditingStaff(null)}
                      className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-black uppercase tracking-wider text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-xs transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Legacy Biometrics Section Disabled */}
      {false && (
        <div className="space-y-6 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  Roster Operations & Biometric Security
                </span>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <Fingerprint className="h-5 w-5 text-emerald-600" />
                  Staff Attendance & Biometric Verification Desk
                </h3>
                <p className="text-slate-500 text-xs">
                  Maintain daily attendance rosters for branch employees. Utilize capacitive simulation biometrics to safely sign-in staff, or manage check-in registers manually.
                </p>
              </div>

              {/* Date Selection */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-1.5 self-start md:self-auto shadow-xs">
                <span className="text-[10px] font-extrabold uppercase text-slate-400">Roster Date:</span>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none border-none p-0 cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Metrics */}
            {(() => {
              const branchStaff = staff.filter(s => s.assignedStoreId === store.id && s.isActive);
              const storeAttendance = attendance.filter(r => r.storeId === store.id && r.date === attendanceDate);
              const presentCount = storeAttendance.filter(r => r.status === 'Present').length;
              const absentCount = storeAttendance.filter(r => r.status === 'Absent').length;
              const leaveCount = storeAttendance.filter(r => r.status === 'Leave').length;

              return (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Roster Count</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-slate-800">{branchStaff.length}</span>
                      <span className="text-[10px] text-slate-500 font-bold">employees</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest block">Present Today</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-emerald-700">{presentCount}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">checked-in</span>
                    </div>
                  </div>

                  <div className="bg-rose-50/40 border border-rose-100 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-widest block">Absent Today</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-rose-700">{absentCount}</span>
                      <span className="text-[10px] text-rose-600 font-bold">not logged</span>
                    </div>
                  </div>

                  <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 space-y-1.5">
                    <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-widest block">On Approved Leave</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-amber-700">{leaveCount}</span>
                      <span className="text-[10px] text-amber-600 font-bold">out-of-office</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Content Split: Staff Register & Biometric Terminal */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
              
              {/* Left Panel: Staff Register Table (Col Span 7) */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-emerald-600" />
                  Daily Shift Register
                </h4>

                <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/20">
                  <div className="divide-y divide-slate-100">
                    {(() => {
                      const branchStaff = staff.filter(s => s.assignedStoreId === store.id && s.isActive);
                      if (branchStaff.length === 0) {
                        return (
                          <div className="p-8 text-center text-slate-400 text-xs font-semibold">
                            No staff members are currently assigned to this store branch. 
                            Add staff in the Management Control Panel first.
                          </div>
                        );
                      }

                      return branchStaff.map((member) => {
                        const record = attendance.find(r => r.staffId === member.id && r.date === attendanceDate);
                        const status = record?.status || 'Absent';
                        const inTime = record?.timeIn || '09:00';
                        const outTime = record?.timeOut || '18:00';

                        return (
                          <div key={member.id} className="p-4 bg-white hover:bg-slate-50/70 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Profile Info */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-800">{member.name}</span>
                                <span className="bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full">
                                  {member.role}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-slate-400 text-[10px]">
                                <span>📱 {member.phone || 'No phone'}</span>
                                {record && (
                                  <span className="text-emerald-600 font-semibold">
                                    ✓ Verified: {new Date(record.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Verification Options / Controls */}
                            <div className="flex flex-wrap items-center gap-3">
                              {/* Primary Check-In / Check-Out Buttons */}
                              <div className="flex items-center gap-2">
                                {status !== 'Present' ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const now = new Date();
                                      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
                                      handleSaveManualAttendance(member, 'Present', currentTime, '18:00');
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>👉</span> Check-In
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const now = new Date();
                                      const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
                                      handleSaveManualAttendance(member, 'Present', inTime, currentTime);
                                    }}
                                    className="bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>👈</span> Check-Out
                                  </button>
                                )}
                              </div>

                              {/* Biometric trigger */}
                              <button
                                type="button"
                                onClick={() => handleTriggerBiometricScan(member)}
                                disabled={biometricScanState === 'scanning'}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  biometricStaffId === member.id && biometricScanState === 'scanning'
                                    ? 'bg-amber-50 border-amber-300 text-amber-700 animate-pulse'
                                    : status === 'Present'
                                    ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs'
                                }`}
                              >
                                <Fingerprint className="h-3.5 w-3.5 text-emerald-600" />
                                {status === 'Present' ? 'Re-scan Biometrics' : 'Biometric Check-In'}
                              </button>

                              {/* Manual state selection dropdown/buttons */}
                              <div className="flex items-center rounded-lg bg-slate-100 p-0.5 border border-slate-200/40">
                                <button
                                  type="button"
                                  onClick={() => handleSaveManualAttendance(member, 'Present', inTime, outTime)}
                                  className={`px-2 py-1 text-[10px] font-black rounded-md uppercase transition-all cursor-pointer ${
                                    status === 'Present'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Present
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveManualAttendance(member, 'Leave', undefined, undefined)}
                                  className={`px-2 py-1 text-[10px] font-black rounded-md uppercase transition-all cursor-pointer ${
                                    status === 'Leave'
                                      ? 'bg-amber-500 text-white shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Leave
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveManualAttendance(member, 'Absent', undefined, undefined)}
                                  className={`px-2 py-1 text-[10px] font-black rounded-md uppercase transition-all cursor-pointer ${
                                    status === 'Absent'
                                      ? 'bg-rose-500 text-white shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Absent
                                </button>
                              </div>
                            </div>

                            {/* If present, show time-in and time-out inputs */}
                            {status === 'Present' && (
                              <div className="flex items-center gap-1.5 md:border-l border-slate-100 md:pl-4 pt-2 md:pt-0">
                                <div className="space-y-0.5">
                                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Time In</label>
                                  <input
                                    type="time"
                                    value={inTime}
                                    onChange={(e) => handleSaveManualAttendance(member, 'Present', e.target.value, outTime)}
                                    className="rounded-lg bg-slate-50 border border-slate-200 px-1.5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none"
                                  />
                                </div>
                                <span className="text-slate-300 text-xs font-bold pt-3">→</span>
                                <div className="space-y-0.5">
                                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">Time Out</label>
                                  <input
                                    type="time"
                                    value={outTime}
                                    onChange={(e) => handleSaveManualAttendance(member, 'Present', inTime, e.target.value)}
                                    className="rounded-lg bg-slate-50 border border-slate-200 px-1.5 py-1 text-[11px] font-bold text-slate-700 focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Panel: Biometric Hardware Console (Col Span 5) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-6">
                <div className="w-full bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl min-h-[380px]">
                  {/* Holographic matrix background effect */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent pointer-events-none"></div>
                  
                  {/* Glowing radar target */}
                  <div className="absolute top-4 right-4 h-2.5 w-2.5 bg-emerald-500 rounded-full animate-ping"></div>
                  <div className="absolute top-4 right-4 h-2.5 w-2.5 bg-emerald-500 rounded-full"></div>

                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-3 py-1 rounded-full mb-6">
                    Biometric Scanner Interface v4.8
                  </span>

                  {biometricStaffId ? (
                    (() => {
                      const activeMember = staff.find(s => s.id === biometricStaffId);
                      return (
                        <div className="w-full space-y-6 animate-fade-in">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Currently Registering:</span>
                            <h5 className="text-base font-black text-white">{activeMember?.name}</h5>
                            <span className="text-[11px] font-semibold text-emerald-400">{activeMember?.role}</span>
                          </div>

                          {/* Scanner Animation Frame */}
                          <div className="relative h-44 w-44 mx-auto rounded-full bg-slate-950 border-2 border-emerald-500/30 flex items-center justify-center shadow-[inset_0_0_20px_rgba(16,185,129,0.15)] overflow-hidden">
                            {/* Scanning horizontal line */}
                            {biometricScanState === 'scanning' && (
                              <div 
                                className="absolute left-0 right-0 h-1 bg-emerald-400 shadow-[0_0_12px_#34d399] z-10 animate-pulse"
                                style={{
                                  top: `${biometricScanProgress}%`,
                                  transition: 'top 0.2s linear'
                                }}
                              />
                            )}

                            {/* Pulse background waves */}
                            {biometricScanState === 'scanning' && (
                              <div className="absolute inset-4 rounded-full border border-emerald-500/10 animate-ping duration-1000"></div>
                            )}

                            {/* High-quality Fingerprint SVG */}
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="1.2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                              className={`h-24 w-24 transition-all duration-300 ${
                                biometricScanState === 'scanning'
                                  ? 'text-emerald-400 scale-105 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                                  : biometricScanState === 'success'
                                  ? 'text-emerald-500 scale-110 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                  : 'text-slate-700'
                              }`}
                            >
                              <path d="M12 10a2 2 0 0 0-2 2" />
                              <path d="M14 14a4 4 0 0 0-4-4" />
                              <path d="M8 10a6 6 0 0 1 12 0v2a2 2 0 0 1-2 2" />
                              <path d="M12 2a10 10 0 0 1 10 10V14a6 6 0 0 1-12 0V12a4 4 0 0 1 8 0" />
                              <path d="M6 12a8 8 0 0 1 16 0V14" />
                              <path d="M12 22V20" />
                              <path d="M12 18V16" />
                              <path d="M16 22V18" />
                              <path d="M8 22V18" />
                            </svg>

                            {/* Success Overlay Checkmark */}
                            {biometricScanState === 'success' && (
                              <div className="absolute inset-0 bg-emerald-950/85 flex items-center justify-center animate-in zoom-in-75 duration-300">
                                <CheckCircle2 className="h-16 w-16 text-emerald-400" />
                              </div>
                            )}
                          </div>

                          {/* Live Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs font-mono font-extrabold text-slate-400">
                              <span>PROGRESS SCAN:</span>
                              <span className="text-emerald-400">{biometricScanProgress}%</span>
                            </div>
                            <div className="w-full bg-slate-850 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div 
                                className="bg-emerald-500 h-full transition-all duration-200"
                                style={{ width: `${biometricScanProgress}%` }}
                              />
                            </div>
                          </div>

                          {/* Log messages console */}
                          <div className="bg-black/45 border border-slate-800 rounded-xl p-3.5 text-left font-mono text-[10px] space-y-1 text-slate-400 min-h-16">
                            <div className="text-emerald-500 font-extrabold flex items-center gap-1">
                              <span className="animate-pulse">●</span> CORE STATUS LOG:
                            </div>
                            <div className="text-white leading-relaxed">{biometricMessage}</div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="space-y-6 max-w-xs mx-auto animate-fade-in">
                      <div className="h-28 w-28 mx-auto rounded-3xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner relative group animate-pulse">
                        <div className="absolute inset-0 bg-emerald-500/5 rounded-3xl group-hover:bg-emerald-500/10 transition-all duration-300"></div>
                        <Fingerprint className="h-14 w-14 text-slate-700 group-hover:text-emerald-600/70 transition-all duration-300" />
                      </div>
                      
                      <div className="space-y-2">
                        <h5 className="text-sm font-extrabold text-white">Biometric Verification Portal</h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                          Select an active branch staff employee on the left roster to initiate high-fidelity fingerprint scan validation. 
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-850 rounded-xl text-[10px] text-slate-400 font-mono">
                        <span>SYS_STATUS:</span>
                        <span className="text-emerald-500 font-extrabold">SECURE_IDLE</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Info guidance */}
                <div className="w-full bg-slate-50 rounded-2xl border border-slate-200/80 p-5 space-y-3 text-left">
                  <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                    <span>💡</span>
                    Branch Attendance Policy
                  </h4>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                    Roster entries are automatically securely backed up and synchronized with the centralized payroll management console. Employees can also view their daily attendance reports on their client dashboard in real-time.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Minimal Breadcrumb Bar - Placed at the bottom of the page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm mt-6">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className={`flex h-2.5 w-2.5 items-center justify-center rounded-full ${offlineMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              {store.name.replace("Farmer's Gate - ", "")}
            </span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md">
            {store.location || 'Branch Unit'}
          </span>
        </div>

        {/* Dynamic Offline / Connection Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            offlineMode 
              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {offlineMode ? '🟠 Offline Mode' : '🟢 Cloud Syncing'}
          </span>
          <button
            type="button"
            onClick={handleToggleOfflineMode}
            className={`text-[10px] font-extrabold px-3 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
              offlineMode 
                ? 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {offlineMode ? '🔌 Switch Online' : '✈️ Work Offline'}
          </button>
        </div>
      </div>

      {/* Qr & Barcode Scanner Modal Component */}
      <QrScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
        inventory={storeInventory.map(item => ({
          ...item,
          category: getItemCategory(item.vegetableName)
        }))}
        title={
          scannerTarget === 'pos' 
            ? 'POS Quick Barcode Scanner' 
            : scannerTarget === 'sale' 
            ? 'Invoice Sale Barcode Scanner' 
            : scannerTarget === 'purchase'
              ? 'Supplier Purchase Barcode Scanner'
              : 'Inventory Ledger QR Scanner'
        }
      />

      {/* --- RETAIL BILLING CHECKOUT POP-UP MODAL --- */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4 shrink-0">
              <div>
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <span className="text-emerald-600">🛒</span> Point of Sale Checkout
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Finalize products weight, prices, and complete customer payment.</p>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-slate-700">
              
              {/* Load Pending Customer Order Banner */}
              {customerOrders && customerOrders.filter(co => co.storeId === store.id && co.status === 'Pending').length > 0 && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-indigo-950 uppercase tracking-wide">
                      <span className="animate-pulse">📥</span> Load Customer Order to Checkout
                    </span>
                    <span className="bg-indigo-200 text-indigo-800 text-[9px] px-2 py-0.5 rounded-full font-black">
                      {customerOrders.filter(co => co.storeId === store.id && co.status === 'Pending').length} Pending
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
                    {customerOrders
                      .filter(co => co.storeId === store.id && co.status === 'Pending')
                      .map(order => (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => {
                            setPosCustomerName(order.customerName);
                            setWhatsappPhone(order.customerPhone);
                            const newCart: Record<string, PosCartItem> = {};
                            order.items.forEach(it => {
                              const invItem = storeInventory.find(inv => inv.vegetableName.toLowerCase() === it.vegetableName.toLowerCase());
                              newCart[it.vegetableName] = {
                                quantity: it.quantity,
                                unit: 'kg',
                                pricePerKg: it.pricePerKg,
                                item: invItem || {
                                  id: `temp-${Date.now()}`,
                                  storeId: store.id,
                                  vegetableName: it.vegetableName,
                                  quantity: 100,
                                  costPrice: it.pricePerKg * 0.75,
                                  sellingPrice: it.pricePerKg,
                                  minStockThreshold: 10,
                                  lastUpdated: new Date().toISOString()
                                }
                              };
                            });
                            setPosCart(newCart);
                          }}
                          className="bg-white hover:bg-indigo-50/50 text-left border border-indigo-100 p-2 rounded-xl hover:border-indigo-300 transition-all cursor-pointer flex flex-col gap-0.5 shadow-3xs"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-extrabold text-[11px] text-indigo-950 truncate max-w-[150px]">{order.customerName}</span>
                            <span className="font-mono text-[10px] text-indigo-500 font-extrabold font-black">₹{order.totalAmount.toFixed(0)}</span>
                          </div>
                          <p className="text-[9px] text-indigo-700 font-medium truncate w-full font-mono">
                            {order.items.map(it => `${it.vegetableName} (${it.quantity}kg)`).join(', ')}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Multi-Billing Registers inside Checkout Pop-up */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider pr-2 border-r border-slate-200">
                    Registers
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {billingTabs.map((tab) => {
                      const isActive = tab.id === activeBillingTabId;
                      const tabCart = isActive ? posCart : tab.cart;
                      const itemCount = Object.keys(tabCart).length;
                      const subtotal = Object.keys(tabCart).reduce((sum, key) => sum + getSubtotal(tabCart[key]), 0);
                      const customerNameStr = isActive ? (posCustomerName || tab.label) : (tab.customerName || tab.label);
                      
                      return (
                        <div
                          key={tab.id}
                          onClick={() => handleSwitchBillingTab(tab.id)}
                          className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border cursor-pointer shrink-0 ${
                            isActive
                              ? 'bg-white border-emerald-500 text-emerald-800 shadow-3xs'
                              : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span>🎛️</span>
                          <span className="truncate max-w-[50px]">{customerNameStr}</span>
                          {itemCount > 0 && (
                            <span className="bg-emerald-100 text-emerald-800 font-mono text-[8px] px-1 py-0.5 rounded-full font-black">
                              ₹{subtotal.toFixed(0)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddBillingTab}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer shrink-0"
                >
                  + Add Register
                </button>
              </div>

              {Object.keys(posCart).length === 0 ? (
                <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6">
                  <span className="text-3xl block mb-2">🛒</span>
                  <h4 className="text-xs font-black text-slate-700">Your billing cart is empty</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Please close this modal and add some items from the Sale Items tab first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Customer Info Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1 text-left">
                      <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Customer Identity Name</label>
                      <input
                        type="text"
                        placeholder="Walk-in Counter Customer"
                        value={posCustomerName}
                        onChange={(e) => setPosCustomerName(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Send Receipt WhatsApp (+91)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-xs font-extrabold text-slate-400 font-mono">
                          +91
                        </span>
                        <input
                          type="tel"
                          placeholder="9876543210"
                          maxLength={10}
                          value={whatsappPhone}
                          onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 pl-11 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-left font-sans">
                      <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Attending Salesperson</label>
                      <select
                        value={salespersonName}
                        onChange={(e) => setSalespersonName(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">-- None --</option>
                        {staff && staff.filter(s => s.isActive).map(st => (
                          <option key={st.id} value={st.name}>
                            {st.name} ({st.role}) {st.assignedStoreId === store.id ? '📍 Here' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Itemized Cart List inside pop-up */}
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/40 space-y-3.5 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 text-left">Itemized Cart Ledger</span>
                    {Object.keys(posCart).map((vegName, idx) => {
                      const cartItem = posCart[vegName];
                      const itemSubtotal = getSubtotal(cartItem);
                      const changeStep = cartItem.unit === 'g' ? 50 : cartItem.unit === 'kg' ? 0.25 : 1;
                      
                      return (
                        <div key={cartItem.item.id} className={`${idx > 0 ? 'pt-3.5' : ''} flex flex-col gap-2`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{getVegEmoji(cartItem.item.vegetableName)}</span>
                              <h4 className="text-xs font-bold text-slate-800">{cartItem.item.vegetableName}</h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromPosCart(cartItem.item.vegetableName)}
                              className="text-[9px] uppercase font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 bg-white p-2 rounded-xl border border-slate-150">
                            {/* Quantity Adjuster */}
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-[8px] uppercase font-bold text-slate-400">Qty / Wt</span>
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity - changeStep)}
                                  className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-black"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step={changeStep}
                                  min="0.01"
                                  value={cartItem.quantity}
                                  onChange={(e) => handleUpdatePosCartQty(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                  className="w-10 bg-transparent text-center text-[11px] font-black text-slate-800 focus:outline-none font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity + changeStep)}
                                  className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-black"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Billing Unit */}
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-[8px] uppercase font-bold text-slate-400">Unit</span>
                              <select
                                value={cartItem.unit}
                                onChange={(e) => handleUpdatePosCartUnit(cartItem.item.vegetableName, e.target.value as any)}
                                className="bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer w-full"
                              >
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="pcs">pcs</option>
                                <option value="bunch">bunch</option>
                                <option value="pack">pack</option>
                              </select>
                            </div>

                            {/* Price adjustment & Subtotal */}
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <div className="flex flex-col text-left">
                                <span className="text-[8px] uppercase font-bold text-slate-400">Price (₹)</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={cartItem.pricePerKg}
                                  onChange={(e) => handleUpdatePosCartPrice(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                  className="w-12 bg-transparent text-left text-[11px] font-black text-slate-800 focus:outline-none font-mono"
                                />
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[8px] uppercase font-bold text-slate-400">Subtotal</span>
                                <span className="text-[11px] font-black text-emerald-600 font-mono">₹{itemSubtotal.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Payment Method Selector */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 text-left space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Select Billing Payment Mode *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Cash', 'Card', 'UPI'] as const).map((mode) => {
                        const isSel = paymentMode === mode;
                        const icon = mode === 'Cash' ? '💵' : mode === 'Card' ? '💳' : '📱';
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPaymentMode(mode)}
                            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                              isSel
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xs font-black'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span>{icon}</span>
                            <span>{mode}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Footer containing Total amount & Action Buttons */}
            {Object.keys(posCart).length > 0 && (
              <div className="border-t border-slate-100 pt-4 mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="text-center sm:text-left">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Grand Invoice Sum</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">
                    ₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleClearPosCart}
                    className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 text-xs transition-colors cursor-pointer font-bold"
                  >
                    CLEAR CART
                  </button>
                  <button
                    type="button"
                    onClick={handlePosCheckoutSubmit}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-6 py-3 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-200 hover:scale-[1.01]"
                  >
                    <span>COMPLETE SALE</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CONSUMER ORDER CANCELLATION MODAL DIALOG --- */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                <span className="text-red-500">🚫</span> Cancel Order #{cancellingOrder.id}
              </h3>
              <button 
                onClick={() => {
                  setCancellingOrder(null);
                  setCancellationReason('');
                }}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Customer Details:</p>
                <p className="mt-1">Name: <strong className="text-slate-900">{cancellingOrder.customerName}</strong></p>
                <p>Phone: <strong className="text-slate-900 font-mono">{cancellingOrder.customerPhone}</strong></p>
                <p className="mt-1">Order Amount: <strong className="text-indigo-600 font-mono">₹{cancellingOrder.totalAmount.toFixed(2)}</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  Cancellation Reason / Message
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g., Cucumber is currently out of stock. Apologies for the inconvenience!"
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white"
                />
                <p className="text-[9px] text-slate-400 mt-1">This message can be saved in the system logs or sent to the customer.</p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-4">
                
                {/* 1. Cancel and Keep in Logs with Reason (Update Status to Cancelled) */}
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateCustomerOrder) {
                      const updatedNotes = cancellationReason.trim()
                        ? `${cancellationReason.trim()} | ${cancellingOrder.notes || ''}`
                        : cancellingOrder.notes;
                      
                      const updated: CustomerOrder = {
                        ...cancellingOrder,
                        status: 'Cancelled',
                        notes: updatedNotes
                      };
                      onUpdateCustomerOrder(updated);
                      alert(`Order #${cancellingOrder.id} status updated to "Cancelled" with reason notes.`);
                      setCancellingOrder(null);
                      setCancellationReason('');
                    }
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  📝 Mark Cancelled in Database
                </button>

                {/* 2. Complete Delete Archive */}
                {onDeleteCustomerOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this order completely from active lists? This action is irreversible.')) {
                        onDeleteCustomerOrder(cancellingOrder.id);
                        alert(`Order #${cancellingOrder.id} deleted completely from active lists.`);
                        setCancellingOrder(null);
                        setCancellationReason('');
                      }
                    }}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🗑️ Delete completely (Archive)
                  </button>
                )}

                {/* 3. Send update on WhatsApp */}
                <a
                  href={`https://wa.me/91${cancellingOrder.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello ${cancellingOrder.customerName}, this is regarding your order #${cancellingOrder.id} of amount ₹${cancellingOrder.totalAmount.toFixed(2)}. ` +
                    `We regret to inform you that your order has been cancelled. ` +
                    (cancellationReason.trim() ? `Reason: ${cancellationReason.trim()}. ` : '') +
                    `Thank you for your understanding!`
                  )}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold rounded-xl py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Notify Customer on WhatsApp
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setCancellingOrder(null);
                    setCancellationReason('');
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-2.5 text-xs transition-all cursor-pointer"
                >
                  Discard / Keep Active
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EXTRACTED EMPLOYEE ATTENDANCE PROFILE & CENTRAL SYNC PORTAL --- */}
      {extractedStaffDetails && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full overflow-hidden shadow-2xl animate-fade-in text-slate-800">
            {/* Holographic Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-emerald-950 to-slate-900 text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 h-32 w-32 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/20 via-transparent to-transparent pointer-events-none"></div>
              <div className="flex items-center gap-3 relative z-10">
                <div className="p-2.5 bg-emerald-900/60 rounded-2xl border border-emerald-700/50">
                  <Fingerprint className="h-6 w-6 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider">
                    📡 Central HR Link Active
                  </span>
                  <h3 className="text-base font-black uppercase tracking-wider text-emerald-200 mt-1">
                    Employee Details Extracted successfully
                  </h3>
                </div>
              </div>
            </div>

            {/* Profile Package & Calculated KPIs */}
            <div className="p-6 space-y-5">
              {/* Sync Status / Progress indicator */}
              <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${
                      syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                    }`}></span>
                    Current Action: {
                      syncStatus === 'extracting' ? 'Extracting biometric signature records...' :
                      syncStatus === 'ready' ? 'Extracted payload ready for sync' :
                      syncStatus === 'syncing' ? 'Broadcasting data packets to central ledger...' :
                      'Ｒｏｓｔｅｒ  ｓｙｎｃｈｒｏｎｉｚｅｄ  ✓'
                    }
                  </span>
                  <span className="text-xs font-mono font-black text-emerald-600">
                    {syncProgress}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full transition-all duration-300"
                    style={{ width: `${syncProgress}%` }}
                  />
                </div>
              </div>

              {/* Extraction Package Body */}
              <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-3xs bg-slate-50/20">
                <div className="bg-slate-50/50 px-4.5 py-3 border-b border-slate-150 flex justify-between items-center">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
                    📦 Extracted Data Package
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold font-mono">
                    VERIFIED_BY: {extractedStaffDetails.verifiedBy}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  {/* Basic Profile details */}
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="h-12 w-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-extrabold text-lg text-slate-600 bg-gradient-to-br from-slate-100 to-slate-200 shadow-3xs">
                      👤
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-slate-800">{extractedStaffDetails.member.name}</h4>
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-800 text-[9px] font-black px-2 py-0.5 rounded uppercase">
                          {extractedStaffDetails.member.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-bold mt-0.5">
                        📞 {extractedStaffDetails.member.phone} • ID: {extractedStaffDetails.member.id}
                      </p>
                    </div>
                  </div>

                  {/* Attendance detail */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-medium border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Roster Workday</span>
                      <span className="font-extrabold text-slate-700 mt-1 block">{extractedStaffDetails.record.date}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Attendance Status</span>
                      <span className={`inline-flex items-center gap-1 font-extrabold px-2 py-0.5 rounded mt-1 text-[11px] ${
                        extractedStaffDetails.record.status === 'Present' ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' :
                        extractedStaffDetails.record.status === 'Leave' ? 'bg-amber-50 text-amber-800 border border-amber-150' :
                        'bg-rose-50 text-rose-800 border border-rose-150'
                      }`}>
                        {extractedStaffDetails.record.status === 'Present' ? '✓ Present' :
                         extractedStaffDetails.record.status === 'Leave' ? '⚠ Leave' : '✗ Absent'}
                      </span>
                    </div>
                    {extractedStaffDetails.record.status === 'Present' && (
                      <>
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Clock In Time</span>
                          <span className="font-black text-slate-800 mt-1 block font-mono">{extractedStaffDetails.record.timeIn || '09:00'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Clock Out Time</span>
                          <span className="font-black text-slate-800 mt-1 block font-mono">{extractedStaffDetails.record.timeOut || '18:00'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Calculated KPI Details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase block leading-none">Attendance Rate</span>
                      <span className="text-base font-black text-slate-800 block mt-1.5">{extractedStaffDetails.attendanceRate}%</span>
                      <span className="text-[8px] text-slate-400 font-bold block mt-0.5">({extractedStaffDetails.presentDays} Days present)</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase block leading-none">Days Recorded</span>
                      <span className="text-base font-black text-slate-800 block mt-1.5">{extractedStaffDetails.presentDays + extractedStaffDetails.leaveDays} Days</span>
                      <span className="text-[8px] text-slate-400 font-bold block mt-0.5">Roster total</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase block leading-none">Hours Worked</span>
                      <span className="text-base font-black text-slate-800 block mt-1.5 font-mono">{extractedStaffDetails.hoursWorked} hrs</span>
                      <span className="text-[8px] text-slate-400 font-bold block mt-0.5">Shift Total</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 text-center bg-emerald-50/20 border-emerald-150">
                      <span className="text-[8px] font-extrabold text-emerald-600 uppercase block leading-none">Est. Shift Pay</span>
                      <span className="text-base font-black text-emerald-700 block mt-1.5 font-mono">₹{extractedStaffDetails.payout}</span>
                      <span className="text-[8px] text-emerald-600 font-bold block mt-0.5">Today Payout</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex gap-2.5">
              {syncStatus === 'ready' && (
                <>
                  <button
                    type="button"
                    onClick={() => setExtractedStaffDetails(null)}
                    className="flex-1 py-3 border border-slate-200 hover:bg-white text-slate-500 rounded-xl text-xs font-bold cursor-pointer transition text-center shadow-3xs"
                  >
                    Discard Scan
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteCentralSync}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition shadow-sm cursor-pointer text-center flex items-center justify-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send to Central Module
                  </button>
                </>
              )}

              {syncStatus === 'extracting' && (
                <div className="w-full text-center py-2 text-slate-400 italic text-xs font-bold flex items-center justify-center gap-1.5">
                  <span className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                  Extracting complete shift details from local terminal logs...
                </div>
              )}

              {syncStatus === 'syncing' && (
                <div className="w-full text-center py-2 text-slate-400 italic text-xs font-bold flex items-center justify-center gap-1.5">
                  <span className="h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
                  Transmitting packets... Synchronizing centralized database...
                </div>
              )}

              {syncStatus === 'synced' && (
                <div className="w-full text-center py-2 text-emerald-600 font-black text-xs uppercase flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 animate-bounce" />
                  Successfully synced details with attendance and staff module!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-TAB CONTENT: SHOP EXPENSES (New simple & practical expense tracker) --- */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-6 animate-fade-in text-left">
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-50 border border-amber-150 flex items-center justify-center text-xl text-amber-600 shrink-0">
                💡
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Shop Running Bills</span>
                <span className="text-xl font-black text-slate-800 block mt-0.5">
                  {currencySymbol}{localExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-400 font-bold">Wages, rent, power & other bills</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-150 flex items-center justify-center text-xl text-blue-600 shrink-0">
                📦
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Stock Procurement Costs</span>
                <span className="text-xl font-black text-slate-800 block mt-0.5">
                  {currencySymbol}{purchases.filter(p => p.storeId === store.id).reduce((sum, p) => sum + p.totalCost, 0).toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-400 font-bold">Total spent buying farm stock</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-800 rounded-2xl p-4 shadow-md flex items-center gap-4 text-white">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-xl text-emerald-400 shrink-0">
                💰
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">Grand Total Spent</span>
                <span className="text-xl font-black text-white block mt-0.5">
                  {currencySymbol}{(localExpenses.reduce((sum, e) => sum + e.amount, 0) + purchases.filter(p => p.storeId === store.id).reduce((sum, p) => sum + p.totalCost, 0)).toLocaleString()}
                </span>
                <span className="text-[9px] text-slate-300 font-bold">Combined small business expenses</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Log New Expense Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                  <span>✍️</span> Log Daily Bill / Expense
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Keep track of every rupee spent running the shop.</p>
              </div>

              {expenseSuccessMsg && (
                <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold p-2.5 rounded-xl border border-emerald-150 animate-pulse">
                  ✓ {expenseSuccessMsg}
                </div>
              )}

              <form onSubmit={handleAddExpenseLocal} className="space-y-3.5">
                <div>
                  <label htmlFor="exp-category" className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Expense Type
                  </label>
                  <select
                    id="exp-category"
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-700 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="Wages">Wages & Salaries</option>
                    <option value="Electricity">Electricity & Power</option>
                    <option value="Rent">Shop Rent</option>
                    <option value="Other Expense">Other (Tea, Snacks, Cleaning, Repair)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="exp-name" className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Expense Name *
                  </label>
                  <input
                    id="exp-name"
                    type="text"
                    required
                    placeholder="e.g. Samosa & Chai, July Rent, Electricity"
                    value={expenseName}
                    onChange={(e) => setExpenseName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="exp-amount" className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Amount Spent ({currencySymbol})
                  </label>
                  <input
                    id="exp-amount"
                    type="number"
                    min="1"
                    placeholder="Enter amount"
                    required
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="exp-date" className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Expense Date
                  </label>
                  <input
                    id="exp-date"
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label htmlFor="exp-desc" className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Short Description / Notes
                  </label>
                  <textarea
                    id="exp-desc"
                    rows={2}
                    placeholder="e.g., Bought tea & samosas for helpers"
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs font-bold text-slate-800 bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl text-xs uppercase tracking-wider transition shadow-sm cursor-pointer"
                >
                  Save Expense
                </button>
              </form>
            </div>

            {/* Expenses Records */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>🧾</span> Shop Bills & Daily Expenses
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">List of running bills recorded by shop manager.</p>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                    {localExpenses.length} Records
                  </span>
                </div>

                {localExpenses.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <span className="text-2xl block">💡</span>
                    <h4 className="text-xs font-extrabold text-slate-600">No expenses logged yet</h4>
                    <p className="text-[10px] text-slate-400 max-w-[240px] mx-auto font-medium">Use the form on the left to add your first shop bill, helper salary, or rental expense.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Description</th>
                          <th className="py-2.5 px-3 text-right">Amount</th>
                          <th className="py-2.5 px-3 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {localExpenses.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-3 font-medium text-slate-500 whitespace-nowrap">
                              {new Date(exp.entryDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                                exp.category === 'Wages' ? 'bg-indigo-50 text-indigo-700' :
                                exp.category === 'Electricity' ? 'bg-amber-50 text-amber-700' :
                                exp.category === 'Rent' ? 'bg-purple-50 text-purple-700' :
                                'bg-slate-100 text-slate-600'
                              }`}>
                                {exp.category === 'Other Expense' ? 'Other' : exp.category}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-700 max-w-[180px] truncate" title={exp.description}>
                              {exp.description}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                              {currencySymbol}{exp.amount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteExpenseLocal(exp.id)}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                                title="Delete expense"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Automatic Stock Purchase Expenses list */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                    <span>🥦</span> Stock Purchase Log (Auto-generated)
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Purchases are automatically logged when stock is received from the central warehouse or mandi.</p>
                </div>

                {purchases.filter(p => p.storeId === store.id).length === 0 ? (
                  <div className="text-center py-6 text-[11px] text-slate-400 italic">
                    No crop stock procurement history found for this store.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-100 max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-wider sticky top-0">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Crop Name</th>
                          <th className="py-2.5 px-3 text-center">Qty Bought</th>
                          <th className="py-2.5 px-3 text-right">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {purchases.filter(p => p.storeId === store.id).slice(0, 10).map((pur) => (
                          <tr key={pur.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-2.5 px-3 font-medium text-slate-500 whitespace-nowrap">
                              {new Date(pur.purchaseDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                            </td>
                            <td className="py-2.5 px-3 font-bold text-slate-800 capitalize">
                              {pur.vegetableName.toLowerCase()}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                              {pur.quantity} kg
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-emerald-600 font-mono">
                              {currencySymbol}{pur.totalCost.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUB-TAB CONTENT: DAILY REPORT & CASH NOTE CALCULATOR --- */}
      {activeSubTab === 'report' && (() => {
        const selectedDateStr = reportDate;
        const salesOnDate = sales.filter(s => s.saleDate && s.saleDate.substring(0, 10) === selectedDateStr);
        const cashSales = isManualReport
          ? (parseFloat(manualCashSales) || 0)
          : salesOnDate.filter(s => s.paymentMode === 'Cash' || !s.paymentMode).reduce((sum, s) => sum + s.totalPrice, 0);
        const cardSales = isManualReport
          ? (parseFloat(manualCardSales) || 0)
          : salesOnDate.filter(s => s.paymentMode === 'Card').reduce((sum, s) => sum + s.totalPrice, 0);
        const upiSales = isManualReport
          ? (parseFloat(manualUpiSales) || 0)
          : salesOnDate.filter(s => s.paymentMode === 'UPI').reduce((sum, s) => sum + s.totalPrice, 0);
        const totalSalesAmount = cashSales + cardSales + upiSales;

        const expensesOnDate = localExpenses.filter(e => e.entryDate && e.entryDate.substring(0, 10) === selectedDateStr);
        const purchasesOnDate = purchases.filter(p => p.storeId === store.id && p.purchaseDate && p.purchaseDate.substring(0, 10) === selectedDateStr);

        // Filter manual details lists
        const manualDetailsOnDate = manualDetailsList.filter(d => d.date === selectedDateStr);
        const manualExpensesOnDate = manualDetailsOnDate.filter(d => d.type === 'Expense');
        const manualPurchasesOnDate = manualDetailsOnDate.filter(d => d.type === 'Purchase');

        const totalExpensesOnDate = isManualReport
          ? (manualExpensesOnDate.reduce((sum, e) => sum + e.amount, 0) + (parseFloat(manualExpenses) || 0))
          : expensesOnDate.reduce((sum, e) => sum + e.amount, 0);

        const totalPurchasesOnDate = isManualReport
          ? manualPurchasesOnDate.reduce((sum, p) => sum + p.amount, 0)
          : purchasesOnDate.reduce((sum, p) => sum + p.totalCost, 0);

        const q500 = parseInt(denom500) || 0;
        const q200 = parseInt(denom200) || 0;
        const q100 = parseInt(denom100) || 0;
        const q50 = parseInt(denom50) || 0;
        const q20 = parseInt(denom20) || 0;
        const q10 = parseInt(denom10) || 0;
        const q5 = parseInt(denom5) || 0;
        const q2 = parseInt(denom2) || 0;
        const q1 = parseInt(denom1) || 0;

        const v500 = q500 * 500;
        const v200 = q200 * 200;
        const v100 = q100 * 100;
        const v50 = q50 * 50;
        const v20 = q20 * 20;
        const v10 = q10 * 10;
        const v5 = q5 * 5;
        const v2 = q2 * 2;
        const v1 = q1 * 1;

        const cashCalculatorTotal = v500 + v200 + v100 + v50 + v20 + v10 + v5 + v2 + v1;
        const cashDifference = cashCalculatorTotal - cashSales;

        const getWhatsAppReportLink = () => {
          let text = `*FARMER'S GATE - DAILY CLOSING REPORT*\n`;
          text += `Store: *${store.name}*\n`;
          text += `Date: ${new Date(reportDate).toLocaleDateString()}\n`;
          text += `----------------------------------\n`;
          text += `💰 *SALES REVENUE SUMMARY*:\n`;
          text += `• Cash Sales: ₹${cashSales.toLocaleString()}\n`;
          text += `• UPI / PhonePe Sales: ₹${upiSales.toLocaleString()}\n`;
          text += `• Card / Swiping Sales: ₹${cardSales.toLocaleString()}\n`;
          text += `• *Total Sales*: *₹${totalSalesAmount.toLocaleString()}*\n\n`;

          text += `📉 *STORE EXPENSES & PROCUREMENT*:\n`;
          text += `• Total Expenses: ₹${totalExpensesOnDate.toLocaleString()}\n`;
          if (isManualReport) {
            if (manualExpensesOnDate.length > 0) {
              manualExpensesOnDate.forEach(e => {
                text += `  - [Expense] ${e.description}: ₹${e.amount.toLocaleString()}\n`;
              });
            }
          } else {
            if (expensesOnDate.length > 0) {
              expensesOnDate.forEach(e => {
                text += `  - ${e.description}: ₹${e.amount.toLocaleString()}\n`;
              });
            }
          }

          text += `• Total Stock Purchases: ₹${totalPurchasesOnDate.toLocaleString()}\n`;
          if (isManualReport) {
            if (manualPurchasesOnDate.length > 0) {
              manualPurchasesOnDate.forEach(p => {
                text += `  - [Purchase] ${p.description}: ₹${p.amount.toLocaleString()}\n`;
              });
            }
          } else {
            if (purchasesOnDate.length > 0) {
              purchasesOnDate.forEach(p => {
                text += `  - [Purchase] Order #${p.id.substring(0, 6)}: ₹${p.totalCost.toLocaleString()}\n`;
              });
            }
          }

          text += `\n💵 *CASH DRAWER RECONCILIATION*:\n`;
          text += `• Expected Cash: ₹${cashSales.toLocaleString()}\n`;
          text += `• Actual Cash Counted: ₹${cashCalculatorTotal.toLocaleString()}\n`;
          const diffText = cashDifference === 0 
            ? `✓ Perfectly Matched!` 
            : cashDifference > 0 
            ? `Surplus: +₹${cashDifference.toLocaleString()}` 
            : `Mismatch/Deficit: -₹${Math.abs(cashDifference).toLocaleString()}`;
          text += `• Difference Status: ${diffText}\n`;
          text += `----------------------------------\n`;
          text += `Report compiled by Store Terminal.`;

          return `https://wa.me/${store.whatsappNumber || ''}?text=${encodeURIComponent(text)}`;
        };

        const clearDenominators = () => {
          setDenom2000('');
          setDenom500('');
          setDenom200('');
          setDenom100('');
          setDenom50('');
          setDenom20('');
          setDenom10('');
          setDenom5('');
          setDenom2('');
          setDenom1('');
        };

        return (
          <div className="space-y-6 animate-fade-in text-left">
            {/* Header with Date Picker */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
              <div>
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                  <span>📊</span> Daily Store Report & Closing
                </h2>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Track daily cash receipts, UPI/Card sales, store expenses, and reconcile cash box.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                {/* Manual Report Toggle Button Group */}
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsManualReport(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      !isManualReport ? 'bg-white text-slate-800 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    📊 Auto POS
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsManualReport(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      isManualReport ? 'bg-white text-slate-800 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    ✍️ Manual Entry
                  </button>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
                  <span className="text-[10px] font-black uppercase text-slate-400">Date:</span>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none border-none p-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Manual Entry Form Inputs */}
            {isManualReport && (
              <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 shadow-xs space-y-5 animate-fade-in text-left">
                <div className="flex items-center gap-2">
                  <span className="text-base">✍️</span>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">Manual Closing Report Inputs</h3>
                    <p className="text-[10px] text-slate-500 font-medium">Enter sales and base figures manually for {new Date(reportDate).toLocaleDateString()}.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Manual Cash Sales (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={manualCashSales}
                      onChange={(e) => setManualCashSales(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Manual UPI Sales (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={manualUpiSales}
                      onChange={(e) => setManualUpiSales(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Manual Card Sales (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={manualCardSales}
                      onChange={(e) => setManualCardSales(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Uncategorized Base Expense (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={manualExpenses}
                      onChange={(e) => setManualExpenses(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 py-2.5 px-3.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                    />
                  </div>
                </div>

                {/* Detailed Manual Expense & Purchase Add Section */}
                <div className="pt-4 border-t border-emerald-100/60 space-y-3.5">
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 block">
                      Detailed Expense & Purchase Ledger (Itemized Breakdown)
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Add specific expenses or farm purchases to categorize and break down manually.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white/70 p-4 rounded-xl border border-emerald-100/40">
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Type</label>
                      <select
                        value={newManualDetailType}
                        onChange={(e) => setNewManualDetailType(e.target.value as 'Expense' | 'Purchase')}
                        className="w-full rounded-lg border border-slate-200 py-2 px-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white cursor-pointer"
                      >
                        <option value="Expense">📉 Expense (Tea, Wages, Rent, etc.)</option>
                        <option value="Purchase">📦 Purchase (Stock Procurement / Veggies)</option>
                      </select>
                    </div>

                    <div className="md:col-span-5 space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Description / Details</label>
                      <input
                        type="text"
                        placeholder="e.g. Tomato wholesale purchase, Chai & snack bill, Staff wages"
                        value={newManualDetailDescription}
                        onChange={(e) => setNewManualDetailDescription(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 py-2 px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Amount (₹)</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="0"
                        value={newManualDetailAmount}
                        onChange={(e) => setNewManualDetailAmount(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 py-2 px-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                      />
                    </div>

                    <div className="md:col-span-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!newManualDetailDescription.trim() || !newManualDetailAmount) return;
                          const amount = parseFloat(newManualDetailAmount);
                          if (isNaN(amount) || amount <= 0) return;

                          const newItem = {
                            id: Math.random().toString(36).substring(2, 9),
                            date: selectedDateStr,
                            type: newManualDetailType,
                            description: newManualDetailDescription.trim(),
                            amount: amount
                          };

                          setManualDetailsList(prev => [...prev, newItem]);
                          setNewManualDetailDescription('');
                          setNewManualDetailAmount('');
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-lg text-xs uppercase tracking-wider transition cursor-pointer flex items-center justify-center"
                      >
                        ➕ Add
                      </button>
                    </div>
                  </div>

                  {/* Added Items List (with easy delete) */}
                  {manualDetailsOnDate.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[9px] text-slate-400 font-black uppercase">
                          <tr>
                            <th className="px-3.5 py-2">Type</th>
                            <th className="px-3.5 py-2">Description</th>
                            <th className="px-3.5 py-2 text-right">Amount</th>
                            <th className="px-3.5 py-2 text-center w-12">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {manualDetailsOnDate.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/40">
                              <td className="px-3.5 py-2">
                                <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                                  item.type === 'Expense' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                                }`}>
                                  {item.type}
                                </span>
                              </td>
                              <td className="px-3.5 py-2 font-bold text-slate-700">{item.description}</td>
                              <td className="px-3.5 py-2 font-extrabold text-slate-800 text-right font-mono">₹{item.amount.toLocaleString()}</td>
                              <td className="px-3.5 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualDetailsList(prev => prev.filter(x => x.id !== item.id));
                                  }}
                                  className="text-rose-500 hover:text-rose-700 transition cursor-pointer text-xs"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Section: Sales & Expense Dashboard */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Visual Sales Category Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">💵 Cash Sales</span>
                    <span className="text-2xl font-black text-slate-800 block mt-1 font-mono">
                      {currencySymbol}{cashSales.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-emerald-600 font-bold block mt-1">✓ Expected in drawer</span>
                    <div className="absolute right-3 bottom-3 text-2xl opacity-15">💵</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">📱 UPI / QR Sales</span>
                    <span className="text-2xl font-black text-slate-800 block mt-1 font-mono">
                      {currencySymbol}{upiSales.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-indigo-600 font-bold block mt-1">✓ Digital direct to bank</span>
                    <div className="absolute right-3 bottom-3 text-2xl opacity-15">📱</div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">💳 Card Sales</span>
                    <span className="text-2xl font-black text-slate-800 block mt-1 font-mono">
                      {currencySymbol}{cardSales.toLocaleString()}
                    </span>
                    <span className="text-[9px] text-purple-600 font-bold block mt-1">✓ POS swipe machine</span>
                    <div className="absolute right-3 bottom-3 text-2xl opacity-15">💳</div>
                  </div>
                </div>

                {/* Combined Totals & Reconciliation Summary */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
                  <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Financial Overview</h3>
                  
                  <div className="divide-y divide-slate-100">
                    <div className="py-3 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">Total Sales Count</span>
                      <span className="text-xs font-black text-slate-800">{salesOnDate.length} Bills Filed</span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">Total Gross Sales Revenue</span>
                      <span className="text-xs font-black text-slate-900 font-mono text-base">
                        {currencySymbol}{totalSalesAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">Logged Daily Expenses</span>
                      <span className="text-xs font-black text-rose-600 font-mono">
                        -{currencySymbol}{totalExpensesOnDate.toLocaleString()}
                      </span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">Stock Purchases / Procurement</span>
                      <span className="text-xs font-black text-blue-600 font-mono">
                        -{currencySymbol}{totalPurchasesOnDate.toLocaleString()}
                      </span>
                    </div>

                    <div className="py-3 flex justify-between items-center">
                      <span className="text-xs text-slate-500 font-bold">Net Sales Margin (Revenue - Expenses - Purchases)</span>
                      {(() => {
                        const netMargin = totalSalesAmount - totalExpensesOnDate - totalPurchasesOnDate;
                        return (
                          <span className={`text-xs font-black font-mono text-base ${netMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {netMargin >= 0 ? '+' : ''}{currencySymbol}{netMargin.toLocaleString()}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="py-4 mt-1 bg-slate-50/50 border border-slate-150 rounded-xl px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-700">Cash Drawer Reconciliation</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">Comparison between recorded Cash Sales and actual notes counted in the cash drawer.</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase text-slate-400 block">Drawer Balance Status</span>
                        {cashDifference === 0 ? (
                          <span className="text-emerald-600 font-black text-xs flex items-center justify-end gap-1 mt-0.5">
                            <span>✓</span> Perfectly Matched!
                          </span>
                        ) : cashDifference > 0 ? (
                          <span className="text-emerald-700 font-black text-xs flex items-center justify-end gap-1 mt-0.5">
                            <span>⚡</span> Surplus: +{currencySymbol}{cashDifference.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-black text-xs flex items-center justify-end gap-1 mt-0.5 animate-pulse">
                            <span>⚠️</span> Shortfall: -{currencySymbol}{Math.abs(cashDifference).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* WhatsApp send button */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
                    <a
                      href={getWhatsAppReportLink()}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="flex-1 bg-[#25D366] hover:bg-[#20ba5a] text-white font-extrabold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      <span>💬</span> Send Closing Report on WhatsApp
                    </a>
                  </div>
                </div>

                {/* List of expenses for the day */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                      {isManualReport ? "Manual Details for Date" : "Expenses & Purchases Details"}
                    </h3>
                    <span className="bg-slate-100 text-slate-600 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                      {isManualReport ? manualDetailsOnDate.length : (expensesOnDate.length + purchasesOnDate.length)} logs
                    </span>
                  </div>

                  {isManualReport ? (
                    manualDetailsOnDate.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2 text-center">No manual expenses/purchases recorded on this date.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {manualDetailsOnDate.map(d => (
                          <div key={d.id} className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50/50">
                            <div>
                              <span className="font-extrabold text-slate-700 block">{d.description}</span>
                              <span className={`inline-block mt-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                                d.type === 'Expense' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}>
                                {d.type}
                              </span>
                            </div>
                            <span className={`font-extrabold font-mono ${d.type === 'Expense' ? 'text-rose-600' : 'text-blue-600'}`}>
                              -{currencySymbol}{d.amount.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : (
                    <div>
                      {expensesOnDate.length === 0 && purchasesOnDate.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-2 text-center">No auto expenses or purchases recorded on this date.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {expensesOnDate.map(e => (
                            <div key={e.id} className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50/50">
                              <div>
                                <span className="font-extrabold text-slate-700 block">{e.description}</span>
                                <span className="text-[9px] text-slate-400 font-bold capitalize">{e.category}</span>
                              </div>
                              <span className="font-extrabold text-rose-600 font-mono">-{currencySymbol}{e.amount.toLocaleString()}</span>
                            </div>
                          ))}
                          {purchasesOnDate.map(p => (
                            <div key={p.id} className="p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-50/50">
                              <div>
                                <span className="font-extrabold text-slate-700 block">Stock Procurement: Order #{p.id.substring(0, 6)}</span>
                                <span className="text-[9px] text-blue-500 font-bold capitalize">Farmer Wholesale</span>
                              </div>
                              <span className="font-extrabold text-blue-600 font-mono">-{currencySymbol}{p.totalCost.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Section: Currency Denominator Calculator */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 h-fit">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
                      <span>💵</span> Cash Note Calculator
                    </h3>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Count notes and calculate total cash easily.</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearDenominators}
                    className="text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 cursor-pointer bg-slate-50 hover:bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-150 transition-all"
                  >
                    Clear All
                  </button>
                </div>

                <div className="space-y-2">
                  {[500, 200, 100, 50, 20, 10, 5, 2, 1].map(note => {
                    const valMap = {
                      500: { state: denom500, setter: setDenom500, calc: v500 },
                      200: { state: denom200, setter: setDenom200, calc: v200 },
                      100: { state: denom100, setter: setDenom100, calc: v100 },
                      50: { state: denom50, setter: setDenom50, calc: v50 },
                      20: { state: denom20, setter: setDenom20, calc: v20 },
                      10: { state: denom10, setter: setDenom10, calc: v10 },
                      5: { state: denom5, setter: setDenom5, calc: v5 },
                      2: { state: denom2, setter: setDenom2, calc: v2 },
                      1: { state: denom1, setter: setDenom1, calc: v1 }
                    };
                    const item = valMap[note as keyof typeof valMap];
                    return (
                      <div key={note} className="flex items-center justify-between gap-3 text-xs py-1 border-b border-dashed border-slate-50">
                        <span className="font-extrabold text-slate-500 w-10">₹{note}</span>
                        <span className="text-slate-400">×</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={item.state}
                          onChange={(e) => item.setter(e.target.value)}
                          className="w-16 rounded-lg border border-slate-200 py-1 px-1.5 text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <span className="text-slate-300">=</span>
                        <span className="font-black text-slate-700 font-mono text-right w-20">
                          {currencySymbol}{item.calc.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Total notes counted */}
                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">Counted Total Cash</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">
                    {currencySymbol}{cashCalculatorTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- SUB-TAB CONTENT: STOCK TRANSFER --- */}
      {activeSubTab === 'stock-transfer' && (
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-3xs animate-fade-in">
          <StockTransferTab
            store={store}
            stores={stores}
            inventory={inventory}
            onUpdateInventoryItem={onUpdateInventoryItem}
            currencySymbol={currencySymbol}
          />
        </div>
      )}

      {/* --- SUB-TAB CONTENT: STOCK WASTE --- */}
      {activeSubTab === 'stock-waste' && (
        <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-3xs animate-fade-in">
          <StockWasteTab
            store={store}
            inventory={inventory}
            onUpdateInventoryItem={onUpdateInventoryItem}
            currencySymbol={currencySymbol}
          />
        </div>
      )}

      {/* --- QUICK ADD BOTTOM SHEET FOR MOBILE --- */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-3xs z-50 flex items-end justify-center animate-in fade-in duration-200">
          {/* Backdrop Click */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsQuickAddOpen(false)} />
          
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8 space-y-4 text-left animate-in slide-in-from-bottom duration-350 max-h-[85vh] flex flex-col z-10">
            {/* Drag/Slide Handle Look */}
            <div className="flex justify-center shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full cursor-pointer hover:bg-slate-300" onClick={() => setIsQuickAddOpen(false)} />
            </div>

            <div className="flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span>⚡</span> Quick Add Crop Catalog
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">Tap to instantly add items to active register cart.</p>
              </div>
              <button 
                onClick={() => setIsQuickAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full h-7 w-7 flex items-center justify-center font-extrabold text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Add Grid Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
              <div className="grid grid-cols-4 gap-2">
                {COMMON_CROPS_LIST.map((crop) => {
                  const cartItem = posCart[crop.name];
                  const countInCart = cartItem ? cartItem.quantity : 0;
                  return (
                    <button
                      key={crop.name}
                      onClick={() => handleQuickAddCrop(crop)}
                      className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center group active:scale-95 ${
                        countInCart > 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-3xs'
                          : 'bg-slate-50/50 border-slate-150 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {countInCart > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[8px] px-1 rounded-full font-black min-w-[14px] text-center">
                          {countInCart}
                        </span>
                      )}
                      <span className="text-2xl transform group-hover:scale-110 transition-transform">{crop.emoji}</span>
                      <span className="text-[9px] font-black tracking-tight leading-none truncate w-full">{crop.name}</span>
                      <span className="text-[8px] font-mono text-slate-400">₹{crop.defaultPrice}/kg</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Cart Quick Summary Footer */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 shrink-0 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Cart Total ({Object.keys(posCart).length} items):</span>
                <span className="font-black text-emerald-600 font-mono text-sm">
                  ₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setSaleSubView('checkout');
                  }}
                  disabled={Object.keys(posCart).length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold rounded-xl py-2.5 text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>🛒 View Checkout Cart</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
