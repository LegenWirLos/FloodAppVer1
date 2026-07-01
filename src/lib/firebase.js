// Firebase initialisation. The web config values are PUBLIC client identifiers
// (safe to ship) — real security comes from Firestore rules + authorized domains.
// Values are read from Vite env vars (.env.local). If they're absent the app
// still runs fine, just with accounts disabled (firebaseReady === false).
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseReady = Boolean(cfg.apiKey && cfg.projectId);

let auth = null;
let db = null;
if (firebaseReady) {
  const app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };
