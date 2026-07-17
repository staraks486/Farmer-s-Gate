const fs = require('fs');
let code = fs.readFileSync('src/components/ManagementSuite.tsx', 'utf-8');

code = code.replace(/name: 'Milk User Ledger'/g, "name: 'Central Milk Ledger'");
code = code.replace(/\{activeTab === 'customers' && 'Centralized record book for milk user ledgers/g, "{activeTab === 'customers' && 'Centralized record book for store milk records");

fs.writeFileSync('src/components/ManagementSuite.tsx', code);
