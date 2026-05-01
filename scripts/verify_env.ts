import * as fs from 'fs';
import * as path from 'path';

const REQUIRED_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'FIREBASE_SERVICE_ACCOUNT_KEY',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RESEND_API_KEY'
];

async function verify() {
  console.log('🔍 Verifying environment configuration...');
  
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ ERROR: .env.local not found!');
    process.exit(1);
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const missing = [];

  for (const v of REQUIRED_VARS) {
    if (!content.includes(v + '=')) {
      missing.push(v);
    }
  }

  if (missing.length > 0) {
    console.error('❌ ERROR: Missing required environment variables:');
    missing.forEach(m => console.error(`   - ${m}`));
    process.exit(1);
  }

  console.log('✅ Environment configuration OK');
}

verify();
