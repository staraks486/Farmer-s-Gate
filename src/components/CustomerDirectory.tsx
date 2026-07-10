import React, { useState } from 'react';
import { 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Award, 
  Calendar, 
  FileText, 
  X, 
  ShoppingBag, 
  ArrowLeft,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface CustomerDirectoryProps {
  storeId: string;
  storeName: string;
  generalCustomers: any[];
  setGeneralCustomers: (custs: any[]) => void;
  storeBills: any[];
}

export const CustomerDirectory: React.FC<CustomerDirectoryProps> = ({
  storeId,
  storeName,
  generalCustomers,
  setGeneralCustomers,
  storeBills
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);

  // History detail drawer state
  const [activeHistoryCust, setActiveHistoryCust] = useState<any | null>(null);

  // Filter customers belonging to the current store
  const branchCustomers = generalCustomers.filter(c => c.storeId === storeId);

  // Search filter
  const filteredCustomers = branchCustomers.filter(c => {
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.phone.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.address && c.address.toLowerCase().includes(query))
    );
  });

  // Calculate some quick metrics
  const totalPoints = branchCustomers.reduce((sum, c) => sum + (c.loyaltyPoints || 0), 0);
  
  // Submit new customer
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    const formattedPhone = phone.startsWith('+91') ? phone.trim() : `+91 ${phone.replace(/[^\d]/g, '').trim()}`;

    if (editingCustomer) {
      // Edit mode
      const updated = generalCustomers.map(c => {
        if (c.id === editingCustomer.id) {
          return {
            ...c,
            name: name.trim(),
            phone: formattedPhone,
            email: email.trim() || undefined,
            address: address.trim() || undefined,
            notes: notes.trim() || undefined,
            loyaltyPoints: loyaltyPoints
          };
        }
        return c;
      });
      setGeneralCustomers(updated);
      localStorage.setItem('fg_general_customers', JSON.stringify(updated));
    } else {
      // Add mode
      const newCustomer = {
        id: `cust-${Date.now()}`,
        storeId,
        name: name.trim(),
        phone: formattedPhone,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        loyaltyPoints: loyaltyPoints || 0,
        createdAt: new Date().toISOString()
      };
      const updated = [...generalCustomers, newCustomer];
      setGeneralCustomers(updated);
      localStorage.setItem('fg_general_customers', JSON.stringify(updated));
    }

    // Reset states
    closeModal();
  };

  const startEdit = (cust: any) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone.replace('+91 ', ''));
    setEmail(cust.email || '');
    setAddress(cust.address || '');
    setNotes(cust.notes || '');
    setLoyaltyPoints(cust.loyaltyPoints || 0);
    setShowAddModal(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer record?")) {
      const updated = generalCustomers.filter(c => c.id !== id);
      setGeneralCustomers(updated);
      localStorage.setItem('fg_general_customers', JSON.stringify(updated));
      if (activeHistoryCust && activeHistoryCust.id === id) {
        setActiveHistoryCust(null);
      }
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    setLoyaltyPoints(0);
  };

  // Helper: Get bills count and total spent for a customer
  const getCustomerStats = (custName: string, custPhone: string) => {
    // Match either by phone number or by name
    const custBills = storeBills.filter(b => {
      const billPhone = b.whatsappPhone ? b.whatsappPhone.replace(/[^\d]/g, '') : '';
      const matchPhone = custPhone ? custPhone.replace(/[^\d]/g, '') : '';
      
      const hasPhoneMatch = matchPhone && billPhone && billPhone.includes(matchPhone);
      const hasNameMatch = b.customerName && b.customerName.toLowerCase() === custName.toLowerCase();
      
      return hasPhoneMatch || hasNameMatch;
    });

    const totalSpent = custBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    return {
      bills: custBills,
      count: custBills.length,
      spent: totalSpent
    };
  };

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Upper header segment */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-emerald-50/40 p-5 rounded-3xl border border-emerald-100">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>👥</span> {storeName} Customer Directory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain general store customer profiles, log delivery addresses, and track loyalty point earnings.
          </p>
        </div>
        <button
          onClick={() => {
            closeModal();
            setShowAddModal(true);
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-sm cursor-pointer hover:scale-[1.01]"
        >
          <Plus className="h-4 w-4" />
          <span>REGISTER NEW CUSTOMER</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 border border-slate-200/65 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
            👥
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Registered Directory</p>
            <h3 className="text-xl font-black text-slate-800 font-mono">{branchCustomers.length} Users</h3>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/65 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
            🏆
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Loyalty Points</p>
            <h3 className="text-xl font-black text-slate-800 font-mono">{totalPoints} Pts</h3>
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/65 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg">
            🛍️
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Average Points / User</p>
            <h3 className="text-xl font-black text-slate-800 font-mono">
              {branchCustomers.length > 0 ? Math.round(totalPoints / branchCustomers.length) : 0} Pts
            </h3>
          </div>
        </div>
      </div>

      {/* Main List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Customer Registry Table (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-3xs overflow-hidden flex flex-col">
          
          {/* List Toolbar */}
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search customers by name, phone or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-400"
              />
            </div>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {filteredCustomers.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <span className="text-4xl block mb-2">👤</span>
                <p className="text-xs font-bold text-slate-500">No customer profiles found</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  {searchQuery ? "Try refining your search query" : "New customers will be logged automatically during POS checkout"}
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase text-[9px] tracking-wider">
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Address & Delivery</th>
                    <th className="py-3 px-4 text-center">Loyalty Balance</th>
                    <th className="py-3 px-4 text-center font-mono">Sales Vol</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {filteredCustomers.map(cust => {
                    const stats = getCustomerStats(cust.name, cust.phone);
                    const isActiveDetail = activeHistoryCust?.id === cust.id;
                    
                    return (
                      <tr 
                        key={cust.id} 
                        className={`hover:bg-slate-50/60 transition-colors ${isActiveDetail ? 'bg-emerald-50/20' : ''}`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <button
                              onClick={() => setActiveHistoryCust(cust)}
                              className="font-black text-slate-900 hover:text-emerald-700 text-left hover:underline block"
                            >
                              {cust.name}
                            </button>
                            <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                              <span className="flex items-center gap-1 font-mono">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {cust.phone}
                              </span>
                              {cust.email && (
                                <span className="flex items-center gap-1 truncate max-w-[120px]">
                                  <Mail className="h-3 w-3 text-slate-400" />
                                  {cust.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[10px] max-w-[200px] truncate text-slate-600">
                          {cust.address ? (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                              <span>{cust.address}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic font-medium">No address logged</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black text-[10px] font-mono">
                            <Award className="h-3 w-3" />
                            {cust.loyaltyPoints || 0} pts
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono">
                          <div className="space-y-0.5">
                            <p className="font-extrabold text-slate-800">{stats.count} bills</p>
                            <p className="text-[10px] text-emerald-600 font-bold">₹{stats.spent.toFixed(0)}</p>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => startEdit(cust)}
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Edit Customer Details"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cust.id)}
                              className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Delete Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Purchase Ledger / Selected Customer Detail (1/3 width) */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          {activeHistoryCust ? (() => {
            const stats = getCustomerStats(activeHistoryCust.name, activeHistoryCust.phone);
            
            return (
              <div className="space-y-4 text-left h-full flex flex-col">
                <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">{activeHistoryCust.name}</h3>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{activeHistoryCust.phone}</p>
                  </div>
                  <button
                    onClick={() => setActiveHistoryCust(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-white rounded-lg cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[350px] pr-1">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Branch Ledger Entries</span>
                  
                  {stats.bills.length === 0 ? (
                    <div className="py-12 text-center bg-white border border-dashed border-slate-200 rounded-xl p-4 text-slate-400">
                      <ShoppingBag className="h-6 w-6 mx-auto mb-1.5 opacity-50 text-slate-400" />
                      <p className="text-[10px] font-bold">No registered sales history yet</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Bills completed with this customer's name/phone will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {stats.bills.map((bill: any) => (
                        <div key={bill.id} className="bg-white border border-slate-200 rounded-xl p-3 space-y-1.5 shadow-3xs">
                          <div className="flex justify-between items-center">
                            <span className="font-black text-[10px] text-slate-800 font-mono">{bill.id}</span>
                            <span className="text-[10px] text-emerald-600 font-black font-mono">₹{bill.totalAmount.toFixed(2)}</span>
                          </div>
                          
                          <div className="text-[10px] text-slate-500 font-medium flex justify-between">
                            <span>📅 {bill.date.split(',')[0]}</span>
                            <span className="capitalize font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[9px]">{bill.paymentMode}</span>
                          </div>

                          <div className="text-[10px] text-slate-500 bg-slate-50/80 rounded-lg p-1.5 font-mono max-h-16 overflow-y-auto pr-1">
                            {bill.items.map((it: any, i: number) => (
                              <div key={i} className="flex justify-between">
                                <span className="truncate max-w-[120px]">{it.vegetableName}</span>
                                <span className="text-[9px] text-slate-400">x{it.quantity}{it.unit || 'kg'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-2 text-xs">
                  <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Customer Profile Notes</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    {activeHistoryCust.notes || "No custom profile notes written yet."}
                  </p>
                  {activeHistoryCust.address && (
                    <div className="pt-2 border-t border-slate-100 flex gap-1.5 text-[10px] text-slate-500 font-medium leading-normal">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{activeHistoryCust.address}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })() : (
            <div className="py-20 text-center text-slate-400 space-y-3 h-full flex flex-col justify-center items-center">
              <span className="text-4xl block">📊</span>
              <div>
                <h4 className="text-xs font-black text-slate-700">Interactive Invoice Ledger</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                  Click on any customer's name to explore their purchase history, logged delivery address, and notes.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* --- ADD / EDIT CUSTOMER MODAL DIALOG --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                <span>👤</span> {editingCustomer ? "Edit Customer Details" : "Register Store Customer"}
              </h3>
              <button 
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm p-1 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ananya Rao"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Mobile Phone Number (WhatsApp) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 font-mono text-slate-400 text-xs font-semibold">+91</span>
                  <input
                    type="tel"
                    required
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 pl-11 pr-3.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Email Address (Optional)</label>
                <input
                  type="email"
                  placeholder="e.g. customer@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Delivery Address (Optional)</label>
                <textarea
                  placeholder="Street name, Apartment name, Block, Pin Code..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 leading-normal"
                />
              </div>

              {editingCustomer && (
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Loyalty Points Balance</label>
                  <input
                    type="number"
                    value={loyaltyPoints}
                    onChange={(e) => setLoyaltyPoints(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 font-mono"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Staff Notes / Preferences</label>
                <input
                  type="text"
                  placeholder="e.g. Prefers custom delivery hours, premium honey, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                />
              </div>

              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-2.5 text-xs transition-colors cursor-pointer text-center"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl py-2.5 text-xs transition-all shadow-sm cursor-pointer text-center"
                >
                  {editingCustomer ? "SAVE CHANGES" : "REGISTER PROFILE"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
