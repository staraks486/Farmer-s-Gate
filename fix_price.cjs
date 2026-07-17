const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

const quickSetPriceFn = `
  const handleQuickSetPrice = (c: MilkCustomer) => {
    if (c.milkType === 'Both') {
      const newCow = window.prompt(\`Enter new Cow Milk Price (₹/L) for \${c.name}:\`, (c.cowPrice ?? c.price ?? 60).toString());
      if (newCow === null) return;
      const newBuf = window.prompt(\`Enter new Buffalo Milk Price (₹/L) for \${c.name}:\`, (c.buffaloPrice ?? c.price ?? 75).toString());
      if (newBuf === null) return;
      
      setCustomers(prev => prev.map(cust => cust.id === c.id ? { ...cust, cowPrice: Number(newCow), buffaloPrice: Number(newBuf) } : cust));
    } else {
      const newPrice = window.prompt(\`Enter new \${c.milkType} Milk Price (₹/L) for \${c.name}:\`, c.price.toString());
      if (newPrice !== null) {
        setCustomers(prev => prev.map(cust => cust.id === c.id ? { ...cust, price: Number(newPrice) } : cust));
      }
    }
  };
`;

if (!code.includes('const handleQuickSetPrice')) {
  code = code.replace('const updateMilkQuantity = (userId: string, dateStr: string, quantity: number) => {', quickSetPriceFn + "\n  const updateMilkQuantity = (userId: string, dateStr: string, quantity: number) => {");
}

fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
