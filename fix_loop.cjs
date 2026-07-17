const fs = require('fs');
let code = fs.readFileSync('src/components/CustomerMilkRegistry.tsx', 'utf-8');

const target = `  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fg_milk_customers' && e.newValue) {
        try {
          setCustomers(JSON.parse(e.newValue));
        } catch {}
      }
      if (e.key === 'fg_milk_deletion_requests' && e.newValue) {
        try {
          setDeletionRequests(JSON.parse(e.newValue));
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);`;

const replacer = `  // Sync across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'fg_milk_customers' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setCustomers(prev => JSON.stringify(prev) === e.newValue ? prev : parsed);
        } catch {}
      }
      if (e.key === 'fg_milk_deletion_requests' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setDeletionRequests(prev => JSON.stringify(prev) === e.newValue ? prev : parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);`;

if (code.includes(target)) {
  code = code.replace(target, replacer);
  fs.writeFileSync('src/components/CustomerMilkRegistry.tsx', code);
  console.log("Fixed infinite loop.");
} else {
  console.log("Target not found.");
}
