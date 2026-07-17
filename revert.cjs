const fs = require('fs');
let code = fs.readFileSync('src/components/ManagementSuite.tsx', 'utf-8');

// Remove Central Milk Ledger import and rendering
code = code.replace(/import CentralMilkLedger from '\.\/CentralMilkLedger';\n/, '');
code = code.replace(/\{activeTab === 'customers' && \(\s*<CentralMilkLedger \/>\s*\)\}\s*\{activeTab === 'all-store-records' && \(\s*<CustomerMilkRegistry \/>\s*\)\}/, 
`{activeTab === 'customers' && (
            <CustomerMilkRegistry />
          )}`);

// Revert allowed tabs logic
code = code.replace(/if \(!isStorePosPortal && \(!allowedTabs\.includes\('customers'\) \|\| !allowedTabs\.includes\('all-store-records'\)\)\) \{/,
"if (!isStorePosPortal && !allowedTabs.includes('customers')) {");
code = code.replace(/allowedTabs = \[\.\.\.allowedTabs, 'customers', 'all-store-records', 'customer-directory'\];/, 
"allowedTabs = [...allowedTabs, 'customers', 'customer-directory'];");
code = code.replace(/const \[activeTab, setActiveTab\] = useState\<'dashboard' \| 'headoffice' \| 'store' \| 'suppliers' \| 'accounts' \| 'admin' \| 'staff' \| 'customers' \| 'all-store-records' \| 'customer-directory'\>\(defaultTab\);/,
"const [activeTab, setActiveTab] = useState<'dashboard' | 'headoffice' | 'store' | 'suppliers' | 'accounts' | 'admin' | 'staff' | 'customers' | 'customer-directory'>(defaultTab);");

// Remove the all-store-records tab and descriptions
code = code.replace(/\{ id: 'all-store-records', name: 'All Store Milk Records', icon: StoreIcon \},/, '');
code = code.replace(/\{activeTab === 'all-store-records' && 'View and manage individual store milk records for all branches\.'\}/, '');

// Fix the auto store creation
code = code.replace(/if \(finalStores\.length === 0 && !deletedIds\.includes\('store-1'\)\) \{[\s\S]*?finalStores = \[defaultStore\];\s*\}/, "");

fs.writeFileSync('src/components/ManagementSuite.tsx', code);
