const fs = require('fs');
const content = fs.readFileSync('src/lib/firebase.ts', 'utf8');
const newContent = content.replace(
  `const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});`,
  `const databaseId = firebaseConfigRaw.firestoreDatabaseId || '(default)';
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, databaseId);`
);
fs.writeFileSync('src/lib/firebase.ts', newContent);
console.log('patched');
