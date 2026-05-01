import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");

if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  content.split("\n").forEach(line => {
    const [key, ...val] = line.split("=");
    if (key && val.length > 0) {
      process.env[key.trim()] = val.join("=").trim();
    }
  });
}

function getServiceAccount() {
  let raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) return null;
  raw = raw.trim();
  if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
    raw = raw.substring(1, raw.length - 1);
  }
  try {
    const creds = JSON.parse(raw);
    if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    return creds;
  } catch (e) {
    console.error("JSON Parse Error:", e.message);
    return null;
  }
}

async function test() {
  const sa = getServiceAccount();
  if (!sa) {
    console.error("❌ Service Account not found");
    return;
  }

  try {
    const app = initializeApp({ credential: cert(sa) });
    const auth = getAuth(app);
    const db = getFirestore(app);
    console.log("✅ SDK Initialized");

    const users = await auth.listUsers(1);
    console.log("✅ Auth check: OK");

    const snap = await db.collection("users").limit(1).get();
    console.log(`✅ Firestore check: OK (${snap.size} users)`);
  } catch (e) {
    console.error("❌ Firebase Error:", e.message);
  }
}

test();
