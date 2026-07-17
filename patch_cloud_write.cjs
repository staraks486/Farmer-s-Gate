const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf8');

const cloudWriteFn = `
async function addToCloud<T extends { id?: string }>(collectionName: string, data: T): Promise<string> {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { error } = await supabaseInstance.from(collectionName).insert(data);
        if (!error) return data.id || 'mock-id';
      } catch(e) {
        console.warn('Supabase insert failed', collectionName, e);
      }
    }
  }
  return await addToFirestore(collectionName, data);
}

async function updateInCloud<T>(collectionName: string, id: string, updatedFields: Partial<T>) {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { error } = await supabaseInstance.from(collectionName).update(updatedFields).eq('id', id);
        if (!error) return;
      } catch(e) {
        console.warn('Supabase update failed', collectionName, e);
      }
    }
  }
  return await updateInFirestore(collectionName, id, updatedFields);
}

async function deleteFromCloud(collectionName: string, id: string) {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { error } = await supabaseInstance.from(collectionName).delete().eq('id', id);
        if (!error) return;
      } catch(e) {
        console.warn('Supabase delete failed', collectionName, e);
      }
    }
  }
  return await deleteFromFirestore(collectionName, id);
}

async function batchAddToCloud<T extends { id?: string }>(collectionName: string, dataList: T[]) {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { error } = await supabaseInstance.from(collectionName).insert(dataList);
        if (!error) return;
      } catch(e) {
        console.warn('Supabase batch insert failed', collectionName, e);
      }
    }
  }
  return await batchAddToFirestore(collectionName, dataList);
}
`;

content = content.replace('async function getFromCloud', cloudWriteFn + '\nasync function getFromCloud');

content = content.replace(/addToFirestore\(/g, 'addToCloud(');
content = content.replace(/updateInFirestore\(/g, 'updateInCloud(');
content = content.replace(/deleteFromFirestore\(/g, 'deleteFromCloud(');
content = content.replace(/batchAddToFirestore\(/g, 'batchAddToCloud(');

// Need to make sure import { addToFirestore, updateInFirestore, deleteFromFirestore, batchAddToFirestore } from './firebase'
// doesn't get messed up.
content = content.replace(/import \{([^\}]+)\} from '\.\/firebase';/g, (match, p1) => {
  let newP1 = p1.replace(/addToCloud/g, 'addToFirestore');
  newP1 = newP1.replace(/updateInCloud/g, 'updateInFirestore');
  newP1 = newP1.replace(/deleteFromCloud/g, 'deleteFromFirestore');
  newP1 = newP1.replace(/batchAddToCloud/g, 'batchAddToFirestore');
  return `import {${newP1}} from './firebase';`;
});

fs.writeFileSync('src/lib/supabase.ts', content);
console.log('Patch applied successfully.');
