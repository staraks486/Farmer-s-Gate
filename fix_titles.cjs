const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

// For HQ view
code = code.replace(
  /<div className="inline-flex items-center gap-1\.5 bg-emerald-800 text-emerald-300 font-black text-\[9px\] uppercase tracking-widest px-2\.5 py-1 rounded-full border border-emerald-700\/50">\s*<Sparkles className="h-3 w-3" \/> Store Milk Record\s*<\/div>\s*<h2 className="text-xl font-black uppercase tracking-tight font-sans">Store Milk Record<\/h2>\s*<p className="text-xs text-emerald-200 max-w-xl">\s*Centralized record book for store milk records/g,
  `<div className="inline-flex items-center gap-1.5 bg-emerald-800 text-emerald-300 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-700/50">
            <Sparkles className="h-3 w-3" /> Central Module
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight font-sans">Central Milk Ledger</h2>
          <p className="text-xs text-emerald-200 max-w-xl">
            Centralized record book for store milk records`
);

fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
