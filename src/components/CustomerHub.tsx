import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { 
  ShoppingCart, 
  MapPin, 
  Search, 
  CheckCircle2, 
  Trash2, 
  ArrowRight, 
  User, 
  ShoppingBag, 
  Plus, 
  Minus, 
  ChevronRight, 
  LogOut, 
  FileText, 
  Ticket, 
  Sparkles, 
  Gift,
  Clock,
  MessageSquare,
  Send,
  Navigation,
  Phone,
  Lock,
  Mail,
  UserPlus,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { 
  auth, 
  getProductsFromFirestore, 
  placeOrderInFirestore, 
  subscribeToCustomerOrders, 
  updateProductStockInFirestore,
  updateOrderStatusInFirestore,
  seedProductsIfNeeded,
  FirebaseOrder
} from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { getVegEmoji, availableCoupons } from './customer/customerData';
import RecipeGuide from './customer/RecipeGuide';

export default function CustomerHub() {
  const [activeTab, setActiveTab] = useState<'shop' | 'track' | 'profile'>('shop');
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Firebase user states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authAddress, setAuthAddress] = useState('');
  const [authError, setAuthError] = useState('');

  // Cart State: productId -> quantity
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  
  // Checkout details
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [customAddress, setCustomAddress] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [useWallet, setUseWallet] = useState(false);
  
  // Pre-seed static wallet balance for simulation/gamification
  const [walletBalance, setWalletBalance] = useState(150.00);

  // Customer's order history state (synced via Firestore)
  const [customerOrders, setCustomerOrders] = useState<FirebaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<FirebaseOrder | null>(null);
  const [customerChatMessage, setCustomerChatMessage] = useState('');

  // Auto-seed and load products
  useEffect(() => {
    const initData = async () => {
      setLoadingProducts(true);
      await seedProductsIfNeeded();
      const items = await getProductsFromFirestore();
      setProducts(items);
      setLoadingProducts(false);
    };
    initData();
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      setUser(fbUser);
      setLoadingAuth(false);
      
      // Load or create default profile details
      if (fbUser) {
        const emailPrefix = fbUser.email?.split('@')[0] || 'Premium Guest';
        setAuthName(localStorage.getItem(`fg_name_${fbUser.uid}`) || emailPrefix);
        setAuthPhone(localStorage.getItem(`fg_phone_${fbUser.uid}`) || '+91 95000 12345');
        setCustomAddress(localStorage.getItem(`fg_address_${fbUser.uid}`) || '402, Green Meadows, Sector 4, Bangalore');
      }
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to real-time customer orders from Firestore
  useEffect(() => {
    if (!user) {
      setCustomerOrders([]);
      return;
    }
    // Use user's email or registered phone as unique tracker identifier
    const trackerPhone = authPhone || user.email || 'guest';
    const unsubscribeOrders = subscribeToCustomerOrders(trackerPhone, (orders) => {
      setCustomerOrders(orders);
      
      // Keep selected order updated in real-time
      if (selectedOrder) {
        const updated = orders.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    });

    return () => {
      unsubscribeOrders();
    };
  }, [user, authPhone, selectedOrder?.id]);

  // Handle Firebase Auth Submit
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!authEmail || !authPassword) {
      setAuthError('Please enter email and password.');
      return;
    }

    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        const credential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        if (credential.user) {
          // Save profile fields in local storage tied to user UID
          localStorage.setItem(`fg_name_${credential.user.uid}`, authName || 'Premium Farmer');
          localStorage.setItem(`fg_phone_${credential.user.uid}`, authPhone || '+91 95000 12345');
          localStorage.setItem(`fg_address_${credential.user.uid}`, authAddress || '402, Green Meadows, Bangalore');
        }
      }
      setAuthError('');
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    }
  };

  // Instant Guest Login for testing/demo
  const handleInstantGuestLogin = async (role: 'customer' | 'partner') => {
    setAuthError('');
    try {
      // Use standard preconfigured accounts for seamless evaluation
      const email = role === 'partner' ? 'partner@farmersgate.com' : 'demo_shopper@farmersgate.com';
      const pass = 'farmersgate123';
      
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      // If doesn't exist, register it automatically
      try {
        const email = role === 'partner' ? 'partner@farmersgate.com' : 'demo_shopper@farmersgate.com';
        const pass = 'farmersgate123';
        const credential = await createUserWithEmailAndPassword(auth, email, pass);
        if (credential.user) {
          localStorage.setItem(`fg_name_${credential.user.uid}`, role === 'partner' ? 'Live Partner Rider' : 'Gold Shopper');
          localStorage.setItem(`fg_phone_${credential.user.uid}`, role === 'partner' ? '+91 90000 00000' : '+91 95000 12345');
          localStorage.setItem(`fg_address_${credential.user.uid}`, 'FarmersGate HQ Dispatch Hub, Block C, Bengaluru');
        }
      } catch (innerErr: any) {
        setAuthError(innerErr.message);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCart({});
    setSelectedOrder(null);
  };

  // Cart Management
  const getUnitStep = (unit: string): number => {
    if (unit === 'kg') return 0.25;
    if (unit === 'g') return 50;
    return 1;
  };

  const handleAddToCart = (id: string, step?: number) => {
    const p = products.find(prod => prod.id === id);
    if (!p || p.stock <= 0) return;
    
    const actualStep = step !== undefined ? step : getUnitStep(p.unit);
    setCart(prev => {
      const cur = prev[id] || 0;
      const next = parseFloat((cur + actualStep).toFixed(2));
      if (next > p.stock) return prev; // check stock limits
      return { ...prev, [id]: next };
    });
  };

  const handleDecreaseCart = (id: string, step?: number) => {
    const p = products.find(prod => prod.id === id);
    if (!p) return;
    const actualStep = step !== undefined ? step : getUnitStep(p.unit);
    setCart(prev => {
      const cur = prev[id] || 0;
      const next = parseFloat((cur - actualStep).toFixed(2));
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  // Calculations
  const cartItemsList = Object.entries(cart).map(([id, qty]) => {
    const p = products.find(item => item.id === id);
    return { item: p, quantity: qty };
  }).filter((c): c is { item: any; quantity: number } => c.item !== undefined);

  const cartSubtotal = cartItemsList.reduce((acc, c) => acc + (Number(c.item.sellingPrice) * Number(c.quantity)), 0);
  const currentDiscount = appliedCoupon ? (cartSubtotal * (Number(appliedCoupon.percent) / 100)) : 0;
  const deliveryFee = cartSubtotal > 200 ? 0 : 25;
  const finalPaidAmount = Math.max(0, cartSubtotal - currentDiscount + deliveryFee - (useWallet ? Math.min(walletBalance, cartSubtotal - currentDiscount) : 0));

  // Apply Coupon
  const handleApplyPromoCode = (code: string) => {
    setCouponError('');
    const coupon = availableCoupons.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
    if (!coupon) {
      setCouponError('Invalid. Try FG50 (50% off) or FRESHFAST!');
      return;
    }
    setAppliedCoupon(coupon);
  };

  // Place Order Action
  const handlePlaceOrder = async () => {
    if (!user) {
      setActiveTab('profile');
      return;
    }
    if (cartItemsList.length === 0) return;

    try {
      const orderNum = Math.floor(100000 + Math.random() * 900000).toString();
      
      const orderData: FirebaseOrder = {
        orderNumber: orderNum,
        customerName: authName || 'Premium Farmer',
        customerPhone: authPhone || user.email || '+91 95000 12345',
        customerAddress: customAddress || '402, Green Meadows, Sector 4, Bangalore',
        items: cartItemsList.map(c => ({
          id: String(c.item.id),
          vegetableName: String(c.item.vegetableName),
          quantity: Number(c.quantity),
          pricePerKg: Number(c.item.sellingPrice),
          totalPrice: Number(c.item.sellingPrice) * Number(c.quantity),
          emoji: String(c.item.emoji || '🥦')
        })),
        totalAmount: cartSubtotal,
        discount: currentDiscount,
        walletDebited: useWallet ? Math.min(walletBalance, cartSubtotal - currentDiscount) : 0,
        finalPaid: finalPaidAmount,
        status: 'Pending',
        paymentStatus: 'Paid',
        orderDate: new Date().toISOString(),
        latitude: 12.9716 + (Math.random() - 0.5) * 0.015,
        longitude: 77.5946 + (Math.random() - 0.5) * 0.015
      };

      // 1. Save order to Firestore
      const orderId = await placeOrderInFirestore(orderData);
      
      // 2. Subtract product stocks in Firestore
      for (const cartItem of cartItemsList) {
        const remainingStock = Math.max(0, cartItem.item.stock - cartItem.quantity);
        await updateProductStockInFirestore(cartItem.item.id, remainingStock);
      }

      // 3. Subtract from wallet balance if used
      if (useWallet) {
        const debited = Math.min(walletBalance, cartSubtotal - currentDiscount);
        setWalletBalance(prev => Math.max(0, prev - debited));
      }

      // Clear Cart & Close Modal
      setCart({});
      setIsCheckoutOpen(false);
      
      // Navigate to Track view and select the newly placed order
      setActiveTab('track');
      setSelectedOrder({ ...orderData, id: orderId });

      // Highlight Success
      alert(`🎉 Receipt Generated! Your order #${orderNum} has been registered successfully. Our dispatch rider will deliver it in 9 Minutes!`);
    } catch (err) {
      console.error(err);
      alert('Error registering FarmersGate dispatch ticket.');
    }
  };

  // Save profile updates
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      localStorage.setItem(`fg_name_${user.uid}`, authName);
      localStorage.setItem(`fg_phone_${user.uid}`, authPhone);
      localStorage.setItem(`fg_address_${user.uid}`, customAddress);
      alert('Profile Delivery Details Saved Successfully!');
    }
  };

  // Live Chat send message as Customer
  const handleSendCustomerChat = async () => {
    if (!selectedOrder?.id || !customerChatMessage.trim()) return;

    const currentMessages = (selectedOrder as any).messages || [];
    const newMessage = {
      sender: 'customer',
      text: customerChatMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      await updateOrderStatusInFirestore(selectedOrder.id, selectedOrder.status, {
        messages: [...currentMessages, newMessage]
      } as any);
      setCustomerChatMessage('');
    } catch (err) {
      console.error('Error sending chat message', err);
    }
  };

  // PDF Bill Receipt Generation
  const handleDownloadInvoice = (order: FirebaseOrder) => {
    try {
      const docPdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      docPdf.setFillColor(16, 185, 129); // emerald green
      docPdf.rect(0, 0, 210, 45, 'F');

      // Title
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(24);
      docPdf.text("FARMERSGATE RECEIPT", 14, 20);

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(10);
      docPdf.text("9-Min Instant Farm Direct Grocery Delivery", 14, 28);
      docPdf.text(`Ticket ID: #${order.orderNumber}`, 14, 35);

      // Metadata box
      docPdf.setTextColor(30, 41, 59);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.text("CUSTOMER INVOICE DETAILS", 14, 55);

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(10);
      docPdf.text(`Recipient Name: ${order.customerName}`, 14, 63);
      docPdf.text(`Phone: ${order.customerPhone}`, 14, 69);
      docPdf.text(`Address: ${order.customerAddress}`, 14, 75);
      docPdf.text(`Order Date: ${order.orderDate ? new Date(order.orderDate).toLocaleString() : 'Just Now'}`, 14, 81);

      // Line items Table
      docPdf.setFont('helvetica', 'bold');
      docPdf.text("Item Sourced", 14, 95);
      docPdf.text("Qty Sourced", 90, 95);
      docPdf.text("Price/Unit", 130, 95);
      docPdf.text("Line Total", 170, 95);
      
      docPdf.line(14, 97, 196, 97);

      let currentY = 104;
      docPdf.setFont('helvetica', 'normal');
      order.items.forEach((it) => {
        docPdf.text(`${it.vegetableName}`, 14, currentY);
        docPdf.text(`${it.quantity} units`, 90, currentY);
        docPdf.text(`₹${it.pricePerKg}`, 130, currentY);
        docPdf.text(`₹${it.totalPrice}`, 170, currentY);
        currentY += 8;
      });

      docPdf.line(14, currentY, 196, currentY);
      currentY += 8;

      // Summary
      docPdf.setFont('helvetica', 'bold');
      docPdf.text(`Basket Subtotal:`, 110, currentY);
      docPdf.setFont('helvetica', 'normal');
      docPdf.text(`₹${order.totalAmount}`, 170, currentY);
      currentY += 6;

      if (order.discount > 0) {
        docPdf.setFont('helvetica', 'bold');
        docPdf.setTextColor(220, 38, 38);
        docPdf.text(`Discount Slashed:`, 110, currentY);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`-₹${order.discount}`, 170, currentY);
        currentY += 6;
      }

      if (order.walletDebited > 0) {
        docPdf.setFont('helvetica', 'bold');
        docPdf.setTextColor(16, 185, 129);
        docPdf.text(`FG Wallet Debit:`, 110, currentY);
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(`-₹${order.walletDebited}`, 170, currentY);
        currentY += 6;
      }

      docPdf.setTextColor(16, 185, 129);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.text(`Final Amount Settled:`, 110, currentY);
      docPdf.text(`₹${order.finalPaid.toFixed(2)}`, 170, currentY);

      // Footer
      docPdf.setFontSize(8);
      docPdf.setTextColor(148, 163, 184);
      docPdf.text("Thank you for buying farm direct! Sourced organically & delivered in 9 mins.", 14, 280);

      docPdf.save(`FarmersGate_Invoice_${order.orderNumber}.pdf`);
    } catch (e) {
      console.error(e);
      alert('Failed generating PDF receipt.');
    }
  };

  // Filter fresh produce
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.vegetableName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* ⚡ Announcement Promise Bar */}
      <div className="bg-emerald-600 text-white text-[10px] font-black text-center py-1.5 uppercase tracking-widest flex items-center justify-center gap-1.5">
        <span>⚡ FarmersGate Golden Promise: 100% Organically Sourced & Dispatched in 9 Minutes!</span>
      </div>

      {/* Main navigation header */}
      <header className="bg-emerald-950 text-white shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl">🥦</span>
            <div>
              <h1 className="font-black text-lg uppercase tracking-tight text-white flex items-center gap-1">
                Farmers<span className="text-emerald-400">Gate</span>
                <span className="bg-emerald-500 text-slate-900 text-[8.5px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider ml-1">
                  Fresh
                </span>
              </h1>
              <p className="text-[10px] text-slate-300 font-medium">Instant Harvest to Doorstep Delivery App</p>
            </div>
          </div>

          <nav className="flex items-center gap-1">
            <button 
              onClick={() => setActiveTab('shop')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'shop' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-emerald-900/60'
              }`}
            >
              🛍️ Shop Now
            </button>
            <button 
              onClick={() => setActiveTab('track')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer relative ${
                activeTab === 'track' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-emerald-900/60'
              }`}
            >
              🚚 Track Orders
              {customerOrders.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-slate-950 text-[8px] font-black flex items-center justify-center text-slate-950">
                  {customerOrders.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setActiveTab('profile')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'profile' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:bg-emerald-900/60'
              }`}
            >
              👤 {user ? 'My Profile' : 'Sign In'}
            </button>
          </nav>
        </div>
      </header>

      {/* Main Grid View */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {activeTab === 'shop' && (
          <>
            {/* Catalog list section (Left 3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              
              {/* Category selector row */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {['All', 'Vegetable', 'Fruit', 'Herbs', 'Grocery', 'Recipes'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap border ${
                      selectedCategory === cat
                        ? 'bg-emerald-950 border-emerald-950 text-white shadow-md font-black'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat === 'All' ? '📂 All Sourced' : cat === 'Recipes' ? '🍳 Fresh Recipes' : cat}
                  </button>
                ))}
              </div>

              {/* Live search input */}
              {selectedCategory !== 'Recipes' && (
                <div className="relative animate-fade-in">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Sift through premium organic onions, gala apples, fresh mint bunch..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 text-xs font-semibold shadow-3xs"
                  />
                </div>
              )}

              {/* Recipes or Sourced items grid list */}
              {selectedCategory === 'Recipes' ? (
                <RecipeGuide
                  products={products}
                  cart={cart}
                  onAddToCart={handleAddToCart}
                />
              ) : loadingProducts ? (
                <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 shadow-3xs flex flex-col items-center justify-center gap-3">
                  <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-500">Harvesting fresh catalog information from FarmersGate...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-3xs">
                  <p className="text-slate-400 font-bold text-xs uppercase">No produce matches search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filteredProducts.map((item) => {
                    const qtyInCart = cart[item.id] || 0;
                    return (
                      <motion.div 
                        key={item.id}
                        whileHover={{ y: -2 }}
                        className={`bg-white border rounded-2xl p-4.5 shadow-3xs hover:shadow-md transition-all flex flex-col justify-between relative ${
                          item.stock <= 0 ? 'opacity-60 bg-slate-50 border-slate-200' : 'border-slate-200/90 hover:border-emerald-500/30'
                        }`}
                      >
                        {/* Farm Direct indicator */}
                        <div className="absolute top-2.5 right-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 font-black text-[7.5px] px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          ORGANIC DIRECT
                        </div>

                        <div>
                          <span className="text-4xl block mb-2">{item.emoji || '🥦'}</span>
                          <h3 className="font-extrabold text-slate-800 text-xs tracking-tight line-clamp-1">{item.vegetableName}</h3>
                          <span className="inline-block text-[8px] font-black uppercase text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded mt-1">
                            {item.category}
                          </span>

                          <div className="flex justify-between items-baseline mt-3 border-t border-slate-100 pt-3">
                            <div>
                              <p className="text-[7.5px] font-black uppercase tracking-wider text-slate-400">ORGANIC RATE</p>
                              <span className="text-sm font-black text-slate-900 font-mono">₹{item.sellingPrice}</span>
                              <span className="text-[10px] text-slate-400 font-semibold">/{item.unit}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-1">
                          {item.stock <= 0 ? (
                            <div className="w-full bg-slate-100 text-slate-400 font-black py-1.5 rounded-xl text-[10px] text-center uppercase tracking-wider">
                              Sold Out
                            </div>
                          ) : qtyInCart > 0 ? (
                            <div className="flex items-center justify-between bg-emerald-950 text-white rounded-xl p-1 shadow-sm">
                              <button
                                type="button"
                                onClick={() => handleDecreaseCart(item.id)}
                                className="h-6 w-6 rounded-lg bg-emerald-900 flex items-center justify-center text-white hover:bg-emerald-800 font-black text-xs cursor-pointer animate-fade-in"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              
                              <div className="flex items-center justify-center gap-0.5">
                                <input
                                  type="number"
                                  step={getUnitStep(item.unit)}
                                  min="0.01"
                                  value={qtyInCart}
                                  onChange={(e) => {
                                    const val = parseFloat(parseFloat(e.target.value).toFixed(2)) || 0;
                                    if (val <= 0) {
                                      setCart(prev => {
                                        const copy = { ...prev };
                                        delete copy[item.id];
                                        return copy;
                                      });
                                    } else {
                                      const limitedVal = Math.min(val, item.stock);
                                      setCart(prev => ({ ...prev, [item.id]: limitedVal }));
                                    }
                                  }}
                                  className="w-11 bg-emerald-900 text-white text-[11px] font-black font-mono text-center rounded focus:outline-none focus:ring-1 focus:ring-emerald-400 py-0.5 border-none"
                                />
                                <span className="text-[8px] font-bold text-emerald-300 select-none lowercase">{item.unit}</span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddToCart(item.id)}
                                className="h-6 w-6 rounded-lg bg-emerald-900 flex items-center justify-center text-white hover:bg-emerald-800 font-black text-xs cursor-pointer animate-fade-in"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item.id)}
                              className="w-full bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-600/50 hover:border-emerald-600 font-black py-1.5 rounded-xl text-[10px] flex items-center justify-center gap-0.5 transition-all cursor-pointer uppercase"
                            >
                              <Plus className="h-3.5 w-3.5 stroke-[3px]" />
                              ADD <span className="text-[9px] font-semibold pl-0.5">({item.unit})</span>
                            </button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instant Basket sidecard (Right 1 col) */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-4 sticky top-4 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="font-black text-xs uppercase text-slate-700 tracking-wider flex items-center gap-1.5">
                    <ShoppingCart className="h-4 w-4 text-emerald-600" /> Instant Basket
                  </h3>
                  {cartItemsList.length > 0 && (
                    <button 
                      onClick={() => setCart({})}
                      className="text-[9px] font-extrabold text-red-500 hover:text-red-700 cursor-pointer uppercase"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {cartItemsList.length === 0 ? (
                  <div className="text-center py-10 space-y-2">
                    <ShoppingBag className="h-8 w-8 text-slate-200 mx-auto" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your basket is empty</p>
                    <p className="text-[9px] text-slate-400">Add fresh organic produce to trigger instant 9-minute dispatch!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Basket list */}
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {cartItemsList.map(({ item, quantity }) => (
                        <div key={item.id} className="flex justify-between items-center text-xs p-2 bg-slate-50 rounded-xl border border-slate-150">
                          <div className="flex items-center gap-1 min-w-0">
                            <span>{item.emoji || '🥦'}</span>
                            <span className="font-extrabold text-slate-800 truncate max-w-[100px]">{item.vegetableName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black font-mono text-emerald-700 text-[11px]">
                              {quantity} {item.unit} • ₹{(item.sellingPrice * quantity).toFixed(2)}
                            </span>
                            <button 
                              onClick={() => handleDecreaseCart(item.id)}
                              className="p-1 hover:bg-slate-200 rounded text-red-500 cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Coupons input panel */}
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl space-y-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">🎟️ PROMO TICKET CODES</span>
                      
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Code (e.g. FG50)"
                          value={couponCode}
                          onChange={e => setCouponCode(e.target.value)}
                          className="flex-1 text-[10px] font-black uppercase px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                        <button
                          onClick={() => handleApplyPromoCode(couponCode)}
                          className="bg-emerald-950 text-white text-[10px] font-black px-3 py-1 rounded-lg cursor-pointer"
                        >
                          Apply
                        </button>
                      </div>

                      {appliedCoupon ? (
                        <p className="text-[9px] font-bold text-emerald-600">✓ Slashed: {appliedCoupon.code} ({appliedCoupon.badge})</p>
                      ) : couponError ? (
                        <p className="text-[9px] font-bold text-red-500">{couponError}</p>
                      ) : (
                        <div className="flex gap-1 overflow-x-auto pt-1 scrollbar-none">
                          {availableCoupons.map((coupon) => (
                            <button
                              key={coupon.code}
                              onClick={() => handleApplyPromoCode(coupon.code)}
                              className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-black cursor-pointer whitespace-nowrap shrink-0"
                            >
                              🏷️ {coupon.code} ({coupon.badge})
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Digital Wallet Rewards Redemption */}
                    <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl text-[10.5px] font-bold">
                      <label className="flex items-center gap-2 text-emerald-900 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={useWallet} 
                          onChange={e => setUseWallet(e.target.checked)}
                          className="h-3.5 w-3.5 text-emerald-700 focus:ring-emerald-500 rounded cursor-pointer"
                        />
                        <span>Redeem ₹{Math.min(walletBalance, cartSubtotal - currentDiscount).toFixed(2)} from FG Wallet (Balance: ₹{walletBalance.toFixed(2)})</span>
                      </label>
                    </div>

                    {/* Receipts details */}
                    <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl text-[10.5px] space-y-1 text-slate-500 font-semibold">
                      <div className="flex justify-between">
                        <span>Cart Subtotal:</span>
                        <span className="font-bold text-slate-800">₹{cartSubtotal}</span>
                      </div>
                      {currentDiscount > 0 && (
                        <div className="flex justify-between text-red-500 font-bold">
                          <span>Coupon Discount:</span>
                          <span>-₹{currentDiscount}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Delivery Fee (9-Min Promise):</span>
                        <span className="font-bold text-slate-800">{deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}</span>
                      </div>
                      
                      <div className="flex justify-between font-black text-slate-900 text-xs border-t border-slate-200/60 pt-2 mt-1">
                        <span>Total Payable Due:</span>
                        <span className="text-emerald-700 text-sm">₹{finalPaidAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Place Order dispatch CTA */}
                    {user ? (
                      <button
                        onClick={handlePlaceOrder}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        ⚡ PROCEED TO DISPATCH <ArrowRight className="h-4.5 w-4.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveTab('profile')}
                        className="w-full bg-emerald-950 hover:bg-slate-900 text-emerald-400 font-black py-3 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        🔐 SIGN IN TO PLACE ORDER <ArrowRight className="h-4.5 w-4.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Real-time Order Tracking tab */}
        {activeTab === 'track' && (
          <div className="lg:col-span-4 space-y-4 text-left">
            <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-1.5">
                    🚚 Live farmersgate dispatch radar
                  </h3>
                  <p className="text-[10.5px] text-slate-400 font-bold uppercase mt-0.5">Real-time status synced directly on Firestore</p>
                </div>
                
                {customerOrders.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase self-center">Active Tickets:</span>
                    <select 
                      onChange={(e) => {
                        const ord = customerOrders.find(o => o.id === e.target.value);
                        if (ord) setSelectedOrder(ord);
                      }}
                      value={selectedOrder?.id || ''}
                      className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:outline-none"
                    >
                      <option value="">Select ticket...</option>
                      {customerOrders.map(o => (
                        <option key={o.id} value={o.id}>Order #{o.orderNumber} ({o.status})</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {customerOrders.length === 0 ? (
                <div className="text-center py-16 space-y-3">
                  <Navigation className="h-10 w-10 text-emerald-600 mx-auto animate-bounce" />
                  <h4 className="text-sm font-black text-slate-700 uppercase">No registered dispatch tickets yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Once you place an order in the storefront, your 9-minute instant delivery tracking dashboard will wake up here!</p>
                  <button 
                    onClick={() => setActiveTab('shop')}
                    className="bg-emerald-600 text-white font-black text-[10.5px] px-4 py-2 rounded-xl cursor-pointer uppercase tracking-wider"
                  >
                    Go Shop Fresh Produce
                  </button>
                </div>
              ) : selectedOrder ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left: Progress details */}
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4.5 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">DISPATCH TICKET ID</span>
                          <h4 className="font-black text-slate-800 text-sm font-mono">#{selectedOrder.orderNumber}</h4>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          selectedOrder.status === 'Pending' ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse' :
                          selectedOrder.status === 'Packing' ? 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse' :
                          selectedOrder.status === 'On The Way' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {selectedOrder.status}
                        </span>
                      </div>

                      {/* Status timeline text with clock */}
                      <div className="border-t border-slate-200/60 pt-3 space-y-3">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Estimated Delivery</p>
                        <div className="flex items-center gap-2">
                          <Clock className="h-5 w-5 text-emerald-600 animate-spin" />
                          <div>
                            <span className="text-sm font-black text-slate-900">9 Minutes Sourced Promise</span>
                            <p className="text-[10px] text-slate-400 font-medium">Harvested farm fresh produce is in dispatch</p>
                          </div>
                        </div>
                      </div>

                      {/* PDF Invoice Download */}
                      <button 
                        onClick={() => handleDownloadInvoice(selectedOrder)}
                        className="w-full py-2 bg-emerald-950 hover:bg-slate-900 text-emerald-400 font-black text-[10.5px] rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        <FileText className="h-4 w-4" /> Download Digital Invoice
                      </button>
                    </div>

                    {/* Delivery Partner Details */}
                    {selectedOrder.riderName && (
                      <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-2">
                        <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">FarmersGate Assigned Rider</span>
                        <p className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                          🏍️ {selectedOrder.riderName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold">📞 {selectedOrder.riderPhone || '+91 90000 12345'}</p>
                      </div>
                    )}
                  </div>

                  {/* Middle: Map simulation */}
                  <div className="lg:col-span-1 h-80 bg-slate-100 border border-slate-200 rounded-3xl overflow-hidden relative">
                    <div className="absolute top-3 left-3 bg-white/95 border border-slate-200 shadow-sm px-3 py-1.5 rounded-xl z-10 text-[9px] font-black uppercase text-slate-700 flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Real-time tracking
                    </div>

                    {/* Simulated visual radar (SVG map coordinate) */}
                    <svg className="w-full h-full bg-slate-50" viewBox="0 0 100 100">
                      {/* Grid Roads */}
                      <line x1="10" y1="0" x2="10" y2="100" stroke="#e2e8f0" strokeWidth="2" />
                      <line x1="50" y1="0" x2="50" y2="100" stroke="#e2e8f0" strokeWidth="3" />
                      <line x1="90" y1="0" x2="90" y2="100" stroke="#e2e8f0" strokeWidth="2" />
                      <line x1="0" y1="20" x2="100" y2="20" stroke="#e2e8f0" strokeWidth="2" />
                      <line x1="0" y1="60" x2="100" y2="60" stroke="#e2e8f0" strokeWidth="3" />

                      {/* Sourced HQ Pin */}
                      <circle cx="20" cy="30" r="4" fill="#047857" />
                      <text x="26" y="32" fontSize="3.5" fontWeight="bold" fill="#047857">FARMERSGATE DISPATCH</text>

                      {/* Customer Destination Pin */}
                      <circle cx="80" cy="70" r="4" fill="#ef4444" />
                      <text x="80" y="66" fontSize="3.5" fontWeight="bold" fill="#ef4444" textAnchor="middle">YOUR HOME</text>

                      {/* Moving Rider animation */}
                      {selectedOrder.status === 'On The Way' ? (
                        <g>
                          <circle cx="50" cy="50" r="5" fill="#10b981" opacity="0.4" className="animate-ping" />
                          <circle cx="50" cy="50" r="3" fill="#10b981" />
                          <text x="50" y="44" fontSize="3" fontWeight="bold" fill="#065f46" textAnchor="middle">🏍️ Ramesh Sourced</text>
                        </g>
                      ) : selectedOrder.status === 'Delivered' ? (
                        <g>
                          <circle cx="80" cy="70" r="6" fill="#10b981" opacity="0.3" />
                          <text x="80" y="79" fontSize="3" fontWeight="bold" fill="#047857" textAnchor="middle">✓ Delivered!</text>
                        </g>
                      ) : (
                        <g>
                          <circle cx="20" cy="30" r="5" fill="#d97706" opacity="0.4" className="animate-pulse" />
                          <text x="20" y="40" fontSize="3" fontWeight="bold" fill="#92400e" textAnchor="middle">⏳ Sourcing Sacks</text>
                        </g>
                      )}
                    </svg>
                  </div>

                  {/* Right: Real-time Live Chat */}
                  <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-3xl p-4 flex flex-col justify-between h-80">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        💬 Rider Live Messaging Box
                      </span>
                      <p className="text-[8.5px] text-slate-400 font-semibold mt-0.5">Need delivery adjustments? Inform Ramesh here.</p>
                    </div>

                    {/* Chat logs */}
                    <div className="flex-1 overflow-y-auto my-3 space-y-2 text-[10.5px]">
                      {((selectedOrder as any).messages || []).length === 0 ? (
                        <p className="text-slate-400 italic text-center pt-16">No messages exchanged. Sourced rider will notify you during dispatch.</p>
                      ) : (
                        ((selectedOrder as any).messages || []).map((msg: any, mIdx: number) => (
                          <div key={mIdx} className={`flex flex-col ${msg.sender === 'customer' ? 'items-end' : 'items-start'}`}>
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase px-1">{msg.sender === 'customer' ? 'You' : 'Rider Ramesh'}</span>
                            <div className={`p-2 rounded-2xl max-w-[85%] mt-0.5 ${
                              msg.sender === 'customer' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                            }`}>
                              <p className="font-semibold leading-normal">{msg.text}</p>
                              <span className="text-[7px] text-right block opacity-70 mt-0.5">{msg.time}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="flex gap-1.5 shrink-0">
                      <input 
                        type="text"
                        placeholder="e.g. Please leave at door, thank you!"
                        value={customerChatMessage}
                        onChange={e => setCustomerChatMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendCustomerChat()}
                        className="flex-1 text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                      />
                      <button 
                        onClick={handleSendCustomerChat}
                        className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer shadow-3xs"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p className="text-xs font-bold uppercase">Select a ticket from the selector dropdown to track live status.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile and Authentication Tab */}
        {activeTab === 'profile' && (
          <div className="lg:col-span-4 space-y-4 text-left max-w-xl mx-auto w-full">
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              {loadingAuth ? (
                <div className="text-center py-12">
                  <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">Checking session logs...</p>
                </div>
              ) : !user ? (
                /* Beautiful Auth Screen */
                <div className="space-y-6">
                  <div className="text-center space-y-1.5">
                    <span className="text-4xl block">🔐</span>
                    <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight">FarmersGate Security Desk</h3>
                    <p className="text-[10.5px] text-slate-400 font-bold uppercase">Secure your digital wallet and delivery logs via Firebase Auth</p>
                  </div>

                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-1.5">
                      ⚠ {authError}
                    </div>
                  )}

                  <form onSubmit={handleAuthSubmit} className="space-y-4">
                    {authMode === 'register' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase">Your Name</label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. Ramesh Sourced"
                            value={authName}
                            onChange={e => setAuthName(e.target.value)}
                            className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 block uppercase">Mobile Number</label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g. +91 95000 12345"
                            value={authPhone}
                            onChange={e => setAuthPhone(e.target.value)}
                            className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input 
                          type="email"
                          required
                          placeholder="shopper@farmersgate.com"
                          value={authEmail}
                          onChange={e => setAuthEmail(e.target.value)}
                          className="w-full text-xs font-bold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-400 block uppercase">Account Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                        <input 
                          type="password"
                          required
                          placeholder="••••••••"
                          value={authPassword}
                          onChange={e => setAuthPassword(e.target.value)}
                          className="w-full text-xs font-bold pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {authMode === 'register' && (
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 block uppercase">Delivery Location Address</label>
                        <input 
                          type="text"
                          required
                          placeholder="e.g. 402, Green Meadows, Sector 4, Bangalore"
                          value={authAddress}
                          onChange={e => setAuthAddress(e.target.value)}
                          className="w-full text-xs font-bold px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl uppercase tracking-wider cursor-pointer shadow-md transition-all"
                    >
                      {authMode === 'login' ? '🔐 Sign In Account' : '📝 Create Shopper Account'}
                    </button>
                  </form>

                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-3">
                    <button 
                      onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                      className="text-emerald-600 hover:underline cursor-pointer"
                    >
                      {authMode === 'login' ? 'Create new account instead?' : 'Already have account? Sign In'}
                    </button>
                  </div>

                  {/* Preloaded Demo Buttons to skip login typing */}
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block text-center">⚡ INSTANT DEMO BYPASS</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleInstantGuestLogin('customer')}
                        className="py-2.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-xl cursor-pointer uppercase"
                      >
                        🛍️ Shopper Access
                      </button>
                      <button 
                        onClick={() => handleInstantGuestLogin('partner')}
                        className="py-2.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-emerald-400 text-[10px] font-black rounded-xl cursor-pointer uppercase"
                      >
                        🏍️ Partner Rider Access
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Authenticated Profile view */
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 font-black flex items-center justify-center text-lg shadow-sm border border-emerald-800">
                        {authName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm leading-none">{authName}</h4>
                        <span className="inline-block text-[8px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded mt-1">
                          Verified Sourced Shopper
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={handleSignOut}
                      className="p-2 bg-slate-50 border border-slate-200 hover:bg-red-50 hover:text-red-600 rounded-xl text-slate-400 cursor-pointer"
                    >
                      <LogOut className="h-4.5 w-4.5" />
                    </button>
                  </div>

                  {/* Digital Wallet Box */}
                  <div className="p-4 bg-emerald-950 text-white rounded-2xl flex justify-between items-center shadow-md">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block">FarmersGate Wallet Balance</span>
                      <p className="text-xl font-black font-mono">₹{walletBalance.toFixed(2)}</p>
                    </div>
                    <div className="p-3 bg-emerald-900/60 rounded-xl">
                      <Wallet className="h-6 w-6 text-emerald-400 animate-pulse" />
                    </div>
                  </div>

                  {/* Update Delivery Address Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Default Dispatch Profile</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block uppercase">Name</label>
                        <input 
                          type="text"
                          required
                          value={authName}
                          onChange={e => setAuthName(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-500 block uppercase">Phone Number</label>
                        <input 
                          type="text"
                          required
                          value={authPhone}
                          onChange={e => setAuthPhone(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[9px] font-bold text-slate-500 block uppercase">GPS Delivery Street Address</label>
                      <input 
                        type="text"
                        required
                        value={customAddress}
                        onChange={e => setCustomAddress(e.target.value)}
                        className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl uppercase tracking-wider cursor-pointer shadow-3xs"
                    >
                      Save Dispatch Details
                    </button>
                  </form>

                  {/* Past orders receipts history */}
                  <div className="space-y-2 border-t border-slate-100 pt-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Past Dispatch Receipts</span>
                    {customerOrders.length === 0 ? (
                      <p className="text-slate-400 italic text-xs">No registered receipts under this account yet.</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {customerOrders.map(order => (
                          <div 
                            key={order.id} 
                            onClick={() => {
                              setSelectedOrder(order);
                              setActiveTab('track');
                            }}
                            className="p-3 bg-slate-50 border border-slate-200 hover:border-emerald-500/30 rounded-xl flex justify-between items-center cursor-pointer transition-all text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-700 block">Ticket #{order.orderNumber}</span>
                              <span className="text-[9px] text-slate-400 font-medium">{order.items.length} Sourced items • ₹{order.finalPaid}</span>
                            </div>
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase">
                              {order.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
