/* ==========================================================================
   Firebase Client SDK Configuration
   Used in client components and hooks
   ========================================================================== */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "harmacandy.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "harmacandy",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "harmacandy.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "161255704277",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:161255704277:web:bf50d9cf9ecfcddb4b445c",
};

let app: FirebaseApp;
let auth: Auth;
let _db: Firestore | null = null;
let storage: FirebaseStorage;

try {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp(firebaseConfig);
    console.log("[Firebase] ✅ App Initialized:", app.name);
  }
} catch (e) {
  console.error("[Firebase] ❌ App Init Failed:", e);
  app = {} as any;
}

try {
  // getAuth internally acts as a singleton per app instance
  auth = getAuth(app);
} catch (e) {
  console.error("[Firebase] ❌ Auth Init Failed:", e);
  auth = { onAuthStateChanged: () => () => {}, onIdTokenChanged: () => () => {} } as any;
}

try {
  storage = getStorage(app);
} catch (e) {
  console.error("[Firebase] ❌ Storage Init Failed:", e);
  storage = {} as any;
}

/**
 * Lazy-getter for Firestore to prevent "Component not registered" errors in Next.js/Turbopack
 */
export function getDb(): Firestore {
  if (_db) return _db;

  try {
    // getFirestore is generally safer as it checks for existing instances
    _db = getFirestore(app);
    return _db;
  } catch (e: any) {
    // If it's not available, it might need explicit initialization
    if (e.code === 'failed-precondition' || e.message?.includes('not available')) {
      try {
        _db = initializeFirestore(app, {});
        return _db;
      } catch (inner) {
        console.error("[Firebase] ❌ Firestore Registration Failed:", inner);
        return {} as Firestore;
      }
    }
    console.error("[Firebase] ❌ Firestore Init Error:", e);
    return {} as Firestore;
  }
}

// Export 'db' as a Proxy to handle lazy initialization
export const db = new Proxy({} as Firestore, {
  get: (target, prop) => {
    // If we're just checking for existence or a known property that doesn't require init
    if (prop === '$$typeof' || prop === 'constructor' || prop === 'prototype') {
      return (target as any)[prop];
    }
    
    const instance = getDb();
    if (!instance || Object.keys(instance).length === 0) {
      return undefined;
    }
    
    const value = (instance as any)[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  }
});

export { auth, storage };
export default app;
