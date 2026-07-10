import React, { useState, useEffect } from 'react';
import { MilkCustomer } from '../types';
import { 
  Users, 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  Phone, 
  MapPin, 
  Sparkles, 
  Filter,
  DollarSign,
  Package,
  Calendar
} from 'lucide-react';

const DEFAULT_MILK_CUSTOMERS: MilkCustomer[] = [
  {
    id: 'milk-1',
    name: 'Gurpreet Singh',
    mobile: '919872543210',
    address: 'House 142, Phase 1, Urban Estate, Patiala, Punjab',
    milkType: 'Cow',
    quantity: 2,
    price: 60,
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'milk-2',
    name: 'Manpreet Kaur',
    mobile: '919463287654',
    address: 'Flat 4B, SST Nagar, Patiala, Punjab',
    milkType: 'Buffalo',
    quantity: 1.5,
    price: 75,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'milk-3',
    name: 'Jaswinder Singh',
    mobile: '919814412345',
    address: 'Sector 2, Model Town, Patiala, Punjab',
    milkType: 'Cow',
    quantity: 1,
    price: 60,
    createdAt: new Date().toISOString()
  }
];

export default function CustomerMilkRegistry() {
  const [customers, setCustomers] = useState<MilkCustomer[]>(() => {
    try {
      const saved = localStorage.getItem('fg_milk_customers');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_MILK_CUSTOMERS;
  });

  useEffect(() => {
    localStorage.setItem('fg_milk_customers', JSON.stringify(customers));
  }, [customers]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Cow' | 'Buffalo'>('All');
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [milkType, setMilkType] = useState<'Cow' | 'Buffalo'>('Cow');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('60');

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setMobile('');
    setAddress('');
    setMilkType('Cow');
    setQuantity('1');
    setPrice('60');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (c: MilkCustomer) => {
    setEditingId(c.id);
    setName(c.name);
    setMobile(c.mobile);
    setAddress(c.address);
    setMilkType(c.milkType);
    setQuantity(c.quantity.toString());
    setPrice(c.price.toString());
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      alert("Name and Mobile Number are required.");
      return;
    }

    const cleanedMobile = mobile.replace(/[^\d]/g, '');

    const customerData: MilkCustomer = {
      id: editingId || `milk-${Date.now()}`,
      name: name.trim(),
      mobile: cleanedMobile,
      address: address.trim(),
      milkType,
      quantity: parseFloat(quantity) || 1,
      price: parseFloat(price) || 60,
      createdAt: editingId 
        ? (customers.find(c => c.id === editingId)?.createdAt || new Date().toISOString())
        : new Date().toISOString()
    };

    if (editingId) {
      setCustomers(prev => prev.map(c => c.id === editingId ? customerData : c));
    } else {
      setCustomers(prev => [customerData, ...prev]);
    }

    setIsFormOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to remove this milk subscriber profile?")) {
      setCustomers(prev => prev.filter(c => c.id !== id));
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        c.mobile.includes(searchQuery) ||
                        c.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === 'All' || c.milkType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Top Banner and Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-emerald-950 text-white rounded-3xl p-6 shadow-sm border border-emerald-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b981_1px,transparent_1px),linear-gradient(to_bottom,#10b981_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-[0.03]" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 bg-emerald-800 text-emerald-300 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-700/50">
            <Sparkles className="h-3 w-3" /> Dairy Subscribers
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight font-sans">Customer Milk Details Registry</h2>
          <p className="text-xs text-emerald-200 max-w-xl">
            Centralized record book for milk subscriptions, quantities, and pricing models compiled across all trading branches.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="relative z-10 inline-flex items-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 text-xs font-black rounded-2xl transition-all shadow-md uppercase cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add Milk Subscriber
        </button>
      </div>

      {/* Grid Layout: Controls & List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form (if open) or Fast Stats */}
        <div className="lg:col-span-4 space-y-6">
          
          {isFormOpen ? (
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                <h3 className="font-extrabold text-sm text-slate-900">
                  {editingId ? 'Edit Subscriber' : 'New Milk Subscriber'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Subscriber Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sardar Harpreet Singh"
                    className="w-full text-xs font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="e.g. 9872543210"
                    className="w-full text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Home Address</label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter complete home delivery address details"
                    rows={2}
                    className="w-full text-xs font-semibold rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Milk Option</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMilkType('Cow')}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        milkType === 'Cow'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      🐄 Cow Milk
                    </button>
                    <button
                      type="button"
                      onClick={() => setMilkType('Buffalo')}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                        milkType === 'Buffalo'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      🐃 Buffalo Milk
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Quantity (Liters)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="w-full text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none bg-slate-50/50 text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Rate (₹ / Liter)</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full text-xs font-mono font-bold rounded-xl border border-slate-200 p-2.5 focus:outline-none bg-slate-50/50 text-center"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-3 rounded-xl transition-all uppercase tracking-wide mt-2 cursor-pointer"
              >
                {editingId ? 'Update Subscription' : 'Create Subscription'}
              </button>
            </form>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-150 pb-3">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h3 className="font-extrabold text-xs text-slate-900 uppercase">Subscribers Summary</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Total Active</span>
                  <span className="text-xl font-black text-slate-800 mt-1 block">{customers.length} Accounts</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center">
                  <span className="block text-[8px] font-black text-slate-400 uppercase">Daily Liters</span>
                  <span className="text-xl font-black text-emerald-600 mt-1 block font-mono">
                    {customers.reduce((sum, c) => sum + c.quantity, 0).toFixed(1)} L
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-[11px] text-emerald-800 leading-relaxed">
                🐄 Cow Milk Rate: <span className="font-bold">₹60/L</span> <br />
                🐃 Buffalo Milk Rate: <span className="font-bold">₹75/L</span> <br />
                <span className="mt-1.5 block text-[10px] text-emerald-600 italic">
                  Milk subscribers can be selected inside the POS for instant automatic dairy billing checkout!
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right List Panel */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="relative w-full sm:max-w-xs">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, mobile, address..."
                className="w-full text-xs rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 font-medium"
              />
            </div>

            <div className="flex gap-1.5 self-stretch sm:self-auto overflow-x-auto">
              <button
                onClick={() => setTypeFilter('All')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  typeFilter === 'All'
                    ? 'bg-emerald-600 text-slate-950 font-extrabold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All Milk
              </button>
              <button
                onClick={() => setTypeFilter('Cow')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  typeFilter === 'Cow'
                    ? 'bg-emerald-600 text-slate-950 font-extrabold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                🐄 Cow Milk
              </button>
              <button
                onClick={() => setTypeFilter('Buffalo')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  typeFilter === 'Buffalo'
                    ? 'bg-emerald-600 text-slate-950 font-extrabold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                🐃 Buffalo Milk
              </button>
            </div>
          </div>

          {/* List View */}
          <div className="space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-20 text-slate-400 italic text-xs">
                No milk subscribers found matching search filter.
              </div>
            ) : (
              filteredCustomers.map(c => (
                <div key={c.id} className="p-4 rounded-2xl border border-slate-200 hover:border-slate-350 bg-slate-50/20 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-slate-900">{c.name}</h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        c.milkType === 'Cow' 
                          ? 'bg-amber-50 border border-amber-100 text-amber-800' 
                          : 'bg-indigo-50 border border-indigo-100 text-indigo-800'
                      }`}>
                        {c.milkType === 'Cow' ? '🐄 Cow' : '🐃 Buffalo'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-500 text-xs">
                      <a href={`tel:${c.mobile}`} className="flex items-center gap-1 hover:text-emerald-600 font-mono text-[11px] font-semibold">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {c.mobile}
                      </a>
                      {c.address && (
                        <div className="flex items-center gap-1 text-[11px] font-medium max-w-sm truncate">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span>{c.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                    <div className="text-right sm:text-right">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Plan Details</p>
                      <p className="text-xs font-extrabold text-slate-800 mt-0.5">
                        <span className="text-emerald-700 font-black font-mono">{c.quantity} Liters</span> @ ₹{c.price}/L
                      </p>
                      <p className="text-[10px] font-mono font-black text-emerald-600 mt-0.5">
                        Daily: ₹{(c.quantity * c.price).toFixed(2)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(c)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                        title="Edit subscriber details"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer border border-red-100"
                        title="Delete subscription profile"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
