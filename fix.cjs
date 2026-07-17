const fs = require('fs');
let code = fs.readFileSync('src/components/StoreManager.tsx', 'utf8');

const lines = code.split('\n');
const fixedLines = [];
let i = 0;
while (i < lines.length) {
  if (lines[i].includes('{Object.keys(posCart).length === 0 ? (')) {
    fixedLines.push(lines[i]);
    fixedLines.push('                    <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl p-6">');
    fixedLines.push('                      <span className="text-4xl block mb-2">🛒</span>');
    fixedLines.push('                      <h4 className="text-sm font-black text-slate-800">Your billing cart is empty</h4>');
    fixedLines.push('                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Browse crops in the Sale Items tab to add items and generate a bill receipt.</p>');
    fixedLines.push('                      <button ');
    fixedLines.push('                        onClick={() => setSaleSubView(\'items\')}');
    fixedLines.push('                        className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"');
    fixedLines.push('                      >');
    fixedLines.push('                        ← Browse Sale Items');
    fixedLines.push('                      </button>');
    fixedLines.push('                    </div>');
    fixedLines.push('                  ) : (');
    fixedLines.push('                    <div className="bg-white border border-slate-200/85 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">');
    fixedLines.push('                      {/* Home Delivery Selector */}');
    fixedLines.push('                      <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl">');
    fixedLines.push('                        <div className="flex items-center justify-between">');
    fixedLines.push('                          <label className="flex items-center gap-2 cursor-pointer text-sm font-black text-slate-700">');
    fixedLines.push('                            <input');
    fixedLines.push('                              type="checkbox"');
    fixedLines.push('                              checked={isHomeDelivery}');
    fixedLines.push('                              onChange={(e) => setIsHomeDelivery(e.target.checked)}');
    fixedLines.push('                              className="rounded text-emerald-600 focus:ring-emerald-500 w-5 h-5"');
    fixedLines.push('                            />');
    fixedLines.push('                            <span>🚚 Apply Home Delivery</span>');
    fixedLines.push('                          </label>');
    fixedLines.push('                          {isHomeDelivery && (');
    fixedLines.push('                            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">');
    fixedLines.push('                              <span className="text-xs text-slate-500 font-bold">Delivery Fee (₹):</span>');
    fixedLines.push('                              <input');
    fixedLines.push('                                type="number"');
    fixedLines.push('                                value={deliveryCharges}');
    fixedLines.push('                                onChange={(e) => setDeliveryCharges(parseFloat(e.target.value) || 0)}');
    fixedLines.push('                                className="w-16 rounded-lg border-none bg-slate-50 p-1 text-center font-mono text-sm font-bold text-emerald-700 focus:ring-0"');
    fixedLines.push('                              />');
    fixedLines.push('                            </div>');
    fixedLines.push('                          )}');
    fixedLines.push('                        </div>');
    fixedLines.push('                      </div>');

    // Skip ahead
    while (!lines[i].includes('{/* Customer Info Form */}')) {
      i++;
    }
  }
  
  if (i < lines.length) {
    fixedLines.push(lines[i]);
  }
  i++;
}

fs.writeFileSync('src/components/StoreManager.tsx', fixedLines.join('\n'));
console.log("Success");
