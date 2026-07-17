import React, { useState, useEffect, useMemo } from 'react';
import { generateId } from '../lib/utils';
import { MilkCustomer, Sale } from '../types';
import { useData } from '../contexts/DataContext';
import { 
  saveMilkCustomerToDb, 
  deleteMilkCustomerFromDb,
  saveMilkDeletionRequest,
  deleteMilkDeletionRequest,
  subscribeToMilkDeletionRequests
} from '../lib/farmersGateDb';
import type { MilkDeletionRequest } from '../lib/farmersGateDb';
import { 
  Users, 
  Plus, 
  Minus,
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  Phone, 
  MapPin, 
  Sparkles, 
  Filter,
  DollarSign,
  Package,
  Calendar,
  AlertTriangle,
  ChevronDown,
  FileText,
  Share2,
  X,
  Download,
  Send,
  Smartphone,
  CheckCircle,
  MessageCircle,
  RefreshCw
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DEFAULT_MILK_CUSTOMERS: MilkCustomer[] = [];

interface CustomerMilkRegistryProps {
  storeId?: string;
  requestSecureAction?: (action: () => void, description: string) => void;
  onAddSale?: (sale: Sale | Sale[]) => void;
  onDeleteSale?: (id: string) => void;
  sales?: Sale[];
}

const getStoreAbbrFromId = (sId?: string): string => {
  if (!sId) return 'HQ';
  
  try {
    const saved = localStorage.getItem('fg_cached_stores') || localStorage.getItem('fg_stores');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const st = parsed.find((s: any) => s && s.id === sId);
        if (st) {
          if (st.storeCode) return st.storeCode.toUpperCase();
          const cleanName = st.name.replace("Farmer's Gate - ", "").replace("Outlet", "").trim();
          const words = cleanName.split(/\s+/);
          if (words.length >= 3) {
            return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
          } else if (words.length === 2) {
            return (words[0][0] + words[1][0] + (words[1][1] || '')).toUpperCase().substring(0, 3);
          } else if (cleanName.length >= 3) {
            return cleanName.substring(0, 3).toUpperCase();
          }
        }
      }
    }
  } catch (e) {}
  
  return sId.substring(0, 4).toUpperCase();
};

const getStoreNameFromId = (sId?: string): string => {
  if (!sId) return "HQ Branch";
  
  try {
    const saved = localStorage.getItem('fg_cached_stores') || localStorage.getItem('fg_stores');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const st = parsed.find((s: any) => s && s.id === sId);
        if (st) return st.storeCode ? `[${st.storeCode}] ${st.name}` : st.name;
      }
    }
  } catch (e) {}
  
  return `Farmer's Gate - ${sId.substring(0, 4).toUpperCase()}`;
};


function DailyAdjustmentForm({ customer: c, onSave }: { customer: MilkCustomer, onSave: (date: string, cow: number, buf: number) => void }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const [adjDate, setAdjDate] = useState(todayStr);
  
  const dayLog = c.milkTakenLogs?.find(l => l.date === adjDate);
  const defaultCow = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
  const defaultBuffalo = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
  
  const isTodayAdj = adjDate === todayStr;
  const wasTakenAdj = dayLog ? dayLog.quantity !== 0 : (isTodayAdj ? c.takenDaily !== false : true);
  
  const curCow = dayLog ? (dayLog.cowQuantityTaken ?? 0) : (wasTakenAdj ? defaultCow : 0);
  const curBuf = dayLog ? (dayLog.buffaloQuantityTaken ?? 0) : (wasTakenAdj ? defaultBuffalo : 0);
  
  const [cowQ, setCowQ] = useState(curCow.toString());
  const [bufQ, setBufQ] = useState(curBuf.toString());
  
  useEffect(() => {
    setCowQ(curCow.toString());
    setBufQ(curBuf.toString());
  }, [adjDate, c.milkTakenLogs, c.takenDaily]);

  return (
    <>
      <div className="flex items-center gap-2">
        <input type="date" value={adjDate} onChange={(e) => setAdjDate(e.target.value)} max={todayStr} className="text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none focus:border-emerald-400" />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {(c.milkType === 'Cow' || c.milkType === 'Both') && (
          <div className="space-y-1">
            <label className="block text-[9px] font-black uppercase text-slate-400">🐄 Cow (L)</label>
            <input type="number" step="0.5" min="0" value={cowQ} onChange={(e) => setCowQ(e.target.value)} className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-2 focus:outline-none" />
          </div>
        )}
        {(c.milkType === 'Buffalo' || c.milkType === 'Both') && (
          <div className="space-y-1">
            <label className="block text-[9px] font-black uppercase text-slate-400">🐃 Buffalo (L)</label>
            <input type="number" step="0.5" min="0" value={bufQ} onChange={(e) => setBufQ(e.target.value)} className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-2 focus:outline-none" />
          </div>
        )}
      </div>
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onSave(adjDate, parseFloat(cowQ) || 0, parseFloat(bufQ) || 0);
        }}
        className="mt-2 w-full py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black uppercase text-[10px] rounded-lg transition-all border border-emerald-200"
      >
        Save Day Quantity
      </button>
    </>
  );
}

