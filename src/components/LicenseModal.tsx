import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, ShieldAlert, Key, HelpCircle, Award, Calendar, RefreshCw, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSavedLicense, validateLicenseKey, generateLicenseKey, LicenseInfo, getLicenseExpiryDaysLeft } from '../lib/license';

interface LicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLicenseChanged?: () => void;
  onRenewClick?: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isOpen, onClose, onLicenseChanged, onRenewClick }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'terms'>('status');
  const [licenseKey, setLicenseKey] = useState('');
  const [currentLicense, setCurrentLicense] = useState<LicenseInfo | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCurrentLicense(getSavedLicense());
      setError('');
      setSuccess('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsActivating(true);

    // Simulate validation latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const result = validateLicenseKey(licenseKey);

    if (result.isValid && result.plan && result.expires && result.licensee) {
      const newLicense: LicenseInfo = {
        key: licenseKey.trim().toUpperCase(),
        licensee: result.licensee,
        plan: result.plan,
        expires: result.expires,
        activatedAt: new Date().toISOString().substring(0, 10),
        status: 'active',
      };

      localStorage.setItem('fg_license_info', JSON.stringify(newLicense));
      setCurrentLicense(newLicense);
      setSuccess(`Congratulations! Activated under ${result.plan} license for ${result.licensee}.`);
      setLicenseKey('');
      if (onLicenseChanged) onLicenseChanged();
      
      // Propagate the license info to Firestore to automatically sync with other devices in real-time!
      try {
        const rawSettings = localStorage.getItem('farmersgate_cpanel_settings') || '{}';
        const parsedSettings = JSON.parse(rawSettings);
        parsedSettings.licenseInfo = newLicense;
        localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(parsedSettings));
        import('../lib/firebase').then(({ updateSettings }) => {
          updateSettings(parsedSettings).catch(console.error);
        });
      } catch (e) {
        console.error("Failed to propagate license key to cloud sync:", e);
      }
      
      // Dispatch custom event to notify App component of license activation
      window.dispatchEvent(new Event('license-status-updated'));
    } else {
      setError(result.error || 'Activation failed. Please check the key.');
    }
    setIsActivating(false);
  };

  const handleDeactivate = () => {
    if (window.confirm('Are you sure you want to deactivate and remove this license key from this device?')) {
      localStorage.removeItem('fg_license_info');
      
      // Propagate license deactivation to Firestore!
      try {
        const rawSettings = localStorage.getItem('farmersgate_cpanel_settings') || '{}';
        const parsedSettings = JSON.parse(rawSettings);
        delete parsedSettings.licenseInfo;
        localStorage.setItem('farmersgate_cpanel_settings', JSON.stringify(parsedSettings));
        import('../lib/firebase').then(({ updateSettings }) => {
          updateSettings(parsedSettings).catch(console.error);
        });
      } catch (e) {
        console.error("Failed to propagate license wipe to cloud sync:", e);
      }

      setCurrentLicense(getSavedLicense());
      setSuccess('License deactivated successfully.');
      if (onLicenseChanged) onLicenseChanged();
      window.dispatchEvent(new Event('license-status-updated'));
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Software License Center</h2>
                <p className="text-xs text-slate-500 font-medium">FarmersGate Tech Inc. Licensing Manager</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex px-6 border-b border-slate-100 bg-white">
            <button
              onClick={() => setActiveTab('status')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'status' 
                  ? 'border-emerald-600 text-emerald-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              License Status & Activation
            </button>
            <button
              onClick={() => setActiveTab('terms')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === 'terms' 
                  ? 'border-emerald-600 text-emerald-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              License Agreement (EULA)
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-[300px]">
            {activeTab === 'status' ? (
              <div className="space-y-6">
                {/* Active License Info Dashboard */}
                {currentLicense && currentLicense.status === 'active' ? (
                  <div className="space-y-4">
                    {(() => {
                      const daysLeft = getLicenseExpiryDaysLeft(currentLicense.expires);
                      if (daysLeft !== null && daysLeft <= 30 && daysLeft >= 0) {
                        return (
                          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row gap-3 text-sm text-amber-800">
                            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="font-bold text-amber-900">License Expiring Soon!</h4>
                              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                This system's active license is set to expire in <strong>{daysLeft} {daysLeft === 1 ? 'day' : 'days'}</strong> (on {currentLicense.expires}). Please enter a renewed key or complete an online renewal to prevent system lockouts.
                              </p>
                              {onRenewClick && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onRenewClick();
                                  }}
                                  className="mt-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[9px] uppercase px-3 py-1.5 rounded-lg tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1.5 w-fit"
                                >
                                  💳 Renew Online Instantly
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 flex flex-col items-center text-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-900 font-mono text-8xl font-black pointer-events-none select-none">
                        {currentLicense.plan[0]}
                      </div>
                      
                      <div className="p-3 bg-emerald-500 text-white rounded-full mb-3 shadow-md shadow-emerald-500/10">
                        <Award className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/50 px-3 py-1 rounded-full mb-2">
                        {currentLicense.plan} Edition Activated
                      </span>
                      <h4 className="text-xl font-extrabold text-slate-800">
                        {currentLicense.licensee}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        This software instance is fully licensed and protected. All premium corporate SaaS modules are unlocked.
                      </p>

                      <div className="grid grid-cols-2 gap-4 w-full mt-5 pt-4 border-t border-emerald-100/80 text-left">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Activated On</span>
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {currentLicense.activatedAt}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Expiry Date</span>
                          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                            {currentLicense.expires === 'Lifetime' ? 'Never (Lifetime)' : currentLicense.expires}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Active Key Display */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider mb-1">Active License Key</span>
                      <code className="text-xs font-mono font-bold text-slate-700 block break-all tracking-wider select-all bg-white py-2 px-3 border border-slate-100 rounded-lg">
                        {currentLicense.key}
                      </code>
                    </div>

                    {/* Deactivation action */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleDeactivate}
                        className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1.5 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Deactivate License
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Unlicensed Warning */}
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex gap-3 text-sm text-amber-800">
                      <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold">Evaluation & Demo Mode Active</h4>
                        <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                          FarmersGate is running in a limited trial/demo state. To deploy this application for customers, commercialize it, or unlock full persistent capabilities, please enter a valid license key.
                        </p>
                      </div>
                    </div>

                    {/* Activation Form */}
                    <form onSubmit={handleActivate} className="space-y-4">
                      {error && (
                        <div className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                          ❌ {error}
                        </div>
                      )}
                      {success && (
                        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                          ✅ {success}
                        </div>
                      )}

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 block uppercase tracking-wider">
                          Enter Software License Key
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={licenseKey}
                            onChange={(e) => setLicenseKey(e.target.value)}
                            placeholder="FG-STD-20271231-STORENAME-HASH"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-emerald-500 rounded-xl text-sm font-mono tracking-wider font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all uppercase"
                            required
                          />
                          <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Format matches: <code className="bg-slate-100 px-1 rounded">FG-[PLAN]-[EXPIRY]-[NAME]-[CHECKSUM]</code>
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isActivating || !licenseKey.trim()}
                        className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-55 active:bg-slate-950 text-white font-bold text-sm py-3 rounded-xl transition-colors shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {isActivating ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Verifying License Key...
                          </>
                        ) : (
                          'Activate Premium SaaS Software'
                        )}
                      </button>
                    </form>

                    {/* How to buy info */}
                    <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-200">
                      <h5 className="text-xs font-bold text-slate-700">Buying or Redistributing FarmersGate?</h5>
                      <p className="text-xs text-slate-500 mt-1">
                        Contact FarmersGate Tech licensing department to request commercial deployment licenses or resell modules.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-600 space-y-4 pr-1 leading-relaxed">
                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800">1. License Grant</h3>
                  <p>
                    Subject to the terms and conditions of this Agreement, FarmersGate Tech Inc. ("Licensor") hereby grants to the authorized user ("Licensee") a non-exclusive, non-transferable, limited license to use the FarmersGate Management Suite ("Software") solely for internal business operations.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800">2. Restrictions</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Licensee shall not modify, adapt, translate, or create derivative works based upon the Software.</li>
                    <li>Licensee shall not reverse engineer, decompile, disassemble, or otherwise attempt to discover the source code of the Software.</li>
                    <li>Licensee shall not rent, lease, sell, assign, or otherwise transfer rights in or to the Software.</li>
                    <li>Licensee shall not remove any proprietary notices or labels on the Software.</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800">3. Proprietary Rights</h3>
                  <p>
                    The Software is licensed, not sold. Licensor retains all title, interest, and ownership rights in and to the Software, including all intellectual property rights therein.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h3 className="font-bold text-slate-800">4. Disclaimer of Warranty</h3>
                  <p>
                    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              {currentLicense && currentLicense.status === 'active' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span>Valid and Active License</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 text-amber-500 animate-pulse" />
                  <span>Unlicensed Evaluation Trial</span>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Acknowledge & Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
