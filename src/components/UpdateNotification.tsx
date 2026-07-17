import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles } from 'lucide-react';

interface UpdateNotificationProps {
  isVisible: boolean;
  onUpdate: () => void;
  onClose: () => void;
  version: string;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({ isVisible, onUpdate, version }) => {
  
  // Auto-update after 3 seconds of showing the notification
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onUpdate();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onUpdate]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full"
        >
          <div className="bg-emerald-900 border border-emerald-400/30 rounded-2xl shadow-2xl overflow-hidden shadow-emerald-500/10">
            {/* Ambient background effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent pointer-events-none" />
            
            <div className="p-5 relative flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin-fast" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-bold text-sm tracking-tight">Mandatory Update</h3>
                  <div className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-widest">
                    {version}
                  </div>
                </div>
                <p className="text-emerald-200/70 text-xs leading-relaxed mb-4">
                  A critical update is being applied. The application will reload automatically...
                </p>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={onUpdate}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold text-xs py-2 px-4 rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-wait opacity-80"
                  >
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Updating...
                  </button>
                </div>
              </div>
            </div>
            
            {/* Progress bar visualizer for style */}
            <div className="h-1 bg-emerald-500/20 w-full overflow-hidden">
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
