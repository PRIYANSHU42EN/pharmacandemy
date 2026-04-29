/* ==========================================================================
   Firebase Client SDK Configuration
   Used in client components and hooks
   Gracefully handles missing credentials during build/SSR
   ========================================================================== */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "0",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:0:web:0",
};

/** Whether real Firebase credentials are configured */
export const isFirebaseConfigured = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  console.log("[Firebase] Initializing project:", firebaseConfig.projectId);
  
  try {
     db = initializeFirestore(app, {
       localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
     });
  } catch (initErr) {
     db = getFirestore(app);
  }
  
  storage = getStorage(app);
} catch (e) {
  console.error("[Firebase] Initialization failed:", e);
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

export { auth, db, storage };
export default app;
