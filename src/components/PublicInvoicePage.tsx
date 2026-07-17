import React, { useEffect, useState } from 'react';
import { FileText, Printer, Check, Download, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';

interface PublicInvoicePageProps {
  invoiceId: string;
  onClose: () => void;
}

export default function PublicInvoicePage({ invoiceId, onClose }: PublicInvoicePageProps) {
  const [invoice, setInvoice] = useState<any | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    try {
      const savedBillsStr = localStorage.getItem('fg_bills') || '[]';
      const parsed = JSON.parse(savedBillsStr);
      const matched = parsed.find((b: any) => b.id.toLowerCase() === invoiceId.toLowerCase());
      
      if (matched) {
        setInvoice(matched);
      } else {
        // Fallback: Check if there's an active completed bill in state
        const activeStr = localStorage.getItem('fg_active_completed_bill');
        if (activeStr) {
          const active = JSON.parse(activeStr);
          if (active && active.id.toLowerCase() === invoiceId.toLowerCase()) {
            setInvoice(active);
            return;
          }
        }
        setError(`Invoice details for reference "${invoiceId}" could not be found locally.`);
      }
    } catch (e) {
      setError('An error occurred while loading this receipt.');
    }
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!invoice) return;
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 150] // receipt style format
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("FARMER'S GATE RETAIL", 40, 10, { align: 'center' });
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text(invoice.storeName || "Farmer's Gate Fresh Store", 40, 14, { align: 'center' });
      doc.text(invoice.storeLocation || "Punjab, India", 40, 18, { align: 'center' });
      
      doc.setFont("helvetica", "bold");
      doc.text("INVOICE RECEIPT", 40, 24, { align: 'center' });
      doc.line(5, 26, 75, 26);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(`Invoice ID: ${invoice.id}`, 5, 30);
      doc.text(`Store ID: ${invoice.storeId || 'N/A'}`, 5, 34);
      doc.text(`Date: ${invoice.date}`, 5, 38);
      doc.text(`Customer: ${invoice.customerName || 'Retail Customer'}`, 5, 42);
      
      let nextY = 42;
      if (invoice.salespersonName) {
        nextY += 4;
        doc.text(`Salesperson: ${invoice.salespersonName}`, 5, nextY);
      }
      nextY += 3;
      doc.line(5, nextY, 75, nextY);
      
      nextY += 4;
      doc.setFont("helvetica", "bold");
      doc.text("Item Summary", 5, nextY);
      doc.text("Qty", 48, nextY);
      doc.text("Rate", 58, nextY);
      doc.text("Total", 75, nextY, { align: 'right' });
      nextY += 2;
      doc.line(5, nextY, 75, nextY);
      
      doc.setFont("helvetica", "normal");
      let currentY = nextY + 4;
      invoice.items.forEach((item: any) => {
        const namePart = item.vegetableName.split('(')[0].trim();
        doc.text(namePart, 5, currentY);
        doc.text(`${item.quantity} ${item.unit || 'kg'}`, 48, currentY);
        doc.text(`Rs.${item.pricePerKg}`, 58, currentY);
        doc.text(`Rs.${item.totalPrice.toFixed(2)}`, 75, currentY, { align: 'right' });
        currentY += 4.5;
      });
      
      doc.line(5, currentY, 75, currentY);
      currentY += 4.5;
      
      doc.setFont("helvetica", "bold");
      doc.text("Subtotal:", 48, currentY);
      doc.setFont("helvetica", "normal");
      doc.text(`Rs.${(invoice.subtotal || invoice.totalAmount).toFixed(2)}`, 75, currentY, { align: 'right' });
      currentY += 4;
      
      if (invoice.discount && invoice.discount > 0) {
        doc.setFont("helvetica", "bold");
        doc.text("Discount:", 48, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(`-Rs.${invoice.discount.toFixed(2)}`, 75, currentY, { align: 'right' });
        currentY += 4;
      }
      
      if (invoice.isHomeDelivery) {
        doc.setFont("helvetica", "bold");
        doc.text("Delivery:", 48, currentY);
        doc.setFont("helvetica", "normal");
        doc.text(`+Rs.${(invoice.deliveryCharges || 0).toFixed(2)}`, 75, currentY, { align: 'right' });
        currentY += 4;
      }
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("Net Payable:", 48, currentY);
      doc.text(`Rs.${invoice.totalAmount.toFixed(2)}`, 75, currentY, { align: 'right' });
      currentY += 6;
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      if (invoice.paymentMode) {
        doc.text(`Payment Mode: ${invoice.paymentMode.toUpperCase()}`, 40, currentY, { align: 'center' });
        currentY += 4.5;
      }
      
      doc.text("🍎 Fresh from farm to keep you strong!", 40, currentY, { align: 'center' });
      currentY += 4;
      doc.text("Thank you for shopping! Eat Healthy, Live Active!", 40, currentY, { align: 'center' });
      
      doc.save(`farmersgate_invoice_${invoice.id}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Failed to export PDF format.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f4fbf7] flex flex-col justify-between py-6 px-4 sm:px-6 lg:px-8 font-sans antialiased text-slate-800">
      {/* Print styles override */}
      <style>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-container {
            border: none !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
        }
      `}</style>

      <div className="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl print-container">
        {error ? (
          <div className="text-center space-y-4 py-8">
            <div className="h-14 w-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-850">Receipt Not Found</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">{error}</p>
            </div>
            <div className="pt-4">
              <p className="text-slate-400 text-[10px] font-bold">Please close this tab or window to exit.</p>
            </div>
          </div>
        ) : !invoice ? (
          <div className="text-center py-12 space-y-3">
            <div className="h-10 w-10 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-bold">Verifying security token and loading invoice details...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Receipt Header */}
            <div className="text-center pb-4 border-b border-dashed border-slate-200">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mb-2.5">
                <FileText className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-800 uppercase">Farmer's Gate Retail</h2>
              <p className="text-[11px] font-black tracking-wider text-emerald-600 uppercase mt-0.5">{invoice.storeName || "Fresh Farm Retail"}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{invoice.storeLocation || "Patiala, Punjab"}</p>
            </div>

            {/* Bill Info */}
            <div className="grid grid-cols-2 gap-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-black uppercase text-[9px] block">Invoice Reference</span>
                <span className="font-extrabold text-slate-800">{invoice.id}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-black uppercase text-[9px] block">Billing Date</span>
                <span className="font-bold text-slate-800">{invoice.date}</span>
              </div>
              <div>
                <span className="text-slate-400 font-black uppercase text-[9px] block">Billed To</span>
                <span className="font-bold text-slate-800">{invoice.customerName}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-black uppercase text-[9px] block">Store ID / Code</span>
                <span className="font-extrabold text-indigo-700 font-mono uppercase">{invoice.storeId || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-black uppercase text-[9px] block">Payment Mode</span>
                <span className="font-extrabold text-emerald-600 uppercase">{invoice.paymentMode || 'CASH'}</span>
              </div>
              {invoice.salespersonName && (
                <div className="text-right">
                  <span className="text-slate-400 font-black uppercase text-[9px] block">Salesperson</span>
                  <span className="font-extrabold text-slate-800 uppercase">{invoice.salespersonName}</span>
                </div>
              )}
            </div>

            {/* Items Summary Table */}
            <div className="border-t border-b border-dashed border-slate-200 py-3">
              <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Itemized Summary</span>
              <div className="space-y-2.5">
                {invoice.items.map((item: any, idx: number) => {
                  const unitLabel = item.unit || 'kg';
                  const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
                  return (
                    <div key={idx} className="flex justify-between items-start text-xs">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="font-extrabold text-slate-800 truncate">{item.vegetableName}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-bold font-mono">
                          {item.quantity} {unitLabel} × ₹{item.pricePerKg}/{baseLabel}
                        </p>
                      </div>
                      <span className="font-mono font-black text-slate-800 shrink-0">
                        ₹{item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Calculations block */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500 font-bold">
                <span>Subtotal Amount:</span>
                <span className="font-mono font-black">₹{(invoice.subtotal || invoice.totalAmount).toFixed(2)}</span>
              </div>
              {invoice.discount !== undefined && invoice.discount > 0 && (
                <div className="flex justify-between text-rose-600 font-extrabold bg-rose-50/50 px-2 py-1 rounded-lg">
                  <span className="flex items-center gap-1">
                    <span>🏷️ Applied Discount:</span>
                    {invoice.appliedPromoCode && (
                      <span className="bg-rose-100 text-rose-800 text-[8px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded">
                        {invoice.appliedPromoCode}
                      </span>
                    )}
                  </span>
                  <span className="font-mono">-₹{invoice.discount.toFixed(2)}</span>
                </div>
              )}
              {invoice.isHomeDelivery && (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50/50 px-2 py-1 rounded-lg">
                  <span>🚚 Delivery Charges:</span>
                  <span className="font-mono">+₹{(invoice.deliveryCharges || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-slate-800 font-black border-t border-slate-100 pt-2 text-sm">
                <span>Total Amount Paid:</span>
                <span className="font-mono text-emerald-600 text-base">₹{invoice.totalAmount.toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Greeting */}
            <div className="text-center pt-2 space-y-1">
              <span className="inline-block bg-emerald-50 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded">🌱 Secure Live Invoice</span>
              <p className="text-[10px] text-slate-400 font-bold">Choosing fresh veggies keeps you strong and energized! Thank you for supporting organic local farms.</p>
            </div>

            {/* Controls Side-Panel (no-print) */}
            <div className="no-print pt-4 border-t border-slate-100 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  <Printer className="h-4 w-4" />
                  Print Receipt
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  <Download className="h-4 w-4" />
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
