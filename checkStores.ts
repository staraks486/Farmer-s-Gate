import { dbGetStores } from './src/lib/supabase';
dbGetStores().then(s => console.log(s)).catch(console.error);
