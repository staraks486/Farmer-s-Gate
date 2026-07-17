const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerHub.tsx', 'utf-8');

if (!code.includes('cpanelSettings')) {
  // Add state
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
  code = code.replace(/const \[activeTab, setActiveTab\] = useState\('shop'\);/, stateInsert + "\n  const [activeTab, setActiveTab] = useState('shop');");

  // Replace ShoppingBag with Logo
  const oldIcon = `<ShoppingBag className="h-5 w-5" />`;
  const newIcon = `{cpanelSettings?.companyLogo ? (
                <img src={cpanelSettings.companyLogo} alt="Logo" className="object-contain h-full w-full p-1 rounded-xl" />
              ) : (
                <ShoppingBag className="h-5 w-5" />
              )}`;
  code = code.replace(oldIcon, newIcon);
}

fs.writeFileSync('src/components/CustomerHub.tsx', code);
