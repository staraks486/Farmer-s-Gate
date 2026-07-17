import React, { useState, useEffect } from 'react';
import { onSnapshotsInSync, clearIndexedDbPersistence } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Activity, Wifi, WifiOff, RefreshCw, HardDriveDownload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const SystemHealthIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(new Date());
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor Firestore Sync Status
    const unsubscribeSync = onSnapshotsInSync(db, () => {
      setIsSyncing(false);
      setLastSync(new Date());
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeSync();
    };
  }, []);

  const handleClearCache = async () => {
    if (confirm("Are you sure you want to clear the local browser cache? This will fix stale data issues but will require a full reload.")) {
      setIsClearing(true);
      try {
        await clearIndexedDbPersistence(db);
      } catch (err) {
        console.warn('Failed to clear IndexedDB persistence. It might be in use or unavailable.', err);
      }
      
      // Clear localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('fg_')) {
          localStorage.removeItem(key);
        }
      });
      
      window.location.reload();
    }
  };

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-xl backdrop-blur-sm shadow-inner">
      <div className="flex flex-col items-start leading-tight">
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">System Health</span>
        <div className="flex items-center gap-1.5">
          <AnimatePresence mode="wait">
            {isOnline ? (
              <motion.div
                key="online"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1"
              >
                <div className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tight">Online</span>
              </motion.div>
            ) : (
              <motion.div
                key="reconnecting"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-2 w-2 text-amber-400 animate-spin" />
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-tight">Reconnecting</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      <div className="h-6 w-px bg-slate-700/50 mx-1" />
      
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 italic">Latency</span>
          <span className="text-[10px] font-mono font-bold text-slate-300">
            {isOnline ? 'Active' : 'Offline'}
          </span>
        </div>
        <div className={`p-1 rounded-lg ${isOnline ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
          <Activity className="h-3 w-3" />
        </div>
      </div>

      <div className="h-6 w-px bg-slate-700/50 mx-1" />

      <button
        onClick={handleClearCache}
        disabled={isClearing}
        title="Clear Cache & Fix Sync"
        className="flex items-center gap-1.5 px-2 py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 rounded text-slate-300 transition-colors"
      >
        <HardDriveDownload className={`h-3 w-3 ${isClearing ? 'animate-bounce text-amber-400' : ''}`} />
        <span className="text-[9px] font-bold uppercase tracking-wider">{isClearing ? 'Clearing...' : 'Fix Sync'}</span>
      </button>
    </div>
  );
};
