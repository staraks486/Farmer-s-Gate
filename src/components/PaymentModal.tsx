import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CreditCard, Lock, Sparkles, CheckCircle2, ArrowRight, RefreshCw, Award, Landmark, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateLicenseKey, getSavedLicense, LicenseInfo } from '../lib/license';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (newKey: string, licensee: string, plan: 'Standard' | 'Premium' | 'Enterprise') => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onPaymentSuccess }) => {
  const [step, setStep] = useState<'plan' | 'pay' | 'processing' | 'success'>('plan');
  const [selectedPlan, setSelectedPlan] = useState<'Standard' | 'Premium' | 'Enterprise'>('Premium');
  const [duration, setDuration] = useState<'1year' | '3years' | 'lifetime'>('1year');
  const [licensee, setLicensee] = useState('');
  
  // Credit Card Form States
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [paymentError, setPaymentError] = useState('');

  // Generated results
  const [newKey, setNewKey] = useState('');
  const [expiresDateString, setExpiresDateString] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('plan');
      const active = getSavedLicense();
      setLicensee(active && active.licensee !== 'Unregistered Store' ? active.licensee : '');
      setSelectedPlan(active && active.status === 'active' ? active.plan : 'Premium');
      setCardName('');
      setCardNumber('');
      setCardExpiry('');
      setCardCvc('');
      setPaymentError('');
      setNewKey('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Plan Prices
  const prices = {
    Standard: { '1year': 240, '3years': 580, lifetime: 999 },
    Premium: { '1year': 480, '3years': 1150, lifetime: 1899 },
    Enterprise: { '1year': 960, '3years': 2300, lifetime: 3499 }
  };

  const getPrice = () => {
    return prices[selectedPlan][duration];
  };

  const handleNextToPay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensee.trim()) {
      setPaymentError('Please enter a valid Licensee or Store Name.');
      return;
    }
    setPaymentError('');
    setStep('pay');
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length > 0) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPaymentError('');

    // Basic Validation
    if (cardNumber.replace(/\s/g, '').length < 16) {
      setPaymentError('Invalid Card Number format.');
      return;
    }
    if (cardExpiry.length < 5) {
      setPaymentError('Invalid Expiration Date.');
      return;
    }
    if (cardCvc.length < 3) {
      setPaymentError('Invalid Security Code (CVC).');
      return;
    }

    setStep('processing');

    // Simulate secure network transaction delay
    await new Promise((resolve) => setTimeout(resolve, 1800));

    // Calculate Expiry Date
    let expiryDateValue = 'Lifetime';
    if (duration !== 'lifetime') {
      const yearsToAdd = duration === '1year' ? 1 : 3;
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + yearsToAdd);
      expiryDateValue = futureDate.toISOString().substring(0, 10);
    }
    setExpiresDateString(expiryDateValue);

    // Cryptographically generate the actual license key
    const generated = generateLicenseKey(licensee, selectedPlan, expiryDateValue);
    setNewKey(generated);
    setStep('success');
  };

  const handleApplyLicense = () => {
    const updatedLicense: LicenseInfo = {
      key: newKey,
      licensee: licensee.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 10) || 'CLIENT',
      plan: selectedPlan,
      expires: expiresDateString,
      activatedAt: new Date().toISOString().substring(0, 10),
      status: 'active'
    };

    localStorage.setItem('fg_license_info', JSON.stringify(updatedLicense));
    
    // Propagate the license info to Firestore to automatically sync with other devices in real-time!
    try {
      const rawSettings = localStorage.getItem('farmersgate_cpanel_settings') || '{}';
      const parsedSettings = JSON.parse(rawSettings);
      parsedSettings.licenseInfo = updatedLicense;
      localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(parsedSettings));
      import('../lib/firebase').then(({ updateSettings }) => {
        updateSettings(parsedSettings).catch(console.error);
      });
    } catch (e) {
      console.error("Failed to propagate license key to cloud sync:", e);
    }

    window.dispatchEvent(new Event('license-status-updated'));
    if (onPaymentSuccess) {
      onPaymentSuccess(newKey, licensee, selectedPlan);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl shadow-sm">
                <ShieldCheck className="h-5.5 w-5.5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-800 tracking-tight">Secure License Renewal Portal</h2>
                <p className="text-xs text-slate-500 font-medium">SSL Encrypted SaaS Payment Gateway</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Steps Indicator */}
          {step !== 'processing' && step !== 'success' && (
            <div className="flex px-6 py-3 border-b border-slate-100 bg-white justify-between items-center text-xs">
              <div className="flex items-center gap-1.5 font-bold">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'plan' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>1</span>
                <span className={step === 'plan' ? 'text-emerald-700' : 'text-slate-500'}>Select Plan</span>
              </div>
              <div className="h-px bg-slate-200 flex-1 mx-4" />
              <div className="flex items-center gap-1.5 font-bold">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 'pay' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>2</span>
                <span className={step === 'pay' ? 'text-emerald-700' : 'text-slate-400'}>Secure Payment</span>
              </div>
            </div>
          )}

          {/* Form / Scroll Container */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            {step === 'plan' && (
              <form onSubmit={handleNextToPay} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Registered Business / Store Name
                  </label>
                  <input
                    type="text"
                    value={licensee}
                    onChange={(e) => setLicensee(e.target.value)}
                    placeholder="Enter Store or Client Name (e.g. Zepto Agro)"
                    className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-semibold outline-none transition-all focus:ring-4 focus:ring-emerald-500/10 uppercase"
                    required
                  />
                  <p className="text-[10px] text-slate-400">This licensee name is cryptographically embedded inside your key.</p>
                </div>

                {/* Grid of Plans */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Select Renewal Edition
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {/* Standard Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('Standard')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${selectedPlan === 'Standard' ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/15' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          Standard Edition
                        </span>
                        <p className="text-[11px] text-slate-500">Perfect for single outlets, basic POS ledgering & catalogs.</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900">$240<span className="text-[10px] text-slate-500 font-medium">/yr</span></span>
                      </div>
                    </button>

                    {/* Premium Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('Premium')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer relative ${selectedPlan === 'Premium' ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/15' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="absolute top-2.5 right-24 bg-emerald-600 text-white font-black text-[7.5px] uppercase tracking-widest px-2 py-0.5 rounded-full">
                        Popular Choice
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          Premium Edition
                          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        </span>
                        <p className="text-[11px] text-slate-500">Multi-outlet operations, live map, offline recovery mechanics.</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900">$480<span className="text-[10px] text-slate-500 font-medium">/yr</span></span>
                      </div>
                    </button>

                    {/* Enterprise Card */}
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('Enterprise')}
                      className={`p-4 rounded-2xl border text-left transition-all flex items-start justify-between cursor-pointer ${selectedPlan === 'Enterprise' ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/15' : 'border-slate-200 hover:bg-slate-50'}`}
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          Enterprise Suite
                        </span>
                        <p className="text-[11px] text-slate-500">Google Sheets automation, WhatsApp broadcasting, full custom branding.</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-slate-900">$960<span className="text-[10px] text-slate-500 font-medium">/yr</span></span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Duration options */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                    Choose Extension Term
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDuration('1year')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${duration === '1year' ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      1 Year
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuration('3years')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${duration === '3years' ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      3 Years (Save 20%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuration('lifetime')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${duration === 'lifetime' ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 hover:bg-slate-50 text-slate-600'}`}
                    >
                      Lifetime Pack
                    </button>
                  </div>
                </div>

                {/* Pricing total display */}
                <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-150">
                  <div className="text-xs font-bold text-slate-600">Total Renewal Investment:</div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900">${getPrice()}</span>
                    <span className="text-[11px] text-slate-500 font-semibold block uppercase tracking-wider">USD One-Time</span>
                  </div>
                </div>

                {paymentError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs">
                    ⚠ {paymentError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                >
                  Proceed to Secure Checkout
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            )}

            {step === 'pay' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-5">
                {/* Order Summary Miniature */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-700">{selectedPlan} Edition ({duration === '1year' ? '1-Yr Term' : duration === '3years' ? '3-Yr Term' : 'Lifetime Pack'})</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">Licensee: {licensee.toUpperCase()}</span>
                  </div>
                  <span className="font-black text-slate-950 text-sm">${getPrice()} USD</span>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Card Number</label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        placeholder="4111 2222 3333 4444"
                        className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        required
                      />
                      <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Expiry Date</label>
                      <input
                        type="text"
                        maxLength={5}
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Security Code (CVC)</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="•••"
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-center"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed">
                  <Lock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Your payment connection is fully encrypted. FarmersGate does not capture or store raw card data on our servers. Transactions are simulated securely.
                  </span>
                </div>

                {paymentError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 font-bold text-xs">
                    ⚠ {paymentError}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('plan')}
                    className="w-1/3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Pay ${getPrice()} USD & Secure Key
                  </button>
                </div>
              </form>
            )}

            {step === 'processing' && (
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <RefreshCw className="h-10 w-10 text-emerald-600 animate-spin" />
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-slate-800">Processing Secure Payment</h4>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Connecting to banking networks, verifying digital checksums, and generating cryptographic activation keys.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-100 rounded px-2 py-0.5">
                  SSL PORT 443 SECURED
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="space-y-6">
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center text-center">
                  <div className="p-3 bg-emerald-500 text-white rounded-full mb-3 shadow-md">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full mb-2">
                    Payment Succeeded
                  </span>
                  <h4 className="text-base font-extrabold text-slate-800">
                    SaaS License Key Minted Successfully
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Thank you! Your payment has been approved. Below is your newly generated cryptographic license key.
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider text-center">Your Renewed License Key</span>
                  <code className="text-xs font-mono font-bold text-slate-800 block break-all text-center select-all bg-white py-3 px-4 border border-slate-200 rounded-xl tracking-wider shadow-inner">
                    {newKey}
                  </code>
                  <div className="flex justify-center text-[10px] text-slate-400 gap-4">
                    <span>Edition: <strong>{selectedPlan}</strong></span>
                    <span>Expires: <strong>{expiresDateString === 'Lifetime' ? 'Lifetime (Never)' : expiresDateString}</strong></span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newKey);
                      alert('License key copied to clipboard!');
                    }}
                    className="w-1/3 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs py-3 rounded-xl transition-colors cursor-pointer"
                  >
                    Copy Key
                  </button>
                  <button
                    onClick={handleApplyLicense}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-3 rounded-xl transition-colors shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Auto-Apply License Instantly
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
