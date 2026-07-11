import React, { useState, useEffect } from 'react';
import { MilkCustomer } from '../types';
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
  AlertTriangle
} from 'lucide-react';

const DEFAULT_MILK_CUSTOMERS: MilkCustomer[] = [
  {
    id: 'milk-1',
    name: 'Gurpreet Singh',
    mobile: '919872543210',
    address: 'House 142, Phase 1, Urban Estate, Patiala, Punjab',
    milkType: 'Cow',
    quantity: 2,
    price: 60,
    storeId: 'store-1',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'milk-2',
    name: 'Manpreet Kaur',
    mobile: '919463287654',
    address: 'Flat 4B, SST Nagar, Patiala, Punjab',
    milkType: 'Buffalo',
    quantity: 1.5,
    price: 75,
    storeId: 'store-1',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'milk-3',
    name: 'Jaswinder Singh',
    mobile: '919814412345',
    address: 'Sector 2, Model Town, Patiala, Punjab',
    milkType: 'Cow',
    quantity: 1,
    price: 60,
    storeId: 'store-2',
    createdAt: new Date().toISOString()
  }
];

interface CustomerMilkRegistryProps {
  storeId?: string;
}

const getStoreAbbrFromId = (sId?: string): string => {
  if (!sId) return 'HQ';
  if (sId === 'store-1') return 'PTM'; // Patiala Model Town
  if (sId === 'store-2') return 'PTU'; // Patiala Urban Estate
  return sId.toUpperCase();
};

