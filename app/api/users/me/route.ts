import { NextResponse } from "next/server";

export async function GET() {
  // In production: verify JWT, fetch from Firestore
  // const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  // const decoded = await adminAuth.verifyIdToken(token);
  // const userDoc = await adminDb.collection("users").doc(decoded.uid).get();

  // Mock response for development
  return NextResponse.json({
    uid: "demo-user",
    email: "student@example.com",
    displayName: "Pharmacy Student",
    isPremium: false,
    premiumExpiry: null,
    streak: 12,
    referralCode: "PH7K9X",
    createdAt: new Date().toISOString(),
  });
}
