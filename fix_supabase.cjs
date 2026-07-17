const fs = require('fs');
let code = fs.readFileSync('src/lib/supabase.ts', 'utf-8');

// Replace DEFAULT_STORES with []
code = code.replace(/const DEFAULT_STORES: Store\[\] = \[[\s\S]*?\];\s*const DEFAULT_SALES/, 'const DEFAULT_STORES: Store[] = [];\n\nconst DEFAULT_SALES');
fs.writeFileSync('src/lib/supabase.ts', code);
