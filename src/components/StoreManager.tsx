import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  ShoppingBag, 
  Package, 
  Plus, 
  Trash2, 
  Search, 
  Send, 
  AlertTriangle, 
  PlusCircle, 
  RefreshCw, 
  CheckCircle2, 
  PhoneCall, 
  Info,
  Layers,
  ArrowRight,
  Minus,
  ShoppingCart,
  IndianRupee,
  X
} from 'lucide-react';
import { Store, Sale, Purchase, InventoryItem, Requirement, CustomerOrder } from '../types';
import { dbGetForceOffline, dbSetForceOffline, getSupabaseConfig } from '../lib/supabase';

interface StoreManagerProps {
  store: Store;
  sales: Sale[];
  purchases: Purchase[];
  inventory: InventoryItem[];
  requirements: Requirement[];
  customerOrders?: CustomerOrder[];
  role?: string;
  onAddSale: (sale: Sale) => void;
  onDeleteSale: (id: string) => void;
  onAddPurchase: (purchase: Purchase) => void;
  onDeletePurchase: (id: string) => void;
  onUpdateInventoryItem: (item: InventoryItem) => void;
  onAddRequirement: (req: Requirement) => void;
  onUpdateRequirementStatus: (id: string, status: 'Pending' | 'Ordered' | 'Fulfilled') => void;
  onDeleteRequirement: (id: string) => void;
  onFulfillCustomerOrder?: (order: CustomerOrder) => void;
  onUpdateCustomerOrder?: (order: CustomerOrder) => void;
  onDeleteCustomerOrder?: (id: string) => void;
}

interface PosCartItem {
  quantity: number;
  unit: 'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag';
  pricePerKg: number;
  item: InventoryItem;
}

const HEALTHY_QUOTES = [
  "Let food be thy medicine and medicine be thy food. 🥦",
  "Eat fresh, buy local, support organic farmers! 🍎",
  "Fruits and vegetables are the best source of natural vitamins and hydration. 🍋",
  "Eat your greens, get your fiber, stay energetic all day long! 🥬",
  "Every vegetable has a story of sunshine, water, and soil. Enjoy nature's recipe! ☀️🌱",
  "Stay hydrated and eat colorful fruits for a glowing skin and clear mind! 🍇",
  "Good nutrition is a long-term investment. Choose fresh organic veggies! 🥔🫚",
  "Healthy eating is not a diet; it's a lifestyle of appreciation for nature's gifts. 🍊",
  "An apple a day keeps the doctor away, but a basket of greens keeps you vibrant! 🥗",
  "Eat your colors! Every bright vegetable brings unique nutrition and protection. 🍅🥕",
  "Freshly harvested food is nature's medicine. Stay healthy, stay strong! 🌾",
  "Good health is the greatest wealth. Treat your body to nature's finest produce! 🌱",
  "From farm to fork, fresh and local produce is always the healthiest choice! 🚜🍎"
];

const getItemCategory = (name: string): 'Vegetable' | 'Fruit' | 'Grocery' => {
  const lower = name.toLowerCase();
  
  // Fruits keywords
  const fruitKeywords = [
    'banana', 'avocado', 'lemon', 'apple', 'mango', 'orange', 'grape', 'strawberry', 
    'papaya', 'watermelon', 'pineapple', 'pomegranate', 'fruit', 'guava', 'peach', 
    'pear', 'plum', 'cherry', 'kiwi', 'blueberry', 'coconut', 'melon', 'lime', 'kela', 'seb', 'aam'
  ];
  
  // Grocery keywords
  const groceryKeywords = [
    'rice', 'wheat', 'flour', 'sugar', 'salt', 'oil', 'dal', 'pulse', 'spice', 
    'garlic', 'ginger', 'coriander', 'chili', 'chilli', 'mushroom', 'egg', 'bread', 
    'milk', 'butter', 'cheese', 'tea', 'coffee', 'grocery', 'pack', 'bottle', 
    'box', 'can', 'masala', 'paneer', 'ghee', 'lentil', 'sauce', 'vinegar', 'dhaniya'
  ];
  
  if (fruitKeywords.some(keyword => lower.includes(keyword))) {
    return 'Fruit';
  }
  
  if (groceryKeywords.some(keyword => lower.includes(keyword))) {
    return 'Grocery';
  }
  
  return 'Vegetable';
};

const PREDEFINED_REQS = [
  "Apple Fuji",
  "Apple Indian",
  "Avocado",
  "Banana Robusta",
  "Blueberry",
  "Box Kiwi Gold Zespri",
  "Box Kiwi Green",
  "Broccoli Premium",
  "Cabbage",
  "Capsicum Red",
  "Capsicum Yellow",
  "Carrot",
  "Cauliflower",
  "Cherry",
  "Coriander",
  "Garlic",
  "Ginger",
  "Green Chili",
  "Lemon",
  "Mushroom Button",
  "Onion",
  "Orange Malta",
  "Pomegranate",
  "Potato",
  "Spinach",
  "Strawberry",
  "Tomato"
];

