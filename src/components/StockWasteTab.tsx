import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  AlertTriangle, 
  Check, 
  Info, 
  Calendar,
  Layers,
  ArrowRight,
  Camera,
  Upload,
  X,
  Eye
} from 'lucide-react';
import { Store, InventoryItem } from '../types';
import { logStockWaste, subscribeToWaste, StockWaste } from '../lib/farmersGateDb';

interface StockWasteTabProps {
  store: Store;
  inventory: InventoryItem[];
  onUpdateInventoryItem: (item: InventoryItem) => void;
  currencySymbol?: string;
}

const WASTE_REASONS = [
  'Over-ripe / Natural Spoilage',
  'Shelf-life Expiration',
  'Transport Damage during Unloading',
  'Rodent / Pest Infestation',
  'Temperature Discrepancy (Cold Storage failure)',
  'Customer Handling Damage',
  'Other / Inward Defect'
];

export default function StockWasteTab({
  store,
  inventory,
  onUpdateInventoryItem,
  currencySymbol = '₹'
}: StockWasteTabProps) {
  const [wasteLogs, setWasteLogs] = useState<StockWaste[]>([]);
  
  // Form States
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customItemName, setCustomItemName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [approxValue, setApproxValue] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  // Camera & Photo States
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [activeLogWithPhoto, setActiveLogWithPhoto] = useState<StockWaste | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);

  // Subscribe to waste logs
  useEffect(() => {
    const unsubscribe = subscribeToWaste((data) => {
      setWasteLogs(data);
    });
    return () => unsubscribe();
  }, []);

  // Pre-calculate approx value
  useEffect(() => {
    if (selectedItemId) {
      const item = inventory.find(i => i.id === selectedItemId);
      if (item && quantity) {
        const qtyNum = parseFloat(quantity) || 0;
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

  const startCamera = async () => {
    setErrorMsg('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setVideoStream(stream);
    } catch (err) {
      console.error('Error starting camera stream:', err);
      setErrorMsg('Could not open camera. Please use the upload photo option instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = (videoEl: HTMLVideoElement | null) => {
    if (!videoEl) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoEl.videoWidth || 640;
    canvas.height = videoEl.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setPhotoBase64(dataUrl);
      stopCamera();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [videoStream]);

  const handleSubmitWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!customItemName.trim()) {
      setErrorMsg('Please select or specify an item.');
      return;
    }

    const qtyNum = parseFloat(quantity) || 0;
    if (qtyNum <= 0) {
      setErrorMsg('Waste quantity must be greater than zero.');
      return;
    }

    // Check inventory if selected item is from stock
    if (selectedItemId && selectedItemId !== 'custom') {
      const item = inventory.find(i => i.id === selectedItemId);
      if (item && item.quantity < qtyNum) {
        setErrorMsg(`Quantity exceeds currently tracked inventory (${item.quantity} available).`);
        return;
      }
    }

    const valNum = parseFloat(approxValue) || 0;
    if (valNum < 0) {
      setErrorMsg('Approx value cannot be negative.');
      return;
    }

    if (!reason) {
      setErrorMsg('Please select a reason for stock waste.');
      return;
    }

    try {
      // 1. Deduct stock from current inventory
      if (selectedItemId && selectedItemId !== 'custom') {
        const item = inventory.find(i => i.id === selectedItemId);
        if (item) {
          const newQty = item.quantity - qtyNum;
          onUpdateInventoryItem({
            ...item,
            quantity: Math.max(0, newQty),
            lastUpdated: new Date().toISOString()
          });
        }
      }

      // 2. Save waste log to Firestore
      await logStockWaste({
        storeId: store.id,
        storeName: store.name,
        itemName: customItemName,
        quantity: qtyNum,
        approxValue: valNum,
        reason,
        photoUrl: photoBase64 || undefined,
        createdAt: new Date().toISOString()
      });

      setSuccessMsg(`Logged waste of ${qtyNum} units of ${customItemName} successfully.`);
      
      // Reset Form
      setSelectedItemId('');
      setCustomItemName('');
      setQuantity('');
      setApproxValue('');
      setReason('');
      setPhotoBase64(null);
      stopCamera();
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to record waste entry. Please try again.');
    }
  };

  // Filter logs for this store
  const myWasteLogs = wasteLogs.filter(w => w.storeId === store.id);

  // Stats
  const totalValueWasted = myWasteLogs.reduce((sum, log) => sum + log.approxValue, 0);
  const totalQtyWasted = myWasteLogs.reduce((sum, log) => sum + log.quantity, 0);

  return (
    <div className="space-y-6">
      
      {/* Waste Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-rose-50/70 to-red-50/20 border border-rose-100 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider">Total Value Loss</span>
            <h4 className="text-xl font-black text-slate-800 font-mono mt-0.5">{currencySymbol}{totalValueWasted.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h4>
          </div>
          <div className="h-10 w-10 bg-rose-100 text-rose-700 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-3xs">
            💸
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Quantity Discarded</span>
            <h4 className="text-xl font-black text-slate-800 font-mono mt-0.5">{totalQtyWasted.toLocaleString('en-IN')} units</h4>
          </div>
          <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-3xs">
            🥬
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200/50 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Logged Incidents</span>
            <h4 className="text-xl font-black text-slate-800 font-mono mt-0.5">{myWasteLogs.length} Records</h4>
          </div>
          <div className="h-10 w-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center font-extrabold text-lg shadow-3xs">
            📋
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Waste Log Form */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Trash2 className="h-4.5 w-4.5 text-rose-600" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Record Spoilage / Waste</h3>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200/50 rounded-xl flex items-center gap-2 text-xs text-rose-700 animate-shake font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200/50 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
              <Check className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmitWaste} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Select Crop/Stock Item</label>
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
                  placeholder="Enter custom crop name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 outline-none transition-all font-bold"
                  required
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Wasted Quantity</label>
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

            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Primary Reason for Waste</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:border-emerald-500 outline-none transition-all font-bold"
                required
              >
                <option value="">-- Select Reason --</option>
                {WASTE_REASONS.map((r, idx) => (
                  <option key={idx} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Camera & Photo Section */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Spoilage Proof / Photo (Optional)</span>
              
              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex flex-col items-center">
                  <video 
                    ref={(el) => {
                      if (el && videoStream && el.srcObject !== videoStream) {
                        el.srcObject = videoStream;
                        el.play().catch(err => console.error(err));
                      }
                    }}
                    className="w-full h-44 object-cover"
                    playsInline
                  />
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        const video = e.currentTarget.parentElement?.previousElementSibling as HTMLVideoElement;
                        captureSnapshot(video);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg shadow cursor-pointer"
                    >
                      📸 CAPTURE
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        stopCamera();
                      }}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-lg cursor-pointer"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : photoBase64 ? (
                <div className="relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200/60 p-1 flex items-center gap-3">
                  <img src={photoBase64} alt="Spoilage proof thumbnail" className="h-14 w-14 object-cover rounded-xl" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-700 truncate font-sans">Captured Image Attached</p>
                    <p className="text-[9px] text-slate-400 font-bold font-mono">Image size: ~{(photoBase64.length / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPhotoBase64(null);
                    }}
                    className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center justify-center shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      startCamera();
                    }}
                    className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 border-dashed rounded-xl gap-1 text-[11px] font-bold text-slate-600 transition-all cursor-pointer"
                  >
                    <Camera className="h-4.5 w-4.5 text-emerald-600" />
                    <span>Direct Camera</span>
                  </button>
                  
                  <label className="flex flex-col items-center justify-center p-3 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 border-dashed rounded-xl gap-1 text-[11px] font-bold text-slate-600 transition-all cursor-pointer">
                    <Upload className="h-4.5 w-4.5 text-purple-600 animate-pulse" />
                    <span>Upload Image</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm shadow-rose-200 cursor-pointer"
            >
              Record Spoilage Log
            </button>
          </form>
        </div>

        {/* Waste Log Table */}
        <div className="lg:col-span-3 bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Layers className="h-4.5 w-4.5 text-slate-500" />
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Recent Spoilage Records</h3>
          </div>

          {myWasteLogs.length === 0 ? (
            <div className="bg-slate-50 p-8 text-center rounded-2xl border border-slate-100 border-dashed space-y-1.5">
              <Info className="h-6 w-6 text-slate-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-600">No spoilage registered!</h4>
              <p className="text-[11px] text-slate-400">Excellent management! No crops have been wasted yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[9px] font-black border-b border-slate-100">
                  <tr>
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5">Crop Item</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                    <th className="px-3 py-2.5 text-right">Loss</th>
                    <th className="px-3 py-2.5">Reason</th>
                    <th className="px-3 py-2.5 text-center">Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-600">
                  {myWasteLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-3 text-[10px] text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </td>
                      <td className="px-3 py-3 text-slate-900 font-extrabold">{log.itemName}</td>
                      <td className="px-3 py-3 text-right font-mono text-slate-500">{log.quantity}</td>
                      <td className="px-3 py-3 text-right font-mono text-rose-600">{currencySymbol}{log.approxValue.toFixed(2)}</td>
                      <td className="px-3 py-3 text-slate-500 font-semibold max-w-[120px] truncate" title={log.reason}>
                        {log.reason}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {log.photoUrl ? (
                          <button
                            type="button"
                            onClick={() => setActiveLogWithPhoto(log)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 text-emerald-700 transition-all cursor-pointer"
                            title="View Spoilage Photo"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-slate-300 font-normal text-[10px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Spoilage Photo Lightbox Modal */}
      {activeLogWithPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative max-w-lg w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-100 space-y-4">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider text-rose-400">Waste Log Photo Proof</h4>
                <p className="font-extrabold text-sm truncate">{activeLogWithPhoto.itemName} - {activeLogWithPhoto.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveLogWithPhoto(null)}
                className="h-8 w-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 flex flex-col items-center">
              <img 
                src={activeLogWithPhoto.photoUrl} 
                alt={`${activeLogWithPhoto.itemName} Spoilage Proof`} 
                className="max-h-[300px] w-auto object-contain rounded-2xl border border-slate-200"
              />
              
              <div className="w-full grid grid-cols-3 gap-2 text-center text-xs mt-4">
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
                  <span className="text-[8px] uppercase font-black tracking-wider text-slate-400 block">Quantity</span>
                  <strong className="text-slate-800">{activeLogWithPhoto.quantity} units</strong>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
                  <span className="text-[8px] uppercase font-black tracking-wider text-slate-400 block">Total Loss</span>
                  <strong className="text-rose-600">{currencySymbol}{activeLogWithPhoto.approxValue.toFixed(2)}</strong>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-2">
                  <span className="text-[8px] uppercase font-black tracking-wider text-slate-400 block">Logged Date</span>
                  <strong className="text-slate-800 font-mono text-[10px]">
                    {new Date(activeLogWithPhoto.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short'
                    })}
                  </strong>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveLogWithPhoto(null)}
                className="px-4 py-1.5 bg-slate-850 hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
