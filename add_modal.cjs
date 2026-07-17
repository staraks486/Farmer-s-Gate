const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

const modalCode = `
      {/* MILK BILL MODAL */}
      {showBillModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 max-w-sm w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="font-black text-emerald-950 uppercase tracking-tight flex items-center gap-2">
                <FileText className="h-4 w-4 text-emerald-600" /> Milk Ledger Bill
              </h3>
              <button 
                onClick={() => setShowBillModal(null)}
                className="p-1 hover:bg-slate-200 rounded-full text-slate-500 cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 bg-slate-50/30" id="bill-receipt-content">
              <div className="text-center mb-4 pb-4 border-b border-dashed border-slate-300">
                <h2 className="text-lg font-black text-emerald-800 uppercase tracking-widest">FarmersGate</h2>
                <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mt-0.5">Fresh Milk Dispatch</p>
              </div>
              
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                  <p className="text-sm font-extrabold text-slate-800">{showBillModal.name}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Subscription Plan</p>
                  <p className="text-xs font-bold text-slate-700 font-mono bg-white p-1.5 rounded-lg border border-slate-200 mt-1">
                    {showBillModal.milkType === 'Both' 
                      ? \`Cow: \${showBillModal.cowQuantity}L, Buf: \${showBillModal.buffaloQuantity}L\` 
                      : \`\${showBillModal.quantity}L / day (\${showBillModal.milkType})\`}
                  </p>
                </div>
              </div>
              
              <div className="space-y-1 mb-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Billing Summary (Last 30 Days)</p>
                {(() => {
                  const { recentLogs, totalAmt } = generateBillContent(showBillModal);
                  const deliveredCount = recentLogs.filter(l => l.delivered).length;
                  return (
                    <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                      <div className="flex justify-between items-center text-xs font-bold text-emerald-800 mb-1">
                        <span>Total Deliveries</span>
                        <span>{deliveredCount} days</span>
                      </div>
                      <div className="flex justify-between items-center text-sm font-black text-emerald-950 mt-2 pt-2 border-t border-emerald-200/60">
                        <span>Total Amount Due</span>
                        <span>₹{totalAmt.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              
              <div className="text-center mt-6">
                <p className="text-[9px] font-bold text-slate-400 italic">Thank you for choosing FarmersGate Organics!</p>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white grid grid-cols-3 gap-2 shrink-0">
              <button
                onClick={() => handleDownloadPDF(showBillModal)}
                className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 transition cursor-pointer border border-red-100"
              >
                <Download className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase">PDF</span>
              </button>
              <button
                onClick={() => handleDownloadImage(showBillModal)}
                className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer border border-indigo-100"
              >
                <Download className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase">Image</span>
              </button>
              <button
                onClick={() => handleShareWhatsApp(showBillModal)}
                className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-green-500 hover:bg-green-600 text-white transition cursor-pointer shadow-md shadow-green-500/20"
              >
                <Share2 className="h-4 w-4" />
                <span className="text-[9px] font-black uppercase">WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
`;

code = code.replace(
  `    </div>
  );
}`,
  modalCode + `
    </div>
  );
}`
);

fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