export default function StoreManager({
  store,
  sales,
  purchases,
  inventory,
  requirements,
  customerOrders = [],
  role,
  onAddSale,
  onDeleteSale,
  onAddPurchase,
  onDeletePurchase,
  onUpdateInventoryItem,
  onAddRequirement,
  onUpdateRequirementStatus,
  onDeleteRequirement,
  onFulfillCustomerOrder,
  onUpdateCustomerOrder,
  onDeleteCustomerOrder
}: StoreManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sale' | 'sales-history' | 'purchase' | 'inventory' | 'requirements' | 'info'>('sale');
  const [offlineMode, setOfflineMode] = useState<boolean>(dbGetForceOffline());
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);

  const handleToggleOfflineMode = () => {
    const nextVal = !offlineMode;
    dbSetForceOffline(nextVal);
    setOfflineMode(nextVal);
    if (nextVal) {
      alert("Offline Mode is active. This store branch will operate completely on lightning-fast local cache.");
    } else {
      alert("Online Sync is active. Synchronizing with central database.");
    }
    window.location.reload();
  };

  // Search and Filters
  const [vegSearchQuery, setVegSearchQuery] = useState('');

  // 1. STATE FOR SALE TAB
  const [saleVegName, setSaleVegName] = useState('');
  const [saleQty, setSaleQty] = useState<number>(0);
  const [saleUnit, setSaleUnit] = useState<'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag'>('kg');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [saleCustomer, setSaleCustomer] = useState('');
  const [saleWarning, setSaleWarning] = useState('');

  // NEW: State for User Friendly Quick POS Sale Mode
  const [saleMode, setSaleMode] = useState<'pos' | 'classic'>('pos');
  const [mobilePosTab, setMobilePosTab] = useState<'crops' | 'cart'>('crops');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [billingQuote, setBillingQuote] = useState('');
  const [posCart, setPosCart] = useState<Record<string, PosCartItem>>({});
  const [posCustomerName, setPosCustomerName] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [activeCropFilter, setActiveCropFilter] = useState<'ALL' | 'VEGGIES' | 'FRUITS' | 'GROCERY'>('ALL');
  const [rowInputs, setRowInputs] = useState<Record<string, { quantity: string; unit: string }>>({});
  const [completedBill, setCompletedBill] = useState<{
    id: string;
    customerName?: string;
    items: { vegetableName: string; quantity: number; unit?: string; pricePerKg: number; totalPrice: number }[];
    totalAmount: number;
    date: string;
  } | null>(null);

  useEffect(() => {
    // Select a random healthy quote
    const randomIdx = Math.floor(Math.random() * HEALTHY_QUOTES.length);
    setBillingQuote(HEALTHY_QUOTES[randomIdx]);
  }, [completedBill]);

  // Vegetable illustrative descriptors / emoji helpers
  const getVegEmoji = (name: string): string => {
    const lowercase = name.toLowerCase();
    if (lowercase.includes('tomato')) return '🍅';
    if (lowercase.includes('potato')) return '🥔';
    if (lowercase.includes('onion')) return '🧅';
    if (lowercase.includes('spinach') || lowercase.includes('palak')) return '🥬';
    if (lowercase.includes('cauliflower') || lowercase.includes('gobhi')) return '🥦';
    if (lowercase.includes('carrot')) return '🥕';
    if (lowercase.includes('mango')) return '🥭';
    if (lowercase.includes('banana') || lowercase.includes('kela')) return '🍌';
    if (lowercase.includes('apple') || lowercase.includes('seb')) return '🍎';
    if (lowercase.includes('chili') || lowercase.includes('mirch')) return '🌶️';
    if (lowercase.includes('garlic') || lowercase.includes('lahsun')) return '🧄';
    if (lowercase.includes('ginger') || lowercase.includes('adrak')) return '🫚';
    if (lowercase.includes('cucumber') || lowercase.includes('kheera')) return '🥒';
    if (lowercase.includes('lemon') || lowercase.includes('nimbu')) return '🍋';
    if (lowercase.includes('orange') || lowercase.includes('santra')) return '🍊';
    if (lowercase.includes('grape')) return '🍇';
    if (lowercase.includes('pea')) return '🫛';
    if (lowercase.includes('corn')) return '🌽';
    if (lowercase.includes('eggplant') || lowercase.includes('brinjal') || lowercase.includes('baingan')) return '🍆';
    return '🌱';
  };

  const getCropCategory = (name: string): 'VEGGIES' | 'FRUITS' | 'GROCERY' => {
    const lowercase = name.toLowerCase();
    if (
      lowercase.includes('apple') || 
      lowercase.includes('banana') || 
      lowercase.includes('blueberry') || 
      lowercase.includes('kiwi') || 
      lowercase.includes('cherry') || 
      lowercase.includes('strawberry') || 
      lowercase.includes('orange') || 
      lowercase.includes('mango') || 
      lowercase.includes('pomegranate') || 
      lowercase.includes('lemon') || 
      lowercase.includes('grape') || 
      lowercase.includes('avocado') || 
      lowercase.includes('papaya') || 
      lowercase.includes('watermelon')
    ) {
      return 'FRUITS';
    }
    if (
      lowercase.includes('pack') || 
      lowercase.includes('box') || 
      lowercase.includes('grocery') || 
      lowercase.includes('masala') || 
      lowercase.includes('sauce') || 
      lowercase.includes('dry') || 
      lowercase.includes('oil') || 
      lowercase.includes('sugar') || 
      lowercase.includes('salt') || 
      lowercase.includes('rice') || 
      lowercase.includes('wheat')
    ) {
      return 'GROCERY';
    }
    return 'VEGGIES';
  };

  const getSubtotal = (cartItem: PosCartItem) => {
    if (cartItem.unit === 'g') {
      return (cartItem.quantity / 1000) * cartItem.pricePerKg;
    }
    return cartItem.quantity * cartItem.pricePerKg;
  };

  const handleAddToPosCart = (item: InventoryItem) => {
    setPosCart(prev => {
      const existing = prev[item.vegetableName];
      const nextQty = existing ? existing.quantity + 1 : 1;
      
      return {
        ...prev,
        [item.vegetableName]: {
          quantity: nextQty,
          unit: existing ? existing.unit : 'kg',
          pricePerKg: existing ? existing.pricePerKg : item.sellingPrice,
          item: item
        }
      };
    });
  };

  const handleAddToPosCartWithParams = (
    item: InventoryItem, 
    qty: number, 
    unit: 'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag'
  ) => {
    setPosCart(prev => {
      return {
        ...prev,
        [item.vegetableName]: {
          quantity: qty,
          unit: unit,
          pricePerKg: item.sellingPrice,
          item: item
        }
      };
    });
  };

  const handleUpdatePosCartQty = (vegName: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveFromPosCart(vegName);
      return;
    }
    setPosCart(prev => {
      const existing = prev[vegName];
      if (!existing) return prev;
      return {
        ...prev,
        [vegName]: {
          ...existing,
          quantity: parseFloat(qty.toFixed(2))
        }
      };
    });
  };

  const getKgConversionRate = (unit: string): number => {
    switch (unit) {
      case 'g': return 0.001;
      case 'kg': return 1;
      case 'pcs': return 0.25; // 250g per piece approx
      case 'bunch': return 0.3; // 300g per bunch approx
      case 'pack': return 0.5; // 500g per pack approx
      case 'box': return 10; // 10kg per box approx
      case 'crate': return 20; // 20kg per crate approx
      case 'sack': return 50; // 50kg per sack approx
      case 'dozen': return 2.5; // 2.5kg per dozen approx
      case 'bundle': return 0.4; // 400g per bundle approx
      case 'bag': return 5; // 5kg per bag approx
      default: return 1;
    }
  };

  const getUnitMultiplier = (unit: string): number => {
    switch (unit) {
      case 'g': return 1; // Base is kg
      case 'kg': return 1;
      case 'pcs': return 0.25;
      case 'bunch': return 0.3;
      case 'pack': return 0.5;
      case 'box': return 10;
      case 'crate': return 20;
      case 'sack': return 50;
      case 'dozen': return 2.5;
      case 'bundle': return 0.4;
      case 'bag': return 5;
      default: return 1;
    }
  };

  const handleUpdatePosCartUnit = (
    vegName: string, 
    unit: 'kg' | 'g' | 'pcs' | 'bunch' | 'pack' | 'box' | 'crate' | 'sack' | 'dozen' | 'bundle' | 'bag'
  ) => {
    setPosCart(prev => {
      const existing = prev[vegName];
      if (!existing) return prev;
      
      let newQty = existing.quantity;
      if (existing.unit === 'kg' && unit === 'g') {
        newQty = existing.quantity * 1000;
      } else if (existing.unit === 'g' && unit === 'kg') {
        newQty = existing.quantity / 1000;
      } else if ((existing.unit === 'kg' || existing.unit === 'g') && unit !== 'kg' && unit !== 'g') {
        newQty = 1;
      } else if (existing.unit !== 'kg' && existing.unit !== 'g' && (unit === 'kg' || unit === 'g')) {
        newQty = unit === 'kg' ? 1 : 500;
      }

      // Convert price automatically
      const oldMult = getUnitMultiplier(existing.unit);
      const newMult = getUnitMultiplier(unit);
      let newPrice = existing.pricePerKg;
      if (existing.unit === 'g') {
        newPrice = existing.pricePerKg * newMult;
      } else if (unit === 'g') {
        newPrice = existing.pricePerKg / oldMult;
      } else {
        newPrice = (existing.pricePerKg / oldMult) * newMult;
      }
      
      return {
        ...prev,
        [vegName]: {
          ...existing,
          unit: unit,
          quantity: parseFloat(newQty.toFixed(2)),
          pricePerKg: parseFloat(newPrice.toFixed(2))
        }
      };
    });
  };

  const handleUpdatePosCartPrice = (vegName: string, price: number) => {
    if (price < 0) return;
    setPosCart(prev => {
      const existing = prev[vegName];
      if (!existing) return prev;
      return {
        ...prev,
        [vegName]: {
          ...existing,
          pricePerKg: price
        }
      };
    });
  };

  const handleRemoveFromPosCart = (vegName: string) => {
    setPosCart(prev => {
      const next = { ...prev };
      delete next[vegName];
      return next;
    });
  };

  const handleClearPosCart = () => {
    setPosCart({});
    setPosCustomerName('');
  };

  const handlePosCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cartItems = Object.keys(posCart).map(key => posCart[key]);
    if (cartItems.length === 0) return;

    // Check stock levels first for warnings
    let overStockAlerts = [];
    for (const cartItem of cartItems) {
      const deduction = cartItem.quantity * getKgConversionRate(cartItem.unit);
      if (deduction > cartItem.item.quantity) {
        overStockAlerts.push(`${cartItem.item.vegetableName} (Buying ${cartItem.quantity}${cartItem.unit}, stock has ${cartItem.item.quantity.toFixed(2)}kg)`);
      }
    }

    if (overStockAlerts.length > 0) {
      if (!confirm(`Warning: The following items exceed registered stock levels:\n\n` + overStockAlerts.join('\n') + `\n\nDo you want to force checkout and allow negative/zero stock adjust?`)) {
        return;
      }
    }

    // Prepare Bill summary
    const billItems = cartItems.map(cartItem => {
      const sub = getSubtotal(cartItem);
      return {
        vegetableName: cartItem.item.vegetableName,
        quantity: cartItem.quantity,
        unit: cartItem.unit,
        pricePerKg: cartItem.pricePerKg,
        totalPrice: parseFloat(sub.toFixed(2))
      };
    });
    const totalAmount = billItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    // Call onAddSale for each item
    cartItems.forEach((cartItem, idx) => {
      const deduction = cartItem.quantity * getKgConversionRate(cartItem.unit);
      const sub = getSubtotal(cartItem);
      const newSale: Sale = {
        id: `sale-${Date.now()}-${idx}-${Math.floor(Math.random() * 100)}`,
        storeId: store.id,
        vegetableName: cartItem.item.vegetableName,
        quantity: parseFloat(deduction.toFixed(3)),
        unit: cartItem.unit,
        pricePerKg: cartItem.pricePerKg,
        totalPrice: parseFloat(sub.toFixed(2)),
        customerName: posCustomerName.trim() || undefined,
        saleDate: new Date().toISOString()
      };
      onAddSale(newSale);
    });

    // Set completed bill
    setCompletedBill({
      id: `FG-BILL-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName: posCustomerName.trim() || 'Retail Customer',
      items: billItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      date: new Date().toLocaleString()
    });

    // Clear cart
    setPosCart({});
    setPosCustomerName('');
    setShowCheckoutModal(false);
  };

  const handleSendWhatsApp = () => {
    if (!completedBill) return;
    
    let msg = `*RECEIPT - INVOICE ${completedBill.id}*\n`;
    msg += `*Store:* ${store.name}\n`;
    msg += `*Date:* ${completedBill.date}\n`;
    msg += `*Customer:* ${completedBill.customerName || 'Retail Customer'}\n\n`;
    msg += `*Items Purchased:*\n`;
    
    completedBill.items.forEach((it, idx) => {
      const unitLabel = (it as any).unit || 'kg';
      const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
      msg += `${idx + 1}. ${it.vegetableName} - ${it.quantity} ${unitLabel} @ ₹${it.pricePerKg}/${baseLabel} = *₹${it.totalPrice.toFixed(2)}*\n`;
    });
    
    msg += `\n*TOTAL AMOUNT: ₹${completedBill.totalAmount.toFixed(2)}*\n\n`;
    if (billingQuote) {
      msg += `*Health Tip of the Day:* "${billingQuote}"\n\n`;
    }
    msg += `Thank you for shopping at our fresh farm store! Eat healthy, live active! 🌱🍎`;
    
    const text = encodeURIComponent(msg);
    let url = `https://api.whatsapp.com/send?text=${text}`;
    
    if (whatsappPhone.trim()) {
      const sanitized = whatsappPhone.replace(/\D/g, '');
      // Check if it already has country code, otherwise append 91 for India context (₹ currency)
      const phoneWithCode = (sanitized.length > 10) ? sanitized : `91${sanitized}`;
      url = `https://api.whatsapp.com/send?phone=${phoneWithCode}&text=${text}`;
    }
    window.open(url, '_blank');
  };

  const handleDownloadPDF = () => {
    if (!completedBill) return;
    
    // Create a clean printable window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download or print PDF receipts.");
      return;
    }

    const itemsHtml = completedBill.items.map(it => {
      const unitLabel = (it as any).unit || 'kg';
      const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
      return `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px;">
            <span>${it.vegetableName.toUpperCase()}</span>
            <span>₹${it.totalPrice.toFixed(2)}</span>
          </div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
            ${it.quantity} ${unitLabel} x ₹${it.pricePerKg} / ${baseLabel}
          </div>
        </div>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt_${completedBill.id}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              padding: 20px;
              max-width: 380px;
              margin: 0 auto;
              color: #1e293b;
              background: #ffffff;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .title {
              font-size: 18px;
              font-weight: 950;
              margin: 0;
              letter-spacing: 2px;
            }
            .subtitle {
              font-size: 11px;
              color: #64748b;
              margin: 4px 0 0 0;
              font-weight: bold;
            }
            .date {
              font-size: 11px;
              color: #94a3b8;
              margin-top: 5px;
            }
            .divider {
              border-top: 1px dashed #cbd5e1;
              margin: 15px 0;
            }
            .table-header {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
              font-weight: bold;
              color: #64748b;
              text-transform: uppercase;
            }
            .total {
              display: flex;
              justify-content: space-between;
              font-size: 16px;
              font-weight: 900;
              margin-top: 15px;
            }
            .footer {
              text-align: center;
              font-size: 11px;
              color: #64748b;
              margin-top: 25px;
              font-style: italic;
            }
            .quote {
              background-color: #f0fdf4;
              border-left: 3px solid #10b981;
              padding: 8px 12px;
              margin-top: 15px;
              border-radius: 0 8px 8px 0;
              font-size: 11px;
              color: #065f46;
              text-align: center;
            }
            @media print {
              body {
                padding: 0;
                max-width: 100%;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">FARMER'S GATE</h1>
            <p class="subtitle">TRUCK OUTLET - ${store.name.replace("Farmer's Gate - ", "")}</p>
            <p class="date">${completedBill.date}</p>
            <p class="date" style="font-weight: bold; margin-top: 4px;">INVOICE: ${completedBill.id}</p>
          </div>
          
          <div class="divider"></div>
          <div class="table-header">
            <span>Item</span>
            <span>Amount</span>
          </div>
          <div class="divider"></div>
          
          <div class="items">
            ${itemsHtml}
          </div>
          
          <div class="divider"></div>
          <div class="total">
            <span>TOTAL</span>
            <span>₹${completedBill.totalAmount.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          
          <div class="quote">
            "${billingQuote || 'Choose fresh veggies for maximum vitality!'}"
          </div>
          
          <div class="footer">
            <p>🍎 Fresh from farm to keep you strong!</p>
            <p>Thank you for shopping! Have a healthy day!</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadImage = () => {
    if (!completedBill) return;
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 160 + completedBill.items.length * 45 + 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borders & decoration
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Header
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px Courier New, monospace';
    ctx.textAlign = 'center';
    ctx.fillText("FARMER'S GATE", canvas.width / 2, 40);
    
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Courier New, monospace';
    ctx.fillText("TRUCK OUTLET - " + store.name.replace("Farmer's Gate - ", ""), canvas.width / 2, 55);
    ctx.fillText(completedBill.date, canvas.width / 2, 70);
    ctx.fillText("INVOICE: " + completedBill.id, canvas.width / 2, 85);

    // Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, 95);
    ctx.lineTo(canvas.width - 20, 95);
    ctx.stroke();
    ctx.setLineDash([]);

    // Headers
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText("ITEM", 25, 115);
    ctx.textAlign = 'right';
    ctx.fillText("AMOUNT", canvas.width - 25, 115);

    // Divider
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, 125);
    ctx.lineTo(canvas.width - 20, 125);
    ctx.stroke();
    ctx.setLineDash([]);

    let y = 145;

    completedBill.items.forEach((it) => {
      // Left align: Item Name
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'left';
      ctx.font = 'bold 11px Courier New, monospace';
      ctx.fillText(it.vegetableName.toUpperCase(), 25, y);

      // Right align: Price
      ctx.textAlign = 'right';
      ctx.fillText(`INR ${it.totalPrice.toFixed(2)}`, canvas.width - 25, y);

      // Subtext
      y += 14;
      ctx.textAlign = 'left';
      ctx.font = '9px Courier New, monospace';
      ctx.fillStyle = '#64748b';
      const unitLabel = (it as any).unit || 'kg';
      const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
      ctx.fillText(`${it.quantity} ${unitLabel} x INR ${it.pricePerKg} / ${baseLabel}`, 25, y);

      y += 22;
    });

    // Divider
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, y - 10);
    ctx.lineTo(canvas.width - 20, y - 10);
    ctx.stroke();
    ctx.setLineDash([]);

    // Total
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px Courier New, monospace';
    ctx.textAlign = 'left';
    ctx.fillText("TOTAL AMOUNT", 25, y + 10);
    ctx.textAlign = 'right';
    ctx.fillText(`INR ${completedBill.totalAmount.toFixed(2)}`, canvas.width - 25, y + 10);

    // Quote
    y += 40;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#047857';
    ctx.font = 'italic 10px Courier New, monospace';
    ctx.fillText(`"${billingQuote || 'Choose fresh veggies for maximum vitality!'}"`, canvas.width / 2, y);

    // Thank you
    y += 20;
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Courier New, monospace';
    ctx.fillText("Thank you for shopping! Eat healthy! 🌱🍎", canvas.width / 2, y);

    // Download
    const link = document.createElement('a');
    link.download = `${completedBill.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // 2. STATE FOR PURCHASE TAB
  const [purchaseVegName, setPurchaseVegName] = useState('');
  const [purchaseQty, setPurchaseQty] = useState<number>(0);
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [purchaseSupplier, setPurchaseSupplier] = useState('');

  // 3. STATE FOR INVENTORY TAB (Manual initialization or quick-adjust)
  const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
  const [adjustQtyVal, setAdjustQtyVal] = useState<number>(0);
  const [initVegName, setInitVegName] = useState('');
  const [initMinStock, setInitMinStock] = useState<number>(15);
  const [initCostPrice, setInitCostPrice] = useState<number>(1.5);
  const [initSellingPrice, setInitSellingPrice] = useState<number>(2.2);
  const [showInitForm, setShowInitForm] = useState(false);

  // 4. STATE FOR REQUIREMENTS TAB
  const [reqVegName, setReqVegName] = useState('');
  const [reqQty, setReqQty] = useState<number>(0);
  const [reqPriority, setReqPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [reqNotes, setReqNotes] = useState('');

  // 5. STATE FOR EDITING CUSTOMER ORDERS
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<'Pending' | 'Processing' | 'Ready' | 'Completed' | 'Cancelled'>('Pending');
  const [editPaymentStatus, setEditPaymentStatus] = useState<'Unpaid' | 'Paid'>('Unpaid');
  const [editNotes, setEditNotes] = useState('');
  const [editItems, setEditItems] = useState<{ vegetableName: string; quantity: number; pricePerKg: number; totalPrice: number }[]>([]);

  const handleStartEditOrder = (order: CustomerOrder) => {
    setEditingOrderId(order.id);
    setEditName(order.customerName);
    setEditPhone(order.customerPhone);
    setEditStatus(order.status);
    setEditPaymentStatus(order.paymentStatus);
    setEditNotes(order.notes || '');
    setEditItems([...order.items]);
  };

  const handleSaveEditOrder = () => {
    if (!onUpdateCustomerOrder || !editingOrderId) return;
    
    // Find customer order being edited
    const originalOrder = customerOrders.find(co => co.id === editingOrderId);
    if (!originalOrder) return;

    // Calculate total amount from items
    const totalAmount = editItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    const updatedOrder: CustomerOrder = {
      ...originalOrder,
      customerName: editName.trim(),
      customerPhone: editPhone.trim(),
      status: editStatus,
      paymentStatus: editPaymentStatus,
      notes: editNotes.trim() || undefined,
      items: editItems,
      totalAmount
    };

    onUpdateCustomerOrder(updatedOrder);
    setEditingOrderId(null);
  };

  // FILTERED DATASETS FOR THE SPECIFIC SELECTED STORE
  const storeSales = sales.filter(s => s.storeId === store.id);
  const storePurchases = purchases.filter(p => p.storeId === store.id);
  const storeInventory = inventory.filter(i => i.storeId === store.id);
  const storeRequirements = requirements.filter(r => r.storeId === store.id);

  // Quick seed standard items to inventory
  const handleBulkSeedCrops = async () => {
    const defaultCrops = [
      { name: 'APPLE FUJI', price: 350, qty: 100, min: 10 },
      { name: 'APPLE INDIAN', price: 260, qty: 150, min: 15 },
      { name: 'BLUEBERRY', price: 290, qty: 50, min: 5 },
      { name: 'BOX KIWI GOLD ZESPRI', price: 460, qty: 40, min: 4 },
      { name: 'BOX KIWI GREEN', price: 400, qty: 45, min: 4 },
      { name: 'CHERRY', price: 400, qty: 30, min: 3 },
      { name: 'STRAWBERRY', price: 220, qty: 60, min: 6 },
      { name: 'ORANGE MALTA', price: 180, qty: 120, min: 12 },
      { name: 'POMEGRANATE', price: 240, qty: 85, min: 8 },
      { name: 'BANANA ROBUSTA', price: 60, qty: 200, min: 20 },
      { name: 'AVOCADO', price: 320, qty: 25, min: 3 },
      { name: 'BROCCOLI PREMIUM', price: 150, qty: 50, min: 5 },
      { name: 'MUSHROOM BUTTON', price: 90, qty: 75, min: 7 },
      { name: 'CAPSICUM RED', price: 140, qty: 40, min: 4 },
      { name: 'CAPSICUM YELLOW', price: 150, qty: 40, min: 4 },
      { name: 'Potato', price: 30, qty: 150, min: 20 },
      { name: 'Onion', price: 40, qty: 120, min: 15 },
      { name: 'Tomato', price: 50, qty: 80, min: 10 },
      { name: 'Carrot', price: 60, qty: 60, min: 10 },
      { name: 'Garlic', price: 120, qty: 40, min: 5 },
      { name: 'Ginger', price: 140, qty: 35, min: 5 },
      { name: 'Spinach', price: 25, qty: 30, min: 5 },
      { name: 'Cabbage', price: 35, qty: 50, min: 8 },
      { name: 'Cauliflower', price: 45, qty: 45, min: 8 },
      { name: 'Green Chili', price: 80, qty: 25, min: 4 },
      { name: 'Lemon', price: 100, qty: 20, min: 3 },
      { name: 'Coriander', price: 30, qty: 15, min: 3 }
    ];

    for (const crop of defaultCrops) {
      const exists = storeInventory.some(i => i.vegetableName.toLowerCase() === crop.name.toLowerCase());
      if (!exists) {
        await onUpdateInventoryItem({
          id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          storeId: store.id,
          vegetableName: crop.name,
          quantity: crop.qty,
          costPrice: parseFloat((crop.price * 0.75).toFixed(2)),
          sellingPrice: crop.price,
          minStockThreshold: crop.min,
          lastUpdated: new Date().toISOString()
        });
      }
    }
    alert("Successfully registered standard vegetable and premium fruit items in your store inventory!");
  };

  // Search matching vegetables
  const searchedInventory = storeInventory.filter(item => 
    item.vegetableName.toLowerCase().includes(vegSearchQuery.toLowerCase())
  );

  // Auto-fill price and check stock when vegetable is selected on Sales Form
  const handleSaleVegSelect = (vegName: string) => {
    setSaleVegName(vegName);
    const item = storeInventory.find(i => i.vegetableName.toLowerCase() === vegName.toLowerCase());
    if (item) {
      setSalePrice(item.sellingPrice);
      if (item.quantity === 0) {
        setSaleWarning('ALERT: This vegetable is currently OUT OF STOCK!');
      } else {
        setSaleWarning('');
      }
    } else {
      setSalePrice(0);
      setSaleWarning('NOTE: This item is not registered in your active stock ledger.');
    }
  };

  const handleSaleQtyChange = (qty: number, unitParam?: string) => {
    setSaleQty(qty);
    if (!saleVegName) return;
    const currentUnit = unitParam || saleUnit;
    const item = storeInventory.find(i => i.vegetableName.toLowerCase() === saleVegName.toLowerCase());
    if (item) {
      const rate = getKgConversionRate(currentUnit);
      const totalKgNeeded = qty * rate;
      if (totalKgNeeded > item.quantity) {
        setSaleWarning(`WARNING: Insufficient stock. Needs ${totalKgNeeded.toFixed(2)}kg, only ${item.quantity.toFixed(2)}kg available.`);
      } else {
        setSaleWarning('');
      }
    } else {
      setSaleWarning('');
    }
  };

  // HANDLERS FOR FORMS
  const handleLogSaleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleVegName.trim() || saleQty <= 0 || salePrice <= 0) return;

    const item = storeInventory.find(i => i.vegetableName.toLowerCase() === saleVegName.toLowerCase());
    const rate = getKgConversionRate(saleUnit);
    const totalKgNeeded = saleQty * rate;

    if (item && totalKgNeeded > item.quantity) {
      if(!confirm(`You are selling ${saleQty} ${saleUnit} (${totalKgNeeded.toFixed(2)}kg) but only ${item.quantity.toFixed(2)}kg is registered in stock. Continue and force negative/zero stock adjust?`)) {
        return;
      }
    }

    const subtotal = saleUnit === 'g' ? (saleQty / 1000) * salePrice : saleQty * salePrice;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      storeId: store.id,
      vegetableName: saleVegName,
      quantity: parseFloat(totalKgNeeded.toFixed(3)),
      unit: saleUnit,
      pricePerKg: salePrice,
      totalPrice: parseFloat(subtotal.toFixed(2)),
      customerName: saleCustomer.trim() || undefined,
      saleDate: new Date().toISOString()
    };

    onAddSale(newSale);

    // Reset Form
    setSaleVegName('');
    setSaleQty(0);
    setSalePrice(0);
    setSaleCustomer('');
    setSaleWarning('');
    setSaleUnit('kg');
  };

  const handleLogPurchaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseVegName.trim() || purchaseQty <= 0) return;

    // Find current cost price or fallback to 70% of standard master pricing
    const existingInv = storeInventory.find(
      item => item.vegetableName.toLowerCase() === purchaseVegName.trim().toLowerCase()
    );
    const cost = existingInv ? existingInv.costPrice : 15;

    const newPurchase: Purchase = {
      id: `pur-${Date.now()}`,
      storeId: store.id,
      vegetableName: purchaseVegName,
      quantity: purchaseQty,
      costPerKg: cost,
      totalCost: parseFloat((purchaseQty * cost).toFixed(2)),
      supplierName: purchaseSupplier.trim() || undefined,
      purchaseDate: new Date().toISOString()
    };

    onAddPurchase(newPurchase);

    // Reset Form
    setPurchaseVegName('');
    setPurchaseQty(0);
    setPurchaseSupplier('');
  };

  const handleAddRequirementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqVegName.trim() || reqQty <= 0) return;

    const newReq: Requirement = {
      id: `req-${Date.now()}`,
      storeId: store.id,
      vegetableName: reqVegName,
      quantity: reqQty,
      status: 'Pending',
      priority: reqPriority,
      notes: reqNotes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    onAddRequirement(newReq);

    // Reset Form
    setReqVegName('');
    setReqQty(0);
    setReqPriority('Medium');
    setReqNotes('');
  };

  const handleQuickAdjustStock = (item: InventoryItem, newQty: number) => {
    onUpdateInventoryItem({
      ...item,
      quantity: Math.max(0, newQty),
      lastUpdated: new Date().toISOString()
    });
    setAdjustingItemId(null);
  };

  const handleInitInventoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initVegName.trim() || initSellingPrice <= 0) return;

    const calculatedCost = parseFloat((initSellingPrice * 0.70).toFixed(2));

    const newItem: InventoryItem = {
      id: `inv-${store.id}-${Date.now()}`,
      storeId: store.id,
      vegetableName: initVegName,
      quantity: 0, // starts empty, populated via Purchases or Quick Adjust
      minStockThreshold: initMinStock,
      costPrice: calculatedCost,
      sellingPrice: initSellingPrice,
      lastUpdated: new Date().toISOString()
    };

    onUpdateInventoryItem(newItem);
    setInitVegName('');
    setShowInitForm(false);
  };

  // WHATSAPP GENERATION FOR STORE REQS
  const getWhatsAppStoreLink = (req: Requirement): string => {
    const formattedDate = new Date(req.createdAt).toLocaleDateString();
    let text = `*Farmer's Gate Requisition Alert*\n`;
    text += `Store: *${store.name}*\n`;
    text += `------------------------------\n`;
    text += `• *Crop Needed*: ${req.vegetableName}\n`;
    text += `• *Quantity*: ${req.quantity} kg\n`;
    text += `• *Priority*: ${req.priority} Priority\n`;
    if (req.notes) {
      text += `• *Notes*: "${req.notes}"\n`;
    }
    text += `• *Date Requested*: ${formattedDate}\n`;
    text += `------------------------------\n`;
    text += `Please arrange dispatch from wholesale cache.`;

    const encoded = encodeURIComponent(text);
    return `https://wa.me/${store.whatsappNumber || ''}?text=${encoded}`;
  };

  const sendAllRequirementsOnWhatsApp = () => {
    const pendingReqs = storeRequirements.filter(r => r.status !== 'Fulfilled');
    if (pendingReqs.length === 0) return '';

    let text = `*FARMER'S GATE - ORDER REQUISITION*\n`;
    text += `Branch: *${store.name}*\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n`;
    text += `------------------------------------\n\n`;

    pendingReqs.forEach((r, idx) => {
      text += `${idx + 1}. *${r.vegetableName}*: ${r.quantity} kg [${r.priority}]\n`;
      if (r.notes) text += `   _Note: ${r.notes}_\n`;
    });

    text += `\n------------------------------------\n`;
    text += `Please review and approve order. Sent from Store Requisition Portal.`;

    const encoded = encodeURIComponent(text);
    return `https://wa.me/${store.whatsappNumber || ''}?text=${encoded}`;
  };

  return (
    <div className="space-y-4 animate-fade-in text-slate-900">
      
      {/* Minimal Breadcrumb Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm">
        <div className="flex items-center justify-between w-full sm:w-auto gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className={`flex h-2.5 w-2.5 items-center justify-center rounded-full ${offlineMode ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500 animate-pulse'}`}></span>
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
              {store.name.replace("Farmer's Gate - ", "")}
            </span>
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-md">
            {store.location || 'Branch Unit'}
          </span>
        </div>

        {/* Dynamic Offline / Connection Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
            offlineMode 
              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}>
            {offlineMode ? '🟠 Offline Mode' : '🟢 Cloud Syncing'}
          </span>
          <button
            onClick={handleToggleOfflineMode}
            className={`text-[10px] font-extrabold px-3 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
              offlineMode 
                ? 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {offlineMode ? '🔌 Switch Online' : '✈️ Work Offline'}
          </button>
        </div>
      </div>

      {/* Categories Tabs Menu */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto scrollbar-none shrink-0">
        <button
          id="tab-sales"
          onClick={() => setActiveSubTab('sale')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'sale'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          ⚡ Express Billing
        </button>

        <button
          id="tab-sales-history"
          onClick={() => setActiveSubTab('sales-history')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'sales-history'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>📋</span>
          Sales History & Ledger
        </button>

        {/* Purchases/Restock hidden for Employees */}
        {role !== 'Employee' && (
          <button
            id="tab-purchases"
            onClick={() => setActiveSubTab('purchase')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeSubTab === 'purchase'
                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Purchases & Restocks
          </button>
        )}

        <button
          id="tab-inventory"
          onClick={() => setActiveSubTab('inventory')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'inventory'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          Store Stock
        </button>

        <button
          id="tab-store-reqs"
          onClick={() => setActiveSubTab('requirements')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'requirements'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          Restock Requests ({storeRequirements.filter(r=>r.status!=='Fulfilled').length})
        </button>

        {/* Customer Orders tab */}
        <button
          id="tab-customer-orders"
          onClick={() => setActiveSubTab('customer-orders' as any)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === ('customer-orders' as any)
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>📦</span>
          Customer Orders ({customerOrders.filter(co => co.storeId === store.id && co.status !== 'Completed' && co.status !== 'Cancelled').length})
        </button>

        {/* Branch Info tab */}
        <button
          id="tab-branch-info"
          onClick={() => setActiveSubTab('info')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'info'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Info className="h-3.5 w-3.5" />
          Branch Information
        </button>
      </div>

      {/* --- SUB-TAB CONTENT: SALE --- */}
      {activeSubTab === 'sale' && (
        <div className="space-y-6">
          {completedBill ? (
            /* --- RENDER BILL COMPLETED PHYSICAL THERMAL RECEIPT --- */
            <div className="bg-slate-50/50 rounded-2xl border border-slate-200/85 p-6 md:p-8 animate-in fade-in duration-300">
              <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
                
                {/* Monospace Thermal Ticket Receipt */}
                <div className="flex-1 max-w-sm mx-auto bg-white border border-slate-200 rounded-3xl p-6 shadow-sm font-mono text-xs text-slate-800 space-y-4 relative overflow-hidden">
                  {/* Stylized physical receipt paper look cutouts */}
                  <div className="absolute top-0 inset-x-0 h-1 bg-repeat-x bg-[linear-gradient(to_right,transparent_50%,#f1f5f9_50%)] bg-[size:8px_4px]"></div>
                  
                  <div className="text-center space-y-1 pt-2">
                    <h3 className="text-base font-black tracking-widest text-slate-900 uppercase">FARMER'S GATE</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">TRUCK</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(completedBill.date).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })} | {new Date(completedBill.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </p>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2"></div>

                  <div className="flex justify-between font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    <span>ITEM</span>
                    <span>AMT</span>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2"></div>

                  <div className="space-y-4">
                    {completedBill.items.map((it, idx) => {
                      const unitLabel = (it as any).unit || 'kg';
                      const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
                      return (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between font-bold text-slate-900">
                            <span className="capitalize">{it.vegetableName.toLowerCase()}</span>
                            <span>₹{it.totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {it.quantity} {unitLabel} x ₹{it.pricePerKg} / {baseLabel}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2"></div>

                  <div className="flex justify-between items-baseline font-black text-sm text-slate-900">
                    <span>TOTAL</span>
                    <span>₹{completedBill.totalAmount.toFixed(2)}</span>
                  </div>

                  <div className="border-t border-dashed border-slate-300 my-2"></div>

                  <div className="text-center space-y-2 text-[10px] text-slate-500 font-medium italic">
                    <p>🍎 Fresh from farm to keep you strong!</p>
                    <p>🙏 Thank you for visiting! Have a healthy day!</p>
                  </div>

                  {/* Eye-catching, simple quote placed at the very last as requested */}
                  <div className="border-t border-emerald-100 pt-4 mt-3 flex flex-col items-center justify-center text-center font-sans">
                    <div className="relative py-2.5 px-4 bg-emerald-500/[0.03] border-l-2 border-emerald-500 rounded-r-xl shadow-sm">
                      <p className="text-[10px] italic font-semibold text-emerald-800 leading-relaxed">
                        "{billingQuote || "Choose fresh veggies for maximum vitality!"}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Receipt management & actions side panel */}
                <div className="flex-1 flex flex-col justify-between space-y-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
                    <div>
                      <span className="inline-block bg-emerald-100 text-emerald-800 text-[9px] font-black tracking-wider uppercase px-2.5 py-1 rounded-full mb-2">
                        Invoice Successfully Logged
                      </span>
                      <h4 className="text-base font-black text-slate-800">
                        What would you like to do next?
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Select an action below to share or print this transaction. Stock levels have been adjusted automatically.
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <label htmlFor="wa-phone" className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Send Receipt via WhatsApp
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-3.5 flex items-center text-xs font-extrabold text-slate-400">
                            +91
                          </span>
                          <input
                            id="wa-phone"
                            type="tel"
                            placeholder="9876543210"
                            maxLength={10}
                            value={whatsappPhone}
                            onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                            className="w-full rounded-xl border border-slate-200 py-2.5 pl-11 pr-3 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
                          />
                        </div>
                        <button
                          onClick={handleSendWhatsApp}
                          className="bg-[#25D366] text-white hover:bg-[#128C7E] px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-sm shrink-0 cursor-pointer flex items-center gap-1"
                        >
                          Send Bill
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 space-y-2">
                      <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Export Bill Format
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={handleDownloadPDF}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition-colors cursor-pointer"
                        >
                          <span>📄</span> PDF Format
                        </button>
                        <button
                          onClick={handleDownloadImage}
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-black transition-colors cursor-pointer"
                        >
                          <span>🖼️</span> Image Format
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setCompletedBill(null);
                      setPosCart({});
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl py-3.5 text-xs transition-all shadow-md active:scale-[0.99] cursor-pointer"
                  >
                    ← Create Another Sale Bill
                  </button>
                </div>

              </div>
            </div>
          ) : (
            /* --- EXPRESS POS POINT OF SALE COUNTER --- */
            <div className="space-y-4 animate-fade-in">
              {/* Sticky/Prominent checkout bar */}
              <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2.5 rounded-xl">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black text-slate-100">
                      {Object.keys(posCart).length === 0 ? 'No crops selected' : `${Object.keys(posCart).length} Crop line(s) added`}
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                      Subtotal: <span className="text-emerald-400 font-extrabold font-mono">₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {Object.keys(posCart).length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearPosCart}
                      className="px-3 py-2 text-[10px] uppercase font-black text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={Object.keys(posCart).length === 0}
                    onClick={() => {
                      const randomIdx = Math.floor(Math.random() * HEALTHY_QUOTES.length);
                      setBillingQuote(HEALTHY_QUOTES[randomIdx]);
                      setShowCheckoutModal(true);
                    }}
                    className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-emerald-950/20 active:scale-95 cursor-pointer"
                  >
                    🛒 View Bill & Checkout <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                
                {/* POS Column: Crop selection */}
                <div className="w-full space-y-4">
                
                {/* POS Crop search & quick description */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search available crops..."
                      value={posSearch}
                      onChange={(e) => setPosSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
                    />
                  </div>
                  {posSearch && (
                    <button 
                      onClick={() => setPosSearch('')}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold shrink-0"
                    >
                      Clear Search
                    </button>
                  )}
                  {storeInventory.length < 6 && (
                    <button
                      type="button"
                      onClick={handleBulkSeedCrops}
                      className="text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 px-3 py-2 rounded-xl transition-all cursor-pointer"
                    >
                      Seed Standard Crops
                    </button>
                  )}
                </div>

                {/* Categories Tabs Selector */}
                <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none shrink-0 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                  {(['ALL', 'VEGGIES', 'FRUITS', 'GROCERY'] as const).map((cat) => {
                    const isActive = activeCropFilter === cat;
                    const icon = cat === 'ALL' ? '🌾' : cat === 'VEGGIES' ? '🥦' : cat === 'FRUITS' ? '🍎' : '🛒';
                    const label = cat === 'ALL' ? 'All Items' : cat === 'VEGGIES' ? 'Vegetables' : cat === 'FRUITS' ? 'Fruits' : 'Groceries';
                    
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCropFilter(cat)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          isActive
                            ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-200'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/50'
                        }`}
                      >
                        <span className="text-sm">{icon}</span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Quick Add Custom Item directly to bill if not found */}
                {posSearch && storeInventory.filter(item => item.vegetableName.toLowerCase().includes(posSearch.toLowerCase())).length === 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-3 mt-2 animate-in fade-in duration-200">
                    <p className="text-xs font-bold text-slate-700">
                      Crop "{posSearch}" not registered. Quick-add it below:
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg px-2 py-1">
                        <span className="text-xs text-slate-400 font-bold mr-1">₹</span>
                        <input
                          type="number"
                          placeholder="Price"
                          className="w-16 text-xs font-bold text-slate-800 focus:outline-none bg-white"
                          id="quick-add-price"
                          defaultValue={60}
                        />
                      </div>
                      <select
                        id="quick-add-unit"
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
                        defaultValue="kg"
                      >
                        <option value="kg">kg</option>
                        <option value="g">g</option>
                        <option value="pcs">pcs</option>
                        <option value="bunch">bunch</option>
                        <option value="pack">pack</option>
                        <option value="box">box</option>
                        <option value="crate">crate</option>
                        <option value="sack">sack</option>
                        <option value="dozen">dozen</option>
                        <option value="bundle">bundle</option>
                        <option value="bag">bag</option>
                      </select>
                      <button
                        type="button"
                        onClick={async () => {
                          const priceInput = document.getElementById('quick-add-price') as HTMLInputElement;
                          const unitSelect = document.getElementById('quick-add-unit') as HTMLSelectElement;
                          const price = parseFloat(priceInput?.value) || 60;
                          const unit = (unitSelect?.value || 'kg') as any;
                          
                          // Register in inventory on-the-fly
                          const newItem: InventoryItem = {
                            id: `item-${Date.now()}`,
                            storeId: store.id,
                            vegetableName: posSearch.trim(),
                            quantity: 100, // standard bulk starting stock
                            costPrice: price * 0.75,
                            sellingPrice: price,
                            minStockThreshold: 10,
                            lastUpdated: new Date().toISOString()
                          };
                          await onUpdateInventoryItem(newItem);
                          
                          // Add to POS Cart
                          setPosCart(prev => ({
                            ...prev,
                            [newItem.vegetableName]: {
                              quantity: 1,
                              unit: unit,
                              pricePerKg: price,
                              item: newItem
                            }
                          }));
                          setPosSearch('');
                        }}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer"
                      >
                        ADD TO BILL
                      </button>
                    </div>
                  </div>
                )}

                {/* Linear List of Crop Items to save space */}
                <div className="flex flex-col gap-2.5 max-h-[550px] overflow-y-auto pr-1">
                  {storeInventory
                    .filter(item => item.vegetableName.toLowerCase().includes(posSearch.toLowerCase()))
                    .filter(item => {
                      if (activeCropFilter === 'ALL') return true;
                      const category = getItemCategory(item.vegetableName);
                      if (activeCropFilter === 'VEGGIES') return category === 'Vegetable';
                      if (activeCropFilter === 'FRUITS') return category === 'Fruit';
                      if (activeCropFilter === 'GROCERY') return category === 'Grocery';
                      return true;
                    })
                    .map(item => {
                      const isOutOfStock = item.quantity <= 0;
                      const cartItem = posCart[item.vegetableName];
                      
                      return (
                        <div
                          key={item.id}
                          className={`relative rounded-xl border p-2 bg-white shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between gap-3 border-slate-200/80 ${
                            isOutOfStock ? 'opacity-60 bg-slate-50' : ''
                          }`}
                        >
                          {/* Left part: Emoji, Name, and standard price tag in a single row */}
                          <div className="flex-1 min-w-0 flex items-center gap-2">
                            <span className="text-sm shrink-0">{getVegEmoji(item.vegetableName)}</span>
                            <div className="min-w-0">
                              <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate" title={item.vegetableName}>
                                {item.vegetableName}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-slate-500">
                                  ₹{item.sellingPrice.toFixed(0)}/kg
                                </span>
                                {item.quantity <= 10 && (
                                  <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 rounded">
                                    Low: {item.quantity.toFixed(0)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right part: Adding and Quantity input controls on the same row */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {!cartItem ? (
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                                {/* Compact quantity input */}
                                <input
                                  type="number"
                                  id={`input-qty-${item.id}`}
                                  placeholder="1"
                                  defaultValue="1"
                                  disabled={isOutOfStock}
                                  step="0.05"
                                  className="w-8 text-center text-xs font-black text-slate-850 bg-transparent focus:outline-none"
                                />
                                {/* Unit dropdown */}
                                <select
                                  id={`input-unit-${item.id}`}
                                  disabled={isOutOfStock}
                                  className="bg-transparent border-0 text-[10px] font-extrabold text-slate-500 focus:outline-none cursor-pointer pr-1"
                                  defaultValue="kg"
                                >
                                  <option value="kg">kg</option>
                                  <option value="g">g</option>
                                  <option value="pcs">pcs</option>
                                  <option value="bunch">bunch</option>
                                  <option value="pack">pack</option>
                                </select>
                                {/* Quick Add Button */}
                                <button
                                  type="button"
                                  disabled={isOutOfStock}
                                  onClick={() => {
                                    const qtyInput = document.getElementById(`input-qty-${item.id}`) as HTMLInputElement;
                                    const unitSelect = document.getElementById(`input-unit-${item.id}`) as HTMLSelectElement;
                                    const qty = parseFloat(qtyInput?.value) || 1;
                                    const unit = (unitSelect?.value || 'kg') as any;
                                    handleAddToPosCartWithParams(item, qty, unit);
                                  }}
                                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white h-5.5 px-2 rounded-md text-[10px] font-black transition-all flex items-center justify-center cursor-pointer uppercase shadow-xs"
                                >
                                  {isOutOfStock ? 'OUT' : 'ADD'}
                                </button>
                              </div>
                            ) : (
                              /* Standard +/- quantity adjustment controls inside a super compact colored pill */
                              <div className="flex items-center gap-0.5 bg-emerald-50 border border-emerald-100 rounded-lg p-0.5 h-6.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const step = cartItem.unit === 'g' ? 100 : 1;
                                    handleUpdatePosCartQty(item.vegetableName, cartItem.quantity - step);
                                  }}
                                  className="h-4.5 w-4.5 hover:bg-emerald-100 active:scale-95 rounded flex items-center justify-center text-xs font-black text-emerald-850 cursor-pointer shrink-0"
                                >
                                  -
                                </button>
                                
                                <span className="text-[10px] font-black text-emerald-900 px-1 font-mono">
                                  {cartItem.quantity} {cartItem.unit}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const step = cartItem.unit === 'g' ? 100 : 1;
                                    handleUpdatePosCartQty(item.vegetableName, cartItem.quantity + step);
                                  }}
                                  className="h-4.5 w-4.5 hover:bg-emerald-100 active:scale-95 rounded flex items-center justify-center text-xs font-black text-emerald-850 cursor-pointer shrink-0"
                                >
                                  +
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {storeInventory.filter(item => item.vegetableName.toLowerCase().includes(posSearch.toLowerCase())).length === 0 && (
                    <div className="py-16 text-center text-slate-400 bg-white border border-slate-150 rounded-2xl">
                      <p className="text-xs font-bold">No matching crops found</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Checkout Bill Pop-up Modal */}
              {showCheckoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
                  <div className="relative w-full max-w-xl bg-slate-900 text-white rounded-3xl p-6 shadow-2xl border border-slate-800/80 flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 text-left">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
                      <div className="flex items-center gap-2">
                        <span className="p-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/10">
                          <ShoppingCart className="h-4 w-4" />
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-200">Active Sale Invoice Checkout</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowCheckoutModal(false)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Modal content - Scrollable */}
                    <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                      {/* Customer Info */}
                      <div className="space-y-1">
                        <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Customer Identity Name</label>
                        <input
                          type="text"
                          placeholder="Walk-in Counter Customer"
                          value={posCustomerName}
                          onChange={(e) => setPosCustomerName(e.target.value)}
                          className="w-full rounded-xl bg-slate-850 border border-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Ambient tip */}
                      <div className="bg-slate-850/60 rounded-xl p-3 border border-slate-800/80">
                        <p className="text-[8px] font-black uppercase text-emerald-400 tracking-wider">Health Tip</p>
                        <p className="text-[11px] text-slate-300 italic font-medium mt-0.5 leading-snug">
                          "{billingQuote || "Enjoy fresh vegetables every day!"}"
                        </p>
                      </div>

                      {/* Itemized list */}
                      <div className="space-y-2.5 divide-y divide-slate-800/60">
                        <span className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400 pb-1">Itemized Cart Ledger</span>
                        {Object.keys(posCart).map((vegName, idx) => {
                          const cartItem = posCart[vegName];
                          const itemSubtotal = getSubtotal(cartItem);
                          const changeStep = cartItem.unit === 'g' ? 50 : cartItem.unit === 'kg' ? 0.25 : 1;
                          
                          return (
                            <div key={cartItem.item.id} className={`${idx > 0 ? 'pt-3' : ''} flex flex-col gap-2`}>
                              <div className="flex justify-between items-start">
                                <h4 className="text-xs font-black text-slate-200">{cartItem.item.vegetableName}</h4>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromPosCart(cartItem.item.vegetableName)}
                                  className="text-[10px] uppercase font-black text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2.5 bg-slate-850/40 p-2 rounded-xl border border-slate-800/30">
                                {/* Quantity */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Weight / Qty</span>
                                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity - changeStep)}
                                      className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer text-xs font-black"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      step={changeStep}
                                      min="0.01"
                                      value={cartItem.quantity}
                                      onChange={(e) => handleUpdatePosCartQty(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                      className="w-12 bg-transparent text-center text-xs font-black text-slate-100 focus:outline-none font-sans"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity + changeStep)}
                                      className="h-5 w-5 rounded flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer text-xs font-black"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Unit */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Billing Unit</span>
                                  <select
                                    value={cartItem.unit}
                                    onChange={(e) => handleUpdatePosCartUnit(cartItem.item.vegetableName, e.target.value as any)}
                                    className="bg-slate-900 text-[10px] font-black text-emerald-400 border border-slate-850 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer w-full"
                                  >
                                    <option value="kg">kg</option>
                                    <option value="g">g</option>
                                    <option value="pcs">pcs</option>
                                    <option value="bunch">bunch</option>
                                    <option value="pack">pack</option>
                                    <option value="box">box</option>
                                    <option value="crate">crate</option>
                                    <option value="sack">sack</option>
                                    <option value="dozen">dozen</option>
                                    <option value="bundle">bundle</option>
                                    <option value="bag">bag</option>
                                  </select>
                                </div>

                                {/* Price adjustment & Subtotal */}
                                <div className="flex justify-between items-center bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/40">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Rate/Unit</span>
                                    <div className="flex items-center gap-0.5 mt-0.5">
                                      <span className="text-[10px] text-slate-500">₹</span>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={cartItem.pricePerKg}
                                        onChange={(e) => handleUpdatePosCartPrice(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                        className="w-10 bg-transparent text-left text-xs font-bold text-slate-300 focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] uppercase font-black text-slate-500 tracking-wider">Subtotal</span>
                                    <span className="text-xs font-black text-emerald-400 font-mono mt-0.5">₹{itemSubtotal.toFixed(1)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer with grand total and submit action */}
                    <div className="border-t border-slate-800 pt-4 mt-2 space-y-3.5 shrink-0 text-left">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estimated Invoice Sum</span>
                        <span className="text-2xl font-black text-emerald-400 font-mono">
                          ₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setShowCheckoutModal(false)}
                          className="bg-slate-800 text-slate-300 font-black rounded-xl py-3 text-xs hover:bg-slate-750 transition-colors cursor-pointer"
                        >
                          ADD MORE CROPS
                        </button>
                        <button
                          type="button"
                          onClick={handlePosCheckoutSubmit}
                          className="bg-emerald-500 text-slate-950 font-black rounded-xl py-3 text-xs hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20"
                        >
                          Complete Sale ➔
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          </div>
          )}
        </div>
      )}
      {/* --- SUB-TAB CONTENT: SALES HISTORY & LEDGER --- */}
      {activeSubTab === 'sales-history' && (
        <div className="space-y-6">
          {/* Branch Mini Sales Dashboard (Clean & Modern) */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                <IndianRupee className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Sales Today</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">₹{storeSales.reduce((a,c) => a + c.totalPrice, 0).toFixed(2)}</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-sky-50 text-sky-700 rounded-xl shrink-0">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Bills Issued</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">{storeSales.length} Invoices</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl shrink-0">
                <span>🥦</span>
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Top Selling</p>
                <p className="text-xs font-black text-slate-900 mt-0.5 truncate">
                  {(() => {
                    const counts: Record<string, number> = {};
                    storeSales.forEach(s => {
                      counts[s.vegetableName] = (counts[s.vegetableName] || 0) + s.quantity;
                    });
                    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
                    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1].toFixed(1)} u)` : 'None';
                  })()}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-rose-50 text-rose-700 rounded-xl shrink-0">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Low Stock alerts</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {storeInventory.filter(i => i.quantity <= i.minStockThreshold).length} items
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              
              {/* Sale Input Form */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 h-fit">
                <div>
                  <h3 className="font-bold text-zinc-900">Record Vegetable Sale</h3>
                  <p className="text-xs text-zinc-400">Deducts quantity directly from store stock ledger.</p>
                </div>

                <form onSubmit={handleLogSaleSubmit} className="space-y-3.5">
                  
                  {/* Vegetable Name Selection / Input */}
                  <div>
                    <label htmlFor="sale-veg" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Vegetable Name *</label>
                    <select
                      id="sale-veg"
                      required
                      value={saleVegName}
                      onChange={(e) => handleSaleVegSelect(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 font-semibold"
                    >
                      <option value="">-- Choose Vegetable --</option>
                      {storeInventory.map(item => (
                        <option key={item.id} value={item.vegetableName}>
                          {item.vegetableName} (Stock: {item.quantity}kg)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Warnings display for stock shortages */}
                  {saleWarning && (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      <span className="font-semibold">{saleWarning}</span>
                    </div>
                  )}

                  {/* Qty & Unit */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="sale-qty" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Quantity *</label>
                      <input
                        id="sale-qty"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="e.g. 5.5"
                        value={saleQty || ''}
                        onChange={(e) => handleSaleQtyChange(parseFloat(e.target.value) || 0, saleUnit)}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="sale-unit" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Unit *</label>
                      <select
                        id="sale-unit"
                        required
                        value={saleUnit}
                        onChange={(e) => {
                          const u = e.target.value as any;
                          setSaleUnit(u);
                          handleSaleQtyChange(saleQty, u);
                        }}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 bg-white cursor-pointer"
                      >
                        <option value="kg">kg (Kilogram)</option>
                        <option value="g">g (Gram)</option>
                        <option value="pcs">pcs (Pieces)</option>
                        <option value="bunch">bunch (Bunch)</option>
                        <option value="pack">pack (Packet)</option>
                        <option value="box">box (Box)</option>
                        <option value="crate">crate (Crate)</option>
                        <option value="sack">sack (Sack)</option>
                        <option value="dozen">dozen (Dozen)</option>
                        <option value="bundle">bundle (Bundle)</option>
                        <option value="bag">bag (Bag)</option>
                      </select>
                    </div>
                  </div>

                  {/* Selling Price per standard */}
                  <div>
                    <label htmlFor="sale-price" className="block text-xs font-bold text-zinc-500 uppercase mb-1">
                      Price per {saleUnit === 'g' ? 'kg' : saleUnit} (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-3 flex items-center text-xs font-bold text-zinc-400">
                        ₹
                      </span>
                      <input
                        id="sale-price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        required
                        placeholder="e.g. 2.50"
                        value={salePrice || ''}
                        onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                        className="w-full rounded-xl border border-zinc-200 py-2 pl-7 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label htmlFor="sale-customer" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Customer Name (Optional)</label>
                    <input
                      id="sale-customer"
                      type="text"
                      placeholder="e.g. Walk-in client"
                      value={saleCustomer}
                      onChange={(e) => setSaleCustomer(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Total Calculation Display */}
                  {saleQty > 0 && salePrice > 0 && (
                    <div className="bg-emerald-50/50 rounded-xl p-3 border border-emerald-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Invoice Total:</span>
                      <span className="text-base font-extrabold text-emerald-600">
                        ₹{(saleUnit === 'g' ? (saleQty / 1000) * salePrice : saleQty * salePrice).toFixed(2)}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    Log Invoice Transaction
                  </button>

                </form>
              </div>

              {/* Recent Sales History Log */}
              <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col h-full max-h-[500px]">
                <div className="mb-4">
                  <h3 className="font-bold text-zinc-900">Recent Sales Journal</h3>
                  <p className="text-xs text-zinc-400">Historical customer purchase register for this branch.</p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {storeSales.map(sale => (
                    <div key={sale.id} className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <TrendingUp className="h-4.5 w-4.5" />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-800">
                            {sale.unit && sale.unit !== 'kg' ? (
                              <>
                                {(sale.quantity / getKgConversionRate(sale.unit)).toFixed(2).replace(/\.00$/, '')} {sale.unit} ({sale.quantity.toFixed(2).replace(/\.00$/, '')} kg)
                              </>
                            ) : (
                              <>{sale.quantity.toFixed(2).replace(/\.00$/, '')} kg</>
                            )} of {sale.vegetableName}
                          </h4>
                          <p className="text-[10px] font-medium text-zinc-400">
                            {sale.customerName ? `Client: ${sale.customerName}` : 'Retail counter'} • {new Date(sale.saleDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-600 font-mono">₹{sale.totalPrice.toFixed(2)}</span>
                          <p className="text-[9px] text-zinc-400">₹{sale.pricePerKg}/{sale.unit || 'kg'}</p>
                        </div>
                        <button
                          onClick={() => {
                            if(confirm('Delete sale transaction and return quantities to stock?')) {
                              onDeleteSale(sale.id);
                            }
                          }}
                          className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {storeSales.length === 0 && (
                    <div className="py-24 text-center text-zinc-400">
                      <TrendingUp className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold">No sales recorded today</p>
                      <p className="text-[10px] text-zinc-500">Log a vegetable sale to display active invoices.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
      )}

      {/* --- SUB-TAB CONTENT: PURCHASE --- */}
      {activeSubTab === 'purchase' && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          
          {/* Purchase Log Input */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 h-fit">
            <div>
              <h3 className="font-bold text-zinc-900">Record Crop Purchase (Restock)</h3>
              <p className="text-xs text-zinc-400">Adds quantity directly to stock levels and updates cost price.</p>
            </div>

            <form onSubmit={handleLogPurchaseSubmit} className="space-y-3.5">
              
              {/* Vegetable Name */}
              <div>
                <label htmlFor="pur-veg" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Vegetable Crop Name *</label>
                <input
                  id="pur-veg"
                  type="text"
                  required
                  placeholder="e.g. Potatoes, Onions, Tomatoes"
                  value={purchaseVegName}
                  onChange={(e) => setPurchaseVegName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 font-semibold"
                />
              </div>

              {/* Purchase Qty in kg */}
              <div>
                <label htmlFor="pur-qty" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Restock Quantity (kg) *</label>
                <div className="relative">
                  <input
                    id="pur-qty"
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="e.g. 100.0"
                    value={purchaseQty || ''}
                    onChange={(e) => setPurchaseQty(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-200 py-2 pl-3 pr-12 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-zinc-400">
                    kg
                  </span>
                </div>
              </div>

              {/* Supplier Name */}
              <div>
                <label htmlFor="pur-supplier" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Supplier / Farm Name (Optional)</label>
                <input
                  id="pur-supplier"
                  type="text"
                  placeholder="e.g. Green Hills Agro"
                  value={purchaseSupplier}
                  onChange={(e) => setPurchaseSupplier(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-100 hover:bg-emerald-700 transition-colors cursor-pointer"
              >
                Log Supplier Purchase
              </button>

            </form>
          </div>

          {/* Recent Purchases History Log */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col h-full max-h-[500px]">
            <div className="mb-4">
              <h3 className="font-bold text-zinc-900">Supply Purchase Ledger</h3>
              <p className="text-xs text-zinc-400">Historical delivery register for stock restocks.</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {storePurchases.map(pur => (
                <div key={pur.id} className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <ShoppingBag className="h-4.5 w-4.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-800">{pur.quantity}kg of {pur.vegetableName}</h4>
                      <p className="text-[10px] font-medium text-zinc-400">
                        {pur.supplierName ? `From: ${pur.supplierName}` : 'Wholesale vendor'} • {new Date(pur.purchaseDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        if(confirm('Delete purchase and deduct quantity from inventory stock?')) {
                          onDeletePurchase(pur.id);
                        }
                      }}
                      className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {storePurchases.length === 0 && (
                <div className="py-24 text-center text-zinc-400">
                  <ShoppingBag className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No stock purchases recorded</p>
                  <p className="text-[10px] text-zinc-500">Record a supplier delivery to populate purchases journal.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* --- SUB-TAB CONTENT: INVENTORY --- */}
      {activeSubTab === 'inventory' && (
        <div className="space-y-6">
          
          {/* Actions line with Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-zinc-50 rounded-2xl p-4 border border-zinc-200">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search stock ledger (e.g. Tomato, Onion)..."
                value={vegSearchQuery}
                onChange={(e) => setVegSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800"
              />
            </div>

            {role !== 'Employee' && (
              <button
                onClick={() => setShowInitForm(!showInitForm)}
                className="flex items-center gap-1 bg-zinc-900 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                {showInitForm ? 'Close Crop Tool' : 'Initialize Crop line'}
              </button>
            )}
          </div>

          {/* Crop Line Initialization Form */}
          {showInitForm && role !== 'Employee' && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm max-w-xl animate-fade-in">
              <h4 className="font-bold text-zinc-800 border-b border-zinc-100 pb-2 mb-3">Initialize New Crop Category</h4>
              <form onSubmit={handleInitInventoryItem} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label htmlFor="init-veg" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Vegetable Name *</label>
                  <input
                    id="init-veg"
                    type="text"
                    required
                    placeholder="e.g. Carrots, Garlic, Beans"
                    value={initVegName}
                    onChange={(e) => setInitVegName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="init-min-stock" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Min Threshold Alert (kg) *</label>
                  <input
                    id="init-min-stock"
                    type="number"
                    min="1"
                    required
                    value={initMinStock}
                    onChange={(e) => setInitMinStock(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="init-sell" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Selling Price (₹/kg) *</label>
                  <input
                    id="init-sell"
                    type="number"
                    step="0.01"
                    required
                    value={initSellingPrice}
                    onChange={(e) => setInitSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 font-semibold"
                  />
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-2 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowInitForm(false)}
                    className="rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-zinc-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-zinc-800"
                  >
                    Save Crop Category
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Grid of Crop Cards */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {searchedInventory.map(item => {
              const isOutOfStock = item.quantity === 0;
              const isLowStock = !isOutOfStock && item.quantity <= item.minStockThreshold;
              const stockValuation = item.quantity * item.costPrice;
              const isEmployee = role === 'Employee';

              return (
                <div 
                  key={item.id} 
                  className={`rounded-2xl border p-4 bg-white shadow-sm flex flex-col justify-between transition-all ${
                    isOutOfStock 
                      ? 'border-red-200 bg-red-50/10' 
                      : isLowStock 
                      ? 'border-amber-200 bg-amber-50/10' 
                      : 'border-zinc-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5 mb-3.5">
                      <h4 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                        <Package className="h-4 w-4 text-zinc-400" />
                        {item.vegetableName}
                      </h4>
                      
                      <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                        isOutOfStock 
                          ? 'bg-red-100 text-red-700' 
                          : isLowStock 
                          ? 'bg-amber-100 text-amber-700' 
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {isOutOfStock ? 'Empty' : isLowStock ? 'Low stock' : 'Optimal'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 text-xs text-zinc-500 font-semibold mb-4">
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Stock Level</span>
                        <p className={`text-base font-extrabold ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-amber-600' : 'text-zinc-900'}`}>
                          {item.quantity} kg
                        </p>
                      </div>
                      
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Safety Level</span>
                        <p className="text-base font-extrabold text-zinc-700">{item.minStockThreshold} kg</p>
                      </div>

                      <div className="col-span-2">
                        <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wide mb-0.5">Retail Selling Price</span>
                        <p className="text-base font-extrabold text-emerald-600">₹{item.sellingPrice.toFixed(2)}/kg</p>
                      </div>
                    </div>
                  </div>

                  {/* Stock Correction Action slider/form */}
                  <div className="border-t border-zinc-100 pt-3 flex flex-col gap-2">
                    {adjustingItemId === item.id ? (
                      <div className="flex items-center gap-2 animate-fade-in">
                        <input
                          type="number"
                          step="1"
                          placeholder="Correct Qty"
                          defaultValue={item.quantity}
                          id={`input-adjust-${item.id}`}
                          className="w-20 border border-zinc-200 rounded px-1.5 py-1 text-xs text-center font-bold"
                        />
                        <button
                          onClick={() => {
                            const val = parseFloat((document.getElementById(`input-adjust-${item.id}`) as HTMLInputElement)?.value || '0');
                            handleQuickAdjustStock(item, val);
                          }}
                          className="px-2 py-1 bg-zinc-900 text-white rounded text-[10px] font-bold"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => setAdjustingItemId(null)}
                          className="px-2 py-1 border border-zinc-200 rounded text-[10px] font-semibold text-zinc-500"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAdjustingItemId(item.id);
                        }}
                        className="text-center w-full bg-zinc-50 hover:bg-zinc-100 text-zinc-600 text-[10px] font-bold py-1.5 rounded-lg border border-zinc-200/50"
                      >
                        Correct Stock Count
                      </button>
                    )}
                  </div>

                </div>
              );
            })}

            {searchedInventory.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-3 py-20 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-2xl bg-white">
                <Package className="h-10 w-10 text-zinc-300 mx-auto mb-2" />
                <p className="text-sm font-semibold">No crop categories found</p>
                <p className="text-xs text-zinc-500 mt-1">Initialize a crop line or register a supplier purchase to populate stock!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUB-TAB CONTENT: PROCUREMENT REQUIREMENTS --- */}
      {activeSubTab === 'requirements' && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          
          {/* Create Requirement */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 h-fit">
            <div>
              <h3 className="font-bold text-zinc-900">Request Stock Requisition</h3>
              <p className="text-xs text-zinc-400">Add custom requirements that consolidate under administrative panel.</p>
            </div>

            <form onSubmit={handleAddRequirementSubmit} className="space-y-3.5">
              
              {/* Crop Name */}
              <div>
                <label htmlFor="req-veg" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Predefined Item *</label>
                <select
                  id="req-veg"
                  required
                  value={reqVegName}
                  onChange={(e) => setReqVegName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-zinc-700 cursor-pointer"
                >
                  <option value="" disabled>-- Select a predefined item --</option>
                  {PREDEFINED_REQS.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              {/* Requirement Qty */}
              <div>
                <label htmlFor="req-qty" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Required Quantity (kg) *</label>
                <div className="relative">
                  <input
                    id="req-qty"
                    type="number"
                    step="1"
                    min="1"
                    required
                    placeholder="e.g. 50"
                    value={reqQty || ''}
                    onChange={(e) => setReqQty(parseInt(e.target.value) || 0)}
                    className="w-full rounded-xl border border-zinc-200 py-2 pl-3 pr-12 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-xs font-bold text-zinc-400">
                    kg
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full rounded-xl bg-zinc-900 py-2.5 text-xs font-bold text-white shadow-md shadow-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                File Stock Requirement
              </button>

            </form>
          </div>

          {/* Active Requirements List */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col h-full max-h-[500px]">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900">Branch Requisition Sheet</h3>
                <p className="text-xs text-zinc-400 font-medium">Requisition items filed by this outlet.</p>
              </div>

              {storeRequirements.length > 0 && (
                <a
                  href={sendAllRequirementsOnWhatsApp()}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="flex items-center gap-1 bg-[#25D366] hover:bg-[#20ba5a] text-[11px] font-bold text-white px-2.5 py-1.5 rounded-lg shadow-sm"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Send Full List WhatsApp
                </a>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {storeRequirements.map(req => (
                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3.5 rounded-xl border border-zinc-100 gap-3 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                      req.priority === 'High' 
                        ? 'bg-red-100 text-red-700' 
                        : req.priority === 'Medium' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-zinc-100 text-zinc-600'
                    }`}>
                      {req.priority}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-800">{req.quantity}kg of {req.vegetableName}</h4>
                      {req.notes && (
                        <p className="text-[10px] text-zinc-500 mt-1 italic">"{req.notes}"</p>
                      )}
                      <p className="text-[9px] text-zinc-400 mt-1">
                        Status: <strong className={req.status === 'Fulfilled' ? 'text-emerald-600' : 'text-zinc-600'}>{req.status}</strong> • Filed {new Date(req.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions line */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {req.status === 'Pending' && (
                      <button
                        onClick={() => onUpdateRequirementStatus(req.id, 'Ordered')}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100"
                      >
                        Order
                      </button>
                    )}
                    {req.status === 'Ordered' && (
                      <button
                        onClick={() => onUpdateRequirementStatus(req.id, 'Fulfilled')}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      >
                        Fulfill
                      </button>
                    )}
                    
                    {/* Send Single Requisition on WhatsApp */}
                    <a
                      href={getWhatsAppStoreLink(req)}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="p-1 rounded text-[#25D366] hover:bg-emerald-50"
                      title="Send this requirement on WhatsApp"
                    >
                      <PhoneCall className="h-4 w-4" />
                    </a>

                    <button
                      onClick={() => onDeleteRequirement(req.id)}
                      className="p-1 rounded text-red-500 hover:bg-red-50"
                      title="Delete requirement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {storeRequirements.length === 0 && (
                <div className="py-24 text-center text-zinc-400">
                  <Send className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No store requisitions raised</p>
                  <p className="text-[10px] text-zinc-500">Add vegetable requirements to notify the administrator.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* --- SUB-TAB CONTENT: CUSTOMER ORDERS MANAGEMENT --- */}
      {activeSubTab === ('customer-orders' as any) && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
          <div className="border-b border-zinc-100 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Consumer Order Desk</h3>
              <p className="text-xs text-zinc-400">Incoming requests dispatched via the Customer Kiosk.</p>
            </div>
            <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-black text-indigo-700 uppercase tracking-tight">
              {customerOrders.filter(co => co.storeId === store.id).length} Orders Total
            </span>
          </div>

          <div className="space-y-3">
            {customerOrders.filter(co => co.storeId === store.id).map(order => {
              const isUnprocessed = order.status === 'Pending' || order.status === 'Processing' || order.status === 'Ready';
              const isEditing = editingOrderId === order.id;

              if (isEditing) {
                return (
                  <div 
                    key={order.id} 
                    className="p-4 rounded-xl border border-emerald-500 bg-emerald-50/10 shadow-md space-y-4 text-left"
                  >
                    <div className="flex justify-between items-center border-b border-dashed border-emerald-200 pb-2">
                      <span className="text-xs font-black text-emerald-800 uppercase">Editing Order #{order.id}</span>
                      <button 
                        type="button" 
                        onClick={() => setEditingOrderId(null)}
                        className="text-zinc-400 hover:text-zinc-600 font-bold text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Customer Name</label>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Customer Phone</label>
                        <input 
                          type="text" 
                          value={editPhone} 
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Order Status</label>
                        <select 
                          value={editStatus} 
                          onChange={(e) => setEditStatus(e.target.value as any)}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs font-semibold focus:outline-none bg-white"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Ready">Ready</option>
                          <option value="Completed">Completed</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Payment Status</label>
                        <select 
                          value={editPaymentStatus} 
                          onChange={(e) => setEditPaymentStatus(e.target.value as any)}
                          className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs font-semibold focus:outline-none bg-white"
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="block text-[9px] font-black tracking-wider text-zinc-400 uppercase">Crop Manifest Items</span>
                      <div className="space-y-2">
                        {editItems.map((it, idx) => (
                          <div key={idx} className="bg-white rounded-lg border border-zinc-200 p-2 flex justify-between items-center text-xs gap-3">
                            <span className="font-bold text-zinc-850 truncate">
                              {it.vegetableName} <span className="text-[10px] text-zinc-400 font-normal">(₹{it.pricePerKg.toFixed(1)}/kg)</span>
                            </span>
                            
                            <div className="flex items-center gap-1">
                              <button 
                                type="button"
                                onClick={() => {
                                  const newQty = Math.max(0.1, it.quantity - 0.5);
                                  const updated = [...editItems];
                                  updated[idx] = {
                                    ...it,
                                    quantity: parseFloat(newQty.toFixed(2)),
                                    totalPrice: parseFloat((newQty * it.pricePerKg).toFixed(2))
                                  };
                                  setEditItems(updated);
                                }}
                                className="w-5 h-5 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center font-bold text-xs"
                              >
                                -
                              </button>
                              
                              <input 
                                type="number" 
                                step="0.1"
                                min="0.1"
                                value={it.quantity} 
                                onChange={(e) => {
                                  const newQty = Math.max(0.1, parseFloat(e.target.value) || 0.1);
                                  const updated = [...editItems];
                                  updated[idx] = {
                                    ...it,
                                    quantity: newQty,
                                    totalPrice: parseFloat((newQty * it.pricePerKg).toFixed(2))
                                  };
                                  setEditItems(updated);
                                }}
                                className="w-12 text-center bg-transparent border-b border-zinc-300 font-bold text-xs focus:outline-none font-mono"
                              />
                              
                              <button 
                                type="button"
                                onClick={() => {
                                  const newQty = it.quantity + 0.5;
                                  const updated = [...editItems];
                                  updated[idx] = {
                                    ...it,
                                    quantity: parseFloat(newQty.toFixed(2)),
                                    totalPrice: parseFloat((newQty * it.pricePerKg).toFixed(2))
                                  };
                                  setEditItems(updated);
                                }}
                                className="w-5 h-5 rounded bg-zinc-200 hover:bg-zinc-300 flex items-center justify-center font-bold text-xs"
                              >
                                +
                              </button>

                              <button 
                                type="button"
                                onClick={() => {
                                  const updated = editItems.filter((_, itemIdx) => itemIdx !== idx);
                                  setEditItems(updated);
                                }}
                                className="text-rose-600 hover:bg-rose-50 p-1 rounded ml-1"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <select 
                        defaultValue=""
                        onChange={(e) => {
                          const selectedVeg = e.target.value;
                          if (!selectedVeg) return;
                          
                          if (editItems.some(it => it.vegetableName.toLowerCase() === selectedVeg.toLowerCase())) {
                            e.target.value = "";
                            return;
                          }

                          const invItem = storeInventory.find(inv => inv.vegetableName.toLowerCase() === selectedVeg.toLowerCase());
                          const price = invItem ? invItem.sellingPrice : 50;

                          const newItem = {
                            vegetableName: selectedVeg,
                            quantity: 1.0,
                            pricePerKg: price,
                            totalPrice: price
                          };

                          setEditItems([...editItems, newItem]);
                          e.target.value = "";
                        }}
                        className="w-full rounded-lg border border-zinc-200 p-1.5 text-xs font-semibold focus:outline-none cursor-pointer bg-white"
                      >
                        <option value="">➕ Add extra crop item to this order...</option>
                        {PREDEFINED_REQS.map(crop => (
                          <option key={crop} value={crop}>{crop}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200 pt-3">
                      <div className="text-xs">
                        <span className="text-zinc-400 uppercase font-black text-[9px]">Calculated Total:</span>
                        <p className="text-base font-black text-emerald-700">₹{editItems.reduce((acc, curr) => acc + curr.totalPrice, 0).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          type="button"
                          onClick={() => setEditingOrderId(null)}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 text-zinc-700 text-xs font-bold hover:bg-zinc-50 transition-colors cursor-pointer"
                        >
                          Discard
                        </button>
                        <button 
                          type="button"
                          onClick={handleSaveEditOrder}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={order.id} 
                  className={`p-4 rounded-xl border transition-all text-left ${
                    order.status === 'Completed' 
                      ? 'border-emerald-200 bg-emerald-50/20' 
                      : order.status === 'Cancelled' 
                      ? 'border-zinc-200 bg-zinc-50 text-zinc-500 opacity-70' 
                      : 'border-indigo-200 bg-indigo-50/20 shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-dashed border-zinc-200/60 pb-3.5 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-zinc-900 text-xs">{order.customerName}</span>
                        <span className="text-[10px] text-zinc-400">({order.customerPhone})</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-bold uppercase mt-1">
                        Order ID: <span className="font-mono text-zinc-500">{order.id}</span> • Filed {new Date(order.orderDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                        order.paymentStatus === 'Paid' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {order.paymentStatus}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                        order.status === 'Completed' 
                          ? 'bg-emerald-600 text-white' 
                          : order.status === 'Cancelled' 
                          ? 'bg-zinc-300 text-zinc-600' 
                          : 'bg-indigo-600 text-white animate-pulse'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <span className="block text-[9px] font-black tracking-wider text-zinc-400 uppercase">Crop Manifest</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="bg-white rounded-lg border border-zinc-150 p-2 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-zinc-800">{it.vegetableName}</span>
                            <span className="text-[9px] text-zinc-400 ml-1.5">(₹{it.pricePerKg.toFixed(2)}/kg)</span>
                          </div>
                          <span className="font-extrabold text-zinc-900">{it.quantity} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-zinc-200/40 pt-3">
                    <div className="text-xs">
                      <span className="text-zinc-400 uppercase font-black text-[9px]">Grand Total:</span>
                      <p className="text-base font-black text-indigo-700">₹{order.totalAmount.toFixed(2)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isUnprocessed && onUpdateCustomerOrder && (
                        <button
                          onClick={() => handleStartEditOrder(order)}
                          className="px-2.5 py-1.5 rounded-lg border border-indigo-250 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                        >
                          Edit Details
                        </button>
                      )}

                      {isUnprocessed && onFulfillCustomerOrder && (
                        <button
                          onClick={() => {
                            if (confirm(`Fulfill order for ${order.customerName}? This will automatically deduct weights from current stock and register sales logs.`)) {
                              onFulfillCustomerOrder(order);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                        >
                          Fulfill & Ship
                        </button>
                      )}

                      {isUnprocessed && onDeleteCustomerOrder && (
                        <button
                          onClick={() => {
                            if (confirm('Cancel this consumer order?')) {
                              onDeleteCustomerOrder(order.id);
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-lg border border-red-250 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {customerOrders.filter(co => co.storeId === store.id).length === 0 && (
              <div className="py-24 text-center text-zinc-400">
                <span>📦</span>
                <p className="text-xs font-semibold mt-2">No consumer orders received yet</p>
                <p className="text-[10px] text-zinc-500">Customers can order fresh crops from the storefront tab.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- SUB-TAB CONTENT: BRANCH INFO --- */}
      {activeSubTab === 'info' && (
        <div className="space-y-6 animate-fade-in">
          {/* Main detailed information panel */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5">
            <div className="border-b border-slate-800 pb-4">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                Active Trading Branch Space
              </span>
              <h3 className="text-xl font-black mt-2 tracking-tight text-white">{store.name}</h3>
              <p className="text-xs text-slate-400 mt-1">Detailed metrics, setup credentials, and bulk diagnostics tools.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/80">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Stock Count</span>
                <span className="text-lg font-black text-emerald-400">{storeInventory.length} crop lines</span>
                <p className="text-[10px] text-slate-400 mt-1">Total unique articles registered in inventory catalog.</p>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/80">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Aggregate Revenue</span>
                <span className="text-lg font-black text-white">₹{storeSales.reduce((a,c) => a + c.totalPrice, 0).toFixed(2)}</span>
                <p className="text-[10px] text-slate-400 mt-1">Cumulative sales recorded across this branch session.</p>
              </div>

              <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800/80">
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Total Volume Sold</span>
                <span className="text-lg font-black text-amber-400">{storeSales.reduce((a,c) => a + c.quantity, 0).toFixed(1)} kg</span>
                <p className="text-[10px] text-slate-400 mt-1">Total crop quantities cleared through checkout.</p>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-5 space-y-3.5">
              <h4 className="text-xs uppercase font-black tracking-widest text-slate-400">Branch Configuration</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-850/50 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Location Desk:</span>
                  <span className="font-bold text-slate-100">{store.location || 'Not Specified'}</span>
                </div>
                <div className="bg-slate-850/50 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Contact Number:</span>
                  <span className="font-bold text-slate-100">{store.whatsappNumber || 'Not Configured'}</span>
                </div>
                <div className="bg-slate-850/50 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">User Mode Access:</span>
                  <span className="font-bold text-slate-100 uppercase bg-blue-500/10 text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded-md text-[10px]">{role || 'Store Manager'}</span>
                </div>
                <div className="bg-slate-850/50 p-3.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <span className="text-slate-400">Active Warning Threshold:</span>
                  <span className="font-bold text-amber-400">≤ 10 Units</span>
                </div>
              </div>
            </div>

            {/* Quick Actions / Diagnostic tools inside tab */}
            <div className="border-t border-slate-800 pt-5 space-y-3">
              <h4 className="text-xs uppercase font-black tracking-widest text-slate-400">Diagnostics & Seed Utilities</h4>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleBulkSeedCrops}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-950/20"
                >
                  🌾 Bulk Seed Standard Crops Catalog
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Reset local active cart entries?")) {
                      handleClearPosCart();
                      alert("Cart cleared successfully.");
                    }
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer border border-slate-700/50"
                >
                  ♻️ Reset Cart Buffer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
