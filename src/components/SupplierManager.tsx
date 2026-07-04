import React, { useState } from 'react';
import { Supplier, PurchaseOrder, Store, PurchaseOrderItem } from '../types';
import { Plus, Edit, Trash2, Truck, FileText, CheckCircle, DollarSign, XCircle, Search, Filter, Calendar, Info, PackagePlus, ShieldAlert, CreditCard } from 'lucide-react';

interface SupplierManagerProps {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  stores: Store[];
  role: string;
  onAddSupplier: (s: Supplier) => Promise<void>;
  onUpdateSupplier: (s: Supplier) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
  onAddPurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  onUpdatePurchaseOrder: (po: PurchaseOrder) => Promise<void>;
  onDeletePurchaseOrder: (id: string) => Promise<void>;
  onReceivePOInventory: (po: PurchaseOrder) => Promise<void>;
}

export default function SupplierManager({
  suppliers,
  purchaseOrders,
  stores,
  role,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddPurchaseOrder,
  onUpdatePurchaseOrder,
  onDeletePurchaseOrder,
  onReceivePOInventory
}: SupplierManagerProps) {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'pos'>('suppliers');
  
  // Search & Filter state
  const [supplierSearch, setSupplierSearch] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const [poStatusFilter, setPoStatusFilter] = useState<string>('All');

  // Supplier Form State
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: 'Net 30'
  });

  // Purchase Order Form State
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedPOSupplier, setSelectedPOSupplier] = useState<string>('');
  const [selectedPOStore, setSelectedPOStore] = useState<string>('');
  const [poNotes, setPoNotes] = useState('');
  
  // Multi-item PO builder
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([
    { vegetableName: '', quantity: 10, costPerKg: 1.0, totalCost: 10 }
  ]);

  // Payment Tracking Form State
  const [paymentTrackingPO, setPaymentTrackingPO] = useState<PurchaseOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);

  const canManage = role === 'Admin' || role === 'Store Manager';

  // --- Supplier Handlers ---
  const handleOpenSupplierAdd = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      paymentTerms: 'Net 30'
    });
    setShowSupplierModal(true);
  };

  const handleOpenSupplierEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contactName: supplier.contactName || '',
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address || '',
      paymentTerms: supplier.paymentTerms
    });
    setShowSupplierModal(true);
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.phone || !supplierForm.email) {
      alert('Please fill out all required fields.');
      return;
    }

    if (editingSupplier) {
      const updated: Supplier = {
        ...editingSupplier,
        name: supplierForm.name,
        contactName: supplierForm.contactName,
        phone: supplierForm.phone,
        email: supplierForm.email,
        address: supplierForm.address,
        paymentTerms: supplierForm.paymentTerms
      };
      await onUpdateSupplier(updated);
    } else {
      const brandNew: Supplier = {
        id: `sup-${Date.now()}`,
        name: supplierForm.name,
        contactName: supplierForm.contactName,
        phone: supplierForm.phone,
        email: supplierForm.email,
        address: supplierForm.address,
        paymentTerms: supplierForm.paymentTerms,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      await onAddSupplier(brandNew);
    }
    setShowSupplierModal(false);
  };

  // --- Purchase Order Handlers ---
  const handleAddPOItemRow = () => {
    setPoItems(prev => [...prev, { vegetableName: '', quantity: 10, costPerKg: 1.0, totalCost: 10 }]);
  };

  const handleRemovePOItemRow = (index: number) => {
    if (poItems.length === 1) return;
    setPoItems(prev => prev.filter((_, i) => i !== index));
  };

  const handlePOItemChange = (index: number, field: keyof PurchaseOrderItem, value: string | number) => {
    setPoItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };
      
      if (field === 'vegetableName') {
        item.vegetableName = value as string;
      } else if (field === 'quantity') {
        item.quantity = Math.max(0, Number(value));
        item.totalCost = parseFloat((item.quantity * item.costPerKg).toFixed(2));
      } else if (field === 'costPerKg') {
        item.costPerKg = Math.max(0, Number(value));
        item.totalCost = parseFloat((item.quantity * item.costPerKg).toFixed(2));
      }

      updated[index] = item;
      return updated;
    });
  };

  const handleOpenPOModal = () => {
    if (suppliers.length === 0) {
      alert('Please register at least one Supplier first.');
      return;
    }
    if (stores.length === 0) {
      alert('Please register at least one Store first.');
      return;
    }
    setSelectedPOSupplier(suppliers[0].id);
    setSelectedPOStore(stores[0].id);
    setPoNotes('');
    setPoItems([{ vegetableName: '', quantity: 10, costPerKg: 1.0, totalCost: 10 }]);
    setShowPOModal(true);
  };

  const handlePOSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate items
    const invalidItem = poItems.some(item => !item.vegetableName.trim() || item.quantity <= 0 || item.costPerKg <= 0);
    if (invalidItem) {
      alert('Please fill out all item details. Quantities and Costs must be greater than zero.');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedPOSupplier);
    if (!supplier) return;

    const totalAmount = poItems.reduce((acc, curr) => acc + curr.totalCost, 0);

    const newPO: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      supplierId: selectedPOSupplier,
      supplierName: supplier.name,
      storeId: selectedPOStore,
      orderDate: new Date().toISOString(),
      items: poItems,
      status: 'Sent', // Auto-send purchase order
      paymentStatus: 'Unpaid',
      totalAmount,
      paidAmount: 0,
      notes: poNotes,
      createdAt: new Date().toISOString()
    };

    await onAddPurchaseOrder(newPO);
    setShowPOModal(false);
  };

  const handleUpdatePOStatus = async (po: PurchaseOrder, newStatus: 'Draft' | 'Sent' | 'Delivered' | 'Cancelled') => {
    if (po.status === 'Delivered') {
      alert('This Purchase Order has already been delivered and stock replenished.');
      return;
    }

    const updatedPO: PurchaseOrder = {
      ...po,
      status: newStatus
    };

    if (newStatus === 'Delivered') {
      // Prompt confirmation
      const confirmText = `Are you sure you want to mark ${po.poNumber} as Delivered? This will automatically adjust store inventory levels for these vegetables.`;
      if (!window.confirm(confirmText)) return;

      // Auto pay if terms are COD
      const supplierObj = suppliers.find(s => s.id === po.supplierId);
      if (supplierObj?.paymentTerms === 'COD') {
        updatedPO.paymentStatus = 'Paid';
        updatedPO.paidAmount = po.totalAmount;
      }

      await onReceivePOInventory(updatedPO);
    } else {
      await onUpdatePurchaseOrder(updatedPO);
    }
  };

  // --- Payment Tracking Handlers ---
  const handleOpenPaymentTracker = (po: PurchaseOrder) => {
    setPaymentTrackingPO(po);
    setPaymentAmount(parseFloat((po.totalAmount - po.paidAmount).toFixed(2)));
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTrackingPO) return;

    const currentPaid = paymentTrackingPO.paidAmount + paymentAmount;
    let newPaymentStatus: 'Unpaid' | 'Partially Paid' | 'Paid' = 'Partially Paid';
    
    if (currentPaid >= paymentTrackingPO.totalAmount) {
      newPaymentStatus = 'Paid';
    } else if (currentPaid <= 0) {
      newPaymentStatus = 'Unpaid';
    }

    const updatedPO: PurchaseOrder = {
      ...paymentTrackingPO,
      paidAmount: parseFloat(Math.min(paymentTrackingPO.totalAmount, currentPaid).toFixed(2)),
      paymentStatus: newPaymentStatus
    };

    await onUpdatePurchaseOrder(updatedPO);
    setPaymentTrackingPO(null);
  };

  // Filtering Lists
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    (s.contactName && s.contactName.toLowerCase().includes(supplierSearch.toLowerCase())) ||
    s.email.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = po.poNumber.toLowerCase().includes(poSearch.toLowerCase()) || 
                          po.supplierName.toLowerCase().includes(poSearch.toLowerCase()) ||
                          po.items.some(i => i.vegetableName.toLowerCase().includes(poSearch.toLowerCase()));
    
    if (poStatusFilter === 'All') return matchesSearch;
    return matchesSearch && po.status === poStatusFilter;
  });

  // Calculate PO stats
  const totalPOVolume = purchaseOrders.length;
  const pendingDelivVolume = purchaseOrders.filter(p => p.status === 'Sent').length;
  const totalUnpaidPOAmount = purchaseOrders.reduce((sum, po) => sum + (po.totalAmount - po.paidAmount), 0);

  return (
    <div className="space-y-6">
      
      {/* Header and Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400"></span>
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">B2B Procurement Space</span>
          </div>
          <h2 className="text-xl font-black tracking-tight">Supplier & Purchase Logs</h2>
          <p className="text-[11px] text-slate-400 font-medium">Coordinate with rural smallholder farmers and log bulk crop replenishment orders.</p>
        </div>

        {/* Dynamic Mini Stats panel */}
        <div className="flex gap-3 border-t md:border-t-0 border-slate-800 pt-3 md:pt-0">
          <div className="bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700/50">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Registered Suppliers</span>
            <span className="text-sm font-extrabold text-indigo-400">{suppliers.length} farmers / wholesalers</span>
          </div>
          <div className="bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700/50">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Transit Orders</span>
            <span className="text-sm font-extrabold text-amber-400">{pendingDelivVolume} in transit</span>
          </div>
          <div className="bg-slate-800/80 px-3.5 py-2 rounded-lg border border-slate-700/50 hidden sm:block">
            <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Outstanding Balance</span>
            <span className="text-sm font-extrabold text-rose-400">₹{totalUnpaidPOAmount.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* Toggle View Tabs */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'suppliers'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          Active Crop Suppliers ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveTab('pos')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'pos'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Purchase Orders & Payments ({purchaseOrders.length})
        </button>
      </div>

      {/* --- Tab 1: SUPPLIERS --- */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search suppliers..."
                value={supplierSearch}
                onChange={e => setSupplierSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
              />
            </div>

            {canManage && (
              <button
                onClick={handleOpenSupplierAdd}
                className="w-full sm:w-auto bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> ADD NEW SUPPLIER
              </button>
            )}
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="py-12 text-center bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-slate-500 text-xs font-medium">No suppliers match your current query.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSuppliers.map(supplier => (
                <div key={supplier.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-slate-800">{supplier.name}</h4>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        supplier.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {supplier.isActive ? 'Active Partner' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                      <div>
                        <span className="block font-semibold text-slate-400 uppercase text-[9px] tracking-wide">Contact Person</span>
                        <span className="text-slate-700 font-medium">{supplier.contactName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-400 uppercase text-[9px] tracking-wide">Payment Terms</span>
                        <span className="text-slate-700 font-bold">{supplier.paymentTerms}</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-400 uppercase text-[9px] tracking-wide">Phone</span>
                        <span className="text-slate-700 font-medium">{supplier.phone}</span>
                      </div>
                      <div>
                        <span className="block font-semibold text-slate-400 uppercase text-[9px] tracking-wide">Email</span>
                        <span className="text-slate-700 font-medium truncate block">{supplier.email}</span>
                      </div>
                    </div>

                    {supplier.address && (
                      <div className="text-[11px] text-slate-500">
                        <span className="block font-semibold text-slate-400 uppercase text-[9px] tracking-wide">Address</span>
                        <span className="text-slate-700 font-medium">{supplier.address}</span>
                      </div>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3 mt-3">
                      <button
                        onClick={() => handleOpenSupplierEdit(supplier)}
                        className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center gap-1"
                      >
                        <Edit className="h-3 w-3" /> Edit
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to remove supplier ${supplier.name}?`)) {
                            onDeleteSupplier(supplier.id);
                          }
                        }}
                        className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Tab 2: PURCHASE ORDERS --- */}
      {activeTab === 'pos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Search className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="PO #, supplier, or crop..."
                  value={poSearch}
                  onChange={e => setPoSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                />
              </div>

              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={poStatusFilter}
                  onChange={e => setPoStatusFilter(e.target.value)}
                  className="text-xs py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-slate-700 font-semibold"
                >
                  <option value="All">All Delivery Statuses</option>
                  <option value="Sent">Sent (In Transit)</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {canManage && (
              <button
                onClick={handleOpenPOModal}
                className="w-full sm:w-auto bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <PackagePlus className="h-3.5 w-3.5" /> REQUISITION Bulk Order
              </button>
            )}
          </div>

          {filteredPOs.length === 0 ? (
            <div className="py-12 text-center bg-white border border-slate-200 rounded-xl p-6">
              <p className="text-slate-500 text-xs font-medium">No purchase orders found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPOs.map(po => {
                const isDelivered = po.status === 'Delivered';
                const isCancelled = po.status === 'Cancelled';
                
                return (
                  <div key={po.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:border-slate-300 transition-colors">
                    
                    {/* Top block */}
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded">
                          {po.poNumber}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(po.orderDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status badges */}
                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isDelivered ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          isCancelled ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {po.status === 'Sent' ? '🚚 In Transit' : po.status}
                        </span>

                        <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          po.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' :
                          po.paymentStatus === 'Partially Paid' ? 'bg-sky-100 text-sky-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          💳 {po.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {/* Middle block with details */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                      
                      {/* Supplier & Delivery */}
                      <div className="md:col-span-4 space-y-1">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Supplier Details</span>
                        <p className="text-xs font-bold text-slate-800">{po.supplierName}</p>
                        
                        <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                          <p>
                            Destination Store:{' '}
                            <span className="font-semibold text-slate-700">
                              {stores.find(s=>s.id===po.storeId)?.name.replace("Farmer's Gate - ", "") || 'Main Depot'}
                            </span>
                          </p>
                          {po.notes && <p className="italic text-slate-400">"{po.notes}"</p>}
                        </div>
                      </div>

                      {/* Items details */}
                      <div className="md:col-span-5 space-y-1.5 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                        <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Items Requisitioned</span>
                        
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {po.items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-slate-700 border-b border-dashed border-slate-100 pb-1 last:border-0">
                              <span className="font-semibold">{item.vegetableName}</span>
                              <span className="font-mono text-slate-500">
                                {item.quantity} kg @ ₹{item.costPerKg}/kg (₹{item.totalCost})
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Financial / Payment history */}
                      <div className="md:col-span-3 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                        <div className="space-y-1">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Financial Summary</span>
                          <div className="flex justify-between items-baseline">
                            <span className="text-[11px] text-slate-500">Total PO Amount:</span>
                            <span className="text-xs font-extrabold text-slate-900">₹{po.totalAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-baseline text-[11px]">
                            <span className="text-slate-500">Paid Amount:</span>
                            <span className="font-bold text-emerald-600">₹{po.paidAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-baseline text-[11px] border-t border-slate-100 pt-1 mt-1 font-bold">
                            <span className="text-slate-600">Balance Owed:</span>
                            <span className="text-rose-600">₹{(po.totalAmount - po.paidAmount).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Bottom Action Bar */}
                    {canManage && (!isCancelled) && (
                      <div className="bg-slate-50/50 px-4 py-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        {/* Status controllers */}
                        {po.status === 'Sent' && (
                          <>
                            <button
                              onClick={() => handleUpdatePOStatus(po, 'Delivered')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <CheckCircle className="h-3 w-3" /> Mark Delivered & Add Stock
                            </button>
                            <button
                              onClick={() => handleUpdatePOStatus(po, 'Cancelled')}
                              className="bg-slate-100 hover:bg-slate-200 text-rose-600 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <XCircle className="h-3 w-3" /> Cancel PO
                            </button>
                          </>
                        )}

                        {/* Payment controller */}
                        {po.paymentStatus !== 'Paid' && (
                          <button
                            onClick={() => handleOpenPaymentTracker(po)}
                            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <DollarSign className="h-3 w-3 text-slate-500" /> Log Payments
                          </button>
                        )}

                        {role === 'Admin' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Delete this PO permanent log record?')) {
                                onDeletePurchaseOrder(po.id);
                              }
                            }}
                            className="text-[11px] font-bold text-rose-500 hover:text-rose-700 px-2.5 py-1"
                          >
                            Remove PO
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- MODAL 1: ADD / EDIT SUPPLIER --- */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 animate-slide-up">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-extrabold tracking-tight">
                {editingSupplier ? '📝 Modify Supplier Details' : '➕ Register New Supplier'}
              </h3>
              <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleSupplierSubmit} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Supplier Company / Farm Name *</label>
                <input
                  type="text"
                  required
                  value={supplierForm.name}
                  onChange={e => setSupplierForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Oakridge Cooperative"
                  className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Contact Name</label>
                  <input
                    type="text"
                    value={supplierForm.contactName}
                    onChange={e => setSupplierForm(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="e.g. John Farmer"
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Payment Terms *</label>
                  <select
                    value={supplierForm.paymentTerms}
                    onChange={e => setSupplierForm(prev => ({ ...prev, paymentTerms: e.target.value }))}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none font-semibold text-slate-700"
                  >
                    <option value="Net 30">Net 30 (Pay within 30 days)</option>
                    <option value="Net 15">Net 15 (Pay within 15 days)</option>
                    <option value="COD">COD (Cash on Delivery)</option>
                    <option value="Prepaid">Prepaid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={supplierForm.phone}
                    onChange={e => setSupplierForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="e.g. 15550192831"
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={supplierForm.email}
                    onChange={e => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="supplier@farm.com"
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Physical Farm Address</label>
                <textarea
                  value={supplierForm.address}
                  onChange={e => setSupplierForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Street details or farm coordinates..."
                  rows={2}
                  className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-bold text-white shadow-sm cursor-pointer"
                >
                  SAVE DETAILS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: NEW PURCHASE ORDER (REQUISITION WIZARD) --- */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 animate-slide-up">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-extrabold tracking-tight">🛒 Construct Bulk Purchase Requisition</h3>
              <button onClick={() => setShowPOModal(false)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handlePOSubmit} className="p-5 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Target Supplier *</label>
                  <select
                    value={selectedPOSupplier}
                    onChange={e => setSelectedPOSupplier(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none font-bold text-slate-700"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} (Terms: {s.paymentTerms})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Target Destination Store *</label>
                  <select
                    value={selectedPOStore}
                    onChange={e => setSelectedPOStore(e.target.value)}
                    className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none font-bold text-slate-700"
                  >
                    {stores.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Table Builder */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Order Crops & Quantities</span>
                  <button
                    type="button"
                    onClick={handleAddPOItemRow}
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded"
                  >
                    + ADD ITEM
                  </button>
                </div>

                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {poItems.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row items-center gap-2.5 bg-slate-50 p-2.5 rounded-lg relative">
                      <div className="w-full sm:flex-1 space-y-0.5">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase">Crop Name</label>
                        <input
                          type="text"
                          required
                          value={item.vegetableName}
                          onChange={e => handlePOItemChange(index, 'vegetableName', e.target.value)}
                          placeholder="e.g. Spinach, Garlic..."
                          className="w-full text-xs px-2.5 py-1 bg-white border border-slate-200 rounded focus:outline-none"
                        />
                      </div>

                      <div className="w-full sm:w-28 space-y-0.5">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase">Quantity (kg)</label>
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={e => handlePOItemChange(index, 'quantity', e.target.value)}
                          className="w-full text-xs px-2.5 py-1 bg-white border border-slate-200 rounded focus:outline-none font-semibold text-slate-800"
                        />
                      </div>

                      <div className="w-full sm:w-28 space-y-0.5">
                        <label className="block text-[8px] font-bold text-slate-400 uppercase">Cost / kg (₹)</label>
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          value={item.costPerKg}
                          onChange={e => handlePOItemChange(index, 'costPerKg', e.target.value)}
                          className="w-full text-xs px-2.5 py-1 bg-white border border-slate-200 rounded focus:outline-none font-semibold text-slate-800"
                        />
                      </div>

                      <div className="w-full sm:w-24 text-right pt-4">
                        <span className="block text-[8px] font-bold text-slate-400 uppercase">Subtotal</span>
                        <span className="text-xs font-bold text-slate-700">₹{item.totalCost.toFixed(2)}</span>
                      </div>

                      {poItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePOItemRow(index)}
                          className="absolute -top-1.5 -right-1.5 sm:relative sm:top-0 sm:right-0 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-full sm:rounded-md p-1 mt-4"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary calculations */}
              <div className="bg-slate-50 p-3.5 rounded-lg flex items-center justify-between border border-slate-100">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-slate-400" />
                  <span className="text-[11px] text-slate-500 font-medium">Requisitions are generated as "Sent" instantly.</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Estimated Cost</span>
                  <p className="text-sm font-black text-slate-900">
                    ₹{poItems.reduce((sum, i) => sum + i.totalCost, 0).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Order Instructions / Notes</label>
                <textarea
                  value={poNotes}
                  onChange={e => setPoNotes(e.target.value)}
                  placeholder="e.g. Delivery must be packed in wood crates, check quality on gate entry..."
                  rows={2}
                  className="w-full text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPOModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-bold text-white shadow-sm cursor-pointer"
                >
                  SUBMIT PURCHASE ORDER
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: LOG PAYMENT TO SUPPLIER --- */}
      {paymentTrackingPO && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-slide-up">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <h3 className="text-sm font-extrabold tracking-tight">💰 Register Supplier Payment</h3>
              <button onClick={() => setPaymentTrackingPO(null)} className="text-slate-400 hover:text-white font-bold text-sm">✕</button>
            </div>

            <form onSubmit={handleRegisterPayment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-500 space-y-1 border border-slate-100">
                <p>Purchase Order: <span className="font-bold text-slate-800">{paymentTrackingPO.poNumber}</span></p>
                <p>Supplier: <span className="font-bold text-slate-800">{paymentTrackingPO.supplierName}</span></p>
                <p>Total PO Cost: <span className="font-bold text-slate-800">₹{paymentTrackingPO.totalAmount.toFixed(2)}</span></p>
                <p>Already Paid: <span className="font-bold text-emerald-600">₹{paymentTrackingPO.paidAmount.toFixed(2)}</span></p>
                <p className="border-t border-slate-200 pt-1 mt-1 font-bold">
                  Pending Balance: <span className="text-rose-600">₹{(paymentTrackingPO.totalAmount - paymentTrackingPO.paidAmount).toFixed(2)}</span>
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Payment Amount to Log (₹)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center font-bold text-slate-400 text-xs">₹</span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    max={parseFloat((paymentTrackingPO.totalAmount - paymentTrackingPO.paidAmount).toFixed(2))}
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(parseFloat(Number(e.target.value).toFixed(2)))}
                    className="w-full text-xs pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentTrackingPO(null)}
                  className="px-4 py-2 border border-slate-200 rounded text-xs font-bold text-slate-500 hover:bg-slate-50 cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-bold text-white shadow-sm cursor-pointer"
                >
                  REGISTER PAYMENT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
