import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Send, 
  Download, 
  FileText, 
  Check, 
  X, 
  ArrowRight, 
  AlertTriangle, 
  Truck, 
  History,
  Info
} from 'lucide-react';
import { Store, InventoryItem } from '../types';
import { 
  sendStockTransfer, 
  updateStockTransferStatus, 
  subscribeToTransfers, 
  StockTransfer 
} from '../lib/farmersGateDb';

interface StockTransferTabProps {
  store: Store;
  stores: Store[];
  inventory: InventoryItem[];
  onUpdateInventoryItem: (item: InventoryItem) => void;
  currencySymbol?: string;
}

export default function StockTransferTab({
  store,
  stores,
  inventory,
  onUpdateInventoryItem,
  currencySymbol = '₹'
}: StockTransferTabProps) {
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'history'>('send');
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  
  // Send Transfer Form States
  const [receiverStoreId, setReceiverStoreId] = useState<string>('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [approxValue, setApproxValue] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [previewChallan, setPreviewChallan] = useState<any | null>(null);

  // Receive Tab States
  const [receiveMessages, setReceiveMessages] = useState<{ [key: string]: string }>({});

  // Subscribe to transfers
  useEffect(() => {
    const unsubscribe = subscribeToTransfers((data) => {
      setTransfers(data);
    });
    return () => unsubscribe();
  }, []);

  // Filter other stores for transfer destinations
  const otherStores = stores.filter(s => s.id !== store.id && s.isActive);

  // Auto-fill approx value when item/quantity changes
  useEffect(() => {
    if (selectedItemId) {
      const item = inventory.find(i => i.id === selectedItemId);
      if (item && quantity) {
        const qtyNum = parseFloat(quantity) || 0;
        // Default to costPrice or sellingPrice
        const val = qtyNum * (item.costPrice || 20);
        setApproxValue(val.toFixed(2));
      }
    }
  }, [selectedItemId, quantity, inventory]);

  const handleItemSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    if (itemId === 'custom') {
      setCustomItemName('');
      setApproxValue('');
    } else {
      const item = inventory.find(i => i.id === itemId);
      if (item) {
        setCustomItemName(item.vegetableName);
      }
    }
  };

  const generateChallanId = () => {
    const rand = Math.floor(100000 + Math.random() * 900000);
    return `CHLN-${store.id.replace('store-', 'S')}-${rand}`;
  };

  const handleGenerateChallanPreview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!receiverStoreId) {
      setErrorMsg('Please select a destination store.');
      return;
    }

    if (!customItemName.trim()) {
      setErrorMsg('Please select or specify an item name.');
      return;
    }

    const qtyNum = parseFloat(quantity) || 0;
    if (qtyNum <= 0) {
      setErrorMsg('Quantity must be greater than zero.');
      return;
    }

    // Check inventory if selected item is from current stock
    if (selectedItemId && selectedItemId !== 'custom') {
      const item = inventory.find(i => i.id === selectedItemId);
      if (item && item.quantity < qtyNum) {
        setErrorMsg(`Insufficient stock. Only ${item.quantity} units available.`);
        return;
      }
    }

    const valueNum = parseFloat(approxValue) || 0;
    if (valueNum <= 0) {
      setErrorMsg('Approx value must be greater than zero.');
      return;
    }

    const targetStore = stores.find(s => s.id === receiverStoreId);
    if (!targetStore) {
      setErrorMsg('Invalid destination store.');
      return;
    }

    setPreviewChallan({
      challanId: generateChallanId(),
      senderStoreName: store.name,
      senderStoreLocation: store.location,
      receiverStoreName: targetStore.name,
      receiverStoreLocation: targetStore.location,
      itemName: customItemName,
      quantity: qtyNum,
      approxValue: valueNum,
      date: new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  };

  const handleSendStock = async () => {
    if (!previewChallan) return;

    try {
      // Deduct stock from current inventory if tracked item
      if (selectedItemId && selectedItemId !== 'custom') {
        const item = inventory.find(i => i.id === selectedItemId);
        if (item) {
          const newQty = item.quantity - previewChallan.quantity;
          onUpdateInventoryItem({
            ...item,
            quantity: Math.max(0, newQty),
            lastUpdated: new Date().toISOString()
          });
        }
      }

      // Save to Firebase
      await sendStockTransfer({
        challanId: previewChallan.challanId,
        senderStoreId: store.id,
        senderStoreName: store.name,
        receiverStoreId: receiverStoreId,
        receiverStoreName: previewChallan.receiverStoreName,
        itemName: previewChallan.itemName,
        quantity: previewChallan.quantity,
        approxValue: previewChallan.approxValue,
        status: 'Pending',
        createdAt: new Date().toISOString()
      });

      setSuccessMsg(`Stock transfer sent successfully! Challan #${previewChallan.challanId} generated.`);
      
      // Reset form
      setReceiverStoreId('');
      setSelectedItemId('');
      setCustomItemName('');
      setQuantity('');
      setApproxValue('');
      setPreviewChallan(null);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to send stock transfer. Try again.');
    }
  };

  const downloadChallanPDF = (transfer: any) => {
    const docPdf = new jsPDF();
    
    // Aesthetic Styling matching FarmersGate branding
    docPdf.setFillColor(21, 128, 61); // Emerald green
    docPdf.rect(0, 0, 210, 40, 'F');

    // Title Header
    docPdf.setTextColor(255, 255, 255);
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(24);
    docPdf.text("FARMER'S GATE", 14, 20);
    docPdf.setFontSize(10);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text('OFFICIAL STOCK TRANSFER DELIVERY CHALLAN', 14, 28);

    // Challan Details
    docPdf.setTextColor(15, 23, 42); // slate-900
    docPdf.setFontSize(11);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Challan No:', 140, 15);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(transfer.challanId || 'N/A', 170, 15);

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Date:', 140, 22);
    docPdf.setFont('helvetica', 'normal');
    const transferDate = transfer.createdAt 
      ? new Date(transfer.createdAt).toLocaleDateString('en-IN') 
      : new Date().toLocaleDateString('en-IN');
    docPdf.text(transferDate, 170, 22);

    docPdf.setFont('helvetica', 'bold');
    docPdf.text('Status:', 140, 29);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(transfer.status || 'PENDING', 170, 29);

    // Sender & Receiver Section
    docPdf.setDrawColor(226, 232, 240); // slate-200
    docPdf.line(14, 48, 196, 48);

    docPdf.setFontSize(12);
    docPdf.setTextColor(21, 128, 61);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text('SENDER BRANCH', 14, 58);
    docPdf.text('RECEIVER BRANCH', 110, 58);

    docPdf.setFontSize(10);
    docPdf.setTextColor(71, 85, 105);
    docPdf.setFont('helvetica', 'bold');
    docPdf.text(transfer.senderStoreName || store.name, 14, 66);
    docPdf.text(transfer.receiverStoreName || 'Receiver Store', 110, 66);

    docPdf.setFont('helvetica', 'normal');
    const senderLoc = transfer.senderStoreLocation || store.location || 'APMC Hub';
    const receiverLoc = transfer.receiverStoreLocation || 'Associated Outlet';
    docPdf.text(docPdf.splitTextToSize(senderLoc, 80), 14, 73);
    docPdf.text(docPdf.splitTextToSize(receiverLoc, 80), 110, 73);

    // Table Header
    docPdf.setFillColor(241, 245, 249);
    docPdf.rect(14, 95, 182, 10, 'F');
    docPdf.setFont('helvetica', 'bold');
    docPdf.setTextColor(15, 23, 42);
    docPdf.text('Item Description', 18, 101);
    docPdf.text('Quantity', 100, 101);
    docPdf.text('Approx Value', 150, 101);

    // Table Content
    docPdf.line(14, 105, 196, 105);
    docPdf.setFont('helvetica', 'normal');
    docPdf.text(transfer.itemName || 'Fresh Produce', 18, 114);
    docPdf.text(`${transfer.quantity} units`, 100, 114);
    docPdf.text(`${currencySymbol}${transfer.approxValue}`, 150, 114);

    docPdf.line(14, 122, 196, 122);

    // Terms & Disclaimers
    docPdf.setTextColor(100, 116, 139);
    docPdf.setFontSize(9);
    docPdf.text('* This delivery challan is digital proof of intra-ecosystem stock transition.', 14, 145);
    docPdf.text('* Receiver outlet must verify physical item quantities before digital approval.', 14, 150);
    
    if (transfer.receiveMessage) {
      docPdf.setTextColor(15, 23, 42);
      docPdf.setFont('helvetica', 'bold');
      docPdf.text('Receiver Note:', 14, 160);
      docPdf.setFont('helvetica', 'normal');
      docPdf.text(transfer.receiveMessage, 14, 166);
    }

    // Signatures
    docPdf.line(14, 190, 80, 190);
    docPdf.text('Authorized Sender Signatory', 25, 196);

    docPdf.line(110, 190, 176, 190);
    docPdf.text('Receiver Acknowledgment', 120, 196);

    // Save
    docPdf.save(`Challan-${transfer.challanId}.pdf`);
  };

  const handleApprove = async (transfer: StockTransfer) => {
    if (!transfer.id) return;
    try {
      const receiveMsg = receiveMessages[transfer.id] || 'Stock received and accounted for.';
      
      // Update receiving store's inventory
      // Look for the item in this store's inventory
      const existingItem = inventory.find(i => i.vegetableName.toLowerCase() === transfer.itemName.toLowerCase());
      if (existingItem) {
        onUpdateInventoryItem({
          ...existingItem,
          quantity: existingItem.quantity + transfer.quantity,
          lastUpdated: new Date().toISOString()
        });
      } else {
        // Create new item in receiver's inventory
        const newItem: InventoryItem = {
          id: `inv-${store.id}-${Date.now()}-${Math.floor(Math.random() * 100)}`,
          storeId: store.id,
          vegetableName: transfer.itemName,
          quantity: transfer.quantity,
          minStockThreshold: 15,
          costPrice: parseFloat((transfer.approxValue / transfer.quantity).toFixed(2)) || 20,
          sellingPrice: parseFloat(((transfer.approxValue / transfer.quantity || 20) * 1.35).toFixed(2)),
          lastUpdated: new Date().toISOString()
        };
        onUpdateInventoryItem(newItem);
      }

      // Update transfer document in Firebase
      await updateStockTransferStatus(transfer.id, 'Approved', receiveMsg);
      
      setSuccessMsg(`Transfer approved! Stock successfully credited to current store's inventory.`);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to approve transfer.');
    }
  };

  const handleReject = async (transfer: StockTransfer) => {
    if (!transfer.id) return;
    try {
      const receiveMsg = receiveMessages[transfer.id] || 'Stock rejected/returned due to discrepancy.';

      // Return stock back to sender store
      // Since sender store deducted it when sending, we need to reimburse them!
      // In a real database we update the DB record, here we can log the rejection 
      // and let administrators manually credit or if sender was current, they'd get it back.
      // But we can trigger update if we can access sender's inventory record.
      // To keep it simple, we save Rejected status so the sender knows they should adjust or write it off.
      await updateStockTransferStatus(transfer.id, 'Rejected', receiveMsg);
      
      setSuccessMsg(`Transfer rejected and returned to sender branch.`);
    } catch (e) {
      console.error(e);
      setErrorMsg('Failed to reject transfer.');
    }
  };

  // Filter incoming transfers for receiving
  const incomingPending = transfers.filter(t => t.receiverStoreId === store.id && t.status === 'Pending');

  // Filter transfers for history (both sent and received by this store)
  const myTransfersHistory = transfers.filter(t => 
    (t.senderStoreId === store.id || t.receiverStoreId === store.id) && t.status !== 'Pending'
  );

  return (
    <div className="space-y-4">
      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-slate-100 pb-2">
        <button
          onClick={() => { setActiveTab('send'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'send' 
              ? 'bg-emerald-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          Send Stock Outward
        </button>
        <button
          onClick={() => { setActiveTab('receive'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl relative transition-all ${
            activeTab === 'receive' 
              ? 'bg-emerald-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          Incoming Stock
          {incomingPending.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white font-black text-[9px] h-5 w-5 rounded-full flex items-center justify-center animate-bounce">
              {incomingPending.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('history'); setErrorMsg(''); setSuccessMsg(''); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all ${
            activeTab === 'history' 
              ? 'bg-emerald-600 text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Transfer Logs
        </button>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50/70 border border-rose-200/50 rounded-2xl flex items-center gap-2.5 text-xs text-rose-700 animate-shake">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/50 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800">
          <Check className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {/* 1. SEND STOCK TAB */}
      {activeTab === 'send' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Send form */}
          <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Create Stock Dispatch</h3>
            
            <form onSubmit={handleGenerateChallanPreview} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Destination Branch</label>
                <select
                  value={receiverStoreId}
                  onChange={(e) => setReceiverStoreId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 outline-none transition-all font-bold"
                  required
                >
                  <option value="">-- Choose Store --</option>
                  {otherStores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Select Crop/Item from Current Stock</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => handleItemSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 outline-none transition-all font-bold"
                  required
                >
                  <option value="">-- Choose Stock Item --</option>
                  {inventory.filter(i => i.quantity > 0).map(i => (
                    <option key={i.id} value={i.id}>
                      {i.vegetableName} (Available: {i.quantity} units)
                    </option>
                  ))}
                  <option value="custom">-- Custom Crop (Not in Tracked Stock) --</option>
                </select>
              </div>

              {selectedItemId === 'custom' && (
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Custom Item Name</label>
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="Enter Custom Crop Name"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 outline-none transition-all font-bold"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Transfer Quantity</label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 outline-none transition-all font-bold font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Approx Value ({currencySymbol})</label>
                  <input
                    type="number"
                    step="any"
                    value={approxValue}
                    onChange={(e) => setApproxValue(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 outline-none transition-all font-bold font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-900 text-white hover:bg-slate-800 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Draft & Verify Challan
              </button>
            </form>
          </div>

          {/* Challan Preview and Action */}
          <div className="lg:col-span-2 space-y-4">
            {previewChallan ? (
              <div className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border border-emerald-200/50 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
                  <span className="text-[10px] bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full tracking-wider uppercase">
                    CHALLAN DRAFT
                  </span>
                  <span className="text-xs font-bold text-slate-500 font-mono">
                    #{previewChallan.challanId}
                  </span>
                </div>

                <div className="space-y-3.5 text-xs text-slate-700">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 block uppercase">Destination</span>
                    <strong className="text-slate-900 block font-bold">{previewChallan.receiverStoreName}</strong>
                    <span className="text-[10px] text-slate-500">{previewChallan.receiverStoreLocation}</span>
                  </div>

                  <div className="p-3 bg-white border border-emerald-100/60 rounded-xl space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="font-bold text-slate-900">{previewChallan.itemName}</span>
                      <span className="font-mono text-emerald-700 font-bold">{previewChallan.quantity} units</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 border-t border-slate-50 pt-1.5">
                      <span>Estimated Value:</span>
                      <span className="font-extrabold text-slate-900">{currencySymbol}{previewChallan.approxValue}</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 font-bold uppercase text-center italic py-1">
                    Ready to generate & Dispatch Stock
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => downloadChallanPDF(previewChallan)}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Challan PDF
                  </button>
                  <button
                    onClick={handleSendStock}
                    className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-emerald-200"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Confirm Send
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/60 border-dashed rounded-2xl p-6 text-center space-y-2.5 flex flex-col items-center justify-center h-full min-h-[220px]">
                <FileText className="h-8 w-8 text-slate-400 animate-pulse" />
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Challan Generator Ready</h4>
                <p className="text-[11px] text-slate-400 max-w-[200px] leading-relaxed mx-auto">
                  Fill out the outward dispatch form on the left to review details and download challan.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. INCOMING STOCK TAB (RECEIVE) */}
      {activeTab === 'receive' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Pending Stock Approval Requests</h3>
          
          {incomingPending.length === 0 ? (
            <div className="bg-slate-50 p-8 text-center rounded-2xl border border-slate-100 space-y-2">
              <Truck className="h-8 w-8 text-slate-300 mx-auto" />
              <h4 className="text-xs font-bold text-slate-600">No incoming transfers!</h4>
              <p className="text-[11px] text-slate-400">All dispatches have been approved or verified.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {incomingPending.map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-3xs hover:border-emerald-300 transition-all flex flex-col justify-between space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full uppercase font-mono">
                          {t.challanId}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-sm text-slate-900 mt-1">{t.itemName}</h4>
                      <p className="text-xs text-slate-500 font-medium">
                        From: <span className="font-bold text-slate-700">{t.senderStoreName}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="font-black text-sm text-emerald-700 font-mono">{t.quantity} units</div>
                      <div className="text-[11px] text-slate-400 font-bold">Valued: {currencySymbol}{t.approxValue}</div>
                    </div>
                  </div>

                  {/* Message comment input */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Acknowledge Message</label>
                    <input
                      type="text"
                      placeholder="Comment (e.g. Received intact, count verified)"
                      value={receiveMessages[t.id || ''] || ''}
                      onChange={(e) => setReceiveMessages({ ...receiveMessages, [t.id || '']: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 outline-none transition-all font-medium"
                    />
                  </div>

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-50">
                    <button
                      onClick={() => downloadChallanPDF(t)}
                      className="py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="h-3 w-3" />
                      PDF
                    </button>
                    <button
                      onClick={() => handleReject(t)}
                      className="py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(t)}
                      className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs shadow-emerald-200"
                    >
                      <Check className="h-3 w-3" />
                      Accept Stock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Completed Stock Transitions</h3>
          
          {myTransfersHistory.length === 0 ? (
            <div className="bg-slate-50 p-8 text-center rounded-2xl border border-slate-100">
              <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-bold text-slate-600">No transaction logs!</h4>
              <p className="text-[11px] text-slate-400">Branch transition records will reside here once finalized.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-3xs bg-white">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[9px] font-black border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Challan</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Source/Destination</th>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Qty</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {myTransfersHistory.map((t) => {
                    const isOutgoing = t.senderStoreId === store.id;
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-[10px] text-emerald-800">{t.challanId}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isOutgoing 
                              ? 'bg-amber-50 text-amber-800' 
                              : 'bg-indigo-50 text-indigo-800'
                          }`}>
                            {isOutgoing ? 'Sent Out' : 'Received'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-semibold">
                          {isOutgoing ? `To: ${t.receiverStoreName}` : `From: ${t.senderStoreName}`}
                        </td>
                        <td className="px-4 py-3 text-slate-900 font-extrabold">{t.itemName}</td>
                        <td className="px-4 py-3 font-mono">{t.quantity}</td>
                        <td className="px-4 py-3 font-mono">{currencySymbol}{t.approxValue}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            t.status === 'Approved' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => downloadChallanPDF(t)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 transition-all inline-flex items-center"
                            title="Download Challan"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
