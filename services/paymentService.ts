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
    if (!supabaseAdmin) {
      return { success: false, message: "Database not configured" };
    }

    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;
    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;

    if (!razorpayKeySecret || !razorpayKeyId) {
      return { success: false, message: "Payment gateway not configured" };
    }

    try {
      // 1. Verify HMAC signature
      const expectedSignature = crypto
        .createHmac("sha256", razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        return { success: false, message: "Invalid payment signature" };
      }

      // 2. Idempotency check
      const { data: existingPayment } = await supabaseAdmin
        .from("payments")
        .select("id")
        .eq("razorpay_payment_id", razorpayPaymentId)
        .maybeSingle();

      if (existingPayment) {
        return { success: true, message: "Payment already processed" };
      }

      // 3. Verify with Razorpay API
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${razorpayOrderId}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
        },
      });

      if (!orderRes.ok) {
        return { success: false, message: "Failed to verify order with gateway" };
      }

      const orderData = await orderRes.json();
      const amount = orderData.amount;
      const type = orderData.notes?.type || "subscription";

      // 4. Save payment record
      await supabaseAdmin.from("payments").insert({
        user_id: userId,
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        amount: amount,
        currency: "INR",
        status: "captured",
        type: type,
        created_at: new Date().toISOString(),
      });

      // 5. Grant premium status if applicable
      const isPremiumEligible = 
        type.includes("premium") || 
        (type === "subscription" && amount >= 4000);

      if (isPremiumEligible) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year

        // Update Supabase
        await supabaseAdmin
          .from("users")
          .update({
            is_premium: true,
            premium_expires_at: expiryDate.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        // Sync to Firestore (Dual-write for consistency)
        try {
          await adminDb.collection("users").doc(userId).update({
            isPremium: true,
            premiumExpiry: expiryDate.toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } catch (fErr: any) {
          console.warn("[PaymentService] Firestore sync failed:", fErr.message);
        }

        // Log analytics event
        try {
          await supabaseAdmin.from("analytics_events").insert({
            user_id: userId,
            event_type: "payment_success",
            metadata: { amount, type, orderId: razorpayOrderId }
          });
        } catch (aErr) {}

        return { success: true, message: "Premium activated" };
      }

      return { success: true, message: "Payment verified" };

    } catch (err: any) {
      console.error("[PaymentService] Error:", err.message);
      return { success: false, message: "Internal processing error" };
    }
  }
}
