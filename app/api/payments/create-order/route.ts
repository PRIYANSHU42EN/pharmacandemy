import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

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
    } catch (authError: any) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const authenticatedUserId = decodedToken.uid;
    const { amount, currency = "INR", type = "subscription" } = await req.json();

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ error: "Razorpay not configured" }, { status: 503 });
    }

    let finalAmount: number;
    if (type === "premium_monthly") finalAmount = 4000;
    else if (type === "premium_biannual") finalAmount = 6000;
    else if (type === "donation") {
      if (!amount || typeof amount !== "number" || amount < 100 || amount > 10000000) {
        return NextResponse.json({ error: "Invalid donation amount" }, { status: 400 });
      }
      finalAmount = Math.round(amount);
    }
    else finalAmount = 4000;

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
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    const order = await orderResponse.json();
    return NextResponse.json({ orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
