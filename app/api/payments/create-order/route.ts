import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

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

    const { amount, currency = "INR", type = "subscription" } = await req.json();

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json(
        { error: "Razorpay not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env.local" },
        { status: 503 }
      );
    }

    // Server-enforced pricing — ignore client-sent amount for subscription types
    let finalAmount: number;
    if (type === "premium_monthly") finalAmount = 4000; // ₹40
    else if (type === "premium_biannual") finalAmount = 6000; // ₹60
    else if (type === "donation") {
      // For donations, validate amount is a positive integer
      if (!amount || typeof amount !== "number" || amount < 100 || amount > 10000000) {
        return NextResponse.json({ error: "Invalid donation amount" }, { status: 400 });
      }
      finalAmount = Math.round(amount);
    }
    else if (type === "subscription") finalAmount = 4000; // Default legacy fallback
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
        notes: { type, userId: authenticatedUserId },
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
