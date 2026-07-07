import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Layers, 
  AlertTriangle, 
  CheckCircle, 
  IndianRupee,
  Package,
  Store as StoreIcon,
  ArrowRight,
  MapPin,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { Store, Sale, Purchase, InventoryItem, TerminalActivityLog, AppNotification } from '../types';
import { FirebaseOrder } from '../lib/firebase';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  subscribeToTransfers, 
  subscribeToWaste, 
  StockTransfer, 
  StockWaste 
} from '../lib/farmersGateDb';

interface DashboardProps {
  stores: Store[];
  sales: Sale[];
  purchases: Purchase[];
  inventory: InventoryItem[];
  role?: string;
  onSelectStore?: (store: Store) => void;
  terminalLogs?: TerminalActivityLog[];
  onClearLogs?: () => void;
  firebaseOrders?: FirebaseOrder[];
  firebaseNotifications?: AppNotification[];
}

export default function Dashboard({
  stores,
  sales,
  purchases,
  inventory,
  role,
  onSelectStore,
  terminalLogs = [],
  onClearLogs,
  firebaseOrders = [],
  firebaseNotifications = []
}: DashboardProps) {
  const [selectedFilterStore, setSelectedFilterStore] = useState<string>('all');
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [wasteLogs, setWasteLogs] = useState<StockWaste[]>([]);
  const isEmployee = role === 'Employee';

  useEffect(() => {
    const unsubTransfers = subscribeToTransfers((data) => setTransfers(data));
    const unsubWaste = subscribeToWaste((data) => setWasteLogs(data));
    return () => {
      unsubTransfers();
      unsubWaste();
    };
  }, []);

  // Filter values based on selected store for metrics
  const filteredSales = selectedFilterStore === 'all' 
    ? sales 
    : sales.filter(s => s.storeId === selectedFilterStore);

  const filteredPurchases = selectedFilterStore === 'all' 
    ? purchases 
    : purchases.filter(p => p.storeId === selectedFilterStore);

  const filteredInventory = selectedFilterStore === 'all' 
    ? inventory 
    : inventory.filter(i => i.storeId === selectedFilterStore);

  // Core simplified metrics
  const totalSalesValue = filteredSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const totalPurchasesValue = filteredPurchases.reduce((acc, curr) => acc + curr.totalCost, 0);
  const profitMargin = totalSalesValue - totalPurchasesValue;

  const lowStockItems = filteredInventory.filter(item => item.quantity > 0 && item.quantity <= item.minStockThreshold);
  const outOfStockItems = filteredInventory.filter(item => item.quantity === 0);

  const activeStores = stores.filter(s => s.isActive);

  // Compile graphical multi-branch comparisons
  const storeComparisonData = activeStores.map(store => {
    // 1. Sales
    const storeSales = sales
      .filter(s => s.storeId === store.id)
      .reduce((sum, s) => sum + s.totalPrice, 0);

    // 2. Procurements
    const storePurchases = purchases
      .filter(p => p.storeId === store.id)
      .reduce((sum, p) => sum + p.totalCost, 0);

    // 3. Waste Spoilage Loss
    const storeWasteLoss = wasteLogs
      .filter(w => w.storeId === store.id)
      .reduce((sum, w) => sum + w.approxValue, 0);

    // 4. Outgoing & Incoming Transfers Count
    const outgoingTransfers = transfers.filter(t => t.senderStoreId === store.id && t.status === 'Approved').length;
    const incomingTransfers = transfers.filter(t => t.receiverStoreId === store.id && t.status === 'Approved').length;

    return {
      name: store.name.replace("Farmer's Gate - ", ""),
      sales: storeSales,
      procurements: storePurchases,
      wasteLoss: storeWasteLoss,
      outgoingTransfers,
      incomingTransfers,
    };
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-900">
      
      {/* Title & Role Info */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Farmer's Gate Portal</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Select a store branch below to log in and manage crop inventory, log sales, and run POS billing.
          </p>
        </div>

        {/* Simplified Store Metric Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Metrics Scope:</span>
          <select
            id="store-filter"
            value={selectedFilterStore}
            onChange={(e) => setSelectedFilterStore(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 shadow-sm focus:border-emerald-500 focus:outline-none cursor-pointer"
          >
            <option value="all">All Stores (Consolidated)</option>
            {activeStores.map(store => (
              <option key={store.id} value={store.id}>{store.name.replace("Farmer's Gate - ", "")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. STORE BRANCH LOGIN PORTAL (CRITICAL USER REQUEST) */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-emerald-50 text-emerald-700">
            <StoreIcon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Select Branch to Log In</h3>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {activeStores.map(store => {
            const storeInventoryCount = inventory.filter(i => i.storeId === store.id).length;
            const storeTodaySales = sales
              .filter(s => s.storeId === store.id)
              .reduce((sum, s) => sum + s.totalPrice, 0);

            return (
              <button
                key={store.id}
                type="button"
                onClick={() => onSelectStore?.(store)}
                className="group relative text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-emerald-500 hover:shadow-md transition-all duration-300 flex flex-col justify-between h-44 cursor-pointer"
              >
                {/* Active Tag */}
                <span className="absolute top-4 right-4 flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online
                </span>

                <div className="space-y-2">
                  <h4 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {store.name.replace("Farmer's Gate - ", "")}
                  </h4>
                  
                  <div className="space-y-1 text-slate-500 text-xs font-medium">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      <span>{store.location}</span>
                    </p>
                    {store.whatsappNumber && (
                      <p className="flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{store.whatsappNumber}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-3 w-full">
                  <div className="text-[10px] text-slate-400">
                    <span className="font-extrabold text-slate-700">{storeInventoryCount}</span> Crops Stocked
                    {storeTodaySales > 0 && (
                      <p className="text-emerald-600 font-extrabold mt-0.5">₹{storeTodaySales.toFixed(0)} Today</p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-black uppercase text-emerald-600 group-hover:translate-x-1 transition-transform">
                    LOG IN <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}

          {activeStores.length === 0 && (
            <div className="col-span-full py-12 text-center bg-white border border-slate-200 border-dashed rounded-2xl p-6">
              <StoreIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-extrabold text-slate-800">No active branches found</p>
              <p className="text-xs text-slate-500 mt-1">Please register a new branch in Global Settings to enable logging in.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. CORE CONSOLIDATED METRICS */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        
        {/* Today's Sales */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Sales Income</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-lg font-black text-slate-950 mt-2">
            ₹{totalSalesValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <span className="text-[9px] text-slate-400 font-bold mt-1 block">Invoiced turnover</span>
        </div>

        {/* Expenses / Purchases */}
        {!isEmployee && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Procurements</span>
              <ShoppingBag className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-lg font-black text-slate-950 mt-2">
              ₹{totalPurchasesValue.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <span className="text-[9px] text-slate-400 font-bold mt-1 block">Stock purchase cost</span>
          </div>
        )}

        {/* Active Outlets */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Active Outlets</span>
            <StoreIcon className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-lg font-black text-slate-950 mt-2">
            {activeStores.length} Branches
          </p>
          <span className="text-[9px] text-slate-400 font-bold mt-1 block">With active billing terminals</span>
        </div>

        {/* Stock Alerts count */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Stock Alerts</span>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-lg font-black text-amber-600 mt-2">
            {lowStockItems.length + outOfStockItems.length} Warnings
          </p>
          <span className="text-[9px] text-slate-400 font-bold mt-1 block">Crops below min levels</span>
        </div>

      </div>

      {/* 3. SIMPLIFIED STOCK ALERT LIST (CLEANED MAIN SCREEN) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Crop Stock Shortages & Replenishment Need
            </h3>
            <p className="text-[11px] text-slate-500">Crops that are out-of-stock or need refilling across location ledger systems.</p>
          </div>
          <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-black text-amber-700">
            {lowStockItems.length + outOfStockItems.length} Critical
          </span>
        </div>

        <div className="grid gap-3.5 grid-cols-1 md:grid-cols-2">
          {outOfStockItems.map(item => {
            const storeName = stores.find(s => s.id === item.storeId)?.name.replace("Farmer's Gate - ", "") || 'Store';
            return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-red-200 bg-red-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-sm font-bold">
                    ⚠️
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{item.vegetableName}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">{storeName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-red-100 text-red-700 text-[8px] font-black px-1.5 py-0.5 uppercase">DEPLETED</span>
                  <p className="text-[10px] font-black text-slate-600 mt-1">0 kg in stock</p>
                </div>
              </div>
            );
          })}

          {lowStockItems.map(item => {
            const storeName = stores.find(s => s.id === item.storeId)?.name.replace("Farmer's Gate - ", "") || 'Store';
            return (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-200 bg-amber-50/20">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-bold">
                    📉
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">{item.vegetableName}</h4>
                    <p className="text-[10px] text-slate-500 font-bold">{storeName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-block rounded bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 uppercase">LOW STOCK</span>
                  <p className="text-[10px] font-black text-slate-600 mt-1">{item.quantity.toFixed(1)} kg left</p>
                </div>
              </div>
            );
          })}

          {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
            <div className="col-span-full py-10 text-center text-slate-400">
              <CheckCircle className="h-6 w-6 text-emerald-500 mx-auto mb-2 animate-pulse" />
              <p className="text-xs font-black text-slate-800">All registered crops are fully and optimally stocked!</p>
              <p className="text-[10px] text-slate-500">No alert warnings currently registered.</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. CONSOLIDATED ANALYTICS GRAPHICAL CHARTS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <span>📊</span>
              FarmersGate Multi-Branch Performance & Logistics Comparison
            </h3>
            <p className="text-[11px] text-slate-500 font-bold">Real-time graphic visualizations of revenue, inventory loss, and logistics transfers.</p>
          </div>
          <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            Real-time charts
          </span>
        </div>

        {/* Recharts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Chart 1: Revenue vs Cost */}
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>💰</span> Sales vs Procurement Cost
            </h4>
            <div className="h-60 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storeComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} fontWeight="bold" />
                  <YAxis stroke="#64748b" fontSize={9} fontWeight="bold" />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                  <Bar dataKey="sales" name="Sales Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="procurements" name="Procurement" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Spoilage / Waste Loss */}
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🗑️</span> Waste/Spoilage Loss Value
            </h4>
            <div className="h-60 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storeComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} fontWeight="bold" />
                  <YAxis stroke="#64748b" fontSize={9} fontWeight="bold" />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString()}`} />
                  <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                  <Bar dataKey="wasteLoss" name="Spoilage Loss (₹)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Stock Transfers count */}
          <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-3">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🚚</span> Logistics Transfers (Out vs In)
            </h4>
            <div className="h-60 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={storeComparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={9} fontWeight="bold" />
                  <YAxis stroke="#64748b" fontSize={9} fontWeight="bold" />
                  <Tooltip formatter={(value) => `${value} transfers`} />
                  <Legend wrapperStyle={{ fontSize: 9, fontWeight: 'bold' }} />
                  <Bar dataKey="outgoingTransfers" name="Sent Out" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="incomingTransfers" name="Received In" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>

      {/* 5. REAL-TIME ACTIVITY FEED & SECURE TERMINAL AUDIT LOGS */}
      {role === 'Admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* REAL-TIME ACTIVITY FEED FROM FIREBASE */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Firebase Real-Time Corporate Activity Feed
                </h3>
                <p className="text-[11px] text-slate-500">Live order confirmations, inventory modifications, and branch alerts.</p>
              </div>
              <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100">
                ● LIVE BROADCAST
              </span>
            </div>

            {/* Scrolling List container */}
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 flex-1">
              {/* Combine notifications and orders into a unified stream sorted by timestamp */}
              {(() => {
                const stream: Array<{
                  id: string;
                  type: 'order' | 'notification';
                  title: string;
                  message: string;
                  timestamp: string;
                  severity: 'info' | 'warning' | 'error' | 'success';
                  badge?: string;
                }> = [];

                // Add firebaseOrders to stream
                firebaseOrders.forEach(order => {
                  stream.push({
                    id: order.id || `order-${order.orderNumber}`,
                    type: 'order',
                    title: `Order placed: #${order.orderNumber}`,
                    message: `Customer ${order.customerName} ordered ${order.items.length} items (Total ₹${order.totalAmount}). Status is currently "${order.status}".`,
                    timestamp: order.orderDate,
                    severity: order.status === 'Cancelled' ? 'error' : order.status === 'Delivered' ? 'success' : 'info',
                    badge: `₹${order.totalAmount}`
                  });
                });

                // Add firebaseNotifications to stream
                firebaseNotifications.forEach(notif => {
                  stream.push({
                    id: notif.id,
                    type: 'notification',
                    title: notif.title,
                    message: notif.message,
                    timestamp: notif.timestamp,
                    severity: notif.severity,
                    badge: notif.type.replace('_', ' ').toUpperCase()
                  });
                });

                // Sort descending
                const sortedStream = stream.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

                if (sortedStream.length === 0) {
                  return (
                    <div className="h-full py-20 text-center text-slate-400 italic">
                      <span className="text-xl block mb-1">📡</span>
                      No real-time activities logged in Firebase database yet.
                    </div>
                  );
                }

                return sortedStream.slice(0, 15).map(event => {
                  let severityClasses = 'bg-slate-50 border-slate-150 text-slate-700';
                  let icon = '📢';

                  if (event.severity === 'success') {
                    severityClasses = 'bg-emerald-50 border-emerald-100 text-emerald-800';
                    icon = '✅';
                  } else if (event.severity === 'warning') {
                    severityClasses = 'bg-amber-50 border-amber-100 text-amber-850';
                    icon = '⚠️';
                  } else if (event.severity === 'error') {
                    severityClasses = 'bg-rose-50 border-rose-100 text-rose-800';
                    icon = '🚨';
                  } else if (event.severity === 'info') {
                    severityClasses = 'bg-blue-50 border-blue-100 text-blue-800';
                    icon = 'ℹ️';
                  }

                  return (
                    <div key={event.id} className={`p-3 rounded-xl border text-xs font-medium leading-relaxed flex flex-col justify-between gap-1.5 transition-all hover:shadow-xs ${severityClasses}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span>{icon}</span>
                          <span>{event.title}</span>
                        </div>
                        {event.badge && (
                          <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-white border border-current shadow-3xs uppercase shrink-0">
                            {event.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] opacity-90">{event.message}</p>
                      <div className="flex items-center justify-between text-[9px] opacity-70 font-mono mt-0.5">
                        <span>{new Date(event.timestamp).toLocaleTimeString('en-IN', { hour12: true })}</span>
                        <span>{new Date(event.timestamp).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* SECURE TERMINAL AUDIT LOGS */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <span className="p-1 rounded bg-slate-100 text-slate-800 text-xs">🔒</span>
                  Farmer's Gate Terminal Audit Logs
                </h3>
                <p className="text-[11px] text-slate-500">Real-time audit track of admin and store manager logins & logouts.</p>
              </div>
              {terminalLogs.length > 0 && onClearLogs && (
                <button
                  onClick={onClearLogs}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 px-2.5 py-1 rounded-lg border border-rose-100 transition-colors cursor-pointer text-center shrink-0 self-start sm:self-auto"
                >
                  Clear Logs
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-150 flex-1 max-h-[350px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-500 tracking-wider sticky top-0 z-10">
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Branch / Portal</th>
                    <th className="p-2.5 text-right">Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {terminalLogs.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-6 text-center text-slate-400 italic">
                        No logins or logouts recorded.
                      </td>
                    </tr>
                  ) : (
                    terminalLogs.slice(0, 10).map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-2.5 font-mono text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour12: true })}
                        </td>
                        <td className="p-2.5 text-slate-800 font-bold">{log.terminalName}</td>
                        <td className="p-2.5 text-right">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider ${
                              log.action === 'login'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
