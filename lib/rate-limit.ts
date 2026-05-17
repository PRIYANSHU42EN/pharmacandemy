import { NextRequest, NextResponse } from "next/server";
import { redis } from "./redis";
import logger from "./logger";
import { createHash } from "crypto";

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  errorMessage?: string;
}

// In-memory fallback if Redis is not configured
const fallbackMap = new Map<string, { count: number, resetTime: number }>();

/**
 * Anonymizes an IP address using SHA-256 hashing.
 * Ensures no PII (actual IP) is stored in the cache or logs.
 */
function hashIP(ip: string): string {
  return createHash("sha256").update(ip + (process.env.IP_SALT || "pharmacandemy-default-salt")).digest("hex").slice(0, 16);
}

export async function applyRateLimit(
  req: NextRequest, 
  options: RateLimitOptions = { maxRequests: 50, windowMs: 60000, errorMessage: "Too many requests. Please try again later." }
): Promise<NextResponse | null> {
  // Priority: Vercel/Next.js internal IP -> X-Forwarded-For -> X-Real-IP
  const rawIp = (req as any).ip || req.headers.get("x-forwarded-for")?.split(',')[0].trim() || req.headers.get("x-real-ip") || "unknown-ip";
  const hashedIp = hashIP(rawIp);
  const path = req.nextUrl.pathname;
  const key = `ratelimit:${path}:${hashedIp}`;
  const now = Date.now();
  
  // 1. Redis Rate Limiting Path
  if (process.env.UPSTASH_REDIS_REST_URL) {
    try {
      const windowSeconds = Math.ceil(options.windowMs / 1000);
      
      const [response] = await redis.pipeline()
        .incr(key)
        .expire(key, windowSeconds, 'NX')
        .exec();
        
      const currentCount = response as number;
      
      if (currentCount > options.maxRequests) {
        logger.warn({ path, hashedIp, count: currentCount }, "Rate limit exceeded");
        return NextResponse.json(
          { error: options.errorMessage },
          { 
            status: 429, 
            headers: { 
              "Retry-After": windowSeconds.toString(),
              "X-RateLimit-Limit": options.maxRequests.toString(),
              "X-RateLimit-Remaining": "0"
            } 
          }
        );
      }
      return null;
    } catch (err) {
      logger.error({ err, path }, "[RateLimit] Redis error, falling back to memory");
      // Fall through to memory
    }
  }

  // 2. In-Memory Fallback Path
  const record = fallbackMap.get(key);

  if (!record || now > record.resetTime) {
    fallbackMap.set(key, { count: 1, resetTime: now + options.windowMs });
    return null;
  }

  if (record.count >= options.maxRequests) {
    logger.warn({ path, hashedIp, source: 'memory' }, "Rate limit exceeded (fallback)");
    return NextResponse.json(
      { error: options.errorMessage },
      { 
        status: 429, 
        headers: { 
          "Retry-After": Math.ceil((record.resetTime - now) / 1000).toString(),
          "X-RateLimit-Limit": options.maxRequests.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": record.resetTime.toString()
        } 
      }
    );
  }

  record.count += 1;
  return null;
}

