const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

if (!code.includes('  X,')) {
  code = code.replace(
    /  Share2,/, 
    `  Share2,
  X,`
  );
}

fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
