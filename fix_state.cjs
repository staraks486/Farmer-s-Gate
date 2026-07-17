const fs = require('fs');
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

// App.tsx
let appCode = fs.readFileSync('src/App.tsx', 'utf-8');
if (!appCode.includes('const [cpanelSettings')) {
  appCode = appCode.replace(/const \[activePortal, setActivePortal\] = useState/, stateInsert + "\n  const [activePortal, setActivePortal] = useState");
  fs.writeFileSync('src/App.tsx', appCode);
}

// CustomerHub.tsx
let hubCode = fs.readFileSync('src/components/CustomerHub.tsx', 'utf-8');
if (!hubCode.includes('const [cpanelSettings')) {
  hubCode = hubCode.replace(/const \[activeTab, setActiveTab\] = useState/, stateInsert + "\n  const [activeTab, setActiveTab] = useState");
  fs.writeFileSync('src/components/CustomerHub.tsx', hubCode);
}
