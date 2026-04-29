import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    
    const authenticatedUserId = decodedToken.uid;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });

    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (!supabaseAdmin) return NextResponse.json({ error: "Database misconfigured" }, { status: 503 });

    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();

    if (existingPayment) return NextResponse.json({ success: true });

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}` },
    });

    if (!orderRes.ok) throw new Error("Failed to verify order");
    const orderData = await orderRes.json();
    const actualAmount = orderData.amount;
    const actualType = orderData.notes?.type || "unknown";

    await supabaseAdmin.from("payments").insert({
      user_id: authenticatedUserId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: actualAmount,
      currency: "INR",
      status: "captured",
      type: actualType,
      created_at: new Date().toISOString(),
    });

    const isPremiumPlan = actualType === "premium_monthly" || actualType === "premium_biannual" || actualAmount >= 4000;

    if (isPremiumPlan) {
      let days = actualType === "premium_biannual" || actualAmount === 6000 ? 180 : 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      await supabaseAdmin.from("users").update({
        is_premium: true,
        premium_expires_at: expiryDate.toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", authenticatedUserId);

      try {
        await adminDb.collection("users").doc(authenticatedUserId).update({
          isPremium: true,
          premiumExpiry: expiryDate.toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } catch {}

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
