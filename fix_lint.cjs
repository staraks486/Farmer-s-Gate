const fs = require('fs');
let code = fs.readFileSync('src/components/CentralMilkLedger.tsx', 'utf-8');
code = code.replace(/Filter /g, "");
fs.writeFileSync('src/components/CentralMilkLedger.tsx', code);
