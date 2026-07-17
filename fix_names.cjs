const fs = require('fs');
let code = fs.readFileSync('src/components/StoreManager.tsx', 'utf8');

code = code.replace(/Farmer's Gate/gi, "Chouhan Dairy Farm");
code = code.replace(/FARMER'S GATE/g, "CHOUHAN DAIRY FARM");
code = code.replace(/Smart Mobile Mandi outlets\. Eat fresh, live active!/g, "Premium Fresh Milk. Stay healthy!");

fs.writeFileSync('src/components/StoreManager.tsx', code);
console.log("Success replacing names");
