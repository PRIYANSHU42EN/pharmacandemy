import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { withAuth } from "@/lib/api-middleware";
import logger from "@/lib/logger";

export const POST = withAuth(async (req: NextRequest) => {
  try {
    const userId = (req as any).user.uid;

    const body = await req.json();
    const { topic, subject, requirements, deadline, urgencyLevel, budgetExpectation } = body;

    // Create the ticket
    const { data, error } = await supabaseAdmin
      .from("urgent_work_tickets")
      .insert({
        user_id: userId,
        topic,
        subject,
        requirements,
        deadline: deadline || null,
        urgency_level: urgencyLevel || "medium",
        budget_expectation: budgetExpectation,
        status: "pending"
      })
      .select()
      .single();

    if (error) {
      logger.error({ error, userId }, "[Urgent Work API] Error creating ticket");
      return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error({ err: error.message }, "[Urgent Work API] POST Exception");
    return NextResponse.json({ 
      error: "Failed to create ticket"
    }, { status: 500 });
  }
});

export const GET = withAuth(async (req: NextRequest) => {
  try {
    const userId = (req as any).user.uid;

    const { data, error } = await supabaseAdmin
      .from("urgent_work_tickets")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ error, userId }, "[Urgent Work API] Error fetching tickets");
      return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    logger.error({ err: error.message }, "[Urgent Work API] GET Exception");
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
});
