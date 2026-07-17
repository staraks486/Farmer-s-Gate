import React, { useState, useEffect } from 'react';
import { Key, Award, Calendar, Copy, Check, Sparkles, ShieldAlert, CheckCircle2, Trash2, ShieldCheck, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import { generateLicenseKey, validateLicenseKey, getSavedLicense, LicenseInfo, isLicenseWallEnforced } from '../../lib/license';

export const LicenseManagerTab: React.FC = () => {
  // Key Generator States
  const [genLicensee, setGenLicensee] = useState('');
  const [genPlan, setGenPlan] = useState<'Standard' | 'Premium' | 'Enterprise'>('Premium');
  const [genExpiryType, setGenExpiryType] = useState<'lifetime' | 'custom'>('lifetime');
  const [genExpiryDate, setGenExpiryDate] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [genHistory, setGenHistory] = useState<any[]>([]);

  // Local Activation States
  const [localLicense, setLocalLicense] = useState<LicenseInfo | null>(null);
  const [activateKey, setActivateKey] = useState('');
  const [activationError, setActivationError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState('');
  const [isEnforced, setIsEnforced] = useState(false);

  useEffect(() => {
    // Load local license info
    setLocalLicense(getSavedLicense());
    
    // Load hard-lock settings
    setIsEnforced(isLicenseWallEnforced());

    // Load key generation history
    const historyRaw = localStorage.getItem('fg_license_gen_history');
    if (historyRaw) {
      try {
        setGenHistory(JSON.parse(historyRaw));
      } catch (err) {}
    }
  }, []);

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!genLicensee.trim()) return;

    const expiryValue = genExpiryType === 'lifetime' ? 'Lifetime' : genExpiryDate || '2027-12-31';
    const key = generateLicenseKey(genLicensee, genPlan, expiryValue);
    setGeneratedKey(key);

    // Save to generation history
    const newRecord = {
      id: String(Date.now()),
      licensee: genLicensee,
      plan: genPlan,
      expires: expiryValue,
      key,
      createdAt: new Date().toISOString().substring(0, 10)
    };

    const updatedHistory = [newRecord, ...genHistory].slice(0, 20); // Keep last 20
    setGenHistory(updatedHistory);
    localStorage.setItem('fg_license_gen_history', JSON.stringify(updatedHistory));
    setCopiedKey(false);
  };

  const handleCopy = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleLocalActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setActivationError('');
    setActivationSuccess('');

    const validation = validateLicenseKey(activateKey);
    if (validation.isValid && validation.plan && validation.expires && validation.licensee) {
      const newLicense: LicenseInfo = {
        key: activateKey.trim().toUpperCase(),
        licensee: validation.licensee,
        plan: validation.plan,
        expires: validation.expires,
        activatedAt: new Date().toISOString().substring(0, 10),
        status: 'active'
      };

      localStorage.setItem('fg_license_info', JSON.stringify(newLicense));
      setLocalLicense(newLicense);
      setActivationSuccess(`Activated! This system is now running on a licensed ${validation.plan} plan for ${validation.licensee}.`);
      setActivateKey('');
      
      // Propagate the license info to Firestore to automatically sync with other devices in real-time!
      try {
        const rawSettings = localStorage.getItem('farmersgate_cpanel_settings') || '{}';
        const parsedSettings = JSON.parse(rawSettings);
        parsedSettings.licenseInfo = newLicense;
        localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(parsedSettings));
        import('../../lib/firebase').then(({ updateSettings }) => {
          updateSettings(parsedSettings).catch(console.error);
        });
      } catch (e) {
        console.error("Failed to propagate license key to cloud sync:", e);
      }
      
      window.dispatchEvent(new Event('license-status-updated'));
    } else {
      setActivationError(validation.error || 'Activation failed.');
    }
  };

  const handleLocalDeactivate = () => {
    if (window.confirm('Are you sure you want to deactivate and wipe the current license key?')) {
      localStorage.removeItem('fg_license_info');
      
      // Propagate license deactivation to Firestore!
      try {
        const rawSettings = localStorage.getItem('farmersgate_cpanel_settings') || '{}';
        const parsedSettings = JSON.parse(rawSettings);
        delete parsedSettings.licenseInfo;
        localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(parsedSettings));
        import('../../lib/firebase').then(({ updateSettings }) => {
          updateSettings(parsedSettings).catch(console.error);
        });
      } catch (e) {
        console.error("Failed to propagate license wipe to cloud sync:", e);
      }

      setLocalLicense(getSavedLicense());
      setActivationSuccess('License wiped successfully.');
      window.dispatchEvent(new Event('license-status-updated'));
    }
  };

  const handleToggleEnforcement = () => {
    const nextVal = !isEnforced;
    setIsEnforced(nextVal);
    
    // Save to cpanel settings in localstorage and Firestore
    try {
      const raw = localStorage.getItem('farmersgate_cpanel_settings') || '{}';
      const settings = JSON.parse(raw);
      settings.enforceLicenseWall = nextVal;
      localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(settings));
      
      import('../../lib/firebase').then(({ updateSettings }) => {
        updateSettings(settings).catch(console.error);
      });
    } catch (err) {}

    window.dispatchEvent(new Event('license-status-updated'));
  };

  const deleteHistoryItem = (id: string) => {
    const updated = genHistory.filter(item => item.id !== id);
    setGenHistory(updated);
    localStorage.setItem('fg_license_gen_history', JSON.stringify(updated));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview/Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 p-8 opacity-5 text-9xl font-black pointer-events-none select-none">
          SaaS
        </div>
        <div className="max-w-2xl relative z-10">
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/20">
            SaaS & Monetization Panel
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-3">Commercial Licensing Console</h2>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
            Protect, distribute, and monetize your FarmersGate web application. Generate cryptographic license keys, bind activations to customers, and enforce structural lockouts to restrict unlicensed copies.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Key Generator */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-emerald-600" />
              Generate Commercial License Key
            </h3>

            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">Client / Company Name</label>
                  <input
                    type="text"
                    value={genLicensee}
                    onChange={(e) => setGenLicensee(e.target.value)}
                    placeholder="e.g. Zepto Retail Ltd"
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">License Plan Tier</label>
                  <select
                    value={genPlan}
                    onChange={(e) => setGenPlan(e.target.value as any)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-semibold bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  >
                    <option value="Standard">Standard (Basic POS & Catalog)</option>
                    <option value="Premium">Premium (Multi-outlet & Live)</option>
                    <option value="Enterprise">Enterprise (Full Control Panel, Sheets, WhatsApp)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">Expiry Period</label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={genExpiryType === 'lifetime'}
                        onChange={() => setGenExpiryType('lifetime')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      Lifetime (No expiry)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-zinc-700 cursor-pointer">
                      <input
                        type="radio"
                        checked={genExpiryType === 'custom'}
                        onChange={() => setGenExpiryType('custom')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      Custom Expiry Date
                    </label>
                  </div>
                </div>

                {genExpiryType === 'custom' && (
                  <div className="space-y-1 animate-fade-in">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide block">Expiry Date</label>
                    <input
                      type="date"
                      value={genExpiryDate}
                      onChange={(e) => setGenExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!genLicensee.trim()}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/10"
              >
                <Key className="h-3.5 w-3.5" />
                Generate License Key
              </button>
            </form>

            {/* Generated Output */}
            {generatedKey && (
              <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wide bg-emerald-100/60 px-2 py-0.5 rounded-full">
                    Key Generated Successfully
                  </span>
                  <button
                    onClick={() => handleCopy(generatedKey)}
                    className="text-xs text-zinc-600 hover:text-emerald-600 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-600 animate-bounce" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Key
                      </>
                    )}
                  </button>
                </div>
                <code className="block text-xs font-mono font-bold text-slate-800 select-all p-3 bg-white border border-zinc-200 rounded-lg break-all tracking-wider text-center">
                  {generatedKey}
                </code>
                <div className="text-[10px] text-zinc-500 leading-relaxed text-center">
                  Give this key to <strong className="text-zinc-700">{genLicensee}</strong>. They can paste this in their application to activate the software.
                </div>
              </div>
            )}
          </div>

          {/* Generated History */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider mb-3">
              Generated Keys History
            </h3>
            {genHistory.length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">No keys generated yet in this admin session.</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {genHistory.map((item) => (
                  <div key={item.id} className="p-3 border border-zinc-150 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-zinc-800 truncate">{item.licensee}</strong>
                        <span className="text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-100">
                          {item.plan}
                        </span>
                      </div>
                      <code className="text-[10px] font-mono text-zinc-500 block truncate tracking-wider">{item.key}</code>
                      <div className="text-[9px] text-zinc-400">
                        Expires: {item.expires} | Generated: {item.createdAt}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleCopy(item.key)}
                        className="p-1.5 text-zinc-500 hover:text-emerald-600 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                        title="Copy Key"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => deleteHistoryItem(item.id)}
                        className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Delete from history"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Local Activation & Enforcement Settings */}
        <div className="lg:col-span-5 space-y-6">
          {/* Lockout & Enforcement Settings */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="h-4.5 w-4.5 text-slate-700" />
              Anti-Piracy Lock Settings
            </h3>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-zinc-800">Enforce Activation Wall</h4>
                  <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">
                    If enabled, unlicensed copies will be fully locked on load, requiring users to enter a valid license key before they can view dashboards.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleEnforcement}
                  className="text-slate-800 hover:text-emerald-600 transition-colors cursor-pointer shrink-0"
                >
                  {isEnforced ? (
                    <ToggleRight className="h-9 w-9 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="h-9 w-9 text-slate-300" />
                  )}
                </button>
              </div>

              <div className="flex gap-2.5 text-[10px] text-zinc-500 bg-white p-2.5 rounded-lg border border-zinc-100 leading-relaxed">
                <Info className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>
                  <strong>Tip for Sellers:</strong> When compile-building this app for clients, turn <strong>ON</strong> this enforcement. The client's installation will be completely locked until you provide them a generated key.
                </span>
              </div>
            </div>
          </div>

          {/* Local Instance Status */}
          <div className="bg-white border border-zinc-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider flex items-center gap-2">
              <Award className="h-4.5 w-4.5 text-amber-500" />
              This Deployment Status
            </h3>

            {localLicense && localLicense.status === 'active' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <h4 className="font-extrabold text-emerald-900 flex items-center gap-1.5">
                      Fully Activated
                      <span className="text-[8px] font-black uppercase bg-emerald-200 text-emerald-800 px-1 py-0.2 rounded border border-emerald-300">
                        {localLicense.plan}
                      </span>
                    </h4>
                    <p className="text-emerald-800 mt-1">Licensed to: <strong>{localLicense.licensee}</strong></p>
                    <p className="text-emerald-600/90 mt-0.5 text-[10px]">Expires: {localLicense.expires === 'Lifetime' ? 'Never (Lifetime)' : localLicense.expires}</p>
                  </div>
                </div>

                <div className="bg-zinc-50 border border-zinc-150 rounded-xl p-3 text-xs text-center space-y-2">
                  <span className="text-[10px] text-zinc-400 block uppercase font-bold tracking-wider">Active License Key</span>
                  <code className="text-[11px] font-mono block break-all bg-white py-1 px-2 rounded border border-zinc-200 text-zinc-700">
                    {localLicense.key}
                  </code>
                </div>

                <button
                  onClick={handleLocalDeactivate}
                  className="w-full text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Deactivate & Reset to Demo
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs">
                  <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-800">Demo/Unlicensed Mode</h4>
                    <p className="text-amber-700 mt-1">This local deployment is running in trial mode. It needs activation to bind custom business details in locked structures.</p>
                  </div>
                </div>

                {activationError && (
                  <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">
                    ❌ {activationError}
                  </div>
                )}
                {activationSuccess && (
                  <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                    ✅ {activationSuccess}
                  </div>
                )}

                <form onSubmit={handleLocalActivate} className="space-y-3">
                  <input
                    type="text"
                    value={activateKey}
                    onChange={(e) => setActivateKey(e.target.value)}
                    placeholder="Paste License Key here..."
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs font-mono tracking-wider text-center uppercase focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Activate Local System
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
