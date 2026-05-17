import { NextRequest, NextResponse } from "next/server";
import { chatSupabaseAdmin } from "@/lib/supabase/chatAdmin";
import { adminAuth } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    if (!chatSupabaseAdmin) {
       return NextResponse.json({ count: 0 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Join chat_rooms with chat_room_status to find rooms where last_message_at > last_read_at
    // Or where status record doesn't exist yet (meaning it's all unread)
    
    // 1. Fetch all rooms for this user
    const { data: rooms, error: roomsError } = await chatSupabaseAdmin
      .from("chat_rooms")
      .select("room_id, last_message_at")
      .contains("participant_ids", [userId]);

    if (roomsError) {
      console.error("[Unread Count] Rooms Query Error:", roomsError);
      return NextResponse.json({ count: 0 });
    }

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    // 2. Fetch all status records for this user
    const { data: statuses, error: statusError } = await chatSupabaseAdmin
      .from("chat_room_status")
      .select("room_id, last_read_at")
      .eq("user_id", userId);

    if (statusError) {
      console.error("[Unread Count] Status Query Error:", statusError);
      return NextResponse.json({ count: 0 });
    }

    // 3. Map status records for quick lookup
    const statusMap = new Map(statuses?.map(s => [s.room_id, s.last_read_at]) || []);

    // 4. Calculate unread count
    const unreadCount = rooms.filter(room => {
      const lastReadAt = statusMap.get(room.room_id) || 0;
      const lastRead = new Date(lastReadAt).getTime();
      const lastMessage = new Date(room.last_message_at || 0).getTime();
      return lastMessage > lastRead;
    }).length;

    return NextResponse.json({ count: unreadCount });
  } catch (error: any) {
    console.error("[Unread Count GET Error]:", error);
    return NextResponse.json({ count: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!chatSupabaseAdmin) {
       return NextResponse.json({ error: "Chat database not configured" }, { status: 500 });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const { roomId } = await req.json();

    // 1. Verify membership
    const { data: isParticipant } = await chatSupabaseAdmin
      .from("chat_rooms")
      .select("room_id")
      .eq("room_id", roomId)
      .contains("participant_ids", [userId])
      .maybeSingle();

    if (!isParticipant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let error = null;
    try {
      const result = await chatSupabaseAdmin
        .from("chat_room_status")
        .upsert({
          room_id: roomId,
          user_id: userId,
          last_read_at: new Date().toISOString()
        }, { onConflict: "room_id,user_id" });
      error = result.error;
    } catch (e: any) {
      error = { message: e.message || "Exception" };
    }

    if (error) {
       console.warn("[Unread Status] ⚠️ Failed to update:", error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Unread Status POST Error]:", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}
