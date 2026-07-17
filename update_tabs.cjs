const fs = require('fs');
let code = fs.readFileSync('src/components/ManagementSuite.tsx', 'utf-8');

// Ensure 'all-store-records' is added to allowed tabs
code = code.replace(/allowedTabs\.includes\('customers'\)/g, "allowedTabs.includes('customers') && allowedTabs.includes('all-store-records')");
code = code.replace(/allowedTabs = \[\.\.\.allowedTabs, 'customers', 'customer-directory'\];/g, "allowedTabs = [...allowedTabs, 'customers', 'all-store-records', 'customer-directory'];");
code = code.replace(/\| 'customers' \| 'customer-directory'/g, "| 'customers' | 'all-store-records' | 'customer-directory'");

// Update the tabs array
code = code.replace(
  /\{ id: 'customers', name: 'Central Milk Ledger', icon: Users \},/,
  `{ id: 'customers', name: 'Central Milk Ledger', icon: Users },
    { id: 'all-store-records', name: 'All Store Milk Records', icon: StoreIcon },`
);

// Add descriptions
code = code.replace(
  /\{activeTab === 'customers' && 'Centralized record book for store milk records and rolling billing across all trading branches\.'\}/,
  `{activeTab === 'customers' && 'Aggregated collection of all milk records across all branches.'}
              {activeTab === 'all-store-records' && 'View and manage individual store milk records for all branches.'}`
);

// Add the rendering block
code = code.replace(
  /\{activeTab === 'customers' && \(\s*<CustomerMilkRegistry \/>\s*\)\}/,
  `{activeTab === 'customers' && (
            <CentralMilkLedger />
          )}

          {activeTab === 'all-store-records' && (
            <CustomerMilkRegistry />
          )}`
);

// Add import for CentralMilkLedger
code = code.replace(
  /import CustomerMilkRegistry from '\.\/CustomerMilkRegistry';/,
  `import CustomerMilkRegistry from './CustomerMilkRegistry';\nimport CentralMilkLedger from './CentralMilkLedger';`
);

fs.writeFileSync('src/components/ManagementSuite.tsx', code);
console.log("Updated ManagementSuite");
