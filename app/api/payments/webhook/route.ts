import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const razorpaySignature = req.headers.get("x-razorpay-signature");
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!webhookSecret || !razorpaySignature) {
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      console.warn("[Webhook] Invalid signature received");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (payment) {
        const paymentId = payment.id;
        const orderId = payment.order_id;

        console.log(`[Webhook] payment.captured — ${paymentId}`);

        if (!supabaseAdmin) {
          console.error("[Webhook] Supabase Admin client missing. Cannot process webhook.");
          return NextResponse.json({ error: "Server database misconfigured" }, { status: 503 });
        }

        // Idempotency check in Supabase
        const { data: existingPayment } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("razorpay_payment_id", paymentId)
          .maybeSingle();

        if (existingPayment) {
          return NextResponse.json({ status: "already_processed" });
        }

        const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
        const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

        const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
          },
        });

        if (!orderRes.ok) throw new Error("Order verification failed");
        const orderData = await orderRes.json();
        const userId = orderData.notes?.userId;
        const paymentType = orderData.notes?.type || "unknown";

        if (!userId) {
          console.error(`[Webhook] No userId in order ${orderId}`);
          return NextResponse.json({ error: "No userId" }, { status: 400 });
        }

        // Save payment record
        await supabaseAdmin.from("payments").insert({
          user_id: userId,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          amount: payment.amount,
          currency: payment.currency || "INR",
          status: "captured",
          type: paymentType,
          created_at: new Date().toISOString(),
        });

        // Grant premium
        const isPremiumPlan =
          paymentType === "premium_monthly" ||
          paymentType === "premium_biannual" ||
          (paymentType === "subscription" && payment.amount >= 4000);

        if (isPremiumPlan) {
          let days = paymentType === "premium_biannual" || payment.amount === 6000 ? 180 : 30;
          const expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + days);

          // 1. Update Supabase
          await supabaseAdmin
            .from("users")
            .update({
              is_premium: true,
              premium_expires_at: expiryDate.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);
          
          // 2. Update Firestore for dual-sync consistency
          try {
            const userRef = adminDb.collection("users").doc(userId);
            await userRef.update({
              isPremium: true,
              premiumExpiry: expiryDate.toISOString(),
              updatedAt: new Date().toISOString(),
            });
            console.log(`[Webhook] Firestore premium activated for ${userId}`);
          } catch (firestoreError: any) {
            console.warn("[Webhook] Firestore update failed (non-critical):", firestoreError.message);
          }
          
          console.log(`[Webhook] Premium activated for user ${userId}`);
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Webhook] error:", error.message);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