export default function CustomerMilkRegistry({ 
  storeId, 
  requestSecureAction,
  onAddSale,
  onDeleteSale,
  sales = []
}: CustomerMilkRegistryProps) {
  const [showBillModal, setShowBillModal] = useState<MilkCustomer | null>(null);

  const randomHealthQuote = useMemo(() => {
    const quotes = [
      "Milk: A daily dose of wellness.",
      "Nature's perfect food for strong bones and a healthy heart.",
      "Pure, fresh, and full of vitality.",
      "A glass of health, direct from the farm.",
      "Nourishing families with farm-fresh purity.",
      "Wholesome goodness in every drop."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }, [showBillModal]);

  
  const [globalCowPrice, setGlobalCowPrice] = useState<number>(() => {
    const saved = localStorage.getItem('fg_global_cow_price');
    return saved ? Number(saved) : 60;
  });
  const [globalBuffaloPrice, setGlobalBuffaloPrice] = useState<number>(() => {
    const saved = localStorage.getItem('fg_global_buffalo_price');
    return saved ? Number(saved) : 75;
  });

  const [billingPeriod, setBillingPeriod] = useState<'last15' | 'last30' | 'thisMonth' | 'lastMonth'>('last30');
  const [showProblematicOnly, setShowProblematicOnly] = useState(false);
  const [customBillMessage, setCustomBillMessage] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsSentStatus, setSmsSentStatus] = useState(false);

  const { milkCustomers: dbCustomers, stores } = useData();

  // Optimistic/Local State of Milk Customers to prevent race conditions and fast updates
  const [localCustomers, setLocalCustomers] = useState<MilkCustomer[]>([]);

  useEffect(() => {
    if (dbCustomers) {
      const sorted = [...dbCustomers].sort((a, b) => {
        return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
      });
      const formatted = sorted.map((c: any) => {
        // Migration: If storeId is missing OR explicitly 'store-1', reassign to first valid store
        // Ensure this only happens once by checking if we actually changed anything
        if (!c.storeId || c.storeId === 'store-1' || c.storeId === 'Default' || c.storeId === 'undefined') {
          const newStoreId = storeId || stores[0]?.id || 'CHOUHAN-HQ';
          return {
            ...c,
            storeId: newStoreId
          };
        }
        return c;
      });
      
      const hasChanges = JSON.stringify(sorted) !== JSON.stringify(formatted);
      
      // If any migrations were applied, persist them to Firestore
      if (hasChanges) {
        console.log("[MilkRegistry] Applying auto-migration for store assignments...");
        setCustomers(formatted, "Auto-Migrate Milk Customers to Valid Stores");
      } else {
        // Only update local state if it actually differs from Firestore to prevent state flicker
        if (JSON.stringify(localCustomers) !== JSON.stringify(formatted)) {
          setLocalCustomers(formatted);
        }
      }
    }
  }, [dbCustomers, storeId, stores]);

  const customers = localCustomers;

  const activeCustomer = useMemo(() => {
    if (!showBillModal) return null;
    return customers.find(c => c.id === showBillModal.id) || showBillModal;
  }, [showBillModal, customers]);

  // Duplicate detection logic
  const duplicateMap = useMemo(() => {
    const mobileMap: Record<string, string[]> = {};
    const nameMap: Record<string, string[]> = {};
    
    customers.forEach(c => {
      const mob = c.mobile.replace(/[^\d]/g, '');
      if (mob && mob.length >= 10) {
        if (!mobileMap[mob]) mobileMap[mob] = [];
        mobileMap[mob].push(c.id);
      }
      
      const nm = c.name.toLowerCase().trim();
      if (nm) {
        if (!nameMap[nm]) nameMap[nm] = [];
        nameMap[nm].push(c.id);
      }
    });
    
    return { mobileMap, nameMap };
  }, [customers]);

  const isDuplicate = (c: MilkCustomer) => {
    const mob = c.mobile.replace(/[^\d]/g, '');
    const nm = c.name.toLowerCase().trim();
    
    const mobDupes = mob ? (duplicateMap.mobileMap[mob] || []) : [];
    const nameDupes = nm ? (duplicateMap.nameMap[nm] || []) : [];
    
    return mobDupes.length > 1 || nameDupes.length > 1;
  };

  // State mutation wrapper that syncs local edits to Firestore directly
  const setCustomers = (
    newCustomers: MilkCustomer[] | ((prev: MilkCustomer[]) => MilkCustomer[]),
    description?: string
  ) => {
    const applyUpdate = () => {
      setLocalCustomers(prev => {
        const updated = typeof newCustomers === 'function' ? newCustomers(prev) : newCustomers;
        
        // Sync each updated/added customer to Firestore
        updated.forEach((c) => {
          const prevC = prev.find((p) => p.id === c.id);
          if (!prevC || JSON.stringify(prevC) !== JSON.stringify(c)) {
            saveMilkCustomerToDb(c);
          }
        });

        // If a customer was deleted, delete from Firestore
        prev.forEach((p) => {
          if (!updated.some((u) => u.id === p.id)) {
            deleteMilkCustomerFromDb(p.id);
          }
        });
        
        return updated;
      });
    };

    if (requestSecureAction && description) {
      requestSecureAction(applyUpdate, description);
    } else {
      applyUpdate();
    }
  };

  const [deletionRequests, setDeletionRequests] = useState<MilkDeletionRequest[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToMilkDeletionRequests((requests) => {
      setDeletionRequests(requests);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeCustomer) {
      const { totalAmt } = generateBillContent(activeCustomer, billingPeriod);
      const periodLabel = billingPeriod === 'last15' ? 'Last 15 Days' : billingPeriod === 'last30' ? 'Last 30 Days' : billingPeriod === 'thisMonth' ? 'This Month' : 'Last Month';
      setCustomBillMessage(
        `🥛 *CHOUHAN DAIRY FARM* 🥛\n\n` +
        `👤 *Customer:* ${activeCustomer.name}\n` +
        `📞 *Mobile:* ${activeCustomer.mobile}\n` +
        `📅 *Billing Period:* ${periodLabel}\n` +
        `💰 *Total Amount Due:* ₹${totalAmt.toFixed(2)}\n\n` +
        `Please pay at your earliest convenience.\n\n` +
        `Thank you for choosing Chouhan Dairy Farm!`
      );
      setSmsSentStatus(false);
    }
  }, [activeCustomer, billingPeriod]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Cow' | 'Buffalo'>('All');
  const [selectedListStoreId, setSelectedListStoreId] = useState<string>(storeId || 'All');
  
  const storesList = stores || [];
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [milkType, setMilkType] = useState<'Cow' | 'Buffalo' | 'Both'>('Cow');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('60');
  const [cowQuantity, setCowQuantity] = useState('1');
  const [cowPrice, setCowPrice] = useState('60');
  const [buffaloQuantity, setBuffaloQuantity] = useState('1');
  const [buffaloPrice, setBuffaloPrice] = useState('75');
  const [takenDaily, setTakenDaily] = useState(true);
  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    if (storeId) return storeId;
    try {
      const saved = localStorage.getItem('fg_cached_stores') || localStorage.getItem('fg_stores');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
    } catch (e) {}
    return stores[0]?.id || 'CHOUHAN-HQ';
  });

  // Expanded History Panel State
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<'calendar' | 'list'>('calendar');
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());

  // Calculates 15-day milk taken statistics for a customer
  const getCalculatedMilkStats = (c: MilkCustomer) => {
    const stats = {
      totalCowLiters: 0,
      totalBuffaloLiters: 0,
      totalLiters: 0,
      totalCost: 0,
      daysTaken: 0,
      daysSkipped: 0
    };

    const dates: string[] = [];
    for (let i = 14; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const defaultCowQty = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
    const defaultBuffaloQty = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
    const cowRate = c.milkType === 'Cow' ? c.price : (c.milkType === 'Both' ? (c.cowPrice ?? 60) : 60);
    const buffaloRate = c.milkType === 'Buffalo' ? c.price : (c.milkType === 'Both' ? (c.buffaloPrice ?? 75) : 75);

    const logs = c.milkTakenLogs || [];

    dates.forEach(dateStr => {
      const logged = logs.find(l => l.date === dateStr);
      if (logged) {
        stats.totalCowLiters += logged.cowQuantityTaken;
        stats.totalBuffaloLiters += logged.buffaloQuantityTaken;
        stats.totalCost += logged.totalAmount;
        if (logged.cowQuantityTaken > 0 || logged.buffaloQuantityTaken > 0) {
          stats.daysTaken++;
        } else {
          stats.daysSkipped++;
        }
      } else {
        if (c.takenDaily !== false) {
          stats.totalCowLiters += defaultCowQty;
          stats.totalBuffaloLiters += defaultBuffaloQty;
          stats.totalCost += (defaultCowQty * cowRate) + (defaultBuffaloQty * buffaloRate);
          stats.daysTaken++;
        } else {
          stats.daysSkipped++;
        }
      }
    });

    stats.totalLiters = parseFloat((stats.totalCowLiters + stats.totalBuffaloLiters).toFixed(2));
    stats.totalCost = parseFloat(stats.totalCost.toFixed(2));
    stats.totalCowLiters = parseFloat(stats.totalCowLiters.toFixed(2));
    stats.totalBuffaloLiters = parseFloat(stats.totalBuffaloLiters.toFixed(2));
    return { stats, dates };
  };

  // Calculates monthly statistics for a customer
  const getCalculatedMonthlyStats = (c: MilkCustomer, year: number, month: number) => {
    const stats = {
      totalCowLiters: 0,
      totalBuffaloLiters: 0,
      totalLiters: 0,
      totalCost: 0,
      daysTaken: 0,
      daysSkipped: 0
    };

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const defaultCowQty = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
    const defaultBuffaloQty = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
    const cowRate = c.milkType === 'Cow' ? c.price : (c.milkType === 'Both' ? (c.cowPrice ?? 60) : 60);
    const buffaloRate = c.milkType === 'Buffalo' ? c.price : (c.milkType === 'Both' ? (c.buffaloPrice ?? 75) : 75);

    const logs = c.milkTakenLogs || [];

    for (let day = 1; day <= daysInMonth; day++) {
      const yyyy = year;
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const logged = logs.find(l => l.date === dateStr);
      if (logged) {
        stats.totalCowLiters += logged.cowQuantityTaken || 0;
        stats.totalBuffaloLiters += logged.buffaloQuantityTaken || 0;
        
        if (typeof logged.totalAmount === 'number') {
          stats.totalCost += logged.totalAmount;
        } else {
          const lCowP = logged.cowPrice ?? cowRate;
          const lBufP = logged.buffaloPrice ?? buffaloRate;
          stats.totalCost += ((logged.cowQuantityTaken || 0) * lCowP) + ((logged.buffaloQuantityTaken || 0) * lBufP);
        }

        if ((logged.cowQuantityTaken || 0) > 0 || (logged.buffaloQuantityTaken || 0) > 0) {
          stats.daysTaken++;
        } else {
          stats.daysSkipped++;
        }
      } else {
        // If date is in future, we don't count it towards taken/skipped yet
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr > todayStr) {
          continue;
        }

        if (c.takenDaily !== false) {
          stats.totalCowLiters += defaultCowQty;
          stats.totalBuffaloLiters += defaultBuffaloQty;
          stats.totalCost += (defaultCowQty * cowRate) + (defaultBuffaloQty * buffaloRate);
          stats.daysTaken++;
        } else {
          stats.daysSkipped++;
        }
      }
    }

    stats.totalLiters = parseFloat((stats.totalCowLiters + stats.totalBuffaloLiters).toFixed(2));
    stats.totalCost = parseFloat(stats.totalCost.toFixed(2));
    stats.totalCowLiters = parseFloat(stats.totalCowLiters.toFixed(2));
    stats.totalBuffaloLiters = parseFloat(stats.totalBuffaloLiters.toFixed(2));
    return stats;
  };

  // Helper to sync milk log entries to official Store Sales records for total store transparency
  const syncMilkLogToStoreSales = (c: MilkCustomer, log: any) => {
    // If onAddSale is missing, we can't sync
    if (!onAddSale) return;
    
    // Use the customer's storeId if available, fallback to prop storeId
    const targetStoreId = c.storeId || storeId;
    if (!targetStoreId) return;
    
    // Don't auto-sync if it's already linked to a POS bill (POS already created the sale)
    if (log.billId) return;

    // Use a deterministic ID for manual registry sales to allow updates/overwrites
    const saleIdPrefix = `MILK-${c.id}-${log.date}`;
    
    // If it's a "Skip" (quantity 0), we should delete any existing manual sale for this day
    if ((log.cowQuantityTaken || 0) === 0 && (log.buffaloQuantityTaken || 0) === 0) {
      if (onDeleteSale) {
        // Try to find if a manual sale exists for this date/user
        const existingManualSale = sales.find(s => s.id.startsWith(saleIdPrefix));
        if (existingManualSale) onDeleteSale(existingManualSale.id);
      }
      return;
    }

    const salesToRegister: Sale[] = [];
    
    if ((log.cowQuantityTaken || 0) > 0) {
      salesToRegister.push({
        id: `${saleIdPrefix}-COW`,
        storeId: targetStoreId,
        vegetableName: `Cow Milk (Ledger: ${c.name})`,
        quantity: log.cowQuantityTaken,
        unit: 'pack',
        pricePerKg: log.cowPrice || 60,
        totalPrice: parseFloat((log.cowQuantityTaken * (log.cowPrice || 60)).toFixed(2)),
        customerName: c.name,
        saleDate: new Date(log.date).toISOString(),
        paymentMode: 'Cash', // Default for ledger until paid
        status: 'Active'
      });
    }

    if ((log.buffaloQuantityTaken || 0) > 0) {
      salesToRegister.push({
        id: `${saleIdPrefix}-BUF`,
        storeId: targetStoreId,
        vegetableName: `Buffalo Milk (Ledger: ${c.name})`,
        quantity: log.buffaloQuantityTaken,
        unit: 'pack',
        pricePerKg: log.buffaloPrice || 75,
        totalPrice: parseFloat((log.buffaloQuantityTaken * (log.buffaloPrice || 75)).toFixed(2)),
        customerName: c.name,
        saleDate: new Date(log.date).toISOString(),
        paymentMode: 'Cash',
        status: 'Active'
      });
    }

    if (salesToRegister.length > 0) {
      onAddSale(salesToRegister);
    }
  };

  // Adjusts the Cow or Buffalo quantity taken for a specific customer on a specific date
  const updateMilkTakenLog = (
    customerId: string,
    dateStr: string,
    field: 'cow' | 'buffalo',
    delta: number
  ) => {
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c;

      const logs = c.milkTakenLogs ? [...c.milkTakenLogs] : [];
      let existingIdx = logs.findIndex(l => l.date === dateStr);

      const defaultCowQty = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
      const defaultBuffaloQty = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
      const cowRate = c.milkType === 'Cow' ? c.price : (c.milkType === 'Both' ? (c.cowPrice ?? 60) : 60);
      const buffaloRate = c.milkType === 'Buffalo' ? c.price : (c.milkType === 'Both' ? (c.buffaloPrice ?? 75) : 75);

      let loggedItem;
      if (existingIdx >= 0) {
        loggedItem = { ...logs[existingIdx] };
      } else {
        loggedItem = {
          date: dateStr,
          cowQuantityTaken: defaultCowQty,
          buffaloQuantityTaken: defaultBuffaloQty,
          cowPrice: cowRate,
          buffaloPrice: buffaloRate,
          totalAmount: (defaultCowQty * cowRate) + (defaultBuffaloQty * buffaloRate)
        };
      }

      if (field === 'cow') {
        loggedItem.cowQuantityTaken = Math.max(0, parseFloat((loggedItem.cowQuantityTaken + delta).toFixed(2)));
      } else {
        loggedItem.buffaloQuantityTaken = Math.max(0, parseFloat((loggedItem.buffaloQuantityTaken + delta).toFixed(2)));
      }

      loggedItem.totalAmount = parseFloat(((loggedItem.cowQuantityTaken * loggedItem.cowPrice) + (loggedItem.buffaloQuantityTaken * loggedItem.buffaloPrice)).toFixed(2));

      if (existingIdx >= 0) {
        logs[existingIdx] = loggedItem;
      } else {
        logs.push(loggedItem);
      }

      syncMilkLogToStoreSales(c, loggedItem);
      return {
        ...c,
        milkTakenLogs: logs
      };
    }));
  };

  // Toggles whether any milk was taken on a specific date (fully skips or fully resets to default)
  const toggleDateDelivery = (customerId: string, dateStr: string) => {
    setCustomers(prev => {
      let updatedCustomer: MilkCustomer | null = null;
      let updatedLog: any = null;

      const next = prev.map(c => {
        if (c.id !== customerId) return c;

        const logs = c.milkTakenLogs ? [...c.milkTakenLogs] : [];
        const existingIdx = logs.findIndex(l => l.date === dateStr);

        const defaultCowQty = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
        const defaultBuffaloQty = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
        const cowRate = c.milkType === 'Cow' ? c.price : (c.milkType === 'Both' ? (c.cowPrice ?? 60) : 60);
        const buffaloRate = c.milkType === 'Buffalo' ? c.price : (c.milkType === 'Both' ? (c.buffaloPrice ?? 75) : 75);

        if (existingIdx >= 0) {
          const logged = { ...logs[existingIdx] };
          if (logged.cowQuantityTaken > 0 || logged.buffaloQuantityTaken > 0) {
            logged.cowQuantityTaken = 0;
            logged.buffaloQuantityTaken = 0;
            logged.totalAmount = 0;
            logged.quantity = 0;
          } else {
            logged.cowQuantityTaken = defaultCowQty;
            logged.buffaloQuantityTaken = defaultBuffaloQty;
            logged.totalAmount = parseFloat(((defaultCowQty * cowRate) + (defaultBuffaloQty * buffaloRate)).toFixed(2));
            logged.quantity = c.quantity;
          }
          updatedLog = logged;
          logs[existingIdx] = logged;
        } else {
          const defaultIsActive = c.takenDaily !== false;
          updatedLog = {
            date: dateStr,
            cowQuantityTaken: defaultIsActive ? 0 : defaultCowQty,
            buffaloQuantityTaken: defaultIsActive ? 0 : defaultBuffaloQty,
            cowPrice: cowRate,
            buffaloPrice: buffaloRate,
            totalAmount: defaultIsActive ? 0 : parseFloat(((defaultCowQty * cowRate) + (defaultBuffaloQty * buffaloRate)).toFixed(2)),
            quantity: defaultIsActive ? 0 : c.quantity
          };
          logs.push(updatedLog);
        }

        updatedCustomer = { ...c, milkTakenLogs: logs };
        return updatedCustomer;
      });

      // Side effect inside the update is usually discouraged but here it's necessary for sync
      if (updatedCustomer && updatedLog) {
        syncMilkLogToStoreSales(updatedCustomer, updatedLog);
      }
      
      return next;
    }, "Toggle Milk Delivery");
  };

  // Cancels a linked POS invoice and updates user logs accordingly
  const handleCancelLinkedBill = (billId: string) => {
    if (!confirm(`Are you sure you want to cancel the linked POS Invoice #${billId}? This will mark the bill as cancelled and void its items.`)) {
      return;
    }

    try {
      // 1. Update in fg_bills in localStorage
      const savedBillsStr = localStorage.getItem('fg_bills') || '[]';
      const parsedBills = JSON.parse(savedBillsStr);
      const updatedBills = parsedBills.map((b: any) => {
        if (b.id === billId) {
          return { ...b, status: 'Cancelled' };
        }
        return b;
      });
      localStorage.setItem('fg_bills', JSON.stringify(updatedBills));

      // 2. Also remove/update the milkTakenLog entry that is linked, or set its status as cancelled
      if (onDeleteSale && sales) {
        const matchingSales = sales.filter(s => s.billId === billId);
        matchingSales.forEach(s => onDeleteSale(s.id));
      }

      setCustomers(prev => prev.map(c => {
        const logs = c.milkTakenLogs ? [...c.milkTakenLogs] : [];
        const updatedLogs = logs.map(l => {
          if (l.billId === billId) {
            return {
              ...l,
              cowQuantityTaken: 0,
              buffaloQuantityTaken: 0,
              totalAmount: 0,
              isCancelled: true
            };
          }
          return l;
        });
        return { ...c, milkTakenLogs: updatedLogs };
      }));

      // 3. Restore inventory if we can find the bill items
      const targetBill = parsedBills.find((b: any) => b.id === billId);
      if (targetBill && targetBill.items) {
        const inventoryStr = localStorage.getItem('fg_store_inventory') || '[]';
        const parsedInventory = JSON.parse(inventoryStr);
        let updatedInv = [...parsedInventory];
        
        for (const item of targetBill.items) {
          const itemStoreId = targetBill.storeId;
          const matchIdx = updatedInv.findIndex((inv: any) => inv.storeId === itemStoreId && inv.vegetableName.toLowerCase() === item.vegetableName.toLowerCase());
          if (matchIdx > -1) {
            updatedInv[matchIdx] = {
              ...updatedInv[matchIdx],
              quantity: updatedInv[matchIdx].quantity + item.quantity
            };
          }
        }
        localStorage.setItem('fg_store_inventory', JSON.stringify(updatedInv));
      }

      alert(`POS Invoice #${billId} and its associated user delivery log have been successfully cancelled!`);
    } catch (err) {
      console.error("Failed to cancel linked bill:", err);
      alert("Error occurred while canceling the linked bill.");
    }
  };

  // Computes active today stats for the sidebar summary panel
  const getGlobalMilkStats = () => {
    let totalCowLiters = 0;
    let totalBuffaloLiters = 0;
    let totalValue = 0;

    const filtered = selectedListStoreId === 'All' ? customers : customers.filter(c => c.storeId === selectedListStoreId);

    filtered.forEach(c => {
      const defaultCowQty = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
      const defaultBuffaloQty = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
      const cowRate = c.milkType === 'Cow' ? c.price : (c.milkType === 'Both' ? (c.cowPrice ?? 60) : 60);
      const buffaloRate = c.milkType === 'Buffalo' ? c.price : (c.milkType === 'Both' ? (c.buffaloPrice ?? 75) : 75);

      if (c.takenDaily !== false) {
        totalCowLiters += defaultCowQty;
        totalBuffaloLiters += defaultBuffaloQty;
        totalValue += (defaultCowQty * cowRate) + (defaultBuffaloQty * buffaloRate);
      }
    });

    let cumulativeLiters15Days = 0;
    let cumulativeCost15Days = 0;

    filtered.forEach(c => {
      const { stats } = getCalculatedMilkStats(c);
      cumulativeLiters15Days += stats.totalLiters;
      cumulativeCost15Days += stats.totalCost;
    });

    return {
      totalCowLiters: parseFloat(totalCowLiters.toFixed(2)),
      totalBuffaloLiters: parseFloat(totalBuffaloLiters.toFixed(2)),
      totalValue: parseFloat(totalValue.toFixed(2)),
      cumulativeLiters15Days: parseFloat(cumulativeLiters15Days.toFixed(2)),
      cumulativeCost15Days: parseFloat(cumulativeCost15Days.toFixed(2))
    };
  };

  // Removes a specific log entry entirely, reverting that date to default behavior
  const handleDeleteLogEntry = (customerId: string, dateStr: string) => {
    setCustomers(prev => {
      let updatedCustomer: MilkCustomer | null = null;
      const next = prev.map(c => {
        if (c.id !== customerId) return c;
        const logs = c.milkTakenLogs ? c.milkTakenLogs.filter(l => l.date !== dateStr) : [];
        updatedCustomer = { ...c, milkTakenLogs: logs };
        return updatedCustomer;
      });

      // Cleanup linked sale if any
      if (onDeleteSale && sales) {
        const saleIdPrefix = `MILK-${customerId}-${dateStr}`;
        const matchingSales = sales.filter(s => s.id.startsWith(saleIdPrefix));
        matchingSales.forEach(s => onDeleteSale(s.id));
      }

      return next;
    }, "Delete Ledger Entry");
  };

  const handleResetLedger = () => {
    const storeSelect = document.getElementById('target-store-sync-select') as HTMLSelectElement;
    const targetStore = storeSelect ? storeSelect.value : 'All';
    const storeName = targetStore === 'All' ? 'ALL store branches' : getStoreNameFromId(targetStore);

    if (!confirm(`CRITICAL DANGER: Are you absolutely sure you want to RESET the Milk Ledger logs for ${storeName}? This will permanently delete all daily delivery records and history for subscribers. Subscriber names and settings will be preserved, but all transaction history will be WIPED.`)) {
      return;
    }
    
    const confirmation = prompt(`Type 'RESET' to confirm absolute deletion of all ledger history for ${storeName}:`);
    if (confirmation !== 'RESET') {
      if (confirmation !== null) alert("Reset aborted. Confirmation text did not match.");
      return;
    }

    // 1. Clear linked sales from Store Sales module
    if (onDeleteSale && sales) {
      const milkSales = sales.filter(s => {
        const isMilkSale = s.id.startsWith('MILK-');
        if (!isMilkSale) return false;
        
        if (targetStore === 'All') return true;
        return s.storeId === targetStore;
      });
      
      if (milkSales.length > 0) {
        console.log(`[MilkRegistry] Cleaning up ${milkSales.length} linked sales records...`);
        milkSales.forEach(s => onDeleteSale(s.id));
      }
    }

    // 2. Clear customer logs
    setCustomers(prev => prev.map(c => {
      if (targetStore !== 'All' && c.storeId !== targetStore) return c;
      return {
        ...c,
        milkTakenLogs: []
      };
    }), `Full Ledger Reset for ${storeName}`);
    
    alert(`Milk Ledger logs for ${storeName} have been successfully reset.`);
  };

  const handleResetCustomerLedger = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    if (!confirm(`Are you sure you want to clear the entire delivery history for "${customer.name}"? This will not delete the customer profile, only their ledger records.`)) {
      return;
    }

    // 1. Clear linked sales
    if (onDeleteSale && sales) {
      const milkSales = sales.filter(s => s.id.startsWith(`MILK-${customerId}-`));
      milkSales.forEach(s => onDeleteSale(s.id));
    }

    // 2. Clear logs
    setCustomers(prev => prev.map(c => {
      if (c.id !== customerId) return c;
      return { ...c, milkTakenLogs: [] };
    }), `Individual Ledger Reset for ${customer.name}`);

    alert(`History cleared for ${customer.name}.`);
  };

  const handleBulkSyncStoreData = () => {
    const defaultStore = stores[0]?.id || 'CHOUHAN-HQ';
    const store1Users = customers.filter(c => c.storeId === 'store-1');
    const invalidUsers = customers.filter(c => !c.storeId || c.storeId === 'Default');
    const emptyUsers = customers.filter(c => !c.name.trim() || c.mobile.length < 5);
    
    if (store1Users.length === 0 && invalidUsers.length === 0 && emptyUsers.length === 0) {
      alert("No data issues detected. All users are correctly mapped to store branches.");
      return;
    }

    let message = "";
    if (store1Users.length > 0) message += `\n• ${store1Users.length} users found with non-existent 'store-1' branch.`;
    if (invalidUsers.length > 0) message += `\n• ${invalidUsers.length} users with missing store assignments.`;
    if (emptyUsers.length > 0) message += `\n• ${emptyUsers.length} users with incomplete names/numbers (suggested for deletion).`;

    const choice = prompt(`SYSTEM MAINTENANCE DETECTED:${message}\n\nActions:\n1. SYNC ALL to ${getStoreNameFromId(defaultStore)}\n2. DELETE ALL problematic entries\n3. CANCEL\n\nEnter 1 or 2:`);

    if (choice === '1') {
      setCustomers(prev => prev.map(c => {
        if (c.storeId === 'store-1' || !c.storeId || c.storeId === 'Default') {
          return { ...c, storeId: defaultStore };
        }
        return c;
      }), `Maintenance Sync: Reassigned problematic users to ${defaultStore}`);
      alert("Sync completed successfully.");
    } else if (choice === '2') {
      if (confirm(`CRITICAL: This will permanently DELETE ${store1Users.length + invalidUsers.length + emptyUsers.length} user profiles. Proceed?`)) {
        setCustomers(prev => prev.filter(c => 
          c.storeId !== 'store-1' && c.storeId !== 'Default' && c.storeId && c.name.trim() && c.mobile.length >= 5
        ), "Maintenance Cleanup: Deleted invalid/wrong store-1 user profiles.");
        alert("Cleanup completed. Wrong users removed.");
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setMobile('');
    setAddress('');
    setMilkType('Cow');
    setQuantity('1');
    setPrice('60');
    setCowQuantity('1');
    setCowPrice('60');
    setBuffaloQuantity('1');
    setBuffaloPrice('75');
    setTakenDaily(true);
    setSelectedStoreId(storeId || stores[0]?.id || 'CHOUHAN-HQ');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: MilkCustomer) => {
    setEditingId(c.id);
    setName(c.name);
    setMobile(c.mobile);
    setAddress(c.address);
    setMilkType(c.milkType || 'Cow');
    setQuantity((c.quantity || 1).toString());
    setPrice((c.price || 60).toString());
    setCowQuantity((c.cowQuantity ?? 1).toString());
    setCowPrice((c.cowPrice ?? 60).toString());
    setBuffaloQuantity((c.buffaloQuantity ?? 1).toString());
    setBuffaloPrice((c.buffaloPrice ?? 75).toString());
    setTakenDaily(c.takenDaily !== false);
    setSelectedStoreId(c.storeId || storeId || stores[0]?.id || 'CHOUHAN-HQ');
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      alert("Name and Mobile Number are required.");
      return;
    }

    const cleanedMobile = mobile.replace(/[^\d]/g, '');

    const cQty = parseFloat(cowQuantity) || 0;
    const cPrice = parseFloat(cowPrice) || 0;
    const bQty = parseFloat(buffaloQuantity) || 0;
    const bPrice = parseFloat(buffaloPrice) || 0;

    let finalQuantity = parseFloat(quantity) || 0;
    let finalPrice = parseFloat(price) || 0;

    if (milkType === 'Cow') {
      finalQuantity = parseFloat(quantity) || 1;
      finalPrice = parseFloat(price) || 60;
    } else if (milkType === 'Buffalo') {
      finalQuantity = parseFloat(quantity) || 1;
      finalPrice = parseFloat(price) || 75;
    } else if (milkType === 'Both') {
      finalQuantity = cQty + bQty;
      const totalCost = (cQty * cPrice) + (bQty * bPrice);
      finalPrice = finalQuantity > 0 ? (totalCost / finalQuantity) : 0;
    }

    const currentEditingObj = editingId ? customers.find(c => c.id === editingId) : null;

    const customerData: MilkCustomer = {
      id: editingId || generateId('FG-SUB'),
      name: name.trim(),
      mobile: cleanedMobile,
      address: address.trim(),
      milkType,
      quantity: finalQuantity,
      price: finalPrice,
      cowQuantity: milkType === 'Both' ? cQty : undefined,
      cowPrice: milkType === 'Both' ? cPrice : undefined,
      buffaloQuantity: milkType === 'Both' ? bQty : undefined,
      buffaloPrice: milkType === 'Both' ? bPrice : undefined,
      takenDaily: takenDaily,
      storeId: selectedStoreId || storeId || stores[0]?.id || 'CHOUHAN-HQ',
      createdAt: editingId 
        ? (currentEditingObj?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      milkTakenLogs: currentEditingObj?.milkTakenLogs || []
    };

    if (editingId) {
      setCustomers(
        (prev) => prev.map((c) => (c.id === editingId ? customerData : c)),
        `Update Milk Subscriber details for "${customerData.name}"`
      );
    } else {
      setCustomers(
        (prev) => [customerData, ...prev],
        `Register New Milk Subscriber Profile "${customerData.name}"`
      );
    }

    // Sync to general customer directory (Customer Directory)
    try {
      const savedGeneral = localStorage.getItem('fg_general_customers');
      let generalCustomers: any[] = savedGeneral ? JSON.parse(savedGeneral) : [];
      
      const phoneClean = customerData.mobile.trim();
      const matchIdx = generalCustomers.findIndex(gc => 
        (gc.phone && gc.phone.replace(/[^\d]/g, '') === phoneClean.replace(/[^\d]/g, '')) || 
        gc.milkSubId === customerData.id
      );

      const formattedPhone = phoneClean.startsWith('+91') ? phoneClean : `+91 ${phoneClean.replace(/[^\d]/g, '')}`;

      if (matchIdx > -1) {
        generalCustomers[matchIdx] = {
          ...generalCustomers[matchIdx],
          name: customerData.name,
          phone: formattedPhone,
          address: customerData.address || generalCustomers[matchIdx].address,
          storeId: customerData.storeId,
          milkSubId: customerData.id,
          notes: `Milk User (${customerData.milkType}) • Updated in Registry`
        };
      } else {
        generalCustomers.push({
          id: generateId('cust'),
          storeId: customerData.storeId,
          name: customerData.name,
          phone: formattedPhone,
          address: customerData.address,
          milkSubId: customerData.id,
          loyaltyPoints: 0,
          createdAt: new Date().toISOString(),
          notes: `Milk User (${customerData.milkType}) • Added from Registry`
        });
      }

      localStorage.setItem('fg_general_customers', JSON.stringify(generalCustomers));
      
      // Dispatch storage event to notify other modules
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'fg_general_customers',
        newValue: JSON.stringify(generalCustomers)
      }));
    } catch (err) {
      console.error("Error syncing Milk User to general directory:", err);
    }

    setIsFormOpen(false);
  };

  const handleDelete = (user: MilkCustomer) => {
    if (!user) return;
    const id = user.id;

    const performDirectDelete = () => {
      if (confirm(`CRITICAL: Are you sure you want to COMPLETELY DELETE "${user.name || 'Unknown'}" and all their delivery history? This action is permanent and cannot be undone.`)) {
        setCustomers(
          prev => prev.filter(c => c.id !== id),
          `Completely delete Milk Subscriber profile for "${user.name}"`
        );
        alert(`User "${user.name}" has been successfully removed from the registry.`);
      }
    };

    if (storeId && !requestSecureAction) {
      // Deletion request inside Store/POS (Limited permissions)
      if (confirm(`You do not have direct deletion permissions in this branch view. \n\nSend a DELETION REQUEST for user "${user.name || 'Unknown'}" to HQ for approval?`)) {
        const newRequest: MilkDeletionRequest = {
          id: `del-req-${Date.now()}`,
          userId: id,
          userName: user.name || 'Unknown',
          userMobile: user.mobile || 'N/A',
          storeId: storeId,
          date: new Date().toISOString()
        };
        saveMilkDeletionRequest(newRequest);
        alert("Deletion request sent to HQ. It will disappear once approved by an Admin.");
      }
    } else {
      // Direct deletion (Admin or Management context)
      performDirectDelete();
    }
  };

  const handleApproveDeletion = (reqId: string, userId: string) => {
    const user = customers.find(c => c.id === userId);
    setCustomers(
      prev => prev.filter(c => c.id !== userId),
      `Approve Deletion request for user "${user?.name || userId}"`
    );
    deleteMilkDeletionRequest(reqId);
  };

  const handleDeclineDeletion = (reqId: string) => {
    deleteMilkDeletionRequest(reqId);
  };

  const toggleTakenDaily = (id: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, takenDaily: c.takenDaily === false ? true : false };
      }
      return c;
    }));
  };

  const handleGlobalPriceUpdate = (
    targetStore: string,
    updateCow: boolean,
    newCowPrice: number,
    updateBuffalo: boolean,
    newBuffaloPrice: number
  ) => {
    // 1. Save standard defaults
    localStorage.setItem('fg_global_cow_price', newCowPrice.toString());
    localStorage.setItem('fg_global_buffalo_price', newBuffaloPrice.toString());
    setGlobalCowPrice(newCowPrice);
    setGlobalBuffaloPrice(newBuffaloPrice);

    // 2. Update existing subscriber records
    setCustomers(prev => prev.map(c => {
      const isStoreMatch = targetStore === 'All' || c.storeId === targetStore;
      if (!isStoreMatch) return c;

      let updated = { ...c };
      let hasChanged = false;

      if (updateCow) {
        if (c.milkType === 'Cow') {
          updated.price = newCowPrice;
          hasChanged = true;
        } else if (c.milkType === 'Both') {
          updated.cowPrice = newCowPrice;
          hasChanged = true;
        }
      }

      if (updateBuffalo) {
        if (c.milkType === 'Buffalo') {
          updated.price = newBuffaloPrice;
          hasChanged = true;
        } else if (c.milkType === 'Both') {
          updated.buffaloPrice = newBuffaloPrice;
          hasChanged = true;
        }
      }

      if (hasChanged && updated.milkType === 'Both') {
        const cQty = updated.cowQuantity ?? 1;
        const cPrice = updated.cowPrice ?? newCowPrice;
        const bQty = updated.buffaloQuantity ?? 1;
        const bPrice = updated.buffaloPrice ?? newBuffaloPrice;
        const totalQty = cQty + bQty;
        updated.quantity = totalQty;
        updated.price = totalQty > 0 ? parseFloat(((cQty * cPrice) + (bQty * bPrice) / totalQty).toFixed(2)) : 0;
      }

      return updated;
    }), `Global Milk Price Update (Cow: ₹${newCowPrice}, Buffalo: ₹${newBuffaloPrice}) for ${targetStore === 'All' ? 'All' : getStoreNameFromId(targetStore)} branches`);
  };

  const updateMilkQuantityDetailed = (userId: string, dateStr: string, cowQty: number, buffaloQty: number) => {
    setCustomers(prev => {
      let updatedCustomer: MilkCustomer | null = null;
      let logEntry: any = null;

      const next = prev.map(c => {
        if (c.id === userId) {
          const existingLogs = c.milkTakenLogs || [];
          const existingIdx = existingLogs.findIndex(l => l.date === dateStr);
          let newLogs = [...existingLogs];
          
          const cowP = c.milkType === 'Cow' ? c.price : (c.cowPrice ?? 60);
          const buffaloP = c.milkType === 'Buffalo' ? c.price : (c.buffaloPrice ?? 75);
          const totalAmount = (cowQty * cowP) + (buffaloQty * buffaloP);
          
          // for backward compatibility, also set 'quantity' as the sum
          logEntry = {
            date: dateStr,
            cowQuantityTaken: cowQty,
            buffaloQuantityTaken: buffaloQty,
            cowPrice: cowP,
            buffaloPrice: buffaloP,
            totalAmount: totalAmount,
            quantity: cowQty + buffaloQty
          };
          
          if (existingIdx >= 0) {
            newLogs[existingIdx] = { ...newLogs[existingIdx], ...logEntry };
          } else {
            newLogs.push(logEntry);
          }
          
          updatedCustomer = { ...c, milkTakenLogs: newLogs };
          return updatedCustomer;
        }
        return c;
      });

      if (updatedCustomer && logEntry) {
        syncMilkLogToStoreSales(updatedCustomer, logEntry);
      }
      return next;
    }, "Update Milk Quantity Detailed");
  };

  
  
  const generateBillContent = (c: MilkCustomer, period: 'last15' | 'last30' | 'thisMonth' | 'lastMonth' = 'last30') => {
    const dates: string[] = [];
    const today = new Date();

    let start = new Date();
    let end = new Date();

    if (period === 'last15') {
      start.setDate(today.getDate() - 14);
    } else if (period === 'last30') {
      start.setDate(today.getDate() - 29);
    } else if (period === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (period === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];

    let curr = new Date(start);
    const stopDate = period === 'lastMonth' ? new Date(end) : today;
    
    while (curr <= stopDate) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    // Sort dates in descending order (newest first)
    dates.sort((a, b) => b.localeCompare(a));

    const defaultCowQty = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
    const defaultBuffaloQty = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
    const cowRate = c.milkType === 'Cow' ? c.price : (c.milkType === 'Both' ? (c.cowPrice ?? globalCowPrice) : globalCowPrice);
    const buffaloRate = c.milkType === 'Buffalo' ? c.price : (c.milkType === 'Both' ? (c.buffaloPrice ?? globalBuffaloPrice) : globalBuffaloPrice);

    const logs = c.milkTakenLogs || [];
    const billLogs = dates.map(dateStr => {
      const logged = logs.find(l => l.date === dateStr);
      if (logged) {
        let amt = logged.totalAmount;
        if (typeof amt !== 'number') {
          const lCowP = logged.cowPrice ?? cowRate;
          const lBufP = logged.buffaloPrice ?? buffaloRate;
          amt = ((logged.cowQuantityTaken || 0) * lCowP) + ((logged.buffaloQuantityTaken || 0) * lBufP);
        }
        return {
          ...logged,
          totalAmount: amt
        };
      } else {
        const isDefaultTaken = c.takenDaily !== false;
        return {
          date: dateStr,
          cowQuantityTaken: isDefaultTaken ? defaultCowQty : 0,
          buffaloQuantityTaken: isDefaultTaken ? defaultBuffaloQty : 0,
          cowPrice: cowRate,
          buffaloPrice: buffaloRate,
          totalAmount: isDefaultTaken ? ((defaultCowQty * cowRate) + (defaultBuffaloQty * buffaloRate)) : 0
        };
      }
    });

    let totalAmt = 0;
    billLogs.forEach(l => {
      totalAmt += l.totalAmount || 0;
    });

    return { recentLogs: billLogs, totalAmt };
  };

  const handleDownloadPDF = async (c: MilkCustomer) => {
    const el = document.getElementById('bill-receipt-content');
    if (!el) return;
    
    const canvas = await html2canvas(el, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`MilkBill_${c.name.replace(/\s/g, '_')}_${billingPeriod}.pdf`);
  };

  const handleDownloadImage = async (c: MilkCustomer) => {
    const el = document.getElementById('bill-receipt-content');
    if (!el) return;
    
    const canvas = await html2canvas(el, { scale: 2 });
    const link = document.createElement('a');
    link.download = `MilkBill_${c.name.replace(/\s/g, '_')}_${billingPeriod}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleShareWhatsApp = (c: MilkCustomer) => {
    const text = customBillMessage || `🐄 *CHOUHAN DAIRY FARM* 🐄\n\nName: ${c.name}\nTotal Due: ₹${generateBillContent(c, billingPeriod).totalAmt.toFixed(2)}`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/${c.mobile}?text=${encoded}`, '_blank');
  };

  const handleSendSimulatedSMS = (c: MilkCustomer) => {
    setSmsSending(true);
    setTimeout(() => {
      setSmsSending(false);
      setSmsSentStatus(true);
      alert(`📲 Billing SMS successfully dispatched to customer ${c.name} (+${c.mobile})!`);
    }, 1200);
  };

  const handleQuickSetPrice = (c: MilkCustomer) => {
    if (c.milkType === 'Both') {
      const newCow = window.prompt(`Enter new Cow Milk Price (₹/L) for ${c.name}:`, (c.cowPrice ?? c.price ?? globalCowPrice).toString());
      if (newCow === null) return;
      const newBuf = window.prompt(`Enter new Buffalo Milk Price (₹/L) for ${c.name}:`, (c.buffaloPrice ?? c.price ?? globalBuffaloPrice).toString());
      if (newBuf === null) return;
      
      setCustomers(
        prev => prev.map(cust => cust.id === c.id ? { ...cust, cowPrice: Number(newCow), buffaloPrice: Number(newBuf) } : cust),
        `Update custom Cow/Buffalo milk price rate for "${c.name}"`
      );
    } else {
      const newPrice = window.prompt(`Enter new ${c.milkType} Milk Price (₹/L) for ${c.name}:`, (c.price ?? (c.milkType === 'Cow' ? globalCowPrice : globalBuffaloPrice)).toString());
      if (newPrice !== null) {
        setCustomers(
          prev => prev.map(cust => cust.id === c.id ? { ...cust, price: Number(newPrice) } : cust),
          `Update custom ${c.milkType} milk price rate for "${c.name}"`
        );
      }
    }
  };

  const updateMilkQuantity = (userId: string, dateStr: string, quantity: number) => {
    setCustomers(prev => {
      let updatedCustomer: MilkCustomer | null = null;
      let logEntry: any = null;

      const next = prev.map(c => {
        if (c.id === userId) {
          const cowP = c.milkType === 'Cow' ? c.price : (c.cowPrice ?? 60);
          const buffaloP = c.milkType === 'Buffalo' ? c.price : (c.buffaloPrice ?? 75);
          let cowQty = 0; let buffaloQty = 0;
          
          if (quantity === 0) {
            cowQty = 0; buffaloQty = 0;
          } else {
            cowQty = c.milkType === 'Cow' ? quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
            buffaloQty = c.milkType === 'Buffalo' ? quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
          }
          
          const totalAmount = (cowQty * cowP) + (buffaloQty * buffaloP);
          
          const existingLogs = c.milkTakenLogs || [];
          const existingIdx = existingLogs.findIndex(l => l.date === dateStr);
          let newLogs = [...existingLogs];
          
          logEntry = {
            date: dateStr,
            cowQuantityTaken: cowQty,
            buffaloQuantityTaken: buffaloQty,
            cowPrice: cowP,
            buffaloPrice: buffaloP,
            totalAmount,
            quantity: quantity // fallback
          };
          
          if (existingIdx >= 0) {
            newLogs[existingIdx] = { ...newLogs[existingIdx], ...logEntry };
          } else {
            newLogs.push(logEntry);
          }
          updatedCustomer = { ...c, milkTakenLogs: newLogs };
          return updatedCustomer;
        }
        return c;
      });

      if (updatedCustomer && logEntry) {
        syncMilkLogToStoreSales(updatedCustomer, logEntry);
      }
      return next;
    }, "Update Milk Quantity");
  };

  const filteredCustomers = customers.filter(c => {
    if (showProblematicOnly) {
      const isProblematic = !c.storeId || c.storeId === 'store-1' || c.storeId === 'Default' || !c.name.trim() || c.mobile.length < 5;
      if (!isProblematic) return false;
    }

    if (selectedListStoreId !== 'All' && c.storeId !== selectedListStoreId) return false;
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.mobile.includes(searchQuery) ||
                        c.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || c.milkType === typeFilter;
    return matchSearch && matchType;
  });

  if (storeId) {
    const storeUsers = customers.filter(c => c.storeId === storeId);
    
    // Sort so users with missing today logs or active issues bubble up
    storeUsers.sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto max-w-5xl mx-auto w-full">
        {/* Top Banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-emerald-950 text-white rounded-3xl p-6 shadow-sm border border-emerald-900 relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03]" />
          <div className="relative z-10 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-emerald-800 text-emerald-300 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-700/50">
              <Sparkles className="h-3 w-3" /> Store Milk Record
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight font-sans">Daily Milk Checklist</h2>
            <p className="text-xs text-emerald-200 max-w-xl">
              Record daily deliveries, track skipped days, and manage your local branch users.
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="relative z-10 inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-2xl transition-all shadow-md uppercase cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Milk User
          </button>
        </div>

        {/* Create / Edit Form */}
        {isFormOpen && (
          <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900">
                  {editingId ? 'Edit Store Milk User' : 'New Store Milk User'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">User Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sardar Harpreet Singh"
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="e.g. 9872543210"
                    className="w-full text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Home Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete home delivery address details"
                    rows={2}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                 <div className="space-y-1 md:col-span-2">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Milk Option</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMilkType('Cow')}
                      className={`p-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${milkType === 'Cow' ? 'bg-amber-100 text-amber-800 border-2 border-amber-300' : 'bg-slate-50 text-slate-400 border-2 border-slate-100 hover:border-amber-200 hover:bg-amber-50'}`}
                    >🐄 Cow</button>
                    <button
                      type="button"
                      onClick={() => setMilkType('Buffalo')}
                      className={`p-2 rounded-lg text-xs font-black uppercase transition-all cursor-pointer ${milkType === 'Buffalo' ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300' : 'bg-slate-50 text-slate-400 border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50'}`}
                    >🐃 Buffalo</button>
                    <button
                      type="button"
                      onClick={() => setMilkType('Both')}
                      className={`p-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${milkType === 'Both' ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300' : 'bg-slate-50 text-slate-400 border-2 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50'}`}
                    >🥛 Both</button>
                  </div>
                </div>

                {milkType !== 'Both' ? (
                  <div className="grid grid-cols-2 gap-2 md:col-span-2">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Quantity (Liters)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none bg-slate-50/50 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Rate (₹ / Liter)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none bg-slate-50/50 text-center"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-emerald-50/30 border border-emerald-100/70 p-3.5 rounded-2xl md:col-span-2">
                    <p className="text-[10px] text-emerald-800 font-black uppercase tracking-wide">Set Separate Quantities & Prices</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">🐄 Cow Liters</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={cowQuantity}
                          onChange={(e) => setCowQuantity(e.target.value)}
                          className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none text-center bg-slate-50/30"
                        />
                      </div>
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">🐄 Cow Rate (₹)</label>
                        <input
                          type="number"
                          min="1"
                          value={cowPrice}
                          onChange={(e) => setCowPrice(e.target.value)}
                          className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none text-center bg-slate-50/30"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">🐃 Buffalo Liters</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={buffaloQuantity}
                          onChange={(e) => setBuffaloQuantity(e.target.value)}
                          className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none text-center bg-slate-50/30"
                        />
                      </div>
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">🐃 Buffalo Rate (₹)</label>
                        <input
                          type="number"
                          min="1"
                          value={buffaloPrice}
                          onChange={(e) => setBuffaloPrice(e.target.value)}
                          className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none text-center bg-slate-50/30"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="space-y-1 md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer mt-2 bg-slate-50 border border-slate-200 p-3 rounded-xl hover:bg-slate-100 transition-all">
                    <input type="checkbox" checked={takenDaily} onChange={(e) => setTakenDaily(e.target.checked)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4" />
                    <span className="text-[11px] font-bold text-slate-700">Take milk daily by default (Automatic Entry)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition-all shadow-md cursor-pointer uppercase">
                  {editingId ? 'Save Changes' : 'Create User'}
                </button>
              </div>
          </form>
        )}

        {/* Search & List */}
        {!isFormOpen && (
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user..."
                className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3.5 py-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {storeUsers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.mobile.includes(searchQuery)).length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic text-xs">No users found.</div>
              ) : (
                storeUsers.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.mobile.includes(searchQuery)).map(c => {
                  const isExpanded = expandedSubId === c.id;
                  const { stats } = getCalculatedMilkStats(c);
                  const mStats = getCalculatedMonthlyStats(c, calendarYear, calendarMonth);
                  const todayStr = new Date().toISOString().split('T')[0];
                  
                  const existingLog = c.milkTakenLogs?.find(l => l.date === todayStr);
                  const isSkipped = existingLog && existingLog.quantity === 0;
                  const wasTaken = !isSkipped && c.takenDaily !== false;

                  return (
                    <div key={c.id} className={`border rounded-2xl transition-all overflow-hidden ${isExpanded ? 'border-emerald-200 shadow-md ring-1 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'}`}>
                      {/* User Summary Row */}
                      <div 
                        className={`p-4 flex items-center justify-between cursor-pointer ${isExpanded ? 'bg-emerald-50/50' : 'bg-white'}`}
                        onClick={() => setExpandedSubId(isExpanded ? null : c.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center font-black text-lg ${c.milkType === 'Cow' ? 'bg-amber-100 text-amber-700' : c.milkType === 'Buffalo' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-sm text-slate-900">{c.name}</h4>
                              {isDuplicate(c) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-[8px] font-black text-rose-600 uppercase">
                                  ⚠️ Duplicate
                                </span>
                              )}
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-[8.5px] font-black text-slate-600 font-mono">
                                {c.id}
                              </span>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-emerald-50 text-[8.5px] font-black text-emerald-700 uppercase tracking-wider">
                                📍 {getStoreAbbrFromId(c.storeId)}
                              </span>
                            </div>
                            <p className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 flex-wrap">
                              <span>{c.mobile} • {c.milkType === 'Both' ? 'Cow+Buffalo' : c.milkType} ({c.quantity}L @ ₹{c.milkType === 'Both' ? `${c.cowPrice ?? 60}/${c.buffaloPrice ?? 75}` : c.price}/L)</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleQuickSetPrice(c); }}
                                className="text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-1 py-0.5 rounded text-[8.5px] font-black uppercase cursor-pointer"
                                title="Edit Milk Price"
                              >
                                ✏️ Rate
                              </button>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                          {!isExpanded && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleDateDelivery(c.id, todayStr); }}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shadow-3xs ${wasTaken ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200'}`}
                            >
                              {wasTaken ? '🥛 Taken' : '❌ Skipped'}
                            </button>
                          )}
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180 text-emerald-600' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded Checklist View */}
                      {isExpanded && (
                        <div className="bg-white border-t border-slate-100 p-5 space-y-5">
                          <div className="flex items-center justify-between">
                            <h5 className="font-extrabold text-xs uppercase text-slate-900">Monthly Checklist</h5>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(c); }}
                              className="text-[10px] font-bold uppercase text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="h-3 w-3" /> Edit User
                            </button>
                          </div>
                          
                          {/* Daily Adjustment Form for Store User */}
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                            <div className="flex justify-between items-center mb-2">
                               <h6 className="text-[10px] font-black uppercase text-slate-700">Adjust Specific Day Quantity</h6>
                            </div>
                            <div className="flex flex-col gap-3">
                               
                              <DailyAdjustmentForm 
                                customer={c} 
                                onSave={(date, cow, buf) => updateMilkQuantityDetailed(c.id, date, cow, buf)}
                              />

                            </div>
                          </div>

                          <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100 max-w-sm mx-auto">
                            <button
                              type="button"
                              onClick={() => {
                                if (calendarMonth === 0) {
                                  setCalendarMonth(11);
                                  setCalendarYear(prev => prev - 1);
                                } else {
                                  setCalendarMonth(prev => prev - 1);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase cursor-pointer shadow-3xs"
                            >Prev</button>
                            <span className="font-extrabold text-[11px] text-slate-800 text-center uppercase tracking-wider">
                              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][calendarMonth]} {calendarYear}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (calendarMonth === 11) {
                                  setCalendarMonth(0);
                                  setCalendarYear(prev => prev + 1);
                                } else {
                                  setCalendarMonth(prev => prev + 1);
                                }
                              }}
                              className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase cursor-pointer shadow-3xs"
                            >Next</button>
                          </div>

                          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 max-w-md mx-auto">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(wd => (
                              <div key={wd} className="text-center text-[9px] font-black text-slate-400 uppercase py-1">{wd}</div>
                            ))}
                            
                            {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, idx) => (
                              <div key={`blank-${idx}`} className="aspect-square bg-slate-50/50 rounded-lg" />
                            ))}

                            {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }).map((_, idx) => {
                              const dayNum = idx + 1;
                              const formatDateString = (y: number, m: number, d: number) => {
                                const mm = String(m + 1).padStart(2, '0');
                                const dd = String(d).padStart(2, '0');
                                return `${y}-${mm}-${dd}`;
                              };
                              const ds = formatDateString(calendarYear, calendarMonth, dayNum);
                              
                              const isFuture = new Date(ds) > new Date(new Date().setHours(0,0,0,0));
                              const isToday = ds === new Date().toISOString().split('T')[0];
                              
                              const dayLog = c.milkTakenLogs?.find(l => l.date === ds);
                              const isDaySkipped = dayLog && dayLog.quantity === 0;
                              let displayedQty = dayLog ? dayLog.quantity : c.quantity;
                              let dayWasTaken = !isDaySkipped;

                              if (isFuture) {
                                displayedQty = 0;
                                dayWasTaken = false;
                              } else if (isToday) {
                                dayWasTaken = c.takenDaily !== false;
                                if (!dayWasTaken) displayedQty = 0;
                              }

                              let tooltipText = "";
                              if (isFuture) {
                                tooltipText = "Future date";
                              } else if (!dayWasTaken) {
                                tooltipText = "Skipped";
                              } else {
                                const defaultCow = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
                                const defaultBuf = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
                                
                                const curCow = dayLog ? (dayLog.cowQuantityTaken ?? (dayLog.quantity === undefined ? defaultCow : (c.milkType === 'Cow' ? dayLog.quantity : 0))) : defaultCow;
                                const curBuf = dayLog ? (dayLog.buffaloQuantityTaken ?? (dayLog.quantity === undefined ? defaultBuf : (c.milkType === 'Buffalo' ? dayLog.quantity : 0))) : defaultBuf;
                                
                                if (curCow > 0 && curBuf > 0) {
                                  tooltipText = `Total: ${displayedQty}L (Cow: ${curCow}L, Buffalo: ${curBuf}L)`;
                                } else if (curCow > 0) {
                                  tooltipText = `Cow Milk: ${curCow}L`;
                                } else if (curBuf > 0) {
                                  tooltipText = `Buffalo Milk: ${curBuf}L`;
                                } else {
                                  tooltipText = `${displayedQty}L`;
                                }
                              }

                              return (
                                <button 
                                  key={ds}
                                  disabled={isFuture}
                                  title={tooltipText}
                                  onClick={() => {
                                    if (isToday) {
                                      toggleDateDelivery(c.id, ds);
                                    } else {
                                      if (dayWasTaken) {
                                        updateMilkQuantity(c.id, ds, 0); 
                                      } else {
                                        updateMilkQuantity(c.id, ds, c.quantity); 
                                      }
                                    }
                                  }}
                                  className={`aspect-square flex flex-col items-center justify-center rounded-lg border transition-all cursor-pointer ${
                                    isFuture 
                                      ? 'bg-slate-50/50 border-transparent opacity-50 cursor-not-allowed' 
                                      : dayWasTaken
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 shadow-3xs hover:bg-emerald-100 hover:border-emerald-300'
                                      : 'bg-rose-50 border-rose-200 text-rose-900 shadow-3xs hover:bg-rose-100 hover:border-rose-300'
                                  }`}
                                >
                                  <span className={`text-xs sm:text-sm font-black ${isToday ? 'underline decoration-2 underline-offset-2' : ''}`}>{dayNum}</span>
                                  {!isFuture && (
                                    <span className="text-[8px] sm:text-[9px] font-black font-mono mt-0.5 opacity-80">
                                      {dayWasTaken ? `${displayedQty}L` : 'SKIP'}
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-4 text-[10px] font-black uppercase text-slate-500">
                              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300"></div> Taken</span>
                              <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-rose-100 border border-rose-300"></div> Skipped</span>
                            </div>
                            <div className="flex gap-4">
                              <div className="text-right">
                                <span className="block text-[9px] uppercase font-black text-slate-400">Total Liters</span>
                                <span className="text-emerald-700 font-mono font-bold">{mStats.totalLiters.toFixed(1)}L</span>
                              </div>
                              <div className="text-right">
                                <span className="block text-[9px] uppercase font-black text-slate-400">Est. Bill</span>
                                <span className="text-slate-900 font-mono font-bold">₹{mStats.totalCost.toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                          
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Top Banner and Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-emerald-950 text-white rounded-3xl p-6 shadow-sm border border-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03]" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-emerald-800 text-emerald-300 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-700/50">
            <Sparkles className="h-3 w-3" /> Central Module
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight font-sans">Central Milk Ledger</h2>
          <p className="text-xs text-emerald-200 max-w-xl">
            Centralized record book for store milk records, quantities, and pricing models compiled across all trading branches.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="relative z-10 inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-2xl transition-all shadow-md uppercase cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Milk User
        </button>
      </div>

      {/* Grid Layout: Controls & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form (if open) or Fast Stats */}
        {(isFormOpen || selectedListStoreId === 'All' || !storeId) && (
          <div className="lg:col-span-4 space-y-6">
            
            {isFormOpen ? (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900">
                  {editingId ? 'Edit User' : 'New Milk User'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                    Store Branch * {storeId && <span className="text-emerald-600">(Locked to current store)</span>}
                  </label>
                  <select
                    value={selectedStoreId}
                    onChange={(e) => setSelectedStoreId(e.target.value)}
                    disabled={!!storeId}
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white disabled:bg-slate-100 disabled:text-slate-500"
                  >
                    {storesList.map(st => (
                      <option key={st.id} value={st.id}>{st.storeCode ? `[${st.storeCode}] ` : ''}{st.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">User Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sardar Harpreet Singh"
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="e.g. 9872543210"
                    className="w-full text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Home Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete home delivery address details"
                    rows={2}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                 <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Milk Option</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setMilkType('Cow')}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                        milkType === 'Cow'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-extrabold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      🐄 Cow
                    </button>
                    <button
                      type="button"
                      onClick={() => setMilkType('Buffalo')}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                        milkType === 'Buffalo'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-extrabold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      🐃 Buffalo
                    </button>
                    <button
                      type="button"
                      onClick={() => setMilkType('Both')}
                      className={`py-2 text-[10px] font-bold rounded-xl border transition-all ${
                        milkType === 'Both'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 font-extrabold'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      🥛 Both
                    </button>
                  </div>
                </div>

                {milkType !== 'Both' ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Quantity (Liters)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        className="w-full text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none bg-slate-50/50 text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Rate (₹ / Liter)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        className="w-full text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none bg-slate-50/50 text-center"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 bg-emerald-50/30 border border-emerald-100/70 p-3.5 rounded-2xl">
                    <p className="text-[10px] text-emerald-800 font-black uppercase tracking-wide">🥛 Set Separate Quantities & Prices</p>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">🐄 Cow Liters</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={cowQuantity}
                          onChange={(e) => setCowQuantity(e.target.value)}
                          className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none text-center bg-slate-50/30"
                        />
                      </div>
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">🐄 Cow Rate (₹)</label>
                        <input
                          type="number"
                          min="1"
                          value={cowPrice}
                          onChange={(e) => setCowPrice(e.target.value)}
                          className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none text-center bg-slate-50/30"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">🐃 Buffalo Liters</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={buffaloQuantity}
                          onChange={(e) => setBuffaloQuantity(e.target.value)}
                          className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none text-center bg-slate-50/30"
                        />
                      </div>
                      <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">🐃 Buffalo Rate (₹)</label>
                        <input
                          type="number"
                          min="1"
                          value={buffaloPrice}
                          onChange={(e) => setBuffaloPrice(e.target.value)}
                          className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none text-center bg-slate-50/30"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="takenDailyCheckbox"
                    checked={takenDaily}
                    onChange={(e) => setTakenDaily(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <label htmlFor="takenDailyCheckbox" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                    🥛 Milk Taken Daily (Active Today)
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition-all uppercase tracking-wide mt-2 cursor-pointer"
              >
                {editingId ? 'Update Ledger' : 'Create Ledger'}
              </button>
            </form>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h3 className="font-extrabold text-xs text-slate-900 uppercase">Users Summary</h3>
              </div>

              
                              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-slate-400">Total Ledgers</p>
                  <p className="text-xl font-black text-slate-800">{customers.length}</p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-slate-400">Unique Users</p>
                  <p className="text-xl font-black text-emerald-600">
                    {new Set(customers.map(c => c.mobile.replace(/[^\d]/g, '')).filter(m => m.length >= 10)).size}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                  <p className="text-[10px] font-black uppercase text-slate-400">Expected/Day</p>
                  <p className="text-xl font-black text-slate-800">{customers.reduce((sum, c) => sum + (c.milkType === 'Both' ? (c.cowQuantity ?? 0) + (c.buffaloQuantity ?? 0) : c.quantity), 0).toFixed(1)}L</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl col-span-2">
                  <p className="text-[10px] font-black uppercase text-emerald-600">Total Logged Milk Value (All-Time)</p>
                  <p className="text-xl font-black text-emerald-800">₹{customers.reduce((sum, c) => sum + (c.milkTakenLogs || []).reduce((s, l) => s + (l.totalAmount || 0), 0), 0).toFixed(0)}</p>
                  <p className="text-[10px] font-black uppercase text-emerald-600 mt-1">Total Logged Milk: {customers.reduce((sum, c) => sum + (c.milkTakenLogs || []).reduce((s, l) => s + (l.cowQuantityTaken || 0) + (l.buffaloQuantityTaken || 0), 0), 0).toFixed(1)}L</p>
                </div>
              </div>



              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-[11px] text-emerald-800 leading-relaxed">
                🐄 Standard Cow Milk Rate: <span className="font-bold">₹{globalCowPrice}/L</span> <br />
                🐃 Standard Buffalo Milk Rate: <span className="font-bold">₹{globalBuffaloPrice}/L</span> <br />
                <span className="mt-1.5 block text-[10px] text-emerald-600 italic">
                  Milk Users can be selected inside the POS for instant automatic dairy billing checkout!
                </span>
              </div>

              {/* GLOBAL PRICING & ALL-STORE SYNC CARD */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-3 shadow-3xs">
                <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
                  <DollarSign className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-tight">Bulk Rates & Sync</h4>
                </div>

                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  Bulk-adjust subscriber prices across any or all store locations instantly.
                </p>

                <div className="space-y-3 pt-0.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 bg-white p-2 rounded-xl border border-slate-150">
                      <label className="block text-[9px] font-black uppercase text-slate-400">🐄 Cow (₹/L)</label>
                      <input 
                        type="number" 
                        value={globalCowPrice} 
                        onChange={(e) => setGlobalCowPrice(Math.max(1, Number(e.target.value)))}
                        className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none focus:border-indigo-400 bg-slate-50/20 text-center" 
                      />
                    </div>
                    <div className="space-y-1 bg-white p-2 rounded-xl border border-slate-150">
                      <label className="block text-[9px] font-black uppercase text-slate-400">🐃 Buffalo (₹/L)</label>
                      <input 
                        type="number" 
                        value={globalBuffaloPrice} 
                        onChange={(e) => setGlobalBuffaloPrice(Math.max(1, Number(e.target.value)))}
                        className="w-full text-xs font-mono font-bold rounded-lg border border-slate-200 p-1.5 focus:outline-none focus:border-indigo-400 bg-slate-50/20 text-center" 
                      />
                    </div>
                  </div>

                  <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-150">
                    <label className="block text-[9px] font-black uppercase text-slate-400">🎯 Target Store Branch</label>
                    <select
                      id="target-store-sync-select"
                      className="w-full text-xs font-bold rounded-lg border border-slate-200 p-1.5 bg-slate-50/10 focus:outline-none focus:border-indigo-400"
                    >
                      <option value="All">All Store Branches</option>
                      {storesList.map(st => (
                        <option key={st.id} value={st.id}>{st.storeCode ? `[${st.storeCode}] ` : ""}{st.name.replace("Farmer's Gate - ", "")}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const storeSelect = document.getElementById('target-store-sync-select') as HTMLSelectElement;
                        const targetStore = storeSelect ? storeSelect.value : 'All';
                        if (confirm(`Are you absolutely sure you want to update all existing subscriber records in ${targetStore === 'All' ? 'ALL stores' : getStoreAbbrFromId(targetStore)} to match these rates (₹${globalCowPrice} for Cow, ₹${globalBuffaloPrice} for Buffalo)?`)) {
                          handleGlobalPriceUpdate(targetStore, true, globalCowPrice, true, globalBuffaloPrice);
                        }
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-black text-[10px] py-2 px-3 rounded-xl transition-all uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-indigo-600/10"
                    >
                      <CheckCircle className="h-3.5 w-3.5" /> Apply & Update All Stores
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem('fg_global_cow_price', globalCowPrice.toString());
                        localStorage.setItem('fg_global_buffalo_price', globalBuffaloPrice.toString());
                        alert(`Successfully saved default pricing (₹${globalCowPrice} Cow, ₹${globalBuffaloPrice} Buffalo) for new subscribers.`);
                      }}
                      className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[9.5px] py-1.5 px-3 rounded-xl transition-all uppercase tracking-wide cursor-pointer text-center"
                    >
                      Save Defaults Only
                    </button>

                    <div className="pt-2 border-t border-slate-150">
                      <button
                        type="button"
                        onClick={handleResetLedger}
                        className="w-full bg-rose-50 hover:bg-rose-100 text-rose-600 font-black text-[10px] py-2 px-3 rounded-xl transition-all uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1 border border-rose-200/50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Reset Ledger logs
                      </button>

                      <button
                        type="button"
                        onClick={handleBulkSyncStoreData}
                        className="w-full mt-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[10px] py-2 px-3 rounded-xl transition-all uppercase tracking-wide cursor-pointer flex items-center justify-center gap-1 border border-emerald-200/50"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Recheck & Sync Store IDs
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        )}

        {/* Right List Panel */}
        <div className={(isFormOpen || selectedListStoreId === 'All' || !storeId) ? "lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4" : "lg:col-span-12 bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4"}>
          
          {/* Branch Deletion Requests (Only at HQ) */}
          {!storeId && deletionRequests.length > 0 && (
            <div className="bg-red-50/80 border border-red-200 rounded-2xl p-4 space-y-3 mb-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-1.5 text-red-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <h4 className="font-extrabold text-xs uppercase tracking-wide">📬 Pending Branch Deletion Requests</h4>
                <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {deletionRequests.length} Request{deletionRequests.length > 1 ? 's' : ''}
                </span>
              </div>
              <p className="text-[11px] text-red-600/90 leading-relaxed font-semibold">
                The following milk users have been requested for deletion by their respective store branches. Please review and approve/dismiss them.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {deletionRequests.map((req) => (
                  <div key={req.id} className="bg-white border border-red-100 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs shadow-3xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{req.userName}</span>
                        <span className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                          Store: {getStoreAbbrFromId(req.storeId)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Mobile: {req.userMobile} • Requested on {new Date(req.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-end">
                      <button
                        onClick={() => handleApproveDeletion(req.id, req.userId)}
                        className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] rounded-lg cursor-pointer shadow-3xs transition-all uppercase"
                      >
                        Approve Delete
                      </button>
                      <button
                        onClick={() => handleDeclineDeletion(req.id)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] rounded-lg cursor-pointer border border-slate-200 transition-all uppercase"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filters & Search */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, mobile, address..."
                className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 font-medium"
              />
            </div>

            {/* Store selection dropdown - Shows all store details */}
            <div className="flex items-center gap-1.5 self-stretch sm:self-auto w-full sm:w-auto">
              <span className="text-[10px] font-black uppercase text-slate-400 whitespace-nowrap hidden md:inline">🏪 Store:</span>
              <select
                value={selectedListStoreId}
                onChange={(e) => setSelectedListStoreId(e.target.value)}
                className="text-xs font-bold rounded-xl border border-slate-200 py-2 px-3 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 text-slate-700 w-full sm:w-auto"
              >
                <option value="All">All Store Branches</option>
                {storesList.map(st => (
                  <option key={st.id} value={st.id}>{st.storeCode ? `[${st.storeCode}] ` : ""}{st.name.replace("Farmer's Gate - ", "")}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-1.5 self-stretch sm:self-auto overflow-x-auto">
              <button
                onClick={() => setShowProblematicOnly(!showProblematicOnly)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  showProblematicOnly 
                    ? 'bg-rose-100 text-rose-700 border-rose-200 ring-2 ring-rose-500/10' 
                    : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className={`h-3 w-3 ${showProblematicOnly ? 'text-rose-600' : 'text-slate-400'}`} />
                {showProblematicOnly ? 'Showing Problematic' : 'Problematic'}
              </button>

              <button
                type="button"
                onClick={() => setTypeFilter('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  typeFilter === 'All'
                    ? 'bg-emerald-600 text-slate-950 font-extrabold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All Milk
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Cow')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  typeFilter === 'Cow'
                    ? 'bg-emerald-600 text-slate-950 font-extrabold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                🐄 Cow Milk
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('Buffalo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  typeFilter === 'Buffalo'
                    ? 'bg-emerald-600 text-slate-950 font-extrabold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                🐃 Buffalo Milk
              </button>
            </div>
          </div>

          {/* List View */}
          <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-20 text-slate-400 italic text-xs">
                No milk users found matching search filter.
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isExpanded = expandedSubId === c.id;
                const { stats, dates } = getCalculatedMilkStats(c);

                return (
                  <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 hover:bg-slate-50/40 transition-all flex flex-col gap-4">
                    
                    {/* Main User Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center flex-wrap gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{c.name}</h4>
                          {isDuplicate(c) && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-100 text-[8px] font-black text-rose-600 uppercase">
                              ⚠️ Duplicate Entry Detected
                            </span>
                          )}
                          <span className="font-mono text-[9px] font-black bg-emerald-500/10 text-emerald-800 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                            🆔 {c.id}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            c.milkType === 'Cow' 
                              ? 'bg-amber-50 border border-amber-100 text-amber-800' 
                              : c.milkType === 'Buffalo'
                              ? 'bg-indigo-50 border border-indigo-100 text-indigo-800'
                              : 'bg-emerald-50 border border-emerald-100 text-emerald-800'
                          }`}>
                            {c.milkType === 'Cow' ? '🐄 Cow' : c.milkType === 'Buffalo' ? '🐃 Buffalo' : '🥛 Both (Cow + Buffalo)'}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-black uppercase px-3 py-1 rounded-xl">
                            🥛 Daily Milk Taken by User: {c.quantity} L
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black uppercase px-3 py-1 rounded-xl">
                            🏪 Store Branch: {getStoreNameFromId(c.storeId)} ({c.storeId || 'N/A'})
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-xs">
                          <a href={`tel:${c.mobile}`} className="flex items-center gap-1 hover:text-emerald-600 font-mono text-[11px] font-semibold">
                            <Phone className="h-3 w-3 text-slate-400" />
                            {c.mobile}
                          </a>
                          {c.address && (
                            <div className="flex items-center gap-1 text-[11px] font-medium max-w-sm truncate">
                              <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                              <span>{c.address}</span>
                            </div>
                          )}
                        </div>

                        {/* Separate Quota display for Both milk types */}
                        {c.milkType === 'Both' && (
                          <div className="flex items-center gap-3 bg-white/70 border border-slate-100 p-1.5 px-2.5 rounded-xl text-[10px] text-slate-600 w-fit mt-1">
                            <span className="font-medium">🐄 Cow: <strong className="text-amber-800">{c.cowQuantity}L</strong> @ ₹{c.cowPrice}</span>
                            <span className="text-slate-200">|</span>
                            <span className="font-medium">🐃 Buffalo: <strong className="text-indigo-800">{c.buffaloQuantity}L</strong> @ ₹{c.buffaloPrice}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                        <div className="text-right sm:text-right">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-end gap-1">Plan Details <button onClick={(e) => { e.stopPropagation(); handleQuickSetPrice(c); }} className="text-indigo-500 hover:text-indigo-700 ml-1 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded" title="Set Milk Price">✏️</button></p>
                          <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                            <span className="text-emerald-700 font-black font-mono">{c.quantity} Liters</span> @ ₹{c.price.toFixed(1)}/L
                          </p>
                          <p className="text-[10px] font-mono font-black text-emerald-600 mt-0.5">
                            Daily: ₹{(c.quantity * c.price).toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setShowBillModal(c)}
                            title="Generate Milk Bill"
                            className="p-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-xl cursor-pointer border border-blue-200 transition-colors"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => toggleTakenDaily(c.id)}
                            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer ${
                              c.takenDaily !== false
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                                : 'bg-slate-100 text-slate-500 border border-slate-200 line-through hover:bg-slate-200'
                            }`}
                            title={c.takenDaily !== false ? "Mark as Not Taken Today" : "Mark as Taken Today"}
                          >
                            {c.takenDaily !== false ? '🥛 Taken' : '❌ Skipped'}
                          </button>

                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                            title="Edit user details"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleResetCustomerLedger(c.id)}
                            className="p-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-600 transition cursor-pointer border border-amber-100"
                            title="Clear this customer's history only"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer border border-red-100"
                            title="Delete user ledger profile"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expand/Collapse Button for calculations */}

                    <div className="border-t border-slate-100/80 pt-2.5 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setExpandedSubId(isExpanded ? null : c.id)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-800 transition-all cursor-pointer bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1.5 rounded-xl"
                      >
                        <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                        {isExpanded ? 'Hide Delivery Details' : '📊 View Deliveries & Calculate Taken Milk'}
                      </button>

                      <div className="text-[11px] text-slate-500 font-semibold">
                        15-Day Rollup: <strong className="text-slate-800 font-bold font-mono">{stats.totalLiters.toFixed(1)} L</strong> (₹{stats.totalCost.toFixed(0)})
                      </div>
                    </div>

                    {/* Delivery Log and Calculation Details */}
                    {isExpanded && (
                      <div className="bg-slate-100/50 rounded-2xl border border-slate-200 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        {/* Tab Selector: Calendar vs List */}
                        <div className="flex border-b border-slate-200 gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedTab('calendar')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                              expandedTab === 'calendar'
                                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/30 rounded-t-lg'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            📅 Monthly Calendar View
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpandedTab('list')}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                              expandedTab === 'list'
                                ? 'border-emerald-600 text-emerald-800 bg-emerald-50/30 rounded-t-lg'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            📊 15-Day List View
                          </button>
                        </div>

                        {expandedTab === 'calendar' ? (
                          // Calendar View Block
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                              <div className="flex items-center gap-2 justify-between sm:justify-start">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (calendarMonth === 0) {
                                      setCalendarMonth(11);
                                      setCalendarYear(prev => prev - 1);
                                    } else {
                                      setCalendarMonth(prev => prev - 1);
                                    }
                                  }}
                                  className="p-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs cursor-pointer"
                                >
                                  ← Prev
                                </button>
                                <span className="font-extrabold text-sm text-slate-800 min-w-[120px] text-center">
                                  {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][calendarMonth]} {calendarYear}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (calendarMonth === 11) {
                                      setCalendarMonth(0);
                                      setCalendarYear(prev => prev + 1);
                                    } else {
                                      setCalendarMonth(prev => prev + 1);
                                    }
                                  }}
                                  className="p-1 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold text-xs cursor-pointer"
                                >
                                  Next →
                                </button>
                              </div>

                              <div className="text-[11px] font-black text-slate-500 text-right">
                                Active Monthly Delivery Log
                              </div>
                            </div>

                            {/* Monthly stats card */}
                            {(() => {
                              const mStats = getCalculatedMonthlyStats(c, calendarYear, calendarMonth);
                              return (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 text-xs">
                                  <div className="text-center bg-white p-1.5 rounded-lg border border-slate-100">
                                    <span className="block text-[8px] font-black text-slate-400 uppercase">Monthly Liters</span>
                                    <span className="font-black font-mono text-slate-700">{mStats.totalLiters.toFixed(1)}L</span>
                                  </div>
                                  <div className="text-center bg-white p-1.5 rounded-lg border border-slate-100">
                                    <span className="block text-[8px] font-black text-slate-400 uppercase">Delivered Days</span>
                                    <span className="font-black font-mono text-emerald-700">{mStats.daysTaken} Days</span>
                                  </div>
                                  <div className="text-center bg-white p-1.5 rounded-lg border border-slate-100">
                                    <span className="block text-[8px] font-black text-slate-400 uppercase">Skipped Days</span>
                                    <span className="font-black font-mono text-rose-600">{mStats.daysSkipped} Days</span>
                                  </div>
                                  <div className="text-center bg-emerald-600 text-white p-1.5 rounded-lg flex flex-col justify-center">
                                    <span className="block text-[8px] font-black text-slate-900 uppercase">Grand Total</span>
                                    <span className="font-black font-mono text-slate-950">₹{mStats.totalCost.toFixed(1)}</span>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Calendar Grid */}
                            <div className="grid grid-cols-7 gap-1 border border-slate-200 p-2.5 rounded-2xl bg-white shadow-sm">
                              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(wd => (
                                <div key={wd} className="text-center text-[10px] font-black text-slate-400 uppercase py-1">
                                  {wd}
                                </div>
                              ))}
                              
                              {Array.from({ length: new Date(calendarYear, calendarMonth, 1).getDay() }).map((_, idx) => (
                                <div key={`blank-${idx}`} className="aspect-square bg-slate-50/40 rounded-lg" />
                              ))}

                              {Array.from({ length: new Date(calendarYear, calendarMonth + 1, 0).getDate() }).map((_, idx) => {
                                const dayNum = idx + 1;
                                const formatDateString = (y: number, m: number, d: number) => {
                                  const mm = String(m + 1).padStart(2, '0');
                                  const dd = String(d).padStart(2, '0');
                                  return `${y}-${mm}-${dd}`;
                                };
                                const dateStr = formatDateString(calendarYear, calendarMonth, dayNum);
                                
                                const logs = c.milkTakenLogs || [];
                                const logEntry = logs.find(l => l.date === dateStr);
                                
                                const defaultCowQty = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
                                const defaultBuffaloQty = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);

                                const cowQty = logEntry ? logEntry.cowQuantityTaken : (c.takenDaily !== false ? defaultCowQty : 0);
                                const buffaloQty = logEntry ? logEntry.buffaloQuantityTaken : (c.takenDaily !== false ? defaultBuffaloQty : 0);
                                
                                const isSkipped = cowQty === 0 && buffaloQty === 0;
                                const todayStr = new Date().toISOString().split('T')[0];
                                const isFuture = dateStr > todayStr;
                                
                                let tooltipText = "";
                                if (isFuture) {
                                  tooltipText = "Future date";
                                } else if (isSkipped) {
                                  tooltipText = "Skipped";
                                } else {
                                  if (cowQty > 0 && buffaloQty > 0) {
                                    tooltipText = `Total: ${(cowQty + buffaloQty).toFixed(1)}L (Cow: ${cowQty}L, Buffalo: ${buffaloQty}L)`;
                                  } else if (cowQty > 0) {
                                    tooltipText = `Cow Milk: ${cowQty}L`;
                                  } else if (buffaloQty > 0) {
                                    tooltipText = `Buffalo Milk: ${buffaloQty}L`;
                                  }
                                }

                                return (
                                  <div
                                    title={tooltipText}
                                    key={`day-${dayNum}`}
                                    className={`aspect-square p-1 rounded-xl border flex flex-col justify-between transition-all group relative cursor-pointer ${
                                      isFuture
                                        ? 'bg-slate-50/50 border-slate-100 opacity-40 cursor-not-allowed text-slate-350'
                                        : isSkipped
                                        ? 'bg-rose-50/70 border-rose-100 hover:border-rose-300 text-rose-800'
                                        : 'bg-emerald-50/75 border-emerald-100 hover:border-emerald-300 text-emerald-900 shadow-sm'
                                    }`}
                                    onClick={() => {
                                      if (!isFuture) {
                                        toggleDateDelivery(c.id, dateStr);
                                      }
                                    }}
                                  >
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] font-extrabold">{dayNum}</span>
                                      {!isFuture && (
                                        <span className="text-[9px] font-black">
                                          {isSkipped ? '❌' : '🥛'}
                                        </span>
                                      )}
                                    </div>

                                    {!isFuture && (
                                      <div className="flex flex-col items-center">
                                        <span className="text-[9px] font-black font-mono">
                                          {isSkipped ? 'Skip' : `${(cowQty + buffaloQty).toFixed(1)}L`}
                                        </span>
                                        
                                        {/* Micro Adjusters on Hover */}
                                        {!isSkipped && (
                                          <div className="absolute inset-x-0 bottom-0.5 hidden group-hover:flex items-center justify-center gap-1 bg-white/95 p-0.5 rounded-lg border border-slate-200/80 shadow-md" onClick={e => e.stopPropagation()}>
                                            <button
                                              type="button"
                                              disabled={cowQty + buffaloQty <= 0.5}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const fieldToAdjust = c.milkType === 'Buffalo' ? 'buffalo' : 'cow';
                                                updateMilkTakenLog(c.id, dateStr, fieldToAdjust, -0.5);
                                              }}
                                              className="h-3.5 w-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded text-[10px] flex items-center justify-center font-bold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                            >
                                              -
                                            </button>
                                            <span className="text-[8px] font-bold font-mono">{(cowQty + buffaloQty).toFixed(1)}L</span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const fieldToAdjust = c.milkType === 'Buffalo' ? 'buffalo' : 'cow';
                                                updateMilkTakenLog(c.id, dateStr, fieldToAdjust, 0.5);
                                              }}
                                              className="h-3.5 w-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 rounded text-[10px] flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                                            >
                                              +
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          // List View Block
                          <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200/60 pb-3">
                              <div>
                                <h5 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">🧮 15-Day Delivery Calc Summary</h5>
                                <p className="text-xs font-bold text-slate-600 mt-0.5">
                                  Delivered: <span className="text-emerald-700 font-black">{stats.daysTaken} days</span> | Skipped: <span className="text-red-600 font-black">{stats.daysSkipped} days</span>
                                </p>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 text-right">
                                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/50 text-center min-w-[70px]">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase">Cow Milk</span>
                                  <span className="text-xs font-black font-mono text-slate-700">{stats.totalCowLiters.toFixed(1)}L</span>
                                </div>
                                <div className="bg-white/80 p-2 rounded-lg border border-slate-200/50 text-center min-w-[70px]">
                                  <span className="block text-[8px] font-black text-slate-400 uppercase">Buffalo Milk</span>
                                  <span className="text-xs font-black font-mono text-slate-700">{stats.totalBuffaloLiters.toFixed(1)}L</span>
                                </div>
                                <div className="bg-emerald-600 p-2 rounded-lg text-center min-w-[90px]">
                                  <span className="block text-[8px] font-black text-slate-900 uppercase">Grand Total</span>
                                  <span className="text-xs font-black font-mono text-slate-950">₹{stats.totalCost.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Quantity adjustor list */}
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                              {dates.map(dateStr => {
                                const dateObj = new Date(dateStr);
                                const displayDate = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', weekday: 'short' });
                                
                                const logs = c.milkTakenLogs || [];
                                const logEntry = logs.find(l => l.date === dateStr);
                                
                                const defaultCowQty = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
                                const defaultBuffaloQty = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);

                                const cowQty = logEntry ? logEntry.cowQuantityTaken : (c.takenDaily !== false ? defaultCowQty : 0);
                                const buffaloQty = logEntry ? logEntry.buffaloQuantityTaken : (c.takenDaily !== false ? defaultBuffaloQty : 0);
                                
                                const isSkipped = cowQty === 0 && buffaloQty === 0;

                                return (
                                  <div key={dateStr} className={`p-2.5 rounded-xl border flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 transition-all ${
                                    isSkipped 
                                      ? 'bg-slate-200/40 border-slate-300/40 opacity-70' 
                                      : 'bg-white border-slate-200 hover:border-slate-350'
                                  }`}>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleDateDelivery(c.id, dateStr)}
                                        className={`p-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                                          !isSkipped
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-100 hover:bg-emerald-100'
                                            : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-slate-200'
                                        }`}
                                        title={!isSkipped ? "Skip delivery for this date" : "Enable delivery for this date"}
                                      >
                                        {!isSkipped ? '🥛 Active' : '❌ Skipped'}
                                      </button>
                                      <span className="text-[11px] font-extrabold text-slate-800">{displayDate}</span>
                                    </div>

                                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                                      {/* Cow adjustment buttons if applicable */}
                                      {(c.milkType === 'Cow' || c.milkType === 'Both') && (
                                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-150">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Cow:</span>
                                          <button
                                            type="button"
                                            disabled={cowQty <= 0}
                                            onClick={() => updateMilkTakenLog(c.id, dateStr, 'cow', -0.5)}
                                            className="h-5 w-5 rounded bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                          >
                                            -
                                          </button>
                                          <span className="text-[11px] font-black font-mono text-slate-700 min-w-[32px] text-center">
                                            {cowQty.toFixed(1)}L
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => updateMilkTakenLog(c.id, dateStr, 'cow', 0.5)}
                                            className="h-5 w-5 rounded bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}

                                      {/* Buffalo adjustment buttons if applicable */}
                                      {(c.milkType === 'Buffalo' || c.milkType === 'Both') && (
                                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-150">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Buf:</span>
                                          <button
                                            type="button"
                                            disabled={buffaloQty <= 0}
                                            onClick={() => updateMilkTakenLog(c.id, dateStr, 'buffalo', -0.5)}
                                            className="h-5 w-5 rounded bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                          >
                                            -
                                          </button>
                                          <span className="text-[11px] font-black font-mono text-slate-700 min-w-[32px] text-center">
                                            {buffaloQty.toFixed(1)}L
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => updateMilkTakenLog(c.id, dateStr, 'buffalo', 0.5)}
                                            className="h-5 w-5 rounded bg-white hover:bg-slate-100 active:bg-slate-200 border border-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                                          >
                                            +
                                          </button>
                                        </div>
                                      )}
                                      
                                      <span className="text-[11px] font-black font-mono text-emerald-700 min-w-[55px] text-right">
                                        ₹{logEntry ? logEntry.totalAmount.toFixed(1) : (((cowQty * (c.milkType === 'Cow' ? c.price : (c.cowPrice ?? 60))) + (buffaloQty * (c.milkType === 'Buffalo' ? c.price : (c.buffaloPrice ?? 75))))).toFixed(1)}
                                      </span>

                                      <button
                                        type="button"
                                        onClick={() => handleDeleteLogEntry(c.id, dateStr)}
                                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer border border-rose-100"
                                        title="Delete/Reset this specific date entry"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>

                                    {logEntry && logEntry.billId && (
                                      <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 w-full justify-between">
                                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-extrabold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/40">
                                          <span>🧾 Linked Bill: </span>
                                          <span className="font-mono text-slate-800 font-black">{logEntry.billId}</span>
                                          {logEntry.isCancelled && (
                                            <span className="text-red-600 font-black uppercase text-[8px] bg-red-100 px-1 rounded">Cancelled</span>
                                          )}
                                        </div>
                                        {!logEntry.isCancelled && (
                                          <button
                                            type="button"
                                            onClick={() => handleCancelLinkedBill(logEntry.billId)}
                                            className="text-[9px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-2 py-0.5 rounded-md cursor-pointer transition-all active:scale-95"
                                          >
                                            🛑 Cancel Bill
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <p className="text-[9px] text-slate-400 italic font-medium leading-relaxed">
                          * Tip: Deliveries are synced in real-time. Click any day on the calendar to toggle its status or hover to adjust milk quantities.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

        </div>

      </div>

      {/* MILK BILL MODAL */}
      {activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col md:flex-row max-h-[90vh] my-8 animate-in fade-in zoom-in-95 duration-200">
            
            {/* LEFT PANE: Boutique Farm Fresh Invoice Statement */}
            <div className="flex-1 overflow-y-auto p-6 border-r border-slate-100 flex flex-col min-h-0 bg-slate-50/20">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-3xs flex-1 flex flex-col" id="bill-receipt-content">
                <div className="text-center pb-4 border-b border-dashed border-slate-200 mb-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-5 rotate-12 pointer-events-none">
                     <span className="text-6xl">🐄</span>
                  </div>
                  <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-800 text-2xl font-black mb-2 shadow-sm border border-emerald-200">
                    🥛
                  </div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest font-sans">Chouhan Dairy Farm</h2>
                  <p className="text-[10px] text-emerald-600 font-extrabold tracking-widest uppercase mt-1">Fresh Dairy Delivery Statement</p>
                  
                  <div className="mt-2.5 flex justify-center px-6">
                    <p className="text-[9.5px] italic font-medium text-slate-500 text-center leading-relaxed bg-slate-50 py-1.5 px-3 rounded-full border border-slate-100 shadow-inner max-w-xs">
                      "{randomHealthQuote}"
                    </p>
                  </div>

                  <p className="text-[8px] font-mono text-slate-400 mt-2.5">Invoice: FG-INV-{activeCustomer.id.split('-').pop()}-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                  <div>
                    <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Billed To</p>
                    <p className="font-extrabold text-slate-800 text-sm mt-0.5">{activeCustomer.name}</p>
                    <p className="text-slate-500 font-mono mt-0.5">{activeCustomer.mobile}</p>
                    <p className="text-slate-500 italic mt-0.5 line-clamp-2 leading-tight">{activeCustomer.address || "No address saved"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Dispatch Node</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">Farmer's Gate</p>
                    <p className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1 uppercase">
                      {getStoreAbbrFromId(activeCustomer.storeId)} Store
                    </p>
                    <p className="text-[9px] font-mono text-slate-400 mt-1.5">Statement Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60 mb-4">
                  <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Subscription Plan</p>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700">
                      {activeCustomer.milkType === 'Both' 
                        ? '🐄 Cow Milk + 🐃 Buffalo Milk Combination' 
                        : `${activeCustomer.milkType} Milk Active Ledger`}
                    </span>
                    <span className="font-mono font-extrabold text-slate-900 bg-white border border-slate-200/80 px-2 py-0.5 rounded text-[10px]">
                      {activeCustomer.milkType === 'Both' 
                        ? `Cow: ${activeCustomer.cowQuantity}L @ ₹${activeCustomer.cowPrice ?? globalCowPrice}/L | Buf: ${activeCustomer.buffaloQuantity}L @ ₹${activeCustomer.buffaloPrice ?? globalBuffaloPrice}/L` 
                        : `${activeCustomer.quantity} Liters @ ₹${activeCustomer.price}/L`}
                    </span>
                  </div>
                </div>

                {/* Itemized Deliveries Table */}
                <div className="flex-1 min-h-[160px] max-h-[220px] overflow-y-auto mb-4 border border-slate-200/80 rounded-xl bg-white">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 font-black uppercase tracking-wider border-b border-slate-150">
                        <th className="p-2">Date</th>
                        <th className="p-2 text-center">Type</th>
                        <th className="p-2 text-right">Volume</th>
                        <th className="p-2 text-right">Rate</th>
                        <th className="p-2 text-right pr-3">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {(() => {
                        const { recentLogs } = generateBillContent(activeCustomer, billingPeriod);
                        if (recentLogs.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-slate-400 italic">No records logged in selected period.</td>
                            </tr>
                          );
                        }
                        return recentLogs.map((log) => {
                          const isSkipped = log.cowQuantityTaken === 0 && log.buffaloQuantityTaken === 0;
                          return (
                            <tr key={log.date} className={`hover:bg-slate-50/50 ${isSkipped ? 'bg-rose-50/25 text-slate-400' : ''}`}>
                              <td className="p-2 font-mono font-bold">{new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })}</td>
                              <td className="p-2 text-center font-bold">
                                {isSkipped ? (
                                  <span className="text-red-500 font-black text-[8px] bg-red-50 px-1 py-0.2 rounded uppercase">Skipped</span>
                                ) : (
                                  activeCustomer.milkType === 'Both' ? 'Both' : activeCustomer.milkType
                                )}
                              </td>
                              <td className="p-2 text-right font-mono font-bold">
                                {isSkipped ? '0L' : (
                                  activeCustomer.milkType === 'Both' 
                                    ? `${log.cowQuantityTaken + log.buffaloQuantityTaken}L` 
                                    : `${activeCustomer.milkType === 'Cow' ? log.cowQuantityTaken : log.buffaloQuantityTaken}L`
                                )}
                              </td>
                              <td className="p-2 text-right font-mono text-slate-500">
                                {isSkipped ? '-' : `₹${activeCustomer.milkType === 'Both' ? `${log.cowPrice}/${log.buffaloPrice}` : (activeCustomer.milkType === 'Cow' ? log.cowPrice : log.buffaloPrice)}`}
                              </td>
                              <td className="p-2 text-right pr-3 font-mono font-extrabold text-slate-900">
                                ₹{log.totalAmount.toFixed(1)}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Subtotals Block */}
                {(() => {
                  const { recentLogs, totalAmt } = generateBillContent(activeCustomer, billingPeriod);
                  const daysDelivered = recentLogs.filter(l => l.cowQuantityTaken > 0 || l.buffaloQuantityTaken > 0).length;
                  const totalVolume = recentLogs.reduce((sum, l) => sum + (l.cowQuantityTaken + l.buffaloQuantityTaken), 0);
                  
                  return (
                    <div className="space-y-1.5 pt-3 border-t border-dashed border-slate-200 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Total Deliveries</span>
                        <span className="font-bold text-slate-800">{daysDelivered} of {recentLogs.length} Days</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Cumulative volume</span>
                        <span className="font-mono font-bold text-slate-800">{totalVolume.toFixed(1)} Liters</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>GST / Sales Tax</span>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">0% (Pure Agri Fresh)</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-black text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-150 mt-2.5">
                        <span className="text-slate-800">Grand Amount Due</span>
                        <span className="text-base text-emerald-800 font-black font-mono">₹{totalAmt.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="text-center mt-4">
                  <p className="text-[9px] font-black text-slate-400 tracking-wider uppercase">🌾 Chouhan Dairy Farm Premium Quality Verified 🌾</p>
                </div>
              </div>
            </div>

            {/* RIGHT PANE: Modern Mobile Dispatch Hub */}
            <div className="w-full md:w-[380px] bg-slate-900 text-white p-6 flex flex-col justify-between overflow-y-auto">
              
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-black text-sm uppercase tracking-tight flex items-center gap-2 text-indigo-400">
                    <Smartphone className="h-4.5 w-4.5" /> Mobile Transmission
                  </h3>
                  <button 
                    onClick={() => setShowBillModal(null)}
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-400 cursor-pointer transition-colors"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Period Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Billing Period</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['last15', 'last30', 'thisMonth', 'lastMonth'] as const).map((p) => {
                      const label = p === 'last15' ? '15 Days' : p === 'last30' ? '30 Days' : p === 'thisMonth' ? 'This Month' : 'Last Month';
                      const isActive = billingPeriod === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBillingPeriod(p)}
                          className={`py-2 px-2.5 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer border text-center ${isActive ? 'bg-indigo-600 border-indigo-500 text-white shadow-md' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-750'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* File Download formats */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Export Offline Formats</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleDownloadPDF(activeCustomer)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-red-650 hover:bg-red-600 text-white font-extrabold text-[10px] uppercase transition cursor-pointer border border-red-700"
                    >
                      <Download className="h-3.5 w-3.5" /> PDF File
                    </button>
                    <button
                      onClick={() => handleDownloadImage(activeCustomer)}
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-650 hover:bg-indigo-650 text-white font-extrabold text-[10px] uppercase transition cursor-pointer border border-indigo-700"
                    >
                      <Download className="h-3.5 w-3.5" /> PNG Image
                    </button>
                  </div>
                </div>

                {/* Custom text template */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Edit Mobile Statement Text</label>
                  <textarea
                    rows={4}
                    value={customBillMessage}
                    onChange={(e) => setCustomBillMessage(e.target.value)}
                    className="w-full text-xs font-medium rounded-xl border border-slate-800 bg-slate-950 p-2.5 focus:outline-none focus:border-indigo-500 text-slate-100 placeholder-slate-600 font-mono resize-none leading-relaxed"
                  />
                </div>

                {/* Real-time Phone message preview bubble */}
                <div className="space-y-1.5">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest">Simulated Mobile Dispatch Preview</label>
                  <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 relative shadow-inner overflow-hidden flex flex-col justify-between h-[155px]">
                    {/* Status header */}
                    <div className="flex justify-between items-center text-[8.5px] font-mono text-slate-500 border-b border-slate-900 pb-1.5 mb-1.5">
                      <span>Recipient: +{activeCustomer.mobile}</span>
                      <span className="flex items-center gap-1">● WhatsApp Active</span>
                    </div>

                    {/* Chat Bubble scroll area */}
                    <div className="flex-1 overflow-y-auto text-[9.5px] font-sans font-medium text-slate-100 flex flex-col items-end">
                      <div className="bg-emerald-650 text-white p-2 rounded-2xl rounded-tr-none max-w-[85%] relative shadow-sm leading-snug whitespace-pre-line text-left">
                        {customBillMessage}
                        <span className="block text-[8px] text-emerald-200 text-right mt-1 font-mono">
                          {new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ✓✓
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION SEND BAR */}
              <div className="mt-5 pt-4 border-t border-slate-800 space-y-2 shrink-0">
                <button
                  onClick={() => handleShareWhatsApp(activeCustomer)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500 hover:bg-green-600 text-slate-950 font-black uppercase text-xs transition cursor-pointer shadow-lg shadow-green-500/15"
                >
                  <Share2 className="h-4 w-4 text-slate-950" /> Send via WhatsApp
                </button>
                
                <button
                  onClick={() => handleSendSimulatedSMS(activeCustomer)}
                  disabled={smsSending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-850 text-indigo-400 hover:text-indigo-300 font-black uppercase text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {smsSending ? (
                    <span className="animate-pulse">Transmitting Statement...</span>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>{smsSentStatus ? "Statement Sent! (Resend)" : "Send Simulated SMS"}</span>
                    </>
                  )}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
