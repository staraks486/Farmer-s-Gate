import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WifiOff, Download, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useData } from '../contexts/DataContext';

export const OfflineRecoveryModal: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showModal, setShowModal] = useState(false);
  const data = useData();

  useEffect(() => {
    let offlineTimeout: NodeJS.Timeout;

    const handleOnline = () => {
      clearTimeout(offlineTimeout);
      setIsOffline(false);
      setShowModal(false);
    };

    const handleOffline = () => {
      offlineTimeout = setTimeout(() => {
        setIsOffline(true);
        setShowModal(true);
      }, 1500); // 1.5s delay to prevent blips on load
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleExportData = () => {
    const exportPayload = {
      timestamp: new Date().toISOString(),
      app: "Farmer's Gate Branch Ledger",
      version: "v2.3.0",
      data: {
        stores: data.stores,
        inventory: data.inventory,
        sales: data.sales,
        bills: data.bills,
        purchases: data.purchases,
        requirements: data.requirements,
        suppliers: data.suppliers,
        purchaseOrders: data.purchaseOrders,
        customerOrders: data.customerOrders,
        masterCrops: data.masterCrops,
        staff: data.staff,
        attendance: data.attendance,
        officials: data.officials,
        promos: data.promos,
        milkCustomers: data.milkCustomers,
        notifications: data.notifications,
        settings: data.cpanelSettings
      }
    };

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `farmers-gate-offline-backup-${new Date().getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <AnimatePresence>
      {showModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-3xl ${isOffline ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {isOffline ? <WifiOff className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8 animate-pulse" />}
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {isOffline ? 'Connection Lost' : 'Connection Restored'}
                </h2>
                <p className="text-slate-500 font-medium leading-relaxed">
                  {isOffline 
                    ? "Your device is currently offline. Don't worry—you can continue working. To ensure absolute data safety, you can export a local backup of your current session's data."
                    : "You are back online. Any pending changes will now synchronize with the central cloud database automatically."}
                </p>
              </div>

              {isOffline && (
                <div className="mt-8 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 font-bold uppercase tracking-wider">
                    Recommended: Export data if you plan to clear your browser cache or switch devices before reconnecting.
                  </p>
                </div>
              )}

              <div className="mt-8 grid grid-cols-1 gap-3">
                {isOffline && (
                  <button
                    onClick={handleExportData}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 px-6 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 shadow-xl shadow-slate-900/20"
                  >
                    <Download className="h-5 w-5" />
                    Export Session JSON
                  </button>
                )}
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full bg-white border-2 border-slate-100 hover:border-slate-200 text-slate-600 font-black py-4 px-6 rounded-2xl transition-all"
                >
                  {isOffline ? 'Continue Offline' : 'Dismiss'}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${isOffline ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                {isOffline ? 'Offline Mode Active' : 'System Synchronized'}
              </span>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Data Resilience Engine v2.3.0
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
