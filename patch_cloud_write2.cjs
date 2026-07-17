const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf8');

content = content.replace('return await addToCloud(collectionName, data);', 'return await addToFirestore(collectionName, data);');
content = content.replace('return await updateInCloud(collectionName, id, updatedFields);', 'return await updateInFirestore(collectionName, id, updatedFields);');
content = content.replace('return await deleteFromCloud(collectionName, id);', 'return await deleteFromFirestore(collectionName, id);');
content = content.replace('return await batchAddToCloud(collectionName, dataList);', 'return await batchAddToFirestore(collectionName, dataList);');

fs.writeFileSync('src/lib/supabase.ts', content);
console.log('Patch applied successfully.');
