import { supabaseAdmin } from "@/lib/supabase/admin";
import { adminDb } from "@/lib/firebase/admin";
import crypto from "crypto";

export interface PaymentVerificationResult {
  success: boolean;
  message: string;
  error?: string;
}

export class PaymentService {
  /**
   * Verifies Razorpay signature and processes the payment
   */
  static async verifyRazorpayPayment(
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<PaymentVerificationResult> {
    console.log(`[PaymentService] Verifying payment for user: ${userId}, Order: ${razorpayOrderId}`);
    
    if (!supabaseAdmin) {
      console.error("[PaymentService] Supabase Admin client not initialized");
      return { success: false, message: "Database not configured" };
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;

    if (!razorpayKeySecret || !razorpayKeyId) {
      console.error("[PaymentService] Razorpay keys missing in environment");
      return { success: false, message: "Payment gateway not configured" };
    }

    try {
      // 1. Verify HMAC signature
      const expectedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        console.warn(`[PaymentService] Signature mismatch. Expected: ${expectedSignature}, Received: ${razorpaySignature}`);
        return { success: false, message: "Invalid payment signature" };
      }

      // 2. Idempotency check
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("razorpay_payment_id", razorpayPaymentId)
        .maybeSingle();

      if (existingPayment) {
        console.log(`[PaymentService] Payment ${razorpayPaymentId} already processed.`);
        return { success: true, message: "Payment already processed" };
      }

      // 3. Verify with Razorpay API (Double-check)
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
        },
      });

      if (!orderRes.ok) {
        console.error(`[PaymentService] Razorpay API error: ${orderRes.statusText}`);
        return { success: false, message: "Failed to verify order with gateway" };
      }

      const orderData = await orderRes.json();
      const amount = orderData.amount;
      const type = orderData.notes?.type || "subscription";

      // 4. Save payment record
      const { error: paymentError } = await supabaseAdmin.from("payments").insert({
        user_id: userId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        amount: amount,
        currency: "INR",
        status: "captured",
        type: type,
        created_at: new Date().toISOString(),
        verified_at: new Date().toISOString()
      });

      if (paymentError) {
        console.error("[PaymentService] Failed to insert payment record:", paymentError.message);
        // We continue anyway to activate premium, as the money was captured
      }

      // 5. Grant premium status (Step 2: current date + 1 month)
      const isPremiumEligible = 
        type.includes("premium") || 
        (type === "subscription" && amount >= 4000);

      if (isPremiumEligible) {
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1); // Exact 1 month as requested

        console.log(`[PaymentService] Activating premium for ${userId}. Expiry: ${expiryDate.toISOString()}`);

        // Update Supabase (Source of Truth)
        const { error: userUpdateError } = await supabaseAdmin
          .from("users")
          .update({
            is_premium: true,
            premium_expires_at: expiryDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (userUpdateError) {
          console.error(`[PaymentService] Supabase user update FAILED for ${userId}:`, userUpdateError.message);
          return { success: false, message: "Failed to update user profile in database" };
        }

        // Sync to Firestore (Dual-write for backward compatibility)
        try {
          await adminDb.collection("users").doc(userId).update({
            isPremium: true,
            premiumExpiry: expiryDate.toISOString(),
            updatedAt: new Date().toISOString(),
          });
          console.log(`[PaymentService] Firestore sync successful for ${userId}`);
        } catch (fErr: any) {
          console.warn("[PaymentService] Firestore sync failed (ignoring):", fErr.message);
        }

        // Log analytics event
        try {
          await supabaseAdmin.from("analytics_events").insert({
            user_id: userId,
            event_type: "payment_success",
            metadata: { amount, type, orderId: razorpayOrderId }
          });
        } catch (aErr) {}

        return { success: true, message: "Premium activated successfully" };
      }

      return { success: true, message: "Payment verified" };

    } catch (err: any) {
      console.error("[PaymentService] Unexpected Error:", err.message);
      return { success: false, message: "Internal processing error" };
    }
  }
}
