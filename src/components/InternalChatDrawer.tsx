import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  X, 
  Send, 
  Paperclip, 
  Download, 
  File, 
  Image, 
  FileText,
  User,
  Shield,
  Clock,
  CheckCircle2,
  Trash2,
  Lock
} from 'lucide-react';
import { 
  sendChatMessage, 
  subscribeToChatMessages, 
  ChatMessage 
} from '../lib/farmersGateDb';
import { auth } from '../lib/firebase';

interface InternalChatDrawerProps {
  currentStoreName?: string;
}

export default function InternalChatDrawer({ currentStoreName }: InternalChatDrawerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  
  // File upload states
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    data: string; // Base64
  } | null>(null);
  const [fileError, setFileError] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-detect or select identity
  useEffect(() => {
    if (currentStoreName) {
      setSenderName(currentStoreName);
    } else if (auth.currentUser?.email) {
      const email = auth.currentUser.email;
      if (email === 'admin@farmersgate.com') {
        setSenderName('Corporate Head Office');
      } else if (email === 'executive@farmersgate.com') {
        setSenderName('Arvind Kumar Shukla (Executive)');
      } else {
        setSenderName(email.split('@')[0].toUpperCase() + ' Team');
      }
    } else {
      // Default fallback
      const cached = localStorage.getItem('fg_chat_identity');
      setSenderName(cached || 'FarmersGate Partner');
    }
  }, [currentStoreName]);

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = subscribeToChatMessages((data) => {
      setMessages(data);
    });
    return () => unsubscribe();
  }, []);

  // Scroll to bottom on new message or when opened
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleIdentityChange = (name: string) => {
    setSenderName(name);
    localStorage.setItem('fg_chat_identity', name);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: keep under 800KB to stay safely below Firestore's 1MB document limit
    if (file.size > 800000) {
      setFileError('File exceeds 800KB limit for secure transmission.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachedFile({
          name: file.name,
          type: file.type,
          data: reader.result
        });
      }
    };
    reader.onerror = () => {
      setFileError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() && !attachedFile) return;

    const currentSenderId = auth.currentUser?.uid || 'guest-user';

    try {
      await sendChatMessage({
        senderId: currentSenderId,
        senderName: senderName || 'Ecosystem Partner',
        message: inputMsg.trim() || `Shared file: ${attachedFile?.name}`,
        timestamp: new Date().toISOString(),
        fileName: attachedFile?.name,
        fileType: attachedFile?.type,
        fileData: attachedFile?.data
      });

      // Clear input and attachments
      setInputMsg('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Error sending internal chat message:', err);
    }
  };

  const downloadSharedFile = (fileName: string, base64Data: string) => {
    const link = document.createElement('a');
    link.href = base64Data;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Predefined identities list for easy demo testing
  const identitiesList = [
    'Corporate Head Office',
    'Patiala Model Town Outlet',
    'Patiala Urban Estate Outlet',
    'Logistics & Courier Hub',
    'Arvind Kumar Shukla (CEO)'
  ];

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg hover:shadow-emerald-300 hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer border border-emerald-500/30 group"
        title="FarmersGate Internal Network Chat"
      >
        <MessageSquare className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
        <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-rose-500 border-2 border-white animate-pulse" />
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-3xs z-50 flex justify-end animate-fade-in">
          {/* Backdrop Click */}
          <div className="flex-grow h-full" onClick={() => setIsOpen(false)} />

          {/* Chat Container */}
          <div className="w-full max-w-md bg-slate-50 h-full flex flex-col shadow-2xl animate-slide-in relative border-l border-slate-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center font-bold text-base shadow-xs shadow-emerald-400">
                  💬
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400">FarmersGate Live</h3>
                  <p className="text-[9.5px] font-bold text-slate-400 tracking-wider uppercase">Internal Corporate Hub</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Identity Customizer Bar */}
            <div className="bg-slate-100 border-b border-slate-200 p-2.5 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-emerald-600" />
                Identity:
              </span>
              <select
                value={senderName}
                onChange={(e) => handleIdentityChange(e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 outline-none max-w-[200px]"
              >
                <option value={senderName}>{senderName}</option>
                {identitiesList.filter(id => id !== senderName).map((id, idx) => (
                  <option key={idx} value={id}>{id}</option>
                ))}
              </select>
            </div>

            {/* Chat Body */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin">
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 text-center text-[10.5px] text-emerald-800 flex items-center gap-2">
                <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <p className="font-semibold text-left leading-relaxed">
                  Secure encrypted network. Chat and file transfers are visible to all branch staff and executives.
                </p>
              </div>

              {messages.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                  <MessageSquare className="h-8 w-8 text-slate-300 animate-bounce" />
                  <p className="text-[11px] font-bold uppercase tracking-wider">No conversations yet</p>
                  <p className="text-[10px] text-slate-400">Send a greeting message to start corporate chat!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.senderName === senderName;
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      {/* Sender metadata */}
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide px-1">
                        {m.senderName}
                      </span>

                      {/* Msg bubble */}
                      <div className={`max-w-[85%] rounded-2xl p-3 shadow-3xs ${
                        isMe 
                          ? 'bg-emerald-600 text-white rounded-tr-none' 
                          : 'bg-white text-slate-800 border border-slate-200/60 rounded-tl-none'
                      }`}>
                        {/* Text message */}
                        <p className="text-xs leading-relaxed font-semibold whitespace-pre-wrap">{m.message}</p>

                        {/* File Attachment Card */}
                        {m.fileName && m.fileData && (
                          <div className={`mt-2 p-2 rounded-xl flex items-center gap-2 text-left border ${
                            isMe 
                              ? 'bg-emerald-700/50 border-emerald-500/20 text-emerald-50' 
                              : 'bg-slate-50 border-slate-200/60 text-slate-700'
                          }`}>
                            {m.fileType?.startsWith('image/') ? (
                              <Image className="h-5 w-5 shrink-0" />
                            ) : (
                              <FileText className="h-5 w-5 shrink-0" />
                            )}
                            <div className="flex-grow min-w-0">
                              <p className="text-[10px] font-black truncate max-w-[150px]">{m.fileName}</p>
                              <span className="text-[8px] opacity-70 uppercase tracking-wider font-bold">Document Share</span>
                            </div>
                            <button
                              onClick={() => downloadSharedFile(m.fileName!, m.fileData!)}
                              className="p-1.5 hover:bg-black/10 rounded-lg transition-all"
                              title="Download File"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Date details */}
                      <span className="text-[8px] text-slate-400 font-bold px-1 font-mono">
                        {new Date(m.timestamp).toLocaleTimeString('en-IN', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Footer Input & File Tray */}
            <div className="p-3 bg-white border-t border-slate-200 space-y-2">
              {/* File error or loading alerts */}
              {fileError && (
                <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-bold text-rose-700 flex items-center gap-1.5">
                  <X className="h-3 w-3 shrink-0 cursor-pointer" onClick={() => setFileError('')} />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Attached file preloader */}
              {attachedFile && (
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-700">
                    <File className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="truncate max-w-[180px]">{attachedFile.name}</span>
                  </div>
                  <button
                    onClick={() => {
                      setAttachedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1 hover:bg-slate-200 rounded-lg transition-all text-rose-500"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {/* Attachment Trigger Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 rounded-xl transition-all cursor-pointer shrink-0"
                  title="Share Document/Photo (under 800KB)"
                >
                  <Paperclip className="h-4.5 w-4.5" />
                </button>

                {/* Input Text Box */}
                <input
                  type="text"
                  placeholder="Type corporate message..."
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-emerald-500 outline-none transition-all"
                />

                {/* Submit Send Button */}
                <button
                  type="submit"
                  disabled={!inputMsg.trim() && !attachedFile}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white rounded-xl transition-all cursor-pointer shrink-0 shadow-xs shadow-emerald-200"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
