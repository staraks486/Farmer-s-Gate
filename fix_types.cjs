const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf-8');

if (!code.includes('companyLogo?: string;')) {
  code = code.replace(/activeCity\?: string;/, "activeCity?: string;\n  companyLogo?: string;");
}
fs.writeFileSync('src/types.ts', code);
