import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyFirebaseToken } from "@/lib/auth-utils";
import { applyRateLimit } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting
    const rateLimitResponse = await applyRateLimit(request, { maxRequests: 5, windowMs: 60000 });
    if (rateLimitResponse) return rateLimitResponse;

    const decodedToken = await verifyFirebaseToken(request);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields (name, email, message) are required' },
        { status: 400 }
      );
    }

    // Official Resend send pattern
    const { data, error } = await resend.emails.send({
      from: 'Cubepharm <onboarding@resend.dev>', // Replace with your verified domain in production
      to: ['smashgaming5488@gmail.com'], // The master admin email from user context
      replyTo: email,
      subject: `New Contact Message from ${name}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1f3c;">
          <h2 style="color: #F7C5D8;">New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <hr style="border: 0.5px solid #e0e0e0; margin: 20px 0;" />
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend] Error sending email:", error);
      return NextResponse.json({ error: "Failed to send message. Please try again later." }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("[API/Contact] Internal error:", err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
