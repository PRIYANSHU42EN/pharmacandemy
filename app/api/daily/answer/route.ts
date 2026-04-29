import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const idToken = authHeader.replace("Bearer ", "");
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { questionId } = await req.json();
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

    return NextResponse.json({ success: true, streak: newStreak });
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
