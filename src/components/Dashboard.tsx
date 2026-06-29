import React, { useState } from 'react';
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
import { Store, Sale, Purchase, InventoryItem } from '../types';

interface DashboardProps {
  stores: Store[];
  sales: Sale[];
  purchases: Purchase[];
  inventory: InventoryItem[];
  role?: string;
  onSelectStore?: (store: Store) => void;
}

export default function Dashboard({
  stores,
  sales,
  purchases,
  inventory,
  role,
  onSelectStore
}: DashboardProps) {
  const [selectedFilterStore, setSelectedFilterStore] = useState<string>('all');
  const isEmployee = role === 'Employee';

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
            {stores.map(store => (
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

    </div>
  );
}
