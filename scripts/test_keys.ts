import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as fs from "fs";

function getEnv(key: string) {
  const content = fs.readFileSync(".env.local", "utf-8");
  const match = content.match(new RegExp(`^${key}=(.*)$`, "m"));
  if (!match) return undefined;
  let val = match[1].trim();
  if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val;
}

const rawKey = getEnv("FIREBASE_SERVICE_ACCOUNT_KEY");
if (!rawKey) {
  console.error("No FIREBASE_SERVICE_ACCOUNT_KEY found");
  process.exit(1);
}

try {
  let parsedCreds;
  try {
     parsedCreds = JSON.parse(rawKey);
     if (parsedCreds.private_key) {
        parsedCreds.private_key = parsedCreds.private_key.replace(/\\n/g, '\n');
     }
     console.log("Successfully parsed JSON credentials. Project ID:", parsedCreds.project_id);
  } catch (e) {
     console.error("Failed to parse JSON string:", e.message);
     process.exit(1);
  }

  const app = getApps().length === 0 ? initializeApp({
    credential: cert(parsedCreds),
  }) : getApps()[0];

  const db = getFirestore(app);
  const auth = getAuth(app);

  async function test() {
    try {
      console.log("Pinging Auth Service...");
      const listResult = await auth.listUsers(1);
      console.log(`Auth Service OK. Found total records > ${listResult.users.length}`);

      console.log("Pinging Firestore Service...");
      const snapshot = await db.collection("users").limit(1).get();
      console.log(`Firestore Service OK. Found ${(snapshot.size)} records in test read.`);

      console.log("\n✅ ALL FIREBASE ADMIN SDK KEYS WORKING PERFECTLY");
      process.exit(0);
    } catch (error) {
      console.error("\n❌ FAILED TO AUTHENTICATE:", error.message);
      process.exit(1);
    }
  }

  test();
} catch (e) {
  console.error("Setup error:", e);
}
