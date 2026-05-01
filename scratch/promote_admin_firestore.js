const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');
const line = lines.find(l => l.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY='));

if (!line) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY not found in .env.local');
  process.exit(1);
}

let value = line.split('FIREBASE_SERVICE_ACCOUNT_KEY=')[1].trim();

// Remove quotes if present
if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
  value = value.substring(1, value.length - 1);
}

const serviceAccount = JSON.parse(value);

// Fix private key newlines
if (serviceAccount.private_key) {
  serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function promoteAdminFirestore() {
  const email = 'testadmin@example.com';
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('email', '==', email).get();

  if (snapshot.empty) {
    console.log('No user found with email:', email);
    return;
  }

  const doc = snapshot.docs[0];
  await doc.ref.update({ role: 'admin' });
  console.log('Successfully promoted to admin in Firestore:', doc.id);
}

promoteAdminFirestore();
