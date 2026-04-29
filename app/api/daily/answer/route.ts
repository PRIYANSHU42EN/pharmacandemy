import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

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

    const { questionId, answer } = await req.json();

    if (!questionId) {
      return NextResponse.json({ error: "Missing questionId" }, { status: 400 });
    }

    // In production:
    // 1. Check if already answered today
    // 2. Record answer in userProgress
    // 3. Update streak
    const userRef = adminDb.collection("users").doc(userId);
    const user = await userRef.get();
    const userData = user.data();
    const today = new Date().toISOString().split("T")[0];
    const lastStreak = userData?.lastStreakDate?.toDate().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    let newStreak = 1;
    if (lastStreak === yesterday) newStreak = (userData?.streak || 0) + 1;
    else if (lastStreak === today) newStreak = userData?.streak || 1;

    await userRef.update({
      streak: newStreak,
      lastStreakDate: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`Daily answer recorded: user ${userId}, question ${questionId}`);

    return NextResponse.json({
      success: true,
      streak: newStreak,
      message: "Answer recorded, streak updated!",
    });
  } catch (error) {
    console.error("Daily answer error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
