import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const idToken = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = decodedToken.uid;

    const { referralCode } = await req.json();

    if (!referralCode) {
      return NextResponse.json({ error: "Missing referralCode" }, { status: 400 });
    }

    // In production:
    // 1. Find user with this referralCode
    // 2. Create referral record
    // 3. Update referee's referredBy field
    // const referrer = await adminDb.collection("users")
    //   .where("referralCode", "==", referralCode).limit(1).get();
    // if (referrer.empty) return NextResponse.json({ error: "Invalid referral code" }, { status: 404 });
    // await adminDb.collection("referrals").add({
    //   referrerId: referrer.docs[0].id,
    //   refereeId: userId,
    //   status: "signed-up",
    //   rewardGranted: false,
    //   createdAt: FieldValue.serverTimestamp(),
    // });

    console.log(`Referral claimed: ${referralCode} by user ${userId}`);

    return NextResponse.json({ success: true, message: "Referral code applied" });
  } catch (error) {
    console.error("Referral claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
