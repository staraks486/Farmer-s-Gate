import React, { useState } from 'react';
import { Store, InventoryItem, CustomerOrder, CustomerOrderItem } from '../types';
import { ShoppingCart, Phone, MapPin, Search, ClipboardList, CheckCircle2, Clock, Hourglass, Trash2, ArrowRight, User, ShoppingBag, ShieldCheck } from 'lucide-react';

interface CustomerHubProps {
  stores: Store[];
  inventory: InventoryItem[];
  customerOrders: CustomerOrder[];
  onPlaceOrder: (newOrder: CustomerOrder) => Promise<void>;
}

export default function CustomerHub({
  stores,
  inventory,
  customerOrders,
  onPlaceOrder
}: CustomerHubProps) {
  const [activeTab, setActiveTab] = useState<'shop' | 'track'>('shop');
  
  // Store selector
  const [selectedStoreId, setSelectedStoreId] = useState<string>(stores[0]?.id || '');

  // Cart State
  const [cart, setCart] = useState<{ [vegName: string]: { quantity: number; item: InventoryItem } }>({});

  // Active selected quantities for crop cards before adding to cart
  const [selectedQuantities, setSelectedQuantities] = useState<{ [itemId: string]: number }>({});
  
  // Checkout Form State
  const [checkoutForm, setCheckoutForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    notes: ''
  });

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Track state
  const [trackPhoneInput, setTrackPhoneInput] = useState('');
  const [searchPhoneQuery, setSearchPhoneQuery] = useState('');

  // Get active inventory for the selected store
  const storeInventory = inventory.filter(item => item.storeId === selectedStoreId && item.quantity > 0);

  // Helper selectors for fractional quantities
  const getSelectedQty = (itemId: string) => {
    return selectedQuantities[itemId] !== undefined ? selectedQuantities[itemId] : 1;
  };

  const handleUpdateSelectedQty = (itemId: string, val: number, max: number) => {
    const cleanVal = Math.max(0.05, Math.min(max, parseFloat(val.toFixed(2))));
    setSelectedQuantities(prev => ({
      ...prev,
      [itemId]: cleanVal
    }));
  };

  const handleQuickSelectQty = (itemId: string, val: number, max: number) => {
    handleUpdateSelectedQty(itemId, val, max);
  };

  // Cart Handlers
  const handleAddToCart = (item: InventoryItem, qty: number = 1) => {
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
          quantity: parseFloat(newQty.toFixed(3)),
          item
        }
      };
    });
  };

  const handleUpdateCartQty = (vegName: string, qty: number, maxAvailable: number) => {
    if (qty <= 0) {
      handleRemoveFromCart(vegName);
      return;
    }

    setCart(prev => {
      const target = prev[vegName];
      if (!target) return prev;

      return {
        ...prev,
        [vegName]: {
          ...target,
          quantity: parseFloat(Math.min(maxAvailable, qty).toFixed(3))
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

  const handleClearCart = () => {
    setCart({});
  };

  // Checkout submission
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(cart).length === 0) {
      alert('Your cart is empty. Please add some fresh produce first.');
      return;
    }
    if (!checkoutForm.customerName || !checkoutForm.customerPhone) {
      alert('Please fill out your Name and Phone Number to place an order.');
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
      orderNumber: `FG-CUST-${Math.floor(10000 + Math.random() * 90000)}`,
      storeId: selectedStoreId,
      customerName: checkoutForm.customerName,
      customerPhone: checkoutForm.customerPhone,
      customerAddress: checkoutForm.customerAddress || undefined,
      items: orderItems,
      totalAmount,
      status: 'Pending',
      paymentStatus: 'Unpaid',
      orderDate: new Date().toISOString(),
      notes: checkoutForm.notes || undefined
    };

    await onPlaceOrder(newOrder);
    
    // Clear cart and display success details
    setCart({});
    setIsCheckoutOpen(false);
    alert(`🎉 Success! Your order ${newOrder.orderNumber} has been submitted. You can track its live status in the "Track Order" tab using your phone number (${newOrder.customerPhone}).`);
    
    // Auto-fill track tab phone
    setTrackPhoneInput(newOrder.customerPhone);
    setSearchPhoneQuery(newOrder.customerPhone);
    setActiveTab('track');
  };

  // Find user orders
  const trackedOrders = searchPhoneQuery.trim() 
    ? customerOrders.filter(co => co.customerPhone.replace(/\D/g, '') === searchPhoneQuery.replace(/\D/g, ''))
    : [];

  // Calculate cart summary
  const cartSubtotal = (Object.values(cart) as { quantity: number; item: InventoryItem }[]).reduce((acc, curr) => acc + (curr.quantity * curr.item.sellingPrice), 0);
  const cartItemsCount = (Object.values(cart) as { quantity: number; item: InventoryItem }[]).reduce((acc, curr) => acc + curr.quantity, 0);

  // Vegetable illustrative descriptors / emoji helpers
  const getVegEmoji = (name: string): string => {
    const n = name.toLowerCase();
    if (n.includes('tomato')) return '🍅';
    if (n.includes('potato')) return '🥔';
    if (n.includes('onion')) return '🧅';
    if (n.includes('spinach') || n.includes('lettuce') || n.includes('cabbage')) return '🥬';
    if (n.includes('carrot')) return '🥕';
    if (n.includes('garlic')) return '🧄';
    if (n.includes('ginger')) return '🫚';
    if (n.includes('pepper') || n.includes('chili')) return '🌶️';
    if (n.includes('cucumber')) return '🥒';
    if (n.includes('corn')) return '🌽';
    if (n.includes('broccoli')) return '🥦';
    if (n.includes('mushroom')) return '🍄';
    return '🌱';
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Hub Title Card */}
      <div className="relative overflow-hidden bg-emerald-900 text-white rounded-2xl p-6 md:p-8 border border-emerald-850 shadow-md">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShoppingCart className="w-48 h-48" />
        </div>
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/80 px-3 py-1 text-[10px] font-bold text-emerald-200">
            <ShieldCheck className="h-3 w-3" /> DIRECT FROM THE FARMS
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Farmer's Gate Shopfront</h2>
          <p className="text-xs md:text-sm text-emerald-200/90 font-medium leading-relaxed">
            Order fresh harvested vegetables directly from local smallholder farms. Choose your nearest outlet, add crops to your cart, and track your orders in real-time.
          </p>
        </div>
      </div>

      {/* Navigation & Store selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 gap-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('shop')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'shop'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Browse Fresh Vegetables
          </button>

          <button
            onClick={() => setActiveTab('track')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'track'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="h-3.5 w-3.5" />
            Track My Orders
          </button>
        </div>

        {/* Selected Store dropdown */}
        {activeTab === 'shop' && stores.length > 0 && (
          <div className="flex items-center gap-2 pb-2 sm:pb-0">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-400" /> Choose Outlet:
            </span>
            <select
              value={selectedStoreId}
              onChange={e => {
                setSelectedStoreId(e.target.value);
                setCart({}); // Clear cart if switching stores to prevent multi-store cart confusion
              }}
              className="text-xs font-bold py-1 px-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700"
            >
              {stores.map(store => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.location})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* --- SHOP TAB --- */}
      {activeTab === 'shop' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left panel: Vegetable Cards Grid */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Available Crops Harvested This Morning</h3>
            
            {storeInventory.length === 0 ? (
              <div className="py-20 text-center bg-white border border-slate-200 rounded-xl p-8">
                <span className="text-4xl block mb-2">🧑‍🌾</span>
                <p className="text-sm font-bold text-slate-800">Crops Currently Restocking</p>
                <p className="text-xs text-slate-500 mt-1">This outlet is currently receiving fresh morning crops. Please select a different branch or check back shortly!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {storeInventory.map(item => {
                  const itemInCart = cart[item.vegetableName];
                  const remainingStock = item.quantity - (itemInCart?.quantity || 0);
                  const selectedQty = getSelectedQty(item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between border-slate-200/90 hover:border-emerald-500/40 relative group ${
                        remainingStock <= 0 ? 'opacity-70 bg-slate-50' : ''
                      }`}
                    >
                      {/* Top Info Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                            {getVegEmoji(item.vegetableName)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight">{item.vegetableName}</h4>
                            <p className="text-xs font-black text-emerald-600 mt-0.5">
                              ₹{item.sellingPrice.toFixed(2)} <span className="text-[10px] text-slate-400 font-bold">/ kg</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${
                            remainingStock <= 0 
                              ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                              : remainingStock < 10 
                                ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {remainingStock <= 0 ? 'Sold Out' : `${remainingStock} kg left`}
                          </span>
                        </div>
                      </div>

                      {remainingStock > 0 ? (
                        <div className="mt-4 space-y-3">
                          {/* Fraction Quantity selector row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/50">
                            {/* Dec/Inc numeric selector */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleUpdateSelectedQty(item.id, selectedQty - 0.25, item.quantity)}
                                className="h-6 w-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-xs font-black cursor-pointer shadow-sm"
                              >
                                -
                              </button>
                              <div className="flex items-center gap-0.5 px-1 bg-transparent">
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0.05"
                                  max={item.quantity}
                                  value={selectedQty}
                                  onChange={(e) => handleUpdateSelectedQty(item.id, parseFloat(e.target.value) || 0, item.quantity)}
                                  className="w-11 bg-transparent text-center text-xs font-black text-slate-850 focus:outline-none"
                                />
                                <span className="text-[10px] font-bold text-slate-400">kg</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleUpdateSelectedQty(item.id, selectedQty + 0.25, item.quantity)}
                                className="h-6 w-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all text-xs font-black cursor-pointer shadow-sm"
                              >
                                +
                              </button>
                            </div>

                            {/* Quick fractions tag click buttons */}
                            <div className="flex gap-1 items-center justify-end">
                              {[
                                { label: '250g', val: 0.25 },
                                { label: '500g', val: 0.50 },
                                { label: '1kg', val: 1.00 },
                                { label: '2kg', val: 2.00 }
                              ].map(shortcut => (
                                <button
                                  key={shortcut.label}
                                  type="button"
                                  onClick={() => handleQuickSelectQty(item.id, shortcut.val, item.quantity)}
                                  className={`px-1.5 py-1 rounded-md text-[9px] font-extrabold border transition-all cursor-pointer ${
                                    Math.abs(selectedQty - shortcut.val) < 0.001
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                      : 'bg-white border-slate-250 text-slate-600 hover:border-slate-350 hover:bg-slate-50'
                                  }`}
                                >
                                  {shortcut.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Action Button: Add to Cart */}
                          <button
                            type="button"
                            onClick={() => {
                              handleAddToCart(item, selectedQty);
                              setSelectedQuantities(prev => ({ ...prev, [item.id]: 1 }));
                            }}
                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer uppercase"
                          >
                            <ShoppingCart className="h-3 w-3 text-emerald-400" /> 
                            ADD {selectedQty} kg TO BASKET 
                            <span className="text-[10px] text-emerald-300 font-mono pl-1">
                              (₹{(selectedQty * item.sellingPrice).toFixed(1)})
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="mt-4 bg-slate-100 rounded-xl p-3 text-center border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Out of Stock</p>
                        </div>
                      )}

                      {/* If in cart, show a beautiful subtle green border/overlay tag */}
                      {itemInCart && (
                        <div className="absolute -top-1.5 -right-1.5 bg-emerald-600 text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1 border border-emerald-500">
                          <span>✓</span> Selected ({itemInCart.quantity} kg)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: Cart Summary & Checkout */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sticky top-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="font-extrabold text-xs uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="h-4 w-4 text-emerald-600" /> Your Shopping Basket
                </h3>
                {cartItemsCount > 0 && (
                  <button 
                    onClick={handleClearCart}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-700"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {Object.keys(cart).length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <ShoppingBag className="h-8 w-8 mx-auto stroke-1 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-tight text-slate-400">Your basket is empty</p>
                  <p className="text-[11px] text-slate-400 mt-1">Select crop items from the store on the left to add them to your cart.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart items list */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {(Object.values(cart) as { quantity: number; item: InventoryItem }[]).map(cartItem => (
                      <div key={cartItem.item.id} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getVegEmoji(cartItem.item.vegetableName)}</span>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{cartItem.item.vegetableName}</p>
                            <p className="text-[10px] text-slate-400">₹{cartItem.item.sellingPrice.toFixed(2)}/kg</p>
                          </div>
                        </div>

                        {/* Quantity switcher */}
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="number" 
                            min="0.05"
                            step="0.05"
                            max={cartItem.item.quantity}
                            value={cartItem.quantity}
                            onChange={e => handleUpdateCartQty(cartItem.item.vegetableName, parseFloat(e.target.value) || 0, cartItem.item.quantity)}
                            className="w-14 text-center text-xs font-bold border border-slate-200 rounded py-0.5"
                          />
                          <span className="text-[10px] text-slate-400">kg</span>
                          <button
                            onClick={() => handleRemoveFromCart(cartItem.item.vegetableName)}
                            className="text-slate-400 hover:text-rose-600 p-0.5 ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing subtotal block */}
                  <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 border border-slate-100 text-[11px]">
                    <div className="flex justify-between text-slate-500">
                      <span>Total crop count:</span>
                      <span>{cartItemsCount} kg</span>
                    </div>
                    <div className="flex justify-between font-black text-slate-800 text-xs border-t border-slate-150 pt-1.5 mt-1">
                      <span>Total Amount due:</span>
                      <span>₹{cartSubtotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action to trigger popup checkout */}
                  <div className="pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsCheckoutOpen(true)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-sm cursor-pointer transition-all flex items-center justify-center gap-1.5 uppercase"
                    >
                      PROCEED TO CHECKOUT <ArrowRight className="h-3.5 w-3.5 text-emerald-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* --- TRACK TAB --- */}
      {activeTab === 'track' && (
        <div className="space-y-5 max-w-xl mx-auto">
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm text-center">
            <span className="text-3xl block">📦</span>
            <h3 className="font-extrabold text-sm text-slate-800">Track Your Pending Harvest Orders</h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Check the preparation, quality inspection, and dispatch milestones of your active vegetable orders instantly.
            </p>

            <div className="flex gap-2 justify-center pt-2 max-w-sm mx-auto">
              <input
                type="tel"
                placeholder="Enter checkout phone number..."
                value={trackPhoneInput}
                onChange={e => setTrackPhoneInput(e.target.value)}
                className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 w-full"
              />
              <button
                onClick={() => setSearchPhoneQuery(trackPhoneInput)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg shrink-0 cursor-pointer"
              >
                TRACK
              </button>
            </div>
          </div>

          {searchPhoneQuery && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
                  Orders Linked to Phone: <span className="text-slate-800">{searchPhoneQuery}</span>
                </span>
                <span className="text-xs font-bold text-slate-500">Found {trackedOrders.length} records</span>
              </div>

              {trackedOrders.length === 0 ? (
                <div className="py-12 text-center bg-white border border-slate-200 rounded-xl p-6">
                  <p className="text-slate-500 text-xs font-medium">No active orders found for this phone number.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Check that you have input the exact digits logged during checkout.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {trackedOrders.map(order => {
                    const statusSteps = ['Pending', 'Processing', 'Ready', 'Completed'];
                    const currentStepIdx = statusSteps.indexOf(order.status);
                    
                    return (
                      <div key={order.id} className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 space-y-4">
                        
                        {/* Order Header block */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div>
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
                              {order.orderNumber}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                              Logged: {new Date(order.orderDate).toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide font-bold">Total Cost</span>
                            <span className="text-xs font-black text-slate-900">₹{order.totalAmount.toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Live Step Progress pipeline */}
                        <div className="space-y-2">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Live Fullfillment Tracker</span>
                          
                          {/* Visual progress bar */}
                          <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {statusSteps.map((step, stepIdx) => {
                              const isActive = stepIdx <= currentStepIdx;
                              const isCurrent = stepIdx === currentStepIdx;
                              
                              return (
                                <div key={step} className="space-y-1">
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
                                      {step}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Vegetable list summary */}
                        <div className="bg-slate-50 p-3 rounded-lg space-y-1.5 border border-slate-100">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Purchased Produce</span>
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-slate-700">
                              <span className="font-semibold">{getVegEmoji(item.vegetableName)} {item.vegetableName}</span>
                              <span className="font-mono text-slate-500">{item.quantity} kg @ ₹{item.pricePerKg}/kg</span>
                            </div>
                          ))}
                          {order.notes && (
                            <div className="border-t border-slate-200/50 pt-1.5 mt-1.5 text-[10px] text-slate-400 italic">
                              "Note: {order.notes}"
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

      {/* --- POPUP BILL CHECKOUT MODAL --- */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛒</span>
                <div>
                  <h3 className="font-extrabold text-sm tracking-tight">Checkout Harvest Bill</h3>
                  <p className="text-[10px] text-slate-300">Complete details to log your fresh order</p>
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

            {/* Space-Saving Liner Format Bill Display */}
            <div className="p-5 bg-slate-50 border-b border-slate-200/60 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Harvest Items to Pack (Liner Format)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                  Compact
                </span>
              </div>
              
              {/* Liner layout: inline badges wrapping horizontally */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-white rounded-2xl border border-slate-200/50">
                {(Object.values(cart) as { quantity: number; item: InventoryItem }[]).map((c, i) => (
                  <span 
                    key={i} 
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-[11px] font-extrabold text-slate-800"
                  >
                    <span>{getVegEmoji(c.item.vegetableName)}</span>
                    <span className="truncate max-w-[100px]">{c.item.vegetableName.replace(/ \(.*\)/, '')}</span>
                    <span className="text-emerald-700 font-mono">({c.quantity} kg)</span>
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100 font-black text-slate-900">
                <span className="text-xs">Subtotal Amount:</span>
                <span className="text-base text-emerald-600">₹{cartSubtotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Checkout Form fields */}
            <form onSubmit={handleCheckout} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Your Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Robert Smith"
                  value={checkoutForm.customerName}
                  onChange={e => setCheckoutForm(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Your Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 919876543210"
                  value={checkoutForm.customerPhone}
                  onChange={e => setCheckoutForm(prev => ({ ...prev, customerPhone: e.target.value }))}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 animate-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Delivery Address (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Apartment 4B, 22 Park Avenue, Mumbai"
                  value={checkoutForm.customerAddress}
                  onChange={e => setCheckoutForm(prev => ({ ...prev, customerAddress: e.target.value }))}
                  className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Driver Instructions / Notes (Optional)</label>
                <textarea
                  placeholder="e.g. Ring the bell, keep in basket at front porch..."
                  value={checkoutForm.notes}
                  onChange={e => setCheckoutForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800"
                />
              </div>

              {/* Action Buttons inside Modal */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="flex-1 bg-white border border-slate-250 hover:bg-slate-50 text-slate-600 font-extrabold py-2.5 rounded-xl text-xs transition-all cursor-pointer uppercase"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-1.5 uppercase cursor-pointer"
                >
                  Place Order <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
