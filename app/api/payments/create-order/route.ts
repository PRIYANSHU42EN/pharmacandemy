import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { pptSupabaseAdmin } from "@/lib/supabase/pptAdmin";

export async function POST(req: NextRequest) {
  try {
    // SECURITY: Verify user identity via Firebase Auth token
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required. Please log in." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authError: any) {
      console.error("[Payments] Firebase auth error:", authError.message);
      return NextResponse.json(
        { error: "Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    const authenticatedUserId = decodedToken.uid;

    const body = await req.json().catch(() => ({}));
    const { amount, currency = "INR", type = "subscription" } = body;

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json(
        { error: "Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local" },
        { status: 503 }
      );
    }

    // Server-enforced pricing
    let finalAmount: number;
    let notes: any = { type, userId: authenticatedUserId };

    if (type === "premium_monthly" || type === "premium_biannual" || type === "subscription") {
       // LEGACY: Premium is now decommissioned, but we keep this for backward compatibility or if some links still exist
       finalAmount = 4000; 
    }
    else if (type === "ppt_purchase") {
      const { pptId } = body;
      if (!pptId) return NextResponse.json({ error: "pptId required" }, { status: 400 });
      
      const { data: ppt, error: pptErr } = await pptSupabaseAdmin
        .from('ppt_marketplace')
        .select('price')
        .eq('id', pptId)
        .single();
      
      if (pptErr || !ppt) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      finalAmount = ppt.price;
      notes.pptId = pptId;
    }
    else if (type === "donation") {
      if (!amount || typeof amount !== "number" || amount < 100) {
        return NextResponse.json({ error: "Invalid donation amount" }, { status: 400 });
      }
      finalAmount = Math.round(amount);
    }
    else {
      return NextResponse.json({ error: "Invalid payment type" }, { status: 400 });
    }

    // Create Razorpay order
    const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`,
      },
      body: JSON.stringify({
        amount: finalAmount,
        currency,
        notes,
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.json();
      console.error("[Payments] Razorpay order creation failed:", errorData);
      return NextResponse.json({ error: "Failed to create order", details: errorData }, { status: 500 });
    }

    const order = await orderResponse.json();
    console.log(`[Payments] Order created: ${order.id} for user ${authenticatedUserId}, type: ${type}, amount: ${finalAmount}`);
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    console.error("[Payments] Create order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
