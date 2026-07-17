const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');

const target = `<div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">`;

const logoSection = `
            {/* BRANDING SECTION */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <h3 className="font-bold text-zinc-900 text-lg">App Branding</h3>
                  <p className="text-xs text-zinc-500">Configure global application branding elements like the main logo.</p>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-wider">Company Logo</label>
                <div className="flex items-center gap-4">
                  {cpanelSettings.companyLogo ? (
                    <div className="relative h-16 w-16 rounded-xl border border-zinc-200 overflow-hidden bg-white">
                      <img src={cpanelSettings.companyLogo} alt="Company Logo" className="object-contain h-full w-full p-1" />
                      <button
                        onClick={() => onUpdateCpanelSettings({ ...cpanelSettings, companyLogo: undefined })}
                        className="absolute top-0 right-0 p-1 bg-red-500/80 text-white rounded-bl-lg hover:bg-red-600 cursor-pointer"
                        title="Remove Logo"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 rounded-xl border-2 border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50">
                      <span className="text-xs font-medium">None</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      id="logo-upload"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const base64 = reader.result as string;
                            onUpdateCpanelSettings({ ...cpanelSettings, companyLogo: base64 });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label 
                      htmlFor="logo-upload"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-black uppercase rounded-xl transition cursor-pointer border border-zinc-200"
                    >
                      <Upload className="h-4 w-4" /> Upload New Logo
                    </label>
                    <p className="text-[10px] text-zinc-500 mt-1">Recommended size: 256x256px. Max 1MB (Base64 encoded).</p>
                  </div>
                </div>
              </div>
            </div>
`;

code = code.replace(target, logoSection + "\n            " + target);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
