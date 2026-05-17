import { NextRequest, NextResponse } from "next/server";
import * as Ably from "ably";
import { adminAuth } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  try {
    // 1. Verify Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split(" ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (err) {
      console.error("[Ably Auth] Token verification failed:", err);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = decodedToken.uid;

    if (!process.env.ABLY_API_KEY) {
      console.error("ABLY_API_KEY is not defined");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // 2. Initialize Ably REST Client
    const client = new Ably.Rest(process.env.ABLY_API_KEY);

    // 3. Determine Role & Capabilities
    let isAdmin = false;
    let userRooms: string[] = [];

    try {
      const { chatSupabaseAdmin } = await import("@/lib/supabase/chatAdmin");
      
      // Check if user is admin in Chat DB
      const { data: userProfile, error: profileError } = await chatSupabaseAdmin
        .from("users")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        console.warn("[Ably Auth] Profile check warning:", profileError.message);
      } else {
        isAdmin = userProfile?.role === "admin";
      }
      
      // Fetch rooms the user is in
      const { data: rooms, error: roomsError } = await chatSupabaseAdmin
        .from("chat_rooms")
        .select("room_id")
        .contains("participant_ids", [userId]);

      if (roomsError) {
        console.error("[Ably Auth] Rooms fetch error:", roomsError.message);
      } else {
        userRooms = rooms?.map(r => r.room_id) || [];
      }
    } catch (dbErr: any) {
      console.error("[Ably Auth] Database connection error:", dbErr.message);
      // Fallback: minimal capabilities if DB is down
    }
    
    // 4. Construct Capabilities
    // We grant broad access to the [chat] namespace and the raw chat:room channels ONLY to Admins.
    // For regular users, we restrict them strictly to the specific rooms they are participants of.
    const capabilities: Record<string, string[]> = {};

    if (isAdmin) {
      capabilities["[chat]*"] = ["*"];
      capabilities["chat:room:*"] = ["*"];
    } else {
      // Always grant access to their own user channel to avoid empty capabilities error
      capabilities[`[chat]chat:user:${userId}*`] = ["*"];
      capabilities[`chat:user:${userId}*`] = ["*"];

      // Regular users: ensure they only have access to their specific rooms
      for (const roomId of userRooms) {
        capabilities[`[chat]chat:room:${roomId}*`] = ["*"];
        capabilities[`chat:room:${roomId}*`] = ["*"];
      }
    }

    const tokenRequestData = await client.auth.createTokenRequest({
      clientId: userId,
      capability: JSON.stringify(capabilities),
    });

    return NextResponse.json(tokenRequestData);
  } catch (error: any) {
    console.error("[Ably Auth Error]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
