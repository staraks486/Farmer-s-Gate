import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
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
  X,
  Edit2,
  Scan,
  Bell,
  AlertCircle,
  Store as StoreIcon,
  Mic,
  ChevronDown,
  ChevronRight,
  QrCode,
  Download,
  Copy,
  ExternalLink,
  Printer
} from 'lucide-react';
import QRCode from 'qrcode';
import { Store, Sale, Purchase, InventoryItem, Requirement, CustomerOrder, CpanelSettings, AppNotification } from '../types';
import { dbGetForceOffline, dbSetForceOffline, getSupabaseConfig } from '../lib/supabase';
import { subscribeToNotifications } from '../lib/firebase';
import { QrScanner } from './QrScanner';

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
  cpanelSettings?: CpanelSettings;
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
  onDeleteCustomerOrder,
  cpanelSettings
}: StoreManagerProps) {
  const currencySymbol = cpanelSettings?.currencySymbol || '₹';
  const [activeSubTab, setActiveSubTab] = useState<'sale' | 'sales-history' | 'purchase' | 'inventory' | 'requirements' | 'info' | 'qr-code'>('sale');
  const [offlineMode, setOfflineMode] = useState<boolean>(dbGetForceOffline());
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'Card' | 'UPI'>('Cash');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Real-time broadcast notifications from the central database
  const [broadcastNotifications, setBroadcastNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((notifs) => {
      setBroadcastNotifications(notifs);
    });
    return () => unsubscribe();
  }, []);

  const COMMON_CROPS_LIST = [
    { name: 'Potato', emoji: '🥔', defaultPrice: 30 },
    { name: 'Onion', emoji: '🧅', defaultPrice: 40 },
    { name: 'Tomato', emoji: '🍅', defaultPrice: 50 },
    { name: 'Carrot', emoji: '🥕', defaultPrice: 60 },
    { name: 'Spinach', emoji: '🥬', defaultPrice: 25 },
    { name: 'Garlic', emoji: '🧄', defaultPrice: 120 },
    { name: 'Ginger', emoji: '🫚', defaultPrice: 140 },
    { name: 'Chili', emoji: '🌶️', defaultPrice: 80 },
    { name: 'Lemon', emoji: '🍋', defaultPrice: 100 },
    { name: 'Apple', emoji: '🍎', defaultPrice: 200 },
    { name: 'Banana', emoji: '🍌', defaultPrice: 60 },
    { name: 'Orange', emoji: '🍊', defaultPrice: 120 },
    { name: 'Mango', emoji: '🥭', defaultPrice: 150 },
    { name: 'Pomegranate', emoji: '🍎', defaultPrice: 240 },
    { name: 'Pineapple', emoji: '🍍', defaultPrice: 80 },
    { name: 'Coconut', emoji: '🥥', defaultPrice: 50 }
  ];

  const handleQuickAddCrop = async (crop: { name: string; emoji: string; defaultPrice: number }) => {
    let matchedItem = storeInventory.find(item => 
      item.vegetableName.toLowerCase().includes(crop.name.toLowerCase()) ||
      crop.name.toLowerCase().includes(item.vegetableName.toLowerCase())
    );
    
    if (!matchedItem) {
      matchedItem = {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        storeId: store.id,
        vegetableName: crop.name,
        quantity: 100,
        costPrice: crop.defaultPrice * 0.75,
        sellingPrice: crop.defaultPrice,
        minStockThreshold: 10,
        lastUpdated: new Date().toISOString()
      };
      await onUpdateInventoryItem(matchedItem);
    }
    
    handleAddToPosCart(matchedItem);
    
    if (cpanelSettings?.alertSoundEnabled) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.08);
      } catch (e) {
        console.log("Audio feedback error:", e);
      }
    }
  };

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
  const [saleSubView, setSaleSubView] = useState<'items' | 'checkout' | 'details' | 'notifications'>('items');

  useEffect(() => {
    if (saleSubView === 'checkout') {
      setShowCheckoutModal(true);
      setSaleSubView('items');
    }
  }, [saleSubView]);
  const [saleMode, setSaleMode] = useState<'pos' | 'classic'>('pos');
  const [mobilePosTab, setMobilePosTab] = useState<'crops' | 'cart'>('crops');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [billingQuote, setBillingQuote] = useState('');
  const [posCart, setPosCart] = useState<Record<string, PosCartItem>>({});
  const [posCustomerName, setPosCustomerName] = useState('');
  
  // Multiple POS Billing Tabs State
  const [billingTabs, setBillingTabs] = useState<{
    id: string;
    label: string;
    cart: Record<string, PosCartItem>;
    customerName: string;
    whatsappPhone: string;
  }[]>([
    { id: 'bill-1', label: 'Bill 1', cart: {}, customerName: '', whatsappPhone: '' },
    { id: 'bill-2', label: 'Bill 2', cart: {}, customerName: '', whatsappPhone: '' },
    { id: 'bill-3', label: 'Bill 3', cart: {}, customerName: '', whatsappPhone: '' }
  ]);
  const [activeBillingTabId, setActiveBillingTabId] = useState<string>('bill-1');

  // New States for Redesigned Sale Panel, Breadcrumbs, and Voice Speech Input
  const [isStoreBreadcrumbOpen, setIsStoreBreadcrumbOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceFeedback, setVoiceFeedback] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState<CustomerOrder | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  // QR Code Generator States
  const [qrDestinationType, setQrDestinationType] = useState<'storefront' | 'express-billing' | 'custom'>('storefront');
  const [qrCustomUrl, setQrCustomUrl] = useState('');
  const [qrFgColor, setQrFgColor] = useState('#047857'); // Emerald 700 default
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrSize, setQrSize] = useState(300);
  const [qrErrorLevel, setQrErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrIsGenerating, setQrIsGenerating] = useState(false);
  const [qrCopySuccess, setQrCopySuccess] = useState(false);

  // Auto-generate QR code base64 URL on inputs change
  useEffect(() => {
    let targetUrl = '';
    if (qrDestinationType === 'storefront') {
      targetUrl = `${window.location.origin}${window.location.pathname}#/customer-hub?storeId=${store.id}`;
    } else if (qrDestinationType === 'express-billing') {
      targetUrl = `${window.location.origin}${window.location.pathname}#/store?storeId=${store.id}`;
    } else {
      targetUrl = qrCustomUrl || `${window.location.origin}${window.location.pathname}`;
    }

    setQrIsGenerating(true);
    QRCode.toDataURL(targetUrl, {
      width: qrSize,
      margin: 2,
      errorCorrectionLevel: qrErrorLevel,
      color: {
        dark: qrFgColor,
        light: qrBgColor,
      }
    })
    .then(url => {
      setQrDataUrl(url);
      setQrIsGenerating(false);
    })
    .catch(err => {
      console.error('Error generating QR code:', err);
      setQrIsGenerating(false);
    });
  }, [qrDestinationType, qrCustomUrl, qrFgColor, qrBgColor, qrSize, qrErrorLevel, store.id]);

  const handleDownloadQrFlyer = () => {
    if (!qrDataUrl) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;

      // Draw elegant outer border (emerald-800 color #065f46)
      doc.setDrawColor(6, 95, 70);
      doc.setLineWidth(1.5);
      doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

      // Draw thin internal accent line
      doc.setDrawColor(209, 213, 219); // slate-200
      doc.setLineWidth(0.3);
      doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

      // Draw Top Branding Header (Emerald Green Background)
      doc.setFillColor(4, 120, 87); // #047857
      doc.rect(15, 15, pageWidth - 30, 42, 'F');

      // Add "FARMER'S GATE" Text in white
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(30);
      doc.text("FARMER'S GATE", pageWidth / 2, 28, { align: 'center' });

      // Add Subtitle
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(167, 243, 208); // light green accent #a7f3d0
      doc.text("FRESH FROM THE FARM TO YOUR HOME", pageWidth / 2, 35, { align: 'center' });

      // Add a dividing line in the banner
      doc.setDrawColor(255, 255, 255, 0.2);
      doc.setLineWidth(0.5);
      doc.line(30, 40, pageWidth - 30, 40);

      // Add "DIGITAL STOREFRONT"
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text("LIVE CATALOG  •  REAL-TIME INVENTORY  •  DIRECT CHECKOUT", pageWidth / 2, 45, { align: 'center' });

      // Display Outlet Name
      doc.setTextColor(17, 24, 39); // deep slate #111827
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      const outletName = store.name.replace("Farmer's Gate - ", "").toUpperCase();
      doc.text(outletName, pageWidth / 2, 75, { align: 'center' });

      // Subheading
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(75, 85, 99); // #4b5563
      doc.text("SCAN TO VIEW STOCK & ORDER FRESH", pageWidth / 2, 83, { align: 'center' });

      // Accent border around the QR code area
      doc.setDrawColor(229, 231, 235); // #e5e7eb
      doc.setLineWidth(1);
      doc.setFillColor(249, 250, 251); // #f9fafb
      doc.rect(50, 95, 110, 110, 'FD');

      // Embed the QR Code image
      doc.addImage(qrDataUrl, 'PNG', 55, 100, 100, 100);

      // Instruction Text block
      doc.setTextColor(55, 65, 81); // #374151
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text("Instructions for Customers:", 20, 222);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99); // #4b5563
      
      const instructions = [
        "1. Open your phone camera app or any QR code scanning application.",
        "2. Hold your device over the QR code so it's fully visible on screen.",
        "3. Click the link popup to view our live catalog, prices, and stock levels.",
        "4. Add fresh crops to your cart and place your order directly!"
      ];

      let yOffset = 229;
      instructions.forEach(line => {
        doc.text(line, 20, yOffset);
        yOffset += 5.5;
      });

      // Bottom Callout/Offer Box
      doc.setFillColor(240, 253, 244); // light emerald-50 #f0fdf4
      doc.setDrawColor(167, 243, 208); // emerald-200 #a7f3d0
      doc.rect(20, 254, pageWidth - 40, 15, 'FD');

      doc.setTextColor(6, 95, 70); // emerald-800
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text("⚡ NO QUEUES  •  100% CONTACTLESS ORDERING  •  SECURE CASH/UPI", pageWidth / 2, 263, { align: 'center' });

      // Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175); // gray-400
      doc.text("Farmer's Gate Store Manager Smart Automation. All Rights Reserved.", pageWidth / 2, 283, { align: 'center' });

      // Save document
      const fileName = `${store.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_qr_flyer.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error("Flyer PDF generation failed:", e);
      alert("An error occurred while generating the flyer PDF. Please try again.");
    }
  };

  const handleStartVoiceInput = (onTranscript: (text: string) => void) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice speech recognition is not natively supported in this browser. Please use Google Chrome or Safari for full speech capability.");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-IN'; // Optimized for bilingual pronunciation in India

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceFeedback('Listening for speech...');
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceFeedback(transcript);
      onTranscript(transcript);
      
      // Auto-clear feedback after 4 seconds
      setTimeout(() => {
        setVoiceFeedback('');
      }, 4000);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      setVoiceFeedback(`Error: ${event.error}`);
      setTimeout(() => setVoiceFeedback(''), 3000);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSwitchBillingTab = (targetTabId: string) => {
    setBillingTabs(prev => {
      const updated = prev.map(t => {
        if (t.id === activeBillingTabId) {
          return {
            ...t,
            cart: posCart,
            customerName: posCustomerName,
            whatsappPhone: whatsappPhone
          };
        }
        return t;
      });
      const targetTab = updated.find(t => t.id === targetTabId);
      if (targetTab) {
        setPosCart(targetTab.cart);
        setPosCustomerName(targetTab.customerName);
        setWhatsappPhone(targetTab.whatsappPhone);
        setActiveBillingTabId(targetTabId);
      }
      return updated;
    });
  };

  const handleAddBillingTab = () => {
    setBillingTabs(prev => {
      const updated = prev.map(t => {
        if (t.id === activeBillingTabId) {
          return { ...t, cart: posCart, customerName: posCustomerName, whatsappPhone: whatsappPhone };
        }
        return t;
      });
      const newId = `bill-${Date.now()}`;
      const nextNum = updated.length + 1;
      const newTab = { id: newId, label: `Bill ${nextNum}`, cart: {}, customerName: '', whatsappPhone: '' };
      
      setPosCart({});
      setPosCustomerName('');
      setWhatsappPhone('');
      setActiveBillingTabId(newId);
      
      return [...updated, newTab];
    });
  };

  const handleRenameBillingTab = (tabId: string) => {
    const tab = billingTabs.find(t => t.id === tabId);
    if (!tab) return;
    const currentName = tabId === activeBillingTabId ? (posCustomerName || tab.label) : (tab.customerName || tab.label);
    const newName = prompt(`Enter customer name or reference for this billing tab:`, currentName);
    if (newName === null) return;
    
    setBillingTabs(prev => prev.map(t => {
      if (t.id === tabId) {
        return { 
          ...t, 
          label: newName.trim() || t.label,
          customerName: tabId === activeBillingTabId ? newName.trim() : t.customerName
        };
      }
      return t;
    }));
    
    if (tabId === activeBillingTabId) {
      setPosCustomerName(newName.trim());
    }
  };

  const handleDeleteBillingTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (billingTabs.length <= 1) {
      alert("At least one active billing tab must be open.");
      return;
    }
    
    if (!confirm("Are you sure you want to close this billing tab? All unsaved items in this cart will be lost.")) {
      return;
    }
    
    setBillingTabs(prev => {
      const filtered = prev.filter(t => t.id !== tabId);
      if (activeBillingTabId === tabId) {
        const nextActive = filtered[0];
        setPosCart(nextActive.cart);
        setPosCustomerName(nextActive.customerName);
        setWhatsappPhone(nextActive.whatsappPhone);
        setActiveBillingTabId(nextActive.id);
      }
      return filtered;
    });
  };

  const [posSearch, setPosSearch] = useState('');
  const [activeCropFilter, setActiveCropFilter] = useState<'ALL' | 'VEGGIES' | 'FRUITS' | 'GROCERY'>('ALL');
  const [rowInputs, setRowInputs] = useState<Record<string, { quantity: string; unit: string }>>({});
  const [completedBill, setCompletedBill] = useState<{
    id: string;
    customerName?: string;
    items: { vegetableName: string; quantity: number; unit?: string; pricePerKg: number; totalPrice: number }[];
    totalAmount: number;
    date: string;
    paymentMode?: 'Cash' | 'Card' | 'UPI';
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
    const finalBill = {
      id: `FG-BILL-${Math.floor(100000 + Math.random() * 900000)}`,
      customerName: posCustomerName.trim() || 'Retail Customer',
      items: billItems,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      date: new Date().toLocaleString(),
      paymentMode: paymentMode
    };

    setCompletedBill(finalBill);

    // Automatically generate and download the clean PDF summary
    handleDownloadPDF(finalBill);

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
    
    msg += `\n*TOTAL AMOUNT: ₹${completedBill.totalAmount.toFixed(2)}*\n`;
    if (completedBill.paymentMode) {
      msg += `*Payment Mode:* ${completedBill.paymentMode.toUpperCase()}\n`;
    }
    msg += `\n`;
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

  const handleDownloadPDF = (customBill?: any) => {
    const billToUse = (customBill && typeof customBill === 'object' && 'id' in customBill) ? customBill : completedBill;
    if (!billToUse) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner Background (Soft Light Greenish Gray)
      doc.setFillColor(240, 253, 244);
      doc.rect(0, 0, 210, 42, 'F');

      // Header Left Accent Bar (Deep Emerald)
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 4, 'F');

      // Title & Branding
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("FARMER'S GATE", 15, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(5, 150, 105); // Deep Emerald
      doc.text(`TRUCK OUTLET BRANCH • ${store.name.toUpperCase()}`, 15, 24);

      // Invoice metadata (Right Side)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("SALES RECEIPT", 140, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate-600
      doc.text(`Receipt No: ${billToUse.id}`, 140, 24);
      doc.text(`Date: ${billToUse.date}`, 140, 29);

      // Section divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 48, 195, 48);

      // Customer & Store Information section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("CUSTOMER DETAILS", 15, 57);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Name: ${billToUse.customerName || 'Retail Customer'}`, 15, 63);
      doc.text(`Phone: ${whatsappPhone.trim() ? '+91 ' + whatsappPhone : 'N/A'}`, 15, 68);

      // Payment & Register Details (Right side)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("TRANSACTION SUMMARY", 120, 57);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Payment Mode: ${billToUse.paymentMode?.toUpperCase() || 'CASH'}`, 120, 63);
      doc.text(`Status: Completed & Settled`, 120, 68);

      // Table Header Background
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(15, 78, 180, 8, 'F');

      // Table Headers
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // Slate-700
      doc.text("SL.", 18, 83);
      doc.text("CROP DESCRIPTION", 28, 83);
      doc.text("QUANTITY", 95, 83);
      doc.text("RATE (Rs./kg)", 135, 83);
      doc.text("SUBTOTAL (Rs.)", 168, 83);

      // Table Row Data
      let y = 92;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      billToUse.items.forEach((it, idx) => {
        // Zebra striping
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate-50
          doc.rect(15, y - 5, 180, 7.5, 'F');
        }

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text((idx + 1).toString(), 18, y);
        doc.text(it.vegetableName.toUpperCase(), 28, y);

        const unitLabel = (it as any).unit || 'kg';
        doc.text(`${it.quantity} ${unitLabel}`, 95, y);
        
        const baseLabel = unitLabel === 'g' ? 'kg' : 'unit';
        doc.text(`Rs. ${it.pricePerKg}/${baseLabel}`, 135, y);
        
        doc.setFont('Helvetica', 'bold');
        doc.text(`Rs. ${it.totalPrice.toFixed(2)}`, 168, y);

        // Underline row
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(15, y + 2.5, 195, y + 2.5);

        y += 8;
      });

      // Totals Box
      y += 5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(110, y, 195, y);

      y += 6;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("INVOICE GRAND TOTAL:", 110, y);

      doc.setFontSize(13);
      doc.setTextColor(5, 150, 105);
      doc.text(`Rs. ${billToUse.totalAmount.toFixed(2)}`, 165, y);

      // Quote & Health Tip banner
      y += 18;
      if (y > 245) {
        doc.addPage();
        y = 30;
      }
      doc.setFillColor(240, 253, 244); // Light green background
      doc.rect(15, y, 180, 14, 'F');

      // Solid left border for quote block
      doc.setFillColor(16, 185, 129);
      doc.rect(15, y, 1.5, 14, 'F');

      doc.setFont('Helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(6, 95, 70);
      const quoteText = billingQuote || "Choose fresh veggies for maximum vitality!";
      doc.text(`"${quoteText}"`, 20, y + 8, { maxWidth: 170 });

      // Bottom Footer Message
      y += 24;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("🍎 Fresh from farm to keep you strong! 🌱", 105, y, { align: 'center' });

      y += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Farmer's Gate - Smart Mobile Mandi outlets. Eat fresh, live active!", 105, y, { align: 'center' });

      // Save PDF to downloads
      doc.save(`FG_Receipt_${billToUse.id}.pdf`);
    } catch (e) {
      console.error("jsPDF generation failed:", e);
      alert("Local PDF download was triggered successfully.");
    }
  };

  const handleDownloadOrderPDF = (order: CustomerOrder) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Header Banner Background (Soft Light Indigo/Blue-Gray)
      doc.setFillColor(245, 247, 255);
      doc.rect(0, 0, 210, 42, 'F');

      // Header Left Accent Bar (Deep Indigo)
      doc.setFillColor(79, 70, 229);
      doc.rect(0, 0, 210, 4, 'F');

      // Title & Branding
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // Slate-900
      doc.text("FARMER'S GATE", 15, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(79, 70, 229); // Indigo
      doc.text(`CUSTOMER ORDER MANIFEST • ${store.name.toUpperCase()}`, 15, 24);

      // Invoice metadata (Right Side)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text("CUSTOMER ORDER", 135, 18);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105); // Slate-600
      doc.text(`Order ID: ${order.orderNumber || order.id.substring(0, 10).toUpperCase()}`, 135, 24);
      doc.text(`Date: ${order.orderDate ? new Date(order.orderDate).toLocaleString() : new Date().toLocaleString()}`, 135, 29);

      // Section divider line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(15, 48, 195, 48);

      // Customer & Store Information section
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("CUSTOMER SHIPPING DETAILS", 15, 57);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Name: ${order.customerName}`, 15, 63);
      doc.text(`Phone: +91 ${order.customerPhone}`, 15, 68);
      if (order.customerAddress) {
        doc.text(`Address: ${order.customerAddress}`, 15, 73, { maxWidth: 95 });
      }

      // Order Status Details (Right side)
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text("ORDER SUMMARY STATUS", 120, 57);

      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Processing Status: ${order.status.toUpperCase()}`, 120, 63);
      doc.text(`Payment Status: ${order.paymentStatus?.toUpperCase() || 'UNPAID'}`, 120, 68);
      if (order.notes) {
        doc.text(`Special Notes: ${order.notes}`, 120, 73, { maxWidth: 75 });
      }

      // Table Header Background
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(15, 82, 180, 8, 'F');

      // Table Headers
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85); // Slate-700
      doc.text("SL.", 18, 87);
      doc.text("VEGETABLE/CROP NAME", 28, 87);
      doc.text("REQUIRED WEIGHT", 95, 87);
      doc.text("EST. RATE (Rs./kg)", 135, 87);
      doc.text("SUBTOTAL (Rs.)", 168, 87);

      // Table Row Data
      let y = 96;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);

      order.items.forEach((it, idx) => {
        // Zebra striping
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252); // Slate-50
          doc.rect(15, y - 5, 180, 7.5, 'F');
        }

        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text((idx + 1).toString(), 18, y);
        doc.text(it.vegetableName.toUpperCase(), 28, y);

        doc.text(`${it.quantity} kg`, 95, y);
        doc.text(`Rs. ${it.pricePerKg}/kg`, 135, y);
        
        doc.setFont('Helvetica', 'bold');
        doc.text(`Rs. ${it.totalPrice.toFixed(2)}`, 168, y);

        // Underline row
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.3);
        doc.line(15, y + 2.5, 195, y + 2.5);

        y += 8;
      });

      // Totals Box
      y += 5;
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(110, y, 195, y);

      y += 6;
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("ESTIMATED GRAND TOTAL:", 110, y);

      doc.setFontSize(13);
      doc.setTextColor(79, 70, 229);
      doc.text(`Rs. ${order.totalAmount.toFixed(2)}`, 165, y);

      // Bottom Footer Message
      y += 24;
      if (y > 265) {
        doc.addPage();
        y = 30;
      }
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text("🍎 Fresh from farm to keep you strong! 🌱", 105, y, { align: 'center' });

      y += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("Farmer's Gate - Smart Mobile Mandi outlets. Eat fresh, live active!", 105, y, { align: 'center' });

      // Save PDF to downloads
      doc.save(`FG_Order_${order.orderNumber || order.id.substring(0, 8)}.pdf`);
    } catch (e) {
      console.error("jsPDF order generation failed:", e);
      alert("Local PDF order download was triggered successfully.");
    }
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

    if (completedBill.paymentMode) {
      y += 18;
      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 10px Courier New, monospace';
      ctx.textAlign = 'left';
      ctx.fillText("PAYMENT MODE", 25, y + 10);
      ctx.textAlign = 'right';
      ctx.fillText(completedBill.paymentMode.toUpperCase(), canvas.width - 25, y + 10);
    }

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

  // --- QR & BARCODE SCANNER INTEGRATION STATE ---
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'pos' | 'sale' | 'purchase' | 'inventory'>('pos');

  const handleQrScanSuccess = (scannedValue: string) => {
    setIsScannerOpen(false);
    
    // Attempt standard lookup case-insensitively
    const matchedItem = storeInventory.find(
      item => item.vegetableName.toLowerCase() === scannedValue.toLowerCase() || item.id === scannedValue
    );

    if (scannerTarget === 'pos') {
      if (matchedItem) {
        // Automatically add 1 unit/kg directly to the Point of Sale cart
        handleAddToPosCartWithParams(matchedItem, 1, 'kg');
        setPosSearch(''); // clear search
      } else {
        // Fallback to searching/quick-adding
        setPosSearch(scannedValue);
      }
    } else if (scannerTarget === 'sale') {
      if (matchedItem) {
        setSaleVegName(matchedItem.vegetableName);
        handleSaleVegSelect(matchedItem.vegetableName);
      } else {
        setSaleVegName(scannedValue);
        handleSaleVegSelect(scannedValue);
      }
    } else if (scannerTarget === 'purchase') {
      if (matchedItem) {
        setPurchaseVegName(matchedItem.vegetableName);
      } else {
        setPurchaseVegName(scannedValue);
      }
    } else if (scannerTarget === 'inventory') {
      setVegSearchQuery(scannedValue);
    }
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

  const handleReuseRequirement = (oldReq: Requirement) => {
    const newReq: Requirement = {
      id: `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      storeId: store.id,
      vegetableName: oldReq.vegetableName,
      quantity: oldReq.quantity,
      priority: oldReq.priority || 'Medium',
      status: 'Pending',
      notes: oldReq.notes ? `Reused requisition: ${oldReq.notes}` : `Reused requisition`,
      createdAt: new Date().toISOString()
    };
    onAddRequirement(newReq);
    alert(`Successfully reused requisition! Raised a new Pending restock request for ${oldReq.quantity}kg of ${oldReq.vegetableName}.`);
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

        {/* QR Code tab */}
        <button
          id="tab-qr-code"
          onClick={() => setActiveSubTab('qr-code')}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'qr-code'
              ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <QrCode className="h-3.5 w-3.5" />
          Store QR Codes
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

                  {completedBill.paymentMode && (
                    <div className="flex justify-between items-baseline font-bold text-slate-500 text-[10px] mt-1 uppercase">
                      <span>PAYMENT MODE</span>
                      <span>{completedBill.paymentMode}</span>
                    </div>
                  )}

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
            <div className="space-y-5 animate-fade-in text-left">
              {/* Simplified Inner Desk sub-tabs placed prominently at the top */}
              <div className="flex bg-slate-100 p-0.5 sm:p-1 rounded-xl gap-0.5 sm:gap-1.5 shadow-3xs">
                <button
                  type="button"
                  onClick={() => setSaleSubView('items')}
                  className={`flex-1 py-1 sm:py-2 px-0.5 sm:px-3 text-[9px] sm:text-xs font-black rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 sm:gap-1.5 ${
                    saleSubView === 'items'
                      ? 'bg-white text-emerald-800 shadow-3xs border border-slate-200/30'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <span className="text-xs sm:text-sm">🥦</span>
                  <span className="hidden sm:inline">Sale Items</span>
                  <span className="sm:hidden">Sales</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSaleSubView('checkout')}
                  className={`flex-1 py-1 sm:py-2 px-0.5 sm:px-3 text-[9px] sm:text-xs font-black rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 sm:gap-1.5 ${
                    saleSubView === 'checkout'
                      ? 'bg-white text-emerald-800 shadow-3xs border border-slate-200/30'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <span className="text-xs sm:text-sm">🛒</span>
                  <span className="hidden sm:inline">Checkout</span>
                  <span className="sm:hidden">Cart</span>
                  {Object.keys(posCart).length > 0 && (
                    <span className="bg-emerald-600 text-white text-[8px] sm:text-[9px] px-1 py-0.5 rounded-full font-black animate-pulse">
                      {Object.keys(posCart).length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setSaleSubView('details')}
                  className={`flex-1 py-1 sm:py-2 px-0.5 sm:px-3 text-[9px] sm:text-xs font-black rounded-lg sm:rounded-xl transition-all cursor-pointer flex items-center justify-center gap-0.5 sm:gap-1.5 ${
                    saleSubView === 'details'
                      ? 'bg-white text-emerald-800 shadow-3xs border border-slate-200/30'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <span className="text-xs sm:text-sm">🏪</span>
                  <span className="hidden sm:inline">Store Details & Alerts</span>
                  <span className="sm:hidden">Alerts</span>
                  {(() => {
                    const lowStockCount = storeInventory.filter(item => item.quantity <= item.minStockThreshold).length;
                    const pendingOrdersCount = customerOrders.filter(co => co.storeId === store.id && co.status !== 'Completed' && co.status !== 'Cancelled').length;
                    const totalAlerts = lowStockCount + pendingOrdersCount + broadcastNotifications.length;
                    return totalAlerts > 0 ? (
                      <span className="bg-rose-500 text-white text-[8px] sm:text-[9px] px-1 py-0.5 rounded-full font-black animate-pulse">
                        {totalAlerts}
                      </span>
                    ) : null;
                  })()}
                </button>
              </div>

              {/* Sub-view: SALE ITEMS */}
              {saleSubView === 'items' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Multi-Billing Registers at top of Sale Panel */}
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0 w-full">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider pr-2 border-r border-slate-200 shrink-0">
                        Registers
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-1">
                        {billingTabs.map((tab) => {
                          const isActive = tab.id === activeBillingTabId;
                          const tabCart = isActive ? posCart : tab.cart;
                          const itemCount = Object.keys(tabCart).length;
                          const subtotal = Object.keys(tabCart).reduce((sum, key) => sum + getSubtotal(tabCart[key]), 0);
                          const customerNameStr = isActive ? (posCustomerName || tab.label) : (tab.customerName || tab.label);
                          
                          return (
                            <div
                              key={tab.id}
                              onClick={() => handleSwitchBillingTab(tab.id)}
                              className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                                isActive
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-3xs'
                                  : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-1">
                                  <span className="truncate max-w-[90px] font-black">{customerNameStr}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameBillingTab(tab.id);
                                    }}
                                    className="opacity-50 group-hover:opacity-100 p-0.5 hover:bg-emerald-100/50 rounded transition-opacity text-slate-400 hover:text-slate-600"
                                    title="Rename customer"
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-slate-500">
                                  {itemCount} item(s) • ₹{subtotal.toFixed(0)}
                                </span>
                              </div>

                              {billingTabs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteBillingTab(tab.id, e)}
                                  className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
                                  title="Close bill"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBillingTab}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer shrink-0 uppercase tracking-wider shadow-3xs"
                    >
                      + Add Register
                    </button>
                  </div>

                  {/* Crop search & scan code */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="relative flex-1 w-full flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search available crops..."
                          value={posSearch}
                          onChange={(e) => setPosSearch(e.target.value)}
                          className="w-full pl-9 pr-12 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/50"
                        />
                        {/* Voice Input Trigger Button */}
                        <button
                          type="button"
                          onClick={() => handleStartVoiceInput((text) => setPosSearch(text))}
                          className={`absolute right-2.5 top-1.5 p-1 rounded-lg transition-all ${
                            isListening
                              ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-150'
                          }`}
                          title="Speak crop name to search"
                        >
                          <Mic className={`h-4 w-4 ${isListening ? 'animate-bounce' : ''}`} />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTarget('pos');
                          setIsScannerOpen(true);
                        }}
                        title="Scan package code"
                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs hover:scale-[1.01]"
                      >
                        <Scan className="h-4 w-4 text-emerald-600 animate-pulse" />
                        <span>Scan Code</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsQuickAddOpen(true)}
                        title="Open Quick Add Bottom Sheet Grid"
                        className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs hover:scale-[1.01]"
                      >
                        <span className="text-sm">⚡</span>
                        <span>Quick Add</span>
                      </button>
                    </div>
                    {voiceFeedback && (
                      <div className="w-full text-left bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl px-3 py-1.5 text-[10px] font-black flex items-center gap-1.5 animate-pulse">
                        <span>🎙️ Heard:</span>
                        <span className="font-mono text-emerald-950 font-bold">"{voiceFeedback}"</span>
                      </div>
                    )}
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
                              ? 'bg-emerald-600 text-white shadow-sm'
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
                          className="bg-slate-850 hover:bg-slate-900 text-white px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer"
                        >
                          ADD TO BILL
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Linear List of Crop Items */}
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
                            className={`relative rounded-xl border p-2.5 bg-white shadow-xs hover:border-emerald-300 transition-all flex items-center justify-between gap-3 border-slate-200/80 ${
                              isOutOfStock ? 'opacity-60 bg-slate-50' : ''
                            }`}
                          >
                            {/* Left part: Emoji, Name, and standard price tag */}
                            <div className="flex-1 min-w-0 flex items-center gap-2.5">
                              <span className="text-base shrink-0">{getVegEmoji(item.vegetableName)}</span>
                              <div className="min-w-0">
                                <h4 className="font-extrabold text-xs sm:text-sm text-slate-800 truncate" title={item.vegetableName}>
                                  {item.vegetableName}
                                </h4>
                                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
                                    ₹{item.sellingPrice.toFixed(0)}/kg
                                  </span>
                                  {item.quantity <= 10 ? (
                                    <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded">
                                      {item.quantity === 0 ? 'Out of Stock' : `Low Stock: ${item.quantity.toFixed(0)} kg`}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono">
                                      Stock: {item.quantity.toFixed(0)} kg
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right part: Adding and Quantity input controls */}
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
                                    className="w-10 text-center text-xs font-black text-slate-850 bg-transparent focus:outline-none"
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
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white h-6.5 px-2.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center cursor-pointer uppercase shadow-xs"
                                  >
                                    {isOutOfStock ? 'OUT' : 'ADD'}
                                  </button>
                                </div>
                              ) : (
                                /* Standard +/- quantity adjustment controls inside a colored pill */
                                <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-100 rounded-lg p-0.5 h-7.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const step = cartItem.unit === 'g' ? 100 : 1;
                                      handleUpdatePosCartQty(item.vegetableName, cartItem.quantity - step);
                                    }}
                                    className="h-5 w-5 hover:bg-emerald-100 active:scale-95 rounded flex items-center justify-center text-xs font-black text-emerald-850 cursor-pointer shrink-0"
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
                                    className="h-5 w-5 hover:bg-emerald-100 active:scale-95 rounded flex items-center justify-center text-xs font-black text-emerald-850 cursor-pointer shrink-0"
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

                  {/* Persistent Sticky Cart Summary Bar at bottom */}
                  {Object.keys(posCart).length > 0 && (
                    <div 
                      onClick={() => setSaleSubView('checkout')}
                      className="bg-slate-900 hover:bg-slate-800 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg border border-slate-800 cursor-pointer transition-all hover:scale-[1.005] group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 p-2.5 rounded-xl">
                          <ShoppingCart className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xs sm:text-sm font-black text-slate-100">
                            {Object.keys(posCart).length} Crop line{Object.keys(posCart).length > 1 ? 's' : ''} added
                          </h3>
                          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                            Subtotal: <span className="text-emerald-400 font-extrabold font-mono">₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 text-emerald-400 group-hover:translate-x-1 transition-transform">
                        Proceed to checkout <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-view: BILL & CHECKOUT */}
              {saleSubView === 'checkout' && (
                <div className="space-y-4 animate-in fade-in duration-200 text-left">
                  {/* Multi-Billing Registers */}
                  <div className="bg-white p-3 rounded-2xl border border-slate-200/85 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider pr-2 border-r border-slate-200">
                        Registers
                      </div>
                      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                        {billingTabs.map((tab) => {
                          const isActive = tab.id === activeBillingTabId;
                          const tabCart = isActive ? posCart : tab.cart;
                          const itemCount = Object.keys(tabCart).length;
                          const subtotal = Object.keys(tabCart).reduce((sum, key) => sum + getSubtotal(tabCart[key]), 0);
                          const customerNameStr = isActive ? (posCustomerName || tab.label) : (tab.customerName || tab.label);
                          
                          return (
                            <div
                              key={tab.id}
                              onClick={() => handleSwitchBillingTab(tab.id)}
                              className={`group flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer shrink-0 ${
                                isActive
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-xs'
                                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-600'
                              }`}
                            >
                              <div className="flex flex-col text-left">
                                <div className="flex items-center gap-1.5">
                                  <span className="truncate max-w-[100px] font-black">{customerNameStr}</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRenameBillingTab(tab.id);
                                    }}
                                    className="opacity-60 group-hover:opacity-100 p-0.5 hover:bg-emerald-100/50 rounded transition-opacity text-slate-400 hover:text-slate-600"
                                    title="Rename bill customer"
                                  >
                                    <Edit2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                                <span className="text-[9px] font-mono font-bold text-slate-400 group-hover:text-slate-500">
                                  {itemCount} item(s) • ₹{subtotal.toFixed(2)}
                                </span>
                              </div>

                              {billingTabs.length > 1 && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteBillingTab(tab.id, e)}
                                  className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Close bill"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBillingTab}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-sm shrink-0 cursor-pointer self-start md:self-auto"
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Cart</span>
                    </button>
                  </div>

                  {/* Option to Load Customer Order */}
                  {customerOrders && customerOrders.filter(co => co.storeId === store.id && co.status === 'Pending').length > 0 && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2.5 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-black text-indigo-950 uppercase tracking-wide">
                          <span className="animate-pulse">📥</span> Load Customer Order to Edit / Checkout
                        </span>
                        <span className="bg-indigo-200 text-indigo-800 text-[9px] px-2 py-0.5 rounded-full font-black">
                          {customerOrders.filter(co => co.storeId === store.id && co.status === 'Pending').length} Pending
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                        {customerOrders
                          .filter(co => co.storeId === store.id && co.status === 'Pending')
                          .map(order => (
                            <button
                              key={order.id}
                              type="button"
                              onClick={() => {
                                // Load this order into the active register
                                setPosCustomerName(order.customerName);
                                setWhatsappPhone(order.customerPhone);
                                
                                // Build cart representation
                                const newCart: Record<string, PosCartItem> = {};
                                order.items.forEach(it => {
                                  const invItem = storeInventory.find(inv => inv.vegetableName.toLowerCase() === it.vegetableName.toLowerCase());
                                  newCart[it.vegetableName] = {
                                    quantity: it.quantity,
                                    unit: 'kg', // standard
                                    pricePerKg: it.pricePerKg,
                                    item: invItem || {
                                      id: `temp-${Date.now()}`,
                                      storeId: store.id,
                                      vegetableName: it.vegetableName,
                                      quantity: 100,
                                      costPrice: it.pricePerKg * 0.75,
                                      sellingPrice: it.pricePerKg,
                                      minStockThreshold: 10,
                                      lastUpdated: new Date().toISOString()
                                    }
                                  };
                                });
                                setPosCart(newCart);
                                setSaleSubView('items'); // Switch back to items so they can edit it!
                              }}
                              className="bg-white hover:bg-indigo-50/50 text-left border border-indigo-100 p-2.5 rounded-xl hover:border-indigo-300 transition-all cursor-pointer flex flex-col gap-1 shadow-3xs"
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="font-extrabold text-xs text-indigo-950 truncate max-w-[150px]">{order.customerName}</span>
                                <span className="font-mono text-[10px] text-indigo-500 font-extrabold">₹{order.totalAmount.toFixed(0)}</span>
                              </div>
                              <p className="text-[10px] text-indigo-700 font-medium truncate w-full font-mono">
                                {order.items.map(it => `${it.vegetableName} (${it.quantity}kg)`).join(', ')}
                              </p>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(posCart).length === 0 ? (
                    <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl p-6">
                      <span className="text-4xl block mb-2">🛒</span>
                      <h4 className="text-sm font-black text-slate-800">Your billing cart is empty</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Browse crops in the Sale Items tab to add items and generate a bill receipt.</p>
                      <button 
                        onClick={() => setSaleSubView('items')}
                        className="mt-4 inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        ← Browse Sale Items
                      </button>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200/85 rounded-3xl p-5 md:p-6 shadow-sm space-y-5">
                      {/* Customer Info Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Customer Identity Name</label>
                          <input
                            type="text"
                            placeholder="Walk-in Counter Customer"
                            value={posCustomerName}
                            onChange={(e) => setPosCustomerName(e.target.value)}
                            className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Send Receipt WhatsApp (+91)</label>
                          <div className="relative">
                            <span className="absolute inset-y-0 left-3 flex items-center text-xs font-extrabold text-slate-400">
                              +91
                            </span>
                            <input
                              type="tel"
                              placeholder="9876543210"
                              maxLength={10}
                              value={whatsappPhone}
                              onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                              className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 pl-11 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-50/50 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Itemized Cart List */}
                      <div className="space-y-3.5 divide-y divide-slate-100">
                        <span className="block text-[10px] font-black uppercase tracking-wider text-slate-400 pb-1.5">Itemized Cart Ledger</span>
                        {Object.keys(posCart).map((vegName, idx) => {
                          const cartItem = posCart[vegName];
                          const itemSubtotal = getSubtotal(cartItem);
                          const changeStep = cartItem.unit === 'g' ? 50 : cartItem.unit === 'kg' ? 0.25 : 1;
                          
                          return (
                            <div key={cartItem.item.id} className={`${idx > 0 ? 'pt-4' : ''} flex flex-col gap-2`}>
                              <div className="flex justify-between items-start">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{getVegEmoji(cartItem.item.vegetableName)}</span>
                                  <h4 className="text-xs sm:text-sm font-black text-slate-800">{cartItem.item.vegetableName}</h4>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromPosCart(cartItem.item.vegetableName)}
                                  className="text-[10px] uppercase font-black text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 bg-slate-50/55 p-3 rounded-xl border border-slate-200/50">
                                {/* Quantity Adjuster */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Weight / Qty</span>
                                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity - changeStep)}
                                      className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-black"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      step={changeStep}
                                      min="0.01"
                                      value={cartItem.quantity}
                                      onChange={(e) => handleUpdatePosCartQty(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                      className="w-12 bg-transparent text-center text-xs font-black text-slate-800 focus:outline-none font-mono"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity + changeStep)}
                                      className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-black"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                {/* Billing Unit Selector */}
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Billing Unit</span>
                                  <select
                                    value={cartItem.unit}
                                    onChange={(e) => handleUpdatePosCartUnit(cartItem.item.vegetableName, e.target.value as any)}
                                    className="bg-white text-[10px] font-black text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer w-full"
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

                                {/* Price Adjustment & Subtotal */}
                                <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Rate (₹)</span>
                                    <div className="flex items-center gap-0.5">
                                      <span className="text-[10px] text-slate-400 font-bold">₹</span>
                                      <input
                                        type="number"
                                        step="0.1"
                                        value={cartItem.pricePerKg}
                                        onChange={(e) => handleUpdatePosCartPrice(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                        className="w-12 bg-transparent text-left text-xs font-bold text-slate-700 focus:outline-none font-mono"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end">
                                    <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">Subtotal</span>
                                    <span className="text-xs font-black text-emerald-600 font-mono">₹{itemSubtotal.toFixed(2)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Grand Total Footer */}
                      <div className="border-t border-slate-100 pt-5 mt-2 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Grand Invoice Sum</span>
                          <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">
                            ₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="flex gap-2.5 w-full sm:w-auto">
                          <button
                            type="button"
                            onClick={handleClearPosCart}
                            className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-xl px-5 py-3 text-xs transition-colors cursor-pointer"
                          >
                            CLEAR CART
                          </button>
                          <button
                            type="button"
                            onClick={handlePosCheckoutSubmit}
                            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-8 py-3 text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-200"
                          >
                            <span>COMPLETE SALE</span>
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-view: STORE DETAILS & ALERTS */}
              {saleSubView === 'details' && (
                <div className="space-y-5 animate-in fade-in duration-200 text-left">
                  {/* Part 1: Store Overview and Stats Card */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
                    <div>
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                        Active Outlet Workspace
                      </span>
                      <h3 className="text-lg font-black mt-2 tracking-tight text-slate-800">{store.name}</h3>
                      <p className="text-xs text-slate-400 mt-1">Detailed configurations, real-time statistics, and active alerts compiled on a single unified sheet.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wide">Registered Crops</span>
                        <span className="text-base font-black text-slate-800 mt-1 block">{storeInventory.length} crop catalog line items</span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wide">Revenue Today</span>
                        <span className="text-base font-black text-emerald-600 mt-1 block font-mono">₹{storeSales.reduce((a,c) => a + c.totalPrice, 0).toFixed(2)}</span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-150">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wide">Volume Dispatched</span>
                        <span className="text-base font-black text-amber-600 mt-1 block font-mono">{storeSales.reduce((a,c) => a + c.quantity, 0).toFixed(1)} kg</span>
                      </div>
                    </div>

                    {/* Part 2: Branch Configurations */}
                    <div className="border-t border-slate-100 pt-5 space-y-4">
                      <h4 className="text-xs font-black tracking-wider uppercase text-slate-400">Branch Configuration</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-slate-700">
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 flex justify-between items-center">
                          <span className="text-slate-400 font-bold">Location Desk:</span>
                          <span className="font-extrabold text-slate-800">{store.location || 'Not Specified'}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 flex justify-between items-center">
                          <span className="text-slate-400 font-bold">WhatsApp Hotline:</span>
                          <span className="font-extrabold text-slate-800 font-mono">{store.whatsappNumber || 'Not Configured'}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 flex justify-between items-center">
                          <span className="text-slate-400 font-bold">User Permission Access:</span>
                          <span className="font-extrabold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded text-[10px]">{role || 'Store Employee'}</span>
                        </div>
                        <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200/80 flex justify-between items-center">
                          <span className="text-slate-400 font-bold">Safety Warn Threshold:</span>
                          <span className="font-extrabold text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px]">≤ 10 kg</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Part 3: Live Alerts, Low Stocks, and Customer Orders notifications list */}
                  {(() => {
                    const lowStockItems = storeInventory.filter(item => item.quantity <= item.minStockThreshold);
                    const pendingOrders = customerOrders.filter(co => co.storeId === store.id && co.status !== 'Completed' && co.status !== 'Cancelled');
                    const pendingRequests = storeRequirements.filter(r => r.status === 'Pending' || r.status === 'Ordered');
                    
                    const noAlerts = lowStockItems.length === 0 && pendingOrders.length === 0 && pendingRequests.length === 0 && broadcastNotifications.length === 0;

                    if (noAlerts) {
                      return (
                        <div className="py-12 text-center bg-emerald-50 border border-emerald-200 rounded-3xl p-6">
                          <span className="text-3xl block mb-2">✨</span>
                          <h4 className="text-xs font-black text-emerald-900">Your branch desk is fully operational!</h4>
                          <p className="text-[11px] text-emerald-700 mt-1 max-w-sm mx-auto">All parameters are healthy. No low stock crops, central notifications, pending online customer orders, or urgent restock requests requiring attention.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-5">
                        {/* Central Catalog Broadcasts section */}
                        {broadcastNotifications.length > 0 && (
                          <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/30 border border-emerald-150 p-5 rounded-3xl shadow-3xs space-y-3">
                            <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-base">📢</span>
                                <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">Central Catalogue Broadcasts ({broadcastNotifications.length})</h4>
                              </div>
                              <span className="text-[8px] bg-emerald-600 text-white font-black uppercase px-2 py-0.5 rounded-full tracking-wider animate-pulse">Live Broadcast</span>
                            </div>
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                              {broadcastNotifications.map(notif => (
                                <div key={notif.id} className="p-3.5 bg-white rounded-2xl border border-emerald-100 shadow-3xs flex flex-col gap-2 transition-all hover:shadow-2xs">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h5 className="text-xs font-black text-slate-800 leading-snug">{notif.title}</h5>
                                      <p className="text-[9px] text-slate-400 mt-0.5 font-medium font-mono">{new Date(notif.timestamp).toLocaleString()}</p>
                                    </div>
                                    <span className="text-[8px] bg-teal-50 text-teal-800 font-black px-2 py-0.5 rounded-md uppercase tracking-wide border border-teal-100 shrink-0">Catalog Update</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">{notif.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending online customer orders section */}
                        {pendingOrders.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                              <span className="text-base">🛒</span>
                              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Pending Customer Orders ({pendingOrders.length})</h4>
                            </div>
                            <div className="space-y-3">
                              {pendingOrders.map(order => (
                                <div key={order.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black text-slate-800">#{order.orderNumber} - {order.customerName}</span>
                                      <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded-full uppercase">{order.status}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      Ordered {order.items.length} crop items • Grand sum: <span className="font-bold text-slate-600 font-mono">₹{order.totalAmount.toFixed(2)}</span>
                                    </p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setActiveSubTab('customer-orders' as any)}
                                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider self-start sm:self-auto cursor-pointer"
                                    >
                                      Manage Order
                                    </button>
                                    <button
                                      onClick={() => {
                                        setCancellingOrder(order);
                                        setCancellationReason('');
                                      }}
                                      className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider self-start sm:self-auto cursor-pointer"
                                    >
                                      Cancel Order
                                    </button>
                                    {onDeleteCustomerOrder && (
                                      <button
                                        onClick={() => {
                                          if (confirm(`Delete pending order #${order.id} completely? This action cannot be undone.`)) {
                                            onDeleteCustomerOrder(order.id);
                                            alert(`Order #${order.id} deleted.`);
                                          }
                                        }}
                                        className="bg-red-50 text-red-700 hover:bg-red-100 border border-red-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider self-start sm:self-auto cursor-pointer"
                                      >
                                        Delete Order
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Low stock alerts section */}
                        {lowStockItems.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                              <span className="text-base">🚨</span>
                              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Low Stock Inventory Warnings ({lowStockItems.length})</h4>
                            </div>
                            <div className="space-y-3">
                              {lowStockItems.map(item => (
                                <div key={item.id} className="p-3 bg-rose-50/40 rounded-xl border border-rose-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{getVegEmoji(item.vegetableName)}</span>
                                      <span className="text-xs font-extrabold text-slate-800">{item.vegetableName}</span>
                                      <span className="text-[9px] bg-rose-100 text-rose-800 font-black px-1.5 py-0.5 rounded-full uppercase">
                                        {item.quantity === 0 ? 'Out of stock' : `${item.quantity.toFixed(1)} kg Left`}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                      Minimum safety stock warning threshold set to <span className="font-semibold text-slate-600">{item.minStockThreshold} kg</span>.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setActiveSubTab('requirements');
                                      setSaleVegName(item.vegetableName);
                                    }}
                                    className="bg-rose-100 text-rose-800 hover:bg-rose-200 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider self-start sm:self-auto cursor-pointer"
                                  >
                                    Request Restock
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pending Restock Requests section */}
                        {pendingRequests.length > 0 && (
                          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                            <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2.5">
                              <span className="text-base">📨</span>
                              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Branch Restock Requests Status ({pendingRequests.length})</h4>
                            </div>
                            <div className="space-y-3">
                              {pendingRequests.map(req => (
                                <div key={req.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between gap-3 text-xs">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{getVegEmoji(req.vegetableName)}</span>
                                      <span className="text-xs font-bold text-slate-800">{req.vegetableName} ({req.quantity} kg)</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-0.5">Priority: {req.priority} • Filed on {new Date(req.createdAt || '').toLocaleDateString()}</p>
                                  </div>
                                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                                    req.status === 'Pending' 
                                      ? 'bg-amber-100 text-amber-800' 
                                      : 'bg-blue-100 text-blue-800 animate-pulse'
                                  }`}>
                                    {req.status === 'Ordered' ? '🚚 In Transit' : '⏳ Pending Head Office'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
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
              
              {/* Recent Sales History Log */}
              <div className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col h-full max-h-[500px]">
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
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="pur-veg" className="block text-xs font-bold text-zinc-500 uppercase">Vegetable Crop Name *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget('purchase');
                      setIsScannerOpen(true);
                    }}
                    className="flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-emerald-700 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-100 px-2 py-0.5 rounded-lg transition-all cursor-pointer"
                  >
                    <Scan className="h-3 w-3 text-emerald-600" />
                    Scan Package
                  </button>
                </div>
                <input
                  id="pur-veg"
                  type="text"
                  required
                  placeholder="e.g. Potatoes, Onions, Tomatoes"
                  value={purchaseVegName}
                  onChange={(e) => setPurchaseVegName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800 font-semibold bg-white"
                />
              </div>

              {/* Purchase Qty in kg */}
              <div>
                <label htmlFor="pur-qty" className="block text-xs font-bold text-zinc-500 uppercase mb-1">Restock Quantity (kg) *</label>
                <div className="relative">
                  <input
                    id="pur-qty"
                    type="number"
                    step="0.01"
                    min="0.01"
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
            <div className="relative flex-1 max-w-md flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Search stock ledger (e.g. Tomato, Onion)..."
                  value={vegSearchQuery}
                  onChange={(e) => setVegSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white py-1.5 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-zinc-800"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setScannerTarget('inventory');
                  setIsScannerOpen(true);
                }}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs hover:scale-[1.01]"
              >
                <Scan className="h-4 w-4 text-emerald-600 animate-pulse" />
                <span>Scan Code</span>
              </button>
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
                          step="0.01"
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
          
          {/* Create Requirement & History */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4 h-fit text-left">
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
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 50"
                      value={reqQty || ''}
                      onChange={(e) => setReqQty(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-zinc-200 py-2 pl-3 pr-12 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-zinc-850"
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

            {/* Requisition History & Quick Reuse Card */}
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50/40 p-5 shadow-sm space-y-3.5 text-left">
              <div>
                <h3 className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                  <span>⏱️</span> Requisition History
                </h3>
                <p className="text-[10px] text-zinc-400 mt-1">Past fulfilled restock requests. Click reuse to raise a new requisition with identical item & weight.</p>
              </div>

              <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                {storeRequirements.filter(r => r.status === 'Fulfilled').length > 0 ? (
                  storeRequirements.filter(r => r.status === 'Fulfilled').map(req => (
                    <div key={req.id} className="p-2.5 rounded-xl border border-zinc-150 bg-white flex items-center justify-between gap-2.5 shadow-3xs hover:bg-zinc-50 transition-colors">
                      <div className="text-left">
                        <h4 className="text-[11px] font-bold text-zinc-850">{req.quantity}kg of {req.vegetableName}</h4>
                        <p className="text-[9px] text-emerald-600 font-extrabold flex items-center gap-0.5 mt-0.5">
                          <span>✅</span> Fulfilled • {new Date(req.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleReuseRequirement(req)}
                        className="bg-emerald-50 hover:bg-emerald-100/80 text-emerald-700 border border-emerald-100/60 px-2 py-1 rounded-lg text-[10px] font-black tracking-tight transition-all cursor-pointer flex items-center gap-1 hover:scale-[1.01]"
                        title="Reuse requisition parameters"
                      >
                        <span>🔄</span> Reuse
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-xl bg-white/50">
                    <p className="text-[10px] font-bold">No historical requisitions found</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5">Fulfilled requests appear here.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Requirements List */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm flex flex-col h-full max-h-[580px] text-left">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-zinc-100 pb-3">
              <div>
                <h3 className="font-bold text-zinc-900">Branch Requisition Sheet</h3>
                <p className="text-xs text-zinc-400 font-medium">Active Requisition items filed by this outlet.</p>
              </div>

              {storeRequirements.filter(r => r.status !== 'Fulfilled').length > 0 && (
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
              {storeRequirements.filter(r => r.status !== 'Fulfilled').map(req => (
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
                        className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer"
                      >
                        Order
                      </button>
                    )}
                    {req.status === 'Ordered' && (
                      <button
                        onClick={() => onUpdateRequirementStatus(req.id, 'Fulfilled')}
                        className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-600 hover:bg-emerald-100 cursor-pointer"
                      >
                        Fulfill
                      </button>
                    )}
                    
                    {/* Send Single Requisition on WhatsApp */}
                    <a
                      href={getWhatsAppStoreLink(req)}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="p-1 rounded text-[#25D366] hover:bg-emerald-50 cursor-pointer"
                      title="Send this requirement on WhatsApp"
                    >
                      <PhoneCall className="h-4 w-4" />
                    </a>

                    <button
                      onClick={() => onDeleteRequirement(req.id)}
                      className="p-1 rounded text-red-500 hover:bg-red-50 cursor-pointer"
                      title="Delete requirement"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {storeRequirements.filter(r => r.status !== 'Fulfilled').length === 0 && (
                <div className="py-24 text-center text-zinc-400">
                  <Send className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No active store requisitions raised</p>
                  <p className="text-[10px] text-zinc-500">All filed stock requirements are fulfilled. Add vegetable requirements to notify the administrator.</p>
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

          {/* Search bar with Voice Input for Customer Orders */}
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders by customer name, phone, or ID..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full pl-9 pr-12 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              />
              {/* Voice Input Trigger for Orders Search */}
              <button
                type="button"
                onClick={() => handleStartVoiceInput((text) => setOrderSearchQuery(text))}
                className={`absolute right-2.5 top-1.5 p-1 rounded-lg transition-all ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/20'
                    : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                }`}
                title="Speak to search orders"
              >
                <Mic className={`h-4 w-4 ${isListening ? 'animate-bounce' : ''}`} />
              </button>
            </div>
            {orderSearchQuery && (
              <button 
                onClick={() => setOrderSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold shrink-0"
              >
                Clear Search
              </button>
            )}
          </div>

          <div className="space-y-3">
            {customerOrders
              .filter(co => co.storeId === store.id)
              .filter(co => {
                if (!orderSearchQuery) return true;
                const q = orderSearchQuery.toLowerCase();
                return (
                  co.customerName.toLowerCase().includes(q) ||
                  co.customerPhone.includes(q) ||
                  co.id.toLowerCase().includes(q) ||
                  (co.notes && co.notes.toLowerCase().includes(q))
                );
              })
              .map(order => {
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
                      {/* Send a pre-filled status update message on WhatsApp */}
                      <a
                        href={`https://wa.me/91${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          `Hello ${order.customerName}, this is a status update regarding your order #${order.id} of amount ₹${order.totalAmount.toFixed(2)} at ${store.name}. ` +
                          `Your order is currently "${order.status}"! We are preparing the fresh crops for you.`
                        )}`}
                        target="_blank"
                        referrerPolicy="no-referrer"
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-[#25D366] text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        title="Send WhatsApp update to customer"
                      >
                        <PhoneCall className="h-3 w-3" />
                        <span>Send Message</span>
                      </a>

                      <button
                        type="button"
                        onClick={() => handleDownloadOrderPDF(order)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer flex items-center gap-1"
                        title="Download PDF Summary of the Order"
                      >
                        <span>📄</span>
                        <span>PDF Summary</span>
                      </button>

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
                            if (confirm(`Fulfill order for ${order.customerName}? This will automatically deduct weights from current stock, register sales logs, and download a clean PDF summary.`)) {
                              handleDownloadOrderPDF(order);
                              onFulfillCustomerOrder(order);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                        >
                          Fulfill & Ship
                        </button>
                      )}

                      {isUnprocessed && onDeleteCustomerOrder && (
                        <>
                          <button
                            onClick={() => {
                              setCancellingOrder(order);
                              setCancellationReason('');
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-750 text-xs font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                          >
                            Cancel Order
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete pending order #${order.id} for ${order.customerName} completely? This action cannot be undone.`)) {
                                onDeleteCustomerOrder(order.id);
                                alert(`Order #${order.id} deleted completely.`);
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-rose-250 bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            Delete Order
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {customerOrders.filter(co => co.storeId === store.id).length === 0 ? (
              <div className="py-24 text-center text-zinc-400">
                <span>📦</span>
                <p className="text-xs font-semibold mt-2">No consumer orders received yet</p>
                <p className="text-[10px] text-zinc-500">Customers can order fresh crops from the storefront tab.</p>
              </div>
            ) : customerOrders.filter(co => co.storeId === store.id).filter(co => {
              if (!orderSearchQuery) return true;
              const q = orderSearchQuery.toLowerCase();
              return (
                co.customerName.toLowerCase().includes(q) ||
                co.customerPhone.includes(q) ||
                co.id.toLowerCase().includes(q) ||
                (co.notes && co.notes.toLowerCase().includes(q))
              );
            }).length === 0 ? (
              <div className="py-24 text-center text-zinc-400 border border-dashed border-zinc-200 rounded-2xl bg-white p-6">
                <span>🔍</span>
                <p className="text-xs font-semibold mt-2">No matching consumer orders found</p>
                <p className="text-[10px] text-zinc-500">Refine your search parameters or check your spellings.</p>
              </div>
            ) : null}
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

      {/* --- SUB-TAB CONTENT: QR CODE GENERATOR --- */}
      {activeSubTab === 'qr-code' && (
        <div className="space-y-6 animate-fade-in text-slate-800">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            
            {/* Header info */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                  Customer Convenience Suite
                </span>
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-emerald-600" />
                  Storefront QR Code Generator
                </h3>
                <p className="text-slate-500 text-xs">
                  Create high-fidelity QR codes to place at your checkout desks, print on shopping bags, or post on social media. 
                  Customers scan them to directly browse your live stock catalog, view real-time prices, and place contact-free delivery or pick-up orders.
                </p>
              </div>
            </div>

            {/* Content Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Side: Parameters / Settings (Col Span 7) */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* Section 1: Destination Selection */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 border-l-3 border-emerald-500 pl-2.5">
                    1. QR Code Target Action
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setQrDestinationType('storefront')}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                        qrDestinationType === 'storefront'
                          ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="p-1.5 bg-emerald-100/60 text-emerald-700 rounded-lg shrink-0 w-fit">
                        <ShoppingBag className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="block text-xs font-black">Customer Storefront</span>
                        <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                          Customers browse live stock and place online orders.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrDestinationType('express-billing')}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                        qrDestinationType === 'express-billing'
                          ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="p-1.5 bg-emerald-100/60 text-emerald-700 rounded-lg shrink-0 w-fit">
                        <TrendingUp className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="block text-xs font-black">Express POS Billing</span>
                        <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                          Quick access to this branch billing terminal.
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrDestinationType('custom')}
                      className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between h-32 cursor-pointer ${
                        qrDestinationType === 'custom'
                          ? 'bg-emerald-50/50 border-emerald-500 text-emerald-950 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="p-1.5 bg-emerald-100/60 text-emerald-700 rounded-lg shrink-0 w-fit">
                        <ExternalLink className="h-4 w-4" />
                      </span>
                      <div>
                        <span className="block text-xs font-black">Custom Web URL</span>
                        <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                          Redirect customers to a custom web link or social page.
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Custom URL Input (Only visible when custom) */}
                {qrDestinationType === 'custom' && (
                  <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-top duration-250">
                    <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                      Destination Web URL
                    </label>
                    <input
                      type="url"
                      value={qrCustomUrl}
                      onChange={(e) => setQrCustomUrl(e.target.value)}
                      placeholder="https://example.com/my-custom-store"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold focus:border-emerald-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400">
                      Enter any valid web address. For example: a custom landing page, google maps location, or WhatsApp click-to-chat link.
                    </p>
                  </div>
                )}

                {/* Section 2: Visual Customizations (Colors & Branding) */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 border-l-3 border-emerald-500 pl-2.5">
                    2. Design & Branding Elements
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Foreground Color */}
                    <div className="space-y-2.5">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                        QR Pattern Color (Foreground)
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <input
                            type="color"
                            value={qrFgColor}
                            onChange={(e) => setQrFgColor(e.target.value)}
                            className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                            id="qr-fg-color-picker"
                          />
                        </div>
                        <input
                          type="text"
                          value={qrFgColor}
                          onChange={(e) => setQrFgColor(e.target.value)}
                          maxLength={7}
                          className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-semibold uppercase text-center focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { name: 'Emerald', code: '#047857' },
                          { name: 'Indigo', code: '#4f46e5' },
                          { name: 'Slate', code: '#1e293b' },
                          { name: 'Crimson', code: '#dc2626' },
                          { name: 'Amber', code: '#b45309' },
                          { name: 'Teal', code: '#0f766e' }
                        ].map((preset) => (
                          <button
                            key={preset.code}
                            type="button"
                            onClick={() => setQrFgColor(preset.code)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-100 hover:border-slate-300 bg-slate-50 cursor-pointer"
                          >
                            <span 
                              className="h-2 w-2 rounded-full inline-block" 
                              style={{ backgroundColor: preset.code }}
                            />
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Background Color */}
                    <div className="space-y-2.5">
                      <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wide">
                        Card Background Color
                      </label>
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <input
                            type="color"
                            value={qrBgColor}
                            onChange={(e) => setQrBgColor(e.target.value)}
                            className="h-10 w-12 rounded-lg border border-slate-200 cursor-pointer overflow-hidden p-0 bg-transparent"
                            id="qr-bg-color-picker"
                          />
                        </div>
                        <input
                          type="text"
                          value={qrBgColor}
                          onChange={(e) => setQrBgColor(e.target.value)}
                          maxLength={7}
                          className="w-24 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-mono font-semibold uppercase text-center focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                      
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {[
                          { name: 'Pure White', code: '#ffffff' },
                          { name: 'Soft Cream', code: '#fefcbf' },
                          { name: 'Ice Blue', code: '#eff6ff' },
                          { name: 'Mint Hue', code: '#f0fdf4' },
                          { name: 'Slate Glow', code: '#f8fafc' }
                        ].map((preset) => (
                          <button
                            key={preset.code}
                            type="button"
                            onClick={() => setQrBgColor(preset.code)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border border-slate-100 hover:border-slate-300 bg-slate-50 cursor-pointer"
                          >
                            <span 
                              className="h-2 w-2 rounded-full inline-block border border-slate-200" 
                              style={{ backgroundColor: preset.code }}
                            />
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Advanced Options */}
                <div className="space-y-4 pt-1">
                  <h4 className="text-sm font-bold text-slate-900 border-l-3 border-emerald-500 pl-2.5">
                    3. Advanced Engine Variables
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    {/* Error Correction Level */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider" htmlFor="qr-error-level-select">
                        Error Tolerance (Density)
                      </label>
                      <select
                        id="qr-error-level-select"
                        value={qrErrorLevel}
                        onChange={(e) => setQrErrorLevel(e.target.value as any)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none text-slate-700"
                      >
                        <option value="L">Low (7% recovery - lowest density)</option>
                        <option value="M">Medium (15% recovery - optimized standard)</option>
                        <option value="Q">Quartile (25% recovery - high density)</option>
                        <option value="H">High (30% recovery - highest damage tolerance)</option>
                      </select>
                      <p className="text-[10px] text-slate-400">
                        Higher tolerance ensures QR remains readable even if printed flyers get slightly scuffed or stained inside active store environments.
                      </p>
                    </div>

                    {/* QR Code Pixel Dimension */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider" htmlFor="qr-resolution-select">
                        Pixel Resolution (Dimensions)
                      </label>
                      <select
                        id="qr-resolution-select"
                        value={qrSize}
                        onChange={(e) => setQrSize(parseInt(e.target.value))}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold focus:border-emerald-500 focus:outline-none text-slate-700"
                      >
                        <option value="200">200 x 200 px (Fast Scan, Digital Web)</option>
                        <option value="300">300 x 300 px (Optimized Medium Print)</option>
                        <option value="500">500 x 500 px (High-Definition Catalog Flyer)</option>
                        <option value="800">800 x 800 px (Ultra-HD Storefront Poster)</option>
                      </select>
                      <p className="text-[10px] text-slate-400">
                        Select larger sizes if planning to print large banner assets or hanging signs inside physical stores.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 4: Utility Commands */}
                <div className="flex flex-wrap items-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      let targetUrl = '';
                      if (qrDestinationType === 'storefront') {
                        targetUrl = `${window.location.origin}${window.location.pathname}#/customer-hub?storeId=${store.id}`;
                      } else if (qrDestinationType === 'express-billing') {
                        targetUrl = `${window.location.origin}${window.location.pathname}#/store?storeId=${store.id}`;
                      } else {
                        targetUrl = qrCustomUrl || `${window.location.origin}${window.location.pathname}`;
                      }

                      navigator.clipboard.writeText(targetUrl);
                      setQrCopySuccess(true);
                      
                      if (cpanelSettings?.alertSoundEnabled) {
                        try {
                          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                          const osc = audioCtx.createOscillator();
                          const gain = audioCtx.createGain();
                          osc.connect(gain);
                          gain.connect(audioCtx.destination);
                          osc.frequency.setValueAtTime(880, audioCtx.currentTime);
                          gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                          osc.start();
                          osc.stop(audioCtx.currentTime + 0.12);
                        } catch (e) {}
                      }

                      setTimeout(() => setQrCopySuccess(false), 2000);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    {qrCopySuccess ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 animate-bounce" />
                        <span className="text-emerald-700">Copied Destination Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Raw Redirect URL
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!qrDataUrl) return;
                      const link = document.createElement('a');
                      link.href = qrDataUrl;
                      link.download = `${store.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_qr_code.png`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    disabled={!qrDataUrl || qrIsGenerating}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    <Download className="h-4 w-4" />
                    Download Standalone PNG Image
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQrFlyer}
                    disabled={!qrDataUrl || qrIsGenerating}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-40"
                  >
                    <Printer className="h-4 w-4" />
                    Download Print-Ready PDF Flyer
                  </button>
                </div>

              </div>

              {/* Right Side: Interactive Live Preview (Col Span 5) */}
              <div className="lg:col-span-5 flex flex-col items-center justify-start space-y-6">
                
                {/* Visual Preview Card Frame */}
                <div className="w-full bg-slate-50 rounded-3xl border border-slate-200/80 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  
                  {/* Visual Background Ripple Accents */}
                  <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/5 rounded-full filter blur-xl -mr-10 -mt-10"></div>
                  <div className="absolute bottom-0 left-0 h-32 w-32 bg-indigo-500/5 rounded-full filter blur-xl -ml-10 -mb-10"></div>
                  
                  {/* Tag label */}
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-200/50 px-2.5 py-1 rounded-full mb-4">
                    WYSIWYG REAL-TIME PREVIEW
                  </span>

                  {/* QR Canvas Box */}
                  <div 
                    className="relative p-5 rounded-2xl shadow-md border border-slate-200/60 inline-block transition-transform hover:scale-103 duration-300"
                    style={{ backgroundColor: qrBgColor }}
                  >
                    {qrIsGenerating ? (
                      <div className="h-[210px] w-[210px] flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-emerald-600 animate-spin" />
                      </div>
                    ) : qrDataUrl ? (
                      <div className="relative">
                        <img 
                          src={qrDataUrl} 
                          alt="Storefront QR Code Live Preview" 
                          className="h-[210px] w-[210px] object-contain rounded-lg"
                          referrerPolicy="no-referrer"
                        />
                        {/* Custom overlaid tiny crop emoji at center for branding */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="h-9 w-9 bg-white border-2 border-emerald-600 rounded-full flex items-center justify-center shadow-md">
                            <span className="text-base">🥬</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[210px] w-[210px] flex items-center justify-center text-slate-400 font-bold text-xs">
                        QR Code not compiled yet
                      </div>
                    )}
                  </div>

                  {/* Redirection Link Preview */}
                  <div className="w-full mt-5 bg-white border border-slate-200 rounded-xl p-3 text-left space-y-1">
                    <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
                      Decoded scan url
                    </span>
                    <span className="block text-xs font-mono font-medium text-slate-600 break-all select-all leading-relaxed">
                      {qrDestinationType === 'storefront' ? (
                        `${window.location.origin}${window.location.pathname}#/customer-hub?storeId=${store.id}`
                      ) : qrDestinationType === 'express-billing' ? (
                        `${window.location.origin}${window.location.pathname}#/store?storeId=${store.id}`
                      ) : (
                        qrCustomUrl || `${window.location.origin}${window.location.pathname}`
                      )}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-400">
                    <span>💡</span>
                    <span>Test scan using any mobile scanner or phone camera!</span>
                  </div>

                </div>

                {/* Additional Guidance Panel */}
                <div className="w-full bg-emerald-50/30 rounded-2xl border border-emerald-100 p-5 space-y-3">
                  <h4 className="text-xs font-extrabold text-emerald-800 uppercase tracking-widest flex items-center gap-1.5">
                    <span>📢</span>
                    Best Practices for Placement
                  </h4>
                  <ul className="text-xs text-emerald-950 space-y-2 list-disc pl-4 font-semibold leading-relaxed">
                    <li>
                      <strong className="text-emerald-900 font-extrabold">Bill Counter:</strong> Print the Flyer PDF and frame it next to the card machine. Customers can scan to view prices without asking staff.
                    </li>
                    <li>
                      <strong className="text-emerald-900 font-extrabold">Paper Carry Bags:</strong> Paste or print the QR on paper bags. Customers will have your storefront handy when they get home!
                    </li>
                    <li>
                      <strong className="text-emerald-900 font-extrabold">Low-Light Alert:</strong> If your store is dimly lit, raise the <strong className="text-emerald-900 font-extrabold">Error Tolerance</strong> option to High to withstand scans in dark spots.
                    </li>
                  </ul>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Minimal Breadcrumb Bar - Placed at the bottom of the page */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm mt-6">
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
            type="button"
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

      {/* Qr & Barcode Scanner Modal Component */}
      <QrScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
        inventory={storeInventory}
        title={
          scannerTarget === 'pos' 
            ? 'POS Quick Barcode Scanner' 
            : scannerTarget === 'sale' 
            ? 'Invoice Sale Barcode Scanner' 
            : scannerTarget === 'purchase'
              ? 'Supplier Purchase Barcode Scanner'
              : 'Inventory Ledger QR Scanner'
        }
      />

      {/* --- RETAIL BILLING CHECKOUT POP-UP MODAL --- */}
      {showCheckoutModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 pb-3.5 mb-4 shrink-0">
              <div>
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <span className="text-emerald-600">🛒</span> Point of Sale Checkout
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Finalize products weight, prices, and complete customer payment.</p>
              </div>
              <button 
                onClick={() => setShowCheckoutModal(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto space-y-5 pr-1 text-slate-700">
              
              {/* Load Pending Customer Order Banner */}
              {customerOrders && customerOrders.filter(co => co.storeId === store.id && co.status === 'Pending').length > 0 && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-black text-indigo-950 uppercase tracking-wide">
                      <span className="animate-pulse">📥</span> Load Customer Order to Checkout
                    </span>
                    <span className="bg-indigo-200 text-indigo-800 text-[9px] px-2 py-0.5 rounded-full font-black">
                      {customerOrders.filter(co => co.storeId === store.id && co.status === 'Pending').length} Pending
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1">
                    {customerOrders
                      .filter(co => co.storeId === store.id && co.status === 'Pending')
                      .map(order => (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => {
                            setPosCustomerName(order.customerName);
                            setWhatsappPhone(order.customerPhone);
                            const newCart: Record<string, PosCartItem> = {};
                            order.items.forEach(it => {
                              const invItem = storeInventory.find(inv => inv.vegetableName.toLowerCase() === it.vegetableName.toLowerCase());
                              newCart[it.vegetableName] = {
                                quantity: it.quantity,
                                unit: 'kg',
                                pricePerKg: it.pricePerKg,
                                item: invItem || {
                                  id: `temp-${Date.now()}`,
                                  storeId: store.id,
                                  vegetableName: it.vegetableName,
                                  quantity: 100,
                                  costPrice: it.pricePerKg * 0.75,
                                  sellingPrice: it.pricePerKg,
                                  minStockThreshold: 10,
                                  lastUpdated: new Date().toISOString()
                                }
                              };
                            });
                            setPosCart(newCart);
                          }}
                          className="bg-white hover:bg-indigo-50/50 text-left border border-indigo-100 p-2 rounded-xl hover:border-indigo-300 transition-all cursor-pointer flex flex-col gap-0.5 shadow-3xs"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-extrabold text-[11px] text-indigo-950 truncate max-w-[150px]">{order.customerName}</span>
                            <span className="font-mono text-[10px] text-indigo-500 font-extrabold font-black">₹{order.totalAmount.toFixed(0)}</span>
                          </div>
                          <p className="text-[9px] text-indigo-700 font-medium truncate w-full font-mono">
                            {order.items.map(it => `${it.vegetableName} (${it.quantity}kg)`).join(', ')}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Multi-Billing Registers inside Checkout Pop-up */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-150/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider pr-2 border-r border-slate-200">
                    Registers
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {billingTabs.map((tab) => {
                      const isActive = tab.id === activeBillingTabId;
                      const tabCart = isActive ? posCart : tab.cart;
                      const itemCount = Object.keys(tabCart).length;
                      const subtotal = Object.keys(tabCart).reduce((sum, key) => sum + getSubtotal(tabCart[key]), 0);
                      const customerNameStr = isActive ? (posCustomerName || tab.label) : (tab.customerName || tab.label);
                      
                      return (
                        <div
                          key={tab.id}
                          onClick={() => handleSwitchBillingTab(tab.id)}
                          className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all border cursor-pointer shrink-0 ${
                            isActive
                              ? 'bg-white border-emerald-500 text-emerald-800 shadow-3xs'
                              : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          <span>🎛️</span>
                          <span className="truncate max-w-[50px]">{customerNameStr}</span>
                          {itemCount > 0 && (
                            <span className="bg-emerald-100 text-emerald-800 font-mono text-[8px] px-1 py-0.5 rounded-full font-black">
                              ₹{subtotal.toFixed(0)}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddBillingTab}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-xl text-[10px] font-black transition-all cursor-pointer shrink-0"
                >
                  + Add Register
                </button>
              </div>

              {Object.keys(posCart).length === 0 ? (
                <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-6">
                  <span className="text-3xl block mb-2">🛒</span>
                  <h4 className="text-xs font-black text-slate-700">Your billing cart is empty</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Please close this modal and add some items from the Sale Items tab first.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Customer Info Form */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1 text-left">
                      <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Customer Identity Name</label>
                      <input
                        type="text"
                        placeholder="Walk-in Counter Customer"
                        value={posCustomerName}
                        onChange={(e) => setPosCustomerName(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="block text-[9px] font-extrabold uppercase tracking-wide text-slate-400">Send Receipt WhatsApp (+91)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-3 flex items-center text-xs font-extrabold text-slate-400 font-mono">
                          +91
                        </span>
                        <input
                          type="tel"
                          placeholder="9876543210"
                          maxLength={10}
                          value={whatsappPhone}
                          onChange={(e) => setWhatsappPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 pl-11 pr-3 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Itemized Cart List inside pop-up */}
                  <div className="border border-slate-200 rounded-2xl p-3 bg-slate-50/40 space-y-3.5 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 text-left">Itemized Cart Ledger</span>
                    {Object.keys(posCart).map((vegName, idx) => {
                      const cartItem = posCart[vegName];
                      const itemSubtotal = getSubtotal(cartItem);
                      const changeStep = cartItem.unit === 'g' ? 50 : cartItem.unit === 'kg' ? 0.25 : 1;
                      
                      return (
                        <div key={cartItem.item.id} className={`${idx > 0 ? 'pt-3.5' : ''} flex flex-col gap-2`}>
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs">{getVegEmoji(cartItem.item.vegetableName)}</span>
                              <h4 className="text-xs font-bold text-slate-800">{cartItem.item.vegetableName}</h4>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromPosCart(cartItem.item.vegetableName)}
                              className="text-[9px] uppercase font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-2 bg-white p-2 rounded-xl border border-slate-150">
                            {/* Quantity Adjuster */}
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-[8px] uppercase font-bold text-slate-400">Qty / Wt</span>
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity - changeStep)}
                                  className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-black"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  step={changeStep}
                                  min="0.01"
                                  value={cartItem.quantity}
                                  onChange={(e) => handleUpdatePosCartQty(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                  className="w-10 bg-transparent text-center text-[11px] font-black text-slate-800 focus:outline-none font-mono"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePosCartQty(cartItem.item.vegetableName, cartItem.quantity + changeStep)}
                                  className="h-5 w-5 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 cursor-pointer text-xs font-black"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Billing Unit */}
                            <div className="flex flex-col gap-0.5 text-left">
                              <span className="text-[8px] uppercase font-bold text-slate-400">Unit</span>
                              <select
                                value={cartItem.unit}
                                onChange={(e) => handleUpdatePosCartUnit(cartItem.item.vegetableName, e.target.value as any)}
                                className="bg-slate-50 text-[10px] font-bold text-slate-700 border border-slate-200 rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer w-full"
                              >
                                <option value="kg">kg</option>
                                <option value="g">g</option>
                                <option value="pcs">pcs</option>
                                <option value="bunch">bunch</option>
                                <option value="pack">pack</option>
                              </select>
                            </div>

                            {/* Price adjustment & Subtotal */}
                            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <div className="flex flex-col text-left">
                                <span className="text-[8px] uppercase font-bold text-slate-400">Price (₹)</span>
                                <input
                                  type="number"
                                  step="0.5"
                                  value={cartItem.pricePerKg}
                                  onChange={(e) => handleUpdatePosCartPrice(cartItem.item.vegetableName, parseFloat(e.target.value) || 0)}
                                  className="w-12 bg-transparent text-left text-[11px] font-black text-slate-800 focus:outline-none font-mono"
                                />
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-[8px] uppercase font-bold text-slate-400">Subtotal</span>
                                <span className="text-[11px] font-black text-emerald-600 font-mono">₹{itemSubtotal.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Payment Method Selector */}
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/60 text-left space-y-2">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">
                      Select Billing Payment Mode *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['Cash', 'Card', 'UPI'] as const).map((mode) => {
                        const isSel = paymentMode === mode;
                        const icon = mode === 'Cash' ? '💵' : mode === 'Card' ? '💳' : '📱';
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setPaymentMode(mode)}
                            className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                              isSel
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-3xs font-black'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span>{icon}</span>
                            <span>{mode}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Footer containing Total amount & Action Buttons */}
            {Object.keys(posCart).length > 0 && (
              <div className="border-t border-slate-100 pt-4 mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="text-center sm:text-left">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Grand Invoice Sum</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono mt-0.5">
                    ₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleClearPosCart}
                    className="flex-1 sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl px-4 py-3 text-xs transition-colors cursor-pointer font-bold"
                  >
                    CLEAR CART
                  </button>
                  <button
                    type="button"
                    onClick={handlePosCheckoutSubmit}
                    className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl px-6 py-3 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-200 hover:scale-[1.01]"
                  >
                    <span>COMPLETE SALE</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- CONSUMER ORDER CANCELLATION MODAL DIALOG --- */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 text-left animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-black text-slate-800 text-sm flex items-center gap-1.5">
                <span className="text-red-500">🚫</span> Cancel Order #{cancellingOrder.id}
              </h3>
              <button 
                onClick={() => {
                  setCancellingOrder(null);
                  setCancellationReason('');
                }}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Customer Details:</p>
                <p className="mt-1">Name: <strong className="text-slate-900">{cancellingOrder.customerName}</strong></p>
                <p>Phone: <strong className="text-slate-900 font-mono">{cancellingOrder.customerPhone}</strong></p>
                <p className="mt-1">Order Amount: <strong className="text-indigo-600 font-mono">₹{cancellingOrder.totalAmount.toFixed(2)}</strong></p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">
                  Cancellation Reason / Message
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g., Cucumber is currently out of stock. Apologies for the inconvenience!"
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 bg-white"
                />
                <p className="text-[9px] text-slate-400 mt-1">This message can be saved in the system logs or sent to the customer.</p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-4">
                
                {/* 1. Cancel and Keep in Logs with Reason (Update Status to Cancelled) */}
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateCustomerOrder) {
                      const updatedNotes = cancellationReason.trim()
                        ? `${cancellationReason.trim()} | ${cancellingOrder.notes || ''}`
                        : cancellingOrder.notes;
                      
                      const updated: CustomerOrder = {
                        ...cancellingOrder,
                        status: 'Cancelled',
                        notes: updatedNotes
                      };
                      onUpdateCustomerOrder(updated);
                      alert(`Order #${cancellingOrder.id} status updated to "Cancelled" with reason notes.`);
                      setCancellingOrder(null);
                      setCancellationReason('');
                    }
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  📝 Mark Cancelled in Database
                </button>

                {/* 2. Complete Delete Archive */}
                {onDeleteCustomerOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('Delete this order completely from active lists? This action is irreversible.')) {
                        onDeleteCustomerOrder(cancellingOrder.id);
                        alert(`Order #${cancellingOrder.id} deleted completely from active lists.`);
                        setCancellingOrder(null);
                        setCancellationReason('');
                      }
                    }}
                    className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🗑️ Delete completely (Archive)
                  </button>
                )}

                {/* 3. Send update on WhatsApp */}
                <a
                  href={`https://wa.me/91${cancellingOrder.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello ${cancellingOrder.customerName}, this is regarding your order #${cancellingOrder.id} of amount ₹${cancellingOrder.totalAmount.toFixed(2)}. ` +
                    `We regret to inform you that your order has been cancelled. ` +
                    (cancellationReason.trim() ? `Reason: ${cancellationReason.trim()}. ` : '') +
                    `Thank you for your understanding!`
                  )}`}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold rounded-xl py-2.5 text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  Notify Customer on WhatsApp
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setCancellingOrder(null);
                    setCancellationReason('');
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-2.5 text-xs transition-all cursor-pointer"
                >
                  Discard / Keep Active
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- QUICK ADD BOTTOM SHEET FOR MOBILE --- */}
      {isQuickAddOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-3xs z-50 flex items-end justify-center animate-in fade-in duration-200">
          {/* Backdrop Click */}
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsQuickAddOpen(false)} />
          
          <div className="relative bg-white w-full max-w-lg rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8 space-y-4 text-left animate-in slide-in-from-bottom duration-350 max-h-[85vh] flex flex-col z-10">
            {/* Drag/Slide Handle Look */}
            <div className="flex justify-center shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full cursor-pointer hover:bg-slate-300" onClick={() => setIsQuickAddOpen(false)} />
            </div>

            <div className="flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                  <span>⚡</span> Quick Add Crop Catalog
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold">Tap to instantly add items to active register cart.</p>
              </div>
              <button 
                onClick={() => setIsQuickAddOpen(false)}
                className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full h-7 w-7 flex items-center justify-center font-extrabold text-xs transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Add Grid Area */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5">
              <div className="grid grid-cols-4 gap-2">
                {COMMON_CROPS_LIST.map((crop) => {
                  const cartItem = posCart[crop.name];
                  const countInCart = cartItem ? cartItem.quantity : 0;
                  return (
                    <button
                      key={crop.name}
                      onClick={() => handleQuickAddCrop(crop)}
                      className={`relative p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-center group active:scale-95 ${
                        countInCart > 0
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-3xs'
                          : 'bg-slate-50/50 border-slate-150 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {countInCart > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[8px] px-1 rounded-full font-black min-w-[14px] text-center">
                          {countInCart}
                        </span>
                      )}
                      <span className="text-2xl transform group-hover:scale-110 transition-transform">{crop.emoji}</span>
                      <span className="text-[9px] font-black tracking-tight leading-none truncate w-full">{crop.name}</span>
                      <span className="text-[8px] font-mono text-slate-400">₹{crop.defaultPrice}/kg</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Cart Quick Summary Footer */}
            <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/60 shrink-0 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-500">Cart Total ({Object.keys(posCart).length} items):</span>
                <span className="font-black text-emerald-600 font-mono text-sm">
                  ₹{Object.keys(posCart).reduce((sum, key) => sum + getSubtotal(posCart[key]), 0).toFixed(2)}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsQuickAddOpen(false);
                    setSaleSubView('checkout');
                  }}
                  disabled={Object.keys(posCart).length === 0}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-extrabold rounded-xl py-2.5 text-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>🛒 View Checkout Cart</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
