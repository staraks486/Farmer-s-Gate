import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Check, 
  Copy, 
  CheckSquare, 
  Database, 
  Store as StoreIcon, 
  ExternalLink, 
  RefreshCw, 
  PhoneCall, 
  Users, 
  Info,
  Layers,
  MapPin
} from 'lucide-react';
import { Store, Requirement, SupabaseConfig, ConsolidatedRequirement } from '../types';
import { getSupabaseSQLSchema } from '../lib/supabase';

interface AdminPanelProps {
  stores: Store[];
  requirements: Requirement[];
  dbConfig: SupabaseConfig;
  onAddStore: (store: Store) => void;
  onUpdateStore: (store: Store) => void;
  onDeleteStore: (id: string) => void;
  onUpdateRequirementStatus: (id: string, status: 'Pending' | 'Ordered' | 'Fulfilled') => void;
  onDeleteRequirement: (id: string) => void;
  onSaveDbConfig: (url: string, key: string) => Promise<{ success: boolean; message: string }>;
}

export default function AdminPanel({
  stores,
  requirements,
  dbConfig,
  onAddStore,
  onUpdateStore,
  onDeleteStore,
  onUpdateRequirementStatus,
  onDeleteRequirement,
  onSaveDbConfig
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'stores' | 'supabase'>('stores');

  // Store Form State
  const [storeFormOpen, setStoreFormOpen] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [storeLocation, setStoreLocation] = useState('');
  const [storeWhatsapp, setStoreWhatsapp] = useState('');
  const [storePassword, setStorePassword] = useState('');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  // Supabase Connection State
  const [supabaseUrl, setSupabaseUrl] = useState(dbConfig.supabaseUrl);
  const [supabaseKey, setSupabaseKey] = useState(dbConfig.supabaseAnonKey);
  const [dbStatusMsg, setDbStatusMsg] = useState<{ type: 'success' | 'error' | 'info' | null; text: string }>({
    type: dbConfig.isConnected ? 'success' : 'info',
    text: dbConfig.isConnected 
      ? 'Currently connected to your live Supabase Postgres database.' 
      : 'Using localized state fallback. Connect your Supabase instance below.'
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedOrderText, setCopiedOrderText] = useState(false);

  // Group and Consolidate Requirements from all stores
  const getConsolidatedRequirements = (): ConsolidatedRequirement[] => {
    const grouped: { [key: string]: { totalQty: number; breakdowns: any[] } } = {};

    requirements.forEach(req => {
      // Skip fulfilled requirements in consolidation
      if (req.status === 'Fulfilled') return;

      const veg = req.vegetableName;
      if (!grouped[veg]) {
        grouped[veg] = { totalQty: 0, breakdowns: [] };
      }

      grouped[veg].totalQty += req.quantity;
      
      const storeObj = stores.find(s => s.id === req.storeId);
      grouped[veg].breakdowns.push({
        storeName: storeObj ? storeObj.name.replace("Farmer's Gate - ", "") : 'Unknown Outlet',
        quantity: req.quantity,
        status: req.status,
        requirementId: req.id
      });
    });

    return Object.keys(grouped).map(vegName => ({
      vegetableName: vegName,
      totalQuantity: grouped[vegName].totalQty,
      storesBreakdown: grouped[vegName].breakdowns
    })).sort((a, b) => b.totalQuantity - a.totalQuantity);
  };

  const consolidatedReqs = getConsolidatedRequirements();

  // Create WhatsApp message for consolidated wholesale order
  const getConsolidatedWholesaleMessage = (): string => {
    let msg = `*FARMER'S GATE - WHOLESALE CONSOLIDATED ORDER*\n`;
    msg += `Date: ${new Date().toLocaleDateString()}\n`;
    msg += `------------------------------------\n\n`;
    
    consolidatedReqs.forEach(req => {
      msg += `• *${req.vegetableName}*: Total ${req.totalQuantity} kg\n`;
      req.storesBreakdown.forEach(b => {
        msg += `   └ ${b.storeName}: ${b.quantity} kg (${b.status})\n`;
      });
      msg += `\n`;
    });

    msg += `Please confirm pricing and delivery schedule. Thanks!`;
    return encodeURIComponent(msg);
  };

  const copyConsolidatedToClipboard = () => {
    let text = `FARMER'S GATE - CONSOLIDATED ORDER MANIFEST\n`;
    text += `Generated: ${new Date().toLocaleString()}\n`;
    text += `====================================\n\n`;
    
    consolidatedReqs.forEach(req => {
      text += `• ${req.vegetableName}: Total ${req.totalQuantity} kg\n`;
      req.storesBreakdown.forEach(b => {
        text += `   - ${b.storeName}: ${b.quantity} kg [${b.status}]\n`;
      });
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedOrderText(true);
    setTimeout(() => setCopiedOrderText(false), 2000);
  };

  // Handle Save Store Form
  const handleSaveStore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;

    if (editingStoreId) {
      const match = stores.find(s => s.id === editingStoreId);
      if (match) {
        onUpdateStore({
          ...match,
          name: storeName,
          location: storeLocation,
          whatsappNumber: storeWhatsapp,
          password: storePassword || undefined
        });
      }
    } else {
      const newStore: Store = {
        id: `store-${Date.now()}`,
        name: storeName.startsWith("Farmer's Gate - ") ? storeName : `Farmer's Gate - ${storeName}`,
        location: storeLocation,
        whatsappNumber: storeWhatsapp.replace(/[^\d+]/g, ''), // clean phone input
        isActive: true,
        createdAt: new Date().toISOString(),
        password: storePassword || undefined
      };
      onAddStore(newStore);
    }

    // Reset Form
    setStoreName('');
    setStoreLocation('');
    setStoreWhatsapp('');
    setStorePassword('');
    setEditingStoreId(null);
    setStoreFormOpen(false);
  };

  const handleEditStoreClick = (store: Store) => {
    setEditingStoreId(store.id);
    setStoreName(store.name.replace("Farmer's Gate - ", ""));
    setStoreLocation(store.location);
    setStoreWhatsapp(store.whatsappNumber);
    setStorePassword(store.password || '');
    setStoreFormOpen(true);
  };

  // Handle Supabase Submit
  const handleConnectSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingConnection(true);
    setDbStatusMsg({ type: 'info', text: 'Establishing link with Supabase project...' });

    const result = await onSaveDbConfig(supabaseUrl, supabaseKey);
    setTestingConnection(false);
    
    if (result.success) {
      setDbStatusMsg({ type: 'success', text: result.message });
    } else {
      setDbStatusMsg({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Administrator Panel</h2>
        <p className="text-zinc-500 text-sm">Control multi-outlet configurations, unified procurement, and external integrations.</p>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-zinc-200">
        <div className="flex gap-6">
          <button
            id="tab-stores"
            onClick={() => setActiveTab('stores')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'stores'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <StoreIcon className="h-4 w-4" />
              Manage Outlets ({stores.length})
            </span>
          </button>

          <button
            id="tab-supabase"
            onClick={() => setActiveTab('supabase')}
            className={`pb-4 text-sm font-semibold border-b-2 transition-all ${
              activeTab === 'supabase'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Database className="h-4 w-4" />
              Supabase Database Settings
            </span>
          </button>
        </div>
      </div>

      {/* TAB CONTENT: STORES */}
      {activeTab === 'stores' && (
        <div className="space-y-6">
          {/* Header Action */}
          <div className="flex items-center justify-between bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
            <div>
              <h3 className="font-bold text-zinc-900">Crop Outlets</h3>
              <p className="text-xs text-zinc-500">Configure retail branches, manage manager phone numbers, and check status.</p>
            </div>
            <button
              onClick={() => {
                setEditingStoreId(null);
                setStoreName('');
                setStoreLocation('');
                setStoreWhatsapp('');
                setStorePassword('');
                setStoreFormOpen(!storeFormOpen);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-200 hover:bg-emerald-700 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              {storeFormOpen ? 'Collapse' : 'Add Store'}
            </button>
          </div>

          {/* Store Creation Form */}
          {storeFormOpen && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm max-w-xl animate-fade-in">
              <h4 className="font-bold text-zinc-800 border-b border-zinc-100 pb-2 mb-4">
                {editingStoreId ? 'Edit Store Details' : 'Register New Farmer\'s Gate Branch'}
              </h4>
              <form onSubmit={handleSaveStore} className="space-y-4">
                <div>
                  <label htmlFor="store-name-input" className="block text-xs font-bold text-zinc-600 uppercase tracking-wide mb-1">Store Name *</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-xs font-semibold text-zinc-400">
                      Farmer's Gate -
                    </span>
                    <input
                      id="store-name-input"
                      type="text"
                      required
                      placeholder="Downtown, Valley Plaza, West Coast..."
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 py-2 pl-[110px] pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-zinc-800"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="store-loc-input" className="block text-xs font-bold text-zinc-600 uppercase tracking-wide mb-1">Store Location Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      id="store-loc-input"
                      type="text"
                      placeholder="e.g. 45 Market St, City Center"
                      value={storeLocation}
                      onChange={(e) => setStoreLocation(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="store-phone-input" className="block text-xs font-bold text-zinc-600 uppercase tracking-wide mb-1">Manager WhatsApp Number *</label>
                  <div className="relative">
                    <PhoneCall className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <input
                      id="store-phone-input"
                      type="tel"
                      required
                      placeholder="e.g. 15550192834 (Country Code + Number)"
                      value={storeWhatsapp}
                      onChange={(e) => setStoreWhatsapp(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">Specify numeric phone string with country code (no '+' or spacing) to enable dynamic Whatsapp order messaging.</span>
                </div>

                <div>
                  <label htmlFor="store-password-input" className="block text-xs font-bold text-zinc-600 uppercase tracking-wide mb-1">Store Access Password (Optional)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-zinc-400">🔒</span>
                    <input
                      id="store-password-input"
                      type="password"
                      placeholder="Enter a secret password to lock this outlet"
                      value={storePassword}
                      onChange={(e) => setStorePassword(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 font-semibold"
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 mt-1 block">If configured, store managers and employees will be prompted to enter this password to gain access to POS and inventory functions.</span>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setStoreFormOpen(false)}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-100"
                  >
                    {editingStoreId ? 'Apply Changes' : 'Register Store'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Stores Grid */}
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {stores.map(store => (
              <div 
                key={store.id} 
                className={`rounded-2xl border p-5 bg-white shadow-sm flex flex-col justify-between transition-all ${
                  store.isActive ? 'border-zinc-200' : 'border-zinc-100 bg-zinc-50/50 opacity-60'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                        <StoreIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900">{store.name}</h4>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold ${
                            store.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                          }`}>
                            {store.isActive ? 'Active Store' : 'Inactive'}
                          </span>
                          {store.password && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 rounded px-1.5 py-0.5 text-[9px] font-black">
                              🔒 LOCK: {store.password}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2 border-t border-zinc-100 pt-3">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                      <span>{store.location || 'No location configured'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <PhoneCall className="h-3.5 w-3.5 text-zinc-400" />
                      <span>WhatsApp: <strong className="text-zinc-700">+{store.whatsappNumber}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end gap-2 border-t border-zinc-100 pt-3">
                  <button
                    onClick={() => {
                      onUpdateStore({
                        ...store,
                        isActive: !store.isActive
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      store.isActive 
                        ? 'text-amber-600 hover:bg-amber-50' 
                        : 'text-emerald-600 hover:bg-emerald-50'
                    }`}
                  >
                    {store.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleEditStoreClick(store)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if(confirm(`Are you sure you want to delete ${store.name}?`)) {
                        onDeleteStore(store.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                    title="Delete Store"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {stores.length === 0 && (
              <div className="md:col-span-2 py-16 border-2 border-dashed border-zinc-200 rounded-2xl text-center text-zinc-400">
                <StoreIcon className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">No active stores registered</p>
                <p className="text-xs text-zinc-500 mt-1">Register your first branch outlet above to start trading!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SUPABASE DATABASE SETTINGS */}
      {activeTab === 'supabase' && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          
          {/* Left/Middle Column: Connection form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-lg">Supabase Cloud Integration</h3>
                  <p className="text-xs text-zinc-500">Enable real-time durable database persistence to replace local browser state.</p>
                </div>
              </div>

              {/* Status Message */}
              <div className={`p-4 rounded-xl border flex items-start gap-2.5 mb-6 text-sm font-medium ${
                dbStatusMsg.type === 'success' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : dbStatusMsg.type === 'error' 
                  ? 'bg-red-50 border-red-200 text-red-800' 
                  : 'bg-zinc-50 border-zinc-200 text-zinc-600'
              }`}>
                <Info className={`h-5 w-5 shrink-0 ${
                  dbStatusMsg.type === 'success' ? 'text-emerald-500' : dbStatusMsg.type === 'error' ? 'text-red-500' : 'text-zinc-400'
                }`} />
                <div>{dbStatusMsg.text}</div>
              </div>

              {/* Credentials Form */}
              <form onSubmit={handleConnectSupabase} className="space-y-4">
                <div>
                  <label htmlFor="supa-url-input" className="block text-xs font-bold text-zinc-600 uppercase tracking-wide mb-1">Supabase API URL *</label>
                  <input
                    id="supa-url-input"
                    type="url"
                    required={!!supabaseKey}
                    placeholder="https://your-project-id.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-zinc-800"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">Copy your Project URL from Settings &gt; API in your Supabase Dashboard.</span>
                </div>

                <div>
                  <label htmlFor="supa-key-input" className="block text-xs font-bold text-zinc-600 uppercase tracking-wide mb-1">Supabase Anon Key *</label>
                  <input
                    id="supa-key-input"
                    type="password"
                    required={!!supabaseUrl}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key-here"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono text-zinc-800"
                  />
                  <span className="text-[10px] text-zinc-400 mt-1 block">Copy your Public Anon Key API parameter from Settings &gt; API.</span>
                </div>

                <div className="flex gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="submit"
                    disabled={testingConnection}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-100 hover:bg-emerald-700 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    {testingConnection ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Save & Connect API'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setSupabaseUrl('');
                      setSupabaseKey('');
                      setTestingConnection(true);
                      const res = await onSaveDbConfig('', '');
                      setTestingConnection(false);
                      setDbStatusMsg({ type: 'info', text: res.message });
                    }}
                    className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50"
                  >
                    Disconnect & Use Local
                  </button>
                </div>
              </form>
            </div>

            {/* SQL Copy Box */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-100">
                <div>
                  <h4 className="font-bold text-zinc-800 text-sm">PostgreSQL Setup Script (DDL)</h4>
                  <p className="text-[11px] text-zinc-400">Paste this script in Supabase's SQL Editor to instantiate schemas.</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getSupabaseSQLSchema());
                    setCopiedSchema(true);
                    setTimeout(() => setCopiedSchema(false), 2000);
                  }}
                  className="flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedSchema ? 'Copied SQL!' : 'Copy Schema SQL'}
                </button>
              </div>
              <pre className="text-[10px] font-mono text-zinc-500 bg-zinc-950 p-4 rounded-xl max-h-[220px] overflow-auto select-all leading-relaxed whitespace-pre scrollbar-thin scrollbar-thumb-zinc-800">
                {getSupabaseSQLSchema()}
              </pre>
            </div>
          </div>

          {/* Right Column: Information/Guidance */}
          <div className="rounded-2xl border border-zinc-200 bg-emerald-50/50 p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-emerald-900 flex items-center gap-1.5">
              <StoreIcon className="h-5 w-5 text-emerald-600" />
              Relational Sync Guidance
            </h4>
            
            <p className="text-xs text-emerald-800 leading-relaxed">
              When Supabase integration is inactive, Farmer's Gate operates perfectly using high-performance <strong>client-side state synchronization</strong>, saving all records locally in your browser cache.
            </p>

            <div className="space-y-3 pt-2 text-xs text-emerald-800 border-t border-emerald-100">
              <h5 className="font-bold text-emerald-900">How to integrate live:</h5>
              <ol className="list-decimal pl-4 space-y-2">
                <li>Create a database project at <a href="https://supabase.com" target="_blank" referrerPolicy="no-referrer" className="underline font-bold text-emerald-700">supabase.com</a> (fully free).</li>
                <li>Go to the <strong>SQL Editor</strong> tab on your Supabase dashboard and click <strong>New Query</strong>.</li>
                <li>Copy the PostgreSQL script shown here, paste it there, and hit <strong>Run</strong>.</li>
                <li>Go to <strong>Project Settings &gt; API</strong>, grab your URL and public Anon Key, and insert them here.</li>
                <li>Click <strong>Connect</strong> and start sharing real-time synchronized data immediately with multiple store devices!</li>
              </ol>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
