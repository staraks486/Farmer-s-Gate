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
  Users,
  Shield,
  Clock,
  CheckCircle2,
  Trash2,
  Lock,
  Video,
  Phone,
  Smile,
  MoreVertical
} from 'lucide-react';
import { 
  sendChatMessage, 
  subscribeToChatMessages, 
  ChatMessage 
} from '../lib/farmersGateDb';
import { auth } from '../lib/firebase';
import { useData } from '../contexts/DataContext';

interface InternalChatDrawerProps {
  currentStoreName?: string;
  isHiddenMobile?: boolean;
  hideFloatingButton?: boolean;
}

export default function InternalChatDrawer({ currentStoreName, isHiddenMobile, hideFloatingButton }: InternalChatDrawerProps) {
  const { stores } = useData();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleTrigger = () => {
      setIsOpen(true);
    };
    window.addEventListener('trigger-internal-chat', handleTrigger);
    return () => {
      window.removeEventListener('trigger-internal-chat', handleTrigger);
    };
  }, []);

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

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [activeContact, setActiveContact] = useState<string | null>(null);
  
  // File upload states
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: string;
    data: string; // Base64
  } | null>(null);
  const [fileError, setFileError] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Get active sender ID from Firebase or Mock sandbox
  const getSenderId = () => {
    if (auth.currentUser?.uid) return auth.currentUser.uid;
    try {
      const storedMock = localStorage.getItem('fg_mock_user');
      if (storedMock) {
        const parsed = JSON.parse(storedMock);
        if (parsed?.uid) return parsed.uid;
      }
    } catch (e) {}
    return 'guest-user';
  };

  // Auto-detect or select identity dynamically
  const detectIdentity = () => {
    const selectedStoreName = localStorage.getItem('fg_selected_store_name');
    if (selectedStoreName) {
      setSenderName(selectedStoreName.replace("Farmer's Gate - ", ""));
      return;
    }

    if (currentStoreName) {
      setSenderName(currentStoreName.replace("Farmer's Gate - ", ""));
      return;
    }

    // Retrieve both Firebase user and Mock sandbox user
    let email = auth.currentUser?.email;
    if (!email) {
      try {
        const storedMock = localStorage.getItem('fg_mock_user');
        if (storedMock) {
          const parsed = JSON.parse(storedMock);
          email = parsed?.email;
        }
      } catch (e) {}
    }

    if (email) {
      const cleanEmail = email.toLowerCase();
      if (cleanEmail === 'admin@farmersgate.com' || cleanEmail === 'star.aks486@gmail.com') {
        setSenderName('Corporate Head Office');
      } else if (cleanEmail === 'executive@farmersgate.com') {
        setSenderName('Arvind Kumar Shukla (Executive)');
      } else if (cleanEmail === 'store_pos@farmersgate.com') {
        setSenderName('Patiala Model Town Outlet');
      } else if (cleanEmail === 'partner@farmersgate.com') {
        setSenderName('FarmersGate Partner');
      } else {
        setSenderName(cleanEmail.split('@')[0].toUpperCase() + ' Team');
      }
    } else {
      // Default fallback
      const cached = localStorage.getItem('fg_chat_identity');
      setSenderName(cached || 'FarmersGate Partner');
    }
  };

  useEffect(() => {
    detectIdentity();

    // Listen for custom event or storage events to keep identity up to date
    const handleStoreChange = () => {
      detectIdentity();
    };

    window.addEventListener('fg_selected_store_changed', handleStoreChange);
    window.addEventListener('storage', handleStoreChange);
    return () => {
      window.removeEventListener('fg_selected_store_changed', handleStoreChange);
      window.removeEventListener('storage', handleStoreChange);
    };
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

  const getChatId = (userA: string, userB: string) => {
    return [userA, userB].sort().join('_');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim() && !attachedFile) return;

    const currentSenderId = getSenderId();
    const isGroup = activeContact?.endsWith('(Group)');

    try {
      await sendChatMessage({
        senderId: currentSenderId,
        senderName: senderName || 'Ecosystem Partner',
        receiverName: isGroup ? undefined : activeContact!,
        chatId: isGroup ? activeContact! : getChatId(senderName, activeContact!),
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

  const currentChatMessages = messages.filter(m => {
    if (activeContact?.endsWith('(Group)')) {
      return m.chatId === activeContact || (!m.chatId && activeContact === 'Corporate Hub (Group)' && !m.receiverName);
    }
    return m.chatId === getChatId(senderName, activeContact!);
  });

  const formatMessageTime = (ts: any) => {
    if (!ts) return '';
    try {
      if (ts && typeof ts === 'object' && 'seconds' in ts) {
        return new Date(ts.seconds * 1000).toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      return new Date(ts).toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return '';
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

  // Dynamic identities list from active stores
  const identitiesList = Array.from(new Set([
    'Corporate Head Office',
    ...stores.filter(s => s.isActive).map(s => s.name.replace("Farmer's Gate - ", ""))
  ]));

  return (
    <>
      {/* Floating Action Button */}
      {!hideFloatingButton && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-20 right-6 md:bottom-6 md:right-6 h-14 w-14 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white flex items-center justify-center shadow-lg hover:shadow-[#25D366]/50 hover:scale-105 active:scale-95 transition-all z-40 cursor-pointer border border-white/20 group duration-300 ${isVisible && !isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-90 pointer-events-none'} ${isHiddenMobile ? 'hidden md:flex' : 'flex'}`}
          title="FarmersGate Internal Network Chat"
        >
          <MessageSquare className="h-7 w-7 fill-current transition-transform duration-300 group-hover:rotate-12" />
          <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-rose-500 border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat Widget Container */}
      {isOpen && (
        <div className="fixed inset-0 md:inset-auto md:bottom-24 md:right-6 z-50 flex justify-end md:justify-center md:items-end animate-fade-in pointer-events-none">
          {/* Backdrop Click (mobile only) */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm md:hidden pointer-events-auto" onClick={() => setIsOpen(false)} />

          {/* Chat Box */}
          <div className="w-full md:w-[400px] h-full md:h-[650px] md:max-h-[calc(100vh-120px)] bg-[#efeae2] flex flex-col shadow-2xl animate-slide-in relative md:rounded-2xl border-l md:border border-slate-200 pointer-events-auto overflow-hidden">
            {/* Header */}
            <div className="bg-[#075E54] text-white p-3 flex items-center justify-between shadow-sm z-10 relative">
              <div className="flex items-center gap-2">
                {activeContact ? (
                  <button 
                    onClick={() => setActiveContact(null)}
                    className="p-1 hover:bg-white/10 rounded-full -ml-1 text-white cursor-pointer flex items-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center shrink-0 ml-1 overflow-hidden">
                       <User className="h-5 w-5 text-white/80" />
                    </div>
                  </button>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    💬
                  </div>
                )}
                <div className="flex flex-col cursor-pointer pl-1">
                  <h3 className="text-[16px] font-medium leading-tight">
                    {activeContact ? activeContact : 'FarmersGate Live'}
                  </h3>
                  <p className="text-[12px] font-normal text-white/80 mt-0.5">
                    {activeContact?.endsWith('(Group)') ? 'Internal Group' : (activeContact ? 'online' : 'Select a Chat')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                {activeContact ? (
                  <>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-all text-white cursor-pointer" title="Video call (Mock)">
                      <Video className="h-5 w-5" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-all text-white cursor-pointer" title="Voice call (Mock)">
                      <Phone className="h-[18px] w-[18px]" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-all text-white cursor-pointer">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer text-white/90 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
                {/* Always show close on mobile if in chat */}
                {activeContact && (
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-all cursor-pointer text-white/90 hover:text-white md:hidden"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Identity Customizer Bar (Only shown in Chat List) */}
            {!activeContact && (
              <div className="bg-slate-100 border-b border-slate-200 p-2.5 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-emerald-600" />
                  Your Identity:
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
            )}

            {/* View Switching */}
            {!activeContact ? (
              <div className="flex-grow overflow-y-auto p-2 bg-slate-50">
                <div className="space-y-1">
                  {/* Group Chats */}
                  {[
                    { id: 'Corporate Hub (Group)', label: 'Corporate Hub', desc: 'Broadcast to all network partners', bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', hoverText: 'group-hover:text-indigo-700' },
                    { id: 'Supply Chain (Group)', label: 'Supply Chain', desc: 'Warehouse & Logistics updates', bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200', hoverText: 'group-hover:text-amber-700' },
                    { id: 'Store POS (Group)', label: 'Store POS', desc: 'Retail POS operators & managers', bg: 'bg-sky-100', text: 'text-sky-600', border: 'border-sky-200', hoverText: 'group-hover:text-sky-700' },
                    { id: 'Transport Fleet (Group)', label: 'Transport Fleet', desc: 'Drivers, routing & vehicle alerts', bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', hoverText: 'group-hover:text-teal-700' }
                  ].map((group) => {
                    const unreadCount = messages.filter(m => {
                      if (m.senderName === senderName || (m as any).read) return false;
                      if (group.id === 'Corporate Hub (Group)') {
                        return m.chatId === group.id || (!m.chatId && !m.receiverName);
                      }
                      return m.chatId === group.id;
                    }).length;

                    return (
                      <button 
                        key={group.id}
                        onClick={() => setActiveContact(group.id)}
                        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-white rounded-xl transition-all cursor-pointer group hover:shadow-xs border border-transparent hover:border-slate-200"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`h-10 w-10 rounded-full ${group.bg} ${group.text} flex items-center justify-center shrink-0 border ${group.border}`}>
                            <Users className="h-5 w-5" />
                          </div>
                          <div className="text-left flex-grow">
                            <p className={`text-xs font-bold text-slate-800 ${group.hoverText}`}>{group.label}</p>
                            <p className="text-[10px] text-slate-500 truncate">{group.desc}</p>
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <div className="h-5 min-w-[20px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {unreadCount}
                          </div>
                        )}
                      </button>
                    );
                  })}

                  <div className="h-px bg-slate-200 w-full my-2" />
                  <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Direct Messages</p>
                  
                  {/* 1-on-1 Chats */}
                  {identitiesList.filter(id => id !== senderName).map((contactName, idx) => {
                    const chatId = getChatId(senderName, contactName);
                    const unreadCount = messages.filter(m => m.chatId === chatId && m.senderName !== senderName && !(m as any).read).length; // Simulated
                    return (
                      <button 
                        key={idx}
                        onClick={() => setActiveContact(contactName)}
                        className="w-full flex items-center justify-between gap-3 p-3 hover:bg-white rounded-xl transition-all cursor-pointer group hover:shadow-xs border border-transparent hover:border-slate-200"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-10 w-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 border border-slate-300">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="text-left flex-grow min-w-0">
                            <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 truncate">{contactName}</p>
                            <p className="text-[10px] text-slate-500 truncate">Tap to open secure chat</p>
                          </div>
                        </div>
                        {unreadCount > 0 && (
                          <div className="h-5 min-w-[20px] px-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {unreadCount}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <>
                {/* Chat Body */}
                <div className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin bg-[#e5ddd5]">
                  <div className="bg-amber-100 border border-amber-200 rounded-lg p-2 max-w-xs mx-auto text-center text-[10px] text-amber-800 flex items-center gap-1.5 justify-center">
                    <Lock className="h-3 w-3 text-amber-600 shrink-0" />
                    <p className="font-medium">
                      Messages are securely transmitted via FarmersGate network.
                    </p>
                  </div>

                  {currentChatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 space-y-2 pb-10">
                      <MessageSquare className="h-10 w-10 text-slate-500" />
                      <p className="text-xs font-semibold text-slate-600">Start a conversation</p>
                    </div>
                  ) : (
                    currentChatMessages.map((m) => {
                      const currentSenderId = getSenderId();
                      const isMe = m.senderId === currentSenderId || m.senderName === senderName;
                      return (
                        <div
                           key={m.id}
                           className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5`}
                        >
                          {/* Sender metadata (only for group chats if it's someone else) */}
                          {activeContact?.endsWith('(Group)') && !isMe && (
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide px-1">
                              {m.senderName}
                            </span>
                          )}

                          {/* Msg bubble */}
                          <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 shadow-sm relative ${
                            isMe 
                              ? 'bg-[#dcf8c6] text-slate-800 rounded-tr-none' 
                              : 'bg-white text-slate-800 rounded-tl-none'
                          }`}>
                            {/* Text message */}
                            <p className="text-sm font-medium whitespace-pre-wrap pr-10">{m.message}</p>

                            {/* File Attachment Card */}
                            {m.fileName && m.fileData && (
                              <div className={`mt-1.5 mb-2 p-2 rounded-lg flex items-center gap-2 text-left border ${
                                isMe 
                                  ? 'bg-emerald-100/50 border-emerald-300' 
                                  : 'bg-slate-50 border-slate-200'
                              }`}>
                                {m.fileType?.startsWith('image/') ? (
                                  <Image className="h-5 w-5 shrink-0" />
                                ) : (
                                  <FileText className="h-5 w-5 shrink-0" />
                                )}
                                <div className="flex-grow min-w-0">
                                  <p className="text-[10px] font-black truncate max-w-[150px]">{m.fileName}</p>
                                </div>
                                <button
                                  onClick={() => downloadSharedFile(m.fileName!, m.fileData!)}
                                  className="p-1.5 hover:bg-black/10 rounded-lg transition-all cursor-pointer"
                                  title="Download File"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}

                            {/* Timestamp corner */}
                            <div className="absolute bottom-1 right-1.5 flex items-center gap-0.5">
                              <span className="text-[9px] text-slate-500 font-medium">
                                {formatMessageTime(m.timestamp)}
                              </span>
                              {isMe && <CheckCircle2 className="h-2.5 w-2.5 text-blue-500" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Footer Input & File Tray */}
                <div className="p-2 bg-[#f0f2f5] space-y-2">
                  {/* File error or loading alerts */}
                  {fileError && (
                    <div className="p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-bold text-rose-700 flex items-center gap-1.5">
                      <X className="h-3 w-3 shrink-0 cursor-pointer" onClick={() => setFileError('')} />
                      <span>{fileError}</span>
                    </div>
                  )}

                  {/* Attached file preloader */}
                  {attachedFile && (
                    <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between mx-2">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-700">
                        <File className="h-3.5 w-3.5 text-emerald-600" />
                        <span className="truncate max-w-[180px]">{attachedFile.name}</span>
                      </div>
                      <button
                        onClick={() => {
                          setAttachedFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1 hover:bg-slate-200 rounded-lg transition-all text-rose-500 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSendMessage} className="flex items-center gap-1">
                    {/* Hidden File Input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {/* Emoji Button (Mock) */}
                    <button
                      type="button"
                      onClick={() => setInputMsg(prev => prev + '😀')}
                      className="p-2 text-slate-500 hover:text-slate-700 transition-all cursor-pointer shrink-0"
                      title="Emoji"
                    >
                      <Smile className="h-6 w-6" />
                    </button>

                    {/* Attachment Trigger Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-slate-500 hover:text-slate-700 transition-all cursor-pointer shrink-0"
                      title="Share Document/Photo (under 800KB)"
                    >
                      <Paperclip className="h-[22px] w-[22px]" />
                    </button>

                    {/* Input Text Box */}
                    <div className="flex-grow relative">
                      <input
                        type="text"
                        placeholder="Type a message"
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white rounded-xl text-sm font-medium focus:outline-none transition-all shadow-sm"
                      />
                    </div>

                    {/* Submit Send Button */}
                    <button
                      type="submit"
                      disabled={!inputMsg.trim() && !attachedFile}
                      className="p-3 bg-[#00a884] hover:bg-[#018a6e] disabled:opacity-40 disabled:hover:bg-[#00a884] text-white rounded-full transition-all cursor-pointer shrink-0 shadow-sm ml-1 flex items-center justify-center"
                    >
                      <Send className="h-[18px] w-[18px] ml-0.5" />
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
