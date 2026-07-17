const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

const target1 = '<p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Plan Details</p>';
const rep1 = '<p className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center justify-end gap-1">Plan Details <button onClick={(e) => { e.stopPropagation(); handleQuickSetPrice(c); }} className="text-indigo-500 hover:text-indigo-700 ml-1 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded" title="Set Milk Price">✏️</button></p>';
if (code.includes(target1)) {
  code = code.replace(target1, rep1);
}

// And also let's add it for 'Both' milk types near the Cow/Buffalo price display
const target2 = '<span className="text-slate-200">|</span>';
const rep2 = '<span className="text-slate-200">|</span>';
if (!code.includes('handleQuickSetPrice(c) } } className="text-indigo-500 hover:text-indigo-700 ml-1 bg-white hover:bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 shadow-sm"')) {
    // Actually wait, let's just use the main Plan Details button which covers both
}

fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
