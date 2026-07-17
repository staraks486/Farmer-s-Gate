const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace.ts', 'utf-8');

const additionalSheets = `
  // Requirements
  values.push([]);
  values.push(['--- REQUIREMENTS ---']);
  values.push(['ID', 'Store ID', 'Vegetable', 'Requested Quantity', 'Status', 'Date']);
  if (data.requirements) {
    for (const r of data.requirements) {
      values.push([r.id, r.storeId, r.vegetableName, r.requestedQuantity, r.status, r.requestDate]);
    }
  }

  // Master Crops
  values.push([]);
  values.push(['--- MASTER CROPS ---']);
  values.push(['ID', 'Name', 'Category', 'Base Cost Price', 'Base Selling Price']);
  if (data.masterCrops) {
    for (const m of data.masterCrops) {
      values.push([m.id, m.vegetableName, m.category, m.baseCostPrice, m.baseSellingPrice]);
    }
  }

  // Officials
  values.push([]);
  values.push(['--- COMPANY OFFICIALS ---']);
  values.push(['ID', 'Name', 'Role', 'Email', 'Phone']);
  if (data.officials) {
    for (const o of data.officials) {
      values.push([o.id, o.name, o.role, o.email, o.phone]);
    }
  }
`;

code = code.replace(
  /const updateRes = await fetch/g,
  additionalSheets + "\n  const updateRes = await fetch"
);

fs.writeFileSync('src/lib/workspace.ts', code);
