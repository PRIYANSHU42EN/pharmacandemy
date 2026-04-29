import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

async function checkFirestore() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    console.error("Missing FIREBASE_SERVICE_ACCOUNT_KEY");
    return;
  }

  let json = raw.trim();
  if ((json.startsWith("'") && json.endsWith("'")) || (json.startsWith('"') && json.endsWith('"'))) {
    json = json.substring(1, json.length - 1);
  }

  try {
    const creds = JSON.parse(json);
    const app = initializeApp({
      credential: cert(creds),
    });
    const db = getFirestore(app);
    const usersSnap = await db.collection('users').get();
    console.log(`User count: ${usersSnap.size}`);
    usersSnap.docs.forEach(doc => {
      console.log(`- ${doc.id}: ${doc.data().email} (${doc.data().role})`);
    });
  } catch (e) {
    console.error("Error:", e);
  }
}

checkFirestore();
