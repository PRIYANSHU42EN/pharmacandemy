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

const auth = admin.auth();

async function resetPassword() {
  const email = 'smashgaming5488@gmail.com';
  const password = 'Password123!';
  
  try {
    const user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, { password });
    console.log('Successfully reset password for:', email);
  } catch (error) {
    console.error('Error:', error);
  }
}

resetPassword();
