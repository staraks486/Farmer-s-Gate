const fs = require('fs');
let code = fs.readFileSync('src/components/ManagementSuite.tsx', 'utf-8');

code = code.replace(
  /if \(!isStorePosPortal && !allowedTabs\.includes\('customers'\) && allowedTabs\.includes\('all-store-records'\)\) \{/g,
  "if (!isStorePosPortal && (!allowedTabs.includes('customers') || !allowedTabs.includes('all-store-records'))) {"
);

fs.writeFileSync('src/components/ManagementSuite.tsx', code);
console.log("Fixed allowed tabs logic.");