export default function CustomerMilkRegistry({ storeId }: CustomerMilkRegistryProps) {
  const [customers, setCustomers] = useState<MilkCustomer[]>(() => {
    try {
      const saved = localStorage.getItem('fg_milk_customers');
      const list = saved ? JSON.parse(saved) : DEFAULT_MILK_CUSTOMERS;
      
      let changed = false;
      const migrated = list.map((c: any, idx: number) => {
        const isLegacy = !c.id || !c.id.startsWith('FG-SUB-');
        const isMissingStore = !c.storeId;
        if (isLegacy || isMissingStore) {
          changed = true;
          const mappedStoreId = c.storeId || storeId || 'store-1';
          const storeAbbr = getStoreAbbrFromId(mappedStoreId);
          const uniqueId = isLegacy 
            ? `FG-SUB-${storeAbbr}-${1000 + idx + Math.floor(Math.random() * 100)}` 
            : c.id;
          return {
            ...c,
            id: uniqueId,
            storeId: mappedStoreId
          };
        }
        return c;
      });

      if (changed) {
        localStorage.setItem('fg_milk_customers', JSON.stringify(migrated));
        return migrated;
      }
      return list;
    } catch {
      return DEFAULT_MILK_CUSTOMERS;
    }
  });

  const [deletionRequests, setDeletionRequests] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('fg_milk_deletion_requests');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('fg_milk_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('fg_milk_deletion_requests', JSON.stringify(deletionRequests));
  }, [deletionRequests]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Cow' | 'Buffalo'>('All');
  
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
  const [selectedStoreId, setSelectedStoreId] = useState(storeId || 'store-1');

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
        stats.totalCowLiters += logged.cowQuantityTaken;
        stats.totalBuffaloLiters += logged.buffaloQuantityTaken;
        stats.totalCost += logged.totalAmount;
        if (logged.cowQuantityTaken > 0 || logged.buffaloQuantityTaken > 0) {
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

      return {
        ...c,
        milkTakenLogs: logs
      };
    }));
  };

  // Toggles whether any milk was taken on a specific date (fully skips or fully resets to default)
  const toggleDateDelivery = (customerId: string, dateStr: string) => {
    setCustomers(prev => prev.map(c => {
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
          // Set to 0 (skipped)
          logged.cowQuantityTaken = 0;
          logged.buffaloQuantityTaken = 0;
          logged.totalAmount = 0;
        } else {
          // Reset to subscriber defaults
          logged.cowQuantityTaken = defaultCowQty;
          logged.buffaloQuantityTaken = defaultBuffaloQty;
          logged.totalAmount = parseFloat(((defaultCowQty * cowRate) + (defaultBuffaloQty * buffaloRate)).toFixed(2));
        }
        logs[existingIdx] = logged;
      } else {
        // Since it wasn't logged, we assume standard behavior is being toggled.
        const defaultIsActive = c.takenDaily !== false;
        logs.push({
          date: dateStr,
          cowQuantityTaken: defaultIsActive ? 0 : defaultCowQty,
          buffaloQuantityTaken: defaultIsActive ? 0 : defaultBuffaloQty,
          cowPrice: cowRate,
          buffaloPrice: buffaloRate,
          totalAmount: defaultIsActive ? 0 : parseFloat(((defaultCowQty * cowRate) + (defaultBuffaloQty * buffaloRate)).toFixed(2))
        });
      }

      return {
        ...c,
        milkTakenLogs: logs
      };
    }));
  };

  // Cancels a linked POS invoice and updates subscriber logs accordingly
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

      alert(`POS Invoice #${billId} and its associated subscriber delivery log have been successfully cancelled!`);
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

    const filtered = storeId ? customers.filter(c => c.storeId === storeId) : customers;

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
    setSelectedStoreId(storeId || 'store-1');
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
    setSelectedStoreId(c.storeId || storeId || 'store-1');
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
      id: editingId || `FG-SUB-${getStoreAbbrFromId(selectedStoreId || storeId || 'store-1')}-${Math.floor(1000 + Math.random() * 9000)}`,
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
      storeId: selectedStoreId || storeId || 'store-1',
      createdAt: editingId 
        ? (currentEditingObj?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      milkTakenLogs: currentEditingObj?.milkTakenLogs || []
    };

    if (editingId) {
      setCustomers(prev => prev.map(c => c.id === editingId ? customerData : c));
    } else {
      setCustomers(prev => [customerData, ...prev]);
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
          notes: `Milk Subscriber (${customerData.milkType}) • Updated in Registry`
        };
      } else {
        generalCustomers.push({
          id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          storeId: customerData.storeId,
          name: customerData.name,
          phone: formattedPhone,
          address: customerData.address,
          milkSubId: customerData.id,
          loyaltyPoints: 0,
          createdAt: new Date().toISOString(),
          notes: `Milk Subscriber (${customerData.milkType}) • Added from Registry`
        });
      }

      localStorage.setItem('fg_general_customers', JSON.stringify(generalCustomers));
      
      // Dispatch storage event to notify other modules
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'fg_general_customers',
        newValue: JSON.stringify(generalCustomers)
      }));
    } catch (err) {
      console.error("Error syncing milk subscriber to general directory:", err);
    }

    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    const subscriber = customers.find(c => c.id === id);
    if (!subscriber) return;

    if (storeId) {
      // Deletion request inside Store/POS
      if (confirm(`Send a deletion request for subscriber "${subscriber.name}" to the HQ Milk Subscriber Module?`)) {
        const newRequest = {
          id: `del-req-${Date.now()}`,
          subscriberId: id,
          subscriberName: subscriber.name,
          subscriberMobile: subscriber.mobile,
          storeId: storeId,
          date: new Date().toISOString(),
          status: 'Pending'
        };
        setDeletionRequests(prev => [...prev, newRequest]);
        alert("Deletion request message registered and sent to HQ Milk Subscriber Module.");
      }
    } else {
      // Direct deletion at HQ
      if (confirm(`Are you sure you want to permanently delete subscriber "${subscriber.name}"?`)) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        // Clean up requests
        setDeletionRequests(prev => prev.filter(r => r.subscriberId !== id));
      }
    }
  };

  const handleApproveDeletion = (reqId: string, subId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== subId));
    setDeletionRequests(prev => prev.filter(r => r.id !== reqId));
    alert("Approved: Subscriber has been permanently removed.");
  };

  const handleDeclineDeletion = (reqId: string) => {
    setDeletionRequests(prev => prev.filter(r => r.id !== reqId));
    alert("Declined: Deletion request dismissed.");
  };

  const toggleTakenDaily = (id: string) => {
    setCustomers(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, takenDaily: c.takenDaily === false ? true : false };
      }
      return c;
    }));
  };

  const filteredCustomers = customers.filter(c => {
    // Separate every branch details from other branch:
    if (storeId && c.storeId !== storeId) return false;

    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        c.mobile.includes(searchQuery) ||
                        c.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || c.milkType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Top Banner and Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-emerald-950 text-white rounded-3xl p-6 shadow-sm border border-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03]" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-emerald-800 text-emerald-300 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-700/50">
            <Sparkles className="h-3 w-3" /> Dairy Subscribers
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight font-sans">Customer Milk Details Registry</h2>
          <p className="text-xs text-emerald-200 max-w-xl">
            Centralized record book for milk subscriptions, quantities, and pricing models compiled across all trading branches.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="relative z-10 inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-2xl transition-all shadow-md uppercase cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Milk Subscriber
        </button>
      </div>

      {/* Grid Layout: Controls & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form (if open) or Fast Stats */}
        {(isFormOpen || !storeId) && (
          <div className="lg:col-span-4 space-y-6">
            
            {isFormOpen ? (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900">
                  {editingId ? 'Edit Subscriber' : 'New Milk Subscriber'}
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
                    <option value="store-1">Farmer's Gate - Patiala Model Town</option>
                    <option value="store-2">Farmer's Gate - Patiala Urban Estate</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Subscriber Name *</label>
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
                {editingId ? 'Update Subscription' : 'Create Subscription'}
              </button>
            </form>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h3 className="font-extrabold text-xs text-slate-900 uppercase">Subscribers Summary</h3>
              </div>

              {(() => {
                const globalStats = getGlobalMilkStats();
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
                        <span className="block text-[8px] font-black text-slate-400 uppercase">Total Accounts</span>
                        <span className="text-sm font-black text-slate-800 mt-1 block">{customers.length} Active</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-center">
                        <span className="block text-[8px] font-black text-slate-400 uppercase">Subscribed Vol</span>
                        <span className="text-sm font-black text-slate-700 mt-1 block font-mono">
                          {customers.reduce((sum, c) => sum + (c.quantity || 0), 0).toFixed(1)} L
                        </span>
                      </div>
                    </div>

                    <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] text-emerald-850 font-black uppercase tracking-wide border-b border-emerald-100/50 pb-1">🥛 Today's Active Breakdown</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">🐄 Cow Milk</p>
                          <p className="font-mono font-extrabold text-slate-700">{globalStats.totalCowLiters.toFixed(1)} L</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">🐃 Buffalo</p>
                          <p className="font-mono font-extrabold text-slate-700">{globalStats.totalBuffaloLiters.toFixed(1)} L</p>
                        </div>
                      </div>
                      <div className="pt-1.5 border-t border-emerald-100/50 flex justify-between items-center text-xs">
                        <span className="font-bold text-emerald-800">Today's Value:</span>
                        <span className="font-mono font-black text-emerald-700">₹{globalStats.totalValue.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2">
                      <p className="text-[10px] text-slate-600 font-black uppercase tracking-wide border-b border-slate-200 pb-1">📊 Rolling 15-Day Consolidated</p>
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Total Milk Taken:</span>
                        <span className="font-mono font-bold">{globalStats.cumulativeLiters15Days.toFixed(1)} L</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-600">
                        <span>Total Billing Value:</span>
                        <span className="font-mono font-black text-slate-800">₹{globalStats.cumulativeCost15Days.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Today's Attendance Quick-Record Checklist */}
                    <div className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 space-y-3">
                      <div className="border-b border-slate-200 pb-1.5 flex justify-between items-center">
                        <p className="text-[10px] text-slate-800 font-black uppercase tracking-wide flex items-center gap-1">
                          📋 Today's Daily Delivery Checklist
                        </p>
                        <span className="font-mono text-[9px] text-emerald-800 font-black bg-emerald-100 px-1.5 py-0.5 rounded">
                          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>

                      {filteredCustomers.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic text-center py-2">No subscribers in this branch.</p>
                      ) : (
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {filteredCustomers.map(c => {
                            const todayStr = new Date().toISOString().split('T')[0];
                            const logs = c.milkTakenLogs || [];
                            const logEntry = logs.find(l => l.date === todayStr);
                            const defaultCowQty = c.milkType === 'Cow' ? c.quantity : (c.milkType === 'Both' ? (c.cowQuantity ?? 0) : 0);
                            const defaultBuffaloQty = c.milkType === 'Buffalo' ? c.quantity : (c.milkType === 'Both' ? (c.buffaloQuantity ?? 0) : 0);
                            
                            const cowQty = logEntry ? logEntry.cowQuantityTaken : (c.takenDaily !== false ? defaultCowQty : 0);
                            const buffaloQty = logEntry ? logEntry.buffaloQuantityTaken : (c.takenDaily !== false ? defaultBuffaloQty : 0);
                            const isSkipped = cowQty === 0 && buffaloQty === 0;

                            const displayQty = c.milkType === 'Both' 
                              ? `${cowQty}L(C)+${buffaloQty}L(B)` 
                              : `${c.milkType === 'Cow' ? cowQty : buffaloQty}L`;

                            return (
                              <div key={c.id} className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-lg border border-slate-150 text-xs shadow-3xs hover:shadow-2xs transition-all">
                                <div className="min-w-0 flex-1">
                                  <p className="font-extrabold text-slate-800 truncate text-[11px]">{c.name}</p>
                                  <p className="text-[9px] text-slate-400 font-mono font-bold">
                                    {displayQty} • {c.milkType}
                                  </p>
                                </div>
                                
                                {/* Quantity adjusters */}
                                {!isSkipped && (
                                  <div className="flex items-center gap-1.5 mr-1.5 shrink-0">
                                    {c.milkType === 'Both' ? (
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1">
                                          <span className="text-[8px] text-slate-400 font-black">C:</span>
                                          <button
                                            type="button"
                                            disabled={cowQty <= 0}
                                            onClick={() => updateMilkTakenLog(c.id, todayStr, 'cow', -0.5)}
                                            className="h-4 w-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 rounded text-[10px] flex items-center justify-center font-bold text-slate-600 disabled:opacity-40 cursor-pointer"
                                          >
                                            -
                                          </button>
                                          <span className="text-[9px] font-bold font-mono min-w-[20px] text-center">{cowQty.toFixed(1)}L</span>
                                          <button
                                            type="button"
                                            onClick={() => updateMilkTakenLog(c.id, todayStr, 'cow', 0.5)}
                                            className="h-4 w-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 rounded text-[10px] flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                                          >
                                            +
                                          </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[8px] text-slate-400 font-black">B:</span>
                                          <button
                                            type="button"
                                            disabled={buffaloQty <= 0}
                                            onClick={() => updateMilkTakenLog(c.id, todayStr, 'buffalo', -0.5)}
                                            className="h-4 w-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 rounded text-[10px] flex items-center justify-center font-bold text-slate-600 disabled:opacity-40 cursor-pointer"
                                          >
                                            -
                                          </button>
                                          <span className="text-[9px] font-bold font-mono min-w-[20px] text-center">{buffaloQty.toFixed(1)}L</span>
                                          <button
                                            type="button"
                                            onClick={() => updateMilkTakenLog(c.id, todayStr, 'buffalo', 0.5)}
                                            className="h-4 w-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 rounded text-[10px] flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          disabled={(c.milkType === 'Cow' ? cowQty : buffaloQty) <= 0}
                                          onClick={() => updateMilkTakenLog(c.id, todayStr, c.milkType === 'Cow' ? 'cow' : 'buffalo', -0.5)}
                                          className="h-5 w-5 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 rounded text-[11px] flex items-center justify-center font-bold text-slate-600 disabled:opacity-40 cursor-pointer"
                                        >
                                          -
                                        </button>
                                        <span className="text-[10px] font-bold font-mono min-w-[24px] text-center">
                                          {(c.milkType === 'Cow' ? cowQty : buffaloQty).toFixed(1)}L
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateMilkTakenLog(c.id, todayStr, c.milkType === 'Cow' ? 'cow' : 'buffalo', 0.5)}
                                          className="h-5 w-5 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 rounded text-[11px] flex items-center justify-center font-bold text-slate-600 cursor-pointer"
                                        >
                                          +
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <button
                                  type="button"
                                  onClick={() => toggleDateDelivery(c.id, todayStr)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer shrink-0 ${
                                    !isSkipped
                                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 border border-emerald-600/20 shadow-3xs'
                                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-200'
                                  }`}
                                >
                                  {!isSkipped ? '🥛 Taken' : '❌ Skipped'}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-[11px] text-emerald-800 leading-relaxed">
                🐄 Cow Milk Rate: <span className="font-bold">₹60/L</span> <br />
                🐃 Buffalo Milk Rate: <span className="font-bold">₹75/L</span> <br />
                <span className="mt-1.5 block text-[10px] text-emerald-600 italic">
                  Milk subscribers can be selected inside the POS for instant automatic dairy billing checkout!
                </span>
              </div>
            </div>
          )}
          </div>
        )}

        {/* Right List Panel */}
        <div className={(isFormOpen || !storeId) ? "lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4" : "lg:col-span-12 bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4"}>
          
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
                The following milk subscribers have been requested for deletion by their respective store branches. Please review and approve/dismiss them.
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {deletionRequests.map((req) => (
                  <div key={req.id} className="bg-white border border-red-100 rounded-xl p-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs shadow-3xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900">{req.subscriberName}</span>
                        <span className="bg-slate-100 text-slate-700 text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                          Store: {getStoreAbbrFromId(req.storeId)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">Mobile: {req.subscriberMobile} • Requested on {new Date(req.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-end">
                      <button
                        onClick={() => handleApproveDeletion(req.id, req.subscriberId)}
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
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
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

            <div className="flex gap-1.5 self-stretch sm:self-auto overflow-x-auto">
              <button
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
                No milk subscribers found matching search filter.
              </div>
            ) : (
              filteredCustomers.map(c => {
                const isExpanded = expandedSubId === c.id;
                const { stats, dates } = getCalculatedMilkStats(c);

                return (
                  <div key={c.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/20 hover:bg-slate-50/40 transition-all flex flex-col gap-4">
                    
                    {/* Main Subscriber Row */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center flex-wrap gap-2">
                          <h4 className="font-extrabold text-sm text-slate-900">{c.name}</h4>
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
                            🥛 Daily Milk Taken by Subscriber: {c.quantity} L
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black uppercase px-3 py-1 rounded-xl">
                            🏪 Store Branch: {c.storeId === 'store-2' ? "Farmer's Gate - Patiala Urban Estate" : "Farmer's Gate - Patiala Model Town"} ({c.storeId || 'store-1'})
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
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Plan Details</p>
                          <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                            <span className="text-emerald-700 font-black font-mono">{c.quantity} Liters</span> @ ₹{c.price.toFixed(1)}/L
                          </p>
                          <p className="text-[10px] font-mono font-black text-emerald-600 mt-0.5">
                            Daily: ₹{(c.quantity * c.price).toFixed(2)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
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
                            title="Edit subscriber details"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer border border-red-100"
                            title="Delete subscription profile"
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

                                return (
                                  <div
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
    </div>
  );
}
