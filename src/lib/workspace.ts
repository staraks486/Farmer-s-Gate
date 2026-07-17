import { GoogleAuthProvider, signInWithPopup, User } from 'firebase/auth';
import { auth } from './firebase';

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const syncToGoogleSheets = async (data: any) => {
  let token = cachedAccessToken;
  if (!token) {
    const res = await googleSignIn();
    if (res) token = res.accessToken;
  }
  if (!token) throw new Error("No Google token available");

  // Create a new sheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: `Farmer's Gate Backup - ${new Date().toLocaleString()}`,
      }
    })
  });
  
  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Failed to create spreadsheet: ${errorText}`);
  }
  
  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // We will convert data to CSV / 2D array and append to the sheet
  const values = [];
  
  // Stores
  values.push(['--- STORES ---']);
  values.push(['ID', 'Name', 'Location', 'Phone', 'Created']);
  if (data.stores) {
    for (const store of data.stores) {
      values.push([store.id, store.name, store.location, store.whatsappNumber, store.createdAt]);
    }
  }

  // Purchases
  values.push([]);
  values.push(['--- PURCHASES ---']);
  values.push(['ID', 'Store ID', 'Vegetable', 'Quantity', 'Cost', 'Supplier', 'Date']);
  if (data.purchases) {
    for (const p of data.purchases) {
      values.push([p.id, p.storeId, p.vegetableName, p.quantity, p.totalCost, p.supplierName, p.purchaseDate]);
    }
  }

  // Sales
  values.push([]);
  values.push(['--- SALES ---']);
  values.push(['ID', 'Store ID', 'Vegetable', 'Quantity', 'Price', 'Customer', 'Date']);
  if (data.sales) {
    for (const s of data.sales) {
      values.push([s.id, s.storeId, s.vegetableName, s.quantity, s.totalPrice, s.customerName, s.saleDate]);
    }
  }

  // Inventory
  values.push([]);
  values.push(['--- INVENTORY ---']);
  values.push(['ID', 'Store ID', 'Vegetable', 'Quantity', 'Cost Price', 'Selling Price']);
  if (data.inventory) {
    for (const i of data.inventory) {
      values.push([i.id, i.storeId, i.vegetableName, i.quantity, i.costPrice, i.sellingPrice]);
    }
  }

  
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

  const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:G${values.length}?valueInputOption=USER_ENTERED`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: values
    })
  });

  if (!updateRes.ok) {
    const errorText = await updateRes.text();
    throw new Error(`Failed to update spreadsheet: ${errorText}`);
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
};
