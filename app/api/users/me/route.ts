import { NextResponse } from "next/server";

export async function GET() {
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
