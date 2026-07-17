const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

code = code.replace(
  /const recentLogs = \(c\.logs \|\| \[\]\)/,
  "const recentLogs = (c.milkTakenLogs || [])"
);

fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
