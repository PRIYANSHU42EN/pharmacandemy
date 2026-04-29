import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Zod Schema for strict validation
const resourceSchema = z.object({
  title: z.string().min(2, "Title is too short").max(200, "Title is too long"),
  description: z.string().optional(),
  type: z.enum(["pdf", "video", "pyq", "important", "practice"]),
  url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  previewImage: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  subjectId: z.string().min(1, "Subject ID required"),
  courseId: z.string().min(1, "Course ID required"),
  tags: z.array(z.string()).default([]),
  isPremium: z.boolean().default(false)
});

// Basic Memory Store for Rate Limiting
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMITCount = 30; // requests per minute

// Basic Sanitizer
const sanitizeText = (str?: string) => {
  if (!str) return str;
  return str.replace(/<script[^>]*?>.*?<\/script>/gi, '').replace(/[<>]/g, '');
};

function checkRateLimit(ip: string) {
  const now = Date.now();
  const hit = rateLimitMap.get(ip);
  if (hit) {
    if (now - hit.timestamp < 60000) {
      if (hit.count >= RATE_LIMITCount) return false;
      hit.count++;
    } else {
      rateLimitMap.set(ip, { count: 1, timestamp: now });
    }
  } else {
    rateLimitMap.set(ip, { count: 1, timestamp: now });
  }
  return true;
}

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authError: any) {
      console.error("[Admin Resources] Firebase auth error:", authError.message);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const uid = decodedToken.uid;

    // Check admin permissions in Supabase users table using admin client to bypass RLS
    const { data: userProfile, error: profileError } = await (supabaseAdmin || supabaseServer)
      .from("users")
      .select("role")
      .eq("id", uid)
      .single();

    if (profileError || !userProfile || !["admin", "super-admin", "content-admin"].includes(userProfile.role)) {
      // Hardcoded fallback for owner email
      if (decodedToken.email !== "smashgaming5488@gmail.com") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = resourceSchema.parse(body);

    const payload = {
      title: sanitizeText(data.title),
      description: sanitizeText(data.description),
      type: data.type,
      url: data.url ? sanitizeText(data.url) : "",
      preview_image: data.previewImage ? sanitizeText(data.previewImage) : "",
      subject_id: data.subjectId,
      course_id: data.courseId,
      tags: data.tags,
      is_premium: data.isPremium,
      is_deleted: false,
      updated_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertError } = await supabaseServer
      .from("resources")
      .insert([payload])
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, id: inserted.id, resource: inserted }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded. Please slow down." }, { status: 429 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (authError: any) {
      console.error("[Admin Resources PUT] Firebase auth error:", authError.message);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const uid = decodedToken.uid;

    // Check admin permissions in Supabase users table using admin client to bypass RLS
    const { data: userProfile, error: profileError } = await (supabaseAdmin || supabaseServer)
      .from("users")
      .select("role")
      .eq("id", uid)
      .single();

    if (profileError || !userProfile || !["admin", "super-admin", "content-admin"].includes(userProfile.role)) {
      // Hardcoded fallback for owner email
      if (decodedToken.email !== "smashgaming5488@gmail.com") {
        return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { id, ...rest } = body;
    if (!id) return NextResponse.json({ error: "Missing Resource ID" }, { status: 400 });

    const data = resourceSchema.partial().parse(rest);

    const updatePayload: any = { 
      ...data, 
      updated_at: new Date().toISOString() 
    };
    
    // Map camelCase to snake_case for Supabase
    if (data.subjectId) { updatePayload.subject_id = data.subjectId; delete updatePayload.subjectId; }
    if (data.courseId) { updatePayload.course_id = data.courseId; delete updatePayload.courseId; }
    if (data.isPremium !== undefined) { updatePayload.is_premium = data.isPremium; delete updatePayload.isPremium; }
    if (data.previewImage) { updatePayload.preview_image = data.previewImage; delete updatePayload.previewImage; }
    
    if (data.title) updatePayload.title = sanitizeText(data.title);
    if (data.description) updatePayload.description = sanitizeText(data.description);
    if (data.url) updatePayload.url = sanitizeText(data.url);

    const { error: updateError } = await supabaseServer
      .from("resources")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation Error", details: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
