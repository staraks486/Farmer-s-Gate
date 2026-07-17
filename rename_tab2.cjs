const fs = require('fs');
let code = fs.readFileSync('src/components/ManagementSuite.tsx', 'utf-8');

code = code.replace(/\{ id: 'customers', name: 'Central Milk Ledger', icon: Users \}/g, "{ id: 'customers', name: 'Milk User Ledger', icon: Users }");
code = code.replace(/\{activeTab === 'customers' && 'Aggregated collection of all milk records across all branches\.'\}/g, "{activeTab === 'customers' && 'View and manage individual store milk records for all branches.'}");

fs.writeFileSync('src/components/ManagementSuite.tsx', code);
