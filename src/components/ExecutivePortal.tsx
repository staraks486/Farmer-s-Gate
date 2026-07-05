import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Package, 
  Clock, 
  ArrowRight, 
  Lock, 
  ShieldAlert, 
  Copy, 
  Check, 
  ExternalLink,
  Store as StoreIcon,
  MapPin,
  Smartphone,
  X,
  RefreshCw,
  Info,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { 
  Store, 
  Sale, 
  Purchase, 
  InventoryItem, 
  AppNotification 
} from '../types';
import { 
  subscribeToOrders, 
  subscribeToNotifications,
  FirebaseOrder
} from '../lib/firebase';
import { 
  dbGetStores, 
  dbGetSales, 
  dbGetPurchases, 
  dbGetInventory,
  dbSyncLocalCache
} from '../lib/supabase';
import Dashboard from './Dashboard';

export default function ExecutivePortal() {
  const [stores, setStores] = useState<Store[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [firebaseOrders, setFirebaseOrders] = useState<FirebaseOrder[]>([]);
  const [firebaseNotifications, setFirebaseNotifications] = useState<AppNotification[]>([]);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedBranchDetail, setSelectedBranchDetail] = useState<Store | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Link copy indicators
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await dbGetStores();
      const sa = await dbGetSales();
      const p = await dbGetPurchases();
      const inv = await dbGetInventory();
      setStores(s);
      setSales(sa);
      setPurchases(p);
      setInventory(inv);
    } catch (err) {
      console.error('Error fetching unauthenticated executive metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const unsubOrders = subscribeToOrders((orders) => {
      setFirebaseOrders(orders);
    });

    const unsubNotifications = subscribeToNotifications((notifs) => {
      setFirebaseNotifications(notifs);
    });

    return () => {
      unsubOrders();
      unsubNotifications();
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await dbSyncLocalCache();
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  };

  const handleCopyLink = (path: string, key: string) => {
    const baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    const fullUrl = `${baseUrl}${path}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedLink(key);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  // Filter store-specific data for the detail modal
  const branchInventory = selectedBranchDetail
    ? inventory.filter(i => i.storeId === selectedBranchDetail.id)
    : [];

  const branchSales = selectedBranchDetail
    ? sales.filter(s => s.storeId === selectedBranchDetail.id)
    : [];

  const branchPurchases = selectedBranchDetail
    ? purchases.filter(p => p.storeId === selectedBranchDetail.id)
    : [];

  const branchSalesTotal = branchSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
  const branchPurchasesTotal = branchPurchases.reduce((acc, curr) => acc + curr.totalCost, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fdfa] p-4 md:p-8 space-y-6">
      
      {/* 1. SEPARATE ENVIRONMENT LINKS DIRECTORY (For Safety Purpose) */}
      <div className="bg-emerald-950 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-emerald-900/40">
        <div className="absolute -right-16 -top-16 text-9xl opacity-5 select-none pointer-events-none">🔐</div>
        
        <div className="max-w-4xl space-y-4 relative z-10">
          <div className="space-y-1.5">
            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
              🛡️ SAFETY DIRECTORY
            </span>
            <h2 className="text-xl font-black uppercase tracking-wider text-emerald-300">
              Isolated Ecosystem Access URLs
            </h2>
            <p className="text-xs text-emerald-100/80 leading-relaxed max-w-2xl">
              To guarantee data isolation and operational safety, distribute these direct links to the respective user groups. Storing separate links ensures shoppers, retail personnel, and corporate executives operate in distinct, sandboxed modules.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3">
            {[
              {
                title: '🛍️ Shopper Store',
                desc: 'Fresh online catalog order booking',
                path: '?portal=customer',
                key: 'customer',
                badge: 'Public'
              },
              {
                title: '📦 Staff Fulfillment',
                desc: 'Dispatch rider & picker interface',
                path: '?portal=partner',
                key: 'partner',
                badge: 'Staff Auth'
              },
              {
                title: '🏪 Store POS Station',
                desc: 'Retail registers, weight billing & checkout',
                path: '?portal=store_pos',
                key: 'store_pos',
                badge: 'Store Auth'
              },
              {
                title: '🏢 Management HQ',
                desc: 'System settings, double ledgers & database DDL',
                path: '?portal=management',
                key: 'management',
                badge: 'Secure Login'
              },
              {
                title: '📡 Executive Live',
                desc: 'Real-time read-only monitoring dashboard',
                path: '?portal=executive',
                key: 'executive',
                badge: 'No Login View'
              }
            ].map((mod) => (
              <div 
                key={mod.key} 
                className="bg-emerald-900/40 border border-emerald-800/60 p-4 rounded-2xl flex flex-col justify-between space-y-3 hover:bg-emerald-900/60 transition-all group"
              >
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-extrabold text-xs text-emerald-200">{mod.title}</h4>
                    <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800/40 text-emerald-400">
                      {mod.badge}
                    </span>
                  </div>
                  <p className="text-[9.5px] text-emerald-200/60 leading-snug font-medium">{mod.desc}</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => handleCopyLink(mod.path, mod.key)}
                  className="w-full mt-2 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  {copiedLink === mod.key ? (
                    <>
                      <Check className="h-3.5 w-3.5 stroke-[3]" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Copy Secure Link
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. EXECUTIVE LIVE HEADER */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-3xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-center text-2xl shadow-3xs animate-pulse">
            📡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Executive Live Activity Station
              </h1>
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                No Login View Active
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">
              Real-time audit log stream, consolidated sales turnover, stock shortages, and interactive store branch monitors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto self-stretch md:self-auto justify-between md:justify-end">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-4 flex items-center gap-2.5 shadow-3xs">
            <Clock className="h-4 w-4 text-emerald-600 animate-pulse" />
            <div className="text-left font-mono">
              <span className="text-xs font-black text-slate-800">{currentTime.toLocaleTimeString()}</span>
              <span className="text-[8px] text-slate-400 font-bold block uppercase tracking-wider mt-0.5">Live UTC Stream</span>
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-slate-700 shadow-3xs cursor-pointer transition flex items-center justify-center gap-1.5 shrink-0"
            title="Refresh statistics"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. INFORMATIVE BANNER ABOUT INTERACTIVE MONITORS */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50/50 border border-emerald-100 p-4.5 rounded-2xl flex items-start gap-3 shadow-3xs">
        <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
            💡 Interactive Store Inspection Mode
          </h4>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            You do not need credentials to monitor the branches. Click any online store branch card inside the section below to open the <strong className="text-emerald-700 font-extrabold">Live Branch Inventory Audit Modal</strong>, detailing specific real-time crop stockpiles, sales margins, and local performance logs without logging in!
          </p>
        </div>
      </div>

      {/* 4. REAL-TIME DATA INJECTED DASHBOARD PANEL */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center bg-white border border-slate-200/80 rounded-3xl">
          <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
          <p className="text-sm font-black text-slate-700 uppercase tracking-wider">Compiling Executive Feed...</p>
          <p className="text-xs text-slate-400 mt-1">Downloading offline-resilient logs & consolidated ledger indices</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-3xs">
          <Dashboard 
            stores={stores}
            sales={sales}
            purchases={purchases}
            inventory={inventory}
            role="Admin"
            onSelectStore={(st) => setSelectedBranchDetail(st)}
            firebaseOrders={firebaseOrders}
            firebaseNotifications={firebaseNotifications}
          />
        </div>
      )}

      {/* 5. INTERACTIVE BRANCH DETAILS MODAL */}
      {selectedBranchDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[85vh] animate-fade-in">
            {/* Header */}
            <div className="bg-emerald-950 text-white p-5 flex justify-between items-center shrink-0 border-b border-emerald-900/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-900 border border-emerald-800 flex items-center justify-center text-lg shadow-sm">
                  🏪
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm uppercase tracking-wide text-emerald-300">
                      {selectedBranchDetail.name.replace("Farmer's Gate - ", "")}
                    </h3>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span className="text-[7.5px] font-black uppercase text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded mt-0.5 border border-emerald-800/40">
                      Live
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-emerald-200/80 font-bold font-mono">
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-2.5 w-2.5 text-emerald-400" />
                      {selectedBranchDetail.location}
                    </span>
                    {selectedBranchDetail.whatsappNumber && (
                      <span className="flex items-center gap-0.5 border-l border-emerald-800 pl-2">
                        <Smartphone className="h-2.5 w-2.5 text-emerald-400" />
                        {selectedBranchDetail.whatsappNumber}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBranchDetail(null)}
                className="p-1.5 rounded-lg bg-emerald-900 hover:bg-emerald-800 transition text-emerald-300 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Branch Quick Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-3xs">
                  <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Total Sales</span>
                  <p className="text-sm font-black text-slate-900 mt-1">₹{branchSalesTotal.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-3xs">
                  <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Procurements</span>
                  <p className="text-sm font-black text-slate-900 mt-1">₹{branchPurchasesTotal.toLocaleString('en-IN')}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-3xs">
                  <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">Crops Stocked</span>
                  <p className="text-sm font-black text-emerald-700 mt-1">{branchInventory.length} Crop Items</p>
                </div>
              </div>

              {/* Crop Stock Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-150 pb-1.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="h-4 w-4 text-emerald-600" />
                    Live Crop Stock levels
                  </h4>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">REAL TIME UPDATES</span>
                </div>

                <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-3xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[9px] uppercase tracking-wider border-b border-slate-150 font-black">
                        <th className="py-2.5 px-4">Crop Name</th>
                        <th className="py-2.5 px-4 text-center">Stock Level</th>
                        <th className="py-2.5 px-4 text-right">Cost Price</th>
                        <th className="py-2.5 px-4 text-right">Selling Price</th>
                        <th className="py-2.5 px-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 font-bold text-slate-700">
                      {branchInventory.map(item => {
                        const isDepleted = item.quantity === 0;
                        const isLow = item.quantity > 0 && item.quantity <= item.minStockThreshold;
                        
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4 text-slate-900">{item.vegetableName}</td>
                            <td className="py-3 px-4 text-center font-mono">{item.quantity.toFixed(1)} kg</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-500">₹{item.costPrice.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-800">₹{item.sellingPrice.toFixed(2)}</td>
                            <td className="py-3 px-4 text-right">
                              {isDepleted ? (
                                <span className="inline-block rounded bg-red-100 border border-red-200 text-red-700 text-[8px] font-black px-2 py-0.5 uppercase">Depleted</span>
                              ) : isLow ? (
                                <span className="inline-block rounded bg-amber-100 border border-amber-200 text-amber-700 text-[8px] font-black px-2 py-0.5 uppercase">Low stock</span>
                              ) : (
                                <span className="inline-block rounded bg-emerald-100 border border-emerald-200 text-emerald-700 text-[8px] font-black px-2 py-0.5 uppercase">Optimal</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {branchInventory.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-400 italic">
                            No crops stocked in this branch's local ledger yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Branch Activity Logs */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-150 pb-1.5">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    Recent sales activities
                  </h4>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">LAST 5 SALES</span>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {branchSales.slice(0, 5).map(sale => (
                    <div key={sale.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="text-lg">💰</div>
                        <div>
                          <h5 className="font-extrabold text-slate-900">Sold {sale.quantity.toFixed(1)} kg of {sale.vegetableName}</h5>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-0.5">
                            Customer: {sale.customerName || 'Walk-in Shopper'} • {new Date(sale.saleDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-slate-900">₹{sale.totalPrice.toFixed(2)}</span>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">₹{sale.pricePerKg}/kg</p>
                      </div>
                    </div>
                  ))}

                  {branchSales.length === 0 && (
                    <div className="py-8 text-center text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs">
                      No sales logged for this branch yet.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedBranchDetail(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
