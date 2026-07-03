import React, { useState, useRef, useEffect } from 'react';
import { Send, Phone, MessageSquare, CheckCheck, X } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'rider' | 'system';
  text: string;
  time: string;
}

interface RiderChatProps {
  onClose: () => void;
}

export default function RiderChat({ onClose }: RiderChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'system',
      text: 'Rohit Kumar (Rider) is carrying your freshly graded crops!',
      time: 'Just now'
    },
    {
      id: 'm2',
      sender: 'rider',
      text: 'Hello sir, I have picked up your order from the dark store. Speeding to your location now! Any special delivery instruction?',
      time: 'Just now'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgText = inputText.trim();
    const nowStr = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

    const newMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: userMsgText,
      time: nowStr
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    // Simulate Rider Response based on keywords
    setTimeout(() => {
      let responseText = '';
      const lowercase = userMsgText.toLowerCase();

      if (lowercase.includes('gate') || lowercase.includes('guard') || lowercase.includes('security')) {
        responseText = 'Got it, sir! I will hand it over to the security guard at the gate and text you the picture. Thank you! 👍';
      } else if (lowercase.includes('call') || lowercase.includes('phone') || lowercase.includes('ring')) {
        responseText = 'Sure thing, sir. I will call your mobile as soon as I cross the society entry barrier! 📞';
      } else if (lowercase.includes('fresh') || lowercase.includes('crisp') || lowercase.includes('quality')) {
        responseText = 'Yes, absolutely! The spinach and greens are very crisp, they were harvested just this morning. Zero chemical washes! 🥬✨';
      } else if (lowercase.includes('pay') || lowercase.includes('upi') || lowercase.includes('change') || lowercase.includes('cash')) {
        responseText = 'No problem sir, I can accept cash or UPI payment via GPay or PhonePe at the door! 💸';
      } else {
        responseText = 'Got it! I am just crossing the main sector roundabout. I will reach your door in about 3 minutes! 🏍️💨';
      }

      const riderMsg: ChatMessage = {
        id: `r-${Date.now()}`,
        sender: 'rider',
        text: responseText,
        time: nowStr
      };
      setMessages(prev => [...prev, riderMsg]);
    }, 1200);
  };

  const handleCallRider = () => {
    alert("🏍️ Simulating Call to Rohit Kumar (+91 98765-XXXXX):\n\n\"Ring... Ring... Hi sir! I am riding now, but I will be there in 3 minutes! Please wait.\"");
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[400px] max-w-sm w-full animate-scale-in">
      {/* Chat Header */}
      <div className="bg-slate-900 text-white px-4.5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-left">
          <div className="relative">
            <span className="text-2xl">🚴</span>
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border border-slate-900 animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs tracking-tight">Rohit Kumar</h4>
            <p className="text-[9.5px] text-slate-300">FarmersGate Courier Partner</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleCallRider}
            className="p-1.5 hover:bg-slate-800 text-emerald-400 rounded-lg transition-all cursor-pointer"
            title="Call Rider"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3">
        {messages.map((m) => {
          if (m.sender === 'system') {
            return (
              <div key={m.id} className="text-center py-1">
                <span className="inline-block bg-slate-200/80 text-slate-600 text-[8.5px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ⚠️ {m.text}
                </span>
              </div>
            );
          }

          const isUser = m.sender === 'user';
          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-3 text-xs text-left shadow-sm relative ${
                isUser 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 border border-slate-150 rounded-tl-none'
              }`}>
                <p className="font-semibold leading-relaxed break-words">{m.text}</p>
                <div className={`flex items-center justify-end gap-1 text-[8.5px] mt-1.5 ${
                  isUser ? 'text-emerald-100' : 'text-slate-400'
                }`}>
                  <span>{m.time}</span>
                  {isUser && <CheckCheck className="h-3 w-3 shrink-0" />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Message Input Footer */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-150 bg-white flex gap-2 shrink-0">
        <input
          type="text"
          placeholder="Ask Rohit: 'leave with guard' or 'call me'..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 w-9 flex items-center justify-center transition-all shadow-md shadow-emerald-100 shrink-0 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5 stroke-[2.5px]" />
        </button>
      </form>
    </div>
  );
}
