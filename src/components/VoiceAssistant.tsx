import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, MicOff, Loader2, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VoiceAssistantProps {
  onCommand: (command: string) => void;
  isHiddenMobile?: boolean;
  hideFloatingButton?: boolean;
}

export function VoiceAssistant({ onCommand, isHiddenMobile, hideFloatingButton }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setError(null);
          setTranscript('');
        };

        recognitionRef.current.onresult = (event: any) => {
          const current = event.resultIndex;
          const result = event.results[current];
          const transcriptValue = result[0].transcript;
          setTranscript(transcriptValue);

          if (result.isFinal) {
            onCommand(transcriptValue.toLowerCase());
            setTimeout(() => {
              setIsListening(false);
              setTranscript('');
            }, 1500); // Give user a moment to see the final transcript
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError('Microphone access denied');
          } else {
            setError(event.error);
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setError('Speech recognition not supported in this browser');
      }
    }
  }, [onCommand]);

  const toggleListen = useCallback(() => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Error starting speech recognition", e);
      }
    }
  }, [isListening]);

  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScrollCapture = (e: any) => {
      const target = e.target;
      if (!target || typeof target.scrollTop !== 'number') return;
      const currentScrollTop = target.scrollTop;
      
      if (currentScrollTop > lastScrollYRef.current && currentScrollTop > 45) {
        setIsVisible(false);
      } else if (currentScrollTop < lastScrollYRef.current) {
        setIsVisible(true);
      }
      lastScrollYRef.current = currentScrollTop;
    };

    window.addEventListener('scroll', handleScrollCapture, true);
    return () => {
      window.removeEventListener('scroll', handleScrollCapture, true);
    };
  }, []);

  useEffect(() => {
    const handleTrigger = () => {
      toggleListen();
    };
    window.addEventListener('trigger-voice-assistant', handleTrigger);
    return () => {
      window.removeEventListener('trigger-voice-assistant', handleTrigger);
    };
  }, [toggleListen]);

  if (!recognitionRef.current && !error) return null;

  return (
    <div className={`fixed z-50 flex flex-col items-end gap-3 pointer-events-none transition-all duration-300 ${
      hideFloatingButton 
        ? 'bottom-24 right-6 md:bottom-24 md:right-6' 
        : 'bottom-20 right-6 md:bottom-6 md:right-24 md:left-auto'
    } ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-90'} ${isHiddenMobile ? 'hidden md:flex' : 'flex'}`}>
      <AnimatePresence>
        {(showTooltip || isListening || transcript || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="bg-zinc-900 text-white p-4 rounded-2xl shadow-xl border border-zinc-700/50 max-w-sm w-72 relative pointer-events-auto"
          >
            {error ? (
              <div className="text-red-400 text-sm flex flex-col gap-1">
                <span className="font-bold">Error</span>
                {error}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                  {isListening ? (
                    <>
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                      Listening...
                    </>
                  ) : (
                    'Voice Assistant'
                  )}
                </div>
                <div className="text-sm font-medium leading-snug">
                  {transcript || "Try saying 'Go to admin', 'Dark mode', or 'Open partner portal'..."}
                </div>
              </div>
            )}
            
            {(!isListening && !transcript && !error) && (
              <button 
                onClick={() => setShowTooltip(false)}
                className="absolute top-2 right-2 text-zinc-400 hover:text-white transition cursor-pointer p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {!hideFloatingButton && (
        <button
          onClick={toggleListen}
          onMouseEnter={() => !isListening && !transcript && !error && setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-all transform hover:scale-105 active:scale-95 cursor-pointer pointer-events-auto ${
            isListening 
              ? 'bg-red-500 text-white shadow-red-500/30' 
              : 'bg-emerald-600 text-white shadow-emerald-600/30 hover:bg-emerald-700'
          }`}
        >
          {isListening ? <Loader2 className="h-6 w-6 animate-spin" /> : <Mic className="h-6 w-6" />}
        </button>
      )}
    </div>
  );
}
