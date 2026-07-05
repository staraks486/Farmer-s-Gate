import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Hourglass, MessageSquare, ArrowRight, Star } from 'lucide-react';
import { CustomerOrder, CustomerOrderItem } from '../../types';
import { getVegEmoji } from './customerData';
import RiderChat from './RiderChat';

interface OrderTrackerProps {
  key?: string;
  order: CustomerOrder;
  onOrderCompleted: (orderId: string) => void;
  onUpdateOrder?: (updatedOrder: CustomerOrder) => Promise<void>;
  generateBillPDF: (orders: CustomerOrder[]) => void;
  handleShareWhatsAppForOrders: (orders: CustomerOrder[]) => void;
  canCancel: boolean;
}

export default function OrderTracker({
  order,
  onOrderCompleted,
  onUpdateOrder,
  generateBillPDF,
  handleShareWhatsAppForOrders,
  canCancel
}: OrderTrackerProps) {
  // Simulation states
  const [simActive, setSimActive] = useState(false);
  const [simProgress, setSimProgress] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState(540); // 9 minutes
  const [chatOpen, setChatOpen] = useState(false);

  // Map state to actual order status if not simulated
  const statusSteps = ['Pending', 'Processing', 'Ready', 'Completed'];
  const currentStepIdx = statusSteps.indexOf(order.status);

  // Start Simulation
  const handleStartSimulation = () => {
    if (order.status === 'Completed' || order.status === 'Cancelled') {
      alert("This order is already finalized!");
      return;
    }
    setSimActive(true);
    setSimProgress(0);
    setEtaSeconds(540);
  };

  // Run countdown and progress bar simulation
  useEffect(() => {
    let interval: any = null;
    if (simActive) {
      interval = setInterval(() => {
        setSimProgress(prev => {
          const next = prev + 10;
          if (next >= 100) {
            clearInterval(interval);
            setSimActive(false);
            handleFinalizeOrder();
            return 100;
          }
          return next;
        });
        setEtaSeconds(prev => Math.max(0, prev - 45)); // Count down faster!
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [simActive]);

  const handleFinalizeOrder = async () => {
    // Set order to completed
    onOrderCompleted(order.id);
    
    // Call parent update if provided to sync head office database!
    if (onUpdateOrder) {
      const updated: CustomerOrder = {
        ...order,
        status: 'Completed',
        paymentStatus: 'Paid'
      };
      try {
        await onUpdateOrder(updated);
      } catch (e) {
        console.error("Error updating order status in App DB", e);
      }
    }
    alert("🎉 Simulation Completed!\n\nYour fresh crops have arrived at your doorstep! Rohit Kumar has delivered the order. You can now leave a community review!");
  };

  const getSimulatedStatus = () => {
    if (order.status === 'Cancelled') return 'Cancelled';
    if (!simActive) {
      if (order.status === 'Completed') return 'Delivered! 🎉';
      if (order.status === 'Ready') return 'Dispatched 🏍️';
      if (order.status === 'Processing') return 'Grading Sourced Crops 🥬';
      return 'Waiting in Queue ⏳';
    }
    if (simProgress < 20) return 'Order Confirmed (Harvest notified) 📝';
    if (simProgress < 50) return 'Sourced Fresh Crops Graded & Packed 🎒';
    if (simProgress < 85) return 'Out for Delivery (Rider Rohit: 🚴) 🏍️';
    return 'Arrived & Handed Over 🏁';
  };

  const formatEta = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5 transition-all text-left">
      {/* Order Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-150 pb-3">
        <div>
          <span className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg">
            {order.orderNumber}
          </span>
          <span className="text-[10px] text-slate-400 block mt-2 font-semibold uppercase tracking-wide">
            Placed: {new Date(order.orderDate).toLocaleDateString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        </div>

        <div className="text-left sm:text-right">
          <span className="text-[9px] text-slate-400 block uppercase tracking-wider font-extrabold">Instant Total Paid</span>
          <span className="text-base font-black text-slate-900 font-mono">₹{order.totalAmount.toFixed(2)}</span>
          <span className="text-[9px] text-emerald-600 font-bold block">10% CASHBACK AWARDED</span>
        </div>
      </div>

      {/* Speedometer Banner */}
      <div className="bg-slate-950 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3 w-full sm:w-auto text-left">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0">
            ⚡
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Estimated Dispatch ETA</h4>
            <p className="text-base font-black text-white font-mono mt-0.5">
              {order.status === 'Completed' || (simProgress === 100 && !simActive) ? (
                <span className="text-emerald-400 flex items-center gap-1">✅ DELIVERED (EXPRESS)</span>
              ) : simActive ? (
                <span className="text-yellow-400 animate-pulse">{formatEta(etaSeconds)} remaining</span>
              ) : (
                <span>Express Speed Delivery</span>
              )}
            </p>
          </div>
        </div>

        {order.status !== 'Completed' && order.status !== 'Cancelled' && !simActive && (
          <button
            onClick={handleStartSimulation}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-black px-4 py-2 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-950/20"
          >
            🚀 Simulate Express Delivery
          </button>
        )}
      </div>

      {/* Progress pipeline visual bars */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400">
          <span>Courier Milestone Stages</span>
          <span className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[9px]">
            STATUS: {getSimulatedStatus()}
          </span>
        </div>

        {/* Dynamic Progress Meter */}
        <div className="relative">
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-600 rounded-full transition-all duration-700 shadow-sm"
              style={{ width: `${simActive ? simProgress : (currentStepIdx + 1) * 25}%` }}
            />
          </div>

          {/* Dash points representing map nodes */}
          <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 pt-1.5">
            <span className={simProgress >= 15 || currentStepIdx >= 0 ? 'text-emerald-600 font-extrabold' : ''}>Placed</span>
            <span className={simProgress >= 45 || currentStepIdx >= 1 ? 'text-emerald-600 font-extrabold' : ''}>Graded</span>
            <span className={simProgress >= 75 || currentStepIdx >= 2 ? 'text-emerald-600 font-extrabold' : ''}>Dispatched</span>
            <span className={simProgress === 100 || currentStepIdx === 3 ? 'text-emerald-600 font-extrabold' : ''}>Delivered</span>
          </div>
        </div>
      </div>

      {/* SVG Map Route Simulator */}
      {simActive && (
        <div className="bg-slate-950 rounded-2xl p-4 border border-slate-850 space-y-2 relative overflow-hidden h-32 flex flex-col justify-end">
          <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 to-transparent pointer-events-none" />
          
          <span className="absolute top-3 left-3 text-[9px] font-black text-slate-400 uppercase tracking-widest block">
            Real-time Courier Vector Route Map
          </span>

          {/* Simple Vector Route Drawing */}
          <svg className="w-full h-16 pointer-events-none stroke-slate-800" fill="none">
            {/* Dashed Road Path */}
            <path 
              d="M 20,40 Q 120,5 M 120,5 L 260,50 L 380,20" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeDasharray="6 4"
            />
            
            {/* Completed Path Highlight */}
            <path 
              d="M 20,40 Q 120,5 M 120,5 L 260,50 L 380,20" 
              strokeWidth="4" 
              className="stroke-emerald-500 transition-all duration-700" 
              strokeLinecap="round" 
              strokeDasharray="6 4"
              strokeDashoffset={400 - (simProgress * 4)}
            />

            {/* Icons */}
            <text x="10" y="44" fontSize="16">🏪</text> {/* Store */}
            <text x="365" y="24" fontSize="16">🏡</text> {/* House */}

            {/* Delivery Bike Icon moving along */}
            {simProgress < 100 && (
              <g 
                className="transition-all duration-700"
                style={{ 
                  transform: `translate(${15 + (simProgress * 3.4)}px, ${30 - (Math.sin((simProgress / 100) * Math.PI) * 20)}px)` 
                }}
              >
                <text x="0" y="0" fontSize="18" className="animate-bounce">🏍️</text>
              </g>
            )}
          </svg>
        </div>
      )}

      {/* Vegetable list summary */}
      <div className="bg-slate-50 p-4 rounded-2xl space-y-2 border border-slate-100 text-xs text-slate-700">
        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-150">
          Farmed Items Packaged ({order.items.length} items)
        </span>
        {order.items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-slate-700 font-medium">
            <span className="font-bold flex items-center gap-1.5">
              <span className="text-sm">{getVegEmoji(item.vegetableName)}</span>
              {item.vegetableName}
            </span>
            <span className="font-mono text-slate-500 font-semibold">{item.quantity} kg @ ₹{item.pricePerKg}/kg</span>
          </div>
        ))}
        
        {order.notes && (
          <div className="border-t border-slate-150 pt-2 mt-2 text-[10.5px] text-slate-400 italic">
            "Delivery Note/Address: {order.notes}"
          </div>
        )}
      </div>

      {/* Actions and chat button */}
      <div className="pt-3 border-t border-slate-150 flex flex-wrap gap-2.5 justify-between items-center">
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => generateBillPDF([order])}
            className="flex-1 sm:flex-none bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider"
          >
            📄 PDF Invoice
          </button>
          
          <button
            type="button"
            onClick={() => handleShareWhatsAppForOrders([order])}
            className="flex-1 sm:flex-none bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#128C7E] border border-[#25D366]/30 px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all uppercase tracking-wider"
          >
            📲 WhatsApp
          </button>

          {/* Courier chat simulator unlock */}
          {(simProgress >= 40 && simProgress < 100) && (
            <button
              onClick={() => setChatOpen(true)}
              className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer animate-pulse shadow-md shadow-emerald-200"
            >
              <MessageSquare className="h-4.5 w-4.5" /> Chat with Rohit
            </button>
          )}
        </div>

        {canCancel && (order.status === 'Pending' || order.status === 'Processing') && !simActive && onUpdateOrder && (
          <button
            type="button"
            onClick={async () => {
              const cancelReasonPrompt = prompt('Please enter a cancellation reason / message (optional):');
              if (cancelReasonPrompt === null) return; // User clicked Cancel
              
              const reasonStr = cancelReasonPrompt.trim() 
                ? `Cancelled by Customer: "${cancelReasonPrompt.trim()}"` 
                : 'Cancelled by Customer';
                
              const cancelledOrder: CustomerOrder = {
                ...order,
                status: 'Cancelled',
                notes: order.notes ? `${reasonStr} | ${order.notes}` : reasonStr
              };
              
              try {
                await onUpdateOrder(cancelledOrder);
                alert('Your order has been successfully cancelled.');
              } catch (err) {
                console.error(err);
                alert('Failed to cancel order. Please try again.');
              }
            }}
            className="w-full sm:w-auto bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer transition-all text-center"
          >
            🚫 Cancel Order
          </button>
        )}
      </div>

      {/* Chat popup container */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 z-[120]">
          <RiderChat onClose={() => setChatOpen(false)} />
        </div>
      )}
    </div>
  );
}
