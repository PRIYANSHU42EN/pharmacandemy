import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function test() {
  console.log("Testing Firebase Admin...");
  try {
    if (!adminAuth || !adminDb) {
      console.error("Admin SDK not initialized!");
      return;
    }
    console.log("Admin SDK initialized.");
    
    // Test Auth
    try {
      await adminAuth.listUsers(1);
      console.log("✅ Admin Auth listUsers works.");
    } catch (e: any) {
      console.error("❌ Admin Auth error:", e.message);
    }

    // Test Firestore
    try {
      const snap = await adminDb.collection("users").limit(1).get();
      console.log(`✅ Admin Firestore get works. Found ${snap.size} users.`);
    } catch (e: any) {
      console.error("❌ Admin Firestore error:", e.message);
    }
  } catch (e: any) {
    console.error("❌ Fatal test error:", e.message);
  }
}

test();
