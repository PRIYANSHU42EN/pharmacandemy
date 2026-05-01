import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify user identity via Firebase Auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required. Please log in and try again." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      console.error("[Payments] Firebase auth error:", err);
      return NextResponse.json(
        { error: "Invalid or expired authentication token. Please re-login." },
        { status: 401 }
      );
    }
    
    const authenticatedUserId = decodedToken.uid;
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = await req.json();

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!razorpayKeySecret) return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.warn(`[Payments] Invalid signature for user ${authenticatedUserId}`);
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    if (!supabaseAdmin) {
      console.error("[Payments] Supabase Admin client missing. Cannot verify payment.");
      return NextResponse.json({ error: "Server database misconfigured" }, { status: 503 });
    }

    // Idempotency check in Supabase
    const { data: existingPayment } = await supabaseAdmin
      .from("payments")
      .select("id")
      .eq("razorpay_payment_id", razorpay_payment_id)
      .maybeSingle();

    if (existingPayment) {
      return NextResponse.json({ success: true, message: "Payment already processed" });
    }

    // Fetch order from Razorpay
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpay_order_id}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
      },
    });

    if (!orderRes.ok) throw new Error("Failed to verify order with Razorpay");
    const orderData = await orderRes.json();
    const actualAmount = orderData.amount;
    const actualType = orderData.notes?.type || "unknown";

    // Standard payment record
    const paymentRecord = {
      user_id: authenticatedUserId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount: actualAmount,
      currency: "INR",
      status: "captured",
      type: actualType,
      created_at: new Date().toISOString(),
    };

    // Save payment log
    await supabaseAdmin.from("payments").insert(paymentRecord);

    // Grant premium
    const isPremiumPlan = 
      actualType === "premium_monthly" || 
      actualType === "premium_biannual" || 
      (actualType === "subscription" && actualAmount >= 4000) ||
      (actualType === "premium" && actualAmount >= 4000);

    if (isPremiumPlan) {
      const days = 365; // 1 year
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);

      // 1. Update Supabase
      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({
          is_premium: true,
          premium_expiry: expiryDate.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", authenticatedUserId);

      if (updateError) {
        console.error("[Payments] Supabase user update failed:", updateError.message);
      }

      // 2. Update Firestore for dual-sync consistency
      try {
        const userRef = adminDb.collection("users").doc(authenticatedUserId);
        await userRef.update({
          isPremium: true,
          premiumExpiry: expiryDate.toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`[Payments] Firestore premium activated for ${authenticatedUserId}`);
      } catch (firestoreError: any) {
        console.warn("[Payments] Firestore update failed (non-critical):", firestoreError.message);
      }

      // 3. Track payment event in analytics_events
      try {
        await supabaseAdmin.from("analytics_events").insert({
          user_id: authenticatedUserId,
          event_type: "payment",
          metadata: { amount: actualAmount, type: actualType, orderId: razorpay_order_id }
        });
      } catch (analyticsError: any) {
        console.warn("[Payments] Analytics tracking failed (non-critical):", analyticsError.message);
      }

      console.log(`[Payments] Premium activated for ${authenticatedUserId} for ${days} days`);
      return NextResponse.json({ success: true, message: "Premium activated" });
    }

    return NextResponse.json({ success: true, message: "Payment verified" });
  } catch (error: any) {
    console.error("[Payments] Verify error:", error.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
