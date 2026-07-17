const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf-8');

// Insert imports
if (!code.includes('syncToGoogleSheets')) {
  code = code.replace(/import \{ Store, /, "import { syncToGoogleSheets } from '../lib/workspace';\nimport { Store, ");
}

// Insert state for syncing
if (!code.includes('isSyncingSheets')) {
  code = code.replace(/const \[activeTab, setActiveTab\] = useState/, `const [isSyncingSheets, setIsSyncingSheets] = useState(false);\n  const [sheetLink, setSheetLink] = useState<string | null>(null);\n  const [activeTab, setActiveTab] = useState`);
}

// Insert the handler
if (!code.includes('handleSyncGoogleSheets')) {
  const handler = `
  const handleSyncGoogleSheets = async () => {
    try {
      setIsSyncingSheets(true);
      setSheetLink(null);
      // Construct complete system state object to backup
      const dataToBackup = {
        stores,
        inventory,
        purchases,
        sales,
        requirements,
        masterCrops,
        staffMembers,
        companyOfficials,
        promos
      };
      
      const link = await syncToGoogleSheets(dataToBackup);
      setSheetLink(link);
      setImportFeedback({ type: 'success', text: 'Data successfully backed up to Google Sheets!' });
    } catch (err: any) {
      console.error(err);
      setImportFeedback({ type: 'error', text: err.message || 'Failed to sync to Google Sheets' });
    } finally {
      setIsSyncingSheets(false);
    }
  };
`;
  code = code.replace(/const handleDownloadBackup = \(\) => \{/, handler + '\n  const handleDownloadBackup = () => {');
}

// Insert the UI
const ui = `
                {/* Google Sheets Backup */}
                <div className="rounded-xl border border-zinc-100 p-4 bg-zinc-50/50 space-y-3">
                  <div>
                    <span className="block text-xs font-black uppercase text-emerald-700">Google Sheets Cloud Sync</span>
                    <span className="block text-[10px] text-zinc-400 mt-0.5">Securely backup all database records straight into your authenticated Google Drive.</span>
                  </div>
                  {sheetLink ? (
                    <a
                      href={sheetLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Backup Sheet
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSyncGoogleSheets}
                      disabled={isSyncingSheets}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSyncingSheets ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Syncing to Sheets...
                        </>
                      ) : (
                        <>
                          <Database className="h-4 w-4" />
                          Backup to Google Sheets
                        </>
                      )}
                    </button>
                  )}
                </div>
`;
if (!code.includes('Google Sheets Cloud Sync')) {
  code = code.replace(/\{# Backup restore section #\}[\s\S]*?<\/div>\s*<\/div>/, match => match + '\n' + ui);
  // Actually wait, let's just insert it after the restore section
  code = code.replace(/(\{\/\* Backup restore section \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/, "$1\n" + ui.replace('md:grid-cols-2', 'md:grid-cols-3'));
  // Let's modify the grid to 3 cols
  code = code.replace(/className="grid grid-cols-1 md:grid-cols-2 gap-4"/, 'className="grid grid-cols-1 md:grid-cols-3 gap-4"');
}

fs.writeFileSync('src/components/AdminPanel.tsx', code);
