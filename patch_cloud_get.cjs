const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf8');

const cloudGetFn = `
async function getFromCloud<T>(collectionName: string): Promise<T[]> {
  const config = getSupabaseConfig();
  if (config.isConnected) {
    if (!supabaseInstance) initSupabase();
    if (supabaseInstance) {
      try {
        const { data, error } = await supabaseInstance.from(collectionName).select('*');
        if (!error && data && data.length > 0) {
          return data as T[];
        }
      } catch(e) {
        console.warn('Supabase fetch failed for', collectionName, e);
      }
    }
  }
  return await getFromFirestore<T>(collectionName);
}
`;

// Insert the function before dbGetStores
content = content.replace('export async function dbGetStores', cloudGetFn + '\nexport async function dbGetStores');

// Replace all getFromFirestore calls with getFromCloud
content = content.replace(/getFromFirestore</g, 'getFromCloud<');

fs.writeFileSync('src/lib/supabase.ts', content);
console.log('Patch applied successfully.');
