import { NextRequest, NextResponse } from "next/server";
import { chatSupabaseAdmin } from "@/lib/supabase/chatAdmin";
import { adminAuth } from "@/lib/firebase/admin";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    console.log("[Chat Room DELETE] Request for ID:", roomId);
    
    // 1. Verify Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // 2. Verify Permissions (Must be admin or participant)
    const { data: room, error: roomError } = await chatSupabaseAdmin
      .from("chat_rooms")
      .select("*")
      .eq("room_id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const { data: userProfile } = await chatSupabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    const isAdmin = userProfile?.role === "admin" || decodedToken.email === "smashgaming5488@gmail.com";
    const isParticipant = room.participant_ids.includes(userId);

    console.log("[Chat Room DELETE] User:", userId, "isAdmin:", isAdmin, "isParticipant:", isParticipant);

    if (!isAdmin && !isParticipant) {
      console.warn("[Chat Room DELETE] Permission Denied for user:", userId);
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // 3. Delete from Supabase
    // We delete the status records first then the room
    await chatSupabaseAdmin.from("chat_room_status").delete().eq("room_id", roomId);
    const { error: deleteError } = await chatSupabaseAdmin
      .from("chat_rooms")
      .delete()
      .eq("room_id", roomId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Chat Room DELETE Error]:", error);
    return NextResponse.json({ error: "Failed to delete chat room" }, { status: 500 });
  }
}
