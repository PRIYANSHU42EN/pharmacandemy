import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as fs from "fs";

function getEnv(key: string) {
  const content = fs.readFileSync(".env.local", "utf-8");
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) return undefined;
  let val = match[1].trim();
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val;
}

const serviceAccountKey = getEnv("FIREBASE_SERVICE_ACCOUNT_KEY")?.replace(/\\n/g, "\n");
const projectId = getEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

if (!serviceAccountKey || !projectId) {
  console.error("Missing Firebase Admin credentials in .env.local");
  process.exit(1);
}

let formattedKey = serviceAccountKey;
if (!formattedKey.includes("BEGIN PRIVATE KEY")) {
  formattedKey = `-----BEGIN PRIVATE KEY-----\n${formattedKey.trim()}\n`;
}

const app = getApps().length === 0 ? initializeApp({
  credential: cert({
    projectId,
    clientEmail: "firebase-adminsdk-m8qj4@harmacandy.iam.gserviceaccount.com", // Dummy email, only private key matters for auth essentially
    privateKey: formattedKey,
  }),
}) : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);

async function run() {
  try {
    const listResult = await auth.listUsers(100);
    console.log(`Found ${listResult.users.length} users in Firebase Auth.`);
    
    let adminCount = 0;
    
    for (const user of listResult.users) {
      // Check if email contains 'admin' OR if it's the only test account
      if (user.email?.toLowerCase().includes("admin") || listResult.users.length === 1) {
         console.log(`Upgrading user: ${user.email} (UID: ${user.uid})`);
         
         const ref = db.collection("users").doc(user.uid);
         const snap = await ref.get();
         
         if (!snap.exists) {
            await ref.set({
               uid: user.uid,
               email: user.email,
               role: "super-admin",
               createdAt: new Date(),
               updatedAt: new Date()
            });
         } else {
            await ref.update({
               role: "super-admin",
               updatedAt: new Date()
            });
         }
         adminCount++;
      }
    }
    
    console.log(`Successfully upgraded ${adminCount} users to super-admin.`);
    process.exit(0);
  } catch (error) {
    console.error("Failed:", error);
    process.exit(1);
  }
}

run();
