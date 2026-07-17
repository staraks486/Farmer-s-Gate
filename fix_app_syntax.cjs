const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  '{cpanelSettings?.companyLogo ? (', 
  'cpanelSettings?.companyLogo ? ('
).replace(
  '                    )}', 
  '                    )'
);

fs.writeFileSync('src/App.tsx', code);
