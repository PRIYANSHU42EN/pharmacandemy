import { supabaseAdmin } from "@/lib/supabase/admin";
import { pptSupabaseAdmin } from "@/lib/supabase/pptAdmin";
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
    
    if (!supabaseAdmin || !pptSupabaseAdmin) {
      console.error("[PaymentService] Supabase or PPT Admin client not initialized");
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
      const metadata = orderData.notes || {};

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
      }

      // 5. Handle Specific Payment Types
      
      // --- PPT PURCHASE ---
      if (type === "ppt_purchase" && metadata.pptId) {
        await pptSupabaseAdmin.from("ppt_purchases").insert({
          user_id: userId,
          ppt_id: metadata.pptId,
          amount: amount,
          payment_id: razorpayPaymentId,
          created_at: new Date().toISOString()
        });

        // Increment download count directly
        const { data: ppt } = await pptSupabaseAdmin
          .from("ppt_marketplace")
          .select("download_count")
          .eq("id", metadata.pptId)
          .single();
        
        await pptSupabaseAdmin
          .from("ppt_marketplace")
          .update({ 
            download_count: (ppt?.download_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", metadata.pptId);

        return { success: true, message: "Presentation unlocked successfully" };
      }

      // --- URGENT WORK PAYMENT ---
      if (type === "urgent_work" && metadata.ticketId) {
        await supabaseAdmin.from("urgent_work_tickets").update({
          status: "paid",
          payment_id: razorpayPaymentId,
          updated_at: new Date().toISOString()
        }).eq("id", metadata.ticketId);

        return { success: true, message: "Payment received. Work will start shortly." };
      }

      return { success: true, message: "Payment verified" };


    } catch (err: any) {
      console.error("[PaymentService] Unexpected Error:", err.message);
      return { success: false, message: "Internal processing error" };
    }
  }
}
