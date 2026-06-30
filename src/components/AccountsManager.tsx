import React, { useState, useEffect } from 'react';
import { Store, Sale, Purchase, AccountEntry, UserRole } from '../types';
import { 
  Plus, 
  Trash2, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Building, 
  Receipt, 
  Briefcase, 
  Zap, 
  Home,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';

interface AccountsManagerProps {
  stores: Store[];
  sales: Sale[];
  purchases: Purchase[];
  role: UserRole;
}

const DEFAULT_ACCOUNTS: AccountEntry[] = [
  {
    id: 'acc-1',
    storeId: 'store-1',
    type: 'Expense',
    category: 'Rent',
    amount: 15000,
    description: 'Monthly store rental for Mumbai Bandra outlet',
    entryDate: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
  },
  {
    id: 'acc-2',
    storeId: 'store-1',
    type: 'Expense',
    category: 'Electricity',
    amount: 3200,
    description: 'Power & refrigeration bill - Bandra',
    entryDate: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: 'acc-3',
    storeId: 'store-2',
    type: 'Expense',
    category: 'Wages',
    amount: 8500,
    description: 'Weekly helper wages - Delhi Karol Bagh',
    entryDate: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  }
];

export default function AccountsManager({ stores, sales, purchases, role }: AccountsManagerProps) {
  const [manualEntries, setManualEntries] = useState<AccountEntry[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');
  const [filterType, setFilterType] = useState<'all' | 'Revenue' | 'Expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formStoreId, setFormStoreId] = useState<string>('global');
  const [formType, setFormType] = useState<'Revenue' | 'Expense'>('Expense');
  const [formCategory, setFormCategory] = useState<AccountEntry['category']>('Other Expense');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMsg, setSuccessMsg] = useState('');

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem('fg_accounts_manual');
    if (saved) {
      try {
        setManualEntries(JSON.parse(saved));
      } catch (e) {
        setManualEntries(DEFAULT_ACCOUNTS);
      }
    } else {
      setManualEntries(DEFAULT_ACCOUNTS);
      localStorage.setItem('fg_accounts_manual', JSON.stringify(DEFAULT_ACCOUNTS));
    }
  }, []);

  // Save to local storage
  const saveEntries = (updated: AccountEntry[]) => {
    setManualEntries(updated);
    localStorage.setItem('fg_accounts_manual', JSON.stringify(updated));
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || parseFloat(formAmount) <= 0) return;

    const newEntry: AccountEntry = {
      id: `acc-${Date.now()}`,
      storeId: formStoreId === 'global' ? undefined : formStoreId,
      type: formType,
      category: formCategory,
      amount: parseFloat(formAmount),
      description: formDescription.trim() || `${formCategory} transaction`,
      entryDate: new Date(formDate).toISOString()
    };

    const updated = [newEntry, ...manualEntries];
    saveEntries(updated);

    // Reset form
    setFormAmount('');
    setFormDescription('');
    setSuccessMsg('Transaction logged successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
    setShowForm(false);
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm('Are you sure you want to delete this accounting ledger entry?')) {
      const updated = manualEntries.filter(e => e.id !== id);
      saveEntries(updated);
    }
  };

  // Build unified transaction list
  // 1. Map Sales -> AccountEntry format
  const salesEntries: AccountEntry[] = sales.map(s => ({
    id: `sale-entry-${s.id}`,
    storeId: s.storeId,
    type: 'Revenue',
    category: 'Sales',
    amount: s.totalPrice,
    description: `Sale of ${s.vegetableName} ${s.customerName ? `to ${s.customerName}` : '(Walk-in)'}`,
    entryDate: s.saleDate
  }));

  // 2. Map Purchases -> AccountEntry format
  const purchasesEntries: AccountEntry[] = purchases.map(p => ({
    id: `pur-entry-${p.id}`,
    storeId: p.storeId,
    type: 'Expense',
    category: 'Purchase',
    amount: p.totalCost,
    description: `Procured ${p.quantity}kg of ${p.vegetableName} from ${p.supplierName || 'vendor'}`,
    entryDate: p.purchaseDate
  }));

  // 3. Combine everything
  const allTransactions = [...salesEntries, ...purchasesEntries, ...manualEntries].sort(
    (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
  );

  // Filter transactions based on selection
  const filteredTransactions = allTransactions.filter(t => {
    const storeMatch = selectedStoreId === 'all' || t.storeId === selectedStoreId;
    const typeMatch = filterType === 'all' || t.type === filterType;
    const categoryMatch = filterCategory === 'all' || t.category === filterCategory;
    return storeMatch && typeMatch && categoryMatch;
  });

  // Calculations based on current store selection
  const computeStats = () => {
    const storeTrans = allTransactions.filter(t => selectedStoreId === 'all' || t.storeId === selectedStoreId);
    
    let totalRevenue = 0;
    let totalExpense = 0;
    
    // Breakdown categories
    let salesRev = 0;
    let purchaseExp = 0;
    let operationalExp = 0;

    storeTrans.forEach(t => {
      if (t.type === 'Revenue') {
        totalRevenue += t.amount;
        if (t.category === 'Sales') salesRev += t.amount;
      } else {
        totalExpense += t.amount;
        if (t.category === 'Purchase') purchaseExp += t.amount;
        else operationalExp += t.amount;
      }
    });

    const netProfit = totalRevenue - totalExpense;
    const grossMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpense,
      netProfit,
      grossMargin,
      salesRev,
      purchaseExp,
      operationalExp
    };
  };

  const stats = computeStats();

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Sales': return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case 'Purchase': return <Receipt className="h-4 w-4 text-amber-500" />;
      case 'Rent': return <Home className="h-4 w-4 text-blue-500" />;
      case 'Electricity': return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'Wages': return <Briefcase className="h-4 w-4 text-purple-500" />;
      default: return <Receipt className="h-4 w-4 text-zinc-500" />;
    }
  };

  const getStoreName = (storeId?: string) => {
    if (!storeId) return 'Global/HQ';
    const st = stores.find(s => s.id === storeId);
    return st ? st.name.replace("Farmer's Gate - ", "") : 'Branch';
  };

  const handleDownloadCSV = () => {
    // 1. Determine Scope Name
    const activeStoreName = selectedStoreId === 'all' 
      ? 'Consolidated (All Branches)' 
      : selectedStoreId === 'global' 
        ? 'HQ or Global accounts' 
        : getStoreName(selectedStoreId);

    let csvContent = "";
    
    // Add Company Metadata
    csvContent += "Farmer's Gate - Financial Report\n";
    csvContent += `Generated On: ${new Date().toLocaleString()}\n`;
    csvContent += `Scope: ${activeStoreName}\n`;
    csvContent += `Filter Type: ${filterType}\n`;
    csvContent += `Filter Category: ${filterCategory}\n\n`;
    
    // Add KPI Summary Section
    csvContent += "FINANCIAL KEY PERFORMANCE METRICS\n";
    csvContent += `Total Revenue,INR ${stats.totalRevenue.toFixed(2)}\n`;
    csvContent += `Total Expense,INR ${stats.totalExpense.toFixed(2)}\n`;
    csvContent += `Net Profit,INR ${stats.netProfit.toFixed(2)}\n`;
    csvContent += `Net Profit Margin,${stats.grossMargin.toFixed(2)}%\n`;
    csvContent += `Sales Revenue (Crops),INR ${stats.salesRev.toFixed(2)}\n`;
    csvContent += `Stock Procurement Expenses,INR ${stats.purchaseExp.toFixed(2)}\n`;
    csvContent += `Operational Expenses,INR ${stats.operationalExp.toFixed(2)}\n\n`;
    
    // Add Detailed Transaction Log Section
    csvContent += "TRANSACTION LEDGER DETAILS\n";
    csvContent += "Date,Transaction ID,Store/Entity,Type,Category,Amount (INR),Description,Source Type\n";
    
    filteredTransactions.forEach(tx => {
      const dateStr = new Date(tx.entryDate).toLocaleDateString();
      const storeName = getStoreName(tx.storeId);
      const isManual = tx.id.startsWith('acc-') ? 'Manual Entry' : 'Auto System Sync';
      
      // Escape strings to prevent formatting issues in Excel
      const escapedDesc = `"${tx.description.replace(/"/g, '""')}"`;
      const escapedCat = `"${tx.category.replace(/"/g, '""')}"`;
      const escapedStore = `"${storeName.replace(/"/g, '""')}"`;
      
      csvContent += `${dateStr},${tx.id},${escapedStore},${tx.type},${escapedCat},${tx.amount.toFixed(2)},${escapedDesc},${isManual}\n`;
    });
    
    // Create blob & trigger immediate browser download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = `Farmers_Gate_Ledger_Report_${activeStoreName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border border-emerald-200">
            Accounting Ledger & Profitability
          </span>
          <h2 className="text-xl font-black text-slate-900 mt-2 tracking-tight">
            Financial Ledger Manager
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time balance sheets, custom expense logging, margins, and branch profit tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Download CSV Report Button */}
          <button
            id="btn-export-csv"
            onClick={handleDownloadCSV}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            title="Export financial report to CSV (fully Excel and Sheets compatible)"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Download CSV Report</span>
          </button>

          {role !== 'Employee' && (
            <button
              id="btn-log-tx"
              onClick={() => {
                setFormCategory('Other Expense');
                setFormType('Expense');
                setShowForm(!showForm);
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Log Other Transaction</span>
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Log Transaction Form (Collapsible) */}
      {showForm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-black text-slate-800">Log Operational Expense or Other Revenue</h3>
            <button 
              onClick={() => setShowForm(false)} 
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleAddEntry} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="space-y-1">
              <label htmlFor="form-store" className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Branch Outlet *</label>
              <select
                id="form-store"
                value={formStoreId}
                onChange={(e) => setFormStoreId(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="global">Global (General Headquarters)</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.name.replace("Farmer's Gate - ", "")}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="form-type" className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Transaction Type *</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  id="form-type"
                  type="button"
                  onClick={() => {
                    setFormType('Expense');
                    setFormCategory('Other Expense');
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    formType === 'Expense' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormType('Revenue');
                    setFormCategory('Other Revenue');
                  }}
                  className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    formType === 'Revenue' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Revenue
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="form-cat" className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Accounting Category *</label>
              <select
                id="form-cat"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              >
                {formType === 'Expense' ? (
                  <>
                    <option value="Rent">Rent</option>
                    <option value="Electricity">Electricity</option>
                    <option value="Wages">Wages / Labour salaries</option>
                    <option value="Other Expense">Other Operations Expense</option>
                  </>
                ) : (
                  <>
                    <option value="Other Revenue">Other Revenue / Capital Injection</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="form-amount" className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Transaction Amount (₹) *</label>
              <input
                id="form-amount"
                type="number"
                required
                min="1"
                placeholder="₹ 1000"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="form-date" className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Date *</label>
              <input
                id="form-date"
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1 md:col-span-3">
              <label htmlFor="form-desc" className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Memo / Narrative Notes *</label>
              <input
                id="form-desc"
                type="text"
                required
                placeholder="e.g. Paid rental check to building landlord for Bandra space"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 bg-slate-50/50 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="md:col-span-3 pt-2">
              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-md shadow-emerald-100 cursor-pointer"
              >
                Save Transaction Ledger Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Branch Selector Filter & Stats Display */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Branch selector sidebar */}
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
          <div>
            <label htmlFor="filter-store" className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Filter by Store / Entity</label>
            <select
              id="filter-store"
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2 bg-slate-50 text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="all">🏢 Consolidated (All Branches)</option>
              <option value="global">📍 HQ / Global accounts only</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>🏪 {s.name.replace("Farmer's Gate - ", "")}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-slate-100 pt-3 space-y-2 text-slate-600 text-xs">
            <h4 className="font-extrabold uppercase text-[10px] tracking-wider text-slate-400">Selected Ledger Summary</h4>
            <div className="flex justify-between font-medium">
              <span>Sales Revenue:</span>
              <span className="font-bold text-slate-800">₹{stats.salesRev.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Stock Procurement:</span>
              <span className="font-bold text-slate-800">₹{stats.purchaseExp.toFixed(0)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Operations Cost:</span>
              <span className="font-bold text-slate-800">₹{stats.operationalExp.toFixed(0)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Financial KPIs Cards Grid */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Revenue */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Income</span>
              <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-black text-slate-900 font-mono">
                ₹{stats.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Includes custom & direct farm sales.</p>
            </div>
          </div>

          {/* Expenses */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Outgoings</span>
              <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
                <TrendingDown className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-black text-slate-900 font-mono">
                ₹{stats.totalExpense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Stock purchase and operations cost.</p>
            </div>
          </div>

          {/* Net Profit */}
          <div className={`border rounded-2xl p-4 flex flex-col justify-between shadow-xs ${
            stats.netProfit >= 0 ? 'bg-emerald-50/40 border-emerald-100' : 'bg-rose-50/40 border-rose-100'
          }`}>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Net Profit</span>
              <span className={`p-1.5 rounded-lg text-xs font-black ${
                stats.netProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                ₹
              </span>
            </div>
            <div className="mt-4">
              <h3 className={`text-xl font-black font-mono ${
                stats.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {stats.netProfit < 0 ? '-' : ''}₹{Math.abs(stats.netProfit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Net profit after all costs deducted.</p>
            </div>
          </div>

          {/* Gross Margin % */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Net Profit Margin</span>
              <span className="text-xs font-black text-slate-500">%</span>
            </div>
            <div className="mt-4">
              <h3 className="text-xl font-black text-slate-900 font-mono">
                {stats.grossMargin.toFixed(1)}%
              </h3>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${stats.grossMargin >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ width: `${Math.max(0, Math.min(100, stats.grossMargin))}%` }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Unified Accounts Ledger table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        
        {/* Ledger Toolbar Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-700">Accounts Ledger Ledger Entries</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Type */}
            <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
              {(['all', 'Revenue', 'Expense'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1 text-[10px] font-black rounded-md uppercase transition-colors cursor-pointer ${
                    filterType === t 
                      ? 'bg-slate-900 text-white' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t === 'all' ? 'All' : t}
                </button>
              ))}
            </div>

            {/* Filter Category */}
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="all">ALL CATEGORIES</option>
              <option value="Sales">Sales Revenue</option>
              <option value="Purchase">Stock Purchases</option>
              <option value="Rent">Rent</option>
              <option value="Electricity">Electricity</option>
              <option value="Wages">Wages</option>
              <option value="Other Expense">Other Expense</option>
              <option value="Other Revenue">Other Revenue</option>
            </select>
          </div>
        </div>

        {/* Transactions Ledger Table / List */}
        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {filteredTransactions.map((tx) => {
            const isManual = tx.id.startsWith('acc-');
            return (
              <div 
                key={tx.id} 
                className="p-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between gap-4 text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/50 flex items-center justify-center shrink-0">
                    {getCategoryIcon(tx.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-slate-800 truncate">{tx.description}</p>
                      <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        tx.type === 'Revenue' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {tx.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-1">
                      <span className="flex items-center gap-0.5">
                        <Building className="h-3 w-3" />
                        {getStoreName(tx.storeId)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(tx.entryDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </span>
                      {isManual && (
                        <>
                          <span>•</span>
                          <span className="text-indigo-600 bg-indigo-50 px-1 rounded text-[9px] uppercase tracking-wider font-extrabold">Manual Entry</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 shrink-0">
                  <span className={`text-xs font-black font-mono ${
                    tx.type === 'Revenue' ? 'text-emerald-600' : 'text-slate-700'
                  }`}>
                    {tx.type === 'Revenue' ? '+' : '-'}₹{tx.amount.toFixed(0)}
                  </span>
                  
                  {isManual && role !== 'Employee' && (
                    <button
                      onClick={() => handleDeleteEntry(tx.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded-md hover:bg-slate-100 transition-all cursor-pointer"
                      title="Delete Manual Transaction"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center text-slate-400">
              <FileSpreadsheet className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold">No ledger entries matching the current filter filters.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
