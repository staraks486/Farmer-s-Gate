const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');

code = code.replace(
/const dataToBackup = \{\s+stores,\s+inventory,\s+purchases,\s+sales,\s+requirements,\s+masterCrops,\s+staffMembers,\s+companyOfficials,\s+promos\s+\};/g,
`const dataToBackup = {
        stores,
        inventory,
        requirements,
        masterCrops,
        officials
      };`
);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
