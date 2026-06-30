import React, { useState } from 'react';
import { Store, InventoryItem, CustomerOrder, CustomerOrderItem, StorefrontAd } from '../types';
import { 
  ShoppingCart, 
  Phone, 
  MapPin, 
  Search, 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Hourglass, 
  Trash2, 
  ArrowRight, 
  User, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Megaphone, 
  ChevronRight, 
  LogOut, 
  UserCheck, 
  Map 
} from 'lucide-react';

interface CustomerHubProps {
  stores: Store[];
  inventory: InventoryItem[];
  customerOrders: CustomerOrder[];
  onPlaceOrder: (newOrder: CustomerOrder) => Promise<void>;
  storefrontAds?: StorefrontAd[];
}

export default function CustomerHub({
  stores,
  inventory,
  customerOrders,
  onPlaceOrder,
  storefrontAds = []
}: CustomerHubProps) {
  const [activeTab, setActiveTab] = useState<'shop' | 'track' | 'profile'>('shop');
  
  // Store selector
  const [selectedStoreId, setSelectedStoreId] = useState<string>(() => {
    return stores[0]?.id || '';
  });

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Cart State: maps vegetableName to quantity and item
  const [cart, setCart] = useState<{ [vegName: string]: { quantity: number; item: InventoryItem } }>({});

  // Mobile User Profile & Registration State
  const [currentUser, setCurrentUser] = useState<{ name: string; phone: string; email?: string; verificationMethod?: 'whatsapp' | 'email'; address?: string } | null>(() => {
    const stored = localStorage.getItem('fg_customer_profile');
    return stored ? JSON.parse(stored) : null;
  });

  // Verification Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPhone, setAuthPhone] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'whatsapp' | 'email'>('whatsapp');
  const [authName, setAuthName] = useState('');
  const [authAddress, setAuthAddress] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [authError, setAuthError] = useState('');

  // Checkout modal
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutNotes, setCheckoutNotes] = useState('');

  // Profile edit states & success indicator
  const [editName, setEditName] = useState(currentUser?.name || '');
  const [editPhone, setEditPhone] = useState(currentUser?.phone || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [editMethod, setEditMethod] = useState<'whatsapp' | 'email'>(currentUser?.verificationMethod || 'whatsapp');
  const [editAddress, setEditAddress] = useState(currentUser?.address || '');
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // Keep edit profile form states in sync with logged-in user
  React.useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setEditPhone(currentUser.phone);
      setEditEmail(currentUser.email || '');
      setEditMethod(currentUser.verificationMethod || 'whatsapp');
      setEditAddress(currentUser.address || '');
    }
  }, [currentUser]);

  // Track tab state
  const [trackPhoneInput, setTrackPhoneInput] = useState(currentUser?.phone || '');
  const [searchPhoneQuery, setSearchPhoneQuery] = useState(currentUser?.phone || '');

  // Get active inventory for the selected store
  const storeInventory = inventory.filter(item => item.storeId === selectedStoreId && item.quantity > 0);

  // Derive categories dynamically from inventory
  const categories = ['All', 'Leafy Greens', 'Root Crops', 'Kitchen Staples', 'Chili & Spices', 'Daily Vegetables'];
  
  const getCategoryOfCrop = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('spinach') || n.includes('lettuce') || n.includes('cabbage') || n.includes('leaf') || n.includes('coriander') || n.includes('mint')) return 'Leafy Greens';
    if (n.includes('potato') || n.includes('carrot') || n.includes('ginger') || n.includes('beetroot')) return 'Root Crops';
    if (n.includes('onion') || n.includes('garlic') || n.includes('potato') || n.includes('tomato')) return 'Kitchen Staples';
    if (n.includes('chili') || n.includes('pepper') || n.includes('ginger') || n.includes('turmeric')) return 'Chili & Spices';
    return 'Daily Vegetables';
  };

  // Filter crops based on category and search query
  const filteredCrops = storeInventory.filter(crop => {
    const matchesSearch = crop.vegetableName.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedCategory === 'All') return matchesSearch;
    return getCategoryOfCrop(crop.vegetableName) === selectedCategory && matchesSearch;
  });

  // Cart Actions
  const handleAddToCart = (item: InventoryItem, qty: number = 0.5) => {
    setCart(prev => {
      const existing = prev[item.vegetableName];
      const maxAvailable = item.quantity;
      let newQty = qty;

      if (existing) {
        newQty = Math.min(maxAvailable, existing.quantity + qty);
      } else {
        newQty = Math.min(maxAvailable, qty);
      }

      return {
        ...prev,
        [item.vegetableName]: {
          quantity: parseFloat(newQty.toFixed(2)),
          item
        }
      };
    });
  };

  const handleDecreaseCartQty = (item: InventoryItem, step: number = 0.5) => {
    setCart(prev => {
      const existing = prev[item.vegetableName];
      if (!existing) return prev;

      const newQty = existing.quantity - step;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[item.vegetableName];
        return copy;
      }

      return {
        ...prev,
        [item.vegetableName]: {
          quantity: parseFloat(newQty.toFixed(2)),
          item
        }
      };
    });
  };

  const handleUpdateCartQtyDirect = (vegName: string, qty: number, maxAvailable: number) => {
    if (qty <= 0) {
      setCart(prev => {
        const copy = { ...prev };
        delete copy[vegName];
        return copy;
      });
      return;
    }

    setCart(prev => {
      const target = prev[vegName];
      if (!target) return prev;

      return {
        ...prev,
        [vegName]: {
          ...target,
          quantity: parseFloat(Math.min(maxAvailable, qty).toFixed(2))
        }
      };
    });
  };

  const handleRemoveFromCart = (vegName: string) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[vegName];
      return copy;
    });
  };

  // Phone / Email Verification / Login Submit
  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (!authName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }

    if (verificationMethod === 'whatsapp') {
      if (!authPhone || authPhone.replace(/\D/g, '').length < 10) {
        setAuthError('Please enter a valid 10-digit mobile number.');
        return;
      }
    } else {
      if (!authEmail || !authEmail.includes('@') || !authEmail.includes('.')) {
        setAuthError('Please enter a valid email address.');
        return;
      }
    }
    
    setIsOtpSent(true);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authOtp || authOtp.length < 4) {
      setAuthError('Please enter the 4-digit verification code.');
      return;
    }

    // Success Simulation
    const profile = {
      name: authName.trim(),
      phone: authPhone ? authPhone.replace(/[^\d+]/g, '') : '',
      email: authEmail.trim() || undefined,
      verificationMethod,
      address: authAddress.trim() || undefined
    };

    localStorage.setItem('fg_customer_profile', JSON.stringify(profile));
    setCurrentUser(profile);
    if (profile.phone) {
      setTrackPhoneInput(profile.phone);
      setSearchPhoneQuery(profile.phone);
    }
    
    setIsAuthModalOpen(false);
    setIsOtpSent(false);
    setAuthOtp('');
    setAuthError('');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out of Farmer\'s Gate Online?')) {
      localStorage.removeItem('fg_customer_profile');
      setCurrentUser(null);
      setCart({});
    }
  };

  // Submit Order Checkout
  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(cart).length === 0) {
      alert('Your cart is empty.');
      return;
    }
    if (!currentUser) {
      // Prompt login first
      setIsCheckoutOpen(false);
      setIsAuthModalOpen(true);
      return;
    }

    const orderItems: CustomerOrderItem[] = (Object.entries(cart) as [string, { quantity: number; item: InventoryItem }][]).map(([vegName, cartItem]) => ({
      vegetableName: vegName,
      quantity: cartItem.quantity,
      pricePerKg: cartItem.item.sellingPrice,
      totalPrice: parseFloat((cartItem.quantity * cartItem.item.sellingPrice).toFixed(2))
    }));

    const totalAmount = orderItems.reduce((acc, curr) => acc + curr.totalPrice, 0);

    const newOrder: CustomerOrder = {
      id: `co-${Date.now()}`,
      orderNumber: `FG-ONLINE-${Math.floor(10000 + Math.random() * 90000)}`,
      storeId: selectedStoreId,
      customerName: currentUser.name,
      customerPhone: currentUser.phone,
      customerAddress: currentUser.address,
      items: orderItems,
      totalAmount,
      status: 'Pending',
      paymentStatus: 'Unpaid',
      orderDate: new Date().toISOString(),
      notes: checkoutNotes || undefined
    };

    await onPlaceOrder(newOrder);

    // Clean up
    setCart({});
    setCheckoutNotes('');
    setIsCheckoutOpen(false);
    
    // Auto-fill tracking
    setTrackPhoneInput(currentUser.phone);
    setSearchPhoneQuery(currentUser.phone);
    setActiveTab('track');
    
    alert(`🎉 Order Placed Successfully!\n\nOrder ID: ${newOrder.orderNumber}\nWe are dispatching your items directly from the outlet in 10 Minutes! Track your status on the tracker page.`);
  };

  const cartSubtotal = (Object.values(cart) as { quantity: number; item: InventoryItem }[]).reduce((acc, curr) => acc + (curr.quantity * curr.item.sellingPrice), 0);
  const cartItemsCount = (Object.values(cart) as { quantity: number; item: InventoryItem }[]).reduce((acc, curr) => acc + curr.quantity, 0);

  // Emojis mapping helper
  const getVegEmoji = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('tomato')) return '🍅';
    if (n.includes('potato')) return '🥔';
    if (n.includes('onion')) return '🧅';
    if (n.includes('spinach') || n.includes('lettuce') || n.includes('cabbage') || n.includes('greens') || n.includes('methi')) return '🥬';
    if (n.includes('carrot')) return '🥕';
    if (n.includes('garlic')) return '🧄';
    if (n.includes('ginger') || n.includes('adrak')) return '𫊪';
    if (n.includes('chili') || n.includes('pepper') || n.includes('mirch')) return '🌶️';
    if (n.includes('cucumber') || n.includes('kheera')) return '🥒';
    if (n.includes('corn') || n.includes('bhutta')) return '🌽';
    if (n.includes('broccoli')) return '🥦';
    if (n.includes('mushroom')) return '🍄';
    if (n.includes('lemon') || n.includes('nimbu')) return '🍋';
    if (n.includes('apple')) return '🍎';
    if (n.includes('banana')) return '🍌';
    if (n.includes('gourd') || n.includes('lauki')) return '🥒';
    return '🌱';
  };

  const getVegColorClass = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('spinach') || n.includes('coriander') || n.includes('cabbage') || n.includes('methi')) return 'from-green-50 to-emerald-50 text-emerald-600 border-emerald-100';
    if (n.includes('tomato') || n.includes('chili') || n.includes('apple')) return 'from-red-50 to-orange-50 text-red-600 border-red-100';
    if (n.includes('potato') || n.includes('ginger')) return 'from-yellow-50 to-amber-100 text-amber-700 border-amber-100';
    if (n.includes('onion') || n.includes('garlic')) return 'from-purple-50 to-pink-50 text-purple-600 border-purple-100';
    return 'from-slate-50 to-zinc-50 text-zinc-600 border-zinc-100';
  };

  // Find user orders
  const trackedOrders = searchPhoneQuery.trim()
    ? customerOrders.filter(co => co.customerPhone.replace(/\D/g, '') === searchPhoneQuery.replace(/\D/g, ''))
    : [];

  // Filter active campaign ads to display
  const activeAds = storefrontAds.filter(ad => ad.isActive);

  if (!currentUser) {
    return (
      <div className="space-y-6 max-w-lg mx-auto font-sans pb-12 animate-fade-in mt-6">
        {/* Brand Banner */}
        <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-lg shadow-emerald-950/10 border border-emerald-500 relative overflow-hidden text-center">
          <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-emerald-400 opacity-20 blur-3xl pointer-events-none" />
          <span className="bg-yellow-400 text-slate-900 text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full shadow-xs border border-yellow-300">
            🔒 SECURE GATEWAY
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white mt-3 uppercase">
            Farmer's Gate Online
          </h2>
          <p className="text-xs text-emerald-100 mt-2 max-w-md mx-auto leading-relaxed">
            Register your profile with name, contact, and delivery address to unlock our dynamic 10-minute farm-fresh vegetable delivery.
          </p>
        </div>

        {/* Secure Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6 text-left">
          {authError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2">
              ⚠️ {authError}
            </div>
          )}

          {!isOtpSent ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setAuthError('');
                
                if (!authName.trim()) {
                  setAuthError('Please enter your full name.');
                  return;
                }
                
                if (!authPhone || authPhone.replace(/\D/g, '').length < 10) {
                  setAuthError('Please enter a valid 10-digit mobile number.');
                  return;
                }

                if (!authEmail || !authEmail.includes('@') || !authEmail.includes('.')) {
                  setAuthError('Please enter a valid email address.');
                  return;
                }

                if (!authAddress.trim() || authAddress.trim().length < 8) {
                  setAuthError('Please enter a complete delivery address (minimum 8 characters).');
                  return;
                }

                setIsOtpSent(true);
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={authName}
                  onChange={e => setAuthName(e.target.value)}
                  className="w-full text-xs font-bold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Indian Mobile/WhatsApp Number *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-xs font-black text-slate-400">🇮🇳 +91</span>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Enter 10-digit number..."
                    value={authPhone}
                    onChange={e => setAuthPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-xs font-bold pl-12.5 pr-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john@example.com"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  className="w-full text-xs font-bold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Delivery Address *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Enter complete building name, apartment number, street & landmark..."
                  value={authAddress}
                  onChange={e => setAuthAddress(e.target.value)}
                  className="w-full text-xs font-semibold px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">Simulate OTP Verification Channel *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('whatsapp')}
                    className={`py-3 text-xs font-black rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      verificationMethod === 'whatsapp'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    📲 WhatsApp Message
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerificationMethod('email')}
                    className={`py-3 text-xs font-black rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      verificationMethod === 'email'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    📧 Email Address
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 leading-normal bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-start gap-1.5">
                <span className="text-xs shrink-0">🛡️</span>
                <span>
                  By registering, you authorize Farmer's Gate Online to simulate secure 4-digit passcode verification to register your device session.
                </span>
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-xl text-xs shadow-md shadow-emerald-200 cursor-pointer uppercase tracking-wider transition-all"
              >
                Send Secure Code
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
              <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-xl text-xs font-bold border border-emerald-200">
                {verificationMethod === 'whatsapp' ? (
                  <>📲 Verification passcode sent to WhatsApp: <span className="font-black">+91 {authPhone}</span></>
                ) : (
                  <>📧 Verification passcode sent to Email: <span className="font-bold">{authEmail}</span></>
                )}
              </div>

              <div className="space-y-1 text-center">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Enter 4-Digit Security Code *</label>
                <input
                  type="text"
                  required
                  maxLength={4}
                  placeholder="Type simulated code (e.g. 1234)..."
                  value={authOtp}
                  onChange={e => setAuthOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-sm font-black tracking-widest px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 font-mono"
                />
              </div>

              <p className="text-[10px] text-slate-400 text-center leading-normal">
                Any 4-digit code (such as <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-600 font-bold">1234</code>) will pass this simulated security check.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsOtpSent(false)}
                  className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 font-bold py-3 rounded-xl text-xs uppercase cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Verify & Log In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-12 animate-fade-in">
      
      {/* BRAND INSTANT DELIVERY TOP-BAR */}
      <div className="bg-emerald-600 text-white rounded-3xl p-5 md:p-6 shadow-lg shadow-emerald-950/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-emerald-500 relative overflow-hidden">
        {/* Glow graphic */}
        <div className="absolute top-[-50px] right-[-50px] w-48 h-48 rounded-full bg-emerald-400 opacity-20 blur-3xl pointer-events-none" />
        
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2">
            <span className="bg-yellow-400 text-slate-900 text-[10px] uppercase font-black tracking-widest px-2.5 py-0.5 rounded-full shadow-xs border border-yellow-300">
              ⚡ INSTANT DELIVERY
            </span>
            <span className="text-emerald-100 text-xs">• Direct from Local Indian Farms</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white flex items-center gap-1.5">
            FARMER'S GATE ONLINE
          </h2>
          <p className="text-xs text-emerald-100 max-w-xl font-medium leading-relaxed">
            Experience Zepto-speed instant grocery fulfillment. Cleaned, graded, 100% farm-fresh vegetables delivered to your home in 10 Minutes!
          </p>
        </div>

        {/* User Login state & actions */}
        <div className="z-10 bg-emerald-700/60 backdrop-blur-xs border border-emerald-500 p-3.5 rounded-2xl flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center justify-between gap-4 w-full md:w-auto text-left">
            <div className="space-y-0.5">
              <span className="text-[9px] font-black text-emerald-300 uppercase tracking-wide block">SECURELY LOGGED IN</span>
              <span className="text-xs font-bold text-white block">👋 {currentUser.name}</span>
              <span className="text-[10px] text-emerald-100/80 font-mono block">+{currentUser.phone} | {currentUser.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 bg-emerald-800/80 hover:bg-red-600 rounded-xl transition-all text-white cursor-pointer hover:shadow-md shrink-0"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* HEADER CONTROLS AND TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        {/* Navigation Tabs */}
        <div className="flex gap-2.5 bg-slate-100 p-1 rounded-2xl max-w-max self-start shadow-xs">
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'shop'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            Browse Farm Fresh Shop
          </button>

          <button
            onClick={() => setActiveTab('track')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'track'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Track Live Orders
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="h-4 w-4" />
            My Account & Profile
          </button>
        </div>

        {/* Selected Store / Location Dropdown */}
        {activeTab === 'shop' && stores.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
              <MapPin className="h-4 w-4 text-slate-400" /> Deliver from Outlet:
            </span>
            <select
              value={selectedStoreId}
              onChange={e => {
                setSelectedStoreId(e.target.value);
                setCart({}); // clear cart to prevent mixing stocks
              }}
              className="text-xs font-extrabold py-2 px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 shadow-sm"
            >
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  📍 {store.name.replace("Farmer's Gate - ", "")} ({store.location})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* --- SHOP TAB --- */}
      {activeTab === 'shop' && (
        <div className="space-y-6">
          
          {/* CAMPAIGN ADVERTISING BANNERS HERO SECTION */}
          {activeAds.length > 0 && (
            <div className="space-y-2 text-left">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Today's Hot Deals & Campaigns</span>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeAds.map(ad => (
                  <div 
                    key={ad.id}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white p-4.5 border border-amber-400 shadow-md flex flex-col justify-between min-h-[140px] transition-all hover:scale-[1.01]"
                  >
                    {/* Background badge icon */}
                    <div className="absolute right-[-15px] bottom-[-15px] p-6 text-7xl opacity-15 pointer-events-none">
                      📢
                    </div>
                    
                    <div className="space-y-1.5 z-10">
                      <div className="flex items-center gap-2">
                        {ad.tagline && (
                          <span className="bg-white/25 text-white font-extrabold text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                            {ad.tagline}
                          </span>
                        )}
                        {ad.discountBadge && (
                          <span className="bg-slate-900 text-yellow-400 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider shadow-sm border border-slate-800">
                            ⚡ {ad.discountBadge}
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black tracking-tight text-white leading-snug">{ad.title}</h4>
                      <p className="text-[11px] text-amber-50/90 font-medium leading-normal max-w-[90%]">{ad.subtitle}</p>
                    </div>

                    {ad.actionText && (
                      <button
                        onClick={() => {
                          // Scroll to search or focus on matching crops
                          if (ad.title.toLowerCase().includes('leafy') || ad.tagline?.toLowerCase().includes('leafy')) {
                            setSelectedCategory('Leafy Greens');
                          } else if (ad.title.toLowerCase().includes('potato') || ad.tagline?.toLowerCase().includes('combo')) {
                            setSelectedCategory('Kitchen Staples');
                          } else {
                            setSelectedCategory('All');
                          }
                          const searchBox = document.getElementById('storefront-search');
                          if (searchBox) searchBox.focus();
                        }}
                        className="mt-3 bg-slate-950 hover:bg-slate-900 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] w-max z-10 shadow-sm flex items-center gap-1 uppercase transition-all cursor-pointer"
                      >
                        <span>{ad.actionText}</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SEARCH & QUICK PILL CATEGORIES */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
              <input
                id="storefront-search"
                type="text"
                placeholder="Search fresh potato, organic onions, chili, ginger..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10.5 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold text-slate-800 text-sm shadow-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded-md"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Category horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border ${
                      isSelected
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm font-black'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {cat === 'All' && '📋 All Crops'}
                    {cat === 'Leafy Greens' && '🥬 Leafy Greens'}
                    {cat === 'Root Crops' && '🥕 Root Crops'}
                    {cat === 'Kitchen Staples' && '🧅 Staples Combo'}
                    {cat === 'Chili & Spices' && '🌶️ Spices'}
                    {cat === 'Daily Vegetables' && '🥦 Daily Veggies'}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MAIN PRODUCT GRID & CART SPLIT */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column: Product Cards Grid */}
            <div className="lg:col-span-8 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  {selectedCategory} Crops ({filteredCrops.length} items found)
                </h3>
                <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">⏱️ Dispatch in 10 mins</span>
              </div>

              {filteredCrops.length === 0 ? (
                <div className="py-20 text-center bg-white border border-slate-200 rounded-3xl p-8">
                  <span className="text-4xl block mb-2">🧑‍🌾</span>
                  <p className="text-sm font-bold text-slate-800">Crops Currently Restocking</p>
                  <p className="text-xs text-slate-500 mt-1">This outlet doesn't have matched stock active. Select another branch or adjust filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredCrops.map(item => {
                    const itemInCart = cart[item.vegetableName];
                    const remainingStock = item.quantity - (itemInCart?.quantity || 0);
                    const isSelected = !!itemInCart;
                    const colorClass = getVegColorClass(item.vegetableName);
                    
                    return (
                      <div 
                        key={item.id} 
                        className={`bg-white border rounded-2xl p-3.5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative group ${
                          remainingStock <= 0 ? 'opacity-60 bg-slate-50 border-slate-100' : 'border-slate-200/90 hover:border-emerald-500/40'
                        }`}
                      >
                        {/* Direct from Farm Badge */}
                        <div className="absolute top-2.5 left-2.5 z-10 bg-white/90 backdrop-blur-xs text-[8px] font-black tracking-wide text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">
                          Direct Farm
                        </div>

                        {/* Visual Card Image Box */}
                        <div className="space-y-3">
                          <div className={`h-28 w-full rounded-2xl bg-gradient-to-br ${colorClass} flex items-center justify-center relative shadow-inner overflow-hidden border`}>
                            {/* Giant floating visual background */}
                            <div className="absolute right-[-10px] bottom-[-10px] text-5xl opacity-10 pointer-events-none select-none">
                              {getVegEmoji(item.vegetableName)}
                            </div>
                            <span className="text-5xl drop-shadow-md select-none transform group-hover:scale-110 transition-transform">
                              {getVegEmoji(item.vegetableName)}
                            </span>
                            
                            {remainingStock > 0 && remainingStock < 10 && (
                              <span className="absolute bottom-1.5 right-1.5 bg-amber-500 text-white font-black text-[7px] px-1.5 py-0.5 rounded tracking-wide uppercase">
                                Low Stock
                              </span>
                            )}
                          </div>

                          {/* Crop Metadata */}
                          <div className="space-y-0.5">
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight truncate" title={item.vegetableName}>
                              {item.vegetableName}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 font-bold">Standard 500g Pack</span>
                              <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-1 rounded">Freshly Graded</span>
                            </div>
                          </div>

                          {/* Price Area */}
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-sm font-extrabold text-slate-900">₹{item.sellingPrice.toFixed(0)}</span>
                            <span className="text-[10px] text-slate-400 font-bold">/ 500g</span>
                            <span className="text-[9px] text-slate-400 line-through font-bold">₹{(item.sellingPrice * 1.3).toFixed(0)}</span>
                          </div>
                        </div>

                        {/* INSTANT ZEPTO-STYLE ADD BUTTON WITH QUANTITY TOGGLE */}
                        <div className="mt-4 pt-1 border-t border-slate-100">
                          {remainingStock <= 0 && !isSelected ? (
                            <div className="bg-slate-100 rounded-xl py-2 text-center text-slate-400 text-[10px] font-extrabold uppercase tracking-wide">
                              Sold Out
                            </div>
                          ) : isSelected ? (
                            /* Transform ADD button into direct compact modifier */
                            <div className="flex items-center justify-between bg-emerald-600 text-white rounded-xl p-1.5 shadow-sm">
                              <button
                                type="button"
                                onClick={() => handleDecreaseCartQty(item, 0.5)}
                                className="h-6 w-6 rounded-lg bg-emerald-700 flex items-center justify-center text-white hover:bg-emerald-800 font-black text-xs cursor-pointer"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              
                              <span className="text-xs font-black px-1.5">
                                {itemInCart.quantity} kg
                              </span>

                              <button
                                type="button"
                                onClick={() => handleAddToCart(item, 0.5)}
                                className="h-6 w-6 rounded-lg bg-emerald-700 flex items-center justify-center text-white hover:bg-emerald-800 font-black text-xs cursor-pointer"
                                disabled={remainingStock <= 0}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            /* Clear instant action ADD button */
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item, 0.5)}
                              className="w-full bg-white hover:bg-emerald-50 text-emerald-600 border border-emerald-600/60 hover:border-emerald-600 font-extrabold py-1.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer uppercase"
                            >
                              <Plus className="h-3.5 w-3.5 stroke-[3px]" />
                              ADD <span className="text-[9px] font-medium tracking-wide font-sans pl-0.5">500g</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Column: Sticky Basket Drawer Summary */}
            <div className="lg:col-span-4 text-left">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sticky top-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-extrabold text-xs uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="h-4.5 w-4.5 text-emerald-600" /> Instant Shopping Basket
                  </h3>
                  {cartItemsCount > 0 && (
                    <button 
                      onClick={() => setCart({})}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {Object.keys(cart).length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto border border-slate-100">
                      <ShoppingBag className="h-6 w-6 text-slate-300 stroke-1" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-tight text-slate-400">Basket is empty</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] mx-auto leading-normal">
                        Click "+ ADD" on crops on the left to start building your instant basket.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Cart Items list */}
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {(Object.values(cart) as { quantity: number; item: InventoryItem }[]).map(cartItem => (
                        <div 
                          key={cartItem.item.id} 
                          className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2.5 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-2 max-w-[55%]">
                            <span className="text-2xl shrink-0">{getVegEmoji(cartItem.item.vegetableName)}</span>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-800 truncate">{cartItem.item.vegetableName}</p>
                              <p className="text-[9px] text-slate-400">₹{(cartItem.item.sellingPrice * 2).toFixed(0)}/kg</p>
                            </div>
                          </div>

                          {/* Quick modifier inside the basket summary */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDecreaseCartQty(cartItem.item, 0.5)}
                              className="h-5 w-5 bg-slate-100 rounded flex items-center justify-center hover:bg-slate-200 text-slate-700 cursor-pointer font-black text-[10px]"
                            >
                              -
                            </button>
                            
                            <span className="text-xs font-bold w-12 text-center font-mono">
                              {cartItem.quantity} kg
                            </span>

                            <button
                              type="button"
                              onClick={() => handleAddToCart(cartItem.item, 0.5)}
                              className="h-5 w-5 bg-slate-100 rounded flex items-center justify-center hover:bg-slate-200 text-slate-700 cursor-pointer font-black text-[10px]"
                              disabled={cartItem.item.quantity - cartItem.quantity <= 0}
                            >
                              +
                            </button>

                            <button
                              onClick={() => handleRemoveFromCart(cartItem.item.vegetableName)}
                              className="text-slate-300 hover:text-rose-600 p-1 cursor-pointer ml-1"
                              title="Delete Item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Checkout Details / Cost summary */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between text-slate-500">
                        <span>Total Quantity order:</span>
                        <span className="font-mono font-bold text-slate-700">{cartItemsCount.toFixed(2)} kg</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Delivery Charge:</span>
                        <span className="text-emerald-600 font-extrabold uppercase text-[10px]">⚡ FREE Delivery</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-900 text-sm border-t border-slate-200/60 pt-2 mt-2">
                        <span>Total Amount due:</span>
                        <span className="text-emerald-600">₹{cartSubtotal.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Submit Checkout flow trigger button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (!currentUser) {
                            setIsAuthModalOpen(true);
                          } else {
                            setIsCheckoutOpen(true);
                          }
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-xs shadow-md shadow-emerald-200 cursor-pointer transition-all flex items-center justify-center gap-1.5 uppercase"
                      >
                        {currentUser ? 'PROCEED TO CHECKOUT' : 'LOGIN TO PLACE ORDER'}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* --- TRACK TAB --- */}
      {activeTab === 'track' && (
        <div className="space-y-5 max-w-xl mx-auto text-left">
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm text-center space-y-4">
            <span className="text-4xl block">📦</span>
            <h3 className="font-black text-base text-slate-800 uppercase tracking-tight">Track Your Harvest Orders</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Check the live packaging, grading, and instant home dispatch milestones of your crops in real-time.
            </p>

            <div className="flex gap-2 justify-center pt-2 max-w-md mx-auto">
              <div className="relative w-full">
                <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🇮🇳 +91</span>
                <input
                  type="tel"
                  placeholder="Enter registered mobile number..."
                  value={trackPhoneInput}
                  onChange={e => setTrackPhoneInput(e.target.value)}
                  className="text-xs pl-12 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-850 w-full font-semibold"
                />
              </div>
              <button
                onClick={() => setSearchPhoneQuery(trackPhoneInput)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-5 py-2 rounded-xl shrink-0 cursor-pointer uppercase tracking-wider shadow-md shadow-emerald-100"
              >
                TRACK
              </button>
            </div>
          </div>

          {searchPhoneQuery && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Orders Linked to Phone: <span className="text-slate-800">+{searchPhoneQuery}</span>
                </span>
                <span className="text-xs font-black text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {trackedOrders.length} orders
                </span>
              </div>

              {trackedOrders.length === 0 ? (
                <div className="py-12 text-center bg-white border border-slate-200 rounded-3xl p-6 space-y-2">
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">No active orders found</p>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-normal">
                    We couldn't locate any purchases linked to this number. Please double check the 10-digit mobile number used at registration.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {trackedOrders.map(order => {
                    const statusSteps = ['Pending', 'Processing', 'Ready', 'Completed'];
                    const currentStepIdx = statusSteps.indexOf(order.status);
                    
                    return (
                      <div key={order.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
                        
                        {/* Order Header */}
                        <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                          <div>
                            <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
                              {order.orderNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-2 font-semibold uppercase tracking-wide">
                              Placed: {new Date(order.orderDate).toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-extrabold">Instant Total Due</span>
                            <span className="text-base font-black text-slate-900">₹{order.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Live Step Progress pipeline */}
                        <div className="space-y-2">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Live Fulfillment Pipeline</span>
                          
                          {/* Progress bar */}
                          <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {statusSteps.map((step, stepIdx) => {
                              const isActive = stepIdx <= currentStepIdx;
                              const isCurrent = stepIdx === currentStepIdx;
                              
                              return (
                                <div key={step} className="space-y-2">
                                  <div className={`h-1.5 rounded-full transition-colors ${
                                    isActive ? 'bg-emerald-600' : 'bg-slate-100'
                                  }`} />
                                  <div className="flex items-center gap-1 justify-center sm:justify-start">
                                    {isActive ? (
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                    ) : (
                                      <Hourglass className="h-3 w-3 text-slate-300 shrink-0" />
                                    )}
                                    <span className={`text-[9px] sm:text-[10px] font-bold ${
                                      isCurrent ? 'text-emerald-700 font-extrabold' : 
                                      isActive ? 'text-slate-700' : 
                                      'text-slate-300'
                                    }`}>
                                      {step === 'Pending' && 'Placed'}
                                      {step === 'Processing' && 'Graded'}
                                      {step === 'Ready' && 'Dispatched'}
                                      {step === 'Completed' && 'Delivered'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Vegetable list summary */}
                        <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100 text-xs">
                          <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-150">
                            Farmed Items Packaged
                          </span>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-slate-700">
                              <span className="font-bold flex items-center gap-1.5">
                                <span className="text-sm">{getVegEmoji(item.vegetableName)}</span>
                                {item.vegetableName}
                              </span>
                              <span className="font-mono text-slate-500 font-semibold">{item.quantity} kg @ ₹{item.pricePerKg}/kg</span>
                            </div>
                          ))}
                          
                          {order.notes && (
                            <div className="border-t border-slate-150 pt-2 mt-2 text-[10px] text-slate-400 italic">
                              "Delivery Note: {order.notes}"
                            </div>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- PROFILE / ACCOUNT TAB --- */}
      {activeTab === 'profile' && (
        <div className="space-y-6 max-w-4xl mx-auto text-left animate-fade-in">
          {!currentUser ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm text-center space-y-5 max-w-md mx-auto">
              <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                <User className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h3 className="font-black text-lg text-slate-800 uppercase tracking-tight">Access Your Profile</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Verify your account via WhatsApp or Email to view your active profile, edit your delivery address, and instantly track your direct farm-fresh orders.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-3 rounded-xl cursor-pointer uppercase tracking-wider shadow-md shadow-emerald-100 transition-all flex items-center justify-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Verify / Log In Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Profile Card Side Panel */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-800">{currentUser.name}</h4>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wider">
                        Verified Member
                      </span>
                    </div>
                  </div>

                  <hr className="border-slate-150" />

                  <div className="space-y-3.5 text-xs">
                    <div>
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Verification Channel</span>
                      <span className="font-extrabold text-slate-700 flex items-center gap-1.5 mt-0.5">
                        {currentUser.verificationMethod === 'email' ? '📧 Email Address' : '📲 WhatsApp Mobile'}
                      </span>
                    </div>

                    {currentUser.phone && (
                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">WhatsApp Number</span>
                        <span className="font-mono font-extrabold text-slate-700 mt-0.5 block">
                          +91 {currentUser.phone}
                        </span>
                      </div>
                    )}

                    {currentUser.email && (
                      <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Email Address</span>
                        <span className="font-bold text-slate-700 mt-0.5 block break-all">
                          {currentUser.email}
                        </span>
                      </div>
                    )}

                    <div>
                      <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Saved Delivery Address</span>
                      <span className="font-semibold text-slate-500 mt-0.5 block leading-normal">
                        {currentUser.address || 'No address configured.'}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-slate-50 border border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-700 rounded-xl transition-all text-slate-500 text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Logout Account
                </button>
              </div>

              {/* Edit Details Form Panel */}
              <div className="md:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
                <div>
                  <h3 className="font-black text-base text-slate-800 uppercase tracking-tight">Edit Profile Details</h3>
                  <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                    Modify your contact options and physical delivery coordinates to ensure lightning-fast doorstep dispatch.
                  </p>
                </div>

                {profileSuccessMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    {profileSuccessMsg}
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!editName.trim()) {
                      alert('Full Name is required.');
                      return;
                    }
                    if (editMethod === 'whatsapp' && (!editPhone || editPhone.replace(/\D/g, '').length < 10)) {
                      alert('Please enter a valid 10-digit mobile number for WhatsApp updates.');
                      return;
                    }
                    if (editMethod === 'email' && (!editEmail || !editEmail.includes('@') || !editEmail.includes('.'))) {
                      alert('Please enter a valid email address.');
                      return;
                    }

                    const updatedProfile = {
                      name: editName.trim(),
                      phone: editPhone ? editPhone.replace(/[^\d+]/g, '') : '',
                      email: editEmail.trim() || undefined,
                      verificationMethod: editMethod,
                      address: editAddress.trim() || undefined
                    };

                    localStorage.setItem('fg_customer_profile', JSON.stringify(updatedProfile));
                    setCurrentUser(updatedProfile);
                    setProfileSuccessMsg('🎉 Profile details saved successfully!');
                    setTimeout(() => setProfileSuccessMsg(''), 4000);
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full text-xs font-bold px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                        placeholder="e.g. John Doe"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Verification Option *</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setEditMethod('whatsapp')}
                          className={`py-3 text-xs font-black rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                            editMethod === 'whatsapp'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          📲 WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditMethod('email')}
                          className={`py-3 text-xs font-black rounded-xl border flex items-center justify-center gap-1.5 transition-all ${
                            editMethod === 'email'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          📧 Email
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 font-bold">
                        WhatsApp Mobile {editMethod === 'whatsapp' && '*'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3 text-xs font-black text-slate-400">🇮🇳 +91</span>
                        <input
                          type="tel"
                          required={editMethod === 'whatsapp'}
                          maxLength={10}
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full text-xs font-bold pl-12.5 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 font-mono"
                          placeholder="WhatsApp number..."
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 font-bold">
                        Email Address {editMethod === 'email' && '*'}
                      </label>
                      <input
                        type="email"
                        required={editMethod === 'email'}
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                        placeholder="e.g. name@domain.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Delivery Location Address</label>
                    <textarea
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      rows={2.5}
                      className="w-full text-xs font-semibold px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                      placeholder="e.g. Flat 302, Royal Gardens, Sector 45..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-md shadow-emerald-200 transition-all uppercase tracking-wider cursor-pointer"
                  >
                    Save Profile Changes
                  </button>
                </form>
              </div>

            </div>
          )}
        </div>
      )}

      {/* --- CHECKOUT MODAL --- */}
      {isCheckoutOpen && currentUser && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛍️</span>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">Checkout Harvest Bill</h3>
                  <p className="text-[10px] text-slate-300">Farmer's Gate Online Instant Checkout</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-white text-sm font-black p-1 bg-slate-800 rounded-lg h-7 w-7 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Space-Saving Compact List */}
            <div className="p-4 bg-slate-50 border-b border-slate-200/60 space-y-3 shrink-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
                Farmed Produce Selected (Liner Format)
              </span>
              
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200/50 text-left">
                {(Object.values(cart) as { quantity: number; item: InventoryItem }[]).map((c, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-extrabold text-slate-800"
                  >
                    <span>{getVegEmoji(c.item.vegetableName)}</span>
                    <span className="truncate max-w-[120px]">{c.item.vegetableName}</span>
                    <span className="text-emerald-700 font-mono">({c.quantity} kg)</span>
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 font-black text-slate-900">
                <span className="text-xs">Subtotal Amount:</span>
                <span className="text-base text-emerald-600">₹{cartSubtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Profile Confirmation & Custom notes Form */}
            <form onSubmit={handlePlaceOrderSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
              
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl space-y-2">
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">DELIVERING TO ACCOUNT</span>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold uppercase">NAME</span>
                    <span className="font-extrabold text-slate-800">{currentUser.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] font-bold uppercase">MOBILE</span>
                    <span className="font-mono font-extrabold text-slate-800">+{currentUser.phone}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-100/70">
                  <span className="text-slate-400 block text-[9px] font-bold uppercase">DELIVERY ADDRESS</span>
                  <span className="font-semibold text-slate-700 text-xs block">
                    {currentUser.address || 'No default address configured. Update profile to add address.'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Driver Instructions / Delivery Note (Optional)</label>
                <textarea
                  placeholder="e.g. Leave with security guard, knock on door, call on delivery..."
                  value={checkoutNotes}
                  onChange={e => setCheckoutNotes(e.target.value)}
                  rows={2.5}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-normal">
                By clicking "CONFIRM & DISPATCH", your order is assigned to a nearby courier immediately. We guarantee lightning-fast arrival!
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="flex-1 bg-white border border-slate-250 hover:bg-slate-50 text-slate-500 font-extrabold py-2.5 rounded-xl text-xs uppercase"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5 uppercase cursor-pointer"
                >
                  CONFIRM & DISPATCH <ArrowRight className="h-4 w-4" />
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
