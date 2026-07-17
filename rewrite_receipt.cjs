const fs = require('fs');
let code = fs.readFileSync('src/components/StoreManager.tsx', 'utf8');

const startMarker = '{/* Monospace Thermal Ticket Receipt */}';
const endMarker = '{/* Receipt management & actions side panel */}';

const startIndex = code.indexOf(startMarker);
const endIndex = code.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
  const newReceipt = `                {/* Monospace Thermal Ticket Receipt */}
                <div id="thermal-receipt" className="flex-1 max-w-sm mx-auto bg-white border border-slate-200 rounded-[2rem] p-8 shadow-xl relative overflow-hidden font-sans">
                  {/* Subtle Background Glow */}
                  <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-400 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
                  <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-teal-400 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>

                  {/* Modern Emblem */}
                  <div className="text-center space-y-2 pt-2 relative z-10">
                    <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 text-emerald-800 text-3xl font-black mb-1 shadow-sm border border-emerald-200">
                      🐄
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Chouhan Dairy Farm</h3>
                    <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest">
                      {completedBill.storeName || 'TRUCK OUTLET'} ({completedBill.storeAbbreviation || getStoreAbbreviation(completedBill.storeName || '')})
                    </p>
                  </div>

                  {/* Divider */}
                  <div className="my-6 border-b border-slate-100 relative z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 bg-white text-[10px] text-slate-300 font-mono">
                      {new Date(completedBill.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(completedBill.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </div>
                  </div>

                  {/* Customer Identity Card */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <span>Invoice Number</span>
                      <span>Customer</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-800 text-xs">
                      <span>#{completedBill.id}</span>
                      <span className="truncate max-w-[140px] text-right">{completedBill.customerName || 'Retail Customer'}</span>
                    </div>
                    {completedBill.isHomeDelivery && (
                      <div className="flex justify-between text-emerald-700 font-black text-[10px] mt-2 pt-2 border-t border-slate-200/60 uppercase tracking-wider">
                        <span className="flex items-center gap-1">🚚 Home Delivery</span>
                        <span>Fee: ₹{completedBill.deliveryCharges || 0}</span>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="mt-6 space-y-4 relative z-10">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                      <span>Item</span>
                      <span>Amount</span>
                    </div>
                    <div className="space-y-3 px-1">
                      {completedBill.items.map((it: any, idx: number) => {
                        const unitLabel = it.unit || 'kg';
                        const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
                        return (
                          <div key={idx} className="flex justify-between items-start group">
                            <div>
                              <p className="font-bold text-slate-900 text-sm capitalize">{it.vegetableName.toLowerCase()}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {it.quantity} {unitLabel} × ₹{it.pricePerKg}
                              </p>
                            </div>
                            <span className="font-bold text-slate-900 text-sm">₹{it.totalPrice.toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Calculations & Totals */}
                  <div className="mt-6 pt-4 border-t border-slate-100 space-y-2 relative z-10">
                    <div className="flex justify-between text-xs font-bold text-slate-500 px-1">
                      <span>Subtotal</span>
                      <span>₹{completedBill.subtotal ? completedBill.subtotal.toFixed(2) : completedBill.totalAmount.toFixed(2)}</span>
                    </div>
                    {completedBill.discount > 0 && (
                      <div className="flex justify-between text-xs font-bold text-rose-500 px-1">
                        <span>Discount Applied</span>
                        <span>-₹{completedBill.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {completedBill.isHomeDelivery && (
                      <div className="flex justify-between text-xs font-bold text-emerald-600 px-1">
                        <span>Delivery Charges</span>
                        <span>+₹{(completedBill.deliveryCharges || 0).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t-2 border-slate-900 flex justify-between items-end relative z-10">
                    <span className="font-black text-slate-900 tracking-tight">TOTAL</span>
                    <span className="text-2xl font-black text-emerald-600 tracking-tight">₹{completedBill.totalAmount.toFixed(2)}</span>
                  </div>

                  {completedBill.paymentMode && (
                    <div className="mt-4 bg-slate-900 text-white rounded-xl p-3 flex justify-between items-center text-[10px] uppercase font-bold tracking-wider relative z-10">
                      <span className="text-slate-400">Paid Via</span>
                      <span>{completedBill.paymentMode}</span>
                    </div>
                  )}

                  {/* Active quote */}
                  <div className="mt-6 text-center relative z-10">
                    <p className="text-[11px] italic font-medium text-slate-500 bg-slate-50 py-2 px-4 rounded-full inline-block border border-slate-100 shadow-inner">
                      "{billingQuote || "Health is the greatest wealth!"}"
                    </p>
                  </div>
                </div>

                `;

  const newCode = code.substring(0, startIndex) + newReceipt + code.substring(endIndex);
  fs.writeFileSync('src/components/StoreManager.tsx', newCode);
  console.log("Success fully replaced via markers!");
} else {
  console.log("Markers not found.");
}
