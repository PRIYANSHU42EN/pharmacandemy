import { NextRequest, NextResponse } from "next/server";
import { chatSupabaseAdmin } from "@/lib/supabase/chatAdmin";
import { adminAuth } from "@/lib/firebase/admin";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
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

    // 1. Check if user is admin
    const { data: userProfile } = await chatSupabaseAdmin
      .from("users")
      .select("role")
      .eq("id", userId)
      .single();

    const isAdmin = userProfile?.role === "admin";

    // 2. Fetch rooms
    let query = chatSupabaseAdmin.from("chat_rooms").select("*");
    
    if (!isAdmin) {
      // Regular users only see rooms they are in
      query = query.contains("participant_ids", [userId]);
    }

    const { data: rooms, error } = await query.order("last_message_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(rooms);
  } catch (error: any) {
    console.error("[Chat Rooms GET Error]:", error);
    return NextResponse.json({ error: "Failed to fetch chat rooms" }, { status: 500 });
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

    const body = await req.json();
    const { contextType, contextId, metadata, participantIds: bodyParticipants } = body;
    const ADMIN_UID = "imPiNi75ZefFa7LKbYk6vQnItI22";

    // 1. Determine participants (default to User + Admin if not specified)
    let participantIds = bodyParticipants || [userId, ADMIN_UID];
    
    // Ensure the current user is included
    if (!participantIds.includes(userId)) {
      participantIds.push(userId);
    }

    // 2. Check if room exists for these participants (and context if provided)
    let query = chatSupabaseAdmin
      .from("chat_rooms")
      .select("*")
      .contains("participant_ids", participantIds);
    
    if (contextId) {
      query = query.eq("context_id", contextId);
    } else {
      // If no context, look for general direct message
      query = query.eq("context_type", "general");
    }

    const { data: existingRoom } = await query.maybeSingle();

    if (existingRoom) {
      return NextResponse.json(existingRoom);
    }

    // 3. Get user info for metadata
    const { data: student } = await chatSupabaseAdmin
      .from("users")
      .select("display_name, email, username")
      .eq("id", userId)
      .single();

    const userName = student?.display_name || student?.username || student?.email?.split('@')[0] || "User";
    const userShortId = userId.slice(0, 6).toUpperCase();

    // 4. Ensure all participants exist in Chat DB
    for (const pid of participantIds) {
      const { data: exists } = await chatSupabaseAdmin.from("users").select("id").eq("id", pid).maybeSingle();
      if (!exists) {
        // Fetch from primary if missing
        const { data: primaryUser } = await supabaseAdmin
          .from("users")
          .select("id, email, display_name, name, role")
          .eq("id", pid)
          .maybeSingle();

        if (primaryUser) {
          await chatSupabaseAdmin.from("users").upsert({
            id: pid,
            email: primaryUser.email || "",
            display_name: primaryUser.display_name || primaryUser.name || "User",
            role: primaryUser.role || "user",
            updated_at: new Date().toISOString()
          });
        }
      }
    }

    // 5. Create new room
    const roomId = `chat:room:${crypto.randomUUID()}`;

    const { data: newRoom, error: createError } = await chatSupabaseAdmin
      .from("chat_rooms")
      .insert({
        room_id: roomId,
        participant_ids: participantIds,
        context_type: contextType || "general",
        context_id: contextId,
        metadata: {
          ...metadata,
          studentName: userName,
          studentId: userShortId,
          adminName: "Admin Support",
          title: metadata?.title || `Chat: ${userName}`
        }
      })
      .select()
      .single();

    if (createError) throw createError;

    // 3. Initialize status for all participants
    await Promise.all(participantIds.map((pid: string) => 
      chatSupabaseAdmin.from("chat_room_status").insert({
        room_id: roomId,
        user_id: pid,
        last_read_at: new Date(0).toISOString() // Initially unread
      })
    ));

    return NextResponse.json(newRoom);
  } catch (error: any) {
    console.error("[Chat Rooms POST Error]:", error);
    return NextResponse.json({ error: "Failed to create chat room" }, { status: 500 });
  }
}
