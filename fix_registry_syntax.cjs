const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

code = code.replace(
  '  ChevronDown\n  FileText,', 
  '  ChevronDown,\n  FileText,'
);

fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
