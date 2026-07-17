import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs } from "firebase/firestore";
import firebaseConfigRaw from './firebase-applet-config.json';
const app = initializeApp(firebaseConfigRaw);
const db = getFirestore(app, firebaseConfigRaw.firestoreDatabaseId || '(default)');
async function check() {
  try {
    const docRef = await addDoc(collection(db, 'stores'), { test: 1 });
    console.log('Doc written:', docRef.id);
  } catch (e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
check();
