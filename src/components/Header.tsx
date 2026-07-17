import React from 'react';
import { Store as StoreIcon, Settings, BarChart3, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { Store, SupabaseConfig } from '../types';

interface HeaderProps {
  stores: Store[];
  selectedStore: Store | null;
  onSelectStore: (store: Store | null) => void;
  activeView: 'dashboard' | 'store' | 'admin';
  onChangeView: (view: 'dashboard' | 'store' | 'admin') => void;
  dbConfig: SupabaseConfig;
}

export default function Header({
  stores,
  selectedStore,
  onSelectStore,
  activeView,
  onChangeView,
  dbConfig
}: HeaderProps) {
  const activeStores = stores.filter(s => s.isActive);

  return (
    <header id="app-header" className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onChangeView('dashboard')}>
          <span className="font-extrabold text-xl tracking-tight text-emerald-800 transition-all duration-200 group-hover:scale-98">Farmer's <span className="text-zinc-800 font-black">Gate</span></span>
          <span className="h-6 w-px bg-zinc-200 hidden sm:inline-block"></span>
          <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 hidden sm:inline-block bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/60 shadow-3xs">
            Multi-Store Hub
          </span>
        </div>

        {/* Center: Navigation Options */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            id="nav-dashboard"
            onClick={() => onChangeView('dashboard')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeView === 'dashboard'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Dashboard
          </button>

          <button
            id="nav-store"
            onClick={() => {
              if (selectedStore) {
                onChangeView('store');
              } else if (activeStores.length > 0) {
                onSelectStore(activeStores[0]);
                onChangeView('store');
              } else {
                onChangeView('admin');
              }
            }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeView === 'store'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <StoreIcon className="h-4 w-4 text-emerald-600" />
            Store Management
          </button>

          <button
            id="nav-admin"
            onClick={() => onChangeView('admin')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeView === 'admin'
                ? 'bg-zinc-100 text-zinc-900'
                : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            <Settings className="h-4 w-4 text-emerald-600" />
            Admin Panel
          </button>
        </nav>

        {/* Right: Store Switcher and Status */}
        <div className="flex items-center gap-3">
          {/* Active Store Switcher Dropdown */}
          {activeView === 'store' && selectedStore && (
            <div className="relative group">
              <button className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors">
                <StoreIcon className="h-4 w-4 text-zinc-500" />
                <span className="max-w-[120px] truncate">{selectedStore.name}</span>
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              </button>
              <div className="absolute right-0 mt-1 hidden group-hover:block hover:block min-w-[200px] rounded-xl border border-zinc-100 bg-white p-1 shadow-lg ring-1 ring-black/5 z-50">
                <div className="px-2 py-1.5 text-[10px] font-bold tracking-wide text-zinc-400 uppercase border-b border-zinc-100 mb-1">
                  Switch Store
                </div>
                {activeStores.length === 0 ? (
                  <button 
                    onClick={() => onChangeView('admin')}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-amber-600 hover:bg-amber-50"
                  >
                    + Create a Store
                  </button>
                ) : (
                  activeStores.map(store => (
                    <button
                      key={store.id}
                      onClick={() => {
                        onSelectStore(store);
                        onChangeView('store');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        selectedStore.id === store.id
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      {store.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Simple Mobile Menu Trigger (Fallbacks for visual views) */}
          <div className="flex md:hidden items-center gap-1">
            <button
              onClick={() => onChangeView('dashboard')}
              className={`p-2 rounded-lg ${activeView === 'dashboard' ? 'bg-emerald-50 text-emerald-600' : 'text-zinc-500'}`}
              title="Dashboard"
            >
              <BarChart3 className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                if (selectedStore) {
                  onChangeView('store');
                } else if (activeStores.length > 0) {
                  onSelectStore(activeStores[0]);
                  onChangeView('store');
                } else {
                  onChangeView('admin');
                }
              }}
              className={`p-2 rounded-lg ${activeView === 'store' ? 'bg-emerald-50 text-emerald-600' : 'text-zinc-500'}`}
              title="Stores"
            >
              <StoreIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => onChangeView('admin')}
              className={`p-2 rounded-lg ${activeView === 'admin' ? 'bg-emerald-50 text-emerald-600' : 'text-zinc-500'}`}
              title="Admin Panel"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
