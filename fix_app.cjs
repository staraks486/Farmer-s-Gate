const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes('cpanelSettings')) {
  const stateInsert = `
  const [cpanelSettings, setCpanelSettings] = useState<any>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('farmersgate_cpanel_settings');
      if (saved) {
        setCpanelSettings(JSON.parse(saved));
      }
    } catch {}
  }, []);
`;
  code = code.replace(/const \[activePortal, setActivePortal\] = useState<'management' \| 'customer' \| 'partner'>/, stateInsert + "\n  const [activePortal, setActivePortal] = useState<'management' | 'customer' | 'partner'>");

  // Replace Sprout icon with Logo
  const oldIcon = `<Sprout className="h-10 w-10 text-emerald-400" />`;
  const newIcon = `{cpanelSettings?.companyLogo ? (
                      <img src={cpanelSettings.companyLogo} alt="Logo" className="object-contain h-10 w-10" />
                    ) : (
                      <Sprout className="h-10 w-10 text-emerald-400" />
                    )}`;
  code = code.replace(oldIcon, newIcon);
}

fs.writeFileSync('src/App.tsx', code);
