const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

// The DEFAULT_INVENTORY was removed but it's still used in initializeDemoData
// Let's just remove the usage or provide an empty array
code = code.replace(/localStorage\.setItem\('fg_inventory', JSON\.stringify\(DEFAULT_INVENTORY\)\);/g, "localStorage.setItem('fg_inventory', JSON.stringify([]));");
code = code.replace(/localStorage\.setItem\('fg_stores', JSON\.stringify\(DEFAULT_STORES\)\);/g, "localStorage.setItem('fg_stores', JSON.stringify([]));");
code = code.replace(/localStorage\.setItem\('fg_sales', JSON\.stringify\(DEFAULT_SALES\)\);/g, "localStorage.setItem('fg_sales', JSON.stringify([]));");

fs.writeFileSync('src/lib/supabase.ts', code);
