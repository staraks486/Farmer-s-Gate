const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

// Replace the initFiles STORES_FILE block
const oldInit = `  if (!fs.existsSync(STORES_FILE)) {
    const defaultStores = [
      {
        id: 'store-1',
        name: "Farmer's Gate - Patiala Model Town",
        location: "Model Town, Patiala, Punjab",
        whatsappNumber: "919876543210",
        isActive: true,
        createdAt: new Date().toISOString(),
        password: "patiala123",
        version: 1
      },
      {
        id: 'store-2',
        name: "Farmer's Gate - Patiala Urban Estate",
        location: "Urban Estate Phase II, Patiala, Punjab",
        whatsappNumber: "919876543211",
        isActive: true,
        createdAt: new Date().toISOString(),
        password: "urban123",
        version: 1
      }
    ];
    fs.writeFileSync(STORES_FILE, JSON.stringify(defaultStores, null, 2));
  }`;

code = code.replace(oldInit, `  if (!fs.existsSync(STORES_FILE)) {
    fs.writeFileSync(STORES_FILE, JSON.stringify([], null, 2));
  }`);

fs.writeFileSync('server.ts', code);
