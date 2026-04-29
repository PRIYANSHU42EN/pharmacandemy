/* ==========================================================================
   Firebase Admin SDK Configuration
   Used ONLY in server-side API routes and Cloud Functions
   ========================================================================== */

import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getServiceAccount(): ServiceAccount | null {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  
  // Strip surrounding quotes if present (common in .env files)
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.substring(1, raw.length - 1);
  }

  try {
    const creds = JSON.parse(raw) as ServiceAccount;
    if (creds.privateKey) {
       creds.privateKey = creds.privateKey.replace(/\\n/g, '\n');
    }
    // Also support snake_case equivalent
    if ((creds as any).private_key) {
       (creds as any).private_key = (creds as any).private_key.replace(/\\n/g, '\n');
    }
    return creds;
  } catch {
    return null;
  }
}

let app;
let adminAuth: ReturnType<typeof getAuth>;
let adminDb: ReturnType<typeof getFirestore>;

const serviceAccount = getServiceAccount();

if (serviceAccount) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert(serviceAccount) });
  adminAuth = getAuth(app);
  adminDb = getFirestore(app);
} else {
  // Graceful fallback for build / missing env
  app = {} as any;
  adminAuth = {
    setCustomUserClaims: async () => {},
    verifyIdToken: async () => ({ uid: "mock-uid", email: "mock@example.com" }),
  } as unknown as ReturnType<typeof getAuth>;
  adminDb = {
    collection: () => ({
      doc: () => ({
        update: async () => {},
        get: async () => ({ exists: false, data: () => ({}) }),
      }),
      add: async () => ({ id: "mock-id" }),
      where: () => ({ limit: () => ({ get: async () => ({ empty: true }) }) })
    })
  } as unknown as ReturnType<typeof getFirestore>;
}

export { adminAuth, adminDb };
