import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import firebaseConfigRaw from './firebase-applet-config.json';
const app = initializeApp(firebaseConfigRaw);
const db = getFirestore(app, firebaseConfigRaw.firestoreDatabaseId || '(default)');
async function check() {
  const s = await getDocs(collection(db, 'stores'));
  console.log('Stores in Firestore:', s.docs.map(d => d.data()));
  process.exit(0);
}
check();
