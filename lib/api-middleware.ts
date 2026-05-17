import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseToken, checkAdminRole } from "@/lib/auth-utils";
import logger from "@/lib/logger";

type ApiHandler = (req: NextRequest, ctx: any) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, ctx: any) => {
    try {
      const decodedToken = await verifyFirebaseToken(req);
      if (!decodedToken) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      
      // Inject user info into request for downstream handlers
      (req as any).user = decodedToken;
      
      return await handler(req, ctx);
    } catch (error) {
      logger.error(error as any, "[Auth Middleware] Error");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export function withAdmin(handler: ApiHandler): ApiHandler {
  return withAuth(async (req: NextRequest, ctx: any) => {
    try {
      const user = (req as any).user;
      if (!user || !user.uid) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const isAdmin = await checkAdminRole(user.uid);
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
      }
      
      return await handler(req, ctx);
    } catch (error) {
      logger.error(error as any, "[Admin Middleware] Error");
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
