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
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onChangeView('dashboard')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
            <StoreIcon className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-zinc-900">Farmer's Gate</h1>
            <p className="text-[10px] font-medium tracking-wider uppercase text-emerald-600">Multi-Store Hub</p>
          </div>
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
          {/* Supabase Status Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-zinc-50 border border-zinc-200 px-3 py-1 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                dbConfig.isConnected ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                dbConfig.isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`}></span>
            </span>
            <span className="font-medium text-zinc-600">
              {dbConfig.isConnected ? 'Connected to Supabase' : 'Offline Mode (Local)'}
            </span>
          </div>

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
