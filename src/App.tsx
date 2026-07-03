import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Package, 
  HelpCircle, 
  Sparkles,
  Info,
  Briefcase,
  UserCheck
} from 'lucide-react';
import CustomerHub from './components/CustomerHub';
import PartnerPortal from './components/PartnerPortal';
import ManagementSuite from './components/ManagementSuite';
import { auth, seedProductsIfNeeded } from './lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

export default function App() {
  const [activePortal, setActivePortal] = useState<'customer' | 'partner' | 'management'>('customer');
  const [user, setUser] = useState<FirebaseUser | null>(null);

  // Auto-seed Firestore on app startup
  useEffect(() => {
    seedProductsIfNeeded();
  }, []);

  // Monitor auth state to show role hints or personalized welcome
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      // Auto-switch to partner portal if they log in with the partner demo account
      if (fbUser && fbUser.email === 'partner@farmersgate.com') {
        setActivePortal('partner');
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none antialiased text-slate-800">
      
      {/* Dynamic Portal Selector Rail */}
      <div className="bg-slate-900 text-white py-2 px-4 shadow-md shrink-0 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-emerald-500 text-slate-950 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
              LIVE ECOSYSTEM
            </span>
            <p className="text-[11px] font-semibold text-slate-300">
              FarmersGate Enterprise • Switch perspective instantly:
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 flex-wrap">
            <button 
              onClick={() => setActivePortal('customer')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                activePortal === 'customer' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="h-3 w-3" /> 🛍️ Shopper Store
            </button>
            <button 
              onClick={() => setActivePortal('partner')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                activePortal === 'partner' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Package className="h-3 w-3" /> 📦 Staff Portal
            </button>
            <button 
              onClick={() => setActivePortal('management')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer uppercase flex items-center gap-1 ${
                activePortal === 'management' 
                  ? 'bg-emerald-500 text-slate-950 shadow' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Briefcase className="h-3 w-3" /> 🏢 Management Suite
            </button>
            
            <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block"></div>
            
            <span className="text-[10px] text-emerald-400 font-extrabold tracking-tight uppercase flex items-center gap-1">
              <UserCheck className="h-3 w-3" /> Dev: Arvind Kumar Shukla
            </span>
          </div>
        </div>
      </div>

      {/* Main app viewport with fade transition */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activePortal === 'customer' ? (
            <motion.div
              key="customer-hub"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <CustomerHub />
            </motion.div>
          ) : activePortal === 'partner' ? (
            <motion.div
              key="partner-portal"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <PartnerPortal />
            </motion.div>
          ) : (
            <motion.div
              key="management-suite"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <ManagementSuite />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating interactive hint with developer and version details */}
      <footer className="bg-white border-t border-slate-200/60 py-2.5 px-4 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider gap-2">
          <div className="flex items-center gap-1.5 flex-wrap justify-center text-center">
            <Info className="h-3.5 w-3.5 text-emerald-600 animate-pulse shrink-0" />
            <span>Simulate: Order as Shopper, dispatch in Staff Portal, or track ledger in Management Suite!</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap justify-center text-center">
            <span>Developer: <strong className="text-emerald-700 font-extrabold">Arvind Kumar Shukla</strong></span>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 font-mono text-[9px]">v2.1.2</span>
            <span>© 2026 FarmersGate Tech Inc • Powered by Firebase</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
