const fs = require('fs');
const content = fs.readFileSync('src/contexts/DataContext.tsx', 'utf8');
const newContent = content.replace(
  `        }, (err) => {
          console.error(\`Error syncing \${collectionName}:\`, err);
          setError(\`Sync error: \${collectionName}\`);
        });`,
  `        }, (err) => {
          console.error(\`Error syncing \${collectionName}:\`, err);
          setError(\`Sync error: \${collectionName}\`);
          
          // Fallback to local storage
          const localKey = 'fg_' + collectionName;
          const localData = localStorage.getItem(localKey);
          if (localData) {
            try {
              setter(JSON.parse(localData));
            } catch(e) {}
          } else if (collectionName === 'stores') {
             // specific fallback for stores so at least one is visible
             const hq = {
                id: "HQ-001",
                name: "Farmer's Gate - HQ",
                location: "FarmersGate HQ",
                whatsappNumber: "+1234567890",
                isActive: true,
                createdAt: new Date().toISOString(),
                lat: 12.9716,
                lng: 77.5946,
                version: 1
              };
             setter([hq]);
          }
        });`
);
fs.writeFileSync('src/contexts/DataContext.tsx', newContent);
console.log('patched');
