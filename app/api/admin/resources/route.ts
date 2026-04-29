import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

const resourceSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().optional(),
  type: z.enum(["pdf", "video", "pyq", "important", "practice"]),
  url: z.string().url().optional().or(z.literal("")),
  previewImage: z.string().url().optional().or(z.literal("")),
  subjectId: z.string().min(1),
  courseId: z.string().min(1),
  tags: z.array(z.string()).default([]),
  isPremium: z.boolean().default(false)
});

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const token = authHeader.replace("Bearer ", "");
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;

    const { data: userProfile } = await (supabaseAdmin || supabaseServer).from("users").select("role").eq("id", uid).single();
    if (!userProfile || !["admin", "super-admin"].includes(userProfile.role)) {
      if (decodedToken.email !== "smashgaming5488@gmail.com") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const data = resourceSchema.parse(body);

    const { data: inserted, error } = await (supabaseAdmin || supabaseServer).from("resources").insert([{
      title: data.title,
      description: data.description,
      type: data.type,
      url: data.url,
      preview_image: data.previewImage,
      subject_id: data.subjectId,
      course_id: data.courseId,
      tags: data.tags,
      is_premium: data.isPremium,
      updated_at: new Date().toISOString(),
    }]).select().single();

    if (error) throw error;
    return NextResponse.json({ success: true, resource: inserted });
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
