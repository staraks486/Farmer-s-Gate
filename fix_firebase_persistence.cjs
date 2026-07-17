const fs = require('fs');
let code = fs.readFileSync('src/lib/firebase.ts', 'utf8');

if (!code.includes('enableIndexedDbPersistence')) {
  // Add import
  code = code.replace(
    /import \{\s*initializeFirestore,/g,
    "import {\n  initializeFirestore,\n  enableIndexedDbPersistence,"
  );

  // Add enable command after initializeFirestore
  const initLine = 'const db = initializeFirestore(app, {\n  experimentalForceLongPolling: true\n}, "ai-studio-farmersgate-c2c65696-e9aa-4472-aeb0-8b98e4aa7877");';
  
  if (code.includes(initLine)) {
    const replacement = initLine + `

// Enable offline persistence
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support all of the features required to enable persistence');
    }
  });
`;
    code = code.replace(initLine, replacement);
    fs.writeFileSync('src/lib/firebase.ts', code);
    console.log("Success adding persistence");
  } else {
    console.log("Could not find initLine");
  }
} else {
  console.log("Persistence already added");
}
