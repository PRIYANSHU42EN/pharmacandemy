import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { verifyFirebaseToken } from '@/lib/auth-utils';
import { applyRateLimit } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting (Strict for email endpoints: 5 req/min)
    const rateLimitResponse = await applyRateLimit(request, { maxRequests: 5, windowMs: 60000 });
    if (rateLimitResponse) return rateLimitResponse;

    // 2. Authentication
    const decodedToken = await verifyFirebaseToken(request);
    if (!decodedToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, name } = await request.json();

    // 3. Input Validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Cubepharm <nothing.by.14@gmail.com>', // Replace with your verified domain in production
      to: [email],
      subject: 'Welcome to Cubepharm',
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1f3c; background-color: #F9F8F7;">
          <h1 style="color: #F7C5D8;">Welcome to Cubepharm!</h1>
          <p>Hi ${name || 'Student'},</p>
          <p>Thank you for joining Cubepharm. We're excited to have you on board.</p>
          <p>You now have access to organized pharmacy study resources, PYQs, and important questions to help you excel in your exams.</p>
          <a href="https://cubepharm.vercel.app/courses" style="display: inline-block; padding: 12px 24px; background-color: #F7C5D8; color: #1a1f3c; text-decoration: none; border-radius: 20px; font-weight: bold; margin-top: 20px;">Start Learning</a>
          <hr style="border: 0.5px solid #e0e0e0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #808080;">If you have any questions, just reply to this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error("[Resend/Welcome] Error sending email:", error);
      return NextResponse.json({ error: "Failed to send email. Please try again later." }, { status: 500 });
    }

    console.log("[Resend/Welcome] Email sent successfully:", data?.id);
    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("[API/Send-Email] Exception:", err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
