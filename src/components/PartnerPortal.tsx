import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle, 
  Package, 
  Truck, 
  CheckCheck, 
  AlertCircle, 
  MessageSquare, 
  Plus, 
  Minus, 
  DollarSign, 
  Clock, 
  MapPin, 
  RefreshCw, 
  Search, 
  Send,
  X,
  Database,
  Edit,
  Trash2
} from 'lucide-react';
import { 
  db, 
  subscribeToOrders, 
  updateOrderStatusInFirestore, 
  getProductsFromFirestore, 
  updateProductStockInFirestore,
  updateProductInFirestore,
  addProductToFirestore,
  deleteProductFromFirestore,
  addNotificationToFirestore,
  FirebaseOrder
} from '../lib/firebase';

export default function PartnerPortal({ appVersion }: { appVersion?: string }) {
  const [orders, setOrders] = useState<FirebaseOrder[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory'>('orders');
  const [selectedOrder, setSelectedOrder] = useState<FirebaseOrder | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [riderInput, setRiderInput] = useState({ name: '', phone: '' });

  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    vegetableName: '',
    category: 'Vegetable',
    sellingPrice: 0,
    costPrice: 0,
    stock: 0,
    unit: 'kg',
    emoji: '🥦',
    minStockThreshold: 10
  });

  // Handler to update an existing product
  const handleUpdateProduct = async (productId: string, updatedFields: Partial<any>) => {
    try {
      await updateProductInFirestore(productId, updatedFields);
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...updatedFields } : p));
      setEditingProduct(null);
    } catch (err) {
      alert('Error updating product details.');
    }
  };

  // Handler to delete a product
  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this item from the catalog?')) {
      try {
        await deleteProductFromFirestore(productId);
        setProducts(prev => prev.filter(p => p.id !== productId));
        if (editingProduct?.id === productId) {
          setEditingProduct(null);
        }
      } catch (err) {
        alert('Error deleting product.');
      }
    }
  };

  // Handler to add a new product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.vegetableName.trim()) {
      alert('Please enter a product name.');
      return;
    }
    try {
      const addedId = await addProductToFirestore(newProductForm);
      const newProd = { ...newProductForm, id: addedId };
      setProducts(prev => [...prev, newProd]);

      // Send real-time central catalog broadcast notification to all stores
      try {
        await addNotificationToFirestore({
          type: 'new_product',
          title: '🥦 New Crop Added to Catalogue!',
          message: `A fresh batch of "${newProductForm.emoji} ${newProductForm.vegetableName}" has been successfully added to the central catalogue. Category: ${newProductForm.category}. Sourcing price: ₹${newProductForm.costPrice}/${newProductForm.unit} (selling price is set to ₹${newProductForm.sellingPrice}/${newProductForm.unit}). Initial available farm pool stock: ${newProductForm.stock} ${newProductForm.unit}. Local stores can now request restocks of this item!`,
          timestamp: new Date().toISOString(),
          severity: 'success',
          linkToView: 'store'
        });
      } catch (notifErr) {
        console.error('Failed to broadcast central catalog notification:', notifErr);
      }

      setIsAddingProduct(false);
      setNewProductForm({
        vegetableName: '',
        category: 'Vegetable',
        sellingPrice: 0,
        costPrice: 0,
        stock: 0,
        unit: 'kg',
        emoji: '🥦',
        minStockThreshold: 10
      });
    } catch (err) {
      alert('Error creating product.');
    }
  };

  // Load orders and products in real-time
  useEffect(() => {
    // Subscribe to orders
    const unsubscribeOrders = subscribeToOrders((fetchedOrders) => {
      setOrders(fetchedOrders);
      setLoadingOrders(false);
      // Update selected order details in real-time if open
      if (selectedOrder) {
        const updated = fetchedOrders.find(o => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    });

    // Fetch products
    const loadProducts = async () => {
      setLoadingProducts(true);
      const items = await getProductsFromFirestore();
      setProducts(items);
      setLoadingProducts(false);
    };
    loadProducts();

    return () => {
      unsubscribeOrders();
    };
  }, [selectedOrder?.id, appVersion]);

  const refreshProducts = async () => {
    setLoadingProducts(true);
    const items = await getProductsFromFirestore();
    setProducts(items);
    setLoadingProducts(false);
  };

  // Status transitions
  const handleUpdateStatus = async (orderId: string, nextStatus: FirebaseOrder['status'], extra: Partial<FirebaseOrder> = {}) => {
    try {
      await updateOrderStatusInFirestore(orderId, nextStatus, extra);
      // Auto-update selected order local state too
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, status: nextStatus, ...extra } : null);
      }
    } catch (err) {
      alert('Error updating order status');
    }
  };

  // Adjust stock
  const handleAdjustStock = async (productId: string, currentStock: number, change: number) => {
    const newStock = Math.max(0, currentStock + change);
    await updateProductStockInFirestore(productId, newStock);
    // Refresh products view
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: newStock } : p));
  };

  // Send rider chat message
  const handleSendRiderChat = async () => {
    if (!selectedOrder?.id || !chatMessage.trim()) return;

    const currentMessages = (selectedOrder as any).messages || [];
    const newMessage = {
      sender: 'rider',
      text: chatMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    try {
      await updateOrderStatusInFirestore(selectedOrder.id, selectedOrder.status, {
        messages: [...currentMessages, newMessage]
      } as any);
      setChatMessage('');
    } catch (err) {
      console.error('Error sending chat', err);
    }
  };

  // Dispatch details form
  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder?.id) return;
    
    const rName = riderInput.name.trim() || 'Sandeep Singh (Gold Rider)';
    const rPhone = riderInput.phone.trim() || '+91 98765 43210';

    await handleUpdateStatus(selectedOrder.id, 'On The Way', {
      riderName: rName,
      riderPhone: rPhone
    });
    
    setRiderInput({ name: '', phone: '' });
  };

  // Filter orders
  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const packingOrders = orders.filter(o => o.status === 'Packing');
  const activeDeliveryOrders = orders.filter(o => o.status === 'On The Way');
  const completedOrders = orders.filter(o => o.status === 'Delivered' || o.status === 'Cancelled');

  // Filter products
  const filteredProducts = products.filter(p => 
    p.vegetableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header bar */}
      <header className="bg-emerald-950 text-white shadow-md border-b border-emerald-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500 flex items-center justify-center text-xl shadow-inner font-extrabold text-slate-900">
              📦
            </div>
            <div>
              <h1 className="font-black text-sm uppercase tracking-wider text-emerald-400">FarmersGate Partner</h1>
              <p className="text-[10px] text-slate-300 font-semibold uppercase">Fulfillment Desk & Real-time Rider Console</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'orders' ? 'bg-emerald-500 text-slate-950' : 'bg-transparent text-slate-300 hover:bg-emerald-900/60'
              }`}
            >
              📥 Orders ({orders.length})
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'inventory' ? 'bg-emerald-500 text-slate-950' : 'bg-transparent text-slate-300 hover:bg-emerald-900/60'
              }`}
            >
              🗄️ Stock Adjuster
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        {activeTab === 'orders' ? (
          <>
            {/* Orders Feed */}
            <div className="lg:col-span-2 space-y-4 overflow-y-auto pr-1">
              {loadingOrders ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-3xs flex flex-col items-center justify-center gap-2.5">
                  <RefreshCw className="h-6 w-6 text-emerald-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-500">Connecting to FarmersGate Live Dispatch Cloud...</p>
                </div>
              ) : orders.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-3xs">
                  <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-sm font-black text-slate-700 uppercase">No active delivery tickets</h3>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">Orders placed by customers in the FarmersGate app will instantly appear here with live notifications!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Action Required */}
                  <div className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      🚨 ACTION REQUIRED ({pendingOrders.length + packingOrders.length})
                    </h2>
                    
                    {/* Pending */}
                    {pendingOrders.map(order => (
                      <motion.div 
                        key={order.id}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedOrder(order)}
                        className={`bg-white border-2 rounded-2xl p-4 shadow-3xs cursor-pointer transition-all ${
                          selectedOrder?.id === order.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-amber-200 hover:border-amber-400'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black bg-amber-50 text-amber-700 border border-amber-100 uppercase">
                              New Order
                            </span>
                            <h4 className="font-extrabold text-slate-800 text-xs mt-2">{order.customerName}</h4>
                            <p className="text-[10px] text-slate-500 font-bold">{order.customerPhone}</p>
                          </div>
                          <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <div className="mt-3 border-t border-slate-100 pt-3 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">
                            {order.items.length} items • ₹{order.finalPaid}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(order.id!, 'Packing');
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] px-3 py-1.5 rounded-lg uppercase cursor-pointer"
                          >
                            Accept & Pack
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    {/* Packing */}
                    {packingOrders.map(order => (
                      <motion.div 
                        key={order.id}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedOrder(order)}
                        className={`bg-white border-2 rounded-2xl p-4 shadow-3xs cursor-pointer transition-all ${
                          selectedOrder?.id === order.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-blue-200 hover:border-blue-400'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                              Packing Produce
                            </span>
                            <h4 className="font-extrabold text-slate-800 text-xs mt-2">{order.customerName}</h4>
                            <p className="text-[10px] text-slate-500 font-bold">{order.customerPhone}</p>
                          </div>
                          <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <div className="mt-3 border-t border-slate-100 pt-3 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">
                            {order.items.length} items • ₹{order.finalPaid}
                          </span>
                          <span className="text-[10px] font-black text-blue-600 animate-pulse uppercase">
                            ⚙️ Packing Desk
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Right Column: In Transit / Complete */}
                  <div className="space-y-4">
                    <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      🚚 OUT FOR DELIVERY ({activeDeliveryOrders.length})
                    </h2>
                    
                    {activeDeliveryOrders.map(order => (
                      <motion.div 
                        key={order.id}
                        whileHover={{ y: -2 }}
                        onClick={() => setSelectedOrder(order)}
                        className={`bg-white border-2 rounded-2xl p-4 shadow-3xs cursor-pointer transition-all ${
                          selectedOrder?.id === order.id ? 'border-emerald-500 ring-2 ring-emerald-100' : 'border-emerald-100 hover:border-emerald-300'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2 py-0.5 rounded-full text-[8.5px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                              On The Way
                            </span>
                            <h4 className="font-extrabold text-slate-800 text-xs mt-2">{order.customerName}</h4>
                            <p className="text-[10px] text-slate-500 font-bold">Rider: {order.riderName || 'Assigned'}</p>
                          </div>
                          <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            #{order.orderNumber}
                          </span>
                        </div>
                        <div className="mt-3 border-t border-slate-100 pt-3 flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">
                            ₹{order.finalPaid} • 9-Min Promise
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateStatus(order.id!, 'Delivered');
                            }}
                            className="bg-emerald-950 hover:bg-slate-900 text-emerald-400 font-black text-[10px] px-2.5 py-1.5 rounded-lg uppercase cursor-pointer"
                          >
                            Mark Delivered ✓
                          </button>
                        </div>
                      </motion.div>
                    ))}

                    <h2 className="text-[10px] font-black uppercase tracking-wider text-slate-400 pt-2">
                      ✅ COMPLETED RECENTLY ({completedOrders.length})
                    </h2>
                    {completedOrders.slice(0, 5).map(order => (
                      <div 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-slate-100 border border-slate-200 rounded-2xl p-3 flex justify-between items-center cursor-pointer hover:bg-slate-200 transition-all"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{order.customerName}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">{order.orderDate ? new Date(order.orderDate).toLocaleTimeString() : ''}</p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                          order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Details Panel & Real-time Chat Controller */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col justify-between overflow-hidden h-[calc(100vh-140px)] sticky top-4">
              {selectedOrder ? (
                <div className="flex flex-col h-full justify-between">
                  {/* Top content */}
                  <div className="space-y-4 overflow-y-auto flex-1 pr-1 pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-black text-slate-800 text-sm uppercase">Order #{selectedOrder.orderNumber}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Fulfillment Details</p>
                      </div>
                      <button 
                        onClick={() => setSelectedOrder(null)}
                        className="p-1 hover:bg-slate-100 rounded-full cursor-pointer text-slate-400"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-200">
                      <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                        👤 {selectedOrder.customerName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-bold">📞 {selectedOrder.customerPhone}</p>
                      <p className="text-[10px] text-slate-500 font-bold flex items-start gap-1">
                        📍 <span className="line-clamp-2">{selectedOrder.customerAddress || 'No GPS pinned address.'}</span>
                      </p>
                    </div>

                    {/* Status timeline widget */}
                    <div className="grid grid-cols-5 gap-1.5 text-center py-2">
                      {['Pending', 'Packing', 'On The Way', 'Delivered'].map((st, i) => {
                        const states = ['Pending', 'Packing', 'On The Way', 'Delivered'];
                        const currentIndex = states.indexOf(selectedOrder.status);
                        const stepIndex = states.indexOf(st);
                        const isActive = stepIndex <= currentIndex && selectedOrder.status !== 'Cancelled';
                        return (
                          <div key={st} className="space-y-1">
                            <div className={`h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                            <span className={`text-[8px] font-black block leading-tight ${isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                              {st}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Order items list */}
                    <div className="space-y-2">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Packed Basket Items</p>
                      <div className="space-y-1.5">
                        {selectedOrder.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span>{item.emoji || '🥦'}</span>
                              <p className="font-bold text-slate-800 truncate">{item.vegetableName}</p>
                            </div>
                            <span className="font-bold text-slate-500 font-mono">
                              {item.quantity} kg • ₹{item.totalPrice}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action form */}
                    {selectedOrder.status === 'Pending' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id!, 'Packing')}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <Package className="h-4 w-4" /> Start Packing Order
                      </button>
                    )}

                    {selectedOrder.status === 'Packing' && (
                      <form onSubmit={handleDispatchOrder} className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-2xl space-y-3 text-left">
                        <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">Dispatch to Delivery Partner</span>
                        
                        <div className="space-y-2">
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 block uppercase">Rider Full Name</label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. Ramesh Kumar"
                              value={riderInput.name}
                              onChange={e => setRiderInput({ ...riderInput, name: e.target.value })}
                              className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-slate-500 block uppercase">Rider Contact Number</label>
                            <input 
                              type="text"
                              required
                              placeholder="e.g. +91 99887 76655"
                              value={riderInput.phone}
                              onChange={e => setRiderInput({ ...riderInput, phone: e.target.value })}
                              className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-emerald-950 hover:bg-slate-900 text-white font-black text-[10px] rounded-xl uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Truck className="h-4 w-4 text-emerald-400 animate-bounce" /> HAND OVER & DISPATCH (9-MIN PROMISE)
                        </button>
                      </form>
                    )}

                    {selectedOrder.status === 'On The Way' && (
                      <button
                        onClick={() => handleUpdateStatus(selectedOrder.id!, 'Delivered')}
                        className="w-full py-3 bg-emerald-950 hover:bg-slate-900 text-emerald-400 font-black text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <CheckCheck className="h-4 w-4 text-emerald-400" /> Mark Delivered (Complete Order)
                      </button>
                    )}

                    {/* Chat log with Customer */}
                    {selectedOrder.status !== 'Delivered' && selectedOrder.status !== 'Cancelled' && (
                      <div className="border-t border-slate-100 pt-4 space-y-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-emerald-600" /> Live Chat with Customer
                        </span>
                        
                        <div className="h-36 bg-slate-50 rounded-2xl p-3 overflow-y-auto space-y-2 text-[10.5px]">
                          {((selectedOrder as any).messages || []).length === 0 ? (
                            <p className="text-slate-400 italic text-center pt-8">No messages yet. Send a status update or greet the customer!</p>
                          ) : (
                            ((selectedOrder as any).messages || []).map((msg: any, mIdx: number) => (
                              <div key={mIdx} className={`flex flex-col ${msg.sender === 'rider' ? 'items-end' : 'items-start'}`}>
                                <span className="text-[7.5px] font-bold text-slate-400 uppercase px-1">{msg.sender === 'rider' ? 'You (Rider)' : 'Customer'}</span>
                                <div className={`p-2 rounded-2xl max-w-[85%] mt-0.5 ${
                                  msg.sender === 'rider' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                                }`}>
                                  <p className="font-semibold leading-normal">{msg.text}</p>
                                  <span className="text-[7px] text-right block opacity-70 mt-0.5">{msg.time}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex gap-1">
                          <input 
                            type="text"
                            placeholder="Type a message..."
                            value={chatMessage}
                            onChange={e => setChatMessage(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSendRiderChat()}
                            className="flex-1 text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                          />
                          <button 
                            onClick={handleSendRiderChat}
                            className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer"
                          >
                            <Send className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center my-auto space-y-3">
                  <Database className="h-10 w-10 text-slate-300 mx-auto" />
                  <h4 className="text-xs font-black text-slate-700 uppercase">Select an order</h4>
                  <p className="text-[10px] text-slate-400 max-w-[180px] mx-auto">Select a delivery ticket from the list to manage dispatch status, pack items, or open rider-to-customer chat!</p>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Inventory Adjuster tab */
          <div className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center">
                <div>
                  <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-1.5">
                    🗄️ Instant Inventory controller
                  </h3>
                  <p className="text-[10.5px] text-slate-400 font-bold uppercase mt-0.5">Adjust, edit or add FarmersGate stock and pricing on the fly</p>
                </div>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => setIsAddingProduct(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-xl uppercase tracking-wider cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="h-3 w-3" /> Add Produce
                  </button>
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search fresh produce..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {loadingProducts ? (
                <div className="text-center py-12 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-5 w-5 text-emerald-600 animate-spin" />
                  <p className="text-xs font-bold text-slate-500">Retrieving catalog prices...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {filteredProducts.map((p) => {
                    const isLow = p.stock <= p.minStockThreshold;
                    return (
                      <div 
                        key={p.id}
                        className={`border rounded-2xl p-4 flex flex-col justify-between space-y-3 bg-white hover:border-emerald-500/30 transition-all ${
                          isLow ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-1.5">
                            <span className="text-2xl">{p.emoji || '🥦'}</span>
                            <div>
                              <h4 className="font-black text-slate-800 text-xs truncate max-w-[110px]" title={p.vegetableName}>
                                {p.vegetableName}
                              </h4>
                              <span className="inline-block text-[8px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded mt-0.5">
                                {p.category}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isLow && (
                              <span className="text-[8px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full uppercase flex items-center gap-0.5 animate-pulse">
                                <AlertCircle className="h-2 w-2" /> LOW
                              </span>
                            )}
                            <button
                              onClick={() => setEditingProduct(p)}
                              className="p-1 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                              title="Modify item & price details"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="border-t border-b border-slate-100 py-2 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">STOCK</span>
                            <span className="font-black text-slate-800 font-mono text-xs">{p.stock} {p.unit}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase block">PRICE</span>
                            <span className="font-black text-emerald-700 font-mono text-xs">₹{p.sellingPrice}/{p.unit}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Adjust Stock:</span>
                          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
                            <button
                              onClick={() => handleAdjustStock(p.id, p.stock, -5)}
                              className="h-5 w-5 bg-white border border-slate-200 hover:bg-red-50 text-slate-700 rounded flex items-center justify-center text-xs font-bold cursor-pointer"
                            >
                              -5
                            </button>
                            <button
                              onClick={() => handleAdjustStock(p.id, p.stock, 5)}
                              className="h-5 w-5 bg-white border border-slate-200 hover:bg-emerald-50 text-slate-700 rounded flex items-center justify-center text-xs font-bold cursor-pointer"
                            >
                              +5
                            </button>
                            <button
                              onClick={() => handleAdjustStock(p.id, p.stock, 25)}
                              className="h-5 w-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded flex items-center justify-center text-[10px] font-black cursor-pointer px-1"
                            >
                              +25
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modals for Add & Edit product details */}
            {isAddingProduct && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4 text-left">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-black text-slate-800 text-sm uppercase flex items-center gap-1.5">
                      <span>➕ Add Fresh Produce Item</span>
                    </h3>
                    <button 
                      onClick={() => setIsAddingProduct(false)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <form onSubmit={handleAddProduct} className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Product Name</label>
                      <input
                        type="text"
                        required
                        value={newProductForm.vegetableName}
                        onChange={e => setNewProductForm({...newProductForm, vegetableName: e.target.value})}
                        placeholder="e.g. Fresh Red Radish"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Category</label>
                        <select
                          value={newProductForm.category}
                          onChange={e => setNewProductForm({...newProductForm, category: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="Vegetable">Vegetable</option>
                          <option value="Fruit">Fruit</option>
                          <option value="Herbs">Herbs</option>
                          <option value="Grocery">Grocery</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Unit</label>
                        <input
                          type="text"
                          required
                          value={newProductForm.unit}
                          onChange={e => setNewProductForm({...newProductForm, unit: e.target.value})}
                          placeholder="e.g. kg, bunch, box"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Selling Price (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={newProductForm.sellingPrice}
                          onChange={e => setNewProductForm({...newProductForm, sellingPrice: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Cost Price (₹)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={newProductForm.costPrice}
                          onChange={e => setNewProductForm({...newProductForm, costPrice: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Initial Stock</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={newProductForm.stock}
                          onChange={e => setNewProductForm({...newProductForm, stock: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Min Stock Warning</label>
                        <input
                          type="number"
                          required
                          min="0"
                          value={newProductForm.minStockThreshold}
                          onChange={e => setNewProductForm({...newProductForm, minStockThreshold: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Emoji Icon</label>
                      <input
                        type="text"
                        required
                        value={newProductForm.emoji}
                        onChange={e => setNewProductForm({...newProductForm, emoji: e.target.value})}
                        placeholder="🥦"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-center text-lg"
                      />
                    </div>
                    <div className="pt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingProduct(false)}
                        className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase tracking-wider cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl uppercase tracking-wider cursor-pointer shadow-md"
                      >
                        Save Produce
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editingProduct && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                <div className="bg-white rounded-3xl border border-slate-200 p-6 max-w-md w-full shadow-xl space-y-4 text-left">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h3 className="font-black text-slate-800 text-sm uppercase">📝 Edit Produce Details</h3>
                    <button 
                      onClick={() => setEditingProduct(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Product Name</label>
                      <input
                        type="text"
                        value={editingProduct.vegetableName}
                        onChange={e => setEditingProduct({...editingProduct, vegetableName: e.target.value})}
                        placeholder="e.g. Fresh Red Radish"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Category</label>
                        <select
                          value={editingProduct.category}
                          onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="Vegetable">Vegetable</option>
                          <option value="Fruit">Fruit</option>
                          <option value="Herbs">Herbs</option>
                          <option value="Grocery">Grocery</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Unit</label>
                        <input
                          type="text"
                          value={editingProduct.unit}
                          onChange={e => setEditingProduct({...editingProduct, unit: e.target.value})}
                          placeholder="e.g. kg, bunch, box"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Selling Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={editingProduct.sellingPrice}
                          onChange={e => setEditingProduct({...editingProduct, sellingPrice: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Cost Price (₹)</label>
                        <input
                          type="number"
                          min="0"
                          value={editingProduct.costPrice}
                          onChange={e => setEditingProduct({...editingProduct, costPrice: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Stock</label>
                        <input
                          type="number"
                          min="0"
                          value={editingProduct.stock}
                          onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Min Stock Warning</label>
                        <input
                          type="number"
                          min="0"
                          value={editingProduct.minStockThreshold}
                          onChange={e => setEditingProduct({...editingProduct, minStockThreshold: Number(e.target.value)})}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block uppercase mb-1">Emoji Icon</label>
                      <input
                        type="text"
                        value={editingProduct.emoji}
                        onChange={e => setEditingProduct({...editingProduct, emoji: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-center text-lg"
                      />
                    </div>
                    <div className="pt-3 flex gap-2 justify-between">
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(editingProduct.id)}
                        className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black rounded-xl uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(null)}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl uppercase tracking-wider cursor-pointer transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateProduct(editingProduct.id, {
                            vegetableName: editingProduct.vegetableName,
                            category: editingProduct.category,
                            sellingPrice: editingProduct.sellingPrice,
                            costPrice: editingProduct.costPrice,
                            stock: editingProduct.stock,
                            unit: editingProduct.unit,
                            emoji: editingProduct.emoji,
                            minStockThreshold: editingProduct.minStockThreshold
                          })}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl uppercase tracking-wider cursor-pointer shadow-md transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
